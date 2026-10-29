/** Small formatting helpers shared across pages. */

export function cn(...values) {
  return values.filter(Boolean).join(' ');
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, fallback = '—') {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : fallback;
}

export function formatDateTime(value, fallback = '—') {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : fallback;
}

/** "3 days ago" / "in 2 days" — coarse but readable. */
export function formatRelative(value, fallback = '—') {
  const date = toDate(value);
  if (!date) return fallback;

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const abs = Math.abs(diffMinutes);

  if (abs < 1) return 'just now';
  if (abs < 60) return relativePhrase(diffMinutes, 'minute');
  if (abs < 60 * 24) return relativePhrase(Math.round(diffMinutes / 60), 'hour');
  if (abs < 60 * 24 * 30) return relativePhrase(Math.round(diffMinutes / (60 * 24)), 'day');
  return relativePhrase(Math.round(diffMinutes / (60 * 24 * 30)), 'month');
}

function relativePhrase(value, unit) {
  const plural = Math.abs(value) === 1 ? unit : `${unit}s`;
  return value < 0 ? `${Math.abs(value)} ${plural} ago` : `in ${value} ${plural}`;
}

/** Whole days between two dates (b − a), rounded down. */
export function daysBetween(a, b) {
  const start = toDate(a);
  const end = toDate(b);
  if (!start || !end) return null;
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

/** `YYYY-MM-DD` for date inputs. */
export function toDateInputValue(value) {
  const date = toDate(value);
  if (!date) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-GB').format(value ?? 0);
}

export function formatPercent(value, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

export function initialsOf(name) {
  if (!name) return '?';
  return name
    .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function truncate(text, max = 120) {
  if (!text || text.length <= max) return text ?? '';
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
