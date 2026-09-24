import { monthOf } from './dates';
import { convertMinor, type CurrencyCode } from './money';
import type { RateResolver } from './rates';
import type { Account, Transaction } from './types';

/**
 * Reports are pure functions over loaded data. Every amount is converted to
 * `baseCurrency` at the rate for its own date; amounts in a currency with no
 * known rate are left out and that currency is listed in `missingRates`,
 * never silently added as if it were the base currency.
 */
export interface ReportContext {
  accounts: readonly Account[];
  baseCurrency: CurrencyCode;
  rates: RateResolver;
}

export interface Period {
  /** Inclusive "YYYY-MM-DD" bounds. */
  from?: string;
  to?: string;
}

export interface CategoryTotal {
  /** null for uncategorized transactions. */
  categoryId: string | null;
  kind: 'income' | 'expense';
  /** Positive, in base currency minor units. */
  totalMinor: number;
  count: number;
}

export interface Summary {
  currency: CurrencyCode;
  incomeMinor: number;
  /** Positive. */
  expenseMinor: number;
  netMinor: number;
  /** Largest first. */
  byCategory: CategoryTotal[];
  /** Unconverted totals in each account currency. */
  byCurrency: Partial<Record<CurrencyCode, { incomeMinor: number; expenseMinor: number }>>;
  missingRates: CurrencyCode[];
}

export interface MonthTotal {
  /** "YYYY-MM" */
  month: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
}

/** Income and expense totals for a period. Transfers are not income or spending. */
export function summarize(
  transactions: readonly Transaction[],
  ctx: ReportContext,
  period: Period = {},
): Summary {
  const summary: Summary = {
    currency: ctx.baseCurrency,
    incomeMinor: 0,
    expenseMinor: 0,
    netMinor: 0,
    byCategory: [],
    byCurrency: {},
    missingRates: [],
  };
  const byCategory = new Map<string, CategoryTotal>();

  summary.missingRates = forEachConverted(transactions, ctx, period, (t, baseMinor, currency) => {
    const kind = t.kind as 'income' | 'expense';
    const magnitude = Math.abs(baseMinor);
    if (kind === 'income') summary.incomeMinor += magnitude;
    else summary.expenseMinor += magnitude;

    const key = `${kind}:${t.categoryId ?? ''}`;
    let total = byCategory.get(key);
    if (!total) {
      total = { categoryId: t.categoryId ?? null, kind, totalMinor: 0, count: 0 };
      byCategory.set(key, total);
    }
    total.totalMinor += magnitude;
    total.count += 1;

    const native = (summary.byCurrency[currency] ??= { incomeMinor: 0, expenseMinor: 0 });
    if (kind === 'income') native.incomeMinor += Math.abs(t.amountMinor);
    else native.expenseMinor += Math.abs(t.amountMinor);
  });

  summary.netMinor = summary.incomeMinor - summary.expenseMinor;
  summary.byCategory = [...byCategory.values()].sort((a, b) => b.totalMinor - a.totalMinor);
  return summary;
}

/** Income and expense per month, oldest first. Months without activity are omitted. */
export function monthlyTotals(
  transactions: readonly Transaction[],
  ctx: ReportContext,
  period: Period = {},
): { months: MonthTotal[]; missingRates: CurrencyCode[] } {
  const months = new Map<string, MonthTotal>();
  const missingRates = forEachConverted(transactions, ctx, period, (t, baseMinor) => {
    const month = monthOf(t.date);
    let total = months.get(month);
    if (!total) {
      total = { month, incomeMinor: 0, expenseMinor: 0, netMinor: 0 };
      months.set(month, total);
    }
    if (t.kind === 'income') total.incomeMinor += Math.abs(baseMinor);
    else total.expenseMinor += Math.abs(baseMinor);
    total.netMinor = total.incomeMinor - total.expenseMinor;
  });
  return {
    months: [...months.values()].sort((a, b) => (a.month < b.month ? -1 : 1)),
    missingRates,
  };
}

/** Sum of account balances in the base currency, converted at the rates for `date`. */
export function netWorth(
  balances: Readonly<Record<string, number>>,
  ctx: ReportContext,
  date: string,
): { totalMinor: number; missingRates: CurrencyCode[] } {
  let totalMinor = 0;
  const missing = new Set<CurrencyCode>();
  for (const account of ctx.accounts) {
    const balance = balances[account.id] ?? 0;
    if (balance === 0) continue;
    const rate = ctx.rates(account.currency, ctx.baseCurrency, date);
    if (rate === undefined) {
      missing.add(account.currency);
      continue;
    }
    totalMinor += convertMinor(balance, account.currency, ctx.baseCurrency, rate);
  }
  return { totalMinor, missingRates: [...missing].sort() };
}

/** Calls `visit` for each income/expense posting in the period that can be converted. */
function forEachConverted(
  transactions: readonly Transaction[],
  ctx: ReportContext,
  { from, to }: Period,
  visit: (transaction: Transaction, baseMinor: number, currency: CurrencyCode) => void,
): CurrencyCode[] {
  const currencyOf = new Map(ctx.accounts.map((account) => [account.id, account.currency]));
  const missing = new Set<CurrencyCode>();

  for (const t of transactions) {
    if (t.kind === 'transfer') continue;
    if ((from !== undefined && t.date < from) || (to !== undefined && t.date > to)) continue;
    const currency = currencyOf.get(t.accountId);
    if (currency === undefined) continue;
    const rate = ctx.rates(currency, ctx.baseCurrency, t.date);
    if (rate === undefined) {
      missing.add(currency);
      continue;
    }
    visit(t, convertMinor(t.amountMinor, currency, ctx.baseCurrency, rate), currency);
  }
  return [...missing].sort();
}
