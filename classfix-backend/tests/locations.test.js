import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  del,
  doAction,
  get,
  getDb,
  patch,
  post,
  put,
  reseed,
  startTestServer,
  stopTestServer,
  tokenFor,
} from './helpers.js';

before(startTestServer);
after(stopTestServer);
beforeEach(reseed);

describe('location hierarchy', () => {
  it('returns the whole hierarchy in one call', async () => {
    const student = await tokenFor('student');
    const { status, body } = await get('/api/locations', student);

    assert.equal(status, 200);
    assert.ok(body.buildings.length >= 3);
    assert.ok(body.floors.length >= 9);
    assert.ok(body.rooms.length >= 23);
    assert.ok(body.departments.length >= 5);

    // Every floor belongs to a listed building, every room to a listed floor.
    const buildingIds = new Set(body.buildings.map((b) => b.id));
    const floorIds = new Set(body.floors.map((f) => f.id));
    assert.ok(body.floors.every((f) => buildingIds.has(f.building_id)));
    assert.ok(body.rooms.every((r) => floorIds.has(r.floor_id)));
  });

  it('resolves a full location path on each request', async () => {
    const faculty = await tokenFor('faculty');
    const { body } = await get('/api/requests/CF-1001', faculty);

    assert.equal(body.request.location.buildingName, 'Main Block');
    assert.equal(body.request.location.floorName, 'Second Floor');
    assert.equal(body.request.location.roomNumber, '204');
    assert.equal(body.request.location.path, 'Main Block → Second Floor → Room 204');
  });
});

describe('facility record management', () => {
  it('lets staff create records but not students', async () => {
    const student = await tokenFor('student');
    const faculty = await tokenFor('faculty');

    const refused = await post('/api/locations/buildings', { name: 'Annexe', code: 'AN' }, student);
    assert.equal(refused.status, 403);

    const created = await post('/api/locations/buildings', { name: 'Annexe', code: 'an' }, faculty);
    assert.equal(created.status, 201);
    assert.equal(created.body.building.code, 'AN', 'codes are normalised to upper case');
  });

  it('refuses a duplicate room number on the same floor', async () => {
    const faculty = await tokenFor('faculty');

    const duplicate = await post(
      '/api/locations/rooms',
      { floorId: 'flr-main-2', number: '204', type: 'classroom', capacity: 40 },
      faculty,
    );
    assert.equal(duplicate.status, 409);
    assert.match(duplicate.body.error.message, /already used on this floor/);

    // The same number on a different floor is fine.
    const allowed = await post(
      '/api/locations/rooms',
      { floorId: 'flr-main-3', number: '204', type: 'classroom', capacity: 40 },
      faculty,
    );
    assert.equal(allowed.status, 201);
  });

  it('refuses a duplicate number when renaming an existing room', async () => {
    const faculty = await tokenFor('faculty');

    const clash = await put(
      '/api/locations/rooms/rm-mb-201',
      { floorId: 'flr-main-2', number: '204', type: 'classroom', capacity: 72 },
      faculty,
    );
    assert.equal(clash.status, 409);

    // Renaming to a free number works.
    const ok = await put(
      '/api/locations/rooms/rm-mb-201',
      { floorId: 'flr-main-2', number: '205', type: 'classroom', capacity: 72 },
      faculty,
    );
    assert.equal(ok.status, 200);
    assert.equal(ok.body.room.number, '205');
  });

  it('refuses a room on a floor that does not exist', async () => {
    const faculty = await tokenFor('faculty');
    const { status } = await post(
      '/api/locations/rooms',
      { floorId: 'flr-nope', number: '999', type: 'classroom', capacity: 10 },
      faculty,
    );
    assert.equal(status, 400);
  });

  it('deactivates a record that requests still reference, rather than deleting it', async () => {
    const faculty = await tokenFor('faculty');
    const db = getDb();

    const before = db.prepare('SELECT COUNT(*) AS n FROM requests WHERE room_id = ?').get('rm-mb-204').n;
    assert.ok(before > 0, 'room 204 is referenced by seeded requests');

    const response = await del('/api/locations/rooms/rm-mb-204', faculty);
    assert.equal(response.status, 200);
    assert.equal(response.body.deactivated, true);

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get('rm-mb-204');
    assert.ok(room, 'the room row must survive');
    assert.equal(room.active, 0);

    // And the requests still resolve to a full location.
    const detail = await get('/api/requests/CF-1001', faculty);
    assert.equal(detail.body.request.location.roomNumber, '204');
  });

  it('hard-deletes a record nothing references', async () => {
    const faculty = await tokenFor('faculty');

    const created = await post(
      '/api/locations/rooms',
      { floorId: 'flr-main-3', number: '399', type: 'other', capacity: 5 },
      faculty,
    );
    const id = created.body.room.id;

    const removed = await del(`/api/locations/rooms/${id}`, faculty);
    assert.equal(removed.body.deleted, true);
    assert.equal(getDb().prepare('SELECT * FROM rooms WHERE id = ?').get(id), undefined);
  });

  it('cascades floors and rooms when an unused building is deleted', async () => {
    const faculty = await tokenFor('faculty');
    const db = getDb();

    const building = await post('/api/locations/buildings', { name: 'Temp Block', code: 'TB' }, faculty);
    const floor = await post(
      '/api/locations/floors',
      { buildingId: building.body.building.id, name: 'Ground Floor', level: 0 },
      faculty,
    );
    await post(
      '/api/locations/rooms',
      { floorId: floor.body.floor.id, number: 'T01', type: 'classroom', capacity: 20 },
      faculty,
    );

    await del(`/api/locations/buildings/${building.body.building.id}`, faculty);

    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM floors WHERE building_id = ?').get(building.body.building.id).n,
      0,
    );
    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM rooms WHERE floor_id = ?').get(floor.body.floor.id).n,
      0,
    );
  });

  it('validates department details', async () => {
    const faculty = await tokenFor('faculty');

    const badEmail = await post(
      '/api/locations/departments',
      { name: 'Carpentry', code: 'CRP', contact: 'not-an-email' },
      faculty,
    );
    assert.equal(badEmail.status, 400);

    const duplicateName = await post(
      '/api/locations/departments',
      { name: 'Housekeeping', code: 'HK2' },
      faculty,
    );
    assert.equal(duplicateName.status, 409);

    const ok = await post(
      '/api/locations/departments',
      { name: 'Carpentry', code: 'CRP', contact: 'carpentry@example-college.demo' },
      faculty,
    );
    assert.equal(ok.status, 201);
  });

  it('reports usage counts alongside each record', async () => {
    const faculty = await tokenFor('faculty');

    const buildings = await get('/api/locations/buildings', faculty);
    const main = buildings.body.items.find((item) => item.id === 'bld-main');
    assert.ok(main.requestCount > 0);
    assert.equal(main.floorCount, 4);

    const departments = await get('/api/locations/departments', faculty);
    const electrical = departments.body.items.find((item) => item.id === 'dep-electrical');
    assert.ok(electrical.requestCount > 0);
    assert.equal(electrical.headName, 'Latha Prasad');
  });
});

