import { isDateKey } from './dates';
import { LedgerError } from './errors';
import { isCurrencyCode, type CurrencyCode } from './money';

const MAX_NAME_LENGTH = 100;
const MAX_TEXT_LENGTH = 1000;

export function requireName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name === '' || name.length > MAX_NAME_LENGTH) {
    throw new LedgerError('INVALID_NAME', `Name must be 1–${MAX_NAME_LENGTH} characters`);
  }
  return name;
}

/** Trims free text; empty becomes undefined so it is not stored. */
export function optionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new LedgerError('INVALID_NAME', 'Expected text');
  const text = value.trim();
  if (text.length > MAX_TEXT_LENGTH) {
    throw new LedgerError('INVALID_NAME', `Text must be at most ${MAX_TEXT_LENGTH} characters`);
  }
  return text === '' ? undefined : text;
}

/** Any whole number of minor units, e.g. an opening balance that may be negative. */
export function requireMinor(value: unknown): number {
  if (!Number.isSafeInteger(value)) {
    throw new LedgerError('INVALID_AMOUNT', `Amount must be a whole number of minor units, got ${String(value)}`);
  }
  return (value as number) === 0 ? 0 : (value as number);
}

/** A strictly positive whole number of minor units. */
export function requirePositiveMinor(value: unknown): number {
  const amount = requireMinor(value);
  if (amount <= 0) throw new LedgerError('INVALID_AMOUNT', 'Amount must be greater than zero');
  return amount;
}

/** Highest foreign transaction fee accepted: 10%. */
export const MAX_FEE_BPS = 1000;

/** A fee rate in basis points (150 = 1.5%), 0–10%. */
export function requireFeeBps(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > MAX_FEE_BPS) {
    throw new LedgerError('INVALID_FEE', `Fee rate must be 0–${MAX_FEE_BPS} basis points, got ${String(value)}`);
  }
  return value as number;
}

export function requireDate(value: unknown): string {
  if (!isDateKey(value)) {
    throw new LedgerError('INVALID_DATE', `Expected a YYYY-MM-DD date, got ${String(value)}`);
  }
  return value;
}

export function requireCurrency(value: unknown): CurrencyCode {
  if (!isCurrencyCode(value)) {
    throw new LedgerError('INVALID_CURRENCY', `Unsupported currency ${String(value)}`);
  }
  return value;
}

export function requireOneOf<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new LedgerError('INVALID_KIND', `Expected one of ${allowed.join(', ')}, got ${String(value)}`);
  }
  return value as T;
}
