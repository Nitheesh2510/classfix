import { useMemo } from 'react';
import { ROOM_TYPE_META } from '../../constants/index.js';
import { useAppStore } from '../../hooks/useAppStore.js';
import { getFloorsForBuilding, getRoomsForFloor, roomLabel } from '../../services/locationService.js';
import { Field, Select } from '../common/Field.jsx';

/**
 * Dependent Building → Floor → Room selectors.
 *
 * `value` is { buildingId, floorId, roomId }; changing a level clears the ones
 * below it so a room can never belong to the wrong floor.
 */
export function LocationSelect({ value, onChange, errors = {}, required, includeAllOption = false, disabled }) {
  const { state } = useAppStore();

  const floors = useMemo(
    () => getFloorsForBuilding(state, value.buildingId),
    [state, value.buildingId],
  );
  const rooms = useMemo(() => getRoomsForFloor(state, value.floorId), [state, value.floorId]);

  const anyLabel = includeAllOption ? 'All' : 'Select';

  const handleBuilding = (buildingId) => onChange({ buildingId, floorId: '', roomId: '' });
  const handleFloor = (floorId) => onChange({ ...value, floorId, roomId: '' });
  const handleRoom = (roomId) => onChange({ ...value, roomId });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Field label="Building" required={required} error={errors.buildingId}>
        {({ id, describedBy }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={value.buildingId}
            error={errors.buildingId}
            disabled={disabled}
            onChange={(event) => handleBuilding(event.target.value)}
            placeholder={`${anyLabel} building`}
            options={state.buildings
              .filter((building) => building.active || building.id === value.buildingId)
              .map((building) => ({
                value: building.id,
                label: building.active ? building.name : `${building.name} (inactive)`,
              }))}
          />
        )}
      </Field>

      <Field
        label="Floor"
        required={required}
        error={errors.floorId}
        hint={!value.buildingId ? 'Choose a building first.' : undefined}
      >
        {({ id, describedBy }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={value.floorId}
            error={errors.floorId}
            disabled={disabled || !value.buildingId}
            onChange={(event) => handleFloor(event.target.value)}
            placeholder={`${anyLabel} floor`}
            options={floors.map((floor) => ({
              value: floor.id,
              label: floor.active ? floor.name : `${floor.name} (inactive)`,
            }))}
          />
        )}
      </Field>

      <Field
        label="Room"
        required={required}
        error={errors.roomId}
        hint={value.floorId && rooms.length === 0 ? 'No rooms recorded on this floor yet.' : undefined}
      >
        {({ id, describedBy }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={value.roomId}
            error={errors.roomId}
            disabled={disabled || !value.floorId}
            onChange={(event) => handleRoom(event.target.value)}
            placeholder={`${anyLabel} room`}
            options={rooms.map((room) => ({
              value: room.id,
              label: `${roomLabel(room)} · ${ROOM_TYPE_META[room.type]?.label ?? 'Facility'}${
                room.active ? '' : ' (inactive)'
              }`,
            }))}
          />
        )}
      </Field>
    </div>
  );
}
