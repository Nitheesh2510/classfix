import { getDb } from '../db/index.js';
import { ROLES, STATUS, STATUS_LABELS } from '../domain/constants.js';

/**
 * Aggregates computed in SQL. The frontend can derive the same numbers from a
 * loaded request list; these endpoints exist so dashboards stay fast once the
 * table grows past what is sensible to send to a browser.
 */

const OPEN_STATUSES = ['submitted', 'under_review', 'verified', 'reopened', 'on_hold'];
const ACTIVE_STATUSES = ['assigned', 'acknowledged', 'in_progress'];

function scope(user) {
  if (user.role === ROLES.STUDENT) {
    return { sql: 'rq.reported_by = @userId', params: { userId: user.id } };
  }
  return { sql: '1 = 1', params: {} };
}

function buildWhere(user, filters = {}) {
  const base = scope(user);
  const where = [base.sql];
  const params = { ...base.params, now: new Date().toISOString() };

  if (filters.buildingId) {
    where.push('b.id = @buildingId');
    params.buildingId = filters.buildingId;
  }
  if (filters.floorId) {
    where.push('f.id = @floorId');
    params.floorId = filters.floorId;
  }
  if (filters.departmentId) {
    where.push('rq.department_id = @departmentId');
    params.departmentId = filters.departmentId;
  }
  if (filters.days) {
    where.push("rq.created_at >= datetime('now', @window)");
    params.window = `-${Number(filters.days)} days`;
  }

  return { clause: where.join(' AND '), params };
}

const JOINS = `
  FROM requests rq
  JOIN rooms r     ON r.id = rq.room_id
  JOIN floors f    ON f.id = r.floor_id
  JOIN buildings b ON b.id = f.building_id`;

