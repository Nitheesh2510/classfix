import { Link } from 'react-router-dom';
import { cn, formatNumber } from '../../utils/format.js';

const ACCENTS = {
  navy: 'bg-navy-50 text-navy-700',
  teal: 'bg-teal-50 text-teal-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  green: 'bg-emerald-50 text-emerald-700',
  slate: 'bg-slate-100 text-slate-600',
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'navy', to }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {Icon ? (
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', ACCENTS[tone])}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-navy-900">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="cf-card block p-4 transition-colors hover:border-teal-300 hover:bg-slate-50">
        {content}
      </Link>
    );
  }

  return <div className="cf-card p-4">{content}</div>;
}

export function StatGrid({ children, columns = 4 }) {
  const layouts = {
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-5',
  };
  return <div className={cn('grid grid-cols-1 gap-3', layouts[columns] ?? layouts[4])}>{children}</div>;
}
