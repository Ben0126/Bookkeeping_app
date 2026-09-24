import { describe, expect, it } from 'vitest';
import { createRateResolver, type Account, type CurrencyCode, type Transaction, type TransactionInput } from '../../core';
import {
  categoryKindOf,
  chargeMode,
  checkAmount,
  emptyFormState,
  estimateCharge,
  formStateFromInput,
  formStateToInput,
  isFormDirty,
  paymentCurrencyForAccount,
  quoteRate,
  stateForNextEntry,
  suggestAccountId,
  withPaymentCurrency,
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

describe('refunds and fees', () => {
  it('turns a refund into an expense that adds money back', () => {
    expect(formStateToInput(base({ kind: 'refund', amount: '20', categoryId: 'c' }), accounts).input).toEqual({
      kind: 'expense', refund: true, accountId: 'usd', amountMinor: 2000, date: '2026-09-24', categoryId: 'c',
    });
    expect(categoryKindOf('refund')).toBe('expense');
    expect(categoryKindOf('income')).toBe('income');
    expect(categoryKindOf('transfer')).toBeUndefined();
  });

  it('adds a transfer fee in the sending account’s currency', () => {
    const transfer = base({ kind: 'transfer', amount: '100', toAccountId: 'twd', toAmount: '3,200' });
    expect(formStateToInput({ ...transfer, fee: '1.50' }, accounts).input).toMatchObject({ fee: { amountMinor: 150 } });
    expect(formStateToInput({ ...transfer, fee: ' ' }, accounts).input).not.toHaveProperty('fee');
    expect(formStateToInput({ ...transfer, fee: '0' }, accounts).errors).toEqual({ fee: 'amountInvalid' });
    // Fees belong to transfers only.
    expect(formStateToInput(base({ amount: '1', fee: '5' }), accounts).input).not.toHaveProperty('fee');
  });
});

describe('formStateFromInput', () => {
  it.each<TransactionInput>([
    { kind: 'expense', accountId: 'usd', amountMinor: 1250, date: '2026-09-01', categoryId: 'c', payee: 'P', note: 'N', original: { amountMinor: 1100, currency: 'EUR' } },
    { kind: 'expense', accountId: 'twd', amountMinor: 1091, date: '2026-09-01', original: { amountMinor: 5000, currency: 'JPY' }, feeMinor: 16 },
    { kind: 'income', accountId: 'twd', amountMinor: 30000, date: '2026-09-01' },
    { kind: 'expense', refund: true, accountId: 'usd', amountMinor: 2000, date: '2026-09-01', categoryId: 'c' },
    { kind: 'transfer', fromAccountId: 'usd', toAccountId: 'twd', amountMinor: 10000, toAmountMinor: 3200, date: '2026-09-01', note: 'fx' },
  ])('round-trips %j', (input) => {
    expect(formStateToInput(formStateFromInput(input, accounts), accounts)).toEqual({ input });
  });

  it('shows amounts with the currency precision', () => {
    const state = formStateFromInput({ kind: 'expense', accountId: 'usd', amountMinor: 1200, date: '2026-09-01' }, accounts);
    expect(state.amount).toBe('12.00');
  });

  it('keeps a saved charge as typed rather than re-estimating it', () => {
    const state = formStateFromInput(
      { kind: 'expense', accountId: 'twd', amountMinor: 1091, date: '2026-09-01', original: { amountMinor: 5000, currency: 'JPY' }, feeMinor: 16 },
      accounts,
    );
    expect(state).toMatchObject({ foreign: true, manualCharge: true, amount: '1091', cardFee: '16', originalAmount: '5000' });
  });
});

describe('next entry and dirtiness', () => {
  it('keeps kind, account, date and the currency paid in; clears the rest', () => {
    const filled = base({
      kind: 'income', amount: '5', categoryId: 'c', payee: 'P', note: 'N', foreign: true, originalCurrency: 'JPY', originalAmount: '500',
      manualCharge: true, cardFee: '1',
    });
    const next = stateForNextEntry(filled);
    expect(next).toEqual({ ...base({ kind: 'income', foreign: true, originalCurrency: 'JPY' }) });
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

describe('paying in another currency', () => {
  // ¥1 = NT$0.215
  const rates = createRateResolver([{ id: 'r', from: 'JPY', to: 'TWD', rate: 0.215, date: '2026-09-20', updatedAt: 0 }]);
  const card = { ...account('card', 'TWD'), kind: 'credit_card' as const, foreignFeeBps: 150 };
  const cards = [...accounts, card];
  const yen = (patch: Partial<FormState> = {}) =>
    base({ accountId: 'card', foreign: true, originalCurrency: 'JPY', originalAmount: '5,000', categoryId: 'c', ...patch });

  it('estimates the charge with the card’s fee on spending only', () => {
    expect(estimateCharge(yen(), card, rates)).toEqual({ amountMinor: 1091, feeMinor: 16 });
    expect(estimateCharge(yen({ kind: 'refund' }), card, rates)).toEqual({ amountMinor: 1075, feeMinor: 0 });
    expect(estimateCharge(yen(), { ...card, foreignFeeBps: undefined }, rates)).toEqual({ amountMinor: 1075, feeMinor: 0 });
    // Before the first stored rate, the latest one still gives an estimate.
    expect(estimateCharge(yen({ date: '2026-01-01' }), card, rates)?.amountMinor).toBe(1091);
    expect(estimateCharge(yen({ originalAmount: '' }), card, rates)).toBeUndefined();
  });

  it('saves the estimate with its fee and the amount paid', () => {
    expect(formStateToInput(yen(), cards, rates).input).toEqual({
      kind: 'expense', accountId: 'card', amountMinor: 1091, feeMinor: 16, date: '2026-09-24', categoryId: 'c',
      original: { amountMinor: 5000, currency: 'JPY' },
    });
    expect(formStateToInput(yen({ originalAmount: '' }), cards, rates).errors).toEqual({ originalAmount: 'amountRequired' });
  });

  it('asks for the charge when there is no rate, or once the user types it', () => {
    expect(chargeMode(yen(), card, rates)).toBe('estimate');
    expect(chargeMode(yen({ originalCurrency: 'EUR' }), card, rates)).toBe('manual');
    expect(chargeMode(yen({ manualCharge: true }), card, rates)).toBe('manual');
    expect(chargeMode(yen({ kind: 'transfer' }), card, rates)).toBe('none');
    expect(formStateToInput(yen({ originalCurrency: 'EUR' }), cards, rates).errors).toEqual({ amount: 'amountRequired' });
  });

  it('takes a typed charge and fee, which must be smaller than the charge', () => {
    const typed = yen({ manualCharge: true, amount: '1,100', cardFee: '17' });
    expect(formStateToInput(typed, cards, rates).input).toMatchObject({ amountMinor: 1100, feeMinor: 17 });
    expect(formStateToInput({ ...typed, cardFee: '' }, cards, rates).input).not.toHaveProperty('feeMinor');
    expect(formStateToInput({ ...typed, cardFee: '1100' }, cards, rates).errors).toEqual({ cardFee: 'feeTooLarge' });
    // Fees belong to spending.
    expect(formStateToInput({ ...typed, kind: 'income' }, cards, rates).input).not.toHaveProperty('feeMinor');
  });

  it('moves the typed number when switching currency', () => {
    const typedTwd = base({ accountId: 'card', amount: '500' });
    expect(withPaymentCurrency(typedTwd, 'JPY', 'TWD')).toEqual({
      foreign: true, originalCurrency: 'JPY', originalAmount: '500', amount: '', manualCharge: false, cardFee: '',
    });
    expect(withPaymentCurrency(yen(), 'TWD', 'TWD')).toEqual({
      foreign: false, amount: '5,000', originalAmount: '', manualCharge: false, cardFee: '',
    });
    expect(withPaymentCurrency(yen(), 'EUR', 'TWD')).toEqual({ originalCurrency: 'EUR' });
  });

  it('starts another account in the currency it last paid in, until an amount is typed', () => {
    const cash = account('cash', 'JPY');
    expect(paymentCurrencyForAccount(base({}), card, 'JPY')).toBe('JPY');
    expect(paymentCurrencyForAccount(base({}), card, undefined)).toBe('TWD');
    expect(paymentCurrencyForAccount(yen(), cash, undefined)).toBe('JPY');
    expect(paymentCurrencyForAccount(base({ amount: '5' }), cash, 'USD')).toBe('JPY');
  });
});
