import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, Megaphone } from 'lucide-react';
import { NOTIFICATION_TYPE_LIST, NOTIFICATION_TYPE_META } from '../constants/index.js';
import { useAppStore } from '../hooks/useAppStore.js';
import { cn, formatDateTime, formatRelative } from '../utils/format.js';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Select } from '../components/common/Field.jsx';

const TABS = [
  { id: 'inbox', label: 'Notifications' },
  { id: 'announcements', label: 'Announcements' },
];

export function NotificationsPage() {
  const { state, markNotificationRead, markAllNotificationsRead } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = TABS.some((item) => item.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'inbox';

  const [typeFilter, setTypeFilter] = useState('');
  const [readFilter, setReadFilter] = useState('');

  // The API returns only this account's notifications, newest first.
  const mine = useMemo(
    () => [...state.notifications].sort((a, b) => new Date(b.at) - new Date(a.at)),
    [state.notifications],
  );

  const unread = mine.filter((item) => !item.read);

  const visible = mine
    .filter((item) => (typeFilter ? item.type === typeFilter : true))
    .filter((item) => {
      if (readFilter === 'unread') return !item.read;
      if (readFilter === 'read') return item.read;
      return true;
    });

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates addressed to your account. Nothing is emailed or pushed in this version."
        breadcrumbs={[{ label: 'ClassFix', to: '/dashboard' }, { label: 'Notifications' }]}
        actions={
          tab === 'inbox' && unread.length > 0 ? (
            <button
              type="button"
              className="cf-btn-secondary"
              onClick={() => markAllNotificationsRead()}
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Mark all as read
            </button>
          ) : null
        }
      />

      <div className="mb-4 flex gap-1 border-b border-slate-200" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setSearchParams(item.id === 'inbox' ? {} : { tab: item.id })}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
              tab === item.id
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-navy-800',
            )}
          >
            {item.label}
            {item.id === 'inbox' && unread.length > 0 ? (
              <span className="ml-1.5 rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unread.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'inbox' ? (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="sm:w-56">
              <label htmlFor="notification-type" className="sr-only">
                Filter by type
              </label>
              <Select
                id="notification-type"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                placeholder="All types"
                options={NOTIFICATION_TYPE_LIST.map((item) => ({
                  value: item.id,
                  label: item.label,
                }))}
              />
            </div>
            <div className="sm:w-44">
              <label htmlFor="notification-read" className="sr-only">
                Filter by read state
              </label>
              <Select
                id="notification-read"
                value={readFilter}
                onChange={(event) => setReadFilter(event.target.value)}
                placeholder="Read and unread"
                options={[
                  { value: 'unread', label: 'Unread only' },
                  { value: 'read', label: 'Read only' },
                ]}
              />
            </div>
            <p className="text-xs text-slate-500 sm:ml-auto">
              {visible.length} of {mine.length} shown
            </p>
          </div>

          {visible.length === 0 ? (
            <div className="cf-card">
              <EmptyState
                icon={BellOff}
                title={mine.length === 0 ? 'No notifications yet' : 'Nothing matches these filters'}
                message={
                  mine.length === 0
                    ? 'Updates appear here as requests move through the workflow.'
                    : 'Try showing all types, or include read notifications.'
                }
              />
            </div>
          ) : (
            <ul className="space-y-2">
              {visible.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    'cf-card flex gap-3 p-4',
                    !item.read && 'border-l-4 border-l-teal-600',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      item.read ? 'bg-slate-100 text-slate-500' : 'bg-teal-50 text-teal-700',
                    )}
                  >
                    <Bell className="h-4 w-4" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          'text-sm',
                          item.read ? 'text-navy-800' : 'font-semibold text-navy-900',
                        )}
                      >
                        {item.title}
                      </p>
                      <Badge tone={item.read ? 'slate' : 'teal'}>
                        {NOTIFICATION_TYPE_META[item.type]?.label ?? 'Update'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      <time dateTime={item.at} title={formatDateTime(item.at)}>
                        {formatRelative(item.at)}
                      </time>
                    </p>

                    <div className="mt-2 flex flex-wrap gap-3">
                      {item.requestId ? (
                        <Link to={`/requests/${item.requestId}`} className="cf-link text-xs">
                          Open {item.requestId}
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => markNotificationRead(item.id, !item.read)}
                        className="text-xs font-medium text-slate-500 hover:text-navy-800 hover:underline"
                      >
                        Mark as {item.read ? 'unread' : 'read'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <ul className="space-y-3">
          {state.announcements.map((item) => (
            <li key={item.id} className="cf-card p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700">
                  <Megaphone className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-navy-900">{item.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {item.audience} · posted by {item.postedByName ?? 'the office'} ·{' '}
                    {formatRelative(item.at)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
