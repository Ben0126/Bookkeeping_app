import { beforeEach, describe, expect, it } from 'vitest';
import { addAccount, createTestDb } from '../test/ledgerDb';
import {
  createAccount,
  deleteAccount,
  getAccountBalance,
  getBalances,
  listAccounts,
  updateAccount,
} from './accounts';
import type { LedgerDB } from './db';
import { createTransaction } from './transactions';

let db: LedgerDB;

beforeEach(() => {
  db = createTestDb();
});

describe('createAccount', () => {
  it('stores a trimmed account with an opening balance', async () => {
    const account = await createAccount(db, {
      name: '  Chase Checking ',
      kind: 'bank',
      currency: 'USD',
      openingBalanceMinor: 150000,
    });
    expect(account).toMatchObject({ name: 'Chase Checking', archived: false, openingBalanceMinor: 150000 });
    expect(await db.accounts.get(account.id)).toEqual(account);
  });

  it('allows a negative opening balance for debt', async () => {
    const card = await addAccount(db, { kind: 'credit_card', openingBalanceMinor: -2500 });
    expect(await getAccountBalance(db, card.id)).toBe(-2500);
  });

  it.each([
    [{ name: '   ' }, 'INVALID_NAME'],
    [{ currency: 'XYZ' }, 'INVALID_CURRENCY'],
    [{ kind: 'piggy' }, 'INVALID_KIND'],
    [{ openingBalanceMinor: 10.5 }, 'INVALID_AMOUNT'],
  ])('rejects %j', async (overrides, code) => {
    await expect(addAccount(db, overrides as never)).rejects.toMatchObject({ code });
  });
});

describe('balances', () => {
  it('is the opening balance plus every posting', async () => {
    const account = await addAccount(db, { openingBalanceMinor: 10000 });
    await createTransaction(db, { kind: 'income', accountId: account.id, amountMinor: 5000, date: '2026-09-01' });
    await createTransaction(db, { kind: 'expense', accountId: account.id, amountMinor: 1234, date: '2026-09-02' });
    expect(await getAccountBalance(db, account.id)).toBe(13766);
  });

  it('reports every account at once', async () => {
    const a = await addAccount(db, { openingBalanceMinor: 100 });
    const b = await addAccount(db, { currency: 'TWD', openingBalanceMinor: 0 });
    await createTransaction(db, { kind: 'expense', accountId: a.id, amountMinor: 30, date: '2026-09-01' });
    expect(await getBalances(db)).toEqual({ [a.id]: 70, [b.id]: 0 });
  });
});

describe('updateAccount', () => {
  it('changes currency only while the account has no transactions', async () => {
    const account = await addAccount(db);
    expect((await updateAccount(db, account.id, { currency: 'GBP' })).currency).toBe('GBP');

    await createTransaction(db, { kind: 'income', accountId: account.id, amountMinor: 100, date: '2026-09-01' });
    await expect(updateAccount(db, account.id, { currency: 'EUR' })).rejects.toMatchObject({ code: 'CURRENCY_LOCKED' });
    expect((await db.accounts.get(account.id))?.currency).toBe('GBP');
  });

  it('archives accounts and hides them from the default list', async () => {
    const kept = await addAccount(db, { name: 'Kept' });
    const old = await addAccount(db, { name: 'Old' });
    await updateAccount(db, old.id, { archived: true });

    expect((await listAccounts(db)).map((a) => a.id)).toEqual([kept.id]);
    expect(await listAccounts(db, { includeArchived: true })).toHaveLength(2);
  });

  it('clears the color when given an empty string', async () => {
    const account = await addAccount(db, { color: '#ff0000' });
    const updated = await updateAccount(db, account.id, { color: '' });
    expect(updated).not.toHaveProperty('color');
  });
});

describe('deleteAccount', () => {
  it('deletes an unused account', async () => {
    const account = await addAccount(db);
    await deleteAccount(db, account.id);
    expect(await db.accounts.count()).toBe(0);
  });

  it('refuses to delete an account with transactions', async () => {
    const account = await addAccount(db);
    await createTransaction(db, { kind: 'income', accountId: account.id, amountMinor: 100, date: '2026-09-01' });
    await expect(deleteAccount(db, account.id)).rejects.toMatchObject({ code: 'ACCOUNT_IN_USE' });
  });

  it('reports a missing account', async () => {
    await expect(deleteAccount(db, 'nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
