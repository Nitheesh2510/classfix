-- ClassFix database schema (SQLite)
--
-- Design notes:
--  * Foreign keys are enforced (see db/index.js, which turns the pragma on).
--  * Request history is append-only, guarded by triggers below rather than by
--    convention in application code.
--  * Statuses, roles, categories and priorities are constrained by CHECK, so a
--    typo in application code fails at the database rather than storing junk.

PRAGMA foreign_keys = ON;

/* ------------------------------------------------------------------ users */

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'official', 'admin')),
  title          TEXT,
  class_name     TEXT,
  department_id  TEXT REFERENCES departments(id) ON DELETE SET NULL,
  active         INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

/* -------------------------------------------------------------- locations */

CREATE TABLE IF NOT EXISTS buildings (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  code        TEXT NOT NULL,
  description TEXT,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS floors (
  id          TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  level       INTEGER NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  -- A building cannot have two floors with the same name.
  UNIQUE (building_id, name)
);

CREATE INDEX IF NOT EXISTS idx_floors_building ON floors(building_id);

CREATE TABLE IF NOT EXISTS rooms (
  id       TEXT PRIMARY KEY,
  floor_id TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  number   TEXT NOT NULL,
  name     TEXT,
  type     TEXT NOT NULL CHECK (type IN ('classroom', 'laboratory', 'library', 'washroom', 'other')),
  capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  active   INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  -- The rule the frontend promises: room numbers are unique within a floor.
  UNIQUE (floor_id, number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms(floor_id);

/* ------------------------------------------------------------ departments */

CREATE TABLE IF NOT EXISTS departments (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  code         TEXT NOT NULL,
  contact      TEXT,
  head_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  active       INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

/* --------------------------------------------------------------- requests */

CREATE TABLE IF NOT EXISTS requests (
  id                  TEXT PRIMARY KEY,          -- human-facing code, e.g. CF-1001
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  room_id             TEXT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  category            TEXT NOT NULL CHECK (category IN (
                        'fans', 'lights', 'furniture', 'projector', 'network',
                        'water', 'cleanliness', 'washroom', 'lab', 'other')),
  priority            TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status              TEXT NOT NULL CHECK (status IN (
                        'submitted', 'under_review', 'verified', 'assigned',
                        'acknowledged', 'in_progress', 'awaiting_verification',
                        'closed', 'rejected', 'duplicate', 'on_hold', 'reopened')),
  reported_by         TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  department_id       TEXT REFERENCES departments(id) ON DELETE SET NULL,
  assigned_to         TEXT REFERENCES users(id) ON DELETE SET NULL,
  expected_completion TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_requests_status     ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_room       ON requests(room_id);
CREATE INDEX IF NOT EXISTS idx_requests_reporter   ON requests(reported_by);
CREATE INDEX IF NOT EXISTS idx_requests_department ON requests(department_id);
CREATE INDEX IF NOT EXISTS idx_requests_created    ON requests(created_at);

/* Counter for generating CF-#### codes without races. */
CREATE TABLE IF NOT EXISTS request_sequence (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  next_value INTEGER NOT NULL
);

/* ---------------------------------------------------------- history trail */

CREATE TABLE IF NOT EXISTS request_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id   TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_id     TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action       TEXT NOT NULL,
  details      TEXT,
  status_after TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_request ON request_events(request_id, id);

-- The accountability guarantee, enforced by the database: once an action is
-- recorded it cannot be edited or deleted, not even by a buggy service layer.
CREATE TRIGGER IF NOT EXISTS request_events_no_update
BEFORE UPDATE ON request_events
BEGIN
  SELECT RAISE(ABORT, 'request_events is append-only: rows cannot be modified');
END;

CREATE TRIGGER IF NOT EXISTS request_events_no_delete
BEFORE DELETE ON request_events
WHEN (SELECT COUNT(*) FROM requests WHERE id = OLD.request_id) > 0
BEGIN
  SELECT RAISE(ABORT, 'request_events is append-only: rows cannot be deleted');
END;

/* ------------------------------------------------- comments / votes / files */

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comments_request ON comments(request_id);

CREATE TABLE IF NOT EXISTS upvotes (
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- One vote per person per request, guaranteed by the primary key.
  PRIMARY KEY (request_id, user_id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id  TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('photo', 'evidence')),
  filename    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL,
  label       TEXT,
  note        TEXT,
  uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attachments_request ON attachments(request_id);

/* ---------------------------------------- notifications and announcements */

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN (
               'submission', 'verification', 'assignment', 'status',
               'overdue', 'resolution', 'reopen')),
  request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);

CREATE TABLE IF NOT EXISTS announcements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  audience   TEXT NOT NULL,
  posted_by  TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
