import { getDb } from '../db/index.js';
import { ROLES, STATUS, TERMINAL_STATUSES } from '../domain/constants.js';
import { resolveLocation } from './locationRepo.js';

/** Queries and serialisation for requests, their history, comments and votes. */

const PRIORITY_RANK = { low: 1, medium: 2, high: 3, urgent: 4 };

export function getRequestRow(id, db = getDb()) {
  return db.prepare('SELECT * FROM requests WHERE id = ?').get(id) ?? null;
}

export function getEvents(requestId, db = getDb()) {
  return db
    .prepare('SELECT * FROM request_events WHERE request_id = ? ORDER BY id')
    .all(requestId);
}

export function getComments(requestId, db = getDb()) {
  return db
    .prepare(
      `SELECT c.*, u.name AS author_name, u.role AS author_role
         FROM comments c
         JOIN users u ON u.id = c.author_id
        WHERE c.request_id = ?
        ORDER BY c.id`,
    )
    .all(requestId);
}

export function getUpvoters(requestId, db = getDb()) {
  return db
    .prepare('SELECT user_id FROM upvotes WHERE request_id = ?')
    .all(requestId)
    .map((row) => row.user_id);
}

export function getAttachments(requestId, db = getDb()) {
  return db
    .prepare('SELECT * FROM attachments WHERE request_id = ? ORDER BY id')
    .all(requestId);
}

export function isOverdue(row) {
  if (!row.expected_completion) return false;
  if (TERMINAL_STATUSES.includes(row.status)) return false;
  if (row.status === STATUS.AWAITING_VERIFICATION) return false;
  return new Date(row.expected_completion).getTime() < Date.now();
}

/* -------------------------------------------------------- serialisation */

/** Camel-cased shape the frontend consumes. */
export function serializeRequest(row, { detail = false } = {}, db = getDb()) {
  const location = resolveLocation(row.room_id, db);
  const reporter = db
    .prepare('SELECT id, name, role, class_name, title FROM users WHERE id = ?')
    .get(row.reported_by);
  const assignee = row.assigned_to
    ? db.prepare('SELECT id, name, title FROM users WHERE id = ?').get(row.assigned_to)
    : null;
  const department = row.department_id
    ? db.prepare('SELECT id, name, code FROM departments WHERE id = ?').get(row.department_id)
    : null;

  const base = {
    id: row.id,
    title: row.title,
    description: row.description,
    roomId: row.room_id,
    location,
    category: row.category,
    priority: row.priority,
    status: row.status,
    overdue: isOverdue(row),
    reportedBy: row.reported_by,
    reporter: reporter ?? null,
    departmentId: row.department_id,
    department,
    assignedTo: row.assigned_to,
    assignee,
    expectedCompletion: row.expected_completion,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // When the request was closed, so a client can work out resolution times
    // from a list response without loading every timeline.
    closedAt:
      db
        .prepare(
          `SELECT created_at FROM request_events
            WHERE request_id = ? AND status_after = 'closed'
            ORDER BY id DESC LIMIT 1`,
        )
        .get(row.id)?.created_at ?? null,
    upvotes: getUpvoters(row.id, db),
    commentCount: db
      .prepare('SELECT COUNT(*) AS n FROM comments WHERE request_id = ?')
      .get(row.id).n,
  };

  if (!detail) return base;

  const attachments = getAttachments(row.id, db);

  return {
    ...base,
    timeline: getEvents(row.id, db).map((event) => serializeEvent(event, db)),
    comments: getComments(row.id, db).map((comment) => ({
      id: String(comment.id),
      requestId: comment.request_id,
      authorId: comment.author_id,
      authorName: comment.author_name,
      authorRole: comment.author_role,
      body: comment.body,
      at: comment.created_at,
    })),
    photos: attachments.filter((a) => a.kind === 'photo').map(serializeAttachment),
    evidence: attachments.filter((a) => a.kind === 'evidence').map(serializeAttachment),
  };
}

export function serializeEvent(event, db = getDb()) {
  const actor = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(event.actor_id);
  return {
    id: String(event.id),
    requestId: event.request_id,
    actorId: event.actor_id,
    actorName: actor?.name ?? 'Unknown user',
    actorRole: actor?.role ?? null,
    action: event.action,
    details: event.details,
    statusAfter: event.status_after,
    at: event.created_at,
  };
}

