import { describe, expect, it } from 'vitest';
import type { Account, CurrencyCode, TransactionInput } from '../../core';
import { emptyFormState, FORM_ERRORS, formStateFromInput, formStateToInput, type FormState } from './formState';

const account = (id: string, currency: CurrencyCode): Account => ({
  id, name: id, kind: 'bank', currency, openingBalanceMinor: 0, archived: false, createdAt: 0, updatedAt: 0,
});
const accounts = [account('usd', 'USD'), account('usd2', 'USD'), account('twd', 'TWD')];
const base = (patch: Partial<FormState>): FormState => ({ ...emptyFormState({ date: '2026-09-24', accountId: 'usd' }), ...patch });

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
    [{ amount: '' }, 'amount'],
    [{ amount: '0' }, 'amount'],
    [{ amount: '-5' }, 'amount'],
    [{ amount: '1.234' }, 'amount'],
    [{ accountId: '' }, 'accountId'],
    [{ foreign: true, originalAmount: 'x' }, 'originalAmount'],
  ] as const)('flags %j', (patch, field) => {
    const { errors } = formStateToInput(base({ amount: '10', ...patch }), accounts);
    expect(errors).toHaveProperty(field);
  });

  it('uses the sent amount for both sides of a same-currency transfer', () => {
    expect(formStateToInput(base({ kind: 'transfer', amount: '50', toAccountId: 'usd2', toAmount: '999' }), accounts)).toEqual({
      input: { kind: 'transfer', fromAccountId: 'usd', toAccountId: 'usd2', amountMinor: 5000, toAmountMinor: 5000, date: '2026-09-24' },
    });
  });

  it('requires the received amount across currencies, in that currency', () => {
    const missing = formStateToInput(base({ kind: 'transfer', amount: '100', toAccountId: 'twd' }), accounts);
    expect(missing.errors).toEqual({ toAmount: FORM_ERRORS.invalidAmount });

    const tooPrecise = formStateToInput(base({ kind: 'transfer', amount: '100', toAccountId: 'twd', toAmount: '3200.5' }), accounts);
    expect(tooPrecise.errors).toEqual({ toAmount: FORM_ERRORS.invalidAmount });

    const ok = formStateToInput(base({ kind: 'transfer', amount: '100', toAccountId: 'twd', toAmount: '3,200' }), accounts);
    expect(ok.input).toMatchObject({ amountMinor: 10000, toAmountMinor: 3200 });
  });

  it('rejects a transfer to the same or no account', () => {
    expect(formStateToInput(base({ kind: 'transfer', amount: '1', toAccountId: 'usd' }), accounts).errors)
      .toEqual({ toAccountId: FORM_ERRORS.chooseOtherAccount });
    expect(formStateToInput(base({ kind: 'transfer', amount: '1' }), accounts).errors)
      .toEqual({ toAccountId: FORM_ERRORS.chooseOtherAccount });
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

  it('shows amounts with the currency precision', () => {
    const state = formStateFromInput({ kind: 'expense', accountId: 'usd', amountMinor: 1200, date: '2026-09-01' }, accounts);
    expect(state.amount).toBe('12.00');
  });
});
