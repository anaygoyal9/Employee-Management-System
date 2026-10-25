import Leave from '../models/Leave.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import escapeRegex from "../utils/escapeRegex.js";
import mongoose from 'mongoose';

// POST /api/leaves/apply
const applyLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;

        if (!leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({ success: false, error: "Please fill in all required leave fields." });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ success: false, error: "Invalid date format." });
        }

        if (end < start) {
            return res.status(400).json({ success: false, error: "End date cannot be earlier than start date." });
        }

        // Prevent overlapping approved or pending leave requests
        const overlapping = await Leave.findOne({
            userId: req.user._id,
            status: { $in: ['Pending', 'Approved'] },
            startDate: { $lte: end },
            endDate: { $gte: start }
        });

        if (overlapping) {
            return res.status(400).json({
                success: false,
                error: `You already have an existing ${overlapping.status.toLowerCase()} leave request between ${new Date(overlapping.startDate).toLocaleDateString()} and ${new Date(overlapping.endDate).toLocaleDateString()}.`
            });
        }

        const newLeave = new Leave({
            userId: req.user._id,
            leaveType,
            startDate: start,
            endDate: end,
            reason: reason.trim(),
            status: 'Pending'
        });

        await newLeave.save();

        // Create notification for admins
        await Notification.create({
            sent_by: req.user._id,
            title: "New Leave Application",
            message: `${req.user.name} applied for ${leaveType} from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}.`,
            type: "leave",
            target_role: "admin"
        });

        res.status(201).json({
            success: true,
            leave: newLeave,
            message: "Leave application submitted successfully."
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/leaves/my
const getMyLeaves = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 10));
        const status = req.query.status || "";

        const filter = { userId: req.user._id };
        if (status) {
            filter.status = status;
        }

        const totalRecords = await Leave.countDocuments(filter);
        const leaves = await Leave.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const user = await User.findById(req.user._id).select('leaveBalance');

        res.status(200).json({
            success: true,
            leaves,
            leaveBalance: user?.leaveBalance || { casual: 12, sick: 10, annual: 15 },
            pagination: {
                totalRecords,
                totalPages: Math.ceil(totalRecords / limit) || 1,
                currentPage: page,
                limit
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/leaves (Admin all leaves)
const getAllLeaves = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 10));
        const { status, leaveType, department, search } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (leaveType) filter.leaveType = leaveType;

        if (search || (department && mongoose.isValidObjectId(department))) {
            const userFilter = {};
            if (search) {
                const safe = escapeRegex(search);
                userFilter.$or = [
                    { name: { $regex: safe, $options: 'i' } },
                    { email: { $regex: safe, $options: 'i' } },
                    { employeeId: { $regex: safe, $options: 'i' } }
                ];
            }
            if (department && mongoose.isValidObjectId(department)) {
                userFilter.department = department;
            }

            const matchingUsers = await User.find(userFilter).select('_id');
            const matchingIds = matchingUsers.map(u => u._id);
            filter.userId = { $in: matchingIds };
        }

        const totalRecords = await Leave.countDocuments(filter);
        const leaves = await Leave.find(filter)
            .populate({
                path: 'userId',
                select: 'name email employeeId designation department leaveBalance',
                populate: { path: 'department', select: 'name' }
            })
            .populate('decidedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            success: true,
            leaves,
            pagination: {
                totalRecords,
                totalPages: Math.ceil(totalRecords / limit) || 1,
                currentPage: page,
                limit
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PATCH /api/leaves/:id/status (Admin decision)
const updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, decisionReason } = req.body;

        if (!status || !['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: "Status must be 'Approved' or 'Rejected'." });
        }

        const leave = await Leave.findById(id).populate('userId', 'name email leaveBalance');
        if (!leave) {
            return res.status(404).json({ success: false, error: "Leave application not found." });
        }

        if (leave.status !== 'Pending') {
            return res.status(400).json({ success: false, error: `This leave request is already ${leave.status.toLowerCase()}.` });
        }

        leave.status = status;
        leave.decisionReason = decisionReason || (status === 'Approved' ? 'Approved by Admin' : 'Rejected by Admin');
        leave.decidedBy = req.user._id;

        await leave.save();

        // If approved, optionally deduct leave balance
        if (status === 'Approved' && leave.userId) {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            const daysCount = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

            const user = await User.findById(leave.userId._id);
            if (user && user.leaveBalance) {
                const balanceKey = leave.leaveType.toLowerCase().includes('sick') ? 'sick'
                    : leave.leaveType.toLowerCase().includes('casual') ? 'casual'
                    : leave.leaveType.toLowerCase().includes('annual') ? 'annual' : null;

                if (balanceKey && user.leaveBalance[balanceKey] !== undefined) {
                    user.leaveBalance[balanceKey] = Math.max(0, user.leaveBalance[balanceKey] - daysCount);
                    await user.save();
                }
            }
        }

        // Notify the employee of the decision
        await Notification.create({
            sent_by: req.user._id,
            recipient: leave.userId._id,
            title: `Leave Request ${status}`,
            message: `Your leave request for ${leave.leaveType} (${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}) was ${status.toLowerCase()}.${decisionReason ? ` Note: ${decisionReason}` : ''}`,
            type: "leave",
            target_role: "employee"
        });

        res.status(200).json({
            success: true,
            leave,
            message: `Leave request has been ${status.toLowerCase()}.`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PATCH /api/leaves/:id/cancel (Employee self-cancellation)
const cancelLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const leave = await Leave.findById(id);

        if (!leave) {
            return res.status(404).json({ success: false, error: "Leave request not found." });
        }

        if (!leave.userId.equals(req.user._id)) {
            return res.status(403).json({ success: false, error: "You can only cancel your own leave requests." });
        }

        if (leave.status !== 'Pending') {
            return res.status(400).json({ success: false, error: `Only pending leave requests can be cancelled. Current status is ${leave.status}.` });
        }

        leave.status = 'Cancelled';
        await leave.save();

        res.status(200).json({ success: true, message: "Leave request cancelled successfully.", leave });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export {
    applyLeave,
    getMyLeaves,
    getAllLeaves,
    updateLeaveStatus,
    cancelLeave
};
