import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import api from '../utils/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
    FiCheckCircle,
    FiCalendar,
    FiBriefcase,
    FiLogIn,
    FiLogOut,
} from 'react-icons/fi';
import { formatDate, formatTime } from '../utils/formatters';

export default function EmployeeDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [punchLoading, setPunchLoading] = useState(false);
    const [punchMessage, setPunchMessage] = useState(null);
    const [punchError, setPunchError] = useState(null);

    // Live clock timer
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.get('/reports/employee-stats');
            if (res.data.success) {
                setStats(res.data.stats);
            }
        } catch (err) {
            console.error('Error fetching employee dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleCheckIn = async () => {
        try {
            setPunchLoading(true);
            setPunchError(null);
            setPunchMessage(null);
            const res = await api.post('/attendance/check-in');
            if (res.data.success) {
                setPunchMessage(res.data.message);
                fetchStats();
            }
        } catch (err) {
            setPunchError(err.response?.data?.error || 'Check-in failed.');
        } finally {
            setPunchLoading(false);
        }
    };

    const handleCheckOut = async () => {
        try {
            setPunchLoading(true);
            setPunchError(null);
            setPunchMessage(null);
            const res = await api.post('/attendance/check-out');
            if (res.data.success) {
                setPunchMessage(res.data.message);
                fetchStats();
            }
        } catch (err) {
            setPunchError(err.response?.data?.error || 'Check-out failed.');
        } finally {
            setPunchLoading(false);
        }
    };

    if (loading) {
        return <LoadingSpinner text="Loading your dashboard..." />;
    }

    const {
        todayAttendance,
        leaveBalance = { casual: 12, sick: 10, annual: 15 },
        myPendingLeaves = 0,
        myApprovedLeaves = 0,
        myUpcomingSchedules = [],
        announcements = []
    } = stats || {};

    const isCheckedIn = !!todayAttendance?.checkIn;
    const isCheckedOut = !!todayAttendance?.checkOut;

    return (
        <div className="space-y-6">
            {/* Header Greeting */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        Employee Portal &bull; {user?.name}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        {user?.designation || 'Staff'} &bull; {user?.department?.name || 'Enterprise'} &bull; ID: {user?.employeeId || 'N/A'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        to="/leaves"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                        <FiCalendar className="text-sm" /> Apply for Leave
                    </Link>
                </div>
            </div>

            {/* Attendance Punch Clock & Leave Balances Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Punch Clock Widget Card */}
                <div className="lg:col-span-1">
                    <Card
                        title="Today's Attendance Punch"
                        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        className="h-full flex flex-col justify-between"
                    >
                        <div className="text-center py-4">
                            {/* Live Clock Display */}
                            <div className="inline-block p-4 rounded-2xl bg-slate-900 text-teal-400 font-mono text-3xl font-extrabold shadow-inner mb-4 tracking-wider">
                                {currentTime.toLocaleTimeString()}
                            </div>

                            {/* Today Status Pill */}
                            <div className="mb-4">
                                {!isCheckedIn ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                        <span className="h-2 w-2 rounded-full bg-slate-400"></span> Not Checked In Yet
                                    </span>
                                ) : !isCheckedOut ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span> Shift In Progress ({todayAttendance.status})
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                                        <FiCheckCircle className="text-xs text-teal-600" /> Shift Completed ({todayAttendance.totalHours} hrs)
                                    </span>
                                )}
                            </div>

                            {/* Timestamps Info */}
                            {isCheckedIn && (
                                <div className="grid grid-cols-2 gap-2 text-left bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs mb-4">
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Check-In</span>
                                        <span className="font-bold text-slate-700">{formatTime(todayAttendance.checkIn)}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Check-Out</span>
                                        <span className="font-bold text-slate-700">{isCheckedOut ? formatTime(todayAttendance.checkOut) : '--:--'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Flash message */}
                            {punchMessage && (
                                <p className="text-xs text-emerald-600 font-semibold mb-3">{punchMessage}</p>
                            )}
                            {punchError && (
                                <p className="text-xs text-rose-600 font-semibold mb-3">{punchError}</p>
                            )}

                            {/* Punch Buttons */}
                            <div className="flex gap-2">
                                {!isCheckedIn ? (
                                    <button
                                        onClick={handleCheckIn}
                                        disabled={punchLoading}
                                        className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <FiLogIn className="text-base" />
                                        <span>Check In Now</span>
                                    </button>
                                ) : !isCheckedOut ? (
                                    <button
                                        onClick={handleCheckOut}
                                        disabled={punchLoading}
                                        className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <FiLogOut className="text-base" />
                                        <span>Check Out Shift</span>
                                    </button>
                                ) : (
                                    <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-500 font-semibold text-xs text-center border border-slate-200">
                                        Shift Done for Today
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Leave Balances Cards */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Casual Leave</span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-3xl font-extrabold text-teal-700">{leaveBalance.casual || 0}</span>
                                <span className="text-xs text-slate-400">Days Available</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-2">Standard quota: 12 days</p>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Sick Leave</span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-3xl font-extrabold text-indigo-700">{leaveBalance.sick || 0}</span>
                                <span className="text-xs text-slate-400">Days Available</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-2">Standard quota: 10 days</p>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Annual Leave</span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-3xl font-extrabold text-amber-600">{leaveBalance.annual || 0}</span>
                                <span className="text-xs text-slate-400">Days Available</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-2">Standard quota: 15 days</p>
                        </div>
                    </div>

                    {/* Quick status bar */}
                    <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-teal-600 text-white">
                                <FiBriefcase className="text-lg" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-teal-900">Leave Applications Overview</h4>
                                <p className="text-xs text-teal-700">
                                    You have {myPendingLeaves} pending application(s) and {myApprovedLeaves} approved leave(s).
                                </p>
                            </div>
                        </div>
                        <Link
                            to="/leaves"
                            className="text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1"
                        >
                            View Requests &rarr;
                        </Link>
                    </div>

                    {/* Upcoming Shifts for Employee */}
                    <Card
                        title="My Upcoming Shifts & Schedules"
                        subtitle="Your confirmed assignments and operational duties"
                        action={
                            <Link to="/schedules" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                                View Calendar &rarr;
                            </Link>
                        }
                        noPadding
                    >
                        <div className="divide-y divide-slate-100">
                            {myUpcomingSchedules.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400">
                                    No scheduled shifts assigned for upcoming dates.
                                </div>
                            ) : (
                                myUpcomingSchedules.map(sch => (
                                    <div key={sch._id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">{sch.title}</p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-teal-700 font-semibold">
                                                <span>{sch.date}</span>
                                                <span>&bull;</span>
                                                <span>{sch.startTime} - {sch.endTime}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{sch.location || 'Main Office'} &bull; {sch.details || 'General shift'}</p>
                                        </div>
                                        <Badge status="present">Assigned</Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Company Announcements Section */}
            <Card
                title="Company Announcements"
                subtitle="Broadcasts and policy notices from administration"
                action={
                    <Link to="/messaging" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                        Messaging Center &rarr;
                    </Link>
                }
                noPadding
            >
                <div className="divide-y divide-slate-100">
                    {announcements.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">No company announcements posted.</div>
                    ) : (
                        announcements.map(ann => (
                            <div key={ann._id} className="p-4.5 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-900">{ann.subject || 'Announcement'}</span>
                                    <span className="text-[11px] text-slate-400">
                                        {formatDate(ann.createdAt)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{ann.content}</p>
                                <span className="text-[10px] text-teal-600 font-semibold mt-2 block">
                                    Broadcast by {ann.sender_id?.name || 'Administrator'}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
}