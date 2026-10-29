import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore.js';
import { api } from '../../services/api.js';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { RecordTable } from '../../components/common/RecordTable.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { ConfirmDialog, Modal } from '../../components/common/Modal.jsx';
import { Field, Select, TextInput } from '../../components/common/Field.jsx';
import { ManagementSearch } from '../../components/common/ManagementSearch.jsx';

const BLANK = { name: '', code: '', contact: '', headUserId: '' };

export function DepartmentsPage() {
  const { state, saveRecord, removeRecord } = useAppStore();
  const [search, setSearch] = useState('');
  const [officials, setOfficials] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);

  // Department heads must be officials; the API serves that list.
  useEffect(() => {
    let cancelled = false;
    api
      .officials()
      .then((data) => {
        if (!cancelled) setOfficials(data.items);
      })
      .catch(() => {
        if (!cancelled) setOfficials([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Request and overdue counts come from the API with each department row.
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.departments
      .filter((item) => (term ? `${item.name} ${item.code}`.toLowerCase().includes(term) : true))
      .map((item) => ({
        ...item,
        requestCount: item.requestCount ?? 0,
        overdueCount: item.overdueCount ?? 0,
        headName: item.headName ?? 'Not set',
      }));
  }, [state.departments, search]);

  const openNew = () => {
    setEditing('new');
    setForm(BLANK);
    setErrors({});
  };

  const openEdit = (department) => {
    setEditing(department.id);
    setForm({
      name: department.name,
      code: department.code,
      contact: department.contact ?? '',
      headUserId: department.headUserId ?? '',
    });
    setErrors({});
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Give the department a name.';
    if (!form.code.trim()) nextErrors.code = 'A short code keeps tables readable.';
    if (form.contact && !form.contact.includes('@')) {
      nextErrors.contact = 'Enter a valid email address, or leave this blank.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    // The server is the authority on duplicate names; it answers 409.
    const saved = await saveRecord(
      'department',
      {
        ...(editing === 'new' ? {} : { id: editing }),
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        contact: form.contact.trim(),
        headUserId: form.headUserId || null,
      },
      editing === 'new' ? 'Department added.' : 'Department updated.',
    );
    if (saved) setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Departments"
        description="Teams that requests are forwarded to. The department head becomes the assigned official."
        breadcrumbs={[
          { label: 'ClassFix', to: '/dashboard' },
          { label: 'Facility records' },
          { label: 'Departments' },
        ]}
        actions={
          <button type="button" className="cf-btn-primary" onClick={openNew}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add department
          </button>
        }
      />

      <ManagementSearch
        value={search}
        onChange={setSearch}
        placeholder="Search departments by name or code"
        count={rows.length}
        noun="department"
      />

      <RecordTable
        rows={rows}
        getRowId={(row) => row.id}
        emptyTitle="No departments match your search"
        emptyMessage="Clear the search box or add a new department."
        columns={[
          {
            key: 'name',
            header: 'Department',
            render: (row) => (
              <div>
                <p className="font-medium text-navy-900">{row.name}</p>
                {row.contact ? <p className="text-xs text-slate-500">{row.contact}</p> : null}
              </div>
            ),
          },
          { key: 'code', header: 'Code', render: (row) => row.code },
          { key: 'head', header: 'Head', render: (row) => row.headName },
          {
            key: 'requests',
            header: 'Assigned',
            render: (row) => (
              <Link to={`/requests?departmentId=${row.id}`} className="cf-link">
                {row.requestCount}
              </Link>
            ),
          },
          {
            key: 'overdue',
            header: 'Overdue',
            render: (row) =>
              row.overdueCount > 0 ? (
                <Badge tone="red">{row.overdueCount}</Badge>
              ) : (
                <span className="text-slate-400">0</span>
              ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) =>
              row.active ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>,
          },
        ]}
        renderActions={(row) => (
          <>
            <button type="button" className="cf-btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(row)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              className="cf-btn-ghost px-2 py-1 text-xs text-red-700 hover:bg-red-50"
              onClick={() => setPendingDelete(row)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </button>
          </>
        )}
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add a department' : 'Edit department'}
        footer={
          <>
            <button type="button" className="cf-btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="department-form" className="cf-btn-primary">
              Save department
            </button>
          </>
        }
      >
        <form id="department-form" onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Department name" required error={errors.name}>
            {({ id }) => (
              <TextInput
                id={id}
                value={form.name}
                error={errors.name}
                maxLength={60}
                placeholder="e.g. Carpentry"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            )}
          </Field>
          <Field label="Short code" required error={errors.code}>
            {({ id }) => (
              <TextInput
                id={id}
                value={form.code}
                error={errors.code}
                maxLength={4}
                placeholder="CRP"
                onChange={(event) => setForm({ ...form, code: event.target.value })}
              />
            )}
          </Field>
          <Field label="Contact email" error={errors.contact} hint="Stored for reference; no mail is sent.">
            {({ id }) => (
              <TextInput
                id={id}
                type="email"
                value={form.contact}
                error={errors.contact}
                placeholder="team@example-college.demo"
                onChange={(event) => setForm({ ...form, contact: event.target.value })}
              />
            )}
          </Field>
          <Field label="Department head">
            {({ id }) => (
              <Select
                id={id}
                value={form.headUserId}
                onChange={(event) => setForm({ ...form, headUserId: event.target.value })}
                placeholder="Not set"
                options={officials.map((item) => ({
                  value: item.id,
                  label: `${item.name} — ${item.title}`,
                }))}
              />
            )}
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.name ?? 'department'}?`}
        message={
          pendingDelete?.requestCount
            ? `${pendingDelete.requestCount} request(s) are assigned to this department, so it will be deactivated instead of deleted.`
            : 'This removes the department.'
        }
        confirmLabel={pendingDelete?.requestCount ? 'Deactivate' : 'Delete'}
        onConfirm={() => removeRecord('department', pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
