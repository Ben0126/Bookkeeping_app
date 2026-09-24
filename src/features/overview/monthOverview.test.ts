import { describe, expect, it } from 'vitest';
import type { Account, Budget, Category, CurrencyCode, ExchangeRate, Transaction } from '../../core';
import { buildMonthOverview, daysInMonth } from './monthOverview';

const account = (id: string, currency: CurrencyCode): Account => ({
  id, name: id, kind: 'bank', currency, openingBalanceMinor: 0, archived: false, createdAt: 0, updatedAt: 0,
});
const category = (id: string): Category => ({
  id, kind: 'expense', name: id, archived: false, sortOrder: 0, createdAt: 0, updatedAt: 0,
});
let seq = 0;
const expense = (accountId: string, amountMinor: number, date: string, categoryId?: string): Transaction => ({
  id: `t${++seq}`, kind: 'expense', accountId, amountMinor: -amountMinor, date, createdAt: 0, updatedAt: 0,
  ...(categoryId && { categoryId }),
});
const rate = (to: CurrencyCode, value: number): ExchangeRate => ({
  id: `TWD:${to}:2026-09-01`, from: 'TWD', to, rate: value, date: '2026-09-01', updatedAt: 0,
});

const accounts = [account('twd', 'TWD'), account('jpy', 'JPY'), account('usd', 'USD')];
const categories = [category('food'), category('rent')];
// NT$1 = ¥5, NT$1 = US$0.03125 (US$1 = NT$32)
const rates = [rate('JPY', 5), rate('USD', 0.03125)];
const transactions = [
  expense('jpy', 50000, '2026-09-03', 'food'), // ¥50,000 = NT$10,000
  expense('twd', 3000, '2026-09-05', 'food'),
  expense('usd', 25000, '2026-09-01', 'rent'), // $250 = NT$8,000
  expense('jpy', 99999, '2026-08-31', 'food'), // last month
];

const build = (overrides: Partial<Parameters<typeof buildMonthOverview>[0]> = {}) =>
  buildMonthOverview({
    month: '2026-09', today: '2026-09-21', transactions, accounts, categories, budgets: [], rates, baseCurrency: 'TWD',
    ...overrides,
  });

describe('buildMonthOverview', () => {
  it('converts every currency into the base currency', () => {
    const overview = build();
    expect(overview.summary.expenseMinor).toBe(21000);
    expect(overview.native).toEqual({
      JPY: { incomeMinor: 0, expenseMinor: 50000 },
      TWD: { incomeMinor: 0, expenseMinor: 3000 },
      USD: { incomeMinor: 0, expenseMinor: 25000 },
    });
    expect(overview.missingRates).toEqual([]);
  });

  it('ranks categories by converted spending with their share', () => {
    expect(build().categories).toEqual([
      { categoryId: 'food', totalMinor: 13000, count: 2, share: 13000 / 21000 },
      { categoryId: 'rent', totalMinor: 8000, count: 1, share: 8000 / 21000 },
    ]);
  });

  it('works out what is left per day in the current month', () => {
    const budgets: Budget[] = [{ id: 'overall', amountMinor: 100000, currency: 'JPY', createdAt: 0, updatedAt: 0 }];
    const { budget } = build({ budgets });
    // Spent NT$21,000 = ¥105,000 against ¥100,000.
    expect(budget).toMatchObject({ spentMinor: 105000, remainingMinor: -5000, daysLeft: 10, perDayMinor: 0 });

    const roomy = build({ budgets: [{ ...budgets[0], amountMinor: 205000 }] });
    expect(roomy.budget).toMatchObject({ remainingMinor: 100000, daysLeft: 10, perDayMinor: 10000 });
  });

  it('skips the per-day figure for past months', () => {
    const budgets: Budget[] = [{ id: 'overall', amountMinor: 50000, currency: 'TWD', createdAt: 0, updatedAt: 0 }];
    const { budget } = build({ budgets, today: '2026-10-02' });
    expect(budget?.spentMinor).toBe(21000);
    expect(budget).not.toHaveProperty('perDayMinor');
  });

  it('flags currencies it could not convert', () => {
    const overview = build({ rates: [rate('USD', 0.03125)] });
    expect(overview.missingRates).toEqual(['JPY']);
    expect(overview.summary.expenseMinor).toBe(11000);
    expect(overview.native.JPY?.expenseMinor).toBe(50000);
  });
});

describe('daysInMonth', () => {
  it.each([
    ['2026-02', 28],
    ['2028-02', 29],
    ['2026-09', 30],
    ['2026-12', 31],
  ])('%s has %d days', (month, days) => {
    expect(daysInMonth(month)).toBe(days);
  });
});
