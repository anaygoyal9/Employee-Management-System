import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/authContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

import Login from '../pages/Login.jsx';
import AdminDashboard from '../pages/AdminDashboard.jsx';
import EmployeeDashboard from '../pages/EmployeeDashboard.jsx';
import Employees from '../pages/Employees.jsx';
import Departments from '../pages/Departments.jsx';
import Attendance from '../pages/Attendance.jsx';
import Leaves from '../pages/Leaves.jsx';
import Schedules from '../pages/Schedules.jsx';
import Notifications from '../pages/Notifications.jsx';
import Messaging from '../pages/Messaging.jsx';
import Reports from '../pages/Reports.jsx';
import Settings from '../pages/Settings.jsx';
import Profile from '../pages/Profile.jsx';

const ADMIN = ['admin'];
const ANY = ['admin', 'employee'];

// "/" sends people to the right place based on session + role
function HomeRedirect() {
    const { user, loading } = useAuth();
    if (loading) return <LoadingSpinner size="lg" text="Loading..." />;
    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to={user.role === 'admin' ? '/admin-dashboard' : '/employee-dashboard'} replace />;
}

const guard = (element, roles = ANY) => (
    <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>
);

export default function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />

            <Route path="/admin-dashboard" element={guard(<AdminDashboard />, ADMIN)} />
            <Route path="/employee-dashboard" element={guard(<EmployeeDashboard />, ['employee'])} />

            <Route path="/employees" element={guard(<Employees />, ADMIN)} />
            <Route path="/departments" element={guard(<Departments />, ADMIN)} />
            <Route path="/reports" element={guard(<Reports />, ADMIN)} />

            <Route path="/attendance" element={guard(<Attendance />)} />
            <Route path="/leaves" element={guard(<Leaves />)} />
            <Route path="/schedules" element={guard(<Schedules />)} />
            <Route path="/notifications" element={guard(<Notifications />)} />
            <Route path="/messaging" element={guard(<Messaging />)} />
            <Route path="/settings" element={guard(<Settings />)} />
            <Route path="/profile" element={guard(<Profile />)} />

            <Route path="*" element={<HomeRedirect />} />
        </Routes>
    );
}
