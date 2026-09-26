import {
  budgetProgress,
  createRateResolver,
  findFeeCategory,
  monthOf,
  monthRange,
  summarize,
  totalsByCurrency,
  type Account,
  type Budget,
  type BudgetProgress,
  type Category,
  type CurrencyCode,
  type ExchangeRate,
  type Summary,
  type Transaction,
} from '../../core';

export interface CategoryShare {
  categoryId: string | null;
  totalMinor: number;
  /** 0–1 of the month's converted spending. */
  share: number;
  count: number;
}

export interface MonthOverview {
  month: string;
  currency: CurrencyCode;
  /** Converted to `currency`; excludes currencies listed in `missingRates`. */
  summary: Summary;
  /** Unconverted totals per currency, always complete. */
  native: Summary['byCurrency'];
  missingRates: CurrencyCode[];
  /** Spending by category, largest first. */
  categories: CategoryShare[];
  budget?: BudgetProgress & {
    /** For the current month: what can still be spent per remaining day, including today. */
    perDayMinor?: number;
    daysLeft?: number;
  };
}

export function daysInMonth(month: string): number {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
}

/** Everything the overview shows for one month, from already-loaded data. */
export function buildMonthOverview({
  month,
  today,
  transactions,
  accounts,
  categories,
  budgets,
  rates,
  baseCurrency,
}: {
  month: string;
  /** "YYYY-MM-DD", to work out the days left in the current month. */
  today: string;
  transactions: readonly Transaction[];
  accounts: readonly Account[];
  categories: readonly Category[];
  budgets: readonly Budget[];
  rates: readonly ExchangeRate[];
  baseCurrency: CurrencyCode;
}): MonthOverview {
  const period = monthRange(month);
  const resolver = createRateResolver(rates);
  const feeCategoryId = findFeeCategory(categories)?.id;
  const summary = summarize(transactions, { accounts, baseCurrency, rates: resolver, feeCategoryId }, period);

  const expenseTotal = summary.expenseMinor;
  const categoryShares = summary.byCategory
    .filter((total) => total.kind === 'expense')
    .map(({ categoryId, totalMinor, count }) => ({
      categoryId,
      totalMinor,
      count,
      share: expenseTotal > 0 ? totalMinor / expenseTotal : 0,
    }));

  const overall = budgets.find((budget) => budget.categoryId === undefined);
  let budget: MonthOverview['budget'];
  if (overall) {
    const ctx = { accounts, rates: resolver, feeCategoryId };
    const [progress] = budgetProgress([overall], categories, transactions, ctx, month);
    budget = progress;
    const isCurrentMonth = monthOf(today) === month;
    if (isCurrentMonth || month > monthOf(today)) {
      const daysLeft = isCurrentMonth ? daysInMonth(month) - Number(today.slice(8, 10)) + 1 : daysInMonth(month);
      budget = { ...progress, daysLeft, perDayMinor: Math.max(0, Math.floor(progress.remainingMinor / daysLeft)) };
    }
  }

  return {
    month,
    currency: baseCurrency,
    summary,
    native: totalsByCurrency(transactions, accounts, period),
    missingRates: summary.missingRates,
    categories: categoryShares,
    ...(budget && { budget }),
  };
}
