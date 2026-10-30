import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTransaction, seedDefaultCategories, type LedgerDB } from '../../core';
import { addAccount, createTestDb } from '../../test/ledgerDb';
import { renderApp } from '../../test/renderApp';
import { readLastBackupAt, readSnoozedUntil, writeLastBackupAt } from './backupFile';

const DAY = 24 * 60 * 60 * 1000;
let db: LedgerDB;

beforeEach(async () => {
  db = createTestDb();
  await seedDefaultCategories(db);
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of ['share', 'canShare']) {
    delete (navigator as unknown as Record<string, unknown>)[key];
  }
});

function stubNavigator(key: string, value: unknown) {
  Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
}

/** Records an account and an expense as if made `daysAgo` days ago. */
async function addDataFrom(daysAgo: number) {
  const now = vi.spyOn(Date, 'now').mockReturnValue(Date.now() - daysAgo * DAY);
  const account = await addAccount(db, { name: 'Chase' });
  await createTransaction(db, { kind: 'expense', accountId: account.id, amountMinor: 100, date: '2026-09-01' });
  now.mockRestore();
}

const renderTransactions = async () => {
  renderApp(db, '/transactions');
  await screen.findByRole('button', { name: 'Previous month' });
};

describe('BackupReminder', () => {
  it('reminds when a week of data has never been backed up, and can be snoozed', async () => {
    await addDataFrom(8);
    await renderTransactions();

    expect(await screen.findByText(/never been backed up/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(screen.queryByText(/never been backed up/)).not.toBeInTheDocument();
    expect(readSnoozedUntil()).toBeGreaterThan(Date.now());
  });

  it('says how long ago the last backup was', async () => {
    writeLastBackupAt(Date.now() - 10 * DAY);
    await addDataFrom(9);
    await renderTransactions();
    expect(await screen.findByText(/Your last backup was 10 days ago/)).toBeInTheDocument();
  });

  it('stays quiet for recent changes or data already backed up', async () => {
    await addDataFrom(2);
    await renderTransactions();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button', { name: 'Back up now' })).not.toBeInTheDocument();
  });

  it('stays quiet when everything was backed up afterwards', async () => {
    await addDataFrom(20);
    writeLastBackupAt(Date.now() - DAY);
    await renderTransactions();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button', { name: 'Back up now' })).not.toBeInTheDocument();
  });

  it('backs up in one tap through the share sheet', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator('canShare', () => true);
    stubNavigator('share', share);
    await addDataFrom(8);
    await renderTransactions();

    expect(await screen.findByText(/opens the share sheet/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Back up now' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    expect(await screen.findByText('Backed up: Accounts: 1 · Transactions: 1')).toBeInTheDocument();
    expect(screen.queryByText(/never been backed up/)).not.toBeInTheDocument();
    const [{ files }] = share.mock.calls[0] as [{ files: File[] }];
    expect(files[0].name).toMatch(/^studybudget-.*\.json$/);
    expect(JSON.parse(await files[0].text()).data.transactions).toHaveLength(1);
    expect(readLastBackupAt()).toBeGreaterThan(Date.now() - 60_000);
  });

  it('downloads the file where sharing is unsupported', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await addDataFrom(8);
    await renderTransactions();

    expect(await screen.findByText(/downloads a backup file/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Back up now' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(await screen.findByText(/^Backed up/)).toBeInTheDocument();
  });

  it('keeps reminding when the share sheet is closed', async () => {
    stubNavigator('canShare', () => true);
    stubNavigator('share', vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')));
    await addDataFrom(8);
    await renderTransactions();

    const button = await screen.findByRole('button', { name: 'Back up now' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    expect(screen.getByText(/never been backed up/)).toBeInTheDocument();
    expect(readLastBackupAt()).toBeUndefined();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('points to Settings when the backup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubNavigator('canShare', () => true);
    stubNavigator('share', vi.fn().mockRejectedValue(new DOMException('not allowed', 'NotAllowedError')));
    await addDataFrom(8);
    await renderTransactions();

    const button = await screen.findByRole('button', { name: 'Back up now' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    expect(await screen.findByRole('alert')).toHaveTextContent("The backup didn't go through.");
    fireEvent.click(screen.getByRole('link', { name: 'Try again from Settings' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument());
  });
});
