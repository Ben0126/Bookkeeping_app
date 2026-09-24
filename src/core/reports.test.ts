import { describe, expect, it } from 'vitest';
import type { CurrencyCode } from './money';
import { createRateResolver } from './rates';
import { monthlyTotals, netWorth, summarize, type ReportContext } from './reports';
import type { Account, Transaction } from './types';

const account = (id: string, currency: CurrencyCode): Account => ({
  id, name: id, kind: 'bank', currency, openingBalanceMinor: 0, archived: false, createdAt: 0, updatedAt: 0,
});

let seq = 0;
const posting = (fields: Pick<Transaction, 'kind' | 'accountId' | 'amountMinor' | 'date'> & Partial<Transaction>): Transaction => ({
  id: `t${++seq}`, createdAt: 0, updatedAt: 0, ...fields,
});

const accounts = [account('usd', 'USD'), account('twd', 'TWD'), account('gbp', 'GBP')];
const rates = createRateResolver([
  { id: 'a', from: 'USD', to: 'TWD', rate: 30, date: '2026-08-01', updatedAt: 0 },
  { id: 'b', from: 'USD', to: 'TWD', rate: 32, date: '2026-09-01', updatedAt: 0 },
]);
const ctx: ReportContext = { accounts, baseCurrency: 'TWD', rates };

const transactions: Transaction[] = [
  // US$1,000 at 30 → NT$30,000
  posting({ kind: 'income', accountId: 'usd', amountMinor: 100000, date: '2026-08-15', categoryId: 'scholarship' }),
  // US$12.50 at 32 → NT$400
  posting({ kind: 'expense', accountId: 'usd', amountMinor: -1250, date: '2026-09-02', categoryId: 'dining' }),
  posting({ kind: 'expense', accountId: 'twd', amountMinor: -300, date: '2026-09-03', categoryId: 'dining' }),
  // No GBP rate: must not be counted as NT$10.
  posting({ kind: 'expense', accountId: 'gbp', amountMinor: -1000, date: '2026-09-04', categoryId: 'dining' }),
  posting({ kind: 'transfer', accountId: 'usd', amountMinor: -5000, date: '2026-09-05', transferId: 'x' }),
  posting({ kind: 'transfer', accountId: 'twd', amountMinor: 16000, date: '2026-09-05', transferId: 'x' }),
  posting({ kind: 'expense', accountId: 'twd', amountMinor: -5000, date: '2026-09-10' }),
];

describe('summarize', () => {
  it('converts each currency at its own date and leaves out transfers', () => {
    const summary = summarize(transactions, ctx);
    expect(summary).toMatchObject({
      currency: 'TWD',
      incomeMinor: 30000,
      expenseMinor: 5700,
      netMinor: 24300,
      missingRates: ['GBP'],
    });
  });

  it('totals categories, largest first, with uncategorized as null', () => {
    expect(summarize(transactions, ctx).byCategory).toEqual([
      { categoryId: 'scholarship', kind: 'income', totalMinor: 30000, count: 1 },
      { categoryId: null, kind: 'expense', totalMinor: 5000, count: 1 },
      { categoryId: 'dining', kind: 'expense', totalMinor: 700, count: 2 },
    ]);
  });

  it('keeps unconverted totals per currency', () => {
    expect(summarize(transactions, ctx).byCurrency).toEqual({
      USD: { incomeMinor: 100000, expenseMinor: 1250 },
      TWD: { incomeMinor: 0, expenseMinor: 5300 },
    });
  });

  it('limits to a period', () => {
    const summary = summarize(transactions, ctx, { from: '2026-09-01', to: '2026-09-03' });
    expect(summary).toMatchObject({ incomeMinor: 0, expenseMinor: 700 });
  });

  it('reports in another base currency using inverse rates', () => {
    const inUsd = summarize(transactions, { ...ctx, baseCurrency: 'USD' }, { from: '2026-09-03', to: '2026-09-03' });
    // NT$300 / 32 = US$9.375 → US$9.38
    expect(inUsd.expenseMinor).toBe(938);
  });
});

describe('monthlyTotals', () => {
  it('groups converted totals by month', () => {
    expect(monthlyTotals(transactions, ctx)).toEqual({
      months: [
        { month: '2026-08', incomeMinor: 30000, expenseMinor: 0, netMinor: 30000 },
        { month: '2026-09', incomeMinor: 0, expenseMinor: 5700, netMinor: -5700 },
      ],
      missingRates: ['GBP'],
    });
  });
});

describe('netWorth', () => {
  it('adds converted balances and flags currencies without rates', () => {
    const result = netWorth({ usd: 100000, twd: 50000, gbp: 2000 }, ctx, '2026-09-30');
    // US$1,000 at 32 + NT$50,000
    expect(result).toEqual({ totalMinor: 82000, missingRates: ['GBP'] });
  });

  it('ignores zero balances even without a rate', () => {
    expect(netWorth({ twd: 100, gbp: 0 }, ctx, '2026-09-30')).toEqual({ totalMinor: 100, missingRates: [] });
  });
});
