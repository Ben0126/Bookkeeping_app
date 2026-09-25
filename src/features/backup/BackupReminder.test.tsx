import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTransaction, seedDefaultCategories, type LedgerDB } from '../../core';
import { addAccount, createTestDb } from '../../test/ledgerDb';
import { renderApp } from '../../test/renderApp';
import { readSnoozedUntil, writeLastBackupAt } from './backupFile';

const DAY = 24 * 60 * 60 * 1000;
let db: LedgerDB;

beforeEach(async () => {
  db = createTestDb();
  await seedDefaultCategories(db);
});

afterEach(() => vi.restoreAllMocks());

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
    expect(screen.queryByRole('link', { name: 'Back up now' })).not.toBeInTheDocument();
  });

  it('stays quiet when everything was backed up afterwards', async () => {
    await addDataFrom(20);
    writeLastBackupAt(Date.now() - DAY);
    await renderTransactions();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('link', { name: 'Back up now' })).not.toBeInTheDocument();
  });

  it('leads to the backup settings', async () => {
    await addDataFrom(8);
    await renderTransactions();
    fireEvent.click(await screen.findByRole('link', { name: 'Back up now' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument());
  });
});
