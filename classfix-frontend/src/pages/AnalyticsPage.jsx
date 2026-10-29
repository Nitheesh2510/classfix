import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, Timer } from 'lucide-react';
import { CATEGORY_META, STATUS } from '../constants/index.js';
import { useAppStore } from '../hooks/useAppStore.js';
import { resolveLocation } from '../services/locationService.js';
import {
  EMPTY_FILTERS,
  filterRequests,
  groupBy,
  monthlyTrend,
  resolutionDays,
  statusBreakdown,
  summarize,
} from '../services/requestService.js';
import { formatPercent } from '../utils/format.js';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { StatCard, StatGrid } from '../components/dashboard/StatCard.jsx';
import { BarList, ChartCard, GroupedColumns, StackedBar } from '../components/dashboard/Charts.jsx';
import { Field, Select } from '../components/common/Field.jsx';
import { getFloorsForBuilding } from '../services/locationService.js';

const PERIODS = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '', label: 'All demo data' },
];

export function AnalyticsPage() {
  const { state } = useAppStore();
  const [period, setPeriod] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const floors = useMemo(() => getFloorsForBuilding(state, buildingId), [state, buildingId]);

  /* Captured once when the page opens so the period filter does not shift
     under the user while they are reading the report. */
  const [openedAt] = useState(() => Date.now());

  const requests = useMemo(() => {
    const from = period
      ? new Date(openedAt - Number(period) * 86400000).toISOString().slice(0, 10)
      : '';
    return filterRequests(state, state.requests, {
      ...EMPTY_FILTERS,
      buildingId,
      floorId,
      departmentId,
      from,
    });
  }, [state, period, openedAt, buildingId, floorId, departmentId]);

  const stats = useMemo(() => summarize(requests), [requests]);

  const byBuilding = useMemo(
    () =>
      groupBy(
        requests,
        (request) => resolveLocation(state, request.roomId).building?.id ?? null,
        (key) => state.buildings.find((item) => item.id === key)?.name ?? 'Unknown building',
      ),
    [requests, state],
  );

  const byFloor = useMemo(
    () =>
      groupBy(
        requests,
        (request) => resolveLocation(state, request.roomId).floor?.id ?? null,
        (key) => {
          const floor = state.floors.find((item) => item.id === key);
          if (!floor) return 'Unknown floor';
          const building = state.buildings.find((item) => item.id === floor.buildingId);
          return `${building?.code ?? '—'} · ${floor.name}`;
        },
      ).slice(0, 8),
    [requests, state],
  );

  const byDepartment = useMemo(
    () =>
      groupBy(
        requests,
        (request) => request.departmentId,
        (key) => state.departments.find((item) => item.id === key)?.name ?? 'Not yet assigned',
      ),
    [requests, state.departments],
  );

  const byCategory = useMemo(
    () =>
      groupBy(
        requests,
        (request) => request.category,
        (key) => CATEGORY_META[key]?.label ?? 'Other',
      ),
    [requests],
  );

  const slowest = useMemo(
    () =>
      requests
        .map((request) => ({ request, days: resolutionDays(request) }))
        .filter((item) => item.days !== null)
        .sort((a, b) => b.days - a.days)
        .slice(0, 5),
    [requests],
  );

  const trend = useMemo(() => monthlyTrend(requests, 6), [requests]);
  const awaiting = requests.filter((request) => request.status === STATUS.AWAITING_VERIFICATION).length;

  return (
    <>
      <PageHeader
        title="Reports and analytics"
        description="Every figure below is calculated from the demo records currently stored in this browser."
        breadcrumbs={[{ label: 'ClassFix', to: '/dashboard' }, { label: 'Reports & Analytics' }]}
      />

      <section className="cf-card mb-5 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Period">
            {({ id }) => (
              <Select
                id={id}
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                options={PERIODS}
              />
            )}
          </Field>
          <Field label="Building">
            {({ id }) => (
              <Select
                id={id}
                value={buildingId}
                onChange={(event) => {
                  setBuildingId(event.target.value);
                  setFloorId('');
                }}
                placeholder="All buildings"
                options={state.buildings.map((item) => ({ value: item.id, label: item.name }))}
              />
            )}
          </Field>
          <Field label="Floor">
            {({ id }) => (
              <Select
                id={id}
                value={floorId}
                disabled={!buildingId}
                onChange={(event) => setFloorId(event.target.value)}
                placeholder={buildingId ? 'All floors' : 'Select a building'}
                options={floors.map((item) => ({ value: item.id, label: item.name }))}
              />
            )}
          </Field>
          <Field label="Department">
            {({ id }) => (
              <Select
                id={id}
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                placeholder="All departments"
                options={state.departments.map((item) => ({ value: item.id, label: item.name }))}
              />
            )}
          </Field>
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {stats.total} request{stats.total === 1 ? '' : 's'} included in the figures below.
        </p>
      </section>

      <StatGrid columns={5}>
        <StatCard label="Total requests" value={stats.total} icon={ClipboardList} />
        <StatCard
          label="Closed"
          value={stats.closed}
          hint={`${awaiting} awaiting confirmation`}
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Still open"
          value={stats.pending + stats.inProgress}
          hint="Pending plus in progress"
          icon={Timer}
          tone="amber"
        />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="red" />
        <StatCard
          label="Resolution rate"
          value={formatPercent(stats.resolutionRate)}
          hint={
            stats.averageResolutionDays === null
              ? 'No closed requests in this selection'
              : `Average ${stats.averageResolutionDays.toFixed(1)} days to close`
          }
          icon={Clock}
          tone="teal"
        />
      </StatGrid>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Status distribution" subtitle="Where the selected requests currently sit">
          <StackedBar data={statusBreakdown(requests)} />
        </ChartCard>

        <ChartCard title="Submitted vs closed by month" subtitle="Last six months">
          <GroupedColumns
            data={trend}
            seriesA={{ key: 'created', label: 'Submitted', className: 'bg-navy-700' }}
            seriesB={{ key: 'resolved', label: 'Closed', className: 'bg-teal-500' }}
          />
        </ChartCard>

        <ChartCard title="Most frequently reported problems">
          <BarList data={byCategory} tone="teal" />
        </ChartCard>

        <ChartCard title="Requests by building">
          <BarList data={byBuilding} />
        </ChartCard>

        <ChartCard title="Requests by floor" subtitle="Top eight floors by volume">
          <BarList data={byFloor} />
        </ChartCard>

        <ChartCard title="Requests by department">
          <BarList data={byDepartment} tone="teal" />
        </ChartCard>
      </div>

      <section className="cf-card mt-5">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-navy-900">Longest time to close</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Measured from submission to the closing entry in each request’s action history.
          </p>
        </header>
        {slowest.length ? (
          <ul className="divide-y divide-slate-100">
            {slowest.map(({ request, days }) => (
              <li key={request.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy-900">
                    {request.id} — {request.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {resolveLocation(state, request.roomId).path}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-slate-600">
                  {days} {days === 1 ? 'day' : 'days'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            No requests in this selection have been closed yet.
          </p>
        )}
      </section>

      <p className="mt-4 text-xs text-slate-500">
        These reports are illustrative. They are derived from the sample records in this browser, not
        from any real facility management system.
      </p>
    </>
  );
}
