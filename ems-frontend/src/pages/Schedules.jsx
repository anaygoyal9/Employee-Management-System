import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiDownload, FiMapPin, FiClock } from 'react-icons/fi';
import api, { getErrorMessage, downloadFile } from '../utils/api';
import { useAuth } from '../context/authContext';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PageHeader, Field, Alert, EmptyState, inputCls, btnPrimary, btnSecondary, btnDanger, iconBtn } from '../components/common/ui';
import { formatDate, todayString } from '../utils/formatters';

const emptyForm = { title: '', date: '', startTime: '09:00', endTime: '17:00', location: 'Main Office', details: '', employeeId: '', department: '' };

export default function Schedules() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [schedules, setSchedules] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [upcomingOnly, setUpcomingOnly] = useState(true);
    const [filterEmployee, setFilterEmployee] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (upcomingOnly) params.upcoming = 'true';
            if (isAdmin && filterEmployee) params.employeeId = filterEmployee;
            const res = await api.get('/schedules', { params });
            setSchedules(res.data.schedules);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load schedules.'));
        } finally {
            setLoading(false);
        }
    }, [upcomingOnly, filterEmployee, isAdmin]);
    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!isAdmin) return;
        api.get('/users', { params: { limit: 500, status: 'active' } }).then((r) => setEmployees(r.data.users)).catch(() => {});
        api.get('/departments').then((r) => setDepartments(r.data.departments)).catch(() => {});
    }, [isAdmin]);

    const openModal = (s = null) => {
        setEditing(s);
        setForm(s ? {
            title: s.title, date: s.date, startTime: s.startTime, endTime: s.endTime, location: s.location || '',
            details: s.details || '', employeeId: s.employeeId?._id || '', department: s.department?._id || ''
        } : { ...emptyForm, date: todayString() });
        setFormError(null);
        setModalOpen(true);
    };

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        // empty string -> null so the backend clears the assignment (PUT) or leaves it open (POST)
        const payload = { ...form, employeeId: form.employeeId || null, department: form.department || null };
        try {
            if (editing) await api.put(`/schedules/${editing._id}`, payload);
            else await api.post('/schedules', payload);
            setSuccess(editing ? 'Schedule updated.' : 'Schedule created.');
            setModalOpen(false);
            load();
        } catch (err) {
            setFormError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/schedules/${toDelete._id}`);
            setSuccess('Schedule deleted.');
            load();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setToDelete(null);
        }
    };

    const exportCsv = async () => {
        try {
            await downloadFile('/reports/export/schedules', {}, 'schedules.csv');
        } catch (err) {
            setError(getErrorMessage(err, 'Export failed.'));
        }
    };

    // group by date
    const grouped = schedules.reduce((acc, s) => { (acc[s.date] = acc[s.date] || []).push(s); return acc; }, {});
    const dates = Object.keys(grouped).sort();
    const today = todayString();

    return (
        <div>
            <PageHeader title={isAdmin ? 'Schedules' : 'My Schedules'} subtitle="Shifts, meetings and assignments">
                {isAdmin && <>
                    <button className={btnSecondary} onClick={exportCsv}><FiDownload /> Export CSV</button>
                    <button className={btnPrimary} onClick={() => openModal()}><FiPlus /> New Schedule</button>
                </>}
            </PageHeader>
            <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
            <Alert type="success" onClose={() => setSuccess(null)}>{success}</Alert>

            <div className="flex flex-wrap items-center gap-3 mb-5">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                    <input type="checkbox" checked={upcomingOnly} onChange={(e) => setUpcomingOnly(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-600" />
                    Upcoming only
                </label>
                {isAdmin && (
                    <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} className={`${inputCls} max-w-xs`}>
                        <option value="">All employees</option>
                        {employees.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                    </select>
                )}
            </div>

            {loading ? <LoadingSpinner text="Loading schedules..." /> : dates.length === 0 ? (
                <Card><EmptyState text="No schedules found." /></Card>
            ) : (
                <div className="space-y-5">
                    {dates.map((d) => (
                        <div key={d}>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                {formatDate(d)} {d === today && <span className="ml-2 text-teal-600">Today</span>}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {grouped[d].map((s) => (
                                    <div key={s._id} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate">{s.title}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {s.employeeId ? s.employeeId.name : 'Open / all employees'} &bull; {s.department?.name || 'General'}
                                                </p>
                                            </div>
                                            {isAdmin && (
                                                <div className="flex shrink-0">
                                                    <button className={iconBtn} title="Edit" onClick={() => openModal(s)}><FiEdit2 /></button>
                                                    <button className={iconBtn} title="Delete" onClick={() => setToDelete(s)}><FiTrash2 /></button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-teal-700 font-semibold">
                                            <span className="inline-flex items-center gap-1"><FiClock /> {s.startTime} - {s.endTime}</span>
                                            <span className="inline-flex items-center gap-1"><FiMapPin /> {s.location || 'Main Office'}</span>
                                        </div>
                                        {s.details && <p className="text-xs text-slate-500 mt-2">{s.details}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Schedule' : 'New Schedule'}
                footer={<>
                    <button type="button" className={btnSecondary} onClick={() => setModalOpen(false)}>Cancel</button>
                    <button type="submit" form="sched-form" className={btnPrimary} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </>}>
                <Alert type="error">{formError}</Alert>
                <form id="sched-form" onSubmit={save} className="space-y-4">
                    <Field label="Title"><input required className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Date"><input required type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
                        <Field label="Start"><input required type="time" className={inputCls} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
                        <Field label="End"><input required type="time" className={inputCls} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field>
                    </div>
                    <Field label="Assign to" hint="Leave empty to post for everyone">
                        <select className={inputCls} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                            <option value="">Everyone (open)</option>
                            {employees.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Department">
                        <select className={inputCls} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                            <option value="">General</option>
                            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Location"><input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
                    <Field label="Details"><textarea rows={2} className={inputCls} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></Field>
                </form>
            </Modal>

            <Modal isOpen={!!toDelete} onClose={() => setToDelete(null)} title="Delete schedule"
                footer={<>
                    <button className={btnSecondary} onClick={() => setToDelete(null)}>Cancel</button>
                    <button className={btnDanger} onClick={confirmDelete}>Delete</button>
                </>}>
                <p className="text-sm text-slate-600">Delete <b>{toDelete?.title}</b> on {toDelete?.date}?</p>
            </Modal>
        </div>
    );
}
