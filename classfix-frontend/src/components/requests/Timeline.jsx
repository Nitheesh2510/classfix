import { Link } from 'react-router-dom';
import { ROLE_META, STATUS_META } from '../../constants/index.js';
import { formatDateTime, formatRelative, initialsOf } from '../../utils/format.js';

/**
 * Chronological action history. Entries are append-only on the server, so this
 * list is the complete record of everything done to a request.
 *
 * Actor names come from the API, not a local user table.
 */
export function Timeline({ entries }) {
  if (!entries?.length) {
    return <p className="text-sm text-slate-500">No actions recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-6">
      {entries.map((entry) => {
        const statusMeta = entry.statusAfter ? STATUS_META[entry.statusAfter] : null;
        const roleLabel = ROLE_META[entry.actorRole]?.shortLabel;

        return (
          <li key={entry.id} className="relative">
            <span
              className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold text-navy-700"
              aria-hidden="true"
            >
              {initialsOf(entry.actorName)}
            </span>

            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="text-sm font-medium text-navy-900">{entry.action}</p>
              {statusMeta ? (
                <span className="text-xs text-slate-500">
                  → {statusMeta.shortLabel ?? statusMeta.label}
                </span>
              ) : null}
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              {entry.actorName ?? 'Unknown user'}
              {roleLabel ? ` · ${roleLabel}` : ''} ·{' '}
              <time dateTime={entry.at} title={formatDateTime(entry.at)}>
                {formatRelative(entry.at)}
              </time>
            </p>

            {entry.details ? (
              <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {entry.details}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Compact activity feed used on dashboards. */
export function ActivityFeed({ entries, emptyMessage = 'No recent activity.' }) {
  if (!entries?.length) {
    return <p className="px-4 py-6 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3 px-4 py-3">
          <span
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-navy-700"
            aria-hidden="true"
          >
            {initialsOf(entry.actorName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-navy-900">
              <span className="font-medium">{entry.action}</span>{' '}
              <span className="text-slate-500">on</span>{' '}
              <Link
                to={`/requests/${entry.requestId}`}
                className="font-medium text-teal-700 hover:underline"
              >
                {entry.requestId}
              </Link>
            </p>
            <p className="truncate text-xs text-slate-500" title={entry.requestTitle}>
              {entry.requestTitle}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {entry.actorName ?? 'Unknown user'} · {formatRelative(entry.at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
