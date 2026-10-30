import { describe, expect, it } from 'vitest';
import type { Account, Category, CurrencyCode, ExchangeRate, Transaction } from '../../core';
import { buildPeriodOverview } from './periodOverview';
import { periodContaining } from './periods';

const account = (id: string, currency: CurrencyCode): Account => ({
  id, name: id, kind: 'bank', currency, openingBalanceMinor: 0, archived: false, createdAt: 0, updatedAt: 0,
});
const category = (id: string, kind: Category['kind'] = 'expense'): Category => ({
  id, kind, name: id, archived: false, sortOrder: 0, createdAt: 0, updatedAt: 0,
});
let seq = 0;
const entry = (kind: 'expense' | 'income', accountId: string, amountMinor: number, date: string, categoryId: string): Transaction => ({
  id: `t${++seq}`, kind, accountId, amountMinor: kind === 'income' ? amountMinor : -amountMinor, date, categoryId,
  createdAt: 0, updatedAt: 0,
});

const accounts = [account('twd', 'TWD'), account('jpy', 'JPY')];
const categories = [category('food'), category('rent'), category('allowance', 'income')];
// NT$1 = ¥5
const rates: ExchangeRate[] = [{ id: 'TWD:JPY:2026-01-01', from: 'TWD', to: 'JPY', rate: 5, date: '2026-01-01', updatedAt: 0 }];
const transactions = [
  entry('expense', 'jpy', 50000, '2026-09-03', 'rent'), // NT$10,000
  entry('expense', 'jpy', 5000, '2026-09-10', 'food'), // NT$1,000
  entry('expense', 'twd', 2000, '2026-10-02', 'food'),
  entry('income', 'twd', 30000, '2026-09-01', 'allowance'),
  entry('expense', 'twd', 99999, '2026-08-31', 'food'), // the semester before
];

const build = (today = '2026-10-15') =>
  buildPeriodOverview({
    period: periodContaining('semester', '2026-10', 9),
    today, transactions, accounts, categories, rates, baseCurrency: 'TWD',
  });

describe('buildPeriodOverview', () => {
  it('totals the period in the base currency', () => {
    const overview = build();
    expect(overview.summary.expenseMinor).toBe(13000);
    expect(overview.summary.incomeMinor).toBe(30000);
    expect(overview.native).toEqual({
      JPY: { incomeMinor: 0, expenseMinor: 55000 },
      TWD: { incomeMinor: 30000, expenseMinor: 2000 },
    });
  });

  it('lists every month of the period, empty ones too', () => {
    expect(build().months).toEqual([
      { month: '2026-09', expenseMinor: 11000, incomeMinor: 30000 },
      { month: '2026-10', expenseMinor: 2000, incomeMinor: 0 },
      { month: '2026-11', expenseMinor: 0, incomeMinor: 0 },
      { month: '2026-12', expenseMinor: 0, incomeMinor: 0 },
      { month: '2027-01', expenseMinor: 0, incomeMinor: 0 },
      { month: '2027-02', expenseMinor: 0, incomeMinor: 0 },
    ]);
  });

  it('averages spending over the months so far', () => {
    expect(build().monthsSoFar).toBe(2);
    expect(build().monthlyAverageMinor).toBe(6500);
    expect(build('2027-05-01').monthlyAverageMinor).toBe(Math.round(13000 / 6));
    expect(build('2026-08-01').monthlyAverageMinor).toBeUndefined();
  });

  it('ranks categories with their month-by-month trend', () => {
    expect(build().categories).toEqual([
      { categoryId: 'rent', totalMinor: 10000, count: 1, share: 10000 / 13000, byMonth: [10000, 0, 0, 0, 0, 0] },
      { categoryId: 'food', totalMinor: 3000, count: 2, share: 3000 / 13000, byMonth: [1000, 2000, 0, 0, 0, 0] },
    ]);
  });
});
