import {
  convertMinor,
  currencyDecimals,
  parseMoney,
  roundHalfAwayFromZero,
  toMoneyInput,
  type Account,
  type CategoryKind,
  type CurrencyCode,
  type RateResolver,
  type Transaction,
  type TransactionInput,
  type TransactionKind,
} from '../../core';

/** A refund is an expense with a positive amount; the form offers it as its own choice. */
export type FormKind = 'expense' | 'income' | 'refund' | 'transfer';

/** The kind of category an entry of this kind takes; transfers have none. */
export function categoryKindOf(kind: FormKind): CategoryKind | undefined {
  if (kind === 'transfer') return undefined;
  return kind === 'income' ? 'income' : 'expense';
}

/** Everything the form edits, as the raw strings the inputs hold. */
export interface FormState {
  kind: FormKind;
  amount: string;
  date: string;
  accountId: string;
  toAccountId: string;
  toAmount: string;
  /** Transfers, when creating: a fee charged on top, saved as its own expense. */
  fee: string;
  categoryId: string;
  payee: string;
  note: string;
  /**
   * Paid in `originalCurrency` rather than the account's currency, e.g. ¥5,000
   * on a TWD card. The typed amount is then `originalAmount`, and `amount` is
   * what the account was charged.
   */
  foreign: boolean;
  originalCurrency: CurrencyCode;
  originalAmount: string;
  /**
   * When paid in another currency: the charge is typed in (e.g. from the
   * statement) instead of estimated from exchange rates and the card's fee.
   */
  manualCharge: boolean;
  /** With `manualCharge`, expenses only: the part of `amount` that is the card's fee. */
  cardFee: string;
  /** Income and expenses, when creating: repeat on this day every month. */
  monthly: boolean;
}

export type FormField = 'accountId' | 'amount' | 'toAccountId' | 'toAmount' | 'fee' | 'originalAmount' | 'cardFee';

/** Order in which invalid fields get focus, top to bottom. */
export const FORM_FIELDS: readonly FormField[] = [
  'accountId',
  'originalAmount',
  'amount',
  'cardFee',
  'toAccountId',
  'toAmount',
  'fee',
];

/** Codes under `transactionForm.errors` in the translations. */
export type FormErrorCode =
  | 'chooseAccount'
  | 'chooseOtherAccount'
  | 'amountRequired'
  | 'amountInvalid'
  | 'amountTooPrecise'
  | 'feeTooLarge';

export type FormErrors = Partial<Record<FormField, FormErrorCode>>;

/** Rates for a date in the past can be missing; an estimate then uses the latest known rate. */
const LATEST = '9999-12-31';

/**
 * How the charge to the account is worked out when paying in another
 * currency: estimated from exchange rates, or typed in. Without a rate for
 * the pair, it has to be typed in.
 */
export function chargeMode(
  state: FormState,
  account: Account | undefined,
  rates: RateResolver | undefined,
): 'none' | 'estimate' | 'manual' {
  if (!state.foreign || state.kind === 'transfer' || !account) return 'none';
  if (state.manualCharge) return 'manual';
  return rateFor(state, account, rates) === undefined ? 'manual' : 'estimate';
}

function rateFor(state: FormState, account: Account, rates: RateResolver | undefined): number | undefined {
  if (!rates) return undefined;
  return rates(state.originalCurrency, account.currency, state.date) ?? rates(state.originalCurrency, account.currency, LATEST);
}

export interface ChargeEstimate {
  /** What the account is charged in total, fee included, in its minor units. */
  amountMinor: number;
  /** The card's foreign transaction fee within it (0 without a fee rate, and for income and refunds). */
  feeMinor: number;
}

/**
 * What paying `originalAmount` in another currency likely costs the account:
 * converted at the day's rate, plus the card's fee on spending
 * (¥5,000 → NT$1,075 + 1.5% = NT$1,091). Banks settle days later at their
 * own rate, so the statement can differ slightly.
 */
export function estimateCharge(
  state: FormState,
  account: Account | undefined,
  rates: RateResolver | undefined,
): ChargeEstimate | undefined {
  if (!account || chargeMode(state, account, rates) === 'none') return undefined;
  const original = parseMoney(state.originalAmount, state.originalCurrency);
  const rate = rateFor(state, account, rates);
  if (original === null || original <= 0 || rate === undefined) return undefined;
  const converted = convertMinor(original, state.originalCurrency, account.currency, rate);
  const feeBps = state.kind === 'expense' ? (account.foreignFeeBps ?? 0) : 0;
  const feeMinor = roundHalfAwayFromZero((converted * feeBps) / 10_000);
  return converted > 0 ? { amountMinor: converted + feeMinor, feeMinor } : undefined;
}

/**
 * Switches the currency the amount is typed in. The typed number stays in
 * the amount field; picking the account's own currency ends paying in
 * another currency.
 */
export function withPaymentCurrency(
  state: FormState,
  currency: CurrencyCode,
  accountCurrency: CurrencyCode,
): Partial<FormState> {
  const typed = state.foreign ? state.originalAmount : state.amount;
  if (currency === accountCurrency) {
    return { foreign: false, amount: typed, originalAmount: '', manualCharge: false, cardFee: '' };
  }
  return state.foreign
    ? { originalCurrency: currency }
    : { foreign: true, originalCurrency: currency, originalAmount: typed, amount: '', manualCharge: false, cardFee: '' };
}

