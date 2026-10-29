import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, Building2, ClipboardList, Timer } from 'lucide-react';
import { STATUS } from '../../constants/index.js';
import { useAppStore } from '../../hooks/useAppStore.js';
import { useRecentActivity } from '../../hooks/useRecentActivity.js';
import { resolveLocation } from '../../services/locationService.js';
import {
  groupBy,
  isOverdue,
  monthlyTrend,
  statusBreakdown,
  summarize,
} from '../../services/requestService.js';
import { formatPercent, formatRelative } from '../../utils/format.js';
import { StatCard, StatGrid } from './StatCard.jsx';
import { BarList, ChartCard, GroupedColumns, StackedBar } from './Charts.jsx';
import { RequestList } from '../requests/RequestList.jsx';
import { ActivityFeed } from '../requests/Timeline.jsx';
import { StatusBadge } from '../common/Badge.jsx';

const AWAITING_REVIEW = [STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.REOPENED];

export function FacultyDashboard() {
  const { state } = useAppStore();
  const requests = state.requests;

  const stats = useMemo(() => summarize(requests), [requests]);
  const toReview = useMemo(
    () => requests.filter((request) => AWAITING_REVIEW.includes(request.status)),
    [requests],
  );
  const overdue = useMemo(() => requests.filter(isOverdue), [requests]);
  const verified = requests.filter((request) => request.status === STATUS.VERIFIED);
  const activity = useRecentActivity(7);

  const byBuilding = useMemo(
    () =>
      groupBy(
        requests,
        (request) => resolveLocation(state, request.roomId).building?.id ?? null,
        (key) => state.buildings.find((item) => item.id === key)?.name ?? 'Unknown building',
      ),
    [requests, state],
  );

  const trend = useMemo(() => monthlyTrend(requests, 6), [requests]);

  return (
    <div className="space-y-5">
      <StatGrid columns={5}>
        <StatCard label="All requests" value={stats.total} icon={ClipboardList} to="/requests" />
        <StatCard
          label="Waiting for review"
          value={toReview.length}
          hint="Submitted, under review or reopened"
          icon={Timer}
          tone="amber"
          to={`/requests?status=${STATUS.SUBMITTED}`}
        />
        <StatCard
          label="Verified, not forwarded"
          value={verified.length}
          hint="Ready to send to a department"
          icon={BadgeCheck}
          tone="teal"
          to={`/requests?status=${STATUS.VERIFIED}`}
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          icon={AlertTriangle}
          tone="red"
          to="/requests?status=overdue"
        />
        <StatCard
          label="Resolution rate"
          value={formatPercent(stats.resolutionRate)}
          hint={`${stats.closed} of ${stats.total} closed`}
          icon={Building2}
          tone="green"
        />
      </StatGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-navy-900">Needs my review</h2>
              <Link to="/requests" className="cf-btn-secondary py-1.5 text-xs">
                Open request list
              </Link>
            </div>
            <RequestList
              requests={toReview.slice(0, 6)}
              emptyTitle="Nothing is waiting for review"
              emptyMessage="New student reports will appear here as soon as they are submitted."
            />
          </section>

          <ChartCard
            title="Requests and resolutions by month"
            subtitle="Last six months of demo data"
          >
            <GroupedColumns
              data={trend}
              seriesA={{ key: 'created', label: 'Submitted', className: 'bg-navy-700' }}
              seriesB={{ key: 'resolved', label: 'Closed', className: 'bg-teal-500' }}
            />
          </ChartCard>
        </div>

        <div className="space-y-5">
          <ChartCard title="Status distribution">
            <StackedBar data={statusBreakdown(requests)} />
          </ChartCard>

          <ChartCard title="Requests by building">
            <BarList data={byBuilding} />
          </ChartCard>

          <section className="cf-card">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-navy-900">Overdue issues</h2>
              <span className="text-xs text-slate-500">{overdue.length}</span>
            </header>
            {overdue.length ? (
              <ul className="divide-y divide-slate-100">
                {overdue.slice(0, 5).map((request) => (
                  <li key={request.id} className="px-4 py-3">
                    <Link
                      to={`/requests/${request.id}`}
                      className="text-sm font-medium text-navy-900 hover:underline"
                    >
                      {request.id} — {request.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={request.status} short />
                      <span className="text-xs text-red-600">
                        Due {formatRelative(request.expectedCompletion)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                Nothing is past its expected completion date.
              </p>
            )}
          </section>

          <section className="cf-card">
            <header className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-navy-900">Recent actions</h2>
            </header>
            <ActivityFeed entries={activity} />
          </section>
        </div>
      </div>
    </div>
  );
}