describe('notifications', () => {
  it('gives each person their own inbox and unread count', async () => {
    const student = await tokenFor('student');
    const faculty = await tokenFor('faculty');

    const mine = await get('/api/notifications', student);
    const theirs = await get('/api/notifications', faculty);

    assert.equal(mine.status, 200);
    assert.ok(mine.body.items.length > 0);
    assert.notEqual(mine.body.unread, undefined);
    assert.notDeepEqual(
      mine.body.items.map((i) => i.id),
      theirs.body.items.map((i) => i.id),
      'inboxes are per person',
    );
  });

  it('marks one read, then all, without touching another inbox', async () => {
    const student = await tokenFor('student');
    const faculty = await tokenFor('faculty');

    const before = await get('/api/notifications?read=false', student);
    assert.ok(before.body.items.length > 0);
    const target = before.body.items[0].id;

    const facultyUnreadBefore = (await get('/api/notifications', faculty)).body.unread;

    const patched = await patch(`/api/notifications/${target}`, { read: true }, student);
    assert.equal(patched.status, 200);

    const all = await post('/api/notifications/read-all', {}, student);
    assert.equal(all.status, 200);
    assert.equal(all.body.unread, 0);

    const facultyUnreadAfter = (await get('/api/notifications', faculty)).body.unread;
    assert.equal(facultyUnreadAfter, facultyUnreadBefore, "another person's inbox is untouched");
  });

  it('refuses to mark a notification belonging to someone else', async () => {
    const student = await tokenFor('student');
    const faculty = await tokenFor('faculty');

    const theirs = await get('/api/notifications', faculty);
    const id = theirs.body.items[0].id;

    const attempt = await patch(`/api/notifications/${id}`, { read: true }, student);
    assert.equal(attempt.status, 404, 'not found, rather than silently succeeding');
  });

  it('notifies the reporter when their request moves', async () => {
    const student = await tokenFor('student');
    const faculty = await tokenFor('faculty');

    const before = (await get('/api/notifications', student)).body.unread;

    await doAction('CF-1012', { action: 'verify' }, faculty);

    const after = await get('/api/notifications', student);
    assert.ok(after.body.unread > before, 'the reporter should hear about it');
    assert.ok(after.body.items.some((item) => item.requestId === 'CF-1012'));
  });

  it('serves announcements', async () => {
    const student = await tokenFor('student');
    const { status, body } = await get('/api/announcements', student);

    assert.equal(status, 200);
    assert.ok(body.items.length >= 3);
    assert.ok(body.items[0].postedByName);
  });
});

describe('api surface', () => {
  it('answers a health check without a token', async () => {
    const { status, body } = await get('/api/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
  });

  it('publishes the domain vocabulary and workflow table', async () => {
    const { status, body } = await get('/api/meta');
    assert.equal(status, 200);
    assert.equal(body.statuses.length, 12);
    assert.ok(body.workflow.length >= 14);
    assert.ok(body.workflow.every((action) => action.id && action.role && action.from));
  });

  it('returns a clear 404 for an unknown route', async () => {
    const { status, body } = await get('/api/nonsense');
    assert.equal(status, 404);
    assert.match(body.error.message, /No route matches/);
  });

  it('keeps email addresses out of the user directory', async () => {
    const faculty = await tokenFor('faculty');
    const { body } = await get('/api/users', faculty);

    assert.ok(body.items.length > 0);
    assert.ok(body.items.every((item) => !('email' in item)));
    assert.ok(body.items.every((item) => !('password_hash' in item)));
  });

  it('hides the user directory from students', async () => {
    const student = await tokenFor('student');
    assert.equal((await get('/api/users', student)).status, 403);
  });
});
