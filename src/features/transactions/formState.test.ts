import { describe, expect, it } from 'vitest';
import type { Account, CurrencyCode, Transaction, TransactionInput } from '../../core';
import {
  checkAmount,
  emptyFormState,
  formStateFromInput,
  formStateToInput,
  isFormDirty,
  quoteRate,
  stateForNextEntry,
  suggestAccountId,
  type FormState,
} from './formState';

const account = (id: string, currency: CurrencyCode, archived = false): Account => ({
  id, name: id, kind: 'bank', currency, openingBalanceMinor: 0, archived, createdAt: 0, updatedAt: 0,
});
const accounts = [account('usd', 'USD'), account('usd2', 'USD'), account('twd', 'TWD')];
const base = (patch: Partial<FormState>): FormState => ({ ...emptyFormState({ date: '2026-09-24', accountId: 'usd' }), ...patch });

describe('checkAmount', () => {
  it.each([
    ['', 'USD', { error: 'amountRequired' }],
    ['  ', 'USD', { error: 'amountRequired' }],
    ['abc', 'USD', { error: 'amountInvalid' }],
    ['0', 'USD', { error: 'amountInvalid' }],
    ['-5', 'USD', { error: 'amountInvalid' }],
    ['1.234', 'USD', { error: 'amountTooPrecise' }],
    ['12.5', 'TWD', { error: 'amountTooPrecise' }],
    ['12.50', 'USD', { minor: 1250 }],
    ['1,200.00', 'TWD', { minor: 1200 }],
  ] as const)('%j %s → %j', (text, currency, expected) => {
    expect(checkAmount(text, currency)).toEqual(expected);
  });
});

describe('formStateToInput', () => {
  it('builds an expense with optional fields left out', () => {
    expect(formStateToInput(base({ amount: '12.5', note: '  ' }), accounts)).toEqual({
      input: { kind: 'expense', accountId: 'usd', amountMinor: 1250, date: '2026-09-24' },
    });
  });

  it('includes category, payee, note and the foreign amount', () => {
    const { input } = formStateToInput(
      base({
        kind: 'income', amount: '1,000', categoryId: 'c1', payee: 'Uni', note: 'Sept',
        foreign: true, originalCurrency: 'EUR', originalAmount: '920',
      }),
      accounts,
    );
    expect(input).toEqual({
      kind: 'income', accountId: 'usd', amountMinor: 100000, date: '2026-09-24',
      categoryId: 'c1', payee: 'Uni', note: 'Sept', original: { amountMinor: 92000, currency: 'EUR' },
    });
  });

  it.each([
    [{ amount: '' }, { amount: 'amountRequired' }],
    [{ amount: '1.234' }, { amount: 'amountTooPrecise' }],
    [{ accountId: '' }, { accountId: 'chooseAccount' }],
    [{ foreign: true, originalAmount: 'x' }, { originalAmount: 'amountInvalid' }],
  ] as const)('flags %j', (patch, errors) => {
    expect(formStateToInput(base({ amount: '10', ...patch }), accounts).errors).toEqual(errors);
  });

  it('uses the sent amount for both sides of a same-currency transfer', () => {
    expect(formStateToInput(base({ kind: 'transfer', amount: '50', toAccountId: 'usd2', toAmount: '999' }), accounts)).toEqual({
      input: { kind: 'transfer', fromAccountId: 'usd', toAccountId: 'usd2', amountMinor: 5000, toAmountMinor: 5000, date: '2026-09-24' },
    });
  });

  it('requires the received amount across currencies, in that currency', () => {
    expect(formStateToInput(base({ kind: 'transfer', amount: '100', toAccountId: 'twd' }), accounts).errors)
      .toEqual({ toAmount: 'amountRequired' });
    expect(formStateToInput(base({ kind: 'transfer', amount: '100', toAccountId: 'twd', toAmount: '3200.5' }), accounts).errors)
      .toEqual({ toAmount: 'amountTooPrecise' });
    expect(formStateToInput(base({ kind: 'transfer', amount: '100', toAccountId: 'twd', toAmount: '3,200' }), accounts).input)
      .toMatchObject({ amountMinor: 10000, toAmountMinor: 3200 });
  });

  it('rejects a transfer to the same or no account', () => {
    expect(formStateToInput(base({ kind: 'transfer', amount: '1', toAccountId: 'usd' }), accounts).errors)
      .toEqual({ toAccountId: 'chooseOtherAccount' });
    expect(formStateToInput(base({ kind: 'transfer', amount: '1' }), accounts).errors)
      .toEqual({ toAccountId: 'chooseOtherAccount' });
  });
});

