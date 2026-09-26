import type { CurrencyCode } from '../core';

const CANADIAN_ZONES = new Set([
  'America/Toronto',
  'America/Vancouver',
  'America/Montreal',
  'America/Edmonton',
  'America/Winnipeg',
  'America/Halifax',
  'America/St_Johns',
  'America/Regina',
]);

const EXACT: Record<string, CurrencyCode> = {
  'Asia/Taipei': 'TWD',
  'Asia/Tokyo': 'JPY',
  'Asia/Shanghai': 'CNY',
  'Asia/Hong_Kong': 'HKD',
  'Asia/Singapore': 'SGD',
  'Europe/London': 'GBP',
  'Europe/Zurich': 'CHF',
  'Pacific/Auckland': 'NZD',
  'Pacific/Honolulu': 'USD',
};

/**
 * A best guess at the currency where the device is, from its time zone —
 * good enough to preselect when adding an account abroad. Returns undefined
 * when there is no sensible guess.
 */
export function guessCurrencyFromTimeZone(timeZone: string | undefined): CurrencyCode | undefined {
  if (!timeZone) return undefined;
  if (EXACT[timeZone]) return EXACT[timeZone];
  if (CANADIAN_ZONES.has(timeZone)) return 'CAD';
  if (timeZone.startsWith('Australia/')) return 'AUD';
  if (timeZone.startsWith('Europe/')) return 'EUR';
  if (timeZone.startsWith('America/')) return 'USD';
  return undefined;
}

export function guessLocalCurrency(): CurrencyCode | undefined {
  try {
    return guessCurrencyFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return undefined;
  }
}
