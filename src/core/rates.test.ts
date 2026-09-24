import { describe, expect, it } from 'vitest';
import { createTestDb } from '../test/ledgerDb';
import { createRateResolver, listExchangeRates, setExchangeRate } from './rates';
import type { ExchangeRate } from './types';

const rate = (from: ExchangeRate['from'], to: ExchangeRate['to'], value: number, date: string): ExchangeRate => ({
  id: `${from}:${to}:${date}`,
  from,
  to,
  rate: value,
  date,
  updatedAt: 0,
});

describe('createRateResolver', () => {
  const resolve = createRateResolver([
    rate('USD', 'TWD', 31, '2026-01-01'),
    rate('USD', 'TWD', 32, '2026-06-01'),
    rate('TWD', 'USD', 0.04, '2026-06-01'),
    rate('GBP', 'USD', 1.25, '2026-03-01'),
  ]);

  it('uses the latest rate on or before the date', () => {
    expect(resolve('USD', 'TWD', '2026-05-31')).toBe(31);
    expect(resolve('USD', 'TWD', '2026-06-01')).toBe(32);
    expect(resolve('USD', 'TWD', '2027-01-01')).toBe(32);
  });

  it('falls back to the earliest rate for dates before any rate', () => {
    expect(resolve('USD', 'TWD', '2025-12-31')).toBe(31);
  });

  it('answers the inverse pair, preferring a direct rate on the same day', () => {
    expect(resolve('USD', 'GBP', '2026-04-01')).toBeCloseTo(0.8);
    expect(resolve('TWD', 'USD', '2026-02-01')).toBeCloseTo(1 / 31);
    expect(resolve('TWD', 'USD', '2026-06-01')).toBe(0.04);
  });

  it('knows nothing about pairs without rates', () => {
    expect(resolve('GBP', 'TWD', '2026-04-01')).toBeUndefined();
    expect(resolve('JPY', 'JPY', '2026-04-01')).toBe(1);
  });
});

describe('setExchangeRate', () => {
  it('keeps one rate per pair per day', async () => {
    const db = createTestDb();
    await setExchangeRate(db, { from: 'USD', to: 'TWD', rate: 31.5, date: '2026-09-01' });
    await setExchangeRate(db, { from: 'USD', to: 'TWD', rate: 31.8, date: '2026-09-01' });
    await setExchangeRate(db, { from: 'USD', to: 'TWD', rate: 32, date: '2026-09-02' });

    const rates = await listExchangeRates(db);
    expect(rates.map((r) => [r.date, r.rate])).toEqual([
      ['2026-09-02', 32],
      ['2026-09-01', 31.8],
    ]);
  });

  it.each([
    [{ rate: 0 }, 'INVALID_RATE'],
    [{ rate: Number.POSITIVE_INFINITY }, 'INVALID_RATE'],
    [{ to: 'USD' }, 'INVALID_RATE'],
    [{ to: 'BTC' }, 'INVALID_CURRENCY'],
    [{ date: 'yesterday' }, 'INVALID_DATE'],
  ])('rejects %j', async (overrides, code) => {
    const db = createTestDb();
    const input = { from: 'USD', to: 'TWD', rate: 32, date: '2026-09-01', ...overrides };
    await expect(setExchangeRate(db, input as never)).rejects.toMatchObject({ code });
  });
});
