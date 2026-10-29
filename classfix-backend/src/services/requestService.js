import { getDb, nextRequestCode } from '../db/index.js';
import { CATEGORY_DEPARTMENT, ROLES, STATUS } from '../domain/constants.js';
import { authorizeAction, getAction, validateActionInput } from '../domain/workflow.js';
import { badRequest, conflict, forbidden, notFound } from '../middleware/errors.js';
import { getDepartment, getRoom } from '../repositories/locationRepo.js';
import { canView, getRequestRow, serializeRequest } from '../repositories/requestRepo.js';
import { notifyRoles, notifyUser } from './notificationService.js';

/**
 * All writes to a request go through here. Each one runs in a transaction so a
 * status change, its history entry and the notifications it triggers are
 * committed together or not at all.
 */

function nowIso() {
  return new Date().toISOString();
}

function appendEvent(db, { requestId, actorId, action, details, statusAfter = null }) {
  db.prepare(
    `INSERT INTO request_events (request_id, actor_id, action, details, status_after, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(requestId, actorId, action, details, statusAfter, nowIso());
}

/* ------------------------------------------------------------- creation */

export function createRequest(input, user, db = getDb()) {
  const room = getRoom(input.roomId, db);
  if (!room) throw badRequest('That room does not exist.');
  if (!room.active) throw badRequest('That room is no longer in use.');

  const run = db.transaction(() => {
    const id = nextRequestCode(db);
    const timestamp = nowIso();

    db.prepare(
      `INSERT INTO requests
         (id, title, description, room_id, category, priority, status,
          reported_by, department_id, assigned_to, expected_completion, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)`,
    ).run(
      id,
      input.title.trim(),
      input.description.trim(),
      input.roomId,
      input.category,
      input.priority,
      STATUS.SUBMITTED,
      user.id,
      timestamp,
      timestamp,
    );

    appendEvent(db, {
      requestId: id,
      actorId: user.id,
      action: 'Request submitted',
      details: 'Reported through ClassFix.',
      statusAfter: STATUS.SUBMITTED,
    });

    notifyRoles(
      db,
      [ROLES.FACULTY],
      {
        type: 'submission',
        requestId: id,
        title: `${id} — Request submitted`,
        body: `${input.title.trim()}. Waiting for advisor review.`,
      },
      user.id,
    );

    return id;
  });

  const id = run();
  return serializeRequest(getRequestRow(id, db), { detail: true }, db);
}

/* ------------------------------------------------------ workflow actions */

const NOTIFY_FOR_ACTION = {
  start_review: { type: 'status', roles: [] },
  verify: { type: 'verification', roles: [ROLES.OFFICIAL] },
  forward: { type: 'assignment', roles: [ROLES.OFFICIAL] },
  reject: { type: 'status', roles: [] },
  duplicate: { type: 'status', roles: [] },
  acknowledge: { type: 'status', roles: [ROLES.FACULTY] },
  assign_dept: { type: 'assignment', roles: [ROLES.FACULTY] },
  start_work: { type: 'status', roles: [ROLES.FACULTY] },
  log_inspection: { type: 'status', roles: [ROLES.FACULTY] },
  hold: { type: 'status', roles: [ROLES.FACULTY] },
  resolve: { type: 'resolution', roles: [ROLES.FACULTY] },
  official_reject: { type: 'status', roles: [ROLES.FACULTY] },
  confirm_fixed: { type: 'resolution', roles: [ROLES.FACULTY, ROLES.OFFICIAL] },
  reopen: { type: 'reopen', roles: [ROLES.FACULTY, ROLES.OFFICIAL] },
};

export function applyAction(requestId, actionId, input, user, db = getDb()) {
  const row = getRequestRow(requestId, db);
  if (!row) throw notFound(`No request with the ID ${requestId}.`);

  const action = getAction(actionId);
  if (!action) throw badRequest(`Unknown workflow action "${actionId}".`);

  // Authority check happens before anything is written.
  const verdict = authorizeAction(action, row, user);
  if (!verdict.ok) {
    if (verdict.status === 403) throw forbidden(verdict.message);
    if (verdict.status === 409) throw conflict(verdict.message);
    throw badRequest(verdict.message);
  }

  const inputError = validateActionInput(action, input);
  if (inputError) throw badRequest(inputError);

  let department = null;
  if (action.requiresDepartment) {
    department = getDepartment(input.departmentId, db);
    if (!department) throw badRequest('That department does not exist.');
    if (!department.active) throw badRequest('That department is no longer active.');
  }

  const run = db.transaction(() => {
    const nextStatus = action.to ?? row.status;
    const timestamp = nowIso();

    const detailParts = [];
    if (department) detailParts.push(`Department: ${department.name}.`);
    if (input.reason?.trim()) detailParts.push(input.reason.trim());
    if (input.expectedCompletion) {
      detailParts.push(`Expected completion set to ${input.expectedCompletion}.`);
    }
    const details = detailParts.join(' ') || 'No additional notes were recorded.';

    const expectedCompletion = input.expectedCompletion
      ? new Date(`${input.expectedCompletion}T17:00:00.000Z`).toISOString()
      : row.expected_completion;

    db.prepare(
      `UPDATE requests
          SET status = ?, department_id = ?, assigned_to = ?,
              expected_completion = ?, updated_at = ?
        WHERE id = ?`,
    ).run(
      nextStatus,
      department ? department.id : row.department_id,
      department ? (department.head_user_id ?? null) : row.assigned_to,
      expectedCompletion,
      timestamp,
      requestId,
    );

    appendEvent(db, {
      requestId,
      actorId: user.id,
      action: action.verb,
      details,
      statusAfter: action.to,
    });

    if (action.allowsEvidence && (input.evidence?.label || input.evidence?.note)) {
      db.prepare(
        `INSERT INTO attachments
           (request_id, kind, filename, mime_type, size_bytes, label, note, uploaded_by, created_at)
         VALUES (?, 'evidence', ?, 'text/plain', 0, ?, ?, ?, ?)`,
      ).run(
        requestId,
        'completion-note.txt',
        input.evidence.label?.trim() || 'Completion note',
        input.evidence.note?.trim() || '',
        user.id,
        timestamp,
      );
    }

    const mapping = NOTIFY_FOR_ACTION[action.id];
    if (mapping) {
      const payload = {
        type: mapping.type,
        requestId,
        title: `${requestId} — ${action.verb}`,
        body: `${row.title}. ${details}`,
      };

      // The reporter always hears what happened to their request.
      if (row.reported_by !== user.id) notifyUser(db, row.reported_by, payload);
      if (mapping.roles.length) notifyRoles(db, mapping.roles, payload, user.id);
    }
  });

  run();
  return serializeRequest(getRequestRow(requestId, db), { detail: true }, db);
}

/* ----------------------------------------------------- comments / votes */

export function addComment(requestId, body, user, db = getDb()) {
  const row = getRequestRow(requestId, db);
  if (!row) throw notFound(`No request with the ID ${requestId}.`);
  if (!canView(user, row)) throw forbidden('You cannot comment on that request.');

  db.prepare(
    'INSERT INTO comments (request_id, author_id, body, created_at) VALUES (?, ?, ?, ?)',
  ).run(requestId, user.id, body.trim(), nowIso());

  return serializeRequest(getRequestRow(requestId, db), { detail: true }, db);
}

/**
 * Toggles the caller's upvote. The (request_id, user_id) primary key makes a
 * double vote impossible even under concurrent requests.
 */
export function toggleUpvote(requestId, user, db = getDb()) {
  const row = getRequestRow(requestId, db);
  if (!row) throw notFound(`No request with the ID ${requestId}.`);

  const existing = db
    .prepare('SELECT 1 FROM upvotes WHERE request_id = ? AND user_id = ?')
    .get(requestId, user.id);

  if (existing) {
    db.prepare('DELETE FROM upvotes WHERE request_id = ? AND user_id = ?').run(requestId, user.id);
  } else {
    db.prepare(
      'INSERT INTO upvotes (request_id, user_id, created_at) VALUES (?, ?, ?)',
    ).run(requestId, user.id, nowIso());
  }

  return {
    added: !existing,
    request: serializeRequest(getRequestRow(requestId, db), { detail: true }, db),
  };
}

/* -------------------------------------------------------------- helpers */

export function suggestedDepartmentId(category) {
  return CATEGORY_DEPARTMENT[category] ?? null;
}

export function attachPhoto(requestId, file, user, db = getDb()) {
  const row = getRequestRow(requestId, db);
  if (!row) throw notFound(`No request with the ID ${requestId}.`);
  if (row.reported_by !== user.id && user.role === ROLES.STUDENT) {
    throw forbidden('You can only add photos to requests you reported.');
  }

  const info = db
    .prepare(
      `INSERT INTO attachments
         (request_id, kind, filename, mime_type, size_bytes, uploaded_by, created_at)
       VALUES (?, 'photo', ?, ?, ?, ?, ?)`,
    )
    .run(requestId, file.filename, file.mimetype, file.size, user.id, nowIso());

  appendEvent(db, {
    requestId,
    actorId: user.id,
    action: 'Photo attached',
    details: `${file.originalname} (${Math.round(file.size / 1024)} KB).`,
  });

  return { id: String(info.lastInsertRowid) };
}
