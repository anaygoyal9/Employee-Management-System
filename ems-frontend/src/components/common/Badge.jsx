
const Badge = ({ status, variant, children }) => {
    const value = (status || children || '').toString().toLowerCase();

    const getStyles = () => {
        switch (value) {
            case 'present':
            case 'approved':
            case 'active':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'late':
            case 'pending':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'absent':
            case 'rejected':
            case 'inactive':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'half-day':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'cancelled':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'admin':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'employee':
            case 'user':
                return 'bg-teal-100 text-teal-800 border-teal-200';
            default:
                return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getStyles()}`}>
            {children || status}
        </span>
    );
};

export default Badge;
