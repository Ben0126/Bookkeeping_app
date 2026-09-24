import {
  parseMoney,
  toMoneyInput,
  type Account,
  type CurrencyCode,
  type TransactionInput,
} from '../../core';

export type FormKind = TransactionInput['kind'];

/** Remembers the account last used, to preselect it next time. */
export const LAST_ACCOUNT_PREFERENCE = 'lastAccountId';

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

export type FormField = 'amount' | 'accountId' | 'toAccountId' | 'toAmount' | 'originalAmount';
export type FormErrors = Partial<Record<FormField, string>>;

/** Translation keys for client-side validation messages. */
export const FORM_ERRORS = {
  chooseAccount: 'transactionForm.errors.chooseAccount',
  chooseOtherAccount: 'transactionForm.errors.chooseOtherAccount',
  invalidAmount: 'transactionForm.errors.invalidAmount',
} as const;

export function defaultForeignCurrency(accountCurrency: CurrencyCode | undefined): CurrencyCode {
  return accountCurrency === 'USD' ? 'EUR' : 'USD';
}

export function emptyFormState({ date, accountId }: { date: string; accountId: string }): FormState {
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
    originalCurrency: 'USD',
    originalAmount: '',
  };
}

/** Prefills the form from a stored transaction. */
export function formStateFromInput(input: TransactionInput, accounts: readonly Account[]): FormState {
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
    originalCurrency: input.original?.currency ?? defaultForeignCurrency(accountCurrency),
    originalAmount: input.original ? toMoneyInput(input.original.amountMinor, input.original.currency) : '',
  };
}

/**
 * Validates what the user typed and builds the input for the ledger. Field
 * errors are translation keys; rules that need the database (archived
 * accounts, category kinds, …) are left to the ledger.
 */
export function formStateToInput(
  state: FormState,
  accounts: readonly Account[],
): { input: TransactionInput; errors?: undefined } | { input?: undefined; errors: FormErrors } {
  const errors: FormErrors = {};
  const account = accounts.find((a) => a.id === state.accountId);
  if (!account) errors.accountId = FORM_ERRORS.chooseAccount;

  const amountMinor = account ? positiveAmount(state.amount, account.currency) : null;
  if (account && amountMinor === null) errors.amount = FORM_ERRORS.invalidAmount;

  if (state.kind === 'transfer') {
    const to = accounts.find((a) => a.id === state.toAccountId);
    if (!to || to.id === state.accountId) errors.toAccountId = FORM_ERRORS.chooseOtherAccount;
    let toAmountMinor: number | null = amountMinor;
    if (account && to && to.currency !== account.currency) {
      toAmountMinor = positiveAmount(state.toAmount, to.currency);
      if (toAmountMinor === null) errors.toAmount = FORM_ERRORS.invalidAmount;
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
    const originalMinor = positiveAmount(state.originalAmount, state.originalCurrency);
    if (originalMinor === null) errors.originalAmount = FORM_ERRORS.invalidAmount;
    else original = { amountMinor: originalMinor, currency: state.originalCurrency };
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

function positiveAmount(text: string, currency: CurrencyCode): number | null {
  const minor = parseMoney(text, currency);
  return minor !== null && minor > 0 ? minor : null;
}
