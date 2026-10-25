import { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiFileText, FiTrash2, FiEye, FiPlus } from 'react-icons/fi';
import api, { getErrorMessage, downloadFile } from '../utils/api';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PageHeader, Field, Alert, EmptyState, Table, Td, inputCls, btnPrimary, btnSecondary, iconBtn } from '../components/common/ui';

const EXPORTS = [
    { type: 'employees', label: 'Employees', desc: 'Directory with roles, departments and status', filters: ['status'] },
    { type: 'attendance', label: 'Attendance', desc: 'Check-in / check-out records', filters: ['date', 'status'] },
    { type: 'leaves', label: 'Leaves', desc: 'All leave applications and decisions', filters: ['status'] },
    { type: 'schedules', label: 'Schedules', desc: 'Shifts and assignments', filters: ['date'] }
];

// Types supported by POST /reports/generate
const SNAPSHOTS = [
    { value: 'user_summary', label: 'Workforce summary' },
    { value: 'attendance_summary', label: 'Attendance summary' },
    { value: 'leave_summary', label: 'Leave summary' },
    { value: 'schedule_summary', label: 'Schedule summary' },
    { value: 'department_summary', label: 'Department headcount' }
];

const prettyKey = (k) => k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');

const renderValue = (v) => {
    if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? Object.values(x).join(': ') : String(x))).join(', ') || '—';
    if (v && typeof v === 'object') return JSON.stringify(v);
    return String(v);
};

export default function Reports() {
    const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '' });
    const [busy, setBusy] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [snapshotType, setSnapshotType] = useState(SNAPSHOTS[0].value);
    const [generating, setGenerating] = useState(false);
    const [viewing, setViewing] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get('/reports');
            setReports(res.data.reports);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load reports.'));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const exportCsv = async (e) => {
        setBusy(e.type);
        try {
            const params = {};
            if (e.filters.includes('date')) { params.startDate = filters.startDate; params.endDate = filters.endDate; }
            if (e.filters.includes('status')) params.status = filters.status;
            await downloadFile(`/reports/export/${e.type}`, params, `${e.type}.csv`);
        } catch (err) {
            setError(getErrorMessage(err, 'Export failed.'));
        } finally {
            setBusy(null);
        }
    };

    const generate = async () => {
        setGenerating(true);
        try {
            await api.post('/reports/generate', { report_type: snapshotType });
            setSuccess('Report snapshot generated.');
            load();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setGenerating(false);
        }
    };

    const remove = async (r) => {
        try {
            await api.delete(`/reports/${r._id}`);
            setSuccess('Report deleted.');
            if (viewing?._id === r._id) setViewing(null);
            load();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    return (
        <div>
            <PageHeader title="Reports & Analytics" subtitle="Export data and keep point-in-time summaries" />
            <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
            <Alert type="success" onClose={() => setSuccess(null)}>{success}</Alert>

            <Card title="CSV Exports" subtitle="Filters apply to the exports that support them" className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    <Field label="From date"><input type="date" className={inputCls} value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></Field>
                    <Field label="To date"><input type="date" className={inputCls} value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></Field>
                    <Field label="Status" hint="active/inactive (employees) · present/late/half-day (attendance) · Pending/Approved/Rejected (leaves)">
                        <input className={inputCls} placeholder="e.g. active, Pending, late" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} />
                    </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {EXPORTS.map((e) => (
                        <div key={e.type} className="rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-slate-800">{e.label}</p>
                                <p className="text-xs text-slate-500 mt-1">{e.desc}</p>
                            </div>
                            <button className={btnSecondary} disabled={busy === e.type} onClick={() => exportCsv(e)}>
                                <FiDownload /> {busy === e.type ? 'Preparing...' : 'Download CSV'}
                            </button>
                        </div>
                    ))}
                </div>
            </Card>

            <Card title="Saved Report Snapshots" noPadding
                action={
                    <div className="flex items-center gap-2">
                        <select value={snapshotType} onChange={(e) => setSnapshotType(e.target.value)} className="text-xs rounded-lg border border-slate-200 px-2.5 py-2 bg-white">
                            {SNAPSHOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <button className={btnPrimary} disabled={generating} onClick={generate}><FiPlus /> {generating ? 'Generating...' : 'Generate'}</button>
                    </div>
                }>
                {loading ? <LoadingSpinner text="Loading reports..." /> : reports.length === 0 ? (
                    <EmptyState text="No snapshots yet. Generate one above." />
                ) : (
                    <Table columns={['Title', 'Type', 'Generated by', 'Created', 'Actions']}>
                        {reports.map((r) => (
                            <tr key={r._id} className="hover:bg-slate-50/60">
                                <Td><span className="inline-flex items-center gap-2 font-semibold text-slate-800"><FiFileText className="text-teal-600" />{r.title}</span></Td>
                                <Td>{r.report_type}</Td>
                                <Td>{r.generated_by?.name || '—'}</Td>
                                <Td className="whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</Td>
                                <Td>
                                    <button className={iconBtn} title="View" onClick={() => setViewing(r)}><FiEye /></button>
                                    <button className={iconBtn} title="Delete" onClick={() => remove(r)}><FiTrash2 /></button>
                                </Td>
                            </tr>
                        ))}
                    </Table>
                )}
            </Card>

            <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing?.title || 'Report'}
                footer={<button className={btnSecondary} onClick={() => setViewing(null)}>Close</button>}>
                {viewing && (
                    <dl className="divide-y divide-slate-100 text-sm">
                        {Object.entries(viewing.data || {}).map(([k, v]) => (
                            <div key={k} className="py-2.5 flex justify-between gap-4">
                                <dt className="text-slate-500 capitalize">{prettyKey(k)}</dt>
                                <dd className="font-semibold text-slate-800 text-right break-words">{renderValue(v)}</dd>
                            </div>
                        ))}
                        <p className="pt-3 text-[11px] text-slate-400">Generated {new Date(viewing.createdAt).toLocaleString()}</p>
                    </dl>
                )}
            </Modal>
        </div>
    );
}
