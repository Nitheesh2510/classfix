import { useId } from 'react';
import { cn } from '../../utils/format.js';

/**
 * Labelled form control wrapper. Always renders a real <label for>, and wires
 * the error message to the control with aria-describedby.
 */
export function Field({ label, error, hint, required, htmlFor, children, className }) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;

  return (
    <div className={className}>
      <label className="cf-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="ml-0.5 text-red-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {typeof children === 'function'
        ? children({ id, describedBy: error ? `${id}-error` : hint ? `${id}-hint` : undefined })
        : children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ error, className, ...props }) {
  return <input className={cn('cf-input', error && 'cf-input-error', className)} {...props} />;
}

export function TextArea({ error, className, ...props }) {
  return <textarea className={cn('cf-input', error && 'cf-input-error', className)} {...props} />;
}

/** `options` is a list of { value, label, disabled? }. */
export function Select({ error, className, options = [], placeholder, children, ...props }) {
  return (
    <select className={cn('cf-input', error && 'cf-input-error', className)} {...props}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  );
}
