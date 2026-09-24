import {
  currencyDecimals,
  parseMoney,
  toMoneyInput,
  type Account,
  type CurrencyCode,
  type Transaction,
  type TransactionInput,
} from '../../core';

export type FormKind = TransactionInput['kind'];

/** Remembers the foreign currency last used, e.g. JPY for someone in Japan. */
export const LAST_FOREIGN_CURRENCY_PREFERENCE = 'lastForeignCurrency';

/** Everything the form edits, as the raw strings the inputs hold. */
export interface FormState {
  kind: FormKind;
  amount: string;
  date: string;
  accountId: string;
  toAccountId: string;
  toAmount: string;
  categoryId: string;
  payee: string;
  note: string;
  foreign: boolean;
  originalCurrency: CurrencyCode;
  originalAmount: string;
}

export type FormField = 'accountId' | 'amount' | 'toAccountId' | 'toAmount' | 'originalAmount';

/** Order in which invalid fields get focus. */
export const FORM_FIELDS: readonly FormField[] = ['accountId', 'amount', 'toAccountId', 'toAmount', 'originalAmount'];

/** Codes under `transactionForm.errors` in the translations. */
export type FormErrorCode = 'chooseAccount' | 'chooseOtherAccount' | 'amountRequired' | 'amountInvalid' | 'amountTooPrecise';

export type FormErrors = Partial<Record<FormField, FormErrorCode>>;

export function defaultForeignCurrency(
  accountCurrency: CurrencyCode | undefined,
  remembered?: CurrencyCode,
): CurrencyCode {
  if (remembered && remembered !== accountCurrency) return remembered;
  return accountCurrency === 'USD' ? 'EUR' : 'USD';
}

export function emptyFormState({
  date,
  accountId,
  originalCurrency = 'USD',
}: {
  date: string;
  accountId: string;
  originalCurrency?: CurrencyCode;
}): FormState {
  return {
    kind: 'expense',
    amount: '',
    date,
    accountId,
    toAccountId: '',
    toAmount: '',
    categoryId: '',
    payee: '',
    note: '',
    foreign: false,
    originalCurrency,
    originalAmount: '',
  };
}

/** After "save and add another": keep where and when, clear what. */
export function stateForNextEntry(state: FormState): FormState {
  return {
    ...emptyFormState({ date: state.date, accountId: state.accountId, originalCurrency: state.originalCurrency }),
    kind: state.kind,
    toAccountId: state.toAccountId,
  };
}

export function isFormDirty(state: FormState, baseline: FormState): boolean {
  return (Object.keys(state) as (keyof FormState)[]).some((key) => state[key] !== baseline[key]);
}

/**
 * Which account a new entry should start on: the one the list is filtered
 * to, else the account used most for this kind of entry recently (so one
 * rent payment from the home bank doesn't make the next coffee default to
 * it), else the first account.
 */
export function suggestAccountId({
  kind,
  accounts,
  recent,
  filterAccountId,
}: {
  kind: FormKind;
  accounts: readonly Account[];
  recent: readonly Transaction[];
  filterAccountId?: string;
}): string {
  const active = accounts.filter((a) => !a.archived);
  if (filterAccountId && active.some((a) => a.id === filterAccountId)) return filterAccountId;

  const counts = new Map<string, number>();
  for (const t of recent) {
    if (t.kind !== kind || (kind === 'transfer' && t.amountMinor > 0)) continue;
    counts.set(t.accountId, (counts.get(t.accountId) ?? 0) + 1);
  }
  let best: Account | undefined;
  for (const account of active) {
    if ((counts.get(account.id) ?? 0) > (best ? (counts.get(best.id) ?? 0) : 0)) best = account;
  }
  return (best ?? active[0])?.id ?? '';
}

/**
 * States a transfer's rate the way people quote it: in the base currency
 * when one side is it (1 JPY ≈ 0.21 TWD, 1 USD ≈ 32 TWD), otherwise as a
 * number above 1. `rate` is units of `to` per unit of `from`.
 */
export function quoteRate(
  from: CurrencyCode,
  to: CurrencyCode,
  rate: number,
  base: CurrencyCode,
): { from: CurrencyCode; to: CurrencyCode; rate: number } {
  const inverted = { from: to, to: from, rate: 1 / rate };
  if (to === base) return { from, to, rate };
  if (from === base) return inverted;
  return rate >= 1 ? { from, to, rate } : inverted;
}

