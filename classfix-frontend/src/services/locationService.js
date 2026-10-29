import { INSTITUTION_NAME, ROOM_TYPE_META } from '../constants/index.js';

/**
 * Pure helpers over the Institution → Building → Floor → Room hierarchy.
 * Every function takes the current demo state so nothing reads global data.
 */

export function getBuilding(state, buildingId) {
  return state.buildings.find((item) => item.id === buildingId) ?? null;
}

export function getFloor(state, floorId) {
  return state.floors.find((item) => item.id === floorId) ?? null;
}

export function getRoom(state, roomId) {
  return state.rooms.find((item) => item.id === roomId) ?? null;
}

export function getDepartment(state, departmentId) {
  return state.departments.find((item) => item.id === departmentId) ?? null;
}

/** Floors belonging to one building, lowest level first. */
export function getFloorsForBuilding(state, buildingId) {
  if (!buildingId) return [];
  return state.floors
    .filter((floor) => floor.buildingId === buildingId)
    .sort((a, b) => a.level - b.level);
}

/** Rooms on one floor, sorted by room number. */
export function getRoomsForFloor(state, floorId) {
  if (!floorId) return [];
  return state.rooms
    .filter((room) => room.floorId === floorId)
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
}

export function getRoomsForBuilding(state, buildingId) {
  const floorIds = new Set(getFloorsForBuilding(state, buildingId).map((floor) => floor.id));
  return state.rooms.filter((room) => floorIds.has(room.floorId));
}

/**
 * Resolves a room id into the full chain. Returns a shape that is always safe
 * to render, even if the room was removed from the demo data.
 */
export function resolveLocation(state, roomId) {
  const room = getRoom(state, roomId);
  const floor = room ? getFloor(state, room.floorId) : null;
  const building = floor ? getBuilding(state, floor.buildingId) : null;

  return {
    institution: INSTITUTION_NAME,
    building,
    floor,
    room,
    buildingName: building?.name ?? 'Unknown building',
    floorName: floor?.name ?? 'Unknown floor',
    roomNumber: room?.number ?? '—',
    roomLabel: room ? roomLabel(room) : 'Unknown room',
    roomTypeLabel: room ? (ROOM_TYPE_META[room.type]?.label ?? 'Facility') : '—',
    /** "Main Block → Second Floor → Room 204" */
    path: [building?.name, floor?.name, room ? roomLabel(room) : null].filter(Boolean).join(' → '),
    /** "MB · 204" for dense tables. */
    short: building && room ? `${building.code} · ${room.number}` : (room?.number ?? '—'),
  };
}

export function roomLabel(room) {
  if (!room) return 'Unknown room';
  return room.name ? `${room.name} (${room.number})` : `Room ${room.number}`;
}

/** True when another room on the same floor already uses this number. */
export function isDuplicateRoomNumber(state, floorId, number, ignoreRoomId = null) {
  const target = number.trim().toLowerCase();
  return state.rooms.some(
    (room) =>
      room.floorId === floorId &&
      room.id !== ignoreRoomId &&
      room.number.trim().toLowerCase() === target,
  );
}

export function isDuplicateFloorName(state, buildingId, name, ignoreFloorId = null) {
  const target = name.trim().toLowerCase();
  return state.floors.some(
    (floor) =>
      floor.buildingId === buildingId &&
      floor.id !== ignoreFloorId &&
      floor.name.trim().toLowerCase() === target,
  );
}

export function isDuplicateBuildingName(state, name, ignoreBuildingId = null) {
  const target = name.trim().toLowerCase();
  return state.buildings.some(
    (building) => building.id !== ignoreBuildingId && building.name.trim().toLowerCase() === target,
  );
}

/** How many requests reference a building / floor / room / department. */
export function countRequestsForRoom(state, roomId) {
  return state.requests.filter((request) => request.roomId === roomId).length;
}

export function countRequestsForFloor(state, floorId) {
  const roomIds = new Set(getRoomsForFloor(state, floorId).map((room) => room.id));
  return state.requests.filter((request) => roomIds.has(request.roomId)).length;
}

export function countRequestsForBuilding(state, buildingId) {
  const roomIds = new Set(getRoomsForBuilding(state, buildingId).map((room) => room.id));
  return state.requests.filter((request) => roomIds.has(request.roomId)).length;
}

export function countRequestsForDepartment(state, departmentId) {
  return state.requests.filter((request) => request.departmentId === departmentId).length;
}
