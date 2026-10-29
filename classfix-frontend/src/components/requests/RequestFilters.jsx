import { useMemo } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import {
  CATEGORY_LIST,
  PRIORITY_LIST,
  STATUS_LIST,
} from '../../constants/index.js';
import { useAppStore } from '../../hooks/useAppStore.js';
import { getFloorsForBuilding, getRoomsForFloor, roomLabel } from '../../services/locationService.js';
import { SORT_OPTIONS, countActiveFilters } from '../../services/requestService.js';
import { Field, Select, TextInput } from '../common/Field.jsx';

/** Search, location, attribute and date filters for the request list. */
export function RequestFilters({ filters, onChange, onReset, resultCount, open, onToggle }) {
  const { state } = useAppStore();

  const floors = useMemo(
    () => getFloorsForBuilding(state, filters.buildingId),
    [state, filters.buildingId],
  );
  const rooms = useMemo(() => getRoomsForFloor(state, filters.floorId), [state, filters.floorId]);

  const activeCount = countActiveFilters(filters);

  const set = (patch) => onChange({ ...filters, ...patch });

  return (
    <section className="cf-card mb-4">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="request-search" className="sr-only">
            Search by request ID, title or room number
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <TextInput
            id="request-search"
            type="search"
            className="pl-9"
            placeholder="Search by request ID, title or room number"
            value={filters.search}
            onChange={(event) => set({ search: event.target.value })}
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="request-sort" className="sr-only">
            Sort requests
          </label>
          <Select
            id="request-sort"
            className="w-auto py-2 text-sm"
            value={filters.sort}
            onChange={(event) => set({ sort: event.target.value })}
            options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />

          <button
            type="button"
            onClick={onToggle}
            className="cf-btn-secondary whitespace-nowrap"
            aria-expanded={open}
            aria-controls="request-filter-panel"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {activeCount > 0 ? (
              <span className="rounded-full bg-teal-600 px-1.5 text-[10px] font-semibold text-white">
                {activeCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {open ? (
        <div id="request-filter-panel" className="border-t border-slate-200 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Building">
              {({ id }) => (
                <Select
                  id={id}
                  value={filters.buildingId}
                  onChange={(event) =>
                    set({ buildingId: event.target.value, floorId: '', roomId: '' })
                  }
                  placeholder="All buildings"
                  options={state.buildings.map((item) => ({ value: item.id, label: item.name }))}
                />
              )}
            </Field>

            <Field label="Floor">
              {({ id }) => (
                <Select
                  id={id}
                  value={filters.floorId}
                  disabled={!filters.buildingId}
                  onChange={(event) => set({ floorId: event.target.value, roomId: '' })}
                  placeholder={filters.buildingId ? 'All floors' : 'Select a building'}
                  options={floors.map((item) => ({ value: item.id, label: item.name }))}
                />
              )}
            </Field>

            <Field label="Room">
              {({ id }) => (
                <Select
                  id={id}
                  value={filters.roomId}
                  disabled={!filters.floorId}
                  onChange={(event) => set({ roomId: event.target.value })}
                  placeholder={filters.floorId ? 'All rooms' : 'Select a floor'}
                  options={rooms.map((item) => ({ value: item.id, label: roomLabel(item) }))}
                />
              )}
            </Field>

            <Field label="Category">
              {({ id }) => (
                <Select
                  id={id}
                  value={filters.category}
                  onChange={(event) => set({ category: event.target.value })}
                  placeholder="All categories"
                  options={CATEGORY_LIST.map((item) => ({ value: item.id, label: item.label }))}
                />
              )}
            </Field>

            <Field label="Priority">
              {({ id }) => (
                <Select
                  id={id}
                  value={filters.priority}
                  onChange={(event) => set({ priority: event.target.value })}
                  placeholder="All priorities"
                  options={PRIORITY_LIST.map((item) => ({ value: item.id, label: item.label }))}
                />
              )}
            </Field>

            <Field label="Status">
              {({ id }) => (
                <Select
                  id={id}
                  value={filters.status}
                  onChange={(event) => set({ status: event.target.value })}
                  placeholder="All statuses"
                  options={[
                    { value: 'overdue', label: 'Overdue (any open status)' },
                    ...STATUS_LIST.map((item) => ({
                      value: item.id,
                      label: item.shortLabel ?? item.label,
                    })),
                  ]}
                />
              )}
            </Field>

            <Field label="Department">
              {({ id }) => (
                <Select
                  id={id}
                  value={filters.departmentId}
                  onChange={(event) => set({ departmentId: event.target.value })}
                  placeholder="All departments"
                  options={state.departments.map((item) => ({ value: item.id, label: item.name }))}
                />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Submitted from">
                {({ id }) => (
                  <TextInput
                    id={id}
                    type="date"
                    value={filters.from}
                    max={filters.to || undefined}
                    onChange={(event) => set({ from: event.target.value })}
                  />
                )}
              </Field>
              <Field label="to">
                {({ id }) => (
                  <TextInput
                    id={id}
                    type="date"
                    value={filters.to}
                    min={filters.from || undefined}
                    onChange={(event) => set({ to: event.target.value })}
                  />
                )}
              </Field>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">
              {resultCount} {resultCount === 1 ? 'request matches' : 'requests match'} the current
              filters.
            </p>
            <button
              type="button"
              onClick={onReset}
              className="cf-btn-ghost text-xs"
              disabled={activeCount === 0}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Reset filters
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
