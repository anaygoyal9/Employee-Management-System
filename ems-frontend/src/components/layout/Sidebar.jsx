import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import {
    FiGrid,
    FiUsers,
    FiLayers,
    FiClock,
    FiCalendar,
    FiCheckSquare,
    FiBell,
    FiMessageSquare,
    FiBarChart2,
    FiSettings,
    FiUser,
    FiLogOut,
    FiX
} from 'react-icons/fi';
import { HiOutlineBriefcase } from 'react-icons/hi';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const isAdmin = user?.role === 'admin';

    const adminNavItems = [
        { name: 'Dashboard', path: '/admin-dashboard', icon: FiGrid },
        { name: 'Employees', path: '/employees', icon: FiUsers },
        { name: 'Departments', path: '/departments', icon: FiLayers },
        { name: 'Attendance', path: '/attendance', icon: FiClock },
        { name: 'Leave Requests', path: '/leaves', icon: FiCalendar },
        { name: 'Schedules', path: '/schedules', icon: FiCheckSquare },
        { name: 'Notifications', path: '/notifications', icon: FiBell },
        { name: 'Messaging', path: '/messaging', icon: FiMessageSquare },
        { name: 'Reports & Analytics', path: '/reports', icon: FiBarChart2 },
        { name: 'Settings', path: '/settings', icon: FiSettings },
    ];

    const employeeNavItems = [
        { name: 'Dashboard', path: '/employee-dashboard', icon: FiGrid },
        { name: 'My Attendance', path: '/attendance', icon: FiClock },
        { name: 'Leave Requests', path: '/leaves', icon: FiCalendar },
        { name: 'My Schedules', path: '/schedules', icon: FiCheckSquare },
        { name: 'Notifications', path: '/notifications', icon: FiBell },
        { name: 'Messaging', path: '/messaging', icon: FiMessageSquare },
        { name: 'My Profile', path: '/profile', icon: FiUser },
        { name: 'Settings', path: '/settings', icon: FiSettings },
    ];

    const navItems = isAdmin ? adminNavItems : employeeNavItems;

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Shell */}
            <aside
                className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col justify-between border-r border-slate-200/80 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Brand Header */}
                <div>
                    <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-md shadow-teal-500/20">
                                <HiOutlineBriefcase className="text-xl" />
                            </div>
                            <div>
                                <span className="font-bold text-base text-white tracking-tight">Enterprise EMS</span>
                                <span className="block text-[10px] uppercase font-semibold text-teal-400 tracking-wider">
                                    {isAdmin ? 'Admin Console' : 'Employee Portal'}
                                </span>
                            </div>
                        </div>

                        {/* Mobile Close Button */}
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
                        >
                            <FiX className="text-xl" />
                        </button>
                    </div>

                    {/* Navigation Items */}
                    <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-10rem)]">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => onClose && onClose()}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${isActive
                                            ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-sm shadow-teal-600/30 font-bold'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                                        }`
                                    }
                                >
                                    <Icon className="text-base shrink-0" />
                                    <span>{item.name}</span>
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>

                {/* Footer Section */}
                <div className="p-3 border-t border-slate-800">
                    <div className="px-3 py-2 rounded-xl bg-slate-800/40 mb-2 flex items-center justify-between">
                        <div className="truncate pr-2">
                            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                            <p className="text-[10px] text-teal-400 font-medium capitalize">{user?.role} Mode</p>
                        </div>
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-600/20 border border-rose-500/20 transition-all cursor-pointer"
                    >
                        <FiLogOut className="text-sm" /> Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
