import { describe, expect, it } from 'vitest';
import { createTestDb } from '../test/ledgerDb';
import { createRateResolver, listExchangeRates, saveExchangeRates, setExchangeRate } from './rates';
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

  it('converts through a shared currency when a pair has no rate', () => {
    // GBP→USD 1.25, then USD→TWD 31 (the rate on 2026-04-01).
    expect(resolve('GBP', 'TWD', '2026-04-01')).toBeCloseTo(38.75);
    expect(resolve('TWD', 'GBP', '2026-04-01')).toBeCloseTo(1 / 38.75);
  });

  it('knows nothing about currencies without any rate', () => {
    expect(resolve('JPY', 'TWD', '2026-04-01')).toBeUndefined();
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

describe('saveExchangeRates', () => {
  it('saves a batch and rejects it whole when one rate is invalid', async () => {
    const db = createTestDb();
    await saveExchangeRates(db, [
      { from: 'TWD', to: 'USD', rate: 0.031, date: '2026-09-24' },
      { from: 'TWD', to: 'JPY', rate: 4.6, date: '2026-09-24' },
    ]);
    expect(await db.exchangeRates.count()).toBe(2);

    await expect(
      saveExchangeRates(db, [
        { from: 'TWD', to: 'EUR', rate: 0.028, date: '2026-09-25' },
        { from: 'TWD', to: 'GBP', rate: -1, date: '2026-09-25' },
      ]),
    ).rejects.toMatchObject({ code: 'INVALID_RATE' });
    expect(await db.exchangeRates.count()).toBe(2);
  });
});

describe('listExchangeRates with a range', () => {
  const stored = [
    rate('TWD', 'USD', 0.031, '2026-01-10'),
    rate('TWD', 'USD', 0.032, '2026-02-10'),
    rate('TWD', 'USD', 0.033, '2026-03-10'),
    rate('TWD', 'USD', 0.034, '2026-04-10'),
    rate('USD', 'TWD', 30, '2026-03-10'),
    rate('TWD', 'JPY', 4.6, '2026-01-20'),
    // Only rates after the ranges below.
    rate('TWD', 'EUR', 0.028, '2026-05-01'),
    rate('TWD', 'EUR', 0.029, '2026-05-02'),
  ];
  const dates = (from: string, to: string) => {
    const days: string[] = [];
    for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  };
  const currencies = ['TWD', 'USD', 'JPY', 'EUR'] as const;

  it.each([
    ['2026-02-01', '2026-02-28'],
    ['2026-03-10', '2026-03-31'],
    ['2026-01-01', '2026-01-05'],
    ['2026-06-01', '2026-06-30'],
  ])('converts %s to %s exactly as every rate would', async (from, to) => {
    const db = createTestDb();
    await db.exchangeRates.bulkAdd(stored);
    const all = createRateResolver(stored);
    const some = createRateResolver(await listExchangeRates(db, { from, to }));

    for (const date of dates(from, to)) {
      for (const a of currencies) {
        for (const b of currencies) expect(some(a, b, date), `${a}→${b} on ${date}`).toBe(all(a, b, date));
      }
    }
  });

  it('loads only the rates around the range', async () => {
    const db = createTestDb();
    await db.exchangeRates.bulkAdd(stored);
    const ids = (await listExchangeRates(db, { from: '2026-02-01', to: '2026-02-28' })).map((r) => r.id);
    expect(ids).toEqual([
      // Pairs with nothing until after the range bring their first rate.
      'TWD:EUR:2026-05-01',
      'USD:TWD:2026-03-10',
      'TWD:USD:2026-02-10',
      // The latest rate before the range.
      'TWD:JPY:2026-01-20',
      'TWD:USD:2026-01-10',
    ]);
  });

  it('leaves either end open', async () => {
    const db = createTestDb();
    await db.exchangeRates.bulkAdd(stored);
    const since = (await listExchangeRates(db, { from: '2026-04-01' })).map((r) => r.id);
    expect(since).toEqual([
      'TWD:EUR:2026-05-02',
      'TWD:EUR:2026-05-01',
      'TWD:USD:2026-04-10',
      'TWD:USD:2026-03-10',
      'USD:TWD:2026-03-10',
      'TWD:JPY:2026-01-20',
    ]);
    expect(await listExchangeRates(db)).toHaveLength(stored.length);
  });
});
