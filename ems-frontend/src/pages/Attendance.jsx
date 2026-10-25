import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiDownload, FiLogIn, FiLogOut, FiSearch } from 'react-icons/fi';
import api, { getErrorMessage, downloadFile } from '../utils/api';
import { useAuth } from '../context/authContext';
import useDebounce from '../hooks/useDebounce';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import StatCard from '../components/common/StatCard';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
    PageHeader, Field, Alert, EmptyState, Table, Td,
    inputCls, btnPrimary, btnSecondary, btnDanger, iconBtn
} from '../components/common/ui';
import { formatDate, formatTime, toLocalInput, todayString } from '../utils/formatters';
import { FiUsers, FiCheckCircle, FiClock, FiUserX } from 'react-icons/fi';

const LIMIT = 10;
const STATUSES = ['present', 'late', 'half-day', 'absent'];

export default function Attendance() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [records, setRecords] = useState([]);
    const [pagination, setPagination] = useState({ totalRecords: 0, totalPages: 1, currentPage: 1 });
    const [summary, setSummary] = useState(null);
    const [today, setToday] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState('');
    const debouncedSearch = useDebounce(search);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [punching, setPunching] = useState(false);

    const fetchRecords = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page, limit: LIMIT, startDate, endDate, status };
            if (isAdmin) params.search = debouncedSearch;
            const res = await api.get(isAdmin ? '/attendance' : '/attendance/my', { params });
            setRecords(res.data.records);
            setPagination(res.data.pagination);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load attendance.'));
        } finally {
            setLoading(false);
        }
    }, [page, startDate, endDate, status, debouncedSearch, isAdmin]);

    const fetchSummary = useCallback(async () => {
        try {
            if (isAdmin) {
                const res = await api.get('/attendance/summary');
                setSummary(res.data.summary);
            } else {
                const res = await api.get('/attendance/today');
                setToday(res.data.attendance);
            }
        } catch { /* non-critical */ }
    }, [isAdmin]);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);
    useEffect(() => { fetchSummary(); }, [fetchSummary]);
    useEffect(() => { setPage(1); }, [debouncedSearch, startDate, endDate, status]);

    useEffect(() => {
        if (!isAdmin) return;
        api.get('/users', { params: { limit: 500, status: 'active' } })
            .then((r) => setEmployees(r.data.users)).catch(() => {});
    }, [isAdmin]);

    const punch = async (kind) => {
        setPunching(true);
        try {
            const res = await api.post(`/attendance/${kind}`);
            setSuccess(res.data.message);
            setError(null);
            fetchRecords();
            fetchSummary();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setPunching(false);
        }
    };

    const openModal = (rec = null) => {
        setEditing(rec);
        setForm(rec ? {
            userId: rec.userId?._id, date: rec.date, checkIn: toLocalInput(rec.checkIn),
            checkOut: toLocalInput(rec.checkOut), status: rec.status, notes: rec.notes || ''
        } : { userId: '', date: todayString(), checkIn: '', checkOut: '', status: 'present', notes: '' });
        setFormError(null);
        setModalOpen(true);
    };

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        const payload = {
            date: form.date, status: form.status, notes: form.notes,
            checkIn: form.checkIn ? new Date(form.checkIn).toISOString() : undefined,
            checkOut: form.checkOut ? new Date(form.checkOut).toISOString() : undefined
        };
        try {
            if (editing) await api.put(`/attendance/admin/${editing._id}`, payload);
            else await api.post('/attendance/admin/record', { ...payload, userId: form.userId });
            setSuccess(editing ? 'Record corrected.' : 'Record created.');
            setModalOpen(false);
            fetchRecords();
            fetchSummary();
        } catch (err) {
            setFormError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/attendance/admin/${toDelete._id}`);
            setSuccess('Record deleted.');
            fetchRecords();
            fetchSummary();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setToDelete(null);
        }
    };

    const exportCsv = async () => {
        try {
            await downloadFile('/reports/export/attendance', { startDate, endDate, status }, 'attendance.csv');
        } catch (err) {
            setError(getErrorMessage(err, 'Export failed.'));
        }
    };

    const cols = isAdmin
        ? ['Date', 'Employee', 'Department', 'Check-in', 'Check-out', 'Hours', 'Status', 'Notes', 'Actions']
        : ['Date', 'Check-in', 'Check-out', 'Hours', 'Status', 'Notes'];

    return (
        <div>
            <PageHeader title={isAdmin ? 'Attendance' : 'My Attendance'}
                subtitle={isAdmin ? 'Company-wide attendance log and corrections' : 'Your daily check-in history'}>
                {isAdmin ? (
                    <>
                        <button className={btnSecondary} onClick={exportCsv}><FiDownload /> Export CSV</button>
                        <button className={btnPrimary} onClick={() => openModal()}><FiPlus /> Add Record</button>
                    </>
                ) : !today?.checkIn ? (
                    <button className={btnPrimary} disabled={punching} onClick={() => punch('check-in')}><FiLogIn /> Check In</button>
                ) : !today?.checkOut ? (
                    <button className={btnDanger} disabled={punching} onClick={() => punch('check-out')}><FiLogOut /> Check Out</button>
                ) : null}
            </PageHeader>

            <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
            <Alert type="success" onClose={() => setSuccess(null)}>{success}</Alert>

            {isAdmin && summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard title="Active Employees" value={summary.totalActiveEmployees} icon={FiUsers} color="indigo" />
                    <StatCard title="Checked In Today" value={summary.totalCheckedIn} icon={FiCheckCircle} color="emerald" subtext={`${summary.attendanceRate}% rate`} />
                    <StatCard title="Late Today" value={summary.lateToday} icon={FiClock} color="amber" />
                    <StatCard title="Absent Today" value={summary.absentToday} icon={FiUserX} color="rose" />
                </div>
            )}

            <Card noPadding>
                <div className={`p-4 grid grid-cols-1 gap-3 border-b border-slate-100 ${isAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                    {isAdmin && (
                        <div className="relative">
                            <FiSearch className="absolute left-3.5 top-3.5 text-slate-400" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee..." className={`${inputCls} pl-10`} />
                        </div>
                    )}
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} title="From" />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} title="To" />
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                        <option value="">All statuses</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {loading ? <LoadingSpinner text="Loading records..." /> : records.length === 0 ? (
                    <EmptyState text="No attendance records found." />
                ) : (
                    <Table columns={cols}>
                        {records.map((r) => (
                            <tr key={r._id} className="hover:bg-slate-50/60">
                                <Td className="whitespace-nowrap">{formatDate(r.date)}</Td>
                                {isAdmin && <>
                                    <Td>
                                        <p className="font-bold text-slate-800">{r.userId?.name || 'Deleted user'}</p>
                                        <p className="text-[11px] text-slate-400">{r.userId?.employeeId}</p>
                                    </Td>
                                    <Td>{r.userId?.department?.name || '—'}</Td>
                                </>}
                                <Td>{formatTime(r.checkIn)}</Td>
                                <Td>{r.checkOut ? formatTime(r.checkOut) : '—'}</Td>
                                <Td>{r.totalHours ?? 0}</Td>
                                <Td><Badge status={r.status} /></Td>
                                <Td className="max-w-[180px] truncate">{r.notes || '—'}</Td>
                                {isAdmin && (
                                    <Td>
                                        <div className="flex">
                                            <button className={iconBtn} title="Edit" onClick={() => openModal(r)}><FiEdit2 /></button>
                                            <button className={iconBtn} title="Delete" onClick={() => setToDelete(r)}><FiTrash2 /></button>
                                        </div>
                                    </Td>
                                )}
                            </tr>
                        ))}
                    </Table>
                )}
                <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages}
                    totalItems={pagination.totalRecords} limit={LIMIT} onPageChange={setPage} />
            </Card>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Correct Attendance Record' : 'Add Attendance Record'}
                footer={<>
                    <button type="button" className={btnSecondary} onClick={() => setModalOpen(false)}>Cancel</button>
                    <button type="submit" form="att-form" className={btnPrimary} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </>}>
                <Alert type="error">{formError}</Alert>
                <form id="att-form" onSubmit={save} className="space-y-4">
                    {!editing && (
                        <Field label="Employee">
                            <select required className={inputCls} value={form.userId || ''} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                                <option value="">Select employee</option>
                                {employees.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.employeeId})</option>)}
                            </select>
                        </Field>
                    )}
                    <Field label="Date"><input required type="date" className={inputCls} value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Check-in"><input required type="datetime-local" className={inputCls} value={form.checkIn || ''} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} /></Field>
                        <Field label="Check-out"><input type="datetime-local" className={inputCls} value={form.checkOut || ''} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} /></Field>
                    </div>
                    <Field label="Status">
                        <select className={inputCls} value={form.status || 'present'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Notes"><input className={inputCls} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
                </form>
            </Modal>

            <Modal isOpen={!!toDelete} onClose={() => setToDelete(null)} title="Delete record"
                footer={<>
                    <button className={btnSecondary} onClick={() => setToDelete(null)}>Cancel</button>
                    <button className={btnDanger} onClick={confirmDelete}>Delete</button>
                </>}>
                <p className="text-sm text-slate-600">Delete the record for <b>{toDelete?.userId?.name}</b> on {toDelete?.date}?</p>
            </Modal>
        </div>
    );
}
