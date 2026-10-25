import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import StatCard from '../components/common/StatCard';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
    FiUsers,
    FiClock,
    FiCalendar,
    FiCheckCircle,
    FiAlertCircle,
    FiArrowRight,
    FiPlusCircle,
} from 'react-icons/fi';
import { formatDate } from '../utils/formatters';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.get('/reports/stats');
            if (res.data.success) {
                setStats(res.data.stats);
            }
        } catch (err) {
            console.error('Error fetching admin dashboard stats:', err);
            setError(err.response?.data?.error || 'Failed to load dashboard statistics.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) {
        return <LoadingSpinner text="Aggregating enterprise statistics..." />;
    }

    if (error) {
        return (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                <p className="font-bold">Error loading dashboard:</p>
                <p>{error}</p>
                <button
                    onClick={fetchStats}
                    className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                    Retry
                </button>
            </div>
        );
    }

    const {
        totalEmployees = 0,
        activeEmployees = 0,
        pendingLeaves = 0,
        onLeaveToday = 0,
        attendance = {},
        deptDistribution = [],
        upcomingSchedules = [],
        recentLeaves = [],
        last7Days = []
    } = stats || {};

    const maxAttendanceDay = Math.max(...(last7Days.map(d => d.total) || [1]), 1);

    return (
        <div className="space-y-6">
            {/* Header with Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Executive Dashboard</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Real-time workforce monitoring, attendance tracking, and operations summary
                    </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <Link
                        to="/employees"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                        <FiPlusCircle className="text-sm" /> Add Employee
                    </Link>
                    <Link
                        to="/schedules"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                        <FiCalendar className="text-sm" /> Schedule Shift
                    </Link>
                </div>
            </div>

            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Employees"
                    value={totalEmployees}
                    icon={FiUsers}
                    color="indigo"
                    subtext={`${activeEmployees} currently active`}
                />
                <StatCard
                    title="Attendance Today"
                    value={`${attendance.attendanceRate || 0}%`}
                    icon={FiCheckCircle}
                    color="emerald"
                    subtext={`${attendance.totalCheckedIn || 0} checked in of ${activeEmployees}`}
                />
                <StatCard
                    title="On Leave Today"
                    value={onLeaveToday}
                    icon={FiClock}
                    color="amber"
                    subtext="Approved leave today"
                />
                <StatCard
                    title="Pending Leaves"
                    value={pendingLeaves}
                    icon={FiAlertCircle}
                    color="rose"
                    subtext="Requires administrator review"
                />
            </div>

            {/* Attendance & Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 7-Day Attendance Trend Chart */}
                <div className="lg:col-span-2">
                    <Card
                        title="Attendance Trend (Last 7 Days)"
                        subtitle="Daily employee check-in volume and punctuality"
                        action={
                            <Link to="/attendance" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                                Full Log &rarr;
                            </Link>
                        }
                    >
                        <div className="h-60 flex items-end justify-between gap-2 pt-6 pb-2 px-2">
                            {last7Days.map((day, idx) => {
                                const heightPercent = maxAttendanceDay > 0
                                    ? Math.round((day.total / maxAttendanceDay) * 100)
                                    : 0;

                                return (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                        {/* Value tooltip */}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded pointer-events-none mb-1">
                                            {day.total} ({day.late} late)
                                        </div>

                                        {/* Bar Stack */}
                                        <div className="w-full max-w-[36px] bg-slate-100 rounded-t-lg h-44 flex flex-col justify-end overflow-hidden">
                                            {day.late > 0 && (
                                                <div
                                                    style={{ height: `${(day.late / (day.total || 1)) * heightPercent}%` }}
                                                    className="w-full bg-amber-400 transition-all duration-300"
                                                    title={`Late: ${day.late}`}
                                                />
                                            )}
                                            <div
                                                style={{ height: `${((day.present || 0) / (day.total || 1)) * heightPercent}%` }}
                                                className="w-full bg-teal-500 rounded-t-sm transition-all duration-300"
                                                title={`Present: ${day.present}`}
                                            />
                                        </div>

                                        {/* Date label */}
                                        <span className="text-[11px] font-semibold text-slate-600">{day.day}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                            <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-teal-500"></span> On-time Check-ins
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-400"></span> Late Arrivals
                            </span>
                        </div>
                    </Card>
                </div>

                {/* Department Distribution Card */}
                <Card
                    title="Department Distribution"
                    subtitle="Workforce allocation across units"
                    action={
                        <Link to="/departments" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                            Manage &rarr;
                        </Link>
                    }
                >
                    <div className="space-y-3.5 pt-2">
                        {deptDistribution.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-8">No departments recorded</p>
                        ) : (
                            deptDistribution.map((dept, index) => {
                                const percentage = totalEmployees > 0
                                    ? Math.round((dept.count / totalEmployees) * 100)
                                    : 0;

                                const colors = ['bg-teal-500', 'bg-indigo-500', 'bg-sky-500', 'bg-purple-500', 'bg-amber-500'];
                                const barColor = colors[index % colors.length];

                                return (
                                    <div key={dept.id || index}>
                                        <div className="flex items-center justify-between text-xs font-medium mb-1">
                                            <span className="text-slate-700 truncate max-w-[160px]">{dept.name}</span>
                                            <span className="text-slate-500 font-bold">{dept.count} ({percentage}%)</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${barColor}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </Card>
            </div>

            {/* Bottom Row: Recent Leave Requests & Upcoming Shifts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Leave Requests */}
                <Card
                    title="Recent Leave Requests"
                    subtitle="Applications submitted by team members"
                    action={
                        <Link to="/leaves" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                            Review All &rarr;
                        </Link>
                    }
                    noPadding
                >
                    <div className="divide-y divide-slate-100">
                        {recentLeaves.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">No leave requests found</div>
                        ) : (
                            recentLeaves.map(leave => (
                                <div key={leave._id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-slate-800 truncate">{leave.userId?.name || 'Employee'}</p>
                                            <Badge status={leave.status} />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">{leave.leaveType} &bull; {leave.reason}</p>
                                        <span className="text-[10px] text-slate-400 mt-1 block">
                                            {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                                        </span>
                                    </div>
                                    <Link
                                        to="/leaves"
                                        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                                    >
                                        <FiArrowRight className="text-sm" />
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Upcoming Schedules */}
                <Card
                    title="Upcoming Shift Schedules"
                    subtitle="Upcoming employee shifts and meetings"
                    action={
                        <Link to="/schedules" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                            Calendar &rarr;
                        </Link>
                    }
                    noPadding
                >
                    <div className="divide-y divide-slate-100">
                        {upcomingSchedules.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">No upcoming schedules found</div>
                        ) : (
                            upcomingSchedules.map(sch => (
                                <div key={sch._id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-800 truncate">{sch.title}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {sch.employeeId ? sch.employeeId.name : 'Open / All Employees'} &bull; {sch.department?.name || 'General'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-teal-700">
                                            <span>{sch.date}</span>
                                            <span>&bull;</span>
                                            <span>{sch.startTime} - {sch.endTime}</span>
                                        </div>
                                    </div>
                                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-600">
                                        {sch.location || 'Office'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}