function serializeAttachment(row) {
  return {
    id: String(row.id),
    kind: row.kind,
    name: row.filename,
    label: row.label,
    note: row.note,
    mimeType: row.mime_type,
    size: row.size_bytes,
    url: `/api/requests/${row.request_id}/attachments/${row.id}`,
    uploadedBy: row.uploaded_by,
    at: row.created_at,
  };
}

/* -------------------------------------------------------------- scoping */

/**
 * Role-based row visibility, applied in SQL so a client cannot widen it.
 * Students see what they reported; faculty and officials see everything that
 * has entered the workflow.
 */
function scopeClause(user) {
  if (user.role === ROLES.STUDENT) {
    return { sql: 'rq.reported_by = @userId', params: { userId: user.id } };
  }
  return { sql: '1 = 1', params: {} };
}

/* ------------------------------------------------------------- filtering */

/**
 * Lists requests with filtering, sorting and pagination done in SQL.
 * `filters` mirrors the frontend's filter object.
 */
export function listRequests(user, filters = {}, db = getDb()) {
  const scope = scopeClause(user);
  const where = [scope.sql];
  const params = { ...scope.params };

  if (filters.search) {
    where.push(
      `(rq.id LIKE @search OR rq.title LIKE @search OR r.number LIKE @search OR b.name LIKE @search)`,
    );
    params.search = `%${filters.search}%`;
  }
  if (filters.buildingId) {
    where.push('b.id = @buildingId');
    params.buildingId = filters.buildingId;
  }
  if (filters.floorId) {
    where.push('f.id = @floorId');
    params.floorId = filters.floorId;
  }
  if (filters.roomId) {
    where.push('rq.room_id = @roomId');
    params.roomId = filters.roomId;
  }
  if (filters.category) {
    where.push('rq.category = @category');
    params.category = filters.category;
  }
  if (filters.priority) {
    where.push('rq.priority = @priority');
    params.priority = filters.priority;
  }
  if (filters.departmentId) {
    where.push('rq.department_id = @departmentId');
    params.departmentId = filters.departmentId;
  }
  if (filters.reportedBy) {
    where.push('rq.reported_by = @reportedBy');
    params.reportedBy = filters.reportedBy;
  }

  if (filters.status === 'overdue') {
    where.push(
      `rq.expected_completion IS NOT NULL
       AND rq.expected_completion < @now
       AND rq.status NOT IN ('closed', 'rejected', 'duplicate', 'awaiting_verification')`,
    );
    params.now = new Date().toISOString();
  } else if (filters.status) {
    where.push('rq.status = @status');
    params.status = filters.status;
  }

  if (filters.from) {
    where.push('rq.created_at >= @from');
    params.from = `${filters.from}T00:00:00.000Z`;
  }
  if (filters.to) {
    where.push('rq.created_at <= @to');
    params.to = `${filters.to}T23:59:59.999Z`;
  }

  const order =
    {
      newest: 'rq.created_at DESC',
      oldest: 'rq.created_at ASC',
      updated: 'rq.updated_at DESC',
      priority: 'priority_rank DESC, rq.created_at DESC',
    }[filters.sort] ?? 'rq.created_at DESC';

  const from = `
      FROM requests rq
      JOIN rooms r     ON r.id = rq.room_id
      JOIN floors f    ON f.id = r.floor_id
      JOIN buildings b ON b.id = f.building_id
     WHERE ${where.join(' AND ')}`;

  const total = db.prepare(`SELECT COUNT(*) AS n ${from}`).get(params).n;

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const page = Math.max(filters.page ?? 1, 1);
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `SELECT rq.*,
              CASE rq.priority
                WHEN 'urgent' THEN 4 WHEN 'high' THEN 3
                WHEN 'medium' THEN 2 ELSE 1 END AS priority_rank
         ${from}
         ORDER BY ${order}
         LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit, offset });

  return {
    items: rows.map((row) => serializeRequest(row, { detail: false }, db)),
    page,
    limit,
    total,
    pageCount: Math.max(1, Math.ceil(total / limit)),
  };
}

/** Every request visible to a user, for client-side dashboards. */
export function listAllVisible(user, db = getDb()) {
  const scope = scopeClause(user);
  const rows = db
    .prepare(
      `SELECT rq.* FROM requests rq WHERE ${scope.sql} ORDER BY rq.created_at DESC`,
    )
    .all(scope.params);
  return rows.map((row) => serializeRequest(row, { detail: false }, db));
}

export function canView(user, row) {
  if (user.role === ROLES.STUDENT) return row.reported_by === user.id;
  return true;
}

export { PRIORITY_RANK };
