import { describe, expect, it } from 'vitest';
import type { Account, Transaction } from '../../core';
import { categoryForPayee, frequentEntries, payeeSuggestions } from './quickPicks';

const account = (id: string, archived = false): Account => ({
  id, name: id, kind: 'cash', currency: 'JPY', openingBalanceMinor: 0, archived, createdAt: 0, updatedAt: 0,
});
const accounts = [account('cash'), account('card'), account('old', true)];
let seq = 0;
const tx = (fields: Partial<Transaction>): Transaction => ({
  id: `t${++seq}`, kind: 'expense', accountId: 'cash', amountMinor: -500, date: '2026-09-01', createdAt: 0, updatedAt: 0, ...fields,
});

describe('frequentEntries', () => {
  it('ranks repeated payee, category and account combinations', () => {
    const history = [
      tx({ payee: '7-Eleven', categoryId: 'groceries', date: '2026-09-01' }),
      tx({ payee: '7-eleven ', categoryId: 'groceries', date: '2026-09-03' }),
      tx({ payee: '7-Eleven', categoryId: 'groceries', date: '2026-09-02' }),
      tx({ payee: 'Cafeteria', categoryId: 'dining', date: '2026-09-05' }),
      tx({ payee: 'Cafeteria', categoryId: 'dining', date: '2026-09-06' }),
      tx({ categoryId: 'transport', date: '2026-09-04' }),
      tx({ categoryId: 'transport', date: '2026-09-07' }),
      // Same payee on another account is its own combination.
      tx({ payee: '7-Eleven', categoryId: 'groceries', accountId: 'card' }),
      tx({ kind: 'income', payee: 'Mum', categoryId: 'allowance', amountMinor: 500 }),
      tx({ kind: 'income', payee: 'Mum', categoryId: 'allowance', amountMinor: 500 }),
    ];
    expect(frequentEntries(history, accounts)).toEqual([
      { kind: 'expense', payee: '7-Eleven', categoryId: 'groceries', accountId: 'cash', count: 3 },
      { kind: 'expense', categoryId: 'transport', accountId: 'cash', count: 2 },
      { kind: 'expense', payee: 'Cafeteria', categoryId: 'dining', accountId: 'cash', count: 2 },
      { kind: 'income', payee: 'Mum', categoryId: 'allowance', accountId: 'cash', count: 2 },
    ]);
  });

  it('leaves out one-offs, refunds, transfers, bare entries and archived accounts', () => {
    const history = [
      tx({ payee: 'Once', categoryId: 'dining' }),
      tx({ payee: 'Back', categoryId: 'dining', amountMinor: 500 }),
      tx({ payee: 'Back', categoryId: 'dining', amountMinor: 500 }),
      tx({ kind: 'transfer', amountMinor: -100, transferId: 'x' }),
      tx({ kind: 'transfer', amountMinor: -100, transferId: 'y' }),
      tx({}),
      tx({}),
      tx({ payee: 'Old', accountId: 'old' }),
      tx({ payee: 'Old', accountId: 'old' }),
    ];
    expect(frequentEntries(history, accounts)).toEqual([]);
  });

  it('keeps to the limit', () => {
    const history = ['a', 'b', 'c'].flatMap((payee) => [tx({ payee }), tx({ payee })]);
    expect(frequentEntries(history, accounts, 2)).toHaveLength(2);
  });
});

describe('payeeSuggestions', () => {
  it('lists payees once, most used first, as last typed', () => {
    const history = [
      tx({ payee: 'lawson', date: '2026-09-01' }),
      tx({ payee: 'Lawson', date: '2026-09-02' }),
      tx({ payee: 'Pret', date: '2026-09-03' }),
      tx({ kind: 'transfer', payee: 'Ignored', transferId: 'x' }),
    ];
    expect(payeeSuggestions(history)).toEqual(['Lawson', 'Pret']);
  });
});

describe('categoryForPayee', () => {
  it('picks the category used most with the payee', () => {
    const history = [
      tx({ payee: 'Daiso', categoryId: 'shopping' }),
      tx({ payee: 'daiso', categoryId: 'shopping' }),
      tx({ payee: 'Daiso', categoryId: 'groceries' }),
      tx({ payee: 'Daiso', categoryId: 'refunded', amountMinor: 500 }),
    ];
    expect(categoryForPayee(history, ' DAISO ', 'expense')).toBe('shopping');
    expect(categoryForPayee(history, 'Daiso', 'income')).toBeUndefined();
    expect(categoryForPayee(history, 'Unknown', 'expense')).toBeUndefined();
  });
});
