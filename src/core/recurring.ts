import { isMonthKey, monthOf, shiftMonth } from './dates';
import { newId, type LedgerDB } from './db';
import { LedgerError } from './errors';
import { checkTransactionInput, createTransaction, type IncomeExpenseInput } from './transactions';
import type { RecurringRule, RecurringTemplate, Transaction } from './types';

export interface NewRecurringRule {
  template: RecurringTemplate;
  dayOfMonth: number;
  startMonth: string;
  lastMonth?: string;
}

/** The day a rule falls on in `month`, moved to the month's last day when needed (31st → Feb 28th). */
export function recurringDate(dayOfMonth: number, month: string): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return `${month}-${String(Math.min(dayOfMonth, lastDay)).padStart(2, '0')}`;
}

export async function createRecurringRule(db: LedgerDB, input: NewRecurringRule): Promise<RecurringRule> {
  if (!Number.isInteger(input.dayOfMonth) || input.dayOfMonth < 1 || input.dayOfMonth > 31) {
    throw new LedgerError('INVALID_DATE', 'Day of month must be 1–31');
  }
  if (!isMonthKey(input.startMonth) || (input.lastMonth !== undefined && !isMonthKey(input.lastMonth))) {
    throw new LedgerError('INVALID_DATE', 'Months must be YYYY-MM');
  }
  await checkTransactionInput(db, { ...input.template, date: recurringDate(input.dayOfMonth, input.startMonth) });
  const now = Date.now();
  const rule: RecurringRule = {
    id: newId(),
    template: input.template,
    dayOfMonth: input.dayOfMonth,
    startMonth: input.startMonth,
    ...(input.lastMonth !== undefined && { lastMonth: input.lastMonth }),
    createdAt: now,
    updatedAt: now,
  };
  await db.recurring.add(rule);
  return rule;
}

/**
 * Records an entry and repeats it on the same day every month from the next
 * month on (this month is already recorded).
 */
export async function createMonthlyTransaction(
  db: LedgerDB,
  input: IncomeExpenseInput,
): Promise<{ records: Transaction[]; rule: RecurringRule }> {
  return db.transaction('rw', [db.recurring, db.accounts, db.categories, db.transactions], async () => {
    const records = await createTransaction(db, input);
    const { date, ...template } = input;
    const month = monthOf(date);
    const rule = await createRecurringRule(db, {
      template,
      dayOfMonth: Number(date.slice(8, 10)),
      startMonth: month,
      lastMonth: month,
    });
    return { records, rule };
  });
}

export async function listRecurringRules(db: LedgerDB): Promise<RecurringRule[]> {
  const rules = await db.recurring.toArray();
  return rules.sort((a, b) => a.dayOfMonth - b.dayOfMonth || a.createdAt - b.createdAt);
}

export async function deleteRecurringRule(db: LedgerDB, id: string): Promise<void> {
  await db.recurring.delete(id);
}

export interface DueRecurring {
  rule: RecurringRule;
  /** The earliest month not yet handled. */
  month: string;
  date: string;
  /** Further past months also waiting after this one. */
  laterMonths: number;
}

/**
 * Rules with an entry due by `today`: one item per rule, for its earliest
 * unhandled month, so months are always handled in order. Soonest first.
 */
export function dueRecurring(rules: readonly RecurringRule[], today: string): DueRecurring[] {
  const due: DueRecurring[] = [];
  const currentMonth = monthOf(today);
  for (const rule of rules) {
    const months: string[] = [];
    let month = rule.lastMonth === undefined ? rule.startMonth : shiftMonth(rule.lastMonth, 1);
    if (month < rule.startMonth) month = rule.startMonth;
    for (; month <= currentMonth; month = shiftMonth(month, 1)) {
      if (recurringDate(rule.dayOfMonth, month) <= today) months.push(month);
    }
    if (months.length > 0) {
      due.push({ rule, month: months[0], date: recurringDate(rule.dayOfMonth, months[0]), laterMonths: months.length - 1 });
    }
  }
  return due.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Records the rule's entry for `month` (its earliest unhandled one) and marks the month handled. */
export async function postRecurring(db: LedgerDB, id: string, month: string): Promise<Transaction[]> {
  return db.transaction('rw', [db.recurring, db.accounts, db.categories, db.transactions], async () => {
    const rule = await requireNextMonth(db, id, month);
    const records = await createTransaction(db, { ...rule.template, date: recurringDate(rule.dayOfMonth, month) });
    await db.recurring.update(id, { lastMonth: month, updatedAt: Date.now() });
    return records;
  });
}

/** Marks `month` handled without recording anything (e.g. rent paid differently that month). */
export async function skipRecurring(db: LedgerDB, id: string, month: string): Promise<void> {
  await db.transaction('rw', db.recurring, async () => {
    await requireNextMonth(db, id, month);
    await db.recurring.update(id, { lastMonth: month, updatedAt: Date.now() });
  });
}

async function requireNextMonth(db: LedgerDB, id: string, month: string): Promise<RecurringRule> {
  const rule = await db.recurring.get(id);
  if (!rule) throw new LedgerError('NOT_FOUND', `Recurring rule ${id} not found`);
  const next = rule.lastMonth === undefined ? rule.startMonth : shiftMonth(rule.lastMonth, 1);
  if (month !== (next < rule.startMonth ? rule.startMonth : next)) {
    throw new LedgerError('INVALID_DATE', `Handle ${next} before ${month}`);
  }
  return rule;
}
