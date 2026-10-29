import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, X, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '../../utils/format.js';
import { ToastContext } from './toastContext.js';

const TONE_STYLES = {
  success: { icon: CheckCircle2, bar: 'bg-teal-600', iconClass: 'text-teal-700' },
  error: { icon: XCircle, bar: 'bg-red-600', iconClass: 'text-red-600' },
  warning: { icon: AlertTriangle, bar: 'bg-amber-500', iconClass: 'text-amber-600' },
  info: { icon: Info, bar: 'bg-navy-700', iconClass: 'text-navy-700' },
};

const DISMISS_AFTER = 4500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message, tone = 'success') => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      setToasts((current) => [...current, { id, message, tone }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DISMISS_AFTER),
      );
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      toast: push,
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      warning: (message) => push(message, 'warning'),
      info: (message) => push(message, 'info'),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const tone = TONE_STYLES[toast.tone] ?? TONE_STYLES.info;
          const Icon = tone.icon;
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel"
            >
              <span className={cn('w-1 shrink-0', tone.bar)} aria-hidden="true" />
              <div className="flex flex-1 items-start gap-3 p-3">
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tone.iconClass)} aria-hidden="true" />
                <p className="flex-1 text-sm text-navy-800">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy-700"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
