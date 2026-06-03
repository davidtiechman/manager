// Detail-drawer formatters.

// Epoch/ISO → he-IL date-time.
export function formatDate(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  const raw =
    typeof value === 'number' && value < 1_000_000_000_000 ? value * 1000 : value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
}

// Scalar → string (bool → Yes/No, obj → JSON, blank → —).
export function formatValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
