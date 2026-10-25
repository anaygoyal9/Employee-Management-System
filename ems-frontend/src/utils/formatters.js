export const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    // If it's an ISO date string
    if (timeString.includes('T') || timeString.includes('Z')) {
        const date = new Date(timeString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    // If it's already HH:MM
    return timeString;
};

export const formatCurrency = (amount, currency = '$') => {
    if (amount === undefined || amount === null) return `${currency}0`;
    return `${currency}${Number(amount).toLocaleString()}`;
};

export const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

// ISO string -> value for <input type="datetime-local"> (in the browser's timezone)
export const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// YYYY-MM-DD for today, matching the format the backend stores
export const todayString = () => new Date().toISOString().split('T')[0];
