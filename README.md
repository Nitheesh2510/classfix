# ClassFix

Classroom facility request and accountability tracking for a college or school.

Students report what is broken, faculty verify it, officials record what they
did about it. Every request has a unique ID, an exact room location, a current
status and a complete action history — the thing letters and emails never give
you.

```
classfix/
├── classfix-backend/    Node + Express + SQLite REST API
└── classfix-frontend/   React + Vite + Tailwind interface
```

Each folder has its own README with full detail. This one gets you running.

## Quick start

Requires Node.js 18 or newer. Two terminals.

```bash
# 1 — API on http://localhost:4000
cd classfix-backend
npm install
npm run db:reset          # create the schema, load sample data
npm run dev

# 2 — interface on http://localhost:5173
cd classfix-frontend
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**. Sign in with any sample account — the login
screen lists them and clicking one fills the form.

| Role | Email | Password |
| --- | --- | --- |
| Student | `aarthi@example-college.demo` | `classfix123` |
| Faculty | `meera@example-college.demo` | `classfix123` |
| Official | `ravi@example-college.demo` | `classfix123` |

Start the backend first; the frontend needs it to sign in.

## Try the whole workflow

The point of ClassFix is the chain of accountability, which takes three
accounts to see:

1. **As the student** (`aarthi@…`) — create a request from **New Request**.
   Pick Main Block → Third Floor → a room, add a description, submit. Note the
   `CF-####` ID.
2. **As faculty** (`meera@…`) — open that request, **Verify issue**, then
   **Forward to department** and choose Electrical Services.
3. **As the official** (`latha@…`, Electrical Services) — **Acknowledge**,
   **Start work** with a date, then **Mark repair complete** with a note.
4. **Back as the student** — **Confirm it is fixed**, or reopen it with a
   reason.

Watch the action timeline grow at each step. Nothing is ever removed from it.

Worth trying, to see the rules are real rather than cosmetic:

- Sign in as the student and open a request another student reported — the API
  refuses it.
- As faculty, try to reject something without typing a reason.
- As an official in the wrong department, look for the Acknowledge button.

## What's enforced where

Authorization lives on the server, not in the interface:

- Tokens are verified, then the account is **re-read from the database**, so a
  role claim edited into a token grants nothing.
- `classfix-backend/src/domain/workflow.js` is the single source of truth for
  who may move a request from which status to which. Stages cannot be skipped.
- Only the reporter can confirm or reopen their own request; only the assigned
  department can work on one.
- The frontend has a copy of the workflow table purely to decide which buttons
  to draw, and the server re-checks every action on submit.

Correctness that must not depend on application code is in the schema:

- **History is append-only** — triggers abort any `UPDATE` or `DELETE` on
  `request_events`. Even raw SQL cannot rewrite who did what.
- **Room numbers are unique within a floor**; **one upvote per person per
  request**; foreign keys enforced throughout.
- Records still referenced by a request are **deactivated rather than deleted**,
  so no request points at a room that vanished.

Each workflow action runs in a transaction, so a status change, its history
entry and its notifications commit together or not at all.

## Tests

```bash
cd classfix-backend && npm test    # 68 tests, 11 suites
```

Covers token forgery and role escalation, every workflow guard, the
append-only guarantee including direct SQL tampering, transaction rollback,
duplicate constraints, row visibility, and statistics agreeing with the request
list they summarise.

## Status workflow

```
Submitted → Under Review → Verified → Assigned → Acknowledged
  → In Progress → Resolved (Awaiting Verification) → Closed
```

Plus `Rejected`, `Duplicate`, `On Hold` and `Reopened`.
`GET /api/meta` returns the full transition table as JSON.

## Sample data

Three buildings, 9 floors, 23 rooms, 5 departments, 10 accounts and 16 requests
spread across every status, including `CF-1001 — Classroom fans not working` in
Main Block → Second Floor → Room 204, carried all the way to awaiting
verification.

Dates are generated relative to when the seed runs, so "overdue" and "recent
activity" stay meaningful. `npm run db:reset` in the backend puts everything
back.

## Before deploying anywhere real

- Set `JWT_SECRET` in the backend's `.env`. With `NODE_ENV=production` the
  server refuses to start without one.
- Change the seeded passwords, or seed only the accounts you want.
- Add your site's origin to `CORS_ORIGINS`.
- Build the frontend (`npm run build`) and serve `dist/` behind the same domain
  as the API, or set `VITE_API_URL` to wherever the API lives.
