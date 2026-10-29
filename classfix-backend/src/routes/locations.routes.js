import { Router } from 'express';
import { getDb } from '../db/index.js';
import { ROLES } from '../domain/constants.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncRoute, badRequest, conflict, notFound } from '../middleware/errors.js';
import { validate } from '../middleware/validate.js';
import {
  countRequestsForBuilding,
  countRequestsForDepartment,
  countRequestsForFloor,
  countRequestsForRoom,
  getBuilding,
  getDepartment,
  getFloor,
  getRoom,
  listBuildings,
  listDepartments,
  listFloors,
  listRooms,
  roomNumberExists,
} from '../repositories/locationRepo.js';
import { buildingSchema, departmentSchema, floorSchema, roomSchema } from './schemas.js';

export const locationRoutes = Router();

locationRoutes.use(requireAuth);

/** Only staff may change facility records; everyone may read them. */
const staffOnly = requireRole(ROLES.FACULTY, ROLES.OFFICIAL);

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ---------------------------------------------------------- reference */

/**
 * GET /api/locations — the whole hierarchy in one call.
 * The frontend needs all of it to drive dependent selectors, and it is small.
 */
locationRoutes.get(
  '/',
  asyncRoute((req, res) => {
    res.json({
      buildings: listBuildings(),
      floors: listFloors(),
      rooms: listRooms(),
      departments: listDepartments(),
    });
  }),
);

/* --------------------------------------------------------- buildings */

locationRoutes.get(
  '/buildings',
  asyncRoute((req, res) => {
    const items = listBuildings().map((building) => ({
      ...building,
      requestCount: countRequestsForBuilding(building.id),
      floorCount: listFloors().filter((f) => f.building_id === building.id).length,
    }));
    res.json({ items });
  }),
);

locationRoutes.post(
  '/buildings',
  staffOnly,
  validate(buildingSchema),
  asyncRoute((req, res) => {
    const id = newId('bld');
    getDb()
      .prepare('INSERT INTO buildings (id, name, code, description) VALUES (?, ?, ?, ?)')
      .run(id, req.body.name, req.body.code.toUpperCase(), req.body.description ?? null);
    res.status(201).json({ building: getBuilding(id) });
  }),
);

locationRoutes.put(
  '/buildings/:id',
  staffOnly,
  validate(buildingSchema),
  asyncRoute((req, res) => {
    if (!getBuilding(req.params.id)) throw notFound('No such building.');
    getDb()
      .prepare('UPDATE buildings SET name = ?, code = ?, description = ? WHERE id = ?')
      .run(req.body.name, req.body.code.toUpperCase(), req.body.description ?? null, req.params.id);
    res.json({ building: getBuilding(req.params.id) });
  }),
);

/**
 * DELETE /api/locations/buildings/:id
 * A building still referenced by requests is deactivated instead of deleted,
 * so no request is ever left pointing at a location that no longer exists.
 */
locationRoutes.delete(
  '/buildings/:id',
  staffOnly,
  asyncRoute((req, res) => {
    const building = getBuilding(req.params.id);
    if (!building) throw notFound('No such building.');

    const inUse = countRequestsForBuilding(req.params.id) > 0;
    if (inUse) {
      getDb().prepare('UPDATE buildings SET active = 0 WHERE id = ?').run(req.params.id);
      return res.json({ deactivated: true, reason: 'Referenced by existing requests.' });
    }
    getDb().prepare('DELETE FROM buildings WHERE id = ?').run(req.params.id);
    return res.json({ deleted: true });
  }),
);

/* ------------------------------------------------------------- floors */

locationRoutes.get(
  '/floors',
  asyncRoute((req, res) => {
    const items = listFloors().map((floor) => ({
      ...floor,
      requestCount: countRequestsForFloor(floor.id),
      roomCount: listRooms().filter((r) => r.floor_id === floor.id).length,
    }));
    res.json({ items });
  }),
);

locationRoutes.post(
  '/floors',
  staffOnly,
  validate(floorSchema),
  asyncRoute((req, res) => {
    if (!getBuilding(req.body.buildingId)) throw badRequest('That building does not exist.');
    const id = newId('flr');
    getDb()
      .prepare('INSERT INTO floors (id, building_id, name, level) VALUES (?, ?, ?, ?)')
      .run(id, req.body.buildingId, req.body.name, req.body.level);
    res.status(201).json({ floor: getFloor(id) });
  }),
);

locationRoutes.put(
  '/floors/:id',
  staffOnly,
  validate(floorSchema),
  asyncRoute((req, res) => {
    if (!getFloor(req.params.id)) throw notFound('No such floor.');
    if (!getBuilding(req.body.buildingId)) throw badRequest('That building does not exist.');
    getDb()
      .prepare('UPDATE floors SET building_id = ?, name = ?, level = ? WHERE id = ?')
      .run(req.body.buildingId, req.body.name, req.body.level, req.params.id);
    res.json({ floor: getFloor(req.params.id) });
  }),
);

