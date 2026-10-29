import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowBigUp,
  ArrowLeft,
  CalendarClock,
  FileSearch,
  ImageIcon,
  MapPin,
  Paperclip,
} from 'lucide-react';
import {
  CATEGORY_META,
  ROLES,
  STATUS,
  STATUS_META,
  STATUS_PIPELINE,
  TERMINAL_STATUSES,
} from '../constants/index.js';
import { useAppStore } from '../hooks/useAppStore.js';
import { ApiError, api } from '../services/api.js';
import { cn, formatDate, formatDateTime, formatRelative, initialsOf } from '../utils/format.js';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { OverdueBadge, PriorityBadge, StatusBadge } from '../components/common/Badge.jsx';
import { AuthImage } from '../components/common/AuthImage.jsx';
import { TextArea } from '../components/common/Field.jsx';
import { Timeline } from '../components/requests/Timeline.jsx';
import { ActionPanel } from '../components/requests/ActionPanel.jsx';

export function RequestDetailsPage() {
  const { requestId } = useParams();
  const { user, role, addComment, toggleUpvote } = useAppStore();

  const [request, setRequest] = useState(null);
  const [actions, setActions] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  // Bumped to re-fetch after an action, a comment or a vote.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  /**
   * Loads the request. The detail endpoint also returns the workflow actions
   * this user is actually allowed to take, which drives the action panel.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await api.request(requestId);
        if (cancelled) return;
        setRequest(data.request);
        setActions(data.availableActions ?? []);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof ApiError ? error : new ApiError(0, 'Could not load that request.'),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestId, reloadKey]);

  const submitComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    const updated = await addComment(requestId, comment);
    setPosting(false);
    if (updated) {
      setComment('');
      reload();
    }
  };

  const handleUpvote = async () => {
    const updated = await toggleUpvote(requestId);
    if (updated) reload();
  };

  const breadcrumbs = [
    { label: 'ClassFix', to: '/dashboard' },
    { label: 'Requests', to: '/requests' },
    { label: requestId ?? 'Unknown' },
  ];

  if (loading && !request) {
    return (
      <>
        <PageHeader title={requestId ?? 'Request'} breadcrumbs={breadcrumbs} />
        <div className="cf-card p-8 text-center text-sm text-slate-500">Loading request…</div>
      </>
    );
  }

  if (loadError || !request) {
    const isForbidden = loadError?.status === 403;
    return (
      <>
        <PageHeader title={isForbidden ? 'Not available' : 'Request not found'} breadcrumbs={breadcrumbs} />
        <div className="cf-card">
          <EmptyState
            icon={FileSearch}
            title={
              isForbidden
                ? 'You do not have access to this request'
                : `No request with the ID ${requestId}`
            }
            message={
              isForbidden
                ? 'Students can only open requests they reported themselves.'
                : (loadError?.message ?? 'It may have been removed.')
            }
            action={
              <Link to="/requests" className="cf-btn-primary">
                Back to all requests
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const { location } = request;
  const hasUpvoted = user ? request.upvotes.includes(user.id) : false;

  return (
    <>
      <PageHeader
        title={request.title}
        breadcrumbs={breadcrumbs}
        description={`${request.id} · reported ${formatRelative(request.createdAt)} by ${
          request.reporter?.name ?? 'an unknown user'
        }`}
        actions={
          <Link to="/requests" className="cf-btn-secondary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All requests
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="cf-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
              {request.overdue ? <OverdueBadge /> : null}
              <span className="text-xs text-slate-500">
                {CATEGORY_META[request.category]?.label ?? 'Other'}
              </span>
            </div>

            <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-700">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <span>{location?.path ?? 'Unknown location'}</span>
            </p>

            <h2 className="mt-4 text-sm font-semibold text-navy-900">Issue summary</h2>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{request.description}</p>

            <StatusProgress status={request.status} />

            {request.photos?.length > 0 ? (
              <div className="mt-5">
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-navy-900">
                  <ImageIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  Reported photos
                </h2>
                <div className="flex flex-wrap gap-3">
                  {request.photos.map((photo) => (
                    <figure key={photo.id} className="w-40">
                      <AuthImage
                        requestId={request.id}
                        attachmentId={photo.id}
                        alt={photo.name}
                        className="h-28 w-40 rounded-lg border border-slate-200 object-cover"
                      />
                      <figcaption className="mt-1 truncate text-xs text-slate-500">
                        {photo.name}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ) : null}

            {request.evidence?.length > 0 ? (
              <div className="mt-5">
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-navy-900">
                  <Paperclip className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  Resolution evidence
                </h2>
                <ul className="space-y-2">
                  {request.evidence.map((item) => (
                    <li key={item.id} className="rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-sm font-medium text-navy-900">{item.label}</p>
                      {item.note ? <p className="text-sm text-slate-600">{item.note}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="cf-card p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-navy-900">Action timeline</h2>
            <Timeline entries={request.timeline} />
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              History is append-only. The database rejects any attempt to edit or delete an entry,
              so the record of who did what cannot be rewritten.
            </p>
          </section>

          <section className="cf-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-navy-900">
              Comments{' '}
              <span className="font-normal text-slate-500">({request.comments?.length ?? 0})</span>
            </h2>

            {request.comments?.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {request.comments.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-navy-700"
                      aria-hidden="true"
                    >
                      {initialsOf(item.authorName)}
                    </span>
                    <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500">
                        <span className="font-medium text-navy-800">{item.authorName}</span> ·{' '}
                        <time dateTime={item.at}>{formatDateTime(item.at)}</time>
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No comments yet.</p>
            )}

            <form onSubmit={submitComment} className="mt-4 border-t border-slate-100 pt-4">
              <label htmlFor="new-comment" className="cf-label">
                Add a comment
              </label>
              <TextArea
                id="new-comment"
                rows={3}
                value={comment}
                maxLength={1000}
                placeholder="Share an update or ask a question about this request."
                onChange={(event) => setComment(event.target.value)}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  className="cf-btn-primary"
                  disabled={!comment.trim() || posting}
                >
                  {posting ? 'Posting…' : 'Post comment'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="cf-card p-4">
            <h2 className="text-sm font-semibold text-navy-900">Actions available to you</h2>
            <p className="mb-3 mt-1 text-xs text-slate-500">
              The server decides this list from your role, the request&apos;s status and who owns
              it — and checks again when you submit.
            </p>
            <ActionPanel request={request} actions={actions} onApplied={reload} />
          </section>

          <section className="cf-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-navy-900">Request details</h2>
            <dl className="space-y-3 text-sm">
              <Detail label="Request ID" value={request.id} />
              <Detail
                label="Reported by"
                value={request.reporter?.name ?? 'Unknown'}
                sub={request.reporter?.className}
              />
              <Detail label="Submitted" value={formatDate(request.createdAt)} />
              <Detail label="Last updated" value={formatRelative(request.updatedAt)} />
              <Detail label="Department" value={request.department?.name ?? 'Not yet assigned'} />
              <Detail
                label="Assigned official"
                value={request.assignee?.name ?? 'Not yet assigned'}
                sub={request.assignee?.title}
              />
              <Detail
                label="Expected completion"
                value={request.expectedCompletion ? formatDate(request.expectedCompletion) : 'Not set'}
                sub={
                  request.expectedCompletion
                    ? request.overdue
                      ? 'Past due'
                      : `Due ${formatRelative(request.expectedCompletion)}`
                    : undefined
                }
                tone={request.overdue ? 'danger' : undefined}
              />
            </dl>
          </section>

          <section className="cf-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-navy-900">Support this request</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {request.upvotes.length}{' '}
                  {request.upvotes.length === 1 ? 'person has' : 'people have'} upvoted it.
                </p>
              </div>
              <button
                type="button"
                onClick={handleUpvote}
                aria-pressed={hasUpvoted}
                className={cn(
                  'flex flex-col items-center rounded-lg border px-3 py-1.5 text-xs font-medium',
                  hasUpvoted
                    ? 'border-teal-300 bg-teal-50 text-teal-800'
                    : 'border-slate-300 bg-white text-navy-800 hover:bg-slate-50',
                )}
              >
                <ArrowBigUp className="h-4 w-4" aria-hidden="true" />
                {hasUpvoted ? 'Upvoted' : 'Upvote'}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              One vote per account, enforced by the database.
            </p>
          </section>

          {role === ROLES.STUDENT && request.status === STATUS.AWAITING_VERIFICATION ? (
            <section className="cf-card border-teal-200 bg-teal-50/60 p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
                <CalendarClock className="h-4 w-4 text-teal-700" aria-hidden="true" />
                Has this actually been fixed?
              </h2>
              <p className="mt-1 text-sm text-slate-700">
                The department has marked the repair complete. Confirm it to close the request, or
                reopen it with a reason if the problem is still there.
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function Detail({ label, value, sub, tone }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={cn('font-medium text-navy-900', tone === 'danger' && 'text-red-700')}>
        {value}
      </dd>
      {sub ? <dd className="text-xs text-slate-500">{sub}</dd> : null}
    </div>
  );
}

/** Compact pipeline tracker for the happy path. */
function StatusProgress({ status }) {
  if (TERMINAL_STATUSES.includes(status) && status !== STATUS.CLOSED) {
    return (
      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        This request ended as “{STATUS_META[status]?.label}”, so it did not continue through the
        normal workflow.
      </p>
    );
  }

  const currentIndex = STATUS_PIPELINE.indexOf(status);

  return (
    <ol className="mt-5 flex flex-wrap gap-1.5" aria-label="Workflow progress">
      {STATUS_PIPELINE.map((step, index) => {
        const meta = STATUS_META[step];
        const reached = currentIndex >= 0 && index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li
            key={step}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset',
              isCurrent
                ? 'bg-navy-800 text-white ring-navy-800'
                : reached
                  ? 'bg-teal-50 text-teal-800 ring-teal-200'
                  : 'bg-white text-slate-400 ring-slate-200',
            )}
          >
            {meta?.shortLabel ?? meta?.label}
          </li>
        );
      })}
    </ol>
  );
}
