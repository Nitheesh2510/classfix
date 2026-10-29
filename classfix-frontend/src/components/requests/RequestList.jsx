import { Link } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import { CATEGORY_META } from '../../constants/index.js';
import { useAppStore } from '../../hooks/useAppStore.js';
import { resolveLocation } from '../../services/locationService.js';
import { isOverdue } from '../../services/requestService.js';
import { formatDate, formatRelative } from '../../utils/format.js';
import { OverdueBadge, PriorityBadge, StatusBadge } from '../common/Badge.jsx';
import { EmptyState } from '../common/EmptyState.jsx';
import { RequestCard } from './RequestCard.jsx';

/**
 * Responsive request list: a table from the `lg` breakpoint up, stacked cards
 * below it. Both views render the same data.
 */
export function RequestList({ requests, emptyTitle, emptyMessage, emptyAction, footer }) {
  const { state } = useAppStore();

  if (!requests.length) {
    return (
      <div className="cf-card">
        <EmptyState
          icon={FileSearch}
          title={emptyTitle ?? 'No requests found'}
          message={emptyMessage ?? 'Try widening your filters or clearing the search box.'}
          action={emptyAction}
        />
      </div>
    );
  }

  const rows = requests.map((request) => ({
    request,
    location: resolveLocation(state, request.roomId),
  }));

  return (
    <>
      {/* Table view */}
      <div className="hidden overflow-hidden lg:block">
        <div className="cf-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Facility requests</caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-2.5 font-semibold">ID</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Request</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Location</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Priority</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ request, location }) => (
                  <tr key={request.id} className="align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        to={`/requests/${request.id}`}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        {request.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/requests/${request.id}`} className="font-medium text-navy-900 hover:underline">
                        {request.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {CATEGORY_META[request.category]?.label ?? 'Other'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{location.buildingName}</p>
                      <p className="text-xs text-slate-500">
                        {location.floorName} · {location.roomLabel}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={request.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={request.status} short />
                        {isOverdue(request) ? <OverdueBadge /> : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      <p>{formatDate(request.createdAt)}</p>
                      <p className="text-xs text-slate-500">
                        Updated {formatRelative(request.updatedAt)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {footer}
        </div>
      </div>

      {/* Card view */}
      <div className="space-y-3 lg:hidden">
        {rows.map(({ request, location }) => (
          <RequestCard key={request.id} request={request} location={location} />
        ))}
        {footer ? <div className="cf-card">{footer}</div> : null}
      </div>
    </>
  );
}
