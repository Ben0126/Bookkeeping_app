import { beforeEach, describe, expect, it } from 'vitest';
import { addAccount, createTestDb } from '../test/ledgerDb';
import { budgetProgress, deleteBudget, listBudgets, setBudget } from './budgets';
import { createCategory, listCategories, seedDefaultCategories } from './categories';
import type { LedgerDB } from './db';
import { createRateResolver } from './rates';
import { createTransaction } from './transactions';
import type { Account } from './types';

let db: LedgerDB;

beforeEach(async () => {
  db = createTestDb();
  await seedDefaultCategories(db);
});

describe('setBudget', () => {
  it('keeps one budget per category and one overall', async () => {
    const first = await setBudget(db, { categoryId: 'default-dining', amountMinor: 10000, currency: 'TWD' });
    const second = await setBudget(db, { categoryId: 'default-dining', amountMinor: 8000, currency: 'TWD' });
    await setBudget(db, { amountMinor: 30000, currency: 'TWD' });

    expect(second).toMatchObject({ id: first.id, createdAt: first.createdAt, amountMinor: 8000 });
    expect((await listBudgets(db)).map((b) => b.id).sort()).toEqual(['category:default-dining', 'overall']);

    await deleteBudget(db, 'overall');
    expect(await listBudgets(db)).toHaveLength(1);
  });

  it.each([
    [{ categoryId: 'default-salary' }, 'CATEGORY_KIND_MISMATCH'],
    [{ categoryId: 'missing' }, 'NOT_FOUND'],
    [{ amountMinor: 0 }, 'INVALID_AMOUNT'],
    [{ currency: 'BTC' }, 'INVALID_CURRENCY'],
  ])('rejects %j', async (overrides, code) => {
    const input = { categoryId: 'default-dining', amountMinor: 100, currency: 'TWD', ...overrides };
    await expect(setBudget(db, input as never)).rejects.toMatchObject({ code });
  });
});

describe('budgetProgress', () => {
  let usd: Account;
  let twd: Account;

  beforeEach(async () => {
    usd = await addAccount(db, { currency: 'USD' });
    twd = await addAccount(db, { currency: 'TWD' });
  });

  it('counts subcategories, converts currencies and ignores other months', async () => {
    const coffee = await createCategory(db, { kind: 'expense', name: 'Coffee', parentId: 'default-dining' });
    const spend = (accountId: string, amountMinor: number, date: string, categoryId: string) =>
      createTransaction(db, { kind: 'expense', accountId, amountMinor, date, categoryId });
    await spend(twd.id, 2000, '2026-09-01', 'default-dining');
    await spend(usd.id, 500, '2026-09-02', coffee.id); // US$5 → NT$160
    await spend(twd.id, 9999, '2026-08-31', 'default-dining'); // last month
    await spend(twd.id, 7000, '2026-09-03', 'default-rent');

    const dining = await setBudget(db, { categoryId: 'default-dining', amountMinor: 2000, currency: 'TWD' });
    const overall = await setBudget(db, { amountMinor: 20000, currency: 'TWD' });

    const progress = budgetProgress(
      [dining, overall],
      await listCategories(db),
      await db.transactions.toArray(),
      {
        accounts: [usd, twd],
        rates: createRateResolver([{ id: 'r', from: 'USD', to: 'TWD', rate: 32, date: '2026-09-01', updatedAt: 0 }]),
      },
      '2026-09',
    );

    expect(progress.map(({ budget, spentMinor, remainingMinor }) => [budget.id, spentMinor, remainingMinor])).toEqual([
      ['category:default-dining', 2160, -160],
      ['overall', 9160, 10840],
    ]);
  });

  it('counts a fee included in a purchase toward the Fees budget', async () => {
    await createTransaction(db, {
      kind: 'expense', accountId: twd.id, amountMinor: 1091, feeMinor: 16, date: '2026-09-01', categoryId: 'default-dining',
    });
    const dining = await setBudget(db, { categoryId: 'default-dining', amountMinor: 5000, currency: 'TWD' });
    const fees = await setBudget(db, { categoryId: 'default-fees', amountMinor: 100, currency: 'TWD' });
    const overall = await setBudget(db, { amountMinor: 20000, currency: 'TWD' });

    const progress = budgetProgress(
      [dining, fees, overall],
      await listCategories(db),
      await db.transactions.toArray(),
      { accounts: [usd, twd], rates: createRateResolver([]), feeCategoryId: 'default-fees' },
      '2026-09',
    );
    expect(progress.map((p) => [p.budget.id, p.spentMinor])).toEqual([
      ['category:default-dining', 1075],
      ['category:default-fees', 16],
      ['overall', 1091],
    ]);
  });
});