locationRoutes.delete(
  '/floors/:id',
  staffOnly,
  asyncRoute((req, res) => {
    if (!getFloor(req.params.id)) throw notFound('No such floor.');
    if (countRequestsForFloor(req.params.id) > 0) {
      getDb().prepare('UPDATE floors SET active = 0 WHERE id = ?').run(req.params.id);
      return res.json({ deactivated: true, reason: 'Referenced by existing requests.' });
    }
    getDb().prepare('DELETE FROM floors WHERE id = ?').run(req.params.id);
    return res.json({ deleted: true });
  }),
);

/* -------------------------------------------------------------- rooms */

locationRoutes.get(
  '/rooms',
  asyncRoute((req, res) => {
    const items = listRooms().map((room) => ({
      ...room,
      requestCount: countRequestsForRoom(room.id),
    }));
    res.json({ items });
  }),
);

locationRoutes.post(
  '/rooms',
  staffOnly,
  validate(roomSchema),
  asyncRoute((req, res) => {
    if (!getFloor(req.body.floorId)) throw badRequest('That floor does not exist.');
    if (roomNumberExists(req.body.floorId, req.body.number)) {
      throw conflict('That room number is already used on this floor.');
    }

    const id = newId('rm');
    getDb()
      .prepare(
        'INSERT INTO rooms (id, floor_id, number, name, type, capacity) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, req.body.floorId, req.body.number, req.body.name || null, req.body.type, req.body.capacity);
    res.status(201).json({ room: getRoom(id) });
  }),
);

locationRoutes.put(
  '/rooms/:id',
  staffOnly,
  validate(roomSchema),
  asyncRoute((req, res) => {
    if (!getRoom(req.params.id)) throw notFound('No such room.');
    if (!getFloor(req.body.floorId)) throw badRequest('That floor does not exist.');
    if (roomNumberExists(req.body.floorId, req.body.number, req.params.id)) {
      throw conflict('That room number is already used on this floor.');
    }

    getDb()
      .prepare(
        'UPDATE rooms SET floor_id = ?, number = ?, name = ?, type = ?, capacity = ? WHERE id = ?',
      )
      .run(
        req.body.floorId,
        req.body.number,
        req.body.name || null,
        req.body.type,
        req.body.capacity,
        req.params.id,
      );
    res.json({ room: getRoom(req.params.id) });
  }),
);

locationRoutes.delete(
  '/rooms/:id',
  staffOnly,
  asyncRoute((req, res) => {
    if (!getRoom(req.params.id)) throw notFound('No such room.');
    if (countRequestsForRoom(req.params.id) > 0) {
      getDb().prepare('UPDATE rooms SET active = 0 WHERE id = ?').run(req.params.id);
      return res.json({ deactivated: true, reason: 'Referenced by existing requests.' });
    }
    getDb().prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
    return res.json({ deleted: true });
  }),
);

/* -------------------------------------------------------- departments */

locationRoutes.get(
  '/departments',
  asyncRoute((req, res) => {
    const db = getDb();
    const items = listDepartments().map((department) => ({
      ...department,
      headName: department.head_user_id
        ? (db.prepare('SELECT name FROM users WHERE id = ?').get(department.head_user_id)?.name ?? null)
        : null,
      requestCount: countRequestsForDepartment(department.id),
      overdueCount: db
        .prepare(
          `SELECT COUNT(*) AS n FROM requests
            WHERE department_id = ?
              AND expected_completion IS NOT NULL
              AND expected_completion < ?
              AND status NOT IN ('closed','rejected','duplicate','awaiting_verification')`,
        )
        .get(department.id, new Date().toISOString()).n,
    }));
    res.json({ items });
  }),
);

locationRoutes.post(
  '/departments',
  staffOnly,
  validate(departmentSchema),
  asyncRoute((req, res) => {
    const id = newId('dep');
    getDb()
      .prepare(
        'INSERT INTO departments (id, name, code, contact, head_user_id) VALUES (?, ?, ?, ?, ?)',
      )
      .run(id, req.body.name, req.body.code.toUpperCase(), req.body.contact || null, req.body.headUserId || null);
    res.status(201).json({ department: getDepartment(id) });
  }),
);

locationRoutes.put(
  '/departments/:id',
  staffOnly,
  validate(departmentSchema),
  asyncRoute((req, res) => {
    if (!getDepartment(req.params.id)) throw notFound('No such department.');
    getDb()
      .prepare('UPDATE departments SET name = ?, code = ?, contact = ?, head_user_id = ? WHERE id = ?')
      .run(
        req.body.name,
        req.body.code.toUpperCase(),
        req.body.contact || null,
        req.body.headUserId || null,
        req.params.id,
      );
    res.json({ department: getDepartment(req.params.id) });
  }),
);

locationRoutes.delete(
  '/departments/:id',
  staffOnly,
  asyncRoute((req, res) => {
    if (!getDepartment(req.params.id)) throw notFound('No such department.');
    if (countRequestsForDepartment(req.params.id) > 0) {
      getDb().prepare('UPDATE departments SET active = 0 WHERE id = ?').run(req.params.id);
      return res.json({ deactivated: true, reason: 'Referenced by existing requests.' });
    }
    getDb().prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
    return res.json({ deleted: true });
  }),
);
