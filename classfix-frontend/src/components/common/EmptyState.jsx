import { Inbox } from 'lucide-react';

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold text-navy-900">{title}</p>
        {message ? <p className="mt-1 max-w-sm text-sm text-slate-600">{message}</p> : null}
      </div>
      {action}
    </div>
  );
}
