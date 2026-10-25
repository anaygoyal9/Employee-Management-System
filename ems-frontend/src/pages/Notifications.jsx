import { useState, useEffect, useCallback } from 'react';
import { FiBell, FiCheck, FiCheckCircle, FiTrash2, FiPlus } from 'react-icons/fi';
import api, { getErrorMessage } from '../utils/api';
import { useAuth } from '../context/authContext';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PageHeader, Field, Alert, EmptyState, inputCls, btnPrimary, btnSecondary, iconBtn } from '../components/common/ui';

const TYPES = ['general', 'announcement', 'system', 'leave', 'schedule', 'attendance'];

export default function Notifications() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [filter, setFilter] = useState('all'); // all | unread

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ title: '', message: '', type: 'announcement', target_role: 'all' });
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api.get('/notifications');
            setItems(res.data.notifications);
            setUnread(res.data.unreadCount);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load notifications.'));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const isRead = (n) => n.read_by?.some((id) => (id?._id || id) === user?._id);

    const markRead = async (n) => {
        try {
            await api.patch(`/notifications/${n._id}/read`);
            load();
        } catch (err) { setError(getErrorMessage(err)); }
    };

    const markAll = async () => {
        try {
            await api.patch('/notifications/mark-all-read');
            load();
        } catch (err) { setError(getErrorMessage(err)); }
    };

    const remove = async (n) => {
        try {
            await api.delete(`/notifications/${n._id}`);
            setSuccess('Notification deleted.');
            load();
        } catch (err) { setError(getErrorMessage(err)); }
    };

    const create = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            await api.post('/notifications', form);
            setSuccess('Notification sent.');
            setModalOpen(false);
            setForm({ title: '', message: '', type: 'announcement', target_role: 'all' });
            load();
        } catch (err) {
            setFormError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingSpinner text="Loading notifications..." />;
    const shown = filter === 'unread' ? items.filter((n) => !isRead(n)) : items;

    return (
        <div>
            <PageHeader title="Notifications" subtitle={`${unread} unread`}>
                {unread > 0 && <button className={btnSecondary} onClick={markAll}><FiCheckCircle /> Mark all read</button>}
                {isAdmin && <button className={btnPrimary} onClick={() => { setFormError(null); setModalOpen(true); }}><FiPlus /> New Notification</button>}
            </PageHeader>
            <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
            <Alert type="success" onClose={() => setSuccess(null)}>{success}</Alert>

            <div className="flex gap-2 mb-4">
                {['all', 'unread'].map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize cursor-pointer border ${filter === f ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                        {f}
                    </button>
                ))}
            </div>

            <Card noPadding>
                {shown.length === 0 ? <EmptyState text="You're all caught up." /> : (
                    <ul className="divide-y divide-slate-100">
                        {shown.map((n) => {
                            const read = isRead(n);
                            return (
                                <li key={n._id} className={`p-4 flex items-start gap-3 ${read ? '' : 'bg-teal-50/40'}`}>
                                    <div className={`mt-0.5 p-2 rounded-lg ${read ? 'bg-slate-100 text-slate-400' : 'bg-teal-100 text-teal-700'}`}><FiBell /></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-bold text-slate-800">{n.title}</p>
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{n.type}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                                        <p className="text-[11px] text-slate-400 mt-1.5">
                                            {n.sent_by?.name ? `From ${n.sent_by.name} · ` : ''}{new Date(n.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0">
                                        {!read && <button className={iconBtn} title="Mark as read" onClick={() => markRead(n)}><FiCheck /></button>}
                                        {isAdmin && <button className={iconBtn} title="Delete" onClick={() => remove(n)}><FiTrash2 /></button>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Notification"
                footer={<>
                    <button type="button" className={btnSecondary} onClick={() => setModalOpen(false)}>Cancel</button>
                    <button type="submit" form="notif-form" className={btnPrimary} disabled={saving}>{saving ? 'Sending...' : 'Send'}</button>
                </>}>
                <Alert type="error">{formError}</Alert>
                <form id="notif-form" onSubmit={create} className="space-y-4">
                    <Field label="Title"><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Company Announcement" /></Field>
                    <Field label="Message"><textarea required rows={4} className={inputCls} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Type">
                            <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </Field>
                        <Field label="Audience">
                            <select className={inputCls} value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })}>
                                <option value="all">Everyone</option>
                                <option value="employee">Employees</option>
                                <option value="admin">Admins</option>
                            </select>
                        </Field>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
