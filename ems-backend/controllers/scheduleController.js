import Schedule from "../models/Schedule.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// Helper: check if two time intervals overlap (HH:MM strings)
const timesOverlap = (startA, endA, startB, endB) => {
    return (startA < endB && endA > startB);
};

// GET /api/schedules
const getAllSchedules = async (req, res) => {
    try {
        const { employeeId, department, date, startDate, endDate, upcoming } = req.query;

        const filter = {};

        // If regular employee, only show schedules assigned to them (or open department schedules)
        if (req.user.role !== 'admin') {
            filter.$or = [
                { employeeId: req.user._id },
                { employeeId: null }
            ];
        } else {
            if (employeeId && mongoose.isValidObjectId(employeeId)) {
                filter.employeeId = employeeId;
            }
        }

        if (department && mongoose.isValidObjectId(department)) {
            filter.department = department;
        }

        if (date) {
            filter.date = date;
        } else if (startDate && endDate) {
            filter.date = { $gte: startDate, $lte: endDate };
        } else if (upcoming === 'true') {
            const todayStr = new Date().toISOString().split('T')[0];
            filter.date = { $gte: todayStr };
        }

        const schedules = await Schedule.find(filter)
            .populate('employeeId', 'name email employeeId designation')
            .populate('department', 'name')
            .sort({ date: 1, startTime: 1 });

        res.status(200).json({ success: true, schedules });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/schedules/:id
const getScheduleById = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await Schedule.findById(id)
            .populate('employeeId', 'name email employeeId designation')
            .populate('department', 'name');

        if (!schedule) {
            return res.status(404).json({ success: false, error: "Schedule not found!" });
        }

        if (req.user.role !== 'admin' && schedule.employeeId && !schedule.employeeId._id.equals(req.user._id)) {
            return res.status(403).json({ success: false, error: "Access denied." });
        }

        res.status(200).json({ success: true, schedule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/schedules
const createSchedule = async (req, res) => {
    try {
        const { employeeId, department, title, date, startTime, endTime, location, details } = req.body;

        if (!title || !date || !startTime || !endTime) {
            return res.status(400).json({ success: false, error: "Title, date, start time, and end time are required!" });
        }

        if (startTime >= endTime) {
            return res.status(400).json({ success: false, error: "End time must be later than start time." });
        }

        // Conflict check: if an employee is assigned, verify no overlapping schedule for that employee on that date
        if (employeeId && mongoose.isValidObjectId(employeeId)) {
            const conflicting = await Schedule.find({
                employeeId,
                date
            });

            const hasConflict = conflicting.some(s => timesOverlap(startTime, endTime, s.startTime, s.endTime));
            if (hasConflict) {
                return res.status(400).json({
                    success: false,
                    error: `Schedule conflict: This employee already has a scheduled shift on ${date} during that time window.`
                });
            }
        }

        const newSchedule = new Schedule({
            employeeId: employeeId || undefined,
            department: department || undefined,
            title: title.trim(),
            date,
            startTime,
            endTime,
            location: location || "Main Office",
            details: details || "",
            creator_id: req.user._id,
            creator_name: req.user.name
        });

        await newSchedule.save();

        const populated = await Schedule.findById(newSchedule._id)
            .populate('employeeId', 'name email employeeId')
            .populate('department', 'name');

        // Notify assigned employee or all employees
        if (employeeId) {
            await Notification.create({
                sent_by: req.user._id,
                recipient: employeeId,
                title: "New Schedule Assigned",
                message: `You have been assigned to "${title}" on ${date} (${startTime} - ${endTime}).`,
                type: "schedule",
                target_role: "employee"
            });
        } else {
            await Notification.create({
                sent_by: req.user._id,
                title: "New General Schedule",
                message: `Schedule "${title}" posted for ${date} (${startTime} - ${endTime}).`,
                type: "schedule",
                target_role: "all"
            });
        }

        res.status(201).json({ success: true, schedule: populated, message: "Schedule created successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// PUT /api/schedules/:id
const updateSchedule = async (req, res) => {
    try {
        const { employeeId, department, title, date, startTime, endTime, location, details } = req.body;

        const schedule = await Schedule.findById(req.params.id);
        if (!schedule) {
            return res.status(404).json({ success: false, error: "Schedule not found!" });
        }

        const updatedStartTime = startTime || schedule.startTime;
        const updatedEndTime = endTime || schedule.endTime;
        const updatedDate = date || schedule.date;
        const updatedEmpId = employeeId !== undefined ? employeeId : schedule.employeeId;

        if (updatedStartTime >= updatedEndTime) {
            return res.status(400).json({ success: false, error: "End time must be later than start time." });
        }

        // Conflict check
        if (updatedEmpId && mongoose.isValidObjectId(updatedEmpId)) {
            const conflicting = await Schedule.find({
                _id: { $ne: req.params.id },
                employeeId: updatedEmpId,
                date: updatedDate
            });

            const hasConflict = conflicting.some(s => timesOverlap(updatedStartTime, updatedEndTime, s.startTime, s.endTime));
            if (hasConflict) {
                return res.status(400).json({
                    success: false,
                    error: `Schedule conflict: This employee already has another shift on ${updatedDate} during that time window.`
                });
            }
        }

        schedule.title = title !== undefined ? title.trim() : schedule.title;
        schedule.date = updatedDate;
        schedule.startTime = updatedStartTime;
        schedule.endTime = updatedEndTime;
        schedule.location = location !== undefined ? location : schedule.location;
        schedule.details = details !== undefined ? details : schedule.details;
        schedule.employeeId = updatedEmpId || null;
        schedule.department = department !== undefined ? (department || null) : schedule.department;

        await schedule.save();

        const populated = await Schedule.findById(schedule._id)
            .populate('employeeId', 'name email employeeId')
            .populate('department', 'name');

        if (populated.employeeId) {
            await Notification.create({
                sent_by: req.user._id,
                recipient: populated.employeeId._id,
                title: "Schedule Updated",
                message: `Your shift "${populated.title}" on ${populated.date} has been updated (${populated.startTime} - ${populated.endTime}).`,
                type: "schedule",
                target_role: "employee"
            });
        }

        res.status(200).json({ success: true, schedule: populated, message: "Schedule updated successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// DELETE /api/schedules/:id
const deleteSchedule = async (req, res) => {
    try {
        const schedule = await Schedule.findByIdAndDelete(req.params.id);
        if (!schedule) {
            return res.status(404).json({ success: false, error: "Schedule not found!" });
        }
        res.status(200).json({ success: true, message: "Schedule deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export { getAllSchedules, getScheduleById, createSchedule, updateSchedule, deleteSchedule };