import { useState, useEffect, useCallback } from 'react';
import { FiSend, FiTrash2, FiEdit3, FiRadio, FiInbox, FiCornerUpLeft } from 'react-icons/fi';
import api, { getErrorMessage } from '../utils/api';
import { useAuth } from '../context/authContext';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PageHeader, Field, Alert, EmptyState, Avatar, inputCls, btnPrimary, btnSecondary, iconBtn } from '../components/common/ui';

const emptyForm = { type: 'dm', receiver_id: '', subject: '', content: '' };

export default function Messaging() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [messages, setMessages] = useState([]);
    const [directory, setDirectory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [tab, setTab] = useState('inbox'); // inbox | sent | announcements
    const [selected, setSelected] = useState(null);

    const [composeOpen, setComposeOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState(null);
    const [sending, setSending] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api.get('/messages');
            setMessages(res.data.messages);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load messages.'));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        api.get('/users/directory').then((r) => setDirectory(r.data.users)).catch(() => {});
    }, []);

    const idOf = (x) => x?._id || x;
    const inbox = messages.filter((m) => m.type === 'dm' && idOf(m.receiver_id) === user._id);
    const sent = messages.filter((m) => idOf(m.sender_id) === user._id);
    const announcements = messages.filter((m) => m.type === 'announcement');
    const lists = { inbox, sent, announcements };
    const current = lists[tab];
    const unreadCount = inbox.filter((m) => !m.read).length;

    const open = async (m) => {
        setSelected(m);
        if (tab === 'inbox' && !m.read) {
            try {
                await api.patch(`/messages/${m._id}/read`);
                setMessages((prev) => prev.map((x) => (x._id === m._id ? { ...x, read: true } : x)));
            } catch { /* non-critical */ }
        }
    };

    const remove = async (m) => {
        try {
            await api.delete(`/messages/${m._id}`);
            setSuccess('Message deleted.');
            if (selected?._id === m._id) setSelected(null);
            load();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const openCompose = (preset = {}) => {
        setForm({ ...emptyForm, ...preset });
        setFormError(null);
        setComposeOpen(true);
    };

    const send = async (e) => {
        e.preventDefault();
        setSending(true);
        setFormError(null);
        try {
            await api.post('/messages', {
                type: form.type,
                receiver_id: form.type === 'dm' ? form.receiver_id : undefined,
                subject: form.subject || 'No Subject',
                content: form.content
            });
            setSuccess(form.type === 'announcement' ? 'Announcement broadcast.' : 'Message sent.');
            setComposeOpen(false);
            load();
        } catch (err) {
            setFormError(getErrorMessage(err));
        } finally {
            setSending(false);
        }
    };

    const reply = (m) => openCompose({
        type: 'dm',
        receiver_id: idOf(m.sender_id),
        subject: m.subject?.startsWith('Re:') ? m.subject : `Re: ${m.subject}`
    });

    const tabs = [
        { key: 'inbox', label: 'Inbox', icon: FiInbox, badge: unreadCount },
        { key: 'sent', label: 'Sent', icon: FiSend },
        { key: 'announcements', label: 'Announcements', icon: FiRadio }
    ];

    if (loading) return <LoadingSpinner text="Loading messages..." />;

    return (
        <div>
            <PageHeader title="Messaging" subtitle="Direct messages and company announcements">
                <button className={btnPrimary} onClick={() => openCompose()}><FiEdit3 /> Compose</button>
            </PageHeader>
            <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
            <Alert type="success" onClose={() => setSuccess(null)}>{success}</Alert>

            <div className="flex gap-2 mb-4 flex-wrap">
                {tabs.map(({ key, label, icon: Icon, badge }) => (
                    <button key={key} onClick={() => { setTab(key); setSelected(null); }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border ${tab === key ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                        <Icon /> {label}
                        {badge > 0 && <span className="px-1.5 rounded-full bg-rose-500 text-white text-[10px]">{badge}</span>}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                    <Card noPadding>
                        {current.length === 0 ? <EmptyState text="No messages here." /> : (
                            <ul className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
                                {current.map((m) => {
                                    const other = tab === 'sent' ? m.receiver_id : m.sender_id;
                                    const unread = tab === 'inbox' && !m.read;
                                    return (
                                        <li key={m._id} onClick={() => open(m)}
                                            className={`p-3.5 flex gap-3 cursor-pointer hover:bg-slate-50 ${selected?._id === m._id ? 'bg-teal-50/60' : ''}`}>
                                            <Avatar user={other || { name: 'All' }} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={`text-xs truncate ${unread ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                        {tab === 'sent' && m.type === 'dm' ? `To: ${other?.name || 'Deleted user'}` : tab === 'sent' ? 'To: Everyone' : other?.name || 'Deleted user'}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 shrink-0">{new Date(m.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className={`text-xs truncate mt-0.5 ${unread ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{m.subject}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{m.content}</p>
                                            </div>
                                            {unread && <span className="h-2 w-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Card>
                </div>

                <div className="lg:col-span-3">
                    <Card>
                        {!selected ? <EmptyState text="Select a message to read it." /> : (
                            <div>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900">{selected.subject}</h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            From <b>{selected.sender_id?.name || 'Deleted user'}</b>
                                            {selected.type === 'dm' ? <> to <b>{selected.receiver_id?.name || 'Deleted user'}</b></> : ' to everyone'}
                                            {' · '}{new Date(selected.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0">
                                        {selected.type === 'dm' && idOf(selected.sender_id) !== user._id && (
                                            <button className={iconBtn} title="Reply" onClick={() => reply(selected)}><FiCornerUpLeft /></button>
                                        )}
                                        {(idOf(selected.sender_id) === user._id || isAdmin) && (
                                            <button className={iconBtn} title="Delete" onClick={() => remove(selected)}><FiTrash2 /></button>
                                        )}
                                    </div>
                                </div>
                                <p className="mt-5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selected.content}</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title="New Message"
                footer={<>
                    <button type="button" className={btnSecondary} onClick={() => setComposeOpen(false)}>Cancel</button>
                    <button type="submit" form="msg-form" className={btnPrimary} disabled={sending}><FiSend /> {sending ? 'Sending...' : 'Send'}</button>
                </>}>
                <Alert type="error">{formError}</Alert>
                <form id="msg-form" onSubmit={send} className="space-y-4">
                    {isAdmin && (
                        <Field label="Send as">
                            <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                <option value="dm">Direct message</option>
                                <option value="announcement">Announcement (everyone)</option>
                            </select>
                        </Field>
                    )}
                    {form.type === 'dm' && (
                        <Field label="To">
                            <select required className={inputCls} value={form.receiver_id} onChange={(e) => setForm({ ...form, receiver_id: e.target.value })}>
                                <option value="">Select recipient</option>
                                {directory.map((u) => <option key={u._id} value={u._id}>{u.name} — {u.designation || u.role}</option>)}
                            </select>
                        </Field>
                    )}
                    <Field label="Subject"><input className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
                    <Field label="Message"><textarea required rows={5} className={inputCls} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Field>
                </form>
            </Modal>
        </div>
    );
}
