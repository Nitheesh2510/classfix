# ClassFix API

REST backend for ClassFix — classroom facility requests, verification and
accountability tracking.

Node + Express + SQLite. Real password authentication, server-enforced workflow
rules, and an append-only action history that the database itself protects.

## Running it

Requires Node.js 18 or newer.

```bash
npm install
cp .env.example .env     # optional; defaults work for development
npm run db:reset         # create the schema and load the sample data
npm run dev              # http://localhost:4000
```

Check it is alive:

```bash
curl http://localhost:4000/api/health
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start with auto-restart on file changes |
| `npm start` | Start normally |
| `npm run db:migrate` | Apply the schema (safe to re-run) |
| `npm run db:seed` | Load the sample data (clears existing rows first) |
| `npm run db:reset` | Drop everything, recreate, reseed |
| `npm test` | Run the test suite (68 tests) |

### Sample accounts

Every seeded account uses the password **`classfix123`**.

| Role | Email | Notes |
| --- | --- | --- |
| Student | `aarthi@example-college.demo` | Reported most of the sample requests |
| Student | `nikhil@example-college.demo` | A second class representative |
| Faculty | `meera@example-college.demo` | Class advisor |
| Faculty | `sanjay@example-college.demo` | Class advisor |
| Official | `ravi@example-college.demo` | General Maintenance |
| Official | `latha@example-college.demo` | Electrical Services |
| Official | `imran@example-college.demo` | IT and Network |
| Official | `grace@example-college.demo` | Housekeeping |
| Official | `dinesh@example-college.demo` | Laboratory Support |
| Admin | `admin@example-college.demo` | Can act in any role |

## Configuration

All settings are read from the environment; see `.env.example`.

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | |
| `JWT_SECRET` | dev fallback | **Required** when `NODE_ENV=production`; the server refuses to start without it |
| `JWT_EXPIRES_IN` | `12h` | |
| `DATABASE_FILE` | `./data/classfix.db` | |
| `UPLOAD_DIR` | `./data/uploads` | |
| `MAX_UPLOAD_BYTES` | `2097152` (2 MB) | |
| `CORS_ORIGINS` | the Vite dev and preview servers | Both `localhost` and `127.0.0.1` spellings — a browser treats them as different origins |
| `SEED_PASSWORD` | `classfix123` | Password given to seeded accounts |

## How authorization works

Three things are checked, in this order, before any write happens:

1. **Who you are** — the bearer token is verified, then the account is re-read
   from the database. A role claimed inside a token is ignored, so a token
   signed before a role change, or hand-edited to say `admin`, grants nothing.
   Deactivating an account takes effect on the next request.
2. **Whether the transition is legal** — `src/domain/workflow.js` is the single
   source of truth for which role may move a request from which status to
   which. A request cannot skip a stage.
3. **Whether it is yours to act on** — only the reporter can confirm or reopen
   their own request, and only the assigned department can work on one.

The frontend has its own copy of the workflow table, but only to decide which
buttons to draw. `GET /api/requests/:id` returns the actions the caller is
actually permitted, and every action is re-checked on submit.

## What the database guarantees

Correctness that must not depend on application code is enforced in the schema
(`src/db/schema.sql`):

- **History is append-only.** Two triggers abort any `UPDATE` or `DELETE` on
  `request_events` while the request still exists. Even raw SQL cannot rewrite
  who did what.
- **Room numbers are unique within a floor** — `UNIQUE (floor_id, number)`.
- **One upvote per person per request** — the primary key is `(request_id, user_id)`.
- **No dangling locations.** Foreign keys are enforced, and a request's room is
  `ON DELETE RESTRICT`. Records still referenced by a request are deactivated
  rather than deleted, so a request can never point at a room that vanished.
- **Statuses, roles, categories and priorities are `CHECK`-constrained**, so a
  typo fails at the database rather than being stored.

Every workflow action runs inside a transaction: the status change, its history
entry and the notifications it triggers all commit together or not at all.

## API reference

All routes are under `/api`. Everything except `/health`, `/meta`,
`/auth/login` and `/auth/register` needs `Authorization: Bearer <token>`.

### Authentication

| Method | Route | Notes |
| --- | --- | --- |
| `POST` | `/auth/login` | `{ email, password }` → `{ token, user }`. Throttled. |
| `POST` | `/auth/register` | Self-registration; creates a **student** only |
| `GET` | `/auth/me` | The signed-in account, re-read from the database |
| `POST` | `/auth/password` | `{ currentPassword, newPassword }` |

### Requests

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/requests` | Filter, sort, paginate — see below |
| `GET` | `/requests/all` | Everything visible to the caller, unpaginated |
| `POST` | `/requests` | Create one (student or faculty) |
| `GET` | `/requests/:id` | Full detail, plus `availableActions` for this caller |
| `POST` | `/requests/:id/actions` | Apply a workflow transition |
| `POST` | `/requests/:id/comments` | `{ body }` |
| `POST` | `/requests/:id/upvote` | Toggles the caller's vote |
| `POST` | `/requests/:id/photos` | `multipart/form-data`, field `photo` |
| `GET` | `/requests/:id/attachments/:attachmentId` | Serves a stored file |

