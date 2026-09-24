/**
 * Bookkeeping dates are calendar days stored as "YYYY-MM-DD" strings. They
 * sort lexicographically, survive JSON round-trips and have no time zone.
 */
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** The local calendar day of `date`. */
export function toDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local midnight of a "YYYY-MM-DD" day, for display formatting. */
export function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) && isDateKey(`${value}-01`);
}

/** "2026-01" shifted by -1 → "2025-12" */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** "2026-09-24" → "2026-09" */
export function monthOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** Inclusive date range covering a "YYYY-MM" month. */
export function monthRange(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${month}-31` };
}
