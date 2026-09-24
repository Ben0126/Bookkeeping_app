import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addAccount, createTestDb } from '../test/ledgerDb';
import { getAccountBalance, updateAccount } from './accounts';
import { createCategory, seedDefaultCategories, updateCategory } from './categories';
import type { LedgerDB } from './db';
import {
  createTransaction,
  deleteTransaction,
  getTransactionGroup,
  getTransactionInput,
  listTransactions,
  updateTransaction,
  type TransactionInput,
} from './transactions';
import type { Account } from './types';

let db: LedgerDB;
let usd: Account;
let usd2: Account;
let twd: Account;

beforeEach(async () => {
  db = createTestDb();
  await seedDefaultCategories(db);
  usd = await addAccount(db, { name: 'Chase', kind: 'bank', currency: 'USD', openingBalanceMinor: 100000 });
  usd2 = await addAccount(db, { name: 'Cash', currency: 'USD' });
  twd = await addAccount(db, { name: '台銀', kind: 'bank', currency: 'TWD', openingBalanceMinor: 50000 });
});

const balance = (account: Account) => getAccountBalance(db, account.id);

describe('income and expenses', () => {
  it('stores signed postings and moves the balance', async () => {
    const [income] = await createTransaction(db, {
      kind: 'income', accountId: usd.id, amountMinor: 2000, date: '2026-09-01', categoryId: 'default-scholarship',
    });
    const [expense] = await createTransaction(db, {
      kind: 'expense', accountId: usd.id, amountMinor: 450, date: '2026-09-02', categoryId: 'default-groceries',
      payee: ' Trader Joe’s ', note: '',
    });

    expect(income.amountMinor).toBe(2000);
    expect(expense).toMatchObject({ amountMinor: -450, payee: 'Trader Joe’s' });
    expect(expense).not.toHaveProperty('note');
    expect(await balance(usd)).toBe(101550);
  });

  it('keeps the balance right when a transaction is edited', async () => {
    const [expense] = await createTransaction(db, { kind: 'expense', accountId: usd.id, amountMinor: 1000, date: '2026-09-01' });
    await updateTransaction(db, expense.id, { kind: 'expense', accountId: usd.id, amountMinor: 250, date: '2026-09-01' });
    expect(await balance(usd)).toBe(99750);

    // Moving it to another account moves the money too.
    await updateTransaction(db, expense.id, { kind: 'expense', accountId: usd2.id, amountMinor: 250, date: '2026-09-01' });
    expect(await balance(usd)).toBe(100000);
    expect(await balance(usd2)).toBe(-250);
  });

  it('restores the balance when a transaction is deleted', async () => {
    const [expense] = await createTransaction(db, { kind: 'expense', accountId: usd.id, amountMinor: 1000, date: '2026-09-01' });
    await deleteTransaction(db, expense.id);
    expect(await balance(usd)).toBe(100000);
    expect(await db.transactions.count()).toBe(0);
  });

  it('keeps the original when an edit fails to save', async () => {
    const [expense] = await createTransaction(db, { kind: 'expense', accountId: usd.id, amountMinor: 1000, date: '2026-09-01' });
    vi.spyOn(db.transactions, 'bulkAdd').mockRejectedValueOnce(new Error('quota exceeded'));

    await expect(
      updateTransaction(db, expense.id, { kind: 'expense', accountId: usd.id, amountMinor: 5, date: '2026-09-01' }),
    ).rejects.toThrow('quota exceeded');
    expect(await db.transactions.get(expense.id)).toEqual(expense);
    expect(await balance(usd)).toBe(99000);
  });

  it('keeps id and createdAt across edits', async () => {
    const [created] = await createTransaction(db, { kind: 'expense', accountId: usd.id, amountMinor: 100, date: '2026-09-01' });
    const [updated] = await updateTransaction(db, created.id, { kind: 'income', accountId: usd.id, amountMinor: 100, date: '2026-09-03' });
    expect(updated).toMatchObject({ id: created.id, createdAt: created.createdAt, kind: 'income', amountMinor: 100 });
  });

  it('records the foreign amount a card was charged', async () => {
    const [expense] = await createTransaction(db, {
      kind: 'expense', accountId: usd.id, amountMinor: 1320, date: '2026-09-01',
      original: { amountMinor: 1200, currency: 'EUR' },
    });
    expect(expense).toMatchObject({ amountMinor: -1320, originalAmountMinor: -1200, originalCurrency: 'EUR' });

    await expect(
      createTransaction(db, {
        kind: 'expense', accountId: usd.id, amountMinor: 100, date: '2026-09-01',
        original: { amountMinor: 100, currency: 'USD' },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ORIGINAL_AMOUNT' });
  });

  it.each([
    [{ amountMinor: 0 }, 'INVALID_AMOUNT'],
    [{ amountMinor: -5 }, 'INVALID_AMOUNT'],
    [{ amountMinor: 12.5 }, 'INVALID_AMOUNT'],
    [{ date: '2026-02-30' }, 'INVALID_DATE'],
    [{ accountId: 'missing' }, 'NOT_FOUND'],
    [{ categoryId: 'default-salary' }, 'CATEGORY_KIND_MISMATCH'],
    [{ kind: 'refund' }, 'INVALID_KIND'],
  ])('rejects %j', async (overrides, code) => {
    const input = { kind: 'expense', accountId: usd.id, amountMinor: 100, date: '2026-09-01', ...overrides };
    await expect(createTransaction(db, input as TransactionInput)).rejects.toMatchObject({ code });
    expect(await db.transactions.count()).toBe(0);
  });
});

describe('refunds', () => {
  it('stores a refund as money back into the account under an expense category', async () => {
    const [refund] = await createTransaction(db, {
      kind: 'expense', accountId: usd.id, amountMinor: 2000, date: '2026-09-03', categoryId: 'default-dining', refund: true,
    });
    expect(refund).toMatchObject({ kind: 'expense', amountMinor: 2000, categoryId: 'default-dining' });
    expect(await balance(usd)).toBe(102000);
    expect(await getTransactionInput(db, refund.id)).toMatchObject({ kind: 'expense', refund: true, amountMinor: 2000 });
  });

  it('only allows refunds on expenses', async () => {
    await expect(
      createTransaction(db, { kind: 'income', accountId: usd.id, amountMinor: 100, date: '2026-09-03', refund: true }),
    ).rejects.toMatchObject({ code: 'INVALID_KIND' });
  });
});

describe('transfers', () => {
  it('moves money between same-currency accounts without changing the total', async () => {
    const legs = await createTransaction(db, {
      kind: 'transfer', fromAccountId: usd.id, toAccountId: usd2.id, amountMinor: 30000, date: '2026-09-05',
    });

    expect(legs).toHaveLength(2);
    expect(legs[0].transferId).toBe(legs[1].transferId);
    expect(await balance(usd)).toBe(70000);
    expect(await balance(usd2)).toBe(30000);
  });

  it('credits the other currency with the amount received', async () => {
    await createTransaction(db, {
      kind: 'transfer', fromAccountId: twd.id, toAccountId: usd.id,
      amountMinor: 32000, toAmountMinor: 100000, date: '2026-09-05',
    });
    expect(await balance(twd)).toBe(18000);
    expect(await balance(usd)).toBe(200000);
  });

  it('requires the received amount across currencies', async () => {
    await expect(
      createTransaction(db, { kind: 'transfer', fromAccountId: twd.id, toAccountId: usd.id, amountMinor: 100, date: '2026-09-05' }),
    ).rejects.toMatchObject({ code: 'TRANSFER_AMOUNT_REQUIRED' });
  });

  it('rejects unbalanced same-currency transfers and self-transfers', async () => {
    await expect(
      createTransaction(db, {
        kind: 'transfer', fromAccountId: usd.id, toAccountId: usd2.id, amountMinor: 100, toAmountMinor: 90, date: '2026-09-05',
      }),
    ).rejects.toMatchObject({ code: 'TRANSFER_AMOUNT_MISMATCH' });
    await expect(
      createTransaction(db, { kind: 'transfer', fromAccountId: usd.id, toAccountId: usd.id, amountMinor: 100, date: '2026-09-05' }),
    ).rejects.toMatchObject({ code: 'SAME_ACCOUNT_TRANSFER' });
  });

  it('writes nothing when the second account is invalid', async () => {
    await expect(
      createTransaction(db, { kind: 'transfer', fromAccountId: usd.id, toAccountId: 'missing', amountMinor: 100, date: '2026-09-05' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await db.transactions.count()).toBe(0);
    expect(await balance(usd)).toBe(100000);
  });

  it('records a fee as its own expense in the fees category', async () => {
    const records = await createTransaction(db, {
      kind: 'transfer', fromAccountId: twd.id, toAccountId: usd.id, amountMinor: 32000, toAmountMinor: 100000,
      date: '2026-09-05', note: 'wire', fee: { amountMinor: 450 },
    });
    expect(records).toHaveLength(3);
    expect(records[2]).toMatchObject({
      kind: 'expense', accountId: twd.id, amountMinor: -450, categoryId: 'default-fees', date: '2026-09-05', note: 'wire',
    });
    expect(await balance(twd)).toBe(50000 - 32000 - 450);
    // The transfer itself stays two legs; editing it leaves the fee alone.
    expect(await getTransactionGroup(db, records[0].id)).toHaveLength(2);
    expect(await getTransactionInput(db, records[0].id)).not.toHaveProperty('fee');
  });

  it('writes nothing when the fee is invalid', async () => {
    await expect(
      createTransaction(db, {
        kind: 'transfer', fromAccountId: usd.id, toAccountId: usd2.id, amountMinor: 500, date: '2026-09-05', fee: { amountMinor: 0 },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
    expect(await db.transactions.count()).toBe(0);
  });

  it('deletes both legs when either is deleted', async () => {
    const [, inflow] = await createTransaction(db, {
      kind: 'transfer', fromAccountId: usd.id, toAccountId: usd2.id, amountMinor: 500, date: '2026-09-05',
    });
    await deleteTransaction(db, inflow.id);
    expect(await db.transactions.count()).toBe(0);
    expect(await balance(usd)).toBe(100000);
  });

  it('finds the transfer by leg id or transfer id, outflow first', async () => {
    const [outflow, inflow] = await createTransaction(db, {
      kind: 'transfer', fromAccountId: usd.id, toAccountId: usd2.id, amountMinor: 500, date: '2026-09-05',
    });
    const byLeg = await getTransactionGroup(db, inflow.id);
    const byTransfer = await getTransactionGroup(db, outflow.transferId!);
    expect(byLeg.map((t) => t.id)).toEqual([outflow.id, inflow.id]);
    expect(byTransfer).toEqual(byLeg);
  });

  it('turns a transfer into an expense and back', async () => {
    const [outflow] = await createTransaction(db, {
      kind: 'transfer', fromAccountId: usd.id, toAccountId: usd2.id, amountMinor: 500, date: '2026-09-05',
    });

    const [expense] = await updateTransaction(db, outflow.transferId!, {
      kind: 'expense', accountId: usd.id, amountMinor: 500, date: '2026-09-05',
    });
    expect(expense.id).toBe(outflow.id);
    expect(expense).not.toHaveProperty('transferId');
    expect(await db.transactions.count()).toBe(1);
    expect(await balance(usd2)).toBe(0);

    const legs = await updateTransaction(db, expense.id, {
      kind: 'transfer', fromAccountId: usd.id, toAccountId: twd.id, amountMinor: 500, toAmountMinor: 16000, date: '2026-09-05',
    });
    expect(legs.map((t) => t.amountMinor)).toEqual([-500, 16000]);
    expect(await balance(twd)).toBe(66000);
  });
});

describe('archived accounts and categories', () => {
  it('blocks new transactions but still allows editing old ones', async () => {
    const [old] = await createTransaction(db, { kind: 'expense', accountId: usd2.id, amountMinor: 100, date: '2026-09-01' });
    await updateAccount(db, usd2.id, { archived: true });

    await expect(
      createTransaction(db, { kind: 'expense', accountId: usd2.id, amountMinor: 100, date: '2026-09-02' }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_ARCHIVED' });
    await expect(
      updateTransaction(db, old.id, { kind: 'expense', accountId: usd2.id, amountMinor: 80, date: '2026-09-01', note: 'fixed' }),
    ).resolves.toHaveLength(1);
  });

  it('blocks archived categories on new transactions', async () => {
    const category = await createCategory(db, { kind: 'expense', name: 'Old hobby' });
    await updateCategory(db, category.id, { archived: true });
    await expect(
      createTransaction(db, { kind: 'expense', accountId: usd.id, amountMinor: 100, date: '2026-09-01', categoryId: category.id }),
    ).rejects.toMatchObject({ code: 'CATEGORY_ARCHIVED' });
  });
});

describe('getTransactionInput', () => {
  it.each<() => TransactionInput>([
    () => ({
      kind: 'expense', accountId: usd.id, amountMinor: 1320, date: '2026-09-01', categoryId: 'default-dining',
      payee: 'Pret', note: 'lunch', original: { amountMinor: 1200, currency: 'EUR' },
    }),
    () => ({ kind: 'income', accountId: twd.id, amountMinor: 20000, date: '2026-09-01' }),
    () => ({
      kind: 'transfer', fromAccountId: twd.id, toAccountId: usd.id, amountMinor: 32000, toAmountMinor: 100000,
      date: '2026-09-01', note: 'tuition money',
    }),
  ])('recreates the input of transaction %#', async (makeInput) => {
    const input = makeInput();
    const [record] = await createTransaction(db, input);
    expect(await getTransactionInput(db, record.id)).toEqual(input);
  });
});

describe('listTransactions', () => {
  beforeEach(async () => {
    const add = (input: TransactionInput) => createTransaction(db, input);
    await add({ kind: 'expense', accountId: usd.id, amountMinor: 100, date: '2026-08-30', payee: 'Costco', categoryId: 'default-groceries' });
    await add({ kind: 'income', accountId: usd.id, amountMinor: 900, date: '2026-09-01', note: 'Scholarship Sept' });
    await add({ kind: 'expense', accountId: usd2.id, amountMinor: 50, date: '2026-09-03', categoryId: 'default-dining' });
    await add({ kind: 'transfer', fromAccountId: usd.id, toAccountId: usd2.id, amountMinor: 200, date: '2026-09-02' });
  });

  it('lists everything newest first', async () => {
    const rows = await listTransactions(db);
    expect(rows.map((t) => t.date)).toEqual(['2026-09-03', '2026-09-02', '2026-09-02', '2026-09-01', '2026-08-30']);
  });

  it('filters by account, date range, kind, category and text', async () => {
    const dates = async (filter: Parameters<typeof listTransactions>[1]) =>
      (await listTransactions(db, filter)).map((t) => `${t.date}:${t.amountMinor}`);

    expect(await dates({ accountId: usd2.id })).toEqual(['2026-09-03:-50', '2026-09-02:200']);
    expect(await dates({ from: '2026-09-01', to: '2026-09-02' })).toEqual(['2026-09-02:-200', '2026-09-02:200', '2026-09-01:900']);
    expect(await dates({ accountId: usd.id, from: '2026-09-01' })).toEqual(['2026-09-02:-200', '2026-09-01:900']);
    expect(await dates({ kind: 'expense' })).toEqual(['2026-09-03:-50', '2026-08-30:-100']);
    expect(await dates({ categoryIds: ['default-groceries', 'default-dining'] })).toEqual(['2026-09-03:-50', '2026-08-30:-100']);
    expect(await dates({ search: 'costco' })).toEqual(['2026-08-30:-100']);
    expect(await dates({ search: 'SCHOLAR' })).toEqual(['2026-09-01:900']);
    expect(await dates({ search: 'dining', searchCategoryIds: ['default-dining'] })).toEqual(['2026-09-03:-50']);
  });

  it('paginates', async () => {
    const page = await listTransactions(db, { offset: 1, limit: 2 });
    expect(page.map((t) => t.amountMinor)).toEqual([-200, 200]);
  });
});
