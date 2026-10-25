import React from 'react';
import { FiAlertCircle, FiCheckCircle, FiInbox } from 'react-icons/fi';
import { assetUrl } from '../../utils/api';
import { getInitials } from '../../utils/formatters';

// Shared Tailwind class strings
export const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400';
export const btnPrimary =
    'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
export const btnSecondary =
    'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer';
export const btnDanger =
    'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer';
export const iconBtn =
    'p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors cursor-pointer';

export const PageHeader = ({ title, subtitle, children }) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-2.5 flex-wrap">{children}</div>}
    </div>
);

export const Field = ({ label, children, hint }) => (
    <label className="block">
        <span className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">{label}</span>
        {children}
        {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
);

export const Alert = ({ type = 'error', children, onClose }) => {
    if (!children) return null;
    const isError = type === 'error';
    return (
        <div
            className={`mb-4 flex items-start gap-2.5 p-3.5 rounded-xl border text-xs ${
                isError ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
        >
            {isError ? <FiAlertCircle className="text-base shrink-0 mt-0.5" /> : <FiCheckCircle className="text-base shrink-0 mt-0.5" />}
            <span className="flex-1">{children}</span>
            {onClose && (
                <button onClick={onClose} className="font-bold cursor-pointer" aria-label="Dismiss">
                    &times;
                </button>
            )}
        </div>
    );
};

export const EmptyState = ({ text = 'Nothing to show yet.' }) => (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <FiInbox className="text-3xl mb-2" />
        <p className="text-xs">{text}</p>
    </div>
);

export const Avatar = ({ user, size = 'h-9 w-9', text = 'text-xs' }) => {
    const [failed, setFailed] = React.useState(false);
    return (
        <div className={`${size} ${text} rounded-full bg-teal-600 text-white flex items-center justify-center font-bold overflow-hidden shrink-0`}>
            {user?.profileImage && !failed ? (
                <img
                    src={assetUrl(user.profileImage)}
                    alt={user?.name || ''}
                    className="h-full w-full object-cover"
                    onError={() => setFailed(true)}
                />
            ) : (
                getInitials(user?.name)
            )}
        </div>
    );
};

export const ConfirmModalBody = ({ children }) => <p className="text-sm text-slate-600">{children}</p>;

// Simple table shell with consistent styling
export const Table = ({ columns, children }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
            <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    {columns.map((c) => (
                        <th key={c} className="px-4 py-3 whitespace-nowrap">{c}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
    </div>
);
export const Td = ({ children, className = '' }) => (
    <td className={`px-4 py-3 text-slate-700 align-middle ${className}`}>{children}</td>
);
