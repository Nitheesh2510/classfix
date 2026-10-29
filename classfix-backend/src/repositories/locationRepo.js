import { getDb } from '../db/index.js';

/** Reference data: buildings, floors, rooms and departments. */

export function listBuildings(db = getDb()) {
  return db.prepare('SELECT * FROM buildings ORDER BY name').all();
}

export function listFloors(db = getDb()) {
  return db
    .prepare('SELECT * FROM floors ORDER BY building_id, level')
    .all();
}

export function listRooms(db = getDb()) {
  return db.prepare('SELECT * FROM rooms ORDER BY floor_id, number').all();
}

export function listDepartments(db = getDb()) {
  return db.prepare('SELECT * FROM departments ORDER BY name').all();
}

export function getBuilding(id, db = getDb()) {
  return db.prepare('SELECT * FROM buildings WHERE id = ?').get(id) ?? null;
}

export function getFloor(id, db = getDb()) {
  return db.prepare('SELECT * FROM floors WHERE id = ?').get(id) ?? null;
}

export function getRoom(id, db = getDb()) {
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) ?? null;
}

export function getDepartment(id, db = getDb()) {
  return db.prepare('SELECT * FROM departments WHERE id = ?').get(id) ?? null;
}

/** Full location chain for a room, used when serialising a request. */
export function resolveLocation(roomId, db = getDb()) {
  const row = db
    .prepare(
      `SELECT r.id        AS room_id,
              r.number    AS room_number,
              r.name      AS room_name,
              r.type      AS room_type,
              f.id        AS floor_id,
              f.name      AS floor_name,
              f.level     AS floor_level,
              b.id        AS building_id,
              b.name      AS building_name,
              b.code      AS building_code
         FROM rooms r
         JOIN floors f    ON f.id = r.floor_id
         JOIN buildings b ON b.id = f.building_id
        WHERE r.id = ?`,
    )
    .get(roomId);

  if (!row) return null;

  const roomLabel = row.room_name ? `${row.room_name} (${row.room_number})` : `Room ${row.room_number}`;

  return {
    roomId: row.room_id,
    roomNumber: row.room_number,
    roomName: row.room_name,
    roomType: row.room_type,
    roomLabel,
    floorId: row.floor_id,
    floorName: row.floor_name,
    floorLevel: row.floor_level,
    buildingId: row.building_id,
    buildingName: row.building_name,
    buildingCode: row.building_code,
    path: `${row.building_name} → ${row.floor_name} → ${roomLabel}`,
  };
}

/* ----------------------------------------------------------- usage counts */

export function countRequestsForBuilding(buildingId, db = getDb()) {
  return db
    .prepare(
      `SELECT COUNT(*) AS n
         FROM requests rq
         JOIN rooms r  ON r.id = rq.room_id
         JOIN floors f ON f.id = r.floor_id
        WHERE f.building_id = ?`,
    )
    .get(buildingId).n;
}

export function countRequestsForFloor(floorId, db = getDb()) {
  return db
    .prepare(
      `SELECT COUNT(*) AS n
         FROM requests rq
         JOIN rooms r ON r.id = rq.room_id
        WHERE r.floor_id = ?`,
    )
    .get(floorId).n;
}

export function countRequestsForRoom(roomId, db = getDb()) {
  return db.prepare('SELECT COUNT(*) AS n FROM requests WHERE room_id = ?').get(roomId).n;
}

export function countRequestsForDepartment(departmentId, db = getDb()) {
  return db
    .prepare('SELECT COUNT(*) AS n FROM requests WHERE department_id = ?')
    .get(departmentId).n;
}

/* ------------------------------------------------------------ duplicates */

export function roomNumberExists(floorId, number, ignoreId = null, db = getDb()) {
  const row = db
    .prepare(
      `SELECT 1 FROM rooms
        WHERE floor_id = ? AND lower(trim(number)) = lower(trim(?)) AND id IS NOT ?`,
    )
    .get(floorId, number, ignoreId);
  return Boolean(row);
}
