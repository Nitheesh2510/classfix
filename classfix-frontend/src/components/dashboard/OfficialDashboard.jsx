import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Hammer, Inbox, Timer } from 'lucide-react';
import { CATEGORY_META, STATUS } from '../../constants/index.js';
import { useAppStore } from '../../hooks/useAppStore.js';
import { useRecentActivity } from '../../hooks/useRecentActivity.js';
import { resolveLocation } from '../../services/locationService.js';
import {
  groupBy,
  isOverdue,
  monthlyTrend,
  statusBreakdown,
  summarize,
  visibleRequests,
} from '../../services/requestService.js';
import { formatPercent, formatRelative } from '../../utils/format.js';
import { StatCard, StatGrid } from './StatCard.jsx';
import { BarList, ChartCard, GroupedColumns, StackedBar } from './Charts.jsx';
import { RequestList } from '../requests/RequestList.jsx';
import { ActivityFeed } from '../requests/Timeline.jsx';
import { StatusBadge } from '../common/Badge.jsx';

export function OfficialDashboard() {
  const { state, user } = useAppStore();

  const requests = useMemo(() => visibleRequests(state), [state]);
  const myDepartment = state.departments.find((item) => item.id === user.departmentId);

  const myQueue = useMemo(
    () => requests.filter((request) => request.departmentId === user.departmentId),
    [requests, user.departmentId],
  );

  const stats = useMemo(() => summarize(requests), [requests]);
  const needsAcknowledgement = requests.filter((request) => request.status === STATUS.ASSIGNED);
  const inProgress = requests.filter((request) => request.status === STATUS.IN_PROGRESS);
  const overdue = useMemo(() => requests.filter(isOverdue), [requests]);
  const activity = useRecentActivity(7);

  const byDepartment = useMemo(
    () =>
      groupBy(
        requests,
        (request) => request.departmentId,
        (key) => state.departments.find((item) => item.id === key)?.name ?? 'Unassigned',
      ),
    [requests, state.departments],
  );

  const byCategory = useMemo(
    () =>
      groupBy(
        requests,
        (request) => request.category,
        (key) => CATEGORY_META[key]?.label ?? 'Other',
      ).slice(0, 6),
    [requests],
  );

  const trend = useMemo(() => monthlyTrend(requests, 6), [requests]);

  return (
    <div className="space-y-5">
      <StatGrid columns={5}>
        <StatCard
          label={myDepartment ? `${myDepartment.name} queue` : 'My queue'}
          value={myQueue.length}
          icon={Inbox}
          to={`/requests?departmentId=${user.departmentId ?? ''}`}
        />
        <StatCard
          label="To acknowledge"
          value={needsAcknowledgement.length}
          hint="Assigned but not yet accepted"
          icon={Timer}
          tone="amber"
          to={`/requests?status=${STATUS.ASSIGNED}`}
        />
        <StatCard
          label="In progress"
          value={inProgress.length}
          icon={Hammer}
          tone="navy"
          to={`/requests?status=${STATUS.IN_PROGRESS}`}
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
          hint={
            stats.averageResolutionDays === null
              ? 'No closed requests yet'
              : `Average ${stats.averageResolutionDays.toFixed(1)} days to close`
          }
          icon={CheckCircle2}
          tone="green"
        />
      </StatGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-navy-900">
                {myDepartment ? `Assigned to ${myDepartment.name}` : 'Assigned work'}
              </h2>
              <Link to="/requests" className="cf-btn-secondary py-1.5 text-xs">
                Open request list
              </Link>
            </div>
            <RequestList
              requests={myQueue.slice(0, 6)}
              emptyTitle="Nothing assigned to your department"
              emptyMessage="Requests forwarded by advisors will land here."
            />
          </section>

          <ChartCard title="Requests and resolutions by month" subtitle="Last six months of demo data">
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

          <ChartCard title="Workload by department">
            <BarList data={byDepartment} />
          </ChartCard>

          <ChartCard title="Most reported problems">
            <BarList data={byCategory} tone="teal" />
          </ChartCard>

          <section className="cf-card">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-navy-900">Overdue issues</h2>
              <span className="text-xs text-slate-500">{overdue.length}</span>
            </header>
            {overdue.length ? (
              <ul className="divide-y divide-slate-100">
                {overdue.slice(0, 5).map((request) => {
                  const location = resolveLocation(state, request.roomId);
                  return (
                    <li key={request.id} className="px-4 py-3">
                      <Link
                        to={`/requests/${request.id}`}
                        className="text-sm font-medium text-navy-900 hover:underline"
                      >
                        {request.id} — {request.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">{location.path}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={request.status} short />
                        <span className="text-xs text-red-600">
                          Due {formatRelative(request.expectedCompletion)}
                        </span>
                      </div>
                    </li>
                  );
                })}
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
