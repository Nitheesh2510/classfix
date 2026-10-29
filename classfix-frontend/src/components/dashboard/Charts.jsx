import { cn, formatNumber } from '../../utils/format.js';

/**
 * Lightweight charts built from plain HTML and SVG — no chart library, no
 * decoration. Each one carries readable labels and values so the numbers can
 * be checked against the request list.
 */

const TONE_BAR = {
  slate: 'bg-slate-400',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  teal: 'bg-teal-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  navy: 'bg-navy-700',
};

export function ChartCard({ title, subtitle, children, action }) {
  return (
    <section className="cf-card flex flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-navy-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}

/** Horizontal bars, one row per category. */
export function BarList({ data, emptyMessage = 'No data for the current selection.', tone = 'navy' }) {
  if (!data.length) {
    return <p className="py-6 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  const max = Math.max(...data.map((item) => item.value), 1);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ul className="space-y-3">
      {data.map((item) => {
        const percent = Math.round((item.value / max) * 100);
        const share = total ? Math.round((item.value / total) * 100) : 0;
        return (
          <li key={item.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-navy-800" title={item.label}>
                {item.label}
              </span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {formatNumber(item.value)}
                <span className="ml-1 text-xs text-slate-400">({share}%)</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full', TONE_BAR[item.tone ?? tone] ?? TONE_BAR.navy)}
                style={{ width: `${percent}%` }}
                role="img"
                aria-label={`${item.label}: ${item.value}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** One stacked bar plus a legend — used for status distribution. */
export function StackedBar({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (!total) {
    return <p className="py-6 text-center text-sm text-slate-500">No requests to summarise yet.</p>;
  }

  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={data.map((item) => `${item.label}: ${item.value}`).join(', ')}
      >
        {data.map((item) => (
          <div
            key={item.key}
            className={cn(TONE_BAR[item.tone] ?? TONE_BAR.navy)}
            style={{ width: `${(item.value / total) * 100}%` }}
            title={`${item.label}: ${item.value}`}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {data.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn('h-2.5 w-2.5 shrink-0 rounded-full', TONE_BAR[item.tone] ?? TONE_BAR.navy)}
                aria-hidden="true"
              />
              <span className="truncate text-navy-800">{item.label}</span>
            </span>
            <span className="tabular-nums text-slate-500">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Grouped columns comparing two series across months. */
export function GroupedColumns({ data, seriesA, seriesB }) {
  if (!data.length) {
    return <p className="py-6 text-center text-sm text-slate-500">No monthly data available.</p>;
  }

  const max = Math.max(...data.flatMap((item) => [item[seriesA.key], item[seriesB.key]]), 1);

  return (
    <div>
      <div className="flex items-end gap-2 sm:gap-4" style={{ height: '140px' }}>
        {data.map((item) => (
          <div key={item.key} className="flex h-full flex-1 flex-col justify-end gap-1">
            <div className="flex h-full items-end justify-center gap-1">
              <Column
                value={item[seriesA.key]}
                max={max}
                className={seriesA.className}
                label={`${seriesA.label} in ${item.label}: ${item[seriesA.key]}`}
              />
              <Column
                value={item[seriesB.key]}
                max={max}
                className={seriesB.className}
                label={`${seriesB.label} in ${item.label}: ${item[seriesB.key]}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-4">
        {data.map((item) => (
          <div key={item.key} className="flex-1 text-center text-xs text-slate-500">
            {item.label}
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
        {[seriesA, seriesB].map((series) => (
          <li key={series.key} className="flex items-center gap-2 text-xs text-slate-600">
            <span className={cn('h-2.5 w-2.5 rounded-sm', series.className)} aria-hidden="true" />
            {series.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Column({ value, max, className, label }) {
  const height = value === 0 ? 2 : Math.max((value / max) * 100, 4);
  return (
    <div
      className={cn('w-3 rounded-t sm:w-4', value === 0 ? 'bg-slate-200' : className)}
      style={{ height: `${height}%` }}
      role="img"
      aria-label={label}
      title={label}
    />
  );
}
