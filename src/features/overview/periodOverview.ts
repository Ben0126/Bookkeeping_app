import {
  createRateResolver,
  findFeeCategory,
  monthRange,
  summarize,
  totalsByCurrency,
  type Account,
  type Category,
  type CurrencyCode,
  type ExchangeRate,
  type Summary,
  type Transaction,
} from '../../core';
import type { CategoryShare } from './monthOverview';
import { monthsSoFar, type ReportPeriod } from './periods';

export interface MonthBar {
  month: string;
  expenseMinor: number;
  incomeMinor: number;
}

export interface PeriodOverview {
  period: ReportPeriod;
  currency: CurrencyCode;
  /** Converted to `currency`; excludes currencies listed in `missingRates`. */
  summary: Summary;
  /** Unconverted totals per currency, always complete. */
  native: Summary['byCurrency'];
  missingRates: CurrencyCode[];
  /** Every month of the period, oldest first, including empty ones. */
  months: MonthBar[];
  /** Months of the period up to the current one, which averages are taken over. */
  monthsSoFar: number;
  /** Spending per month so far; undefined before the period starts. */
  monthlyAverageMinor?: number;
  /** Spending by category, largest first, with its total for each month of the period. */
  categories: (CategoryShare & { byMonth: number[] })[];
}

/** A semester's or year's totals, month by month and by category, from already-loaded data. */
export function buildPeriodOverview({
  period,
  today,
  transactions,
  accounts,
  categories,
  rates,
  baseCurrency,
}: {
  period: ReportPeriod;
  today: string;
  transactions: readonly Transaction[];
  accounts: readonly Account[];
  categories: readonly Category[];
  rates: readonly ExchangeRate[];
  baseCurrency: CurrencyCode;
}): PeriodOverview {
  const ctx = { accounts, baseCurrency, rates: createRateResolver(rates), feeCategoryId: findFeeCategory(categories)?.id };
  const range = { from: period.from, to: period.to };
  const summary = summarize(transactions, ctx, range);
  const perMonth = period.months.map((month) => summarize(transactions, ctx, monthRange(month)));

  const expenseTotal = summary.expenseMinor;
  const shares = summary.byCategory
    .filter((total) => total.kind === 'expense')
    .map(({ categoryId, totalMinor, count }) => ({
      categoryId,
      totalMinor,
      count,
      share: expenseTotal > 0 ? totalMinor / expenseTotal : 0,
      byMonth: perMonth.map(
        (month) => month.byCategory.find((c) => c.kind === 'expense' && c.categoryId === categoryId)?.totalMinor ?? 0,
      ),
    }));

  const elapsed = monthsSoFar(period, today);
  return {
    period,
    currency: baseCurrency,
    summary,
    native: totalsByCurrency(transactions, accounts, range),
    missingRates: summary.missingRates,
    months: period.months.map((month, i) => ({
      month,
      expenseMinor: perMonth[i].expenseMinor,
      incomeMinor: perMonth[i].incomeMinor,
    })),
    monthsSoFar: elapsed,
    ...(elapsed > 0 && { monthlyAverageMinor: Math.round(expenseTotal / elapsed) }),
    categories: shares,
  };
}
