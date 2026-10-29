# ClassFix — Classroom Facility Request & Accountability

Frontend for ClassFix: students report classroom facility problems, faculty
verify them, and officials record what they actually did about them. Every
request carries a unique ID, an exact room location, a current status and a
complete action history.

React + Vite + Tailwind. It talks to the **ClassFix API** (`../classfix-backend`)
over HTTP with real password authentication.

## Running it

Start the backend first — the frontend needs it to sign in.

```bash
# terminal 1
cd ../classfix-backend
npm install
npm run db:reset
npm run dev            # http://localhost:4000

# terminal 2
cd ../classfix-frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm run dev            # http://localhost:5173
```

Open **http://localhost:5173** and sign in. The login screen lists the sample
accounts; click one to fill the form.

| Role | Email | Password |
| --- | --- | --- |
| Student | `aarthi@example-college.demo` | `classfix123` |
| Faculty | `meera@example-college.demo` | `classfix123` |
| Official | `ravi@example-college.demo` | `classfix123` |

You can also create your own student account from the **Create account** tab.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | oxlint |

### If sign-in fails

- **"Could not reach the ClassFix API"** — the backend is not running, or
  `VITE_API_URL` points somewhere else.
- **A CORS error in the console** — you opened the app on a different hostname
  than the API allows. `localhost` and `127.0.0.1` are different origins to a
  browser; both are permitted by default, but add yours to `CORS_ORIGINS` in
  the backend's `.env` if you use another.

## Roles

What you can see and do is decided by the **server**, from the account you
signed in as. There is no role switcher: signing in as someone else is the only
way to change role, exactly as it would be in production.

| Role | Can |
| --- | --- |
| Student / Class Rep | Submit requests, upvote, track status, confirm or reopen their own repairs |
| Faculty / Advisor | Verify, reject, mark duplicate, forward to a department |
| Official | Acknowledge, assign, record inspections and delays, mark complete with evidence |

A student only ever receives their own requests from the API, so opening
someone else's by URL returns a clear "no access" page rather than hiding it in
the interface.

## Status workflow

```
Submitted → Under Review → Verified → Assigned → Acknowledged
  → In Progress → Resolved (Awaiting Verification) → Closed
```

Plus `Rejected`, `Duplicate`, `On Hold` and `Reopened`.

The action panel on a request shows only the transitions the **server** says
you may perform — `GET /api/requests/:id` returns that list after checking your
role, the request's status, whether you reported it and which department it is
assigned to. The server re-checks everything when you submit, so the interface
cannot be tricked by editing the page.

Rejecting, holding, reopening, marking a duplicate or recording an inspection
all require a written reason, and every transition appends an entry to the
action history. History is append-only: the database refuses to edit or delete
an entry, so the record of who did what cannot be rewritten.

## Location hierarchy

```
Institution → Building → Floor → Room → Facility Request
```

Selecting a building filters its floors; selecting a floor filters its rooms, so
a room can never be attached to the wrong floor. Room numbers are unique within
a floor, enforced by a database constraint rather than a client-side check.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Sign in or create a student account |
| `/dashboard` | Role-specific dashboard |
| `/requests` | All visible requests with search, filters, sorting, pagination |
| `/requests/new` | Facility request form, with optional photo upload |
| `/requests/:id` | Request details and action timeline |
| `/manage/buildings`, `/floors`, `/rooms`, `/departments` | Facility records (staff may edit) |
| `/notifications` | Your notifications and institution announcements |
| `/analytics` | Reports and analytics |
| `/profile` | Account details and password change |
| `*` | Not found |

## Project structure

```
src/
├── app/
│   ├── App.jsx              Providers
│   ├── router.jsx           Routes
│   ├── AppStoreProvider.jsx Session, loaded data, API actions
│   └── appStoreContext.js
├── components/
│   ├── layout/     Sidebar, header, page shell
│   ├── common/     Badges, fields, modals, tables, toasts, AuthImage
│   ├── requests/   Cards, list, filters, timeline, action panel
│   ├── dashboard/  Stat cards, charts, the three role dashboards
│   └── forms/      Location selector, photo picker
├── pages/          One file per route
├── services/
│   ├── api.js              The only place that talks to the API
│   ├── locationService.js  Pure helpers over the location hierarchy
│   └── requestService.js   Client-side filtering, sorting, statistics
├── hooks/          useAppStore, useToast, useRecentActivity
├── constants/      Roles, statuses, categories, priorities, labels
└── utils/          Formatting helpers
```

### How data flows

`AppStoreProvider` holds the signed-in user plus the data loaded from the API —
locations, the requests you can see, your notifications and announcements. Every
mutation calls `services/api.js` and then refreshes, so what you see is always
what the server stored.

Filtering, sorting and the dashboard statistics are computed on the client from
the loaded requests. That keeps the filter UI instant and is fine at the scale a
college produces. The API also supports server-side filtering, pagination and
aggregation (`GET /api/requests?...`, `GET /api/stats/...`), which is the route
to take if the table ever outgrows a single response.

The JWT is kept in `localStorage`, so a reload keeps you signed in. Every API
call attaches it; a `401` clears the session and returns you to the sign-in
screen.

Request photos are real uploads. Because attachments sit behind the API's auth
check, an `<img src>` cannot fetch them directly — `AuthImage` requests the file
with the token and renders it from an object URL.

## Charts

Built from plain HTML and SVG, no chart library. Each figure comes from the
records the API returned, so the numbers always agree with the request list.

## Notes and limits

- There is no route-level code splitting; the bundle is a single chunk. Worth
  adding `React.lazy` if the app grows much further.
- Dashboard activity feeds come from the API, since a request list response
  does not carry full timelines.
- The analytics page recomputes from the loaded requests, so its figures follow
  whatever the server made visible to you.
