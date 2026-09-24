import {
  CURRENCY_CODES,
  isDateKey,
  saveExchangeRates,
  type CurrencyCode,
  type LedgerDB,
  type NewExchangeRate,
} from '../../core';
import { readPreference, writePreference } from '../../ui/preferences';

/**
 * Daily reference rates from the free, key-less currency-api by fawazahmed0
 * (https://github.com/fawazahmed0/exchange-api). Unlike ECB-based APIs it
 * includes TWD. Only rates are downloaded; nothing about the user is sent.
 */
export function rateSourceUrls(base: CurrencyCode): string[] {
  const code = base.toLowerCase();
  return [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${code}.json`,
    `https://latest.currency-api.pages.dev/v1/currencies/${code}.json`,
  ];
}

/** Keeps the supported currencies from a `{ date, [base]: { usd: 0.031, … } }` response. */
export function parseRateResponse(body: unknown, base: CurrencyCode): NewExchangeRate[] {
  if (typeof body !== 'object' || body === null) return [];
  const { date } = body as { date?: unknown };
  const table = (body as Record<string, unknown>)[base.toLowerCase()];
  if (!isDateKey(date) || typeof table !== 'object' || table === null) return [];

  const rates: NewExchangeRate[] = [];
  for (const to of CURRENCY_CODES) {
    if (to === base) continue;
    const rate = (table as Record<string, unknown>)[to.toLowerCase()];
    if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) rates.push({ from: base, to, rate, date });
  }
  return rates;
}

export type Fetch = (url: string) => Promise<Pick<Response, 'ok' | 'json'>>;

/** Latest rates from `base` to every other supported currency; tries each mirror in turn. */
export async function fetchLatestRates(base: CurrencyCode, fetchFn: Fetch): Promise<NewExchangeRate[]> {
  for (const url of rateSourceUrls(base)) {
    try {
      const response = await fetchFn(url);
      if (!response.ok) continue;
      const rates = parseRateResponse(await response.json(), base);
      if (rates.length > 0) return rates;
    } catch {
      // Try the next mirror.
    }
  }
  throw new Error('Exchange rates are unavailable');
}

/** Rates change once a day; checking twice a day is plenty. */
export const RATE_REFRESH_MS = 12 * 60 * 60 * 1000;

const fetchedAtKey = (base: CurrencyCode) => `ratesFetchedAt.${base}`;

export function readRatesFetchedAt(base: CurrencyCode): number | undefined {
  const value = Number(readPreference(fetchedAtKey(base)) ?? Number.NaN);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Downloads and stores today's rates for `base`. Unless `force`d, skips when
 * they were fetched recently. Returns how many rates were saved.
 */
export async function refreshRates(
  db: LedgerDB,
  base: CurrencyCode,
  { fetchFn = fetch, now = Date.now(), force = false }: { fetchFn?: Fetch; now?: number; force?: boolean } = {},
): Promise<number> {
  const last = readRatesFetchedAt(base);
  if (!force && last !== undefined && now - last < RATE_REFRESH_MS) return 0;
  const rates = await fetchLatestRates(base, fetchFn);
  const saved = await saveExchangeRates(db, rates);
  writePreference(fetchedAtKey(base), String(now));
  return saved;
}