Query parameters for `GET /requests`: `search`, `buildingId`, `floorId`,
`roomId`, `category`, `priority`, `status` (any status, or `overdue`),
`departmentId`, `from`, `to` (`YYYY-MM-DD`), `sort`
(`newest` \| `oldest` \| `priority` \| `updated`), `page`, `limit` (max 200).

An unknown filter value is a `400` rather than being silently ignored.

### Locations and departments

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/locations` | The whole hierarchy in one call |
| `GET`/`POST`/`PUT`/`DELETE` | `/locations/buildings[/:id]` | Writes are staff-only |
| `GET`/`POST`/`PUT`/`DELETE` | `/locations/floors[/:id]` | |
| `GET`/`POST`/`PUT`/`DELETE` | `/locations/rooms[/:id]` | |
| `GET`/`POST`/`PUT`/`DELETE` | `/locations/departments[/:id]` | |

A `DELETE` answers `{ deleted: true }` or `{ deactivated: true, reason }`
depending on whether any request references the record.

### Notifications, statistics and reference

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/notifications` | The caller's own inbox, with `unread` |
| `PATCH` | `/notifications/:id` | `{ read }` — only your own |
| `POST` | `/notifications/read-all` | |
| `GET` | `/announcements` | |
| `GET` | `/stats/summary` | Headline counts |
| `GET` | `/stats/breakdown` | Every chart grouping |
| `GET` | `/stats/dashboard` | Summary, charts, overdue list, recent activity |
| `GET` | `/stats/slowest` | Closed requests that took longest |
| `GET` | `/users`, `/users/officials` | Staff-only; no email addresses |
| `GET` | `/health`, `/meta` | No token needed |

Statistics accept `buildingId`, `floorId`, `departmentId`, `days` and `months`.

### Status workflow

```
Submitted → Under Review → Verified → Assigned → Acknowledged
  → In Progress → Resolved (Awaiting Verification) → Closed
```

Plus `Rejected`, `Duplicate`, `On Hold` and `Reopened`.

| Action | Role | From | To | Requires |
| --- | --- | --- | --- | --- |
| `start_review` | faculty | submitted, reopened | under_review | |
| `verify` | faculty | submitted, under_review, reopened | verified | |
| `forward` | faculty | verified | assigned | department |
| `reject` | faculty | submitted, under_review, verified, reopened | rejected | reason |
| `duplicate` | faculty | submitted, under_review, verified | duplicate | reason |
| `acknowledge` | official | assigned | acknowledged | own department |
| `assign_dept` | official | assigned, acknowledged, in_progress, on_hold | — | department |
| `start_work` | official | acknowledged, on_hold, assigned | in_progress | own department |
| `log_inspection` | official | acknowledged, in_progress, on_hold | — | reason, own department |
| `hold` | official | assigned, acknowledged, in_progress | on_hold | reason, own department |
| `resolve` | official | in_progress, acknowledged | awaiting_verification | own department |
| `official_reject` | official | assigned, acknowledged, on_hold | rejected | reason, own department |
| `confirm_fixed` | student | awaiting_verification | closed | reporter only |
| `reopen` | student | awaiting_verification, closed | reopened | reason, reporter only |

`GET /api/meta` returns this table as JSON.

## Errors

Every failure is `{ "error": { "message": "...", "details": [...] } }`.
Validation failures list the offending fields. Statuses used: `400` invalid
input, `401` not signed in, `403` not allowed, `404` not found, `409` conflict
(illegal transition, duplicate record), `413` file too large, `429` throttled,
`500` server fault — logged, never echoed to the client.

## Project structure

```
src/
├── server.js          Entry point; graceful shutdown
├── app.js             Express app factory (so tests can mount it)
├── config.js          Environment configuration
├── db/
│   ├── schema.sql     Tables, constraints, append-only triggers
│   ├── index.js       Connection and pragmas
│   ├── migrate.js     Apply the schema
│   └── seed.js        Sample data
├── domain/
│   ├── constants.js   Roles, statuses, categories, priorities
│   └── workflow.js    Transition rules and authorization
├── middleware/        auth, validation, error handling
├── repositories/      SQL queries and serialisation
├── routes/            HTTP layer and zod schemas
└── services/          Transactions and business logic
tests/                 68 tests across 11 suites
```

## Tests

```bash
npm test
```

Each file gets its own temporary database, seeded fresh, so tests cannot
interfere with each other or with your development data. They cover:

- signing in, token forgery, expiry, and the role-claim escalation attempt
- role, status, ownership and department enforcement on every transition
- reasons being mandatory where the workflow says so
- the append-only guarantee, including direct SQL tampering
- transaction rollback when half an action fails
- duplicate room numbers, duplicate upvotes, cascade deletes, deactivation
- row visibility (a student cannot widen it with a query parameter)
- statistics agreeing with the request list they summarise
- the login throttle

## Notes and limits

- SQLite suits a single-server deployment well. The repository layer is plain
  SQL, so moving to PostgreSQL mainly means changing the driver and a handful
  of SQLite-specific functions (`julianday`, `strftime`).
- Tokens are not revocable before they expire; there is no refresh-token
  rotation. For a system of this size, a 12-hour expiry is the trade-off.
- The login throttle is in-memory, so it resets on restart and is per-process.
- Uploads are stored on local disk, which means a single server or a shared
  volume.
- There is no admin UI for creating staff accounts yet; seed them, or add rows
  directly.
