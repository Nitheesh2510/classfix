import { Link } from 'react-router-dom';
import { ArrowBigUp, CalendarClock, MapPin, MessageSquare } from 'lucide-react';
import { CATEGORY_META } from '../../constants/index.js';
import { OverdueBadge, PriorityBadge, StatusBadge } from '../common/Badge.jsx';
import { isOverdue } from '../../services/requestService.js';
import { formatRelative, truncate } from '../../utils/format.js';

/** Mobile-friendly summary card for one request. */
export function RequestCard({ request, location }) {
  const overdue = isOverdue(request);

  return (
    <article className="cf-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/requests/${request.id}`}
            className="text-sm font-semibold text-navy-900 hover:text-teal-700 hover:underline"
          >
            {request.id}
          </Link>
          <h3 className="mt-0.5 text-sm font-medium text-navy-800">{request.title}</h3>
        </div>
        <StatusBadge status={request.status} short />
      </div>

      <p className="mt-2 text-sm text-slate-600">{truncate(request.description, 120)}</p>

      <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
        <div className="flex items-start gap-1.5">
          <dt className="sr-only">Location</dt>
          <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <dd>{location.path}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Submitted</dt>
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <dd>Submitted {formatRelative(request.createdAt)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <PriorityBadge priority={request.priority} />
        <span className="text-xs text-slate-500">
          {CATEGORY_META[request.category]?.label ?? 'Other'}
        </span>
        {overdue ? <OverdueBadge /> : null}
        <span className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1" title="Upvotes">
            <ArrowBigUp className="h-3.5 w-3.5" aria-hidden="true" />
            {request.upvotes.length}
          </span>
          <span className="flex items-center gap-1" title="Comments">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            {request.commentCount ?? request.comments?.length ?? 0}
          </span>
        </span>
      </div>
    </article>
  );
}
