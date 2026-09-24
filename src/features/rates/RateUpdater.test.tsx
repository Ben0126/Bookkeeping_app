import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LedgerProvider } from '../../app/LedgerProvider';
import { updateSettings } from '../../core';
import { createTestDb } from '../../test/ledgerDb';
import { RateUpdater } from './RateUpdater';

const response = (base: string, rates: Record<string, number>) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ date: '2026-09-24', [base]: rates }) });

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

describe('RateUpdater', () => {
  it('downloads rates on launch and again when the main currency changes', async () => {
    const fetchMock = vi.fn((url: string) =>
      url.includes('/twd.json') ? response('twd', { usd: 0.031 }) : response('jpy', { twd: 0.21 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const db = createTestDb();
    render(
      <LedgerProvider db={db}>
        <RateUpdater />
      </LedgerProvider>,
    );

    await waitFor(async () => expect(await db.exchangeRates.get('TWD:USD:2026-09-24')).toBeDefined());
    await updateSettings(db, { baseCurrency: 'JPY' });
    await waitFor(async () => expect(await db.exchangeRates.get('JPY:TWD:2026-09-24')).toBeDefined());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('waits while offline and updates when the connection returns', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const fetchMock = vi.fn(() => response('twd', { usd: 0.031 }));
    vi.stubGlobal('fetch', fetchMock);
    const db = createTestDb();
    render(
      <LedgerProvider db={db}>
        <RateUpdater />
      </LedgerProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
