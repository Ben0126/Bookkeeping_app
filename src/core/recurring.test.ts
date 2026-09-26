import { beforeEach, describe, expect, it } from 'vitest';
import { addAccount, createTestDb } from '../test/ledgerDb';
import { getAccountBalance } from './accounts';
import { seedDefaultCategories } from './categories';
import type { LedgerDB } from './db';
import {
  createMonthlyTransaction,
  createRecurringRule,
  deleteRecurringRule,
  dueRecurring,
  listRecurringRules,
  postRecurring,
  recurringDate,
  skipRecurring,
  updateRecurringRule,
} from './recurring';
import type { Account, RecurringRule } from './types';

let db: LedgerDB;
let chase: Account;

beforeEach(async () => {
  db = createTestDb();
  await seedDefaultCategories(db);
  chase = await addAccount(db, { name: 'Chase', currency: 'USD', openingBalanceMinor: 500000 });
});

const rent = () =>
  createRecurringRule(db, {
    template: { kind: 'expense', accountId: chase.id, amountMinor: 120000, categoryId: 'default-rent', payee: 'Landlord' },
    dayOfMonth: 1,
    startMonth: '2026-09',
    lastMonth: '2026-09',
  });

describe('recurringDate', () => {
  it('uses the last day in shorter months', () => {
    expect(recurringDate(31, '2026-02')).toBe('2026-02-28');
    expect(recurringDate(31, '2028-02')).toBe('2028-02-29');
    expect(recurringDate(5, '2026-10')).toBe('2026-10-05');
  });
});

describe('dueRecurring', () => {
  const rule = (overrides: Partial<RecurringRule>): RecurringRule => ({
    id: 'r', template: { kind: 'expense', accountId: 'a', amountMinor: 1 }, dayOfMonth: 15, startMonth: '2026-09',
    createdAt: 0, updatedAt: 0, ...overrides,
  });

  it('is due from its day of the month', () => {
    expect(dueRecurring([rule({})], '2026-09-14')).toEqual([]);
    expect(dueRecurring([rule({})], '2026-09-15')).toMatchObject([{ month: '2026-09', date: '2026-09-15', laterMonths: 0 }]);
  });

  it('offers the earliest unhandled month and counts the rest', () => {
    const due = dueRecurring([rule({ lastMonth: '2026-09' })], '2027-01-20');
    expect(due).toMatchObject([{ month: '2026-10', date: '2026-10-15', laterMonths: 3 }]);
  });

  it('is quiet once the current month is handled', () => {
    expect(dueRecurring([rule({ lastMonth: '2026-10' })], '2026-10-30')).toEqual([]);
  });
});

describe('recurring rules', () => {
  it('validates the template like a transaction', async () => {
    await expect(
      createRecurringRule(db, {
        template: { kind: 'expense', accountId: 'missing', amountMinor: 100 },
        dayOfMonth: 1,
        startMonth: '2026-09',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      createRecurringRule(db, {
        template: { kind: 'expense', accountId: chase.id, amountMinor: 100 },
        dayOfMonth: 32,
        startMonth: '2026-09',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_DATE' });
  });

  it('posts the next month and moves on', async () => {
    const rule = await rent();
    const [entry] = await postRecurring(db, rule.id, '2026-10');
    expect(entry).toMatchObject({ amountMinor: -120000, date: '2026-10-01', categoryId: 'default-rent', payee: 'Landlord' });
    expect(await getAccountBalance(db, chase.id)).toBe(380000);
    expect((await listRecurringRules(db))[0].lastMonth).toBe('2026-10');
  });

  it('skips a month without recording anything', async () => {
    const rule = await rent();
    await skipRecurring(db, rule.id, '2026-10');
    expect(await db.transactions.count()).toBe(0);
    expect(dueRecurring(await listRecurringRules(db), '2026-10-31')).toEqual([]);
  });

  it('refuses to handle months out of order', async () => {
    const rule = await rent();
    await expect(postRecurring(db, rule.id, '2026-11')).rejects.toMatchObject({ code: 'INVALID_DATE' });
    await expect(skipRecurring(db, rule.id, '2026-09')).rejects.toMatchObject({ code: 'INVALID_DATE' });
    expect(await db.transactions.count()).toBe(0);
  });

  it('deletes a rule and keeps what it recorded', async () => {
    const rule = await rent();
    await postRecurring(db, rule.id, '2026-10');
    await deleteRecurringRule(db, rule.id);
    expect(await listRecurringRules(db)).toEqual([]);
    expect(await db.transactions.count()).toBe(1);
  });

  it('records an entry and repeats it from next month', async () => {
    const { records, rule } = await createMonthlyTransaction(db, {
      kind: 'expense', accountId: chase.id, amountMinor: 1599, date: '2026-09-30', categoryId: 'default-phone_internet',
    });
    expect(records).toHaveLength(1);
    expect(rule).toMatchObject({ dayOfMonth: 30, startMonth: '2026-09', lastMonth: '2026-09' });
    expect(rule.template).not.toHaveProperty('date');
    expect(dueRecurring([rule], '2026-10-29')).toEqual([]);
    expect(dueRecurring([rule], '2026-10-30')).toMatchObject([{ month: '2026-10', date: '2026-10-30' }]);
  });

  it('saves neither the entry nor the rule when the entry is invalid', async () => {
    await expect(
      createMonthlyTransaction(db, { kind: 'expense', accountId: chase.id, amountMinor: 100, date: '2026-09-01', categoryId: 'default-salary' }),
    ).rejects.toMatchObject({ code: 'CATEGORY_KIND_MISMATCH' });
    expect(await db.transactions.count()).toBe(0);
    expect(await db.recurring.count()).toBe(0);
  });

  it('changes the amount, day and payee of future entries only', async () => {
    const rule = await rent();
    await postRecurring(db, rule.id, '2026-10');
    await updateRecurringRule(db, rule.id, { amountMinor: 125000, dayOfMonth: 31, payee: '  New landlord ' });
    const [entry] = await postRecurring(db, rule.id, '2026-11');
    expect(entry).toMatchObject({ amountMinor: -125000, date: '2026-11-30', payee: 'New landlord' });
    expect((await db.transactions.orderBy('date').first())?.amountMinor).toBe(-120000);

    await updateRecurringRule(db, rule.id, { payee: '' });
    expect((await db.recurring.get(rule.id))?.template).not.toHaveProperty('payee');
    await expect(updateRecurringRule(db, rule.id, { amountMinor: 0 })).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
    await expect(updateRecurringRule(db, rule.id, { dayOfMonth: 0 })).rejects.toMatchObject({ code: 'INVALID_DATE' });
    await expect(updateRecurringRule(db, 'missing', {})).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
