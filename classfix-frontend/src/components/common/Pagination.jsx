import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/format.js';

export function Pagination({ page, pageCount, total, pageSize, onChange }) {
  if (pageCount <= 1) {
    return (
      <p className="px-4 py-3 text-xs text-slate-500">
        Showing all {total} {total === 1 ? 'request' : 'requests'}.
      </p>
    );
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const pages = pageNumbers(page, pageCount);

  return (
    <nav
      className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Pagination"
    >
      <p className="text-xs text-slate-500">
        Showing {first}–{last} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="cf-btn-secondary px-2 py-1.5"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {pages.map((item, index) =>
          item === '…' ? (
            <span key={`gap-${index}`} className="px-1.5 text-xs text-slate-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={cn(
                'min-w-8 rounded-lg px-2 py-1.5 text-sm font-medium',
                item === page
                  ? 'bg-navy-800 text-white'
                  : 'border border-slate-300 bg-white text-navy-800 hover:bg-slate-50',
              )}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          className="cf-btn-secondary px-2 py-1.5"
          onClick={() => onChange(page + 1)}
          disabled={page === pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

function pageNumbers(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < pageCount - 1) pages.push('…');
  pages.push(pageCount);

  return pages;
}
