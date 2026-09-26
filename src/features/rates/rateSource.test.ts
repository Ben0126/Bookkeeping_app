import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listExchangeRates, type LedgerDB } from '../../core';
import { createTestDb } from '../../test/ledgerDb';
import { fetchLatestRates, parseRateResponse, RATE_REFRESH_MS, readRatesFetchedAt, refreshRates } from './rateSource';

const body = { date: '2026-09-24', twd: { usd: 0.0312, jpy: 4.65, eur: 0.0281, btc: 0.0000004, xyz: 'nope' } };
const ok = (json: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(json) });

describe('parseRateResponse', () => {
  it('keeps supported currencies with valid rates', () => {
    expect(parseRateResponse(body, 'TWD')).toEqual([
      { from: 'TWD', to: 'USD', rate: 0.0312, date: '2026-09-24' },
      { from: 'TWD', to: 'EUR', rate: 0.0281, date: '2026-09-24' },
      { from: 'TWD', to: 'JPY', rate: 4.65, date: '2026-09-24' },
    ]);
  });

  it.each([null, 'text', { date: 'today', twd: {} }, { date: '2026-09-24' }, { date: '2026-09-24', usd: {} }])(
    'ignores %j',
    (value) => {
      expect(parseRateResponse(value, 'TWD')).toEqual([]);
    },
  );
});

describe('fetchLatestRates', () => {
  it('falls back to the mirror when the first source fails', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockImplementationOnce(() => ok(body));
    const rates = await fetchLatestRates('TWD', fetchFn);
    expect(rates).toHaveLength(3);
    expect(fetchFn.mock.calls[0][0]).toContain('cdn.jsdelivr.net');
    expect(fetchFn.mock.calls[1][0]).toContain('currency-api.pages.dev');
  });

  it('gives up when every source fails', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    await expect(fetchLatestRates('TWD', fetchFn)).rejects.toThrow('unavailable');
  });
});

describe('refreshRates', () => {
  let db: LedgerDB;
  beforeEach(() => {
    db = createTestDb();
  });

  it('stores the rates and skips refetching for a while', async () => {
    const fetchFn = vi.fn(() => ok(body));
    expect(await refreshRates(db, 'TWD', { fetchFn, now: 1_000 })).toBe(3);
    expect((await listExchangeRates(db)).map((r) => r.to).sort()).toEqual(['EUR', 'JPY', 'USD']);
    expect(readRatesFetchedAt('TWD')).toBe(1_000);

    expect(await refreshRates(db, 'TWD', { fetchFn, now: 1_000 + RATE_REFRESH_MS - 1 })).toBe(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await refreshRates(db, 'TWD', { fetchFn, now: 1_000 + RATE_REFRESH_MS });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('refetches when forced or when the base currency changes', async () => {
    const fetchFn = vi.fn((url: string) => ok(url.includes('/jpy.json') ? { date: '2026-09-24', jpy: { twd: 0.215 } } : body));
    await refreshRates(db, 'TWD', { fetchFn, now: 1_000 });
    await refreshRates(db, 'TWD', { fetchFn, now: 1_001, force: true });
    await refreshRates(db, 'JPY', { fetchFn, now: 1_002 });
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(await db.exchangeRates.get('JPY:TWD:2026-09-24')).toMatchObject({ rate: 0.215 });
  });

  it('does not mark a failed download as fresh', async () => {
    await expect(refreshRates(db, 'TWD', { fetchFn: () => Promise.reject(new TypeError('offline')) })).rejects.toThrow();
    expect(readRatesFetchedAt('TWD')).toBeUndefined();
  });
});
