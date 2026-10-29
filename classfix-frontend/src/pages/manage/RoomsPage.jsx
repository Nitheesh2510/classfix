import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ROOM_TYPE, ROOM_TYPE_LIST, ROOM_TYPE_META } from '../../constants/index.js';
import { useAppStore } from '../../hooks/useAppStore.js';
import { getFloorsForBuilding, resolveLocation } from '../../services/locationService.js';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { RecordTable } from '../../components/common/RecordTable.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { ConfirmDialog, Modal } from '../../components/common/Modal.jsx';
import { Field, Select, TextInput } from '../../components/common/Field.jsx';
import { ManagementSearch } from '../../components/common/ManagementSearch.jsx';

const BLANK = {
  number: '',
  name: '',
  buildingId: '',
  floorId: '',
  type: ROOM_TYPE.CLASSROOM,
  capacity: '0',
};

export function RoomsPage() {
  const { state, saveRecord, removeRecord } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const buildingFilter = searchParams.get('buildingId') ?? '';
  const floorFilter = searchParams.get('floorId') ?? '';

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);

  const formFloors = useMemo(
    () => getFloorsForBuilding(state, form.buildingId),
    [state, form.buildingId],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.rooms
      .map((room) => ({ ...room, location: resolveLocation(state, room.id) }))
      .filter((room) => (buildingFilter ? room.location.building?.id === buildingFilter : true))
      .filter((room) => (floorFilter ? room.floorId === floorFilter : true))
      .filter((room) =>
        term ? `${room.number} ${room.name ?? ''}`.toLowerCase().includes(term) : true,
      )
      .map((room) => ({
        ...room,
        requestCount: state.requests.filter((request) => request.roomId === room.id).length,
      }))
      .sort((a, b) => a.location.path.localeCompare(b.location.path, undefined, { numeric: true }));
  }, [state, search, buildingFilter, floorFilter]);

  const openNew = () => {
    const buildingId = buildingFilter || state.buildings[0]?.id || '';
    setEditing('new');
    setForm({
      ...BLANK,
      buildingId,
      floorId: floorFilter || getFloorsForBuilding(state, buildingId)[0]?.id || '',
    });
    setErrors({});
  };

  const openEdit = (room) => {
    setEditing(room.id);
    setForm({
      number: room.number,
      name: room.name ?? '',
      buildingId: room.location.building?.id ?? '',
      floorId: room.floorId,
      type: room.type,
      capacity: String(room.capacity ?? 0),
    });
    setErrors({});
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.buildingId) nextErrors.buildingId = 'Choose a building.';
    if (!form.floorId) nextErrors.floorId = 'Choose the floor this room is on.';
    if (!form.number.trim()) nextErrors.number = 'Enter the room number.';

    const capacity = Number(form.capacity);
    if (Number.isNaN(capacity) || capacity < 0) nextErrors.capacity = 'Capacity must be zero or more.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    // Uniqueness of the room number within its floor is enforced by a UNIQUE
    // constraint in the database; a clash comes back as a 409 and is shown as
    // a toast rather than being pre-judged here.
    const saved = await saveRecord(
      'room',
      {
        ...(editing === 'new' ? {} : { id: editing }),
        number: form.number.trim(),
        name: form.name.trim() || null,
        floorId: form.floorId,
        type: form.type,
        capacity,
      },
      editing === 'new' ? 'Room added.' : 'Room updated.',
    );
    if (saved) setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Rooms"
        description="Rooms are where facility requests are raised. Each one belongs to a single floor."
        breadcrumbs={[
          { label: 'ClassFix', to: '/dashboard' },
          { label: 'Facility records' },
          { label: 'Rooms' },
        ]}
        actions={
          <button
            type="button"
            className="cf-btn-primary"
            onClick={openNew}
            disabled={state.floors.length === 0}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add room
          </button>
        }
      />

      <ManagementSearch
        value={search}
        onChange={setSearch}
        placeholder="Search rooms by number or name"
        count={rows.length}
        noun="room"
      >
        <div className="sm:w-48">
          <label htmlFor="room-building-filter" className="sr-only">
            Filter by building
          </label>
          <Select
            id="room-building-filter"
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
        emptyTitle="No rooms match your filters"
        emptyMessage="Try a different building, clear the search, or add a room."
        columns={[
          {
            key: 'room',
            header: 'Room',
            render: (row) => (
              <div>
                <p className="font-medium text-navy-900">{row.location.roomLabel}</p>
                <p className="text-xs text-slate-500">
                  {row.location.buildingName} · {row.location.floorName}
                </p>
              </div>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            render: (row) => ROOM_TYPE_META[row.type]?.label ?? 'Facility',
          },
          {
            key: 'capacity',
            header: 'Capacity',
            render: (row) => (row.capacity ? row.capacity : '—'),
          },
          {
            key: 'requests',
            header: 'Requests',
            render: (row) => (
              <Link to={`/requests?roomId=${row.id}`} className="cf-link">
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
        title={editing === 'new' ? 'Add a room' : 'Edit room'}
        description="Room numbers must be unique within their floor."
        footer={
          <>
            <button type="button" className="cf-btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="room-form" className="cf-btn-primary">
              Save room
            </button>
          </>
        }
      >
        <form id="room-form" onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Building" required error={errors.buildingId}>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.buildingId}
                  error={errors.buildingId}
                  onChange={(event) =>
                    setForm({ ...form, buildingId: event.target.value, floorId: '' })
                  }
                  placeholder="Select a building"
                  options={state.buildings.map((item) => ({ value: item.id, label: item.name }))}
                />
              )}
            </Field>
            <Field label="Floor" required error={errors.floorId}>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.floorId}
                  error={errors.floorId}
                  disabled={!form.buildingId}
                  onChange={(event) => setForm({ ...form, floorId: event.target.value })}
                  placeholder={form.buildingId ? 'Select a floor' : 'Choose a building first'}
                  options={formFloors.map((item) => ({ value: item.id, label: item.name }))}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Room number" required error={errors.number}>
              {({ id }) => (
                <TextInput
                  id={id}
                  value={form.number}
                  error={errors.number}
                  maxLength={10}
                  placeholder="204"
                  onChange={(event) => setForm({ ...form, number: event.target.value })}
                />
              )}
            </Field>
            <Field label="Room name" hint="Optional, for labs and halls.">
              {({ id }) => (
                <TextInput
                  id={id}
                  value={form.name}
                  maxLength={50}
                  placeholder="Computer laboratory III"
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Facility type" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                  options={ROOM_TYPE_LIST.map((item) => ({ value: item.id, label: item.label }))}
                />
              )}
            </Field>
            <Field label="Capacity" error={errors.capacity}>
              {({ id }) => (
                <TextInput
                  id={id}
                  type="number"
                  min="0"
                  max="500"
                  value={form.capacity}
                  error={errors.capacity}
                  onChange={(event) => setForm({ ...form, capacity: event.target.value })}
                />
              )}
            </Field>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.location?.roomLabel ?? 'room'}?`}
        message={
          pendingDelete?.requestCount
            ? `This room is referenced by ${pendingDelete.requestCount} request(s), so it will be deactivated instead of deleted. Those requests keep their location.`
            : 'This removes the room.'
        }
        confirmLabel={pendingDelete?.requestCount ? 'Deactivate' : 'Delete'}
        onConfirm={() => removeRecord('room', pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
