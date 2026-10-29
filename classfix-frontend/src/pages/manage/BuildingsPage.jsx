import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore.js';
import { getFloorsForBuilding, getRoomsForBuilding } from '../../services/locationService.js';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { RecordTable } from '../../components/common/RecordTable.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { ConfirmDialog, Modal } from '../../components/common/Modal.jsx';
import { Field, TextArea, TextInput } from '../../components/common/Field.jsx';
import { ManagementSearch } from '../../components/common/ManagementSearch.jsx';

const BLANK = { name: '', code: '', description: '' };

export function BuildingsPage() {
  const { state, saveRecord, removeRecord } = useAppStore();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.buildings
      .filter((building) =>
        term ? `${building.name} ${building.code}`.toLowerCase().includes(term) : true,
      )
      .map((building) => ({
        ...building,
        floorCount: getFloorsForBuilding(state, building.id).length,
        roomCount: getRoomsForBuilding(state, building.id).length,
        // Counted from the requests already loaded for this user.
        requestCount: state.requests.filter(
          (request) => request.location?.buildingId === building.id,
        ).length,
      }));
  }, [state, search]);

  const openNew = () => {
    setEditing('new');
    setForm(BLANK);
    setErrors({});
  };

  const openEdit = (building) => {
    setEditing(building.id);
    setForm({ name: building.name, code: building.code, description: building.description ?? '' });
    setErrors({});
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Give the building a name.';
    if (!form.code.trim()) nextErrors.code = 'A short code keeps tables readable.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    // Duplicate names are rejected by the database, which answers 409.
    const saved = await saveRecord(
      'building',
      {
        ...(editing === 'new' ? {} : { id: editing }),
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
      },
      editing === 'new' ? 'Building added.' : 'Building updated.',
    );
    if (saved) setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Buildings"
        description="The top level of the location hierarchy. Every floor and room belongs to one building."
        breadcrumbs={[
          { label: 'ClassFix', to: '/dashboard' },
          { label: 'Facility records' },
          { label: 'Buildings' },
        ]}
        actions={
          <button type="button" className="cf-btn-primary" onClick={openNew}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add building
          </button>
        }
      />

      <ManagementSearch
        value={search}
        onChange={setSearch}
        placeholder="Search buildings by name or code"
        count={rows.length}
        noun="building"
      />

      <RecordTable
        rows={rows}
        getRowId={(row) => row.id}
        emptyTitle="No buildings match your search"
        emptyMessage="Clear the search box or add a new building."
        columns={[
          {
            key: 'name',
            header: 'Building',
            render: (row) => (
              <div>
                <p className="font-medium text-navy-900">{row.name}</p>
                {row.description ? (
                  <p className="text-xs text-slate-500">{row.description}</p>
                ) : null}
              </div>
            ),
          },
          { key: 'code', header: 'Code', render: (row) => row.code },
          {
            key: 'floors',
            header: 'Floors',
            render: (row) => (
              <Link to={`/manage/floors?buildingId=${row.id}`} className="cf-link">
                {row.floorCount}
              </Link>
            ),
          },
          {
            key: 'rooms',
            header: 'Rooms',
            render: (row) => (
              <Link to={`/manage/rooms?buildingId=${row.id}`} className="cf-link">
                {row.roomCount}
              </Link>
            ),
          },
          {
            key: 'requests',
            header: 'Requests',
            render: (row) => (
              <Link to={`/requests?buildingId=${row.id}`} className="cf-link">
                {row.requestCount}
              </Link>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) =>
              row.active ? (
                <Badge tone="green">Active</Badge>
              ) : (
                <Badge tone="slate">Inactive</Badge>
              ),
          },
        ]}
        renderActions={(row) => (
          <>
            <button
              type="button"
              className="cf-btn-ghost px-2 py-1 text-xs"
              onClick={() => openEdit(row)}
            >
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
        title={editing === 'new' ? 'Add a building' : 'Edit building'}
        footer={
          <>
            <button type="button" className="cf-btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="building-form" className="cf-btn-primary">
              Save building
            </button>
          </>
        }
      >
        <form id="building-form" onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Building name" required error={errors.name}>
            {({ id }) => (
              <TextInput
                id={id}
                value={form.name}
                error={errors.name}
                maxLength={60}
                placeholder="e.g. Workshop Block"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            )}
          </Field>
          <Field label="Short code" required error={errors.code} hint="Two or three letters, shown in dense tables.">
            {({ id }) => (
              <TextInput
                id={id}
                value={form.code}
                error={errors.code}
                maxLength={4}
                placeholder="WB"
                onChange={(event) => setForm({ ...form, code: event.target.value })}
              />
            )}
          </Field>
          <Field label="Description">
            {({ id }) => (
              <TextArea
                id={id}
                rows={2}
                value={form.description}
                maxLength={160}
                placeholder="What is this building used for?"
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            )}
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.name ?? 'building'}?`}
        message={
          pendingDelete?.requestCount
            ? `${pendingDelete.name} is referenced by ${pendingDelete.requestCount} request(s), so it will be deactivated instead of deleted. Existing requests keep their location.`
            : `This removes the building and its ${pendingDelete?.floorCount ?? 0} floor(s) and ${pendingDelete?.roomCount ?? 0} room(s).`
        }
        confirmLabel={pendingDelete?.requestCount ? 'Deactivate' : 'Delete'}
        onConfirm={() => removeRecord('building', pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
