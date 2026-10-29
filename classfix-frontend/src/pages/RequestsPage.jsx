import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FilePlus2, X } from 'lucide-react';
import {
  CATEGORY_META,
  PRIORITY_META,
  ROLES,
  STATUS_META,
} from '../constants/index.js';
import { useAppStore } from '../hooks/useAppStore.js';
import { resolveLocation } from '../services/locationService.js';
import {
  EMPTY_FILTERS,
  filterRequests,
  hasActiveFilters,
  visibleRequests,
} from '../services/requestService.js';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { Pagination } from '../components/common/Pagination.jsx';
import { RequestFilters } from '../components/requests/RequestFilters.jsx';
import { RequestList } from '../components/requests/RequestList.jsx';

const PAGE_SIZE = 8;

/** Reads the filter state that the URL carries (used by dashboard shortcuts). */
function filtersFromParams(params) {
  const next = { ...EMPTY_FILTERS };
  Object.keys(EMPTY_FILTERS).forEach((key) => {
    const value = params.get(key);
    if (value) next[key] = value;
  });
  return next;
}

export function RequestsPage() {
  const { state, role } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState(() => filtersFromParams(searchParams));
  const [panelOpen, setPanelOpen] = useState(() => hasActiveFilters(filtersFromParams(searchParams)));
  const [page, setPage] = useState(1);

  /* Keep the URL in step with the filters so views can be shared and the
     browser back button behaves sensibly. */
  useEffect(() => {
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && !(key === 'sort' && value === 'newest')) params[key] = value;
    });
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  /* Changing a filter always returns to the first page of results. */
  const updateFilters = (next) => {
    setFilters(next);
    setPage(1);
  };

  const resetFilters = () => updateFilters({ ...EMPTY_FILTERS, sort: filters.sort });

  const scoped = useMemo(() => visibleRequests(state), [state]);
  const results = useMemo(() => filterRequests(state, scoped, filters), [state, scoped, filters]);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const chips = buildChips(state, filters);

  return (
    <>
      <PageHeader
        title="All facility requests"
        description={
          role === ROLES.STUDENT
            ? 'Requests reported from your account, with their current status.'
            : 'Every request in the demo data, filtered however you need.'
        }
        breadcrumbs={[{ label: 'ClassFix', to: '/dashboard' }, { label: 'Requests' }]}
        actions={
          role === ROLES.STUDENT ? (
            <Link to="/requests/new" className="cf-btn-primary">
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              New request
            </Link>
          ) : null
        }
      />

      <RequestFilters
        filters={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        resultCount={results.length}
        open={panelOpen}
        onToggle={() => setPanelOpen((value) => !value)}
      />

      {chips.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Active filters:</span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => updateFilters({ ...filters, [chip.key]: '' })}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-navy-800 hover:border-red-300 hover:bg-red-50"
            >
              <span className="text-slate-500">{chip.label}:</span> {chip.value}
              <X className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">Remove this filter</span>
            </button>
          ))}
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-medium text-teal-700 hover:underline"
          >
            Clear all
          </button>
        </div>
      ) : null}

      <RequestList
        requests={visible}
        emptyTitle={hasActiveFilters(filters) ? 'No matching requests' : 'No requests yet'}
        emptyMessage={
          hasActiveFilters(filters)
            ? 'No request matches every filter you have applied. Try removing one of them.'
            : 'Once requests are submitted they will be listed here.'
        }
        emptyAction={
          hasActiveFilters(filters) ? (
            <button
              type="button"
              className="cf-btn-secondary"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          ) : null
        }
        footer={
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={results.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        }
      />
    </>
  );
}

function buildChips(state, filters) {
  const chips = [];
  const push = (key, label, value) => {
    if (value) chips.push({ key, label, value });
  };

  push('search', 'Search', filters.search);
  push('buildingId', 'Building', state.buildings.find((b) => b.id === filters.buildingId)?.name);
  push('floorId', 'Floor', state.floors.find((f) => f.id === filters.floorId)?.name);
  push(
    'roomId',
    'Room',
    filters.roomId ? resolveLocation(state, filters.roomId).roomLabel : '',
  );
  push('category', 'Category', CATEGORY_META[filters.category]?.label);
  push('priority', 'Priority', PRIORITY_META[filters.priority]?.label);
  push(
    'status',
    'Status',
    filters.status === 'overdue'
      ? 'Overdue'
      : (STATUS_META[filters.status]?.shortLabel ?? STATUS_META[filters.status]?.label),
  );
  push(
    'departmentId',
    'Department',
    state.departments.find((d) => d.id === filters.departmentId)?.name,
  );
  push('from', 'From', filters.from);
  push('to', 'To', filters.to);

  return chips;
}