describe('formStateFromInput', () => {
  it.each<TransactionInput>([
    { kind: 'expense', accountId: 'usd', amountMinor: 1250, date: '2026-09-01', categoryId: 'c', payee: 'P', note: 'N', original: { amountMinor: 1100, currency: 'EUR' } },
    { kind: 'income', accountId: 'twd', amountMinor: 30000, date: '2026-09-01' },
    { kind: 'transfer', fromAccountId: 'usd', toAccountId: 'twd', amountMinor: 10000, toAmountMinor: 3200, date: '2026-09-01', note: 'fx' },
  ])('round-trips %j', (input) => {
    expect(formStateToInput(formStateFromInput(input, accounts), accounts)).toEqual({ input });
  });

  it('shows amounts with the currency precision and the remembered foreign currency', () => {
    const state = formStateFromInput({ kind: 'expense', accountId: 'usd', amountMinor: 1200, date: '2026-09-01' }, accounts, 'JPY');
    expect(state.amount).toBe('12.00');
    expect(state.originalCurrency).toBe('JPY');
  });
});

describe('next entry and dirtiness', () => {
  it('keeps kind, account, date and foreign currency; clears the rest', () => {
    const filled = base({ kind: 'income', amount: '5', categoryId: 'c', payee: 'P', note: 'N', foreign: true, originalCurrency: 'JPY', originalAmount: '500' });
    const next = stateForNextEntry(filled);
    expect(next).toEqual({ ...base({ kind: 'income', originalCurrency: 'JPY' }) });
    expect(isFormDirty(next, next)).toBe(false);
    expect(isFormDirty(filled, next)).toBe(true);
  });
});

describe('suggestAccountId', () => {
  const tx = (accountId: string, kind: Transaction['kind'] = 'expense', amountMinor = -100): Transaction => ({
    id: Math.random().toString(), kind, accountId, amountMinor, date: '2026-09-01', createdAt: 0, updatedAt: 0,
  });

  it('prefers the filtered account', () => {
    expect(suggestAccountId({ kind: 'expense', accounts, recent: [tx('usd')], filterAccountId: 'twd' })).toBe('twd');
  });

  it('picks the account used most for that kind', () => {
    const recent = [tx('usd2'), tx('usd2'), tx('usd'), tx('twd', 'income', 100), tx('twd', 'income', 100), tx('twd', 'income', 100)];
    expect(suggestAccountId({ kind: 'expense', accounts, recent })).toBe('usd2');
    expect(suggestAccountId({ kind: 'income', accounts, recent })).toBe('twd');
  });

  it('skips archived accounts and falls back to the first active one', () => {
    const withArchived = [account('old', 'USD', true), ...accounts];
    expect(suggestAccountId({ kind: 'expense', accounts: withArchived, recent: [tx('old'), tx('old')] })).toBe('usd');
    expect(suggestAccountId({ kind: 'expense', accounts: [], recent: [] })).toBe('');
  });
});

describe('quoteRate', () => {
  it('quotes in the base currency when one side is it', () => {
    expect(quoteRate('USD', 'TWD', 32, 'TWD')).toEqual({ from: 'USD', to: 'TWD', rate: 32 });
    expect(quoteRate('TWD', 'USD', 1 / 32, 'TWD')).toEqual({ from: 'USD', to: 'TWD', rate: 32 });
    expect(quoteRate('TWD', 'JPY', 4.65, 'TWD')).toMatchObject({ from: 'JPY', to: 'TWD' });
  });

  it('otherwise uses the direction above 1', () => {
    expect(quoteRate('EUR', 'USD', 1.1, 'TWD')).toEqual({ from: 'EUR', to: 'USD', rate: 1.1 });
    expect(quoteRate('USD', 'EUR', 1 / 1.1, 'TWD')).toMatchObject({ from: 'EUR', to: 'USD' });
  });
});
