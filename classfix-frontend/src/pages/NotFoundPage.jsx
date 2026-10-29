import { Link, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="cf-card max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Compass className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-semibold text-navy-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          Nothing is routed to{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{location.pathname}</code>. It
          may have been mistyped, or the link may be out of date.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to="/dashboard" className="cf-btn-primary">
            Go to dashboard
          </Link>
          <Link to="/requests" className="cf-btn-secondary">
            Browse requests
          </Link>
        </div>
      </div>
    </div>
  );
}
