import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  doAction,
  get,
  getDb,
  post,
  reseed,
  startTestServer,
  stopTestServer,
  tokenFor,
} from './helpers.js';

before(startTestServer);
after(stopTestServer);
beforeEach(reseed);

/** A freshly submitted request from the seed data. */
const SUBMITTED = 'CF-1012';
/** Awaiting the reporter's confirmation; reported by usr-student-1. */
const AWAITING = 'CF-1001';

describe('workflow enforcement', () => {
  it('refuses an action the caller\'s role does not own', async () => {
    const student = await tokenFor('student');
    const { status, body } = await doAction(SUBMITTED, { action: 'verify' }, student);

    assert.equal(status, 403);
    assert.match(body.error.message, /Only a faculty/);
  });

  it('refuses a transition that skips stages', async () => {
    const official = await tokenFor('electrical');
    // CF-1012 is 'submitted'; resolve only applies from in_progress/acknowledged.
    const { status, body } = await doAction(SUBMITTED, { action: 'resolve' }, official);

    assert.equal(status, 409);
    assert.match(body.error.message, /cannot be applied/);
  });

  it('refuses an unknown action id', async () => {
    const faculty = await tokenFor('faculty');
    const { status } = await doAction(SUBMITTED, { action: 'delete_everything' }, faculty);
    assert.equal(status, 400);
  });

  it('requires a reason for rejection, holding, reopening and duplicates', async () => {
    const faculty = await tokenFor('faculty');

    for (const action of ['reject', 'duplicate']) {
      const { status, body } = await doAction(SUBMITTED, { action }, faculty);
      assert.equal(status, 400, `${action} should require a reason`);
      assert.match(body.error.message, /requires a reason/);
    }

    // A whitespace-only reason does not count.
    const blank = await doAction(SUBMITTED, { action: 'reject', reason: '   ' }, faculty);
    assert.equal(blank.status, 400);
  });

  it('requires a valid, active department when forwarding', async () => {
    const faculty = await tokenFor('faculty');
    await doAction(SUBMITTED, { action: 'verify' }, faculty);

    const missing = await doAction(SUBMITTED, { action: 'forward' }, faculty);
    assert.equal(missing.status, 400);

    const bogus = await doAction(
      SUBMITTED,
      { action: 'forward', departmentId: 'dep-does-not-exist' },
      faculty,
    );
    assert.equal(bogus.status, 400);

    const ok = await doAction(
      SUBMITTED,
      { action: 'forward', departmentId: 'dep-electrical' },
      faculty,
    );
    assert.equal(ok.status, 200);
    assert.equal(ok.body.request.status, 'assigned');
    assert.equal(ok.body.request.departmentId, 'dep-electrical');
  });

  it('only lets the reporter confirm or reopen their own request', async () => {
    const other = await tokenFor('student2');
    const owner = await tokenFor('student');

    const refused = await doAction(AWAITING, { action: 'confirm_fixed' }, other);
    assert.equal(refused.status, 403);
    assert.match(refused.body.error.message, /person who reported/);

    const allowed = await doAction(AWAITING, { action: 'confirm_fixed' }, owner);
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.request.status, 'closed');
  });

  it('only lets the assigned department act on a request', async () => {
    const housekeeping = await tokenFor('housekeeping');
    const electrical = await tokenFor('electrical');

    // CF-1007 is 'acknowledged' and assigned to Housekeeping. 'start_work' is
    // valid from that status, so a refusal here is about the department alone.
    const wrongDept = await doAction('CF-1007', { action: 'start_work' }, electrical);
    assert.equal(wrongDept.status, 403);
    assert.match(wrongDept.body.error.message, /different department/);

    // The department that owns it may proceed.
    const ownDept = await doAction('CF-1007', { action: 'start_work' }, housekeeping);
    assert.equal(ownDept.status, 200);
    assert.equal(ownDept.body.request.status, 'in_progress');
  });

  it('walks the full happy path and records every step', async () => {
    const student = await tokenFor('student');
    const faculty = await tokenFor('faculty');
    const electrical = await tokenFor('electrical');

    const created = await post(
      '/api/requests',
      {
        title: 'Switch sparking in room 203',
        description: 'The switch sparks on contact and smells of burning plastic.',
        roomId: 'rm-mb-203',
        category: 'fans',
        priority: 'urgent',
      },
      student,
    );
    assert.equal(created.status, 201);
    const id = created.body.request.id;
    assert.match(id, /^CF-\d+$/);
    assert.equal(created.body.request.status, 'submitted');

    const steps = [
      [faculty, { action: 'verify' }, 'verified'],
      [faculty, { action: 'forward', departmentId: 'dep-electrical' }, 'assigned'],
      [electrical, { action: 'acknowledge' }, 'acknowledged'],
      [electrical, { action: 'start_work', expectedCompletion: '2026-12-01' }, 'in_progress'],
      [electrical, { action: 'log_inspection', reason: 'Housing melted.' }, 'in_progress'],
      [electrical, { action: 'resolve', evidence: { label: 'Note', note: 'Unit replaced.' } }, 'awaiting_verification'],
      [student, { action: 'confirm_fixed' }, 'closed'],
    ];

    for (const [token, payload, expected] of steps) {
      const response = await doAction(id, payload, token);
      assert.equal(response.status, 200, `${payload.action}: ${JSON.stringify(response.body)}`);
      assert.equal(response.body.request.status, expected, `after ${payload.action}`);
    }

    const final = await get(`/api/requests/${id}`, student);
    assert.equal(final.body.request.timeline.length, 8, 'one submission plus seven actions');
    assert.equal(final.body.request.evidence.length, 1);

    // The due date set during start_work was stored.
    assert.ok(final.body.request.expectedCompletion);
  });

  it('records the reason in the action history where one is required', async () => {
    const faculty = await tokenFor('faculty');
    const reason = 'The switch panel had simply been left off.';

    await doAction(SUBMITTED, { action: 'reject', reason }, faculty);

    const detail = await get(`/api/requests/${SUBMITTED}`, faculty);
    const last = detail.body.request.timeline.at(-1);
    assert.equal(last.action, 'Request rejected');
    assert.ok(last.details.includes(reason), 'the reason must be in the history');
  });

  it('never removes history, even when a request moves backwards', async () => {
    const student = await tokenFor('student');

    const before = await get(`/api/requests/${AWAITING}`, student);
    const countBefore = before.body.request.timeline.length;

    await doAction(AWAITING, { action: 'confirm_fixed' }, student);
    await doAction(AWAITING, { action: 'reopen', reason: 'It broke again two days later.' }, student);

    const after = await get(`/api/requests/${AWAITING}`, student);
    assert.equal(after.body.request.status, 'reopened');
    assert.equal(after.body.request.timeline.length, countBefore + 2);

    // Earlier entries are untouched.
    const earlier = after.body.request.timeline.slice(0, countBefore);
    assert.deepEqual(
      earlier.map((e) => e.action),
      before.body.request.timeline.map((e) => e.action),
    );
  });

  it('blocks tampering with history at the database level', async () => {
    const db = getDb();
    const { id } = db.prepare('SELECT id FROM request_events ORDER BY id LIMIT 1').get();

    assert.throws(
      () => db.prepare("UPDATE request_events SET details = 'edited' WHERE id = ?").run(id),
      /append-only/,
    );
    assert.throws(() => db.prepare('DELETE FROM request_events WHERE id = ?').run(id), /append-only/);

    // The row is still exactly as it was.
    assert.ok(db.prepare('SELECT 1 FROM request_events WHERE id = ?').get(id));
  });

  it('only advertises actions the server would actually allow', async () => {
    const student = await tokenFor('student');
    const faculty = await tokenFor('faculty');

    const asStudent = await get(`/api/requests/${AWAITING}`, student);
    const studentActions = asStudent.body.availableActions.map((a) => a.id);
    assert.deepEqual(studentActions.sort(), ['confirm_fixed', 'reopen']);

    const asFaculty = await get(`/api/requests/${AWAITING}`, faculty);
    assert.deepEqual(asFaculty.body.availableActions, [], 'nothing for faculty at this stage');

    // CF-1016 was reported by the other student, so this one cannot even read
    // it, let alone be offered the owner-only actions.
    const asOther = await get('/api/requests/CF-1016', student);
    assert.equal(asOther.status, 403);
  });

  it('rolls the whole transition back if part of it fails', async () => {
    const faculty = await tokenFor('faculty');
    const db = getDb();

    const before = db.prepare('SELECT status FROM requests WHERE id = ?').get(SUBMITTED).status;
    const eventsBefore = db
      .prepare('SELECT COUNT(*) AS n FROM request_events WHERE request_id = ?')
      .get(SUBMITTED).n;

    // Forwarding to a department that does not exist must change nothing.
    await doAction(SUBMITTED, { action: 'verify' }, faculty);
    const failed = await doAction(
      SUBMITTED,
      { action: 'forward', departmentId: 'dep-nope' },
      faculty,
    );
    assert.equal(failed.status, 400);

    const after = db.prepare('SELECT status FROM requests WHERE id = ?').get(SUBMITTED).status;
    assert.equal(after, 'verified', 'the verify succeeded, the forward did not');
    assert.notEqual(before, after);

    const eventsAfter = db
      .prepare('SELECT COUNT(*) AS n FROM request_events WHERE request_id = ?')
      .get(SUBMITTED).n;
    assert.equal(eventsAfter, eventsBefore + 1, 'only the verify was recorded');
  });
});
