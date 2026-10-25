import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi';
import api, { getErrorMessage } from '../utils/api';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PageHeader, Field, Alert, EmptyState, inputCls, btnPrimary, btnSecondary, btnDanger, iconBtn } from '../components/common/ui';

export default function Departments() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '' });
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get('/departments');
            setDepartments(res.data.departments);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load departments.'));
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const openModal = (dept = null) => {
        setEditing(dept);
        setForm({ name: dept?.name || '', description: dept?.description || '' });
        setFormError(null);
        setModalOpen(true);
    };

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            if (editing) await api.put(`/departments/${editing._id}`, form);
            else await api.post('/departments', form);
            setSuccess(editing ? 'Department updated.' : 'Department created.');
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
            await api.delete(`/departments/${toDelete._id}`);
            setSuccess('Department deleted.');
            load();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setToDelete(null);
        }
    };

    if (loading) return <LoadingSpinner text="Loading departments..." />;

    return (
        <div>
            <PageHeader title="Departments" subtitle="Organise your workforce into units">
                <button className={btnPrimary} onClick={() => openModal()}><FiPlus /> Add Department</button>
            </PageHeader>
            <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
            <Alert type="success" onClose={() => setSuccess(null)}>{success}</Alert>

            {departments.length === 0 ? (
                <Card><EmptyState text="No departments yet. Create the first one." /></Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departments.map((d) => (
                        <Card key={d._id}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-slate-800 truncate">{d.name}</h3>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-3 min-h-[2rem]">{d.description || 'No description'}</p>
                                </div>
                                <div className="flex shrink-0">
                                    <button className={iconBtn} title="Edit" onClick={() => openModal(d)}><FiEdit2 /></button>
                                    <button className={iconBtn} title="Delete" onClick={() => setToDelete(d)}><FiTrash2 /></button>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-teal-700 font-semibold">
                                <FiUsers /> {d.employeeCount} {d.employeeCount === 1 ? 'employee' : 'employees'}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Department' : 'Add Department'}
                footer={<>
                    <button className={btnSecondary} type="button" onClick={() => setModalOpen(false)}>Cancel</button>
                    <button className={btnPrimary} type="submit" form="dept-form" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </>}>
                <Alert type="error">{formError}</Alert>
                <form id="dept-form" onSubmit={save} className="space-y-4">
                    <Field label="Name"><input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                    <Field label="Description"><textarea rows={3} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
                </form>
            </Modal>

            <Modal isOpen={!!toDelete} onClose={() => setToDelete(null)} title="Delete department"
                footer={<>
                    <button className={btnSecondary} onClick={() => setToDelete(null)}>Cancel</button>
                    <button className={btnDanger} onClick={confirmDelete}>Delete</button>
                </>}>
                <p className="text-sm text-slate-600">Delete <b>{toDelete?.name}</b>? Departments with employees assigned cannot be deleted.</p>
            </Modal>
        </div>
    );
}
