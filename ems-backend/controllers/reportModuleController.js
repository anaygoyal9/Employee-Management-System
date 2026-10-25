import Report from "../models/Report.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import Schedule from "../models/Schedule.js";
import Notification from "../models/Notification.js";
import Message from "../models/Message.js";
import { visibleTo } from "./notificationController.js";
import { csvRow } from "../utils/csv.js";

const getTodayDateString = () => new Date().toISOString().split('T')[0];

// GET /api/reports/stats (Admin Dashboard live stats)
const getAdminDashboardStats = async (req, res) => {
    try {
        const todayDate = getTodayDateString();
        const todayStart = new Date(todayDate);
        const todayEnd = new Date(todayDate);
        todayEnd.setHours(23, 59, 59, 999);

        // Employee stats
        const totalEmployees = await User.countDocuments({ role: { $in: ['employee', 'user'] } });
        const activeEmployees = await User.countDocuments({ role: { $in: ['employee', 'user'] }, status: 'active' });
        const inactiveEmployees = totalEmployees - activeEmployees;

        // Leave stats
        const pendingLeaves = await Leave.countDocuments({ status: 'Pending' });
        const onLeaveToday = await Leave.countDocuments({
            status: 'Approved',
            startDate: { $lte: todayEnd },
            endDate: { $gte: todayStart }
        });

        // Attendance stats for today
        const todayAttendance = await Attendance.find({ date: todayDate });
        const presentCount = todayAttendance.filter(a => a.status === 'present').length;
        const lateCount = todayAttendance.filter(a => a.status === 'late').length;
        const halfDayCount = todayAttendance.filter(a => a.status === 'half-day').length;
        const totalCheckedIn = todayAttendance.length;
        const absentCount = Math.max(0, activeEmployees - totalCheckedIn);
        const attendanceRate = activeEmployees > 0 ? Math.round((totalCheckedIn / activeEmployees) * 100) : 0;

        // Department-wise distribution
        const departments = await Department.find();
        const deptDistribution = await Promise.all(
            departments.map(async (dept) => {
                const count = await User.countDocuments({ department: dept._id });
                return {
                    id: dept._id,
                    name: dept.name,
                    count
                };
            })
        );

        // Also count unassigned
        const unassignedCount = await User.countDocuments({ department: null, role: { $in: ['employee', 'user'] } });
        if (unassignedCount > 0) {
            deptDistribution.push({ id: 'unassigned', name: 'Unassigned', count: unassignedCount });
        }

        // Upcoming schedules (from today onwards)
        const upcomingSchedules = await Schedule.find({ date: { $gte: todayDate } })
            .populate('employeeId', 'name employeeId')
            .populate('department', 'name')
            .sort({ date: 1, startTime: 1 })
            .limit(5);

        // Recent activities (recent leaves, announcements, schedules)
        const recentLeaves = await Leave.find()
            .populate('userId', 'name employeeId')
            .sort({ createdAt: -1 })
            .limit(4);

        const recentAnnouncements = await Message.find({ type: 'announcement' })
            .populate('sender_id', 'name')
            .sort({ createdAt: -1 })
            .limit(3);

        // Attendance trend over last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

            const dayRecords = await Attendance.find({ date: dateStr });
            const present = dayRecords.filter(r => r.status === 'present').length;
            const late = dayRecords.filter(r => r.status === 'late').length;

            last7Days.push({
                date: dateStr,
                day: dayName,
                present,
                late,
                total: dayRecords.length
            });
        }

        res.status(200).json({
            success: true,
            stats: {
                totalEmployees,
                activeEmployees,
                inactiveEmployees,
                pendingLeaves,
                onLeaveToday,
                attendance: {
                    totalCheckedIn,
                    presentCount,
                    lateCount,
                    halfDayCount,
                    absentCount,
                    attendanceRate
                },
                deptDistribution,
                upcomingSchedules,
                recentLeaves,
                recentAnnouncements,
                last7Days
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/reports/employee-stats (Employee Dashboard stats)
const getEmployeeDashboardStats = async (req, res) => {
    try {
        const todayDate = getTodayDateString();
        const userId = req.user._id;

        // Today's attendance
        const todayAttendance = await Attendance.findOne({ userId, date: todayDate });

        // User profile & leave balance
        const user = await User.findById(userId).populate('department', 'name');

        // Leaves overview
        const myPendingLeaves = await Leave.countDocuments({ userId, status: 'Pending' });
        const myApprovedLeaves = await Leave.countDocuments({ userId, status: 'Approved' });

        // Upcoming shifts
        const myUpcomingSchedules = await Schedule.find({
            $or: [{ employeeId: userId }, { employeeId: null }],
            date: { $gte: todayDate }
        })
            .populate('department', 'name')
            .sort({ date: 1, startTime: 1 })
            .limit(4);

        // Recent notifications
        const unreadNotifications = await Notification.countDocuments({
            ...visibleTo(req.user),
            read_by: { $ne: userId }
        });

        // Recent company announcements
        const announcements = await Message.find({ type: 'announcement' })
            .populate('sender_id', 'name')
            .sort({ createdAt: -1 })
            .limit(3);

        res.status(200).json({
            success: true,
            stats: {
                user,
                todayAttendance,
                leaveBalance: user?.leaveBalance || { casual: 12, sick: 10, annual: 15 },
                myPendingLeaves,
                myApprovedLeaves,
                myUpcomingSchedules,
                unreadNotifications,
                announcements
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/reports/export/:type (Export CSV)
const exportReportCsv = async (req, res) => {
    try {
        const { type } = req.params;
        const { startDate, endDate, department, status } = req.query;

        let csvData = "";
        let filename = `ems_report_${type}_${Date.now()}.csv`;

        if (type === 'employees') {
            const filter = {};
            if (department) filter.department = department;
            if (status) filter.status = status;

            const employees = await User.find(filter).populate('department', 'name').sort({ name: 1 });
            csvData = csvRow(["Employee ID", "Name", "Email", "Role", "Department", "Designation", "Phone", "Status", "Joining Date"]);
            employees.forEach(emp => {
                const deptName = emp.department?.name || 'N/A';
                const joinDate = emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A';
                csvData += csvRow([emp.employeeId || 'N/A', emp.name, emp.email, emp.role, deptName, emp.designation || 'N/A', emp.phone || '', emp.status, joinDate]);
            });

        } else if (type === 'attendance') {
            const filter = {};
            if (startDate && endDate) {
                filter.date = { $gte: startDate, $lte: endDate };
            } else if (startDate) {
                filter.date = { $gte: startDate };
            }
            if (status) filter.status = status;

            const records = await Attendance.find(filter)
                .populate('userId', 'name email employeeId')
                .sort({ date: -1, checkIn: -1 });

            csvData = csvRow(["Date", "Employee ID", "Employee Name", "Email", "Check In", "Check Out", "Total Hours", "Status", "Notes"]);
            records.forEach(r => {
                const emp = r.userId || {};
                const checkIn = r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : 'N/A';
                const checkOut = r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : 'N/A';
                csvData += csvRow([r.date, emp.employeeId || 'N/A', emp.name || 'N/A', emp.email || 'N/A', checkIn, checkOut, r.totalHours || 0, r.status, r.notes || '']);
            });

        } else if (type === 'leaves') {
            const filter = {};
            if (status) filter.status = status;

            const leaves = await Leave.find(filter)
                .populate('userId', 'name email employeeId')
                .populate('decidedBy', 'name')
                .sort({ createdAt: -1 });

            csvData = csvRow(["Employee ID", "Name", "Leave Type", "Start Date", "End Date", "Reason", "Status", "Decision Reason", "Decided By"]);
            leaves.forEach(l => {
                const emp = l.userId || {};
                const start = new Date(l.startDate).toLocaleDateString();
                const end = new Date(l.endDate).toLocaleDateString();
                const decidedBy = l.decidedBy?.name || 'N/A';
                csvData += csvRow([emp.employeeId || 'N/A', emp.name || 'N/A', l.leaveType, start, end, l.reason, l.status, (l.decisionReason || ''), decidedBy]);
            });

        } else if (type === 'schedules') {
            const filter = {};
            if (startDate && endDate) {
                filter.date = { $gte: startDate, $lte: endDate };
            }
            const schedules = await Schedule.find(filter)
                .populate('employeeId', 'name employeeId')
                .populate('department', 'name')
                .sort({ date: 1, startTime: 1 });

            csvData = csvRow(["Date", "Start Time", "End Time", "Shift Title", "Assigned Employee", "Department", "Location", "Details"]);
            schedules.forEach(s => {
                const empName = s.employeeId ? `${s.employeeId.name} (${s.employeeId.employeeId || ''})` : 'All Department';
                const dept = s.department?.name || 'N/A';
                csvData += csvRow([s.date, s.startTime, s.endTime, s.title, empName, dept, s.location || '', (s.details || '')]);
            });

        } else {
            return res.status(400).json({ success: false, error: "Invalid report export type. Supported: employees, attendance, leaves, schedules." });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csvData);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/reports/generate (Snapshot generation)
const generateReport = async (req, res) => {
    try {
        const { report_type } = req.body;

        if (!report_type) {
            return res.status(400).json({ success: false, error: "report_type is required." });
        }

        let data = {};
        let title = "System Report";

        if (report_type === "user_summary") {
            const total = await User.countDocuments();
            const active = await User.countDocuments({ status: "active" });
            const inactive = await User.countDocuments({ status: "inactive" });
            const byRole = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);
            data = { total, active, inactive, byRole };
            title = "Employee Workforce Summary";
        } else if (report_type === "attendance_summary") {
            const todayStr = getTodayDateString();
            const today = await Attendance.find({ date: todayStr });
            const totalRecords = await Attendance.countDocuments();
            data = { todayDate: todayStr, todayCount: today.length, totalRecords };
            title = "Attendance Status Summary";
        } else if (report_type === "leave_summary") {
            const pending = await Leave.countDocuments({ status: "Pending" });
            const approved = await Leave.countDocuments({ status: "Approved" });
            const rejected = await Leave.countDocuments({ status: "Rejected" });
            data = { pending, approved, rejected };
            title = "Leave Requests Summary";
        } else if (report_type === "schedule_summary") {
            const total = await Schedule.countDocuments();
            const upcoming = await Schedule.countDocuments({ date: { $gte: getTodayDateString() } });
            data = { total, upcoming };
            title = "Shifts and Scheduling Summary";
        } else if (report_type === "department_summary") {
            const departments = await Department.find().sort({ name: 1 });
            const rows = await Promise.all(departments.map(async (d) => `${d.name}: ${await User.countDocuments({ department: d._id })}`));
            const unassigned = await User.countDocuments({ department: null });
            data = { totalDepartments: departments.length, employeesPerDepartment: rows, unassigned };
            title = "Department Headcount Summary";
        } else {
            return res.status(400).json({ success: false, error: "Unknown report_type." });
        }

        const report = await Report.create({
            generated_by: req.user._id,
            report_type,
            title,
            data
        });

        const populated = await Report.findById(report._id).populate('generated_by', 'name role');

        res.status(201).json({ success: true, report: populated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/reports
const getAllReports = async (req, res) => {
    try {
        const reports = await Report.find()
            .sort({ createdAt: -1 })
            .populate('generated_by', 'name role');

        res.status(200).json({ success: true, reports });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/reports/:id
const getReportById = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id).populate('generated_by', 'name role');
        if (!report) {
            return res.status(404).json({ success: false, error: "Report not found!" });
        }
        res.status(200).json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// DELETE /api/reports/:id
const deleteReport = async (req, res) => {
    try {
        const report = await Report.findByIdAndDelete(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, error: "Report not found!" });
        }
        res.status(200).json({ success: true, message: "Report deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export {
    getAdminDashboardStats,
    getEmployeeDashboardStats,
    exportReportCsv,
    generateReport,
    getAllReports,
    getReportById,
    deleteReport
};