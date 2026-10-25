import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import DashboardLayout from '../components/layout/DashboardLayout';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <LoadingSpinner size="lg" text="Authenticating session..." />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role-based authorization
    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = user.role === 'user' ? 'employee' : user.role;
        const normalizedAllowed = allowedRoles.map(r => r === 'user' ? 'employee' : r);

        if (!normalizedAllowed.includes(userRole)) {
            // Unauthorized role access -> redirect to proper dashboard
            if (userRole === 'admin') {
                return <Navigate to="/admin-dashboard" replace />;
            }
            return <Navigate to="/employee-dashboard" replace />;
        }
    }

    return <DashboardLayout>{children}</DashboardLayout>;
};

export default ProtectedRoute;
