import { useState } from 'react';
import api, { getErrorMessage } from '../../utils/api';
import { Field, Alert, inputCls, btnPrimary } from './ui';

export default function PasswordForm() {
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (form.newPassword.length < 6) return setError('New password must be at least 6 characters long.');
        if (form.newPassword !== form.confirm) return setError('New password and confirmation do not match.');
        setSaving(true);
        try {
            await api.patch('/auth/change-password', {
                currentPassword: form.currentPassword,
                newPassword: form.newPassword
            });
            setSuccess('Password updated successfully.');
            setForm({ currentPassword: '', newPassword: '', confirm: '' });
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 max-w-md">
            <Alert type="error">{error}</Alert>
            <Alert type="success">{success}</Alert>
            <Field label="Current password">
                <input required type="password" autoComplete="current-password" className={inputCls} value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
            </Field>
            <Field label="New password">
                <input required type="password" autoComplete="new-password" className={inputCls} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
            </Field>
            <Field label="Confirm new password">
                <input required type="password" autoComplete="new-password" className={inputCls} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            </Field>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Updating...' : 'Update Password'}</button>
        </form>
    );
}