/** Prefills the form from a stored transaction. */
export function formStateFromInput(
  input: TransactionInput,
  accounts: readonly Account[],
  rememberedForeign?: CurrencyCode,
): FormState {
  const currencyOf = (id: string) => accounts.find((account) => account.id === id)?.currency ?? 'USD';

  if (input.kind === 'transfer') {
    return {
      ...emptyFormState({ date: input.date, accountId: input.fromAccountId }),
      kind: 'transfer',
      amount: toMoneyInput(input.amountMinor, currencyOf(input.fromAccountId)),
      toAccountId: input.toAccountId,
      toAmount: toMoneyInput(input.toAmountMinor ?? input.amountMinor, currencyOf(input.toAccountId)),
      note: input.note ?? '',
    };
  }
  const accountCurrency = currencyOf(input.accountId);
  return {
    ...emptyFormState({ date: input.date, accountId: input.accountId }),
    kind: input.kind,
    amount: toMoneyInput(input.amountMinor, accountCurrency),
    categoryId: input.categoryId ?? '',
    payee: input.payee ?? '',
    note: input.note ?? '',
    foreign: input.original !== undefined,
    originalCurrency: input.original?.currency ?? defaultForeignCurrency(accountCurrency, rememberedForeign),
    originalAmount: input.original ? toMoneyInput(input.original.amountMinor, input.original.currency) : '',
  };
}

/**
 * Validates what the user typed and builds the input for the ledger. Rules
 * that need the database (archived accounts, category kinds, …) are left to
 * the ledger.
 */
export function formStateToInput(
  state: FormState,
  accounts: readonly Account[],
): { input: TransactionInput; errors?: undefined } | { input?: undefined; errors: FormErrors } {
  const errors: FormErrors = {};
  const account = accounts.find((a) => a.id === state.accountId);
  if (!account) errors.accountId = 'chooseAccount';

  const amount = account ? checkAmount(state.amount, account.currency) : null;
  if (amount && 'error' in amount) errors.amount = amount.error;
  const amountMinor = amount && 'minor' in amount ? amount.minor : null;

  if (state.kind === 'transfer') {
    const to = accounts.find((a) => a.id === state.toAccountId);
    if (!to || to.id === state.accountId) errors.toAccountId = 'chooseOtherAccount';
    let toAmountMinor = amountMinor;
    if (account && to && to.currency !== account.currency) {
      const toAmount = checkAmount(state.toAmount, to.currency);
      if ('error' in toAmount) errors.toAmount = toAmount.error;
      toAmountMinor = 'minor' in toAmount ? toAmount.minor : null;
    }
    if (Object.keys(errors).length > 0 || amountMinor === null || toAmountMinor === null) return { errors };
    return {
      input: {
        kind: 'transfer',
        fromAccountId: state.accountId,
        toAccountId: state.toAccountId,
        amountMinor,
        toAmountMinor,
        date: state.date,
        ...(state.note.trim() ? { note: state.note } : {}),
      },
    };
  }

  let original: { amountMinor: number; currency: CurrencyCode } | undefined;
  if (state.foreign) {
    const originalAmount = checkAmount(state.originalAmount, state.originalCurrency);
    if ('error' in originalAmount) errors.originalAmount = originalAmount.error;
    else original = { amountMinor: originalAmount.minor, currency: state.originalCurrency };
  }
  if (Object.keys(errors).length > 0 || amountMinor === null) return { errors };
  return {
    input: {
      kind: state.kind,
      accountId: state.accountId,
      amountMinor,
      date: state.date,
      ...(state.categoryId ? { categoryId: state.categoryId } : {}),
      ...(state.payee.trim() ? { payee: state.payee } : {}),
      ...(state.note.trim() ? { note: state.note } : {}),
      ...(original && { original }),
    },
  };
}

/** A positive amount in minor units, or why the text isn't one. */
export function checkAmount(text: string, currency: CurrencyCode): { minor: number } | { error: FormErrorCode } {
  const trimmed = text.trim();
  if (trimmed === '') return { error: 'amountRequired' };
  const minor = parseMoney(trimmed, currency);
  if (minor !== null) return minor > 0 ? { minor } : { error: 'amountInvalid' };
  const fraction = /^[\d,\s]*\.(\d+)$/.exec(trimmed)?.[1];
  if (fraction && fraction.replace(/0+$/, '').length > currencyDecimals(currency)) {
    return { error: 'amountTooPrecise' };
  }
  return { error: 'amountInvalid' };
}
