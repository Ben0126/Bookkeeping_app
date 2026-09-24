import type { LedgerDB } from './db';
import { LedgerError } from './errors';
import type { CurrencyCode } from './money';
import type { ExchangeRate } from './types';
import { requireCurrency, requireDate } from './validate';

export interface NewExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  /** Units of `to` per one unit of `from`. */
  rate: number;
  date: string;
}

export function exchangeRateId(from: CurrencyCode, to: CurrencyCode, date: string): string {
  return `${from}:${to}:${date}`;
}

/** Saves a rate, replacing any rate for the same pair and day. */
export async function setExchangeRate(db: LedgerDB, input: NewExchangeRate): Promise<ExchangeRate> {
  const from = requireCurrency(input.from);
  const to = requireCurrency(input.to);
  if (from === to) throw new LedgerError('INVALID_RATE', 'A rate needs two different currencies');
  if (typeof input.rate !== 'number' || !Number.isFinite(input.rate) || input.rate <= 0) {
    throw new LedgerError('INVALID_RATE', 'Rate must be a positive number');
  }
  const date = requireDate(input.date);
  const rate: ExchangeRate = {
    id: exchangeRateId(from, to, date),
    from,
    to,
    rate: input.rate,
    date,
    updatedAt: Date.now(),
  };
  await db.exchangeRates.put(rate);
  return rate;
}

export async function deleteExchangeRate(db: LedgerDB, id: string): Promise<void> {
  await db.exchangeRates.delete(id);
}

export async function listExchangeRates(db: LedgerDB): Promise<ExchangeRate[]> {
  const rates = await db.exchangeRates.toArray();
  return rates.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? 1 : -1));
}

/** Returns units of `to` per unit of `from` on `date`, or undefined if unknown. */
export type RateResolver = (from: CurrencyCode, to: CurrencyCode, date: string) => number | undefined;

/**
 * Builds a lookup over stored rates. For a date it uses the latest rate on or
 * before that day, falling back to the earliest later rate. A stored USD→TWD
 * rate also answers TWD→USD; a direct rate wins over an inverse on the same day.
 */
export function createRateResolver(rates: readonly ExchangeRate[]): RateResolver {
  const byPair = new Map<string, Map<string, { rate: number; direct: boolean }>>();
  const add = (pair: string, date: string, rate: number, direct: boolean) => {
    let byDate = byPair.get(pair);
    if (!byDate) byPair.set(pair, (byDate = new Map()));
    const existing = byDate.get(date);
    if (!existing || (direct && !existing.direct)) byDate.set(date, { rate, direct });
  };
  for (const r of rates) {
    add(`${r.from}:${r.to}`, r.date, r.rate, true);
    add(`${r.to}:${r.from}`, r.date, 1 / r.rate, false);
  }

  const sorted = new Map<string, { date: string; rate: number }[]>();
  for (const [pair, byDate] of byPair) {
    sorted.set(
      pair,
      [...byDate].map(([date, { rate }]) => ({ date, rate })).sort((a, b) => (a.date < b.date ? -1 : 1)),
    );
  }

  return (from, to, date) => {
    if (from === to) return 1;
    const series = sorted.get(`${from}:${to}`);
    if (!series) return undefined;
    // Last entry dated on or before `date`.
    let low = 0;
    let high = series.length - 1;
    let found = -1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (series[mid].date <= date) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return series[found === -1 ? 0 : found].rate;
  };
}