/**
 * The currency to type in after choosing another account: once an amount is
 * typed it keeps its currency (a ¥ amount stays ¥; an amount in the old
 * account's currency moves to the new one's); before that, the currency last
 * used with the account (JPY for a Taiwanese card used in Japan).
 */
export function paymentCurrencyForAccount(
  state: FormState,
  account: Account,
  remembered: CurrencyCode | undefined,
): CurrencyCode {
  const typed = (state.foreign ? state.originalAmount : state.amount).trim() !== '';
  if (typed) return state.foreign ? state.originalCurrency : account.currency;
  return remembered ?? account.currency;
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
    fee: '',
    categoryId: '',
    payee: '',
    note: '',
    foreign: false,
    originalCurrency,
    originalAmount: '',
    manualCharge: false,
    cardFee: '',
    monthly: false,
  };
}

/** After "save and add another": keep where, when and in which currency; clear what. */
export function stateForNextEntry(state: FormState): FormState {
  return {
    ...emptyFormState({ date: state.date, accountId: state.accountId, originalCurrency: state.originalCurrency }),
    kind: state.kind,
    toAccountId: state.toAccountId,
    foreign: state.foreign,
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
  kind: TransactionKind;
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

/** Prefills the form from a stored transaction. A saved charge is kept as typed, not re-estimated. */
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
    kind: input.refund ? 'refund' : input.kind,
    amount: toMoneyInput(input.amountMinor, accountCurrency),
    categoryId: input.categoryId ?? '',
    payee: input.payee ?? '',
    note: input.note ?? '',
    foreign: input.original !== undefined,
    originalCurrency: input.original?.currency ?? accountCurrency,
    originalAmount: input.original ? toMoneyInput(input.original.amountMinor, input.original.currency) : '',
    manualCharge: input.original !== undefined,
    cardFee: input.feeMinor ? toMoneyInput(input.feeMinor, accountCurrency) : '',
  };
}

/**
 * Validates what the user typed and builds the input for the ledger. Rules
 * that need the database (archived accounts, category kinds, …) are left to
 * the ledger. `monthly` is left to the caller. `rates` estimate the charge
 * for amounts paid in another currency.
 */
export function formStateToInput(
  state: FormState,
  accounts: readonly Account[],
  rates?: RateResolver,
): { input: TransactionInput; errors?: undefined } | { input?: undefined; errors: FormErrors } {
  const errors: FormErrors = {};
  const account = accounts.find((a) => a.id === state.accountId);
  if (!account) errors.accountId = 'chooseAccount';
  const mode = chargeMode(state, account, rates);

  // An estimated charge comes from the amount paid, so only that is checked.
  const amount = account && mode !== 'estimate' ? checkAmount(state.amount, account.currency) : null;
  if (amount && 'error' in amount) errors.amount = amount.error;
  let amountMinor = amount && 'minor' in amount ? amount.minor : null;

  if (state.kind === 'transfer') {
    const to = accounts.find((a) => a.id === state.toAccountId);
    if (!to || to.id === state.accountId) errors.toAccountId = 'chooseOtherAccount';
    let toAmountMinor = amountMinor;
    if (account && to && to.currency !== account.currency) {
      const toAmount = checkAmount(state.toAmount, to.currency);
      if ('error' in toAmount) errors.toAmount = toAmount.error;
      toAmountMinor = 'minor' in toAmount ? toAmount.minor : null;
    }
    const fee = account && state.fee.trim() ? checkAmount(state.fee, account.currency) : undefined;
    if (fee && 'error' in fee) errors.fee = fee.error;
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
        ...(fee && 'minor' in fee && { fee: { amountMinor: fee.minor } }),
      },
    };
  }

  let original: { amountMinor: number; currency: CurrencyCode } | undefined;
  let feeMinor: number | undefined;
  if (mode !== 'none') {
    const originalAmount = checkAmount(state.originalAmount, state.originalCurrency);
    if ('error' in originalAmount) errors.originalAmount = originalAmount.error;
    else original = { amountMinor: originalAmount.minor, currency: state.originalCurrency };
  }
  if (mode === 'estimate') {
    const estimate = estimateCharge(state, account, rates);
    if (estimate) amountMinor = estimate.amountMinor;
    else if (original) errors.originalAmount = 'amountInvalid'; // too small to convert
    if (estimate?.feeMinor) feeMinor = estimate.feeMinor;
  } else if (mode === 'manual' && state.kind === 'expense' && account && state.cardFee.trim()) {
    const fee = checkAmount(state.cardFee, account.currency);
    if ('error' in fee) errors.cardFee = fee.error;
    else if (amountMinor !== null && fee.minor >= amountMinor) errors.cardFee = 'feeTooLarge';
    else feeMinor = fee.minor;
  }
  if (Object.keys(errors).length > 0 || amountMinor === null) return { errors };
  return {
    input: {
      kind: state.kind === 'income' ? 'income' : 'expense',
      ...(state.kind === 'refund' && { refund: true }),
      accountId: state.accountId,
      amountMinor,
      date: state.date,
      ...(state.categoryId ? { categoryId: state.categoryId } : {}),
      ...(state.payee.trim() ? { payee: state.payee } : {}),
      ...(state.note.trim() ? { note: state.note } : {}),
      ...(original && { original }),
      ...(feeMinor !== undefined && { feeMinor }),
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
