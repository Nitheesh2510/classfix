import { PRIORITY_META, STATUS_META } from '../../constants/index.js';
import { cn } from '../../utils/format.js';

const TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  teal: 'bg-teal-50 text-teal-800 ring-teal-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  orange: 'bg-orange-50 text-orange-800 ring-orange-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  navy: 'bg-navy-50 text-navy-800 ring-navy-200',
};

export function Badge({ tone = 'slate', children, className, title }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone] ?? TONES.slate,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, short = false, className }) {
  const meta = STATUS_META[status];
  if (!meta) return <Badge tone="slate" className={className}>Unknown</Badge>;
  return (
    <Badge tone={meta.tone} className={className} title={meta.label}>
      {short ? (meta.shortLabel ?? meta.label) : meta.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return <Badge tone="slate" className={className}>—</Badge>;
  return (
    <Badge tone={meta.tone} className={className}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </Badge>
  );
}

export function OverdueBadge({ className }) {
  return (
    <Badge tone="red" className={className}>
      Overdue
    </Badge>
  );
}
