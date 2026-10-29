import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  Megaphone,
  Timer,
} from 'lucide-react';
import { CATEGORY_META, STATUS } from '../../constants/index.js';
import { useAppStore } from '../../hooks/useAppStore.js';
import { useRecentActivity } from '../../hooks/useRecentActivity.js';
import { resolveLocation } from '../../services/locationService.js';
import {
  groupBy,
  statusBreakdown,
  summarize,
  visibleRequests,
} from '../../services/requestService.js';
import { formatPercent, formatRelative } from '../../utils/format.js';
import { StatCard, StatGrid } from './StatCard.jsx';
import { BarList, ChartCard, StackedBar } from './Charts.jsx';
import { RequestList } from '../requests/RequestList.jsx';
import { ActivityFeed } from '../requests/Timeline.jsx';
import { EmptyState } from '../common/EmptyState.jsx';

export function StudentDashboard() {
  const { state } = useAppStore();

  const requests = useMemo(() => visibleRequests(state), [state]);
  const stats = useMemo(() => summarize(requests), [requests]);

  const awaitingConfirmation = requests.filter(
    (request) => request.status === STATUS.AWAITING_VERIFICATION,
  );
  const recent = useMemo(
    () => [...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    [requests],
  );
  const categories = useMemo(
    () =>
      groupBy(
        requests,
        (request) => request.category,
        (key) => CATEGORY_META[key]?.label ?? 'Other',
      ).slice(0, 5),
    [requests],
  );
  const activity = useRecentActivity(6);
  const announcement = state.announcements[0];

  return (
    <div className="space-y-5">
      <StatGrid>
        <StatCard label="My requests" value={stats.total} icon={ClipboardList} to="/requests" />
        <StatCard
          label="Awaiting action"
          value={stats.pending}
          hint="Not yet picked up by a department"
          icon={Timer}
          tone="amber"
        />
        <StatCard
          label="Closed"
          value={stats.closed}
          hint={`${formatPercent(stats.resolutionRate)} of my requests`}
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          hint="Past the expected completion date"
          icon={AlertTriangle}
          tone="red"
        />
      </StatGrid>

      {awaitingConfirmation.length > 0 ? (
        <section className="cf-card border-teal-200 bg-teal-50/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-navy-900">
                {awaitingConfirmation.length === 1
                  ? 'One repair is waiting for your confirmation'
                  : `${awaitingConfirmation.length} repairs are waiting for your confirmation`}
              </h2>
              <p className="mt-1 text-sm text-slate-700">
                Open the request and confirm whether the issue is actually fixed, or reopen it with a
                reason.
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {awaitingConfirmation.map((request) => {
              const location = resolveLocation(state, request.roomId);
              return (
                <li
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2"
                >
                  <span className="min-w-0">
                    <Link
                      to={`/requests/${request.id}`}
                      className="text-sm font-medium text-navy-900 hover:underline"
                    >
                      {request.id} — {request.title}
                    </Link>
                    <span className="block text-xs text-slate-500">{location.path}</span>
                  </span>
                  <Link to={`/requests/${request.id}`} className="cf-btn-accent py-1.5 text-xs">
                    Review repair
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-navy-900">My recent requests</h2>
              <div className="flex gap-2">
                <Link to="/requests" className="cf-btn-secondary py-1.5 text-xs">
                  View all
                </Link>
                <Link to="/requests/new" className="cf-btn-primary py-1.5 text-xs">
                  <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
                  New request
                </Link>
              </div>
            </div>
            <RequestList
              requests={recent}
              emptyTitle="You have not reported anything yet"
              emptyMessage="Submit a facility request and it will appear here with its full action history."
              emptyAction={
                <Link to="/requests/new" className="cf-btn-primary">
                  Create a request
                </Link>
              }
            />
          </section>

          <ChartCard title="What I report most" subtitle="Across all of my demo requests">
            <BarList data={categories} tone="teal" emptyMessage="No requests to summarise yet." />
          </ChartCard>
        </div>

        <div className="space-y-5">
          <ChartCard title="Status of my requests">
            <StackedBar data={statusBreakdown(requests)} />
          </ChartCard>

          <section className="cf-card">
            <header className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-navy-900">Recent actions</h2>
            </header>
            <ActivityFeed entries={activity} emptyMessage="Nothing has happened yet." />
          </section>

          <section className="cf-card">
            <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <Megaphone className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-navy-900">Latest announcement</h2>
            </header>
            {announcement ? (
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-navy-900">{announcement.title}</p>
                <p className="mt-1 text-sm text-slate-600">{announcement.body}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {announcement.audience} · {formatRelative(announcement.at)}
                </p>
                <Link to="/notifications?tab=announcements" className="cf-link mt-2 inline-block text-xs">
                  All announcements
                </Link>
              </div>
            ) : (
              <EmptyState title="No announcements" message="Nothing has been posted yet." />
            )}
          </section>
        </div>
      </div>

      {stats.overdue > 0 ? (
        <p className="text-xs text-slate-500">
          Overdue counts compare the expected completion date against today using illustrative demo
          dates.
        </p>
      ) : null}
    </div>
  );
}
