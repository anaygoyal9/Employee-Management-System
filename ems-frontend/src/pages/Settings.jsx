import { useState, useEffect } from 'react';
import api, { getErrorMessage } from '../utils/api';
import { useAuth } from '../context/authContext';
import Card from '../components/common/Card';
import PasswordForm from '../components/common/PasswordForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PageHeader, Field, Alert, inputCls, btnPrimary } from '../components/common/ui';

export default function Settings() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/settings')
            .then((r) => setSettings(r.data.settings))
            .catch((err) => setError(getErrorMessage(err, 'Failed to load settings.')))
            .finally(() => setLoading(false));
    }, []);

    const set = (k) => (e) => setSettings((s) => ({ ...s, [k]: e.target.value }));

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const { companyName, companyEmail, companyPhone, companyAddress, workStartTime, workEndTime, workDaysPerWeek, currency, timezone } = settings;
            const res = await api.put('/settings', {
                companyName, companyEmail, companyPhone, companyAddress, workStartTime, workEndTime,
                workDaysPerWeek: Number(workDaysPerWeek), currency, timezone
            });
            setSettings(res.data.settings);
            setSuccess('Settings saved.');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingSpinner text="Loading settings..." />;

    return (
        <div className="space-y-6">
            <PageHeader title="Settings" subtitle={isAdmin ? 'Company configuration and your account security' : 'Company information and your account security'} />
            <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
            <Alert type="success" onClose={() => setSuccess(null)}>{success}</Alert>

            {settings && (
                <Card title="Company" subtitle={isAdmin ? 'Visible to all employees' : 'Managed by administrators'}>
                    <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Company name"><input disabled={!isAdmin} className={inputCls} value={settings.companyName || ''} onChange={set('companyName')} /></Field>
                        <Field label="Company email"><input disabled={!isAdmin} type="email" className={inputCls} value={settings.companyEmail || ''} onChange={set('companyEmail')} /></Field>
                        <Field label="Phone"><input disabled={!isAdmin} className={inputCls} value={settings.companyPhone || ''} onChange={set('companyPhone')} /></Field>
                        <Field label="Address"><input disabled={!isAdmin} className={inputCls} value={settings.companyAddress || ''} onChange={set('companyAddress')} /></Field>
                        <Field label="Work starts"><input disabled={!isAdmin} type="time" className={inputCls} value={settings.workStartTime || ''} onChange={set('workStartTime')} /></Field>
                        <Field label="Work ends"><input disabled={!isAdmin} type="time" className={inputCls} value={settings.workEndTime || ''} onChange={set('workEndTime')} /></Field>
                        <Field label="Work days per week"><input disabled={!isAdmin} type="number" min="1" max="7" className={inputCls} value={settings.workDaysPerWeek ?? ''} onChange={set('workDaysPerWeek')} /></Field>
                        <Field label="Currency symbol"><input disabled={!isAdmin} className={inputCls} value={settings.currency || ''} onChange={set('currency')} /></Field>
                        <Field label="Timezone"><input disabled={!isAdmin} className={inputCls} value={settings.timezone || ''} onChange={set('timezone')} /></Field>
                        {isAdmin && (
                            <div className="sm:col-span-2">
                                <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : 'Save Settings'}</button>
                            </div>
                        )}
                    </form>
                </Card>
            )}

            <Card title="Change Password" subtitle="Use at least 6 characters">
                <PasswordForm />
            </Card>
        </div>
    );
}
