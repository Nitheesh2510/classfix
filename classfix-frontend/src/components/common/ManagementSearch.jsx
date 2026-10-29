import { Search } from 'lucide-react';
import { pluralize } from '../../utils/format.js';

/** Search box plus result count, shared by the record management pages. */
export function ManagementSearch({ value, onChange, placeholder, count, noun, children }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <label htmlFor="record-search" className="sr-only">
          {placeholder}
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id="record-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="cf-input pl-9"
        />
      </div>
      {children}
      <p className="shrink-0 text-xs text-slate-500">{pluralize(count, noun)}</p>
    </div>
  );
}
