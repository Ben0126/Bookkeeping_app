import { describe, expect, it } from 'vitest';
import type { Account, Category, CurrencyCode, Transaction } from '../../core';
import { transactionsToCsv, type CsvLabels } from './csv';

const account = (id: string, name: string, currency: CurrencyCode): Account => ({
  id, name, kind: 'bank', currency, openingBalanceMinor: 0, archived: false, createdAt: 0, updatedAt: 0,
});
const accounts = [account('usd', 'Chase', 'USD'), account('twd', '台銀', 'TWD')];
const categories: Category[] = [
  { id: 'dining', kind: 'expense', name: 'Dining out', key: 'dining', archived: false, sortOrder: 0, createdAt: 0, updatedAt: 0 },
];
const labels: CsvLabels = {
  headers: ['Date', 'Type', 'Account', 'Currency', 'Amount', 'Fee', 'Category', 'Payee', 'Note', 'Other account', 'Original currency', 'Original amount'],
  kind: (kind) => kind.toUpperCase(),
  categoryName: (category) => category?.name ?? 'Uncategorized',
};
const tx = (fields: Partial<Transaction> & Pick<Transaction, 'id' | 'kind' | 'accountId' | 'amountMinor' | 'date'>): Transaction => ({
  createdAt: 0, updatedAt: 0, ...fields,
});

describe('transactionsToCsv', () => {
  it('writes one row per posting, oldest first, transfer legs together, with plain signed amounts', () => {
    const csv = transactionsToCsv(
      [
        tx({ id: 'b', kind: 'expense', accountId: 'usd', amountMinor: -1250, date: '2026-09-02', categoryId: 'dining', payee: 'Pret', originalAmountMinor: -1100, originalCurrency: 'EUR', feeMinor: -18 }),
        tx({ id: 'f', kind: 'expense', accountId: 'twd', amountMinor: -150, date: '2026-09-01' }),
        tx({ id: 'o', kind: 'transfer', accountId: 'twd', amountMinor: -32000, date: '2026-09-01', transferId: 'x' }),
        tx({ id: 'i', kind: 'transfer', accountId: 'usd', amountMinor: 100000, date: '2026-09-01', transferId: 'x' }),
        tx({ id: 'r', kind: 'expense', accountId: 'usd', amountMinor: 2000, date: '2026-09-03', categoryId: 'dining', note: 'Ben paid back' }),
      ],
      accounts,
      categories,
      labels,
    );
    expect(csv.split('\r\n')).toEqual([
      'Date,Type,Account,Currency,Amount,Fee,Category,Payee,Note,Other account,Original currency,Original amount',
      '2026-09-01,TRANSFER,台銀,TWD,-32000,,,,,Chase,,',
      '2026-09-01,TRANSFER,Chase,USD,1000.00,,,,,台銀,,',
      '2026-09-01,EXPENSE,台銀,TWD,-150,,Uncategorized,,,,,',
      '2026-09-02,EXPENSE,Chase,USD,-12.50,-0.18,Dining out,Pret,,,EUR,-11.00',
      '2026-09-03,REFUND,Chase,USD,20.00,,Dining out,,Ben paid back,,,',
      '',
    ]);
  });

  it('quotes commas, quotes and line breaks, and defuses formulas', () => {
    const csv = transactionsToCsv(
      [tx({ id: 'a', kind: 'expense', accountId: 'usd', amountMinor: -100, date: '2026-09-01', payee: 'Joe\'s, "The" Diner', note: '=HYPERLINK("x")\nline 2' })],
      accounts,
      categories,
      labels,
    );
    const row = csv.split('\r\n').slice(1).join('\r\n');
    expect(row).toContain('"Joe\'s, ""The"" Diner"');
    expect(row).toContain('"\'=HYPERLINK(""x"")\nline 2"');
  });
});
