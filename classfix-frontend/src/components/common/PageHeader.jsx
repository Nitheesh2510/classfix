import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Page title, breadcrumb trail and optional right-hand actions.
 * `breadcrumbs` is a list of { label, to? } — the last entry is the current page.
 */
export function PageHeader({ title, description, breadcrumbs = [], actions }) {
  return (
    <div className="mb-5">
      {breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  <li>
                    {crumb.to && !isLast ? (
                      <Link to={crumb.to} className="hover:text-navy-700 hover:underline">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={isLast ? 'font-medium text-navy-700' : undefined}>
                        {crumb.label}
                      </span>
                    )}
                  </li>
                  {!isLast ? (
                    <li aria-hidden="true">
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    </li>
                  ) : null}
                </Fragment>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-navy-900 sm:text-2xl">{title}</h1>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
