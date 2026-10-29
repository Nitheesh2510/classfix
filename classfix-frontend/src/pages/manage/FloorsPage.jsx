import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore.js';
import { getRoomsForFloor } from '../../services/locationService.js';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { RecordTable } from '../../components/common/RecordTable.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { ConfirmDialog, Modal } from '../../components/common/Modal.jsx';
import { Field, Select, TextInput } from '../../components/common/Field.jsx';
import { ManagementSearch } from '../../components/common/ManagementSearch.jsx';

const BLANK = { name: '', buildingId: '', level: '0' };

export function FloorsPage() {
  const { state, saveRecord, removeRecord } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const buildingFilter = searchParams.get('buildingId') ?? '';
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.floors
      .filter((floor) => (buildingFilter ? floor.buildingId === buildingFilter : true))
      .filter((floor) => (term ? floor.name.toLowerCase().includes(term) : true))
      .map((floor) => ({
        ...floor,
        buildingName:
          state.buildings.find((item) => item.id === floor.buildingId)?.name ?? 'Unknown building',
        roomCount: getRoomsForFloor(state, floor.id).length,
        requestCount: state.requests.filter((request) => request.location?.floorId === floor.id)
          .length,
      }))
      .sort(
        (a, b) => a.buildingName.localeCompare(b.buildingName) || a.level - b.level,
      );
  }, [state, search, buildingFilter]);

  const openNew = () => {
    setEditing('new');
    setForm({ ...BLANK, buildingId: buildingFilter || state.buildings[0]?.id || '' });
    setErrors({});
  };

  const openEdit = (floor) => {
    setEditing(floor.id);
    setForm({ name: floor.name, buildingId: floor.buildingId, level: String(floor.level) });
    setErrors({});
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.buildingId) nextErrors.buildingId = 'Choose the building this floor belongs to.';
    if (!form.name.trim()) nextErrors.name = 'Give the floor a name.';
    if (form.level === '' || Number.isNaN(Number(form.level))) {
      nextErrors.level = 'Enter the floor level as a number (0 for ground).';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    // A duplicate floor name within a building is rejected by the database.
    const saved = await saveRecord(
      'floor',
      {
        ...(editing === 'new' ? {} : { id: editing }),
        name: form.name.trim(),
        buildingId: form.buildingId,
        level: Number(form.level),
      },
      editing === 'new' ? 'Floor added.' : 'Floor updated.',
    );
    if (saved) setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Floors"
        description="Floors sit between buildings and rooms. A floor always belongs to exactly one building."
        breadcrumbs={[
          { label: 'ClassFix', to: '/dashboard' },
          { label: 'Facility records' },
          { label: 'Floors' },
        ]}
        actions={
          <button
            type="button"
            className="cf-btn-primary"
            onClick={openNew}
            disabled={state.buildings.length === 0}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add floor
          </button>
        }
      />

      <ManagementSearch
        value={search}
        onChange={setSearch}
        placeholder="Search floors by name"
        count={rows.length}
        noun="floor"
      >
        <div className="sm:w-56">
          <label htmlFor="floor-building-filter" className="sr-only">
            Filter by building
          </label>
          <Select
            id="floor-building-filter"
            value={buildingFilter}
            onChange={(event) =>
              setSearchParams(event.target.value ? { buildingId: event.target.value } : {})
            }
            placeholder="All buildings"
            options={state.buildings.map((item) => ({ value: item.id, label: item.name }))}
          />
        </div>
      </ManagementSearch>

      <RecordTable
        rows={rows}
        getRowId={(row) => row.id}
        emptyTitle="No floors match your filters"
        emptyMessage="Pick a different building or add a floor."
        columns={[
          {
            key: 'name',
            header: 'Floor',
            render: (row) => <span className="font-medium text-navy-900">{row.name}</span>,
          },
          { key: 'building', header: 'Building', render: (row) => row.buildingName },
          { key: 'level', header: 'Level', render: (row) => row.level },
          {
            key: 'rooms',
            header: 'Rooms',
            render: (row) => (
              <Link to={`/manage/rooms?floorId=${row.id}`} className="cf-link">
                {row.roomCount}
              </Link>
            ),
          },
          {
            key: 'requests',
            header: 'Requests',
            render: (row) => (
              <Link to={`/requests?floorId=${row.id}&buildingId=${row.buildingId}`} className="cf-link">
                {row.requestCount}
              </Link>
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
        title={editing === 'new' ? 'Add a floor' : 'Edit floor'}
        footer={
          <>
            <button type="button" className="cf-btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="floor-form" className="cf-btn-primary">
              Save floor
            </button>
          </>
        }
      >
        <form id="floor-form" onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Building" required error={errors.buildingId}>
            {({ id }) => (
              <Select
                id={id}
                value={form.buildingId}
                error={errors.buildingId}
                onChange={(event) => setForm({ ...form, buildingId: event.target.value })}
                placeholder="Select a building"
                options={state.buildings.map((item) => ({ value: item.id, label: item.name }))}
              />
            )}
          </Field>
          <Field label="Floor name" required error={errors.name}>
            {({ id }) => (
              <TextInput
                id={id}
                value={form.name}
                error={errors.name}
                maxLength={40}
                placeholder="e.g. Fourth Floor"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            )}
          </Field>
          <Field label="Level" required error={errors.level} hint="0 for ground floor, 1 for first, and so on.">
            {({ id }) => (
              <TextInput
                id={id}
                type="number"
                min="0"
                max="40"
                value={form.level}
                error={errors.level}
                onChange={(event) => setForm({ ...form, level: event.target.value })}
              />
            )}
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.name ?? 'floor'}?`}
        message={
          pendingDelete?.requestCount
            ? `This floor is referenced by ${pendingDelete.requestCount} request(s), so it will be deactivated instead of deleted.`
            : `This removes the floor and its ${pendingDelete?.roomCount ?? 0} room(s).`
        }
        confirmLabel={pendingDelete?.requestCount ? 'Deactivate' : 'Delete'}
        onConfirm={() => removeRecord('floor', pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
