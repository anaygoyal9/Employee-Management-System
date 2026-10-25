import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import escapeRegex from "../utils/escapeRegex.js";
import Settings from '../models/Settings.js';
import mongoose from 'mongoose';

const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

// POST /api/attendance/check-in
const checkIn = async (req, res) => {
    try {
        const todayDate = getTodayDateString();
        const now = new Date();

        const existingRecord = await Attendance.findOne({
            userId: req.user._id,
            date: todayDate
        });

        if (existingRecord) {
            return res.status(400).json({
                success: false,
                error: `You have already checked in today at ${new Date(existingRecord.checkIn).toLocaleTimeString()}.`
            });
        }

        // Late = arriving more than GRACE_MINUTES after the configured work start time (Settings)
        const GRACE_MINUTES = 30;
        const settings = await Settings.findOne().select('workStartTime');
        const [startH, startM] = (settings?.workStartTime || '09:00').split(':').map(Number);
        const lateAfter = (startH || 0) * 60 + (startM || 0) + GRACE_MINUTES;
        const isLate = (now.getHours() * 60 + now.getMinutes()) > lateAfter;
        const status = isLate ? 'late' : 'present';

        const record = new Attendance({
            userId: req.user._id,
            date: todayDate,
            checkIn: now,
            status,
            notes: req.body.notes || ""
        });

        await record.save();

        res.status(201).json({
            success: true,
            attendance: record,
            message: `Check-in successful at ${now.toLocaleTimeString()}! Status: ${status}.`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/attendance/check-out
const checkOut = async (req, res) => {
    try {
        const todayDate = getTodayDateString();
        const now = new Date();

        const record = await Attendance.findOne({
            userId: req.user._id,
            date: todayDate
        });

        if (!record) {
            return res.status(400).json({
                success: false,
                error: "No check-in record found for today. Please check in first."
            });
        }

        if (record.checkOut) {
            return res.status(400).json({
                success: false,
                error: `You have already checked out today at ${new Date(record.checkOut).toLocaleTimeString()}.`
            });
        }

        const checkInTime = new Date(record.checkIn).getTime();
        const checkOutTime = now.getTime();
        const diffHours = Math.max(0, (checkOutTime - checkInTime) / (1000 * 60 * 60));
        const totalHours = Number(diffHours.toFixed(2));

        record.checkOut = now;
        record.totalHours = totalHours;

        if (totalHours < 4 && record.status !== 'late') {
            record.status = 'half-day';
        }

        if (req.body.notes) {
            record.notes = record.notes ? `${record.notes} | ${req.body.notes}` : req.body.notes;
        }

        await record.save();

        res.status(200).json({
            success: true,
            attendance: record,
            message: `Check-out successful at ${now.toLocaleTimeString()}! Total hours worked: ${totalHours} hrs.`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/attendance/today
const getTodayStatus = async (req, res) => {
    try {
        const todayDate = getTodayDateString();
        const record = await Attendance.findOne({
            userId: req.user._id,
            date: todayDate
        });

        res.status(200).json({
            success: true,
            attendance: record || null
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/attendance/my
const getMyAttendance = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 10));
        const { startDate, endDate, status } = req.query;

        const filter = { userId: req.user._id };

        if (startDate && endDate) {
            filter.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            filter.date = { $gte: startDate };
        } else if (endDate) {
            filter.date = { $lte: endDate };
        }

        if (status) {
            filter.status = status;
        }

        const totalRecords = await Attendance.countDocuments(filter);
        const records = await Attendance.find(filter)
            .sort({ date: -1, checkIn: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            success: true,
            records,
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

// GET /api/attendance (Admin all attendance)
const getAllAttendance = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 10));
        const { employeeId, department, date, startDate, endDate, status, search } = req.query;

        const filter = {};

        if (date) {
            filter.date = date;
        } else if (startDate && endDate) {
            filter.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            filter.date = { $gte: startDate };
        } else if (endDate) {
            filter.date = { $lte: endDate };
        }

        if (status) {
            filter.status = status;
        }

        if (employeeId && mongoose.isValidObjectId(employeeId)) {
            filter.userId = employeeId;
        }

        // Search or department filtering requires user matching
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
            if (filter.userId) {
                // If both are specified, ensure intersection
                if (!matchingIds.some(id => id.equals(filter.userId))) {
                    filter.userId = new mongoose.Types.ObjectId(); // force empty
                }
            } else {
                filter.userId = { $in: matchingIds };
            }
        }

        const totalRecords = await Attendance.countDocuments(filter);
        const records = await Attendance.find(filter)
            .populate({
                path: 'userId',
                select: 'name email employeeId designation department',
                populate: { path: 'department', select: 'name' }
            })
            .sort({ date: -1, checkIn: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            success: true,
            records,
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

// GET /api/attendance/summary
const getAttendanceSummary = async (req, res) => {
    try {
        const todayDate = getTodayDateString();

        const totalActiveEmployees = await User.countDocuments({ status: 'active', role: { $in: ['employee', 'user'] } });
        const todayRecords = await Attendance.find({ date: todayDate });

        const presentToday = todayRecords.filter(r => r.status === 'present').length;
        const lateToday = todayRecords.filter(r => r.status === 'late').length;
        const halfDayToday = todayRecords.filter(r => r.status === 'half-day').length;
        const totalCheckedIn = todayRecords.length;
        const absentToday = Math.max(0, totalActiveEmployees - totalCheckedIn);

        res.status(200).json({
            success: true,
            summary: {
                todayDate,
                totalActiveEmployees,
                totalCheckedIn,
                presentToday,
                lateToday,
                halfDayToday,
                absentToday,
                attendanceRate: totalActiveEmployees > 0 ? Math.round((totalCheckedIn / totalActiveEmployees) * 100) : 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/attendance/admin/record (Admin manual add)
const adminCreateRecord = async (req, res) => {
    try {
        const { userId, date, checkIn, checkOut, status, notes } = req.body;

        if (!userId || !date || !checkIn) {
            return res.status(400).json({ success: false, error: "userId, date, and checkIn are required." });
        }

        const existing = await Attendance.findOne({ userId, date });
        if (existing) {
            return res.status(400).json({ success: false, error: "An attendance record already exists for this employee on this date." });
        }

        let totalHours = 0;
        if (checkIn && checkOut) {
            const inTime = new Date(checkIn).getTime();
            const outTime = new Date(checkOut).getTime();
            if (outTime < inTime) {
                return res.status(400).json({ success: false, error: "Check-out time cannot be before check-in time." });
            }
            totalHours = Number(((outTime - inTime) / (1000 * 60 * 60)).toFixed(2));
        }

        const record = new Attendance({
            userId,
            date,
            checkIn: new Date(checkIn),
            checkOut: checkOut ? new Date(checkOut) : undefined,
            totalHours,
            status: status || 'present',
            notes: notes || "Added by administrator"
        });

        await record.save();

        const populated = await Attendance.findById(record._id).populate({
            path: 'userId',
            select: 'name email employeeId designation department',
            populate: { path: 'department', select: 'name' }
        });

        res.status(201).json({ success: true, record: populated, message: "Attendance record created." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PUT /api/attendance/admin/:id (Admin correction)
const adminUpdateRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { checkIn, checkOut, status, notes, date } = req.body;

        const record = await Attendance.findById(id);
        if (!record) {
            return res.status(404).json({ success: false, error: "Attendance record not found." });
        }

        if (date) record.date = date;
        if (checkIn) record.checkIn = new Date(checkIn);
        if (checkOut) record.checkOut = new Date(checkOut);
        if (status) record.status = status;
        if (notes !== undefined) record.notes = notes;

        if (record.checkIn && record.checkOut) {
            const inTime = new Date(record.checkIn).getTime();
            const outTime = new Date(record.checkOut).getTime();
            if (outTime < inTime) {
                return res.status(400).json({ success: false, error: "Check-out time cannot be before check-in time." });
            }
            record.totalHours = Number(((outTime - inTime) / (1000 * 60 * 60)).toFixed(2));
        }

        await record.save();

        const populated = await Attendance.findById(record._id).populate({
            path: 'userId',
            select: 'name email employeeId designation department',
            populate: { path: 'department', select: 'name' }
        });

        res.status(200).json({ success: true, record: populated, message: "Attendance record corrected." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// DELETE /api/attendance/admin/:id
const adminDeleteRecord = async (req, res) => {
    try {
        const record = await Attendance.findByIdAndDelete(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, error: "Attendance record not found." });
        }
        res.status(200).json({ success: true, message: "Attendance record deleted." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export {
    checkIn,
    checkOut,
    getTodayStatus,
    getMyAttendance,
    getAllAttendance,
    getAttendanceSummary,
    adminCreateRecord,
    adminUpdateRecord,
    adminDeleteRecord
};
