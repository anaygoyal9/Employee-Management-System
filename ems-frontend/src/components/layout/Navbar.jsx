import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import {
    FiBell,
    FiMenu,
    FiUser,
    FiSettings,
    FiLogOut,
    FiCheckCircle,
    FiCheck
} from 'react-icons/fi';
import api from '../../utils/api';
import { Avatar } from '../common/ui';

const Navbar = ({ onToggleSidebar }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    const notifRef = useRef(null);
    const userRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            if (res.data.success) {
                setNotifications(res.data.notifications || []);
                setUnreadCount(res.data.unreadCount || 0);
            }
        } catch (err) {
            console.error("Error fetching notifications in navbar:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 45000); // refresh every 45s
        return () => clearInterval(interval);
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifDropdown(false);
            }
            if (userRef.current && !userRef.current.contains(e.target)) {
                setShowUserDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id, e) => {
        e.stopPropagation();
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, read_by: [...(n.read_by || []), user._id] } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.patch('/notifications/mark-all-read');
            fetchNotifications();
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    const todayDateFormatted = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6">
            {/* Left: Mobile hamburger & Greeting */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer"
                    aria-label="Toggle Navigation Menu"
                >
                    <FiMenu className="text-xl" />
                </button>
                <div>
                    <h2 className="text-sm font-semibold text-slate-800 hidden sm:block">
                        Welcome back, <span className="text-teal-700">{user?.name}</span>
                    </h2>
                    <p className="text-xs text-slate-500 hidden sm:block">{todayDateFormatted}</p>
                </div>
            </div>

            {/* Right: Quick actions & Profile */}
            <div className="flex items-center gap-3">
                {/* Notifications Bell */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Notifications"
                    >
                        <FiBell className="text-xl" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown Drawer */}
                    {showNotifDropdown && (
                        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Notifications ({unreadCount} new)
                                </span>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 cursor-pointer"
                                    >
                                        <FiCheckCircle className="text-xs" /> Mark all read
                                    </button>
                                )}
                            </div>

                            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                                {notifications.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-slate-400">
                                        No notifications yet
                                    </div>
                                ) : (
                                    notifications.slice(0, 5).map(n => {
                                        const isRead = n.read_by?.some(id => id === user?._id || id?._id === user?._id);
                                        return (
                                            <div
                                                key={n._id}
                                                className={`p-3 text-xs flex items-start justify-between gap-2 hover:bg-slate-50 transition-colors ${!isRead ? 'bg-teal-50/40' : ''}`}
                                            >
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-800">{n.title || 'Notification'}</p>
                                                    <p className="text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                                                    <span className="text-[10px] text-slate-400 mt-1 block">
                                                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                {!isRead && (
                                                    <button
                                                        onClick={(e) => handleMarkAsRead(n._id, e)}
                                                        className="text-slate-400 hover:text-teal-600 p-1 cursor-pointer"
                                                        title="Mark as read"
                                                    >
                                                        <FiCheck className="text-sm" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="border-t border-slate-100 px-4 py-2 text-center bg-slate-50/50 rounded-b-2xl">
                                <Link
                                    to="/notifications"
                                    onClick={() => setShowNotifDropdown(false)}
                                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                                >
                                    View all notifications &rarr;
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* User Profile Dropdown */}
                <div className="relative" ref={userRef}>
                    <button
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <Avatar user={user} />
                        <div className="hidden md:block text-left pr-1">
                            <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</p>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600">
                                {user?.role}
                            </span>
                        </div>
                    </button>

                    {showUserDropdown && (
                        <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="px-4 py-2.5 border-b border-slate-100">
                                <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
                                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                            </div>

                            <Link
                                to="/profile"
                                onClick={() => setShowUserDropdown(false)}
                                className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <FiUser className="text-slate-400 text-sm" /> My Profile
                            </Link>

                            <Link
                                to="/settings"
                                onClick={() => setShowUserDropdown(false)}
                                className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <FiSettings className="text-slate-400 text-sm" /> Settings
                            </Link>

                            <div className="border-t border-slate-100 my-1"></div>

                            <button
                                onClick={() => {
                                    setShowUserDropdown(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                            >
                                <FiLogOut className="text-rose-400 text-sm" /> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
