import { getDb } from '../db/index.js';

/**
 * Notifications are stored per recipient rather than per role, so "read" is a
 * property of one person's inbox instead of being shared between everyone who
 * happens to hold a role.
 */

function nowIso() {
  return new Date().toISOString();
}

export function notifyUser(db, userId, { type, requestId, title, body }) {
  db.prepare(
    `INSERT INTO notifications (user_id, type, request_id, title, body, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(userId, type, requestId ?? null, title, body, nowIso());
}

/** Fans a notification out to every active holder of the given roles. */
export function notifyRoles(db, roles, payload, excludeUserId = null) {
  if (!roles.length) return;

  const placeholders = roles.map(() => '?').join(', ');
  const recipients = db
    .prepare(
      `SELECT id FROM users
        WHERE role IN (${placeholders}) AND active = 1 AND id IS NOT ?`,
    )
    .all(...roles, excludeUserId);

  for (const recipient of recipients) {
    notifyUser(db, recipient.id, payload);
  }
}

export function listForUser(userId, { type, read, limit = 100 } = {}, db = getDb()) {
  const where = ['user_id = @userId'];
  const params = { userId, limit: Math.min(Math.max(limit, 1), 300) };

  if (type) {
    where.push('type = @type');
    params.type = type;
  }
  if (read === true) where.push('read_at IS NOT NULL');
  if (read === false) where.push('read_at IS NULL');

  const rows = db
    .prepare(
      `SELECT * FROM notifications
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC, id DESC
        LIMIT @limit`,
    )
    .all(params);

  return rows.map((row) => ({
    id: String(row.id),
    type: row.type,
    requestId: row.request_id,
    title: row.title,
    body: row.body,
    read: Boolean(row.read_at),
    readAt: row.read_at,
    at: row.created_at,
  }));
}

export function unreadCount(userId, db = getDb()) {
  return db
    .prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL')
    .get(userId).n;
}

/** Marks one notification read or unread. Scoped to the owner's own inbox. */
export function setRead(id, userId, read, db = getDb()) {
  const info = db
    .prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?')
    .run(read ? nowIso() : null, id, userId);
  return info.changes > 0;
}

export function markAllRead(userId, db = getDb()) {
  const info = db
    .prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL')
    .run(nowIso(), userId);
  return info.changes;
}

export function listAnnouncements(db = getDb()) {
  return db
    .prepare(
      `SELECT a.*, u.name AS posted_by_name
         FROM announcements a
         JOIN users u ON u.id = a.posted_by
        ORDER BY a.created_at DESC`,
    )
    .all()
    .map((row) => ({
      id: String(row.id),
      title: row.title,
      body: row.body,
      audience: row.audience,
      postedBy: row.posted_by,
      postedByName: row.posted_by_name,
      at: row.created_at,
    }));
}
