import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiCheck, FiX, FiSlash, FiDownload, FiSearch } from 'react-icons/fi';
import api, { getErrorMessage, downloadFile } from '../utils/api';
import { useAuth } from '../context/authContext';
import useDebounce from '../hooks/useDebounce';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
    PageHeader, Field, Alert, EmptyState, Table, Td,
    inputCls, btnPrimary, btnSecondary, btnDanger, iconBtn
} from '../components/common/ui';
import { formatDate, todayString } from '../utils/formatters';

const LIMIT = 10;
// Must match the enum in the backend Leave model
const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Maternity/Paternity', 'Unpaid Leave'];
const STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

const daysBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000) + 1);

export default function Leaves() {
    const { user, refreshUser } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [leaves, setLeaves] = useState([]);
    const [balance, setBalance] = useState(null);
    const [pagination, setPagination] = useState({ totalRecords: 0, totalPages: 1, currentPage: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [leaveType, setLeaveType] = useState('');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search);

    const [applyOpen, setApplyOpen] = useState(false);
    const [form, setForm] = useState({ leaveType: LEAVE_TYPES[1], startDate: '', endDate: '', reason: '' });
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);

    const [decision, setDecision] = useState(null); // { leave, status }
    const [decisionReason, setDecisionReason] = useState('');
    const [toCancel, setToCancel] = useState(null);

    const fetchLeaves = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page, limit: LIMIT, status };
            if (isAdmin) { params.leaveType = leaveType; params.search = debouncedSearch; }
            const res = await api.get(isAdmin ? '/leaves' : '/leaves/my', { params });
            setLeaves(res.data.leaves);
            setPagination(res.data.pagination);
            if (res.data.leaveBalance) setBalance(res.data.leaveBalance);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load leave requests.'));
        } finally {
            setLoading(false);
        }
    }, [page, status, leaveType, debouncedSearch, isAdmin]);

    useEffect(() => { fetchLeaves(); }, [fetchLeaves]);
    useEffect(() => { setPage(1); }, [status, leaveType, debouncedSearch]);

    const apply = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            await api.post('/leaves/apply', form);
            setSuccess('Leave request submitted.');
            setApplyOpen(false);
            setForm({ leaveType: LEAVE_TYPES[1], startDate: '', endDate: '', reason: '' });
            fetchLeaves();
        } catch (err) {
            setFormError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const submitDecision = async () => {
        try {
            await api.patch(`/leaves/${decision.leave._id}/status`, { status: decision.status, decisionReason });
            setSuccess(`Leave ${decision.status.toLowerCase()}.`);
            setDecision(null);
            setDecisionReason('');
            fetchLeaves();
        } catch (err) {
            setError(getErrorMessage(err));
            setDecision(null);
        }
    };

    const cancelLeave = async () => {
        try {
            await api.patch(`/leaves/${toCancel._id}/cancel`);
            setSuccess('Leave request cancelled.');
            fetchLeaves();
            refreshUser();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setToCancel(null);
        }
    };

    const exportCsv = async () => {
        try {
            await downloadFile('/reports/export/leaves', { status }, 'leaves.csv');
        } catch (err) {
            setError(getErrorMessage(err, 'Export failed.'));
        }
    };

    const cols = isAdmin
        ? ['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Actions']
        : ['Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Decision note', 'Actions'];

    return (
        <div>
            <PageHeader title={isAdmin ? 'Leave Requests' : 'My Leave'}
                subtitle={isAdmin ? 'Review and decide on employee leave applications' : 'Apply for leave and track your requests'}>
                {isAdmin
                    ? <button className={btnSecondary} onClick={exportCsv}><FiDownload /> Export CSV</button>
                    : <button className={btnPrimary} onClick={() => { setFormError(null); setApplyOpen(true); }}><FiPlus /> Apply for Leave</button>}
            </PageHeader>

            <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
            <Alert type="success" onClose={() => setSuccess(null)}>{success}</Alert>

            {!isAdmin && balance && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {[['Casual', balance.casual, 'text-teal-700'], ['Sick', balance.sick, 'text-indigo-700'], ['Annual', balance.annual, 'text-amber-600']].map(([n, v, c]) => (
                        <div key={n} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{n} balance</span>
                            <p className={`text-2xl font-extrabold mt-1 ${c}`}>{v} <span className="text-xs text-slate-400 font-medium">days</span></p>
                        </div>
                    ))}
                </div>
            )}

            <Card noPadding>
                <div className={`p-4 grid grid-cols-1 gap-3 border-b border-slate-100 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
                    {isAdmin && (
                        <div className="relative">
                            <FiSearch className="absolute left-3.5 top-3.5 text-slate-400" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee..." className={`${inputCls} pl-10`} />
                        </div>
                    )}
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                        <option value="">All statuses</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {isAdmin && (
                        <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className={inputCls}>
                            <option value="">All leave types</option>
                            {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}
                </div>

                {loading ? <LoadingSpinner text="Loading leave requests..." /> : leaves.length === 0 ? (
                    <EmptyState text="No leave requests found." />
                ) : (
                    <Table columns={cols}>
                        {leaves.map((l) => (
                            <tr key={l._id} className="hover:bg-slate-50/60">
                                {isAdmin && (
                                    <Td>
                                        <p className="font-bold text-slate-800">{l.userId?.name || 'Deleted user'}</p>
                                        <p className="text-[11px] text-slate-400">{l.userId?.department?.name || l.userId?.employeeId}</p>
                                    </Td>
                                )}
                                <Td>{l.leaveType}</Td>
                                <Td className="whitespace-nowrap">{formatDate(l.startDate)}</Td>
                                <Td className="whitespace-nowrap">{formatDate(l.endDate)}</Td>
                                <Td>{daysBetween(l.startDate, l.endDate)}</Td>
                                <Td className="max-w-[220px]"><p className="truncate" title={l.reason}>{l.reason}</p></Td>
                                <Td><Badge status={l.status} /></Td>
                                {!isAdmin && <Td className="max-w-[180px] truncate">{l.decisionReason || '—'}</Td>}
                                <Td>
                                    {isAdmin && l.status === 'Pending' && (
                                        <div className="flex">
                                            <button className={`${iconBtn} hover:text-emerald-600`} title="Approve" onClick={() => setDecision({ leave: l, status: 'Approved' })}><FiCheck /></button>
                                            <button className={`${iconBtn} hover:text-rose-600`} title="Reject" onClick={() => setDecision({ leave: l, status: 'Rejected' })}><FiX /></button>
                                        </div>
                                    )}
                                    {!isAdmin && l.status === 'Pending' && (
                                        <button className={iconBtn} title="Cancel request" onClick={() => setToCancel(l)}><FiSlash /></button>
                                    )}
                                </Td>
                            </tr>
                        ))}
                    </Table>
                )}
                <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages}
                    totalItems={pagination.totalRecords} limit={LIMIT} onPageChange={setPage} />
            </Card>

            {/* Apply */}
            <Modal isOpen={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for Leave"
                footer={<>
                    <button type="button" className={btnSecondary} onClick={() => setApplyOpen(false)}>Cancel</button>
                    <button type="submit" form="leave-form" className={btnPrimary} disabled={saving}>{saving ? 'Submitting...' : 'Submit'}</button>
                </>}>
                <Alert type="error">{formError}</Alert>
                <form id="leave-form" onSubmit={apply} className="space-y-4">
                    <Field label="Leave type">
                        <select className={inputCls} value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>
                            {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Start date"><input required type="date" min={todayString()} className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
                        <Field label="End date"><input required type="date" min={form.startDate || todayString()} className={inputCls} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
                    </div>
                    <Field label="Reason"><textarea required rows={3} className={inputCls} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
                </form>
            </Modal>

            {/* Approve / reject */}
            <Modal isOpen={!!decision} onClose={() => setDecision(null)} title={`${decision?.status === 'Approved' ? 'Approve' : 'Reject'} leave request`}
                footer={<>
                    <button className={btnSecondary} onClick={() => setDecision(null)}>Cancel</button>
                    <button className={decision?.status === 'Approved' ? btnPrimary : btnDanger} onClick={submitDecision}>Confirm {decision?.status}</button>
                </>}>
                <p className="text-sm text-slate-600 mb-4">
                    <b>{decision?.leave.userId?.name}</b> &middot; {decision?.leave.leaveType} &middot; {decision && formatDate(decision.leave.startDate)} to {decision && formatDate(decision.leave.endDate)}
                </p>
                <Field label="Note to employee (optional)">
                    <textarea rows={3} className={inputCls} value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} />
                </Field>
            </Modal>

            <Modal isOpen={!!toCancel} onClose={() => setToCancel(null)} title="Cancel leave request"
                footer={<>
                    <button className={btnSecondary} onClick={() => setToCancel(null)}>Keep request</button>
                    <button className={btnDanger} onClick={cancelLeave}>Cancel request</button>
                </>}>
                <p className="text-sm text-slate-600">Cancel your pending {toCancel?.leaveType} request?</p>
            </Modal>
        </div>
    );
}
