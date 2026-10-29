import {
  ACTIVE_STATUSES,
  PENDING_STATUSES,
  PRIORITY_META,
  STATUS,
  STATUS_META,
  TERMINAL_STATUSES,
} from '../constants/index.js';
import { resolveLocation } from './locationService.js';
import { daysBetween } from '../utils/format.js';

/**
 * Derivations and queries over requests. These are pure functions: the store
 * owns the state, these functions only read it or return new objects.
 */

export function getRequest(state, requestId) {
  return state.requests.find((request) => request.id === requestId) ?? null;
}

export function formatRequestNumber(number) {
  return `CF-${number}`;
}

/**
 * A request is overdue when work is still outstanding past its due date.
 * The API computes this too and sends it as `overdue`; that value is preferred
 * when present so the client and server never disagree.
 */
export function isOverdue(request) {
  if (typeof request?.overdue === 'boolean') return request.overdue;
  if (!request?.expectedCompletion) return false;
  if (TERMINAL_STATUSES.includes(request.status)) return false;
  if (request.status === STATUS.AWAITING_VERIFICATION) return false;
  return new Date(request.expectedCompletion).getTime() < Date.now();
}

export function isPending(request) {
  return PENDING_STATUSES.includes(request.status);
}

export function isActive(request) {
  return ACTIVE_STATUSES.includes(request.status);
}

/**
 * Days from submission to closure. Uses the `closedAt` field the API includes
 * on every request, so this works from a list response without loading each
 * request's full timeline.
 */
export function resolutionDays(request) {
  if (request.status !== STATUS.CLOSED || !request.closedAt) return null;
  const days = daysBetween(request.createdAt, request.closedAt);
  return days === null ? null : Math.max(days, 0);
}

/**
 * Requests the signed-in user may see.
 *
 * The API already scopes rows by role in SQL, so whatever is loaded is
 * already permitted; this stays as the single place that decision is read
 * from, rather than each page filtering for itself.
 */
export function visibleRequests(state) {
  return state.requests;
}

/* ------------------------------------------------------------- filtering */

export const EMPTY_FILTERS = {
  search: '',
  buildingId: '',
  floorId: '',
  roomId: '',
  category: '',
  priority: '',
  status: '',
  departmentId: '',
  from: '',
  to: '',
  sort: 'newest',
};

export function hasActiveFilters(filters) {
  return Object.entries(filters).some(([key, value]) => key !== 'sort' && value !== '');
}

export function countActiveFilters(filters) {
  return Object.entries(filters).filter(([key, value]) => key !== 'sort' && value !== '').length;
}

const SORTERS = {
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  priority: (a, b) => {
    const diff = (PRIORITY_META[b.priority]?.rank ?? 0) - (PRIORITY_META[a.priority]?.rank ?? 0);
    return diff !== 0 ? diff : new Date(b.createdAt) - new Date(a.createdAt);
  },
  updated: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'priority', label: 'Priority (high to low)' },
  { value: 'updated', label: 'Recently updated' },
];

/** Applies search, location, attribute, date filters and sorting. */
export function filterRequests(state, requests, filters) {
  const search = filters.search.trim().toLowerCase();
  const fromTime = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : null;
  const toTime = filters.to ? new Date(`${filters.to}T23:59:59`).getTime() : null;

  const result = requests.filter((request) => {
    // The API sends a resolved location with each request; fall back to
    // resolving it locally if an older shape turns up.
    const location = request.location ?? resolveLocation(state, request.roomId);
    const buildingId = location.buildingId ?? location.building?.id;
    const floorId = location.floorId ?? location.floor?.id;

    if (search) {
      const haystack = [request.id, request.title, location.roomNumber, location.buildingName]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (filters.buildingId && buildingId !== filters.buildingId) return false;
    if (filters.floorId && floorId !== filters.floorId) return false;
    if (filters.roomId && request.roomId !== filters.roomId) return false;
    if (filters.category && request.category !== filters.category) return false;
    if (filters.priority && request.priority !== filters.priority) return false;
    if (filters.departmentId && request.departmentId !== filters.departmentId) return false;

    if (filters.status) {
      if (filters.status === 'overdue') {
        if (!isOverdue(request)) return false;
      } else if (request.status !== filters.status) {
        return false;
      }
    }

    const created = new Date(request.createdAt).getTime();
    if (fromTime !== null && created < fromTime) return false;
    if (toTime !== null && created > toTime) return false;

    return true;
  });

  return result.sort(SORTERS[filters.sort] ?? SORTERS.newest);
}

/* ------------------------------------------------------------ statistics */

export function summarize(requests) {
  const total = requests.length;
  const pending = requests.filter(isPending).length;
  const inProgress = requests.filter(isActive).length;
  const awaiting = requests.filter((r) => r.status === STATUS.AWAITING_VERIFICATION).length;
  const closed = requests.filter((r) => r.status === STATUS.CLOSED).length;
  const overdue = requests.filter(isOverdue).length;
  const rejected = requests.filter((r) => r.status === STATUS.REJECTED).length;
  const duplicate = requests.filter((r) => r.status === STATUS.DUPLICATE).length;

  const resolutionTimes = requests.map(resolutionDays).filter((days) => days !== null);
  const averageResolutionDays = resolutionTimes.length
    ? resolutionTimes.reduce((sum, days) => sum + days, 0) / resolutionTimes.length
    : null;

  return {
    total,
    pending,
    inProgress,
    awaiting,
    closed,
    overdue,
    rejected,
    duplicate,
    resolved: closed + awaiting,
    resolutionRate: total ? (closed / total) * 100 : 0,
    averageResolutionDays,
  };
}

/** Counts per status, keeping the pipeline order and dropping empty buckets. */
export function statusBreakdown(requests) {
  const counts = new Map();
  requests.forEach((request) => {
    counts.set(request.status, (counts.get(request.status) ?? 0) + 1);
  });

  return Object.values(STATUS_META)
    .filter((meta) => counts.has(meta.id))
    .map((meta) => ({
      key: meta.id,
      label: meta.shortLabel ?? meta.label,
      tone: meta.tone,
      value: counts.get(meta.id),
    }));
}

export function groupBy(requests, keyFn, labelFn) {
  const counts = new Map();
  requests.forEach((request) => {
    const key = keyFn(request);
    if (key === null || key === undefined) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([key, value]) => ({ key, label: labelFn(key), value }))
    .sort((a, b) => b.value - a.value);
}

/** Request and resolution counts for the last `months` calendar months. */
export function monthlyTrend(requests, months = 6) {
  const buckets = [];
  const now = new Date();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString('en-GB', { month: 'short' }),
      created: 0,
      resolved: 0,
    });
  }

  const index = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const keyOf = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${date.getMonth()}`;
  };

  requests.forEach((request) => {
    const createdBucket = index.get(keyOf(request.createdAt));
    if (createdBucket) createdBucket.created += 1;

    if (request.closedAt) {
      const resolvedBucket = index.get(keyOf(request.closedAt));
      if (resolvedBucket) resolvedBucket.resolved += 1;
    }
  });

  return buckets;
}

