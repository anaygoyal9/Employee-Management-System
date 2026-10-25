import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiDownload, FiUserX, FiUserCheck } from 'react-icons/fi';
import api, { getErrorMessage, downloadFile } from '../utils/api';
import { useAuth } from '../context/authContext';
import useDebounce from '../hooks/useDebounce';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
    PageHeader, Field, Alert, EmptyState, Avatar, Table, Td,
    inputCls, btnPrimary, btnSecondary, btnDanger, iconBtn
} from '../components/common/ui';
import { formatDate, formatCurrency } from '../utils/formatters';

const LIMIT = 10;
const emptyForm = {
    name: '', email: '', password: '', role: 'employee', employeeId: '', department: '',
    designation: '', salary: '', phone: '', address: '', joiningDate: '', status: 'active'
};

export default function Employees() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [pagination, setPagination] = useState({ totalUsers: 0, totalPages: 1, currentPage: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState('');
    const [role, setRole] = useState('');
    const [status, setStatus] = useState('');
    const debouncedSearch = useDebounce(search);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null); // user being edited, null = adding
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState(null);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/users', {
                params: { page, limit: LIMIT, search: debouncedSearch, department, role, status }
            });
            setUsers(res.data.users);
            setPagination(res.data.pagination);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load employees.'));
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, department, role, status]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    useEffect(() => {
        api.get('/departments').then((r) => setDepartments(r.data.departments)).catch(() => {});
    }, []);

    // reset to page 1 whenever a filter changes
    useEffect(() => { setPage(1); }, [debouncedSearch, department, role, status]);

    const openAdd = () => {
        setEditing(null);
        setForm(emptyForm);
        setFormError(null);
        setModalOpen(true);
    };

    const openEdit = (u) => {
        setEditing(u);
        setForm({
            name: u.name || '',
            email: u.email || '',
            password: '',
            role: u.role,
            employeeId: u.employeeId || '',
            department: u.department?._id || '',
            designation: u.designation || '',
            salary: u.salary ?? '',
            phone: u.phone || '',
            address: u.address || '',
            joiningDate: u.joiningDate ? u.joiningDate.slice(0, 10) : '',
            status: u.status
        });
        setFormError(null);
        setModalOpen(true);
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            if (editing) {
                const payload = {
                    name: form.name, email: form.email, employeeId: form.employeeId,
                    department: form.department, designation: form.designation,
                    salary: Number(form.salary) || 0, phone: form.phone, address: form.address,
                    joiningDate: form.joiningDate || undefined, status: form.status, role: form.role
                };
                await api.put(`/users/${editing._id}`, payload);
                setSuccess('Employee updated successfully.');
            } else {
                await api.post('/users/addUser', {
                    ...form,
                    salary: Number(form.salary) || 0,
                    department: form.department || undefined,
                    joiningDate: form.joiningDate || undefined
                });
                setSuccess('Employee created successfully.');
            }
            setModalOpen(false);
            fetchUsers();
        } catch (err) {
            setFormError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (u) => {
        try {
            await api.patch(`/users/${u._id}/status`, { status: u.status === 'active' ? 'inactive' : 'active' });
            setSuccess(`${u.name} is now ${u.status === 'active' ? 'inactive' : 'active'}.`);
            fetchUsers();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const changeRole = async (u, newRole) => {
        try {
            await api.patch(`/users/${u._id}/role`, { role: newRole });
            setSuccess(`${u.name} is now ${newRole}.`);
            fetchUsers();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/users/${toDelete._id}`);
            setSuccess('Employee deleted.');
            setToDelete(null);
            if (users.length === 1 && page > 1) setPage(page - 1);
            else fetchUsers();
        } catch (err) {
            setError(getErrorMessage(err));
            setToDelete(null);
        }
    };

    const exportCsv = async () => {
        try {
            await downloadFile('/reports/export/employees', { department, status }, 'employees.csv');
        } catch (err) {
            setError(getErrorMessage(err, 'Export failed.'));
        }
    };

    return (
        <div>
            <PageHeader title="Employees" subtitle="Manage accounts, roles and employment details">
                <button onClick={exportCsv} className={btnSecondary}><FiDownload /> Export CSV</button>
                <button onClick={openAdd} className={btnPrimary}><FiPlus /> Add Employee</button>
            </PageHeader>

            <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
            <Alert type="success" onClose={() => setSuccess(null)}>{success}</Alert>

            <Card noPadding>
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 border-b border-slate-100">
                    <div className="relative md:col-span-1">
                        <FiSearch className="absolute left-3.5 top-3.5 text-slate-400" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, email, ID..." className={`${inputCls} pl-10`} />
                    </div>
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls}>
                        <option value="">All departments</option>
                        {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                    <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
                        <option value="">All roles</option>
                        <option value="admin">Admin</option>
                        <option value="employee">Employee</option>
                    </select>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {loading ? <LoadingSpinner text="Loading employees..." /> : users.length === 0 ? (
                    <EmptyState text="No employees match your filters." />
                ) : (
                    <Table columns={['Employee', 'ID', 'Department', 'Designation', 'Salary', 'Joined', 'Role', 'Status', 'Actions']}>
                        {users.map((u) => {
                            const isMe = u._id === me?._id;
                            return (
                                <tr key={u._id} className="hover:bg-slate-50/60">
                                    <Td>
                                        <div className="flex items-center gap-2.5">
                                            <Avatar user={u} />
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-800 truncate">{u.name}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td>{u.employeeId || '—'}</Td>
                                    <Td>{u.department?.name || '—'}</Td>
                                    <Td>{u.designation}</Td>
                                    <Td>{formatCurrency(u.salary)}</Td>
                                    <Td className="whitespace-nowrap">{formatDate(u.joiningDate)}</Td>
                                    <Td>
                                        <select
                                            value={u.role === 'user' ? 'employee' : u.role}
                                            disabled={isMe}
                                            onChange={(e) => changeRole(u, e.target.value)}
                                            className="text-xs rounded-lg border border-slate-200 px-2 py-1 bg-white disabled:opacity-50"
                                            title={isMe ? 'You cannot change your own role' : 'Change role'}
                                        >
                                            <option value="admin">admin</option>
                                            <option value="employee">employee</option>
                                        </select>
                                    </Td>
                                    <Td><Badge status={u.status} /></Td>
                                    <Td>
                                        <div className="flex items-center gap-0.5">
                                            <button className={iconBtn} title="Edit" onClick={() => openEdit(u)}><FiEdit2 /></button>
                                            <button className={iconBtn} disabled={isMe} title={u.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => toggleStatus(u)}>
                                                {u.status === 'active' ? <FiUserX /> : <FiUserCheck />}
                                            </button>
                                            <button className={iconBtn} disabled={isMe} title="Delete" onClick={() => setToDelete(u)}><FiTrash2 /></button>
                                        </div>
                                    </Td>
                                </tr>
                            );
                        })}
                    </Table>
                )}
                <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages}
                    totalItems={pagination.totalUsers} limit={LIMIT} onPageChange={setPage} />
            </Card>

            {/* Add / Edit */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Employee' : 'Add Employee'} maxWidth="max-w-2xl"
                footer={<>
                    <button type="button" className={btnSecondary} onClick={() => setModalOpen(false)}>Cancel</button>
                    <button type="submit" form="employee-form" className={btnPrimary} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </>}>
                <Alert type="error">{formError}</Alert>
                <form id="employee-form" onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full name"><input required className={inputCls} value={form.name} onChange={set('name')} /></Field>
                    <Field label="Email"><input required type="email" className={inputCls} value={form.email} onChange={set('email')} /></Field>
                    {!editing && (
                        <Field label="Password" hint="At least 6 characters">
                            <input required minLength={6} type="password" className={inputCls} value={form.password} onChange={set('password')} />
                        </Field>
                    )}
                    <Field label="Employee ID" hint="Leave blank to auto-generate">
                        <input className={inputCls} value={form.employeeId} onChange={set('employeeId')} />
                    </Field>
                    <Field label="Department">
                        <select className={inputCls} value={form.department} onChange={set('department')}>
                            <option value="">Unassigned</option>
                            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Designation"><input className={inputCls} value={form.designation} onChange={set('designation')} placeholder="Employee" /></Field>
                    <Field label="Role">
                        <select className={inputCls} value={form.role} onChange={set('role')}>
                            <option value="employee">Employee</option>
                            <option value="admin">Admin</option>
                        </select>
                    </Field>
                    <Field label="Status">
                        <select className={inputCls} value={form.status} onChange={set('status')}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </Field>
                    <Field label="Salary"><input type="number" min="0" className={inputCls} value={form.salary} onChange={set('salary')} /></Field>
                    <Field label="Joining date"><input type="date" className={inputCls} value={form.joiningDate} onChange={set('joiningDate')} /></Field>
                    <Field label="Phone"><input className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
                    <Field label="Address"><input className={inputCls} value={form.address} onChange={set('address')} /></Field>
                </form>
            </Modal>

            {/* Delete confirm */}
            <Modal isOpen={!!toDelete} onClose={() => setToDelete(null)} title="Delete employee"
                footer={<>
                    <button className={btnSecondary} onClick={() => setToDelete(null)}>Cancel</button>
                    <button className={btnDanger} onClick={confirmDelete}>Delete</button>
                </>}>
                <p className="text-sm text-slate-600">
                    Permanently delete <b>{toDelete?.name}</b>? This cannot be undone. Consider deactivating instead.
                </p>
            </Modal>
        </div>
    );
}
