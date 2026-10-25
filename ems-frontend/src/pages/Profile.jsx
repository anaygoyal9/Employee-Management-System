import { useState, useRef } from 'react';
import { FiCamera } from 'react-icons/fi';
import api, { getErrorMessage } from '../utils/api';
import { useAuth } from '../context/authContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import PasswordForm from '../components/common/PasswordForm';
import { PageHeader, Field, Alert, Avatar, inputCls, btnPrimary, btnSecondary } from '../components/common/ui';
import { formatDate } from '../utils/formatters';

const MAX_BYTES = 2 * 1024 * 1024; // matches multer limit on the server

export default function Profile() {
    const { user, updateUser } = useAuth();
    const fileRef = useRef(null);

    const [form, setForm] = useState({
        name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || ''
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await api.put(`/users/${user._id}`, form);
            updateUser(res.data.user);
            setSuccess('Profile updated.');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const onPickImage = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!['image/jpeg', 'image/png'].includes(file.type)) return setError('Only JPEG or PNG images are allowed.');
        if (file.size > MAX_BYTES) return setError('Image must be 2 MB or smaller.');

        const data = new FormData();
        data.append('profileImage', file);
        setUploading(true);
        setError(null);
        try {
            const res = await api.post('/users/profile-image', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            updateUser(res.data.user);
            setSuccess('Profile photo updated.');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setUploading(false);
        }
    };

    const rows = [
        ['Employee ID', user?.employeeId || '—'],
        ['Department', user?.department?.name || '—'],
        ['Designation', user?.designation || '—'],
        ['Joined', formatDate(user?.joiningDate)],
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="My Profile" subtitle="Your personal information" />
            <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
            <Alert type="success" onClose={() => setSuccess(null)}>{success}</Alert>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                    <div className="flex flex-col items-center text-center">
                        <div className="relative">
                            <Avatar user={user} size="h-28 w-28" text="text-3xl" />
                            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                                className="absolute bottom-0 right-0 p-2 rounded-full bg-slate-900 text-white hover:bg-teal-600 transition-colors cursor-pointer disabled:opacity-50"
                                title="Change photo">
                                <FiCamera />
                            </button>
                            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onPickImage} />
                        </div>
                        <h2 className="mt-4 text-lg font-bold text-slate-900">{user?.name}</h2>
                        <p className="text-xs text-slate-500">{user?.email}</p>
                        <div className="mt-2 flex gap-2"><Badge status={user?.role} /><Badge status={user?.status} /></div>
                        {uploading && <p className="text-xs text-slate-400 mt-2">Uploading...</p>}
                    </div>
                    <dl className="mt-6 divide-y divide-slate-100 text-xs">
                        {rows.map(([k, v]) => (
                            <div key={k} className="py-2.5 flex justify-between gap-3">
                                <dt className="text-slate-500">{k}</dt>
                                <dd className="font-semibold text-slate-800 text-right">{v}</dd>
                            </div>
                        ))}
                    </dl>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    <Card title="Edit Details" subtitle="Role, salary and department are managed by an administrator">
                        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Full name"><input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                            <Field label="Email"><input required type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                            <Field label="Phone"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                            <Field label="Address"><input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
                            <div className="sm:col-span-2 flex gap-2">
                                <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : 'Save Changes'}</button>
                                <button type="button" className={btnSecondary} onClick={() => setForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '' })}>Reset</button>
                            </div>
                        </form>
                    </Card>
                    <Card title="Change Password"><PasswordForm /></Card>
                </div>
            </div>
        </div>
    );
}