export function summary(user, filters = {}, db = getDb()) {
  const { clause, params } = buildWhere(user, filters);

  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN rq.status IN (${OPEN_STATUSES.map((s) => `'${s}'`).join(',')}) THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN rq.status IN (${ACTIVE_STATUSES.map((s) => `'${s}'`).join(',')}) THEN 1 ELSE 0 END) AS in_progress,
         SUM(CASE WHEN rq.status = 'awaiting_verification' THEN 1 ELSE 0 END) AS awaiting,
         SUM(CASE WHEN rq.status = 'closed' THEN 1 ELSE 0 END) AS closed,
         SUM(CASE WHEN rq.status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
         SUM(CASE WHEN rq.status = 'duplicate' THEN 1 ELSE 0 END) AS duplicate,
         SUM(CASE WHEN rq.expected_completion IS NOT NULL
                   AND rq.expected_completion < @now
                   AND rq.status NOT IN ('closed','rejected','duplicate','awaiting_verification')
                  THEN 1 ELSE 0 END) AS overdue
       ${JOINS}
       WHERE ${clause}`,
    )
    .get(params);

  const total = row.total ?? 0;
  const closed = row.closed ?? 0;

  // Average days from submission to the closing history entry.
  const avg = db
    .prepare(
      `SELECT AVG(julianday(e.created_at) - julianday(rq.created_at)) AS days
         ${JOINS}
         JOIN request_events e ON e.request_id = rq.id AND e.status_after = 'closed'
        WHERE ${clause}`,
    )
    .get(params);

  return {
    total,
    pending: row.pending ?? 0,
    inProgress: row.in_progress ?? 0,
    awaiting: row.awaiting ?? 0,
    closed,
    rejected: row.rejected ?? 0,
    duplicate: row.duplicate ?? 0,
    overdue: row.overdue ?? 0,
    resolved: closed + (row.awaiting ?? 0),
    resolutionRate: total ? (closed / total) * 100 : 0,
    averageResolutionDays: avg?.days == null ? null : Number(avg.days.toFixed(2)),
  };
}

function groupQuery(user, filters, selectKey, selectLabel, joinExtra = '', db = getDb()) {
  const { clause, params } = buildWhere(user, filters);
  return db
    .prepare(
      `SELECT ${selectKey} AS key, ${selectLabel} AS label, COUNT(*) AS value
         ${JOINS} ${joinExtra}
        WHERE ${clause}
        GROUP BY key
        ORDER BY value DESC`,
    )
    .all(params);
}

export function byStatus(user, filters = {}, db = getDb()) {
  return groupQuery(user, filters, 'rq.status', 'rq.status', '', db).map((row) => ({
    key: row.key,
    label: STATUS_LABELS[row.key] ?? row.key,
    value: row.value,
  }));
}

export function byCategory(user, filters = {}, db = getDb()) {
  return groupQuery(user, filters, 'rq.category', 'rq.category', '', db);
}

export function byBuilding(user, filters = {}, db = getDb()) {
  return groupQuery(user, filters, 'b.id', 'b.name', '', db);
}

export function byFloor(user, filters = {}, db = getDb()) {
  return groupQuery(user, filters, 'f.id', "b.code || ' · ' || f.name", '', db);
}

export function byDepartment(user, filters = {}, db = getDb()) {
  const { clause, params } = buildWhere(user, filters);
  return db
    .prepare(
      `SELECT COALESCE(rq.department_id, 'unassigned') AS key,
              COALESCE(d.name, 'Not yet assigned')     AS label,
              COUNT(*) AS value
         ${JOINS}
         LEFT JOIN departments d ON d.id = rq.department_id
        WHERE ${clause}
        GROUP BY key
        ORDER BY value DESC`,
    )
    .all(params);
}

/** Submitted and closed counts for the last `months` calendar months. */
export function monthlyTrend(user, filters = {}, months = 6, db = getDb()) {
  const { clause, params } = buildWhere(user, filters);

  const created = db
    .prepare(
      `SELECT strftime('%Y-%m', rq.created_at) AS month, COUNT(*) AS value
         ${JOINS}
        WHERE ${clause}
        GROUP BY month`,
    )
    .all(params);

  const closed = db
    .prepare(
      `SELECT strftime('%Y-%m', e.created_at) AS month, COUNT(*) AS value
         ${JOINS}
         JOIN request_events e ON e.request_id = rq.id AND e.status_after = 'closed'
        WHERE ${clause}
        GROUP BY month`,
    )
    .all(params);

  const createdMap = new Map(created.map((r) => [r.month, r.value]));
  const closedMap = new Map(closed.map((r) => [r.month, r.value]));

  const buckets = [];
  const now = new Date();
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      key,
      label: date.toLocaleDateString('en-GB', { month: 'short' }),
      created: createdMap.get(key) ?? 0,
      resolved: closedMap.get(key) ?? 0,
    });
  }
  return buckets;
}

/** Closed requests that took the longest, for the analytics page. */
export function slowestResolved(user, filters = {}, limit = 5, db = getDb()) {
  const { clause, params } = buildWhere(user, filters);
  return db
    .prepare(
      `SELECT rq.id, rq.title, b.name AS building, f.name AS floor, r.number AS room,
              CAST(julianday(e.created_at) - julianday(rq.created_at) AS INTEGER) AS days
         ${JOINS}
         JOIN request_events e ON e.request_id = rq.id AND e.status_after = 'closed'
        WHERE ${clause}
        ORDER BY days DESC
        LIMIT @limit`,
    )
    .all({ ...params, limit });
}

/** Requests past their expected completion date, soonest first. */
export function overdueList(user, limit = 10, db = getDb()) {
  const base = scope(user);
  return db
    .prepare(
      `SELECT rq.id, rq.title, rq.status, rq.priority, rq.expected_completion,
              b.name AS building, f.name AS floor, r.number AS room
         ${JOINS}
        WHERE ${base.sql}
          AND rq.expected_completion IS NOT NULL
          AND rq.expected_completion < @now
          AND rq.status NOT IN ('closed','rejected','duplicate','awaiting_verification')
        ORDER BY rq.expected_completion ASC
        LIMIT @limit`,
    )
    .all({ ...base.params, now: new Date().toISOString(), limit });
}

/** Most recent history entries across everything the user can see. */
export function recentActivity(user, limit = 8, db = getDb()) {
  const base = scope(user);
  return db
    .prepare(
      `SELECT e.id, e.request_id, e.action, e.details, e.created_at,
              rq.title AS request_title, u.name AS actor_name
         FROM request_events e
         JOIN requests rq ON rq.id = e.request_id
         JOIN users u     ON u.id = e.actor_id
        WHERE ${base.sql.replace(/rq\./g, 'rq.')}
        ORDER BY e.id DESC
        LIMIT @limit`,
    )
    .all({ ...base.params, limit })
    .map((row) => ({
      id: String(row.id),
      requestId: row.request_id,
      requestTitle: row.request_title,
      action: row.action,
      details: row.details,
      actorName: row.actor_name,
      at: row.created_at,
    }));
}

export { STATUS };
