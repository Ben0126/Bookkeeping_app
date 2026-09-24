import type { CurrencyCode } from './money';
import type { IncomeExpenseInput } from './transactions';

export const ACCOUNT_KINDS = [
  'cash',
  'bank',
  'credit_card',
  'e_wallet',
  'investment',
  'other',
] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  /** Fixed once the account has transactions. */
  currency: CurrencyCode;
  /** Balance before the first recorded transaction, in minor units. Negative for debt. */
  openingBalanceMinor: number;
  color?: string;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export type CategoryKind = 'income' | 'expense';

export interface Category {
  id: string;
  kind: CategoryKind;
  name: string;
  /** Set on built-in categories so the UI can translate them; cleared on rename. */
  key?: string;
  /** Categories nest at most one level deep. */
  parentId?: string;
  icon?: string;
  color?: string;
  archived: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export type TransactionKind = 'income' | 'expense' | 'transfer';

/**
 * One posting against one account. Income and expenses are a single record;
 * a transfer is two records (outflow and inflow) sharing `transferId`.
 * An account's balance is its opening balance plus the sum of its postings.
 */
export interface Transaction {
  id: string;
  kind: TransactionKind;
  accountId: string;
  /**
   * Signed change to the account balance, in the account currency's minor
   * units. Income is positive and expenses negative; a positive expense is a
   * refund, which reduces spending in its category.
   */
  amountMinor: number;
  /** Calendar day, "YYYY-MM-DD". */
  date: string;
  /** Income and expense only. */
  categoryId?: string;
  /** Transfers only; shared by both legs. */
  transferId?: string;
  payee?: string;
  note?: string;
  /**
   * The foreign-currency amount actually charged, before the bank converted it
   * (e.g. €12.00 paid with a USD card). Same sign as `amountMinor`.
   */
  originalAmountMinor?: number;
  originalCurrency?: CurrencyCode;
  createdAt: number;
  updatedAt: number;
}

export interface ExchangeRate {
  /** `${from}:${to}:${date}` — one rate per pair per day. */
  id: string;
  from: CurrencyCode;
  to: CurrencyCode;
  /** Units of `to` per one unit of `from`. */
  rate: number;
  date: string;
  updatedAt: number;
}

export interface Budget {
  /** `category:${categoryId}` or `overall`. */
  id: string;
  /** Expense category covered, including its subcategories; omitted for the overall budget. */
  categoryId?: string;
  /** Monthly limit in `currency` minor units. */
  amountMinor: number;
  currency: CurrencyCode;
  createdAt: number;
  updatedAt: number;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

/** What a recurring rule records each month; the date is filled in when posted. */
export type RecurringTemplate = Omit<IncomeExpenseInput, 'date'>;

/** A monthly income or expense such as rent or a subscription, posted after confirmation. */
export interface RecurringRule {
  id: string;
  template: RecurringTemplate;
  /** 1–31; in shorter months the entry falls on the last day. */
  dayOfMonth: number;
  /** First month ("YYYY-MM") the rule applies to. */
  startMonth: string;
  /** Latest month already recorded or skipped. */
  lastMonth?: string;
  createdAt: number;
  updatedAt: number;
}
