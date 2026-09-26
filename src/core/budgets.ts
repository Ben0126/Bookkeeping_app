import { monthRange } from './dates';
import type { LedgerDB } from './db';
import { LedgerError } from './errors';
import type { CurrencyCode } from './money';
import { splitFees, summarize, type ReportContext } from './reports';
import type { Budget, Category, Transaction } from './types';
import { requireCurrency, requirePositiveMinor } from './validate';

export interface NewBudget {
  /** Expense category; omit for the overall monthly budget. */
  categoryId?: string;
  amountMinor: number;
  currency: CurrencyCode;
}

export function budgetId(categoryId?: string): string {
  return categoryId === undefined ? 'overall' : `category:${categoryId}`;
}

/** Sets the monthly budget for a category (or overall), replacing any existing one. */
export async function setBudget(db: LedgerDB, input: NewBudget): Promise<Budget> {
  return db.transaction('rw', [db.budgets, db.categories], async () => {
    if (input.categoryId !== undefined) {
      const category = await db.categories.get(input.categoryId);
      if (!category) throw new LedgerError('NOT_FOUND', `Category ${input.categoryId} not found`);
      if (category.kind !== 'expense') throw new LedgerError('CATEGORY_KIND_MISMATCH', 'Budgets apply to expense categories');
    }
    const id = budgetId(input.categoryId);
    const now = Date.now();
    const budget: Budget = {
      id,
      amountMinor: requirePositiveMinor(input.amountMinor),
      currency: requireCurrency(input.currency),
      createdAt: (await db.budgets.get(id))?.createdAt ?? now,
      updatedAt: now,
    };
    if (input.categoryId !== undefined) budget.categoryId = input.categoryId;
    await db.budgets.put(budget);
    return budget;
  });
}

export async function deleteBudget(db: LedgerDB, id: string): Promise<void> {
  await db.budgets.delete(id);
}

export async function listBudgets(db: LedgerDB): Promise<Budget[]> {
  return db.budgets.toArray();
}

export interface BudgetProgress {
  budget: Budget;
  /** Spending this month in the budget's currency (positive). */
  spentMinor: number;
  /** Negative when over budget. */
  remainingMinor: number;
  /** Currencies whose spending could not be converted and is not counted. */
  missingRates: CurrencyCode[];
}

/** How much of each budget has been spent in `month` ("YYYY-MM"). */
export function budgetProgress(
  budgets: readonly Budget[],
  categories: readonly Category[],
  transactions: readonly Transaction[],
  ctx: Omit<ReportContext, 'baseCurrency'>,
  month: string,
): BudgetProgress[] {
  const period = monthRange(month);
  // A category budget covers purchases; fees included in them count toward the Fees category.
  const inMonth = splitFees(transactions, ctx.feeCategoryId).filter(
    (t) => t.kind === 'expense' && t.date >= period.from && t.date <= period.to,
  );

  return budgets.map((budget) => {
    let covered = inMonth;
    if (budget.categoryId !== undefined) {
      const ids = new Set([budget.categoryId]);
      for (const category of categories) {
        if (category.parentId === budget.categoryId) ids.add(category.id);
      }
      covered = inMonth.filter((t) => t.categoryId !== undefined && ids.has(t.categoryId));
    }
    const summary = summarize(covered, { ...ctx, baseCurrency: budget.currency });
    return {
      budget,
      spentMinor: summary.expenseMinor,
      remainingMinor: budget.amountMinor - summary.expenseMinor,
      missingRates: summary.missingRates,
    };
  });
}
