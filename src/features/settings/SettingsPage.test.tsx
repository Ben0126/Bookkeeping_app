import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTransaction,
  exportBackup,
  readBackup,
  seedDefaultCategories,
  type Backup,
  type LedgerDB,
} from '../../core';
import { addAccount, createTestDb } from '../../test/ledgerDb';
import { renderApp } from '../../test/renderApp';
import { readLastBackupAt, writeLastBackupAt } from '../backup/backupFile';

let db: LedgerDB;

beforeEach(async () => {
  db = createTestDb();
  await seedDefaultCategories(db);
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of ['share', 'canShare', 'storage']) {
    delete (navigator as unknown as Record<string, unknown>)[key];
  }
});

function stubNavigator(key: string, value: unknown) {
  Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
}

/** A backup made from a separate database holding one account and one expense. */
async function makeBackup(): Promise<Backup> {
  const source = createTestDb();
  await seedDefaultCategories(source);
  const chase = await addAccount(source, { name: 'Chase' });
  await createTransaction(source, { kind: 'expense', accountId: chase.id, amountMinor: 1250, date: '2026-09-01' });
  return { ...(await exportBackup(source)), exportedAt: '2026-09-20T10:00:00.000Z' };
}

const chooseFile = (content: string, name = 'backup.json') =>
  fireEvent.change(screen.getByLabelText('Choose backup file'), {
    target: { files: [new File([content], name, { type: 'application/json' })] },
  });

const accountNames = async () => (await db.accounts.toArray()).map((a) => a.name).sort();

describe('backing up', () => {
  it('downloads a backup file of all data and records when', async () => {
    const wallet = await addAccount(db, { name: 'Wallet' });
    await createTransaction(db, { kind: 'income', accountId: wallet.id, amountMinor: 500, date: '2026-09-01' });
    let saved: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      saved = blob as Blob;
      return 'blob:backup';
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderApp(db, '/settings');
    expect(await screen.findByText('Never')).toBeInTheDocument();
    expect(await screen.findByText('Accounts: 1 · Transactions: 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download backup' }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toMatch(/^studybudget-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
    const backup = readBackup(await saved!.text());
    expect(backup.data.accounts.map((a) => a.name)).toEqual(['Wallet']);
    expect(backup.data.transactions).toHaveLength(1);

    expect(readLastBackupAt()).toBeGreaterThan(Date.now() - 5000);
    expect(await screen.findByText(/\(today\)$/)).toBeInTheDocument();
  });

  it('offers the share sheet where files can be shared', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator('canShare', () => true);
    stubNavigator('share', share);

    renderApp(db, '/settings');
    await screen.findByText(/Accounts: 0/);
    fireEvent.click(screen.getByRole('button', { name: 'Share backup' }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0].files[0].name).toMatch(/\.json$/);
    await waitFor(() => expect(readLastBackupAt()).toBeDefined());
  });

  it('does not count a cancelled share as a backup', async () => {
    stubNavigator('canShare', () => true);
    stubNavigator('share', vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')));

    renderApp(db, '/settings');
    await screen.findByText(/Accounts: 0/);
    fireEvent.click(screen.getByRole('button', { name: 'Share backup' }));

    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    expect(readLastBackupAt()).toBeUndefined();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('hides sharing where it is unsupported', async () => {
    renderApp(db, '/settings');
    await screen.findByRole('button', { name: 'Download backup' });
    expect(screen.queryByRole('button', { name: 'Share backup' })).not.toBeInTheDocument();
  });
});

describe('restoring', () => {
  it('previews, restores, and can undo', async () => {
    await addAccount(db, { name: 'Old account' });
    writeLastBackupAt(1_000);
    const backup = await makeBackup();

    renderApp(db, '/settings');
    await screen.findByText(/Accounts: 1 · Transactions: 0/);
    chooseFile(JSON.stringify(backup), 'my-backup.json');

    const warning = await screen.findByRole('alert');
    expect(warning).toHaveTextContent('Restoring replaces all data on this device (Accounts: 1 · Transactions: 0).');
    const preview = screen.getByText('my-backup.json').parentElement!;
    expect(within(preview).getByText('Accounts: 1 · Transactions: 1')).toBeInTheDocument();
    expect(await accountNames()).toEqual(['Old account']);

    fireEvent.click(screen.getByRole('button', { name: 'Replace and restore' }));
    expect(await screen.findByText('Backup restored: Accounts: 1 · Transactions: 1.')).toBeInTheDocument();
    expect(await accountNames()).toEqual(['Chase']);
    expect(readLastBackupAt()).toBe(Date.parse('2026-09-20T10:00:00.000Z'));

    fireEvent.click(screen.getByRole('button', { name: 'Undo restore' }));
    expect(await screen.findByText('Your data is back to how it was before the restore.')).toBeInTheDocument();
    expect(await accountNames()).toEqual(['Old account']);
    expect(await db.transactions.count()).toBe(0);
    expect(readLastBackupAt()).toBe(1_000);
  });

  it('changes nothing when the preview is cancelled', async () => {
    await addAccount(db, { name: 'Old account' });
    renderApp(db, '/settings');
    chooseFile(JSON.stringify(await makeBackup()));

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('button', { name: 'Choose backup file' })).toBeInTheDocument();
    expect(await accountNames()).toEqual(['Old account']);
  });

  it.each([
    ['text that is not JSON', 'hello'],
    ['JSON from another app', JSON.stringify({ hello: 'world' })],
  ])('rejects %s before touching data', async (_, content) => {
    await addAccount(db, { name: 'Old account' });
    renderApp(db, '/settings');
    await screen.findByRole('button', { name: 'Choose backup file' });
    chooseFile(content);

    expect(await screen.findByRole('alert')).toHaveTextContent("This backup file isn't valid.");
    expect(screen.queryByRole('button', { name: 'Replace and restore' })).not.toBeInTheDocument();
    expect(await accountNames()).toEqual(['Old account']);
  });

  it('shows which field is broken', async () => {
    const backup = await makeBackup();
    backup.data.transactions[0].accountId = 'ghost';
    renderApp(db, '/settings');
    await screen.findByRole('button', { name: 'Choose backup file' });
    chooseFile(JSON.stringify(backup));

    expect(await screen.findByText(/transactions\[0\]\.accountId: unknown account/)).toBeInTheDocument();
  });
});

describe('persistent storage', () => {
  it('asks the browser to keep the data', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    stubNavigator('storage', { persisted: vi.fn().mockResolvedValue(false), persist });

    renderApp(db, '/settings');
    fireEvent.click(await screen.findByRole('button', { name: 'Request persistent storage' }));

    expect(await screen.findByText(/Persistent storage is on/)).toBeInTheDocument();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('explains what to do when the browser declines', async () => {
    stubNavigator('storage', { persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockResolvedValue(false) });

    renderApp(db, '/settings');
    fireEvent.click(await screen.findByRole('button', { name: 'Request persistent storage' }));
    expect(await screen.findByText(/The browser declined/)).toBeInTheDocument();
  });

  it('is hidden without the Storage API', async () => {
    renderApp(db, '/settings');
    await screen.findByRole('button', { name: 'Download backup' });
    expect(screen.queryByRole('heading', { name: 'Storage' })).not.toBeInTheDocument();
  });
});
