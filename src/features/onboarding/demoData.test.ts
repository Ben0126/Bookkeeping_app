import { describe, expect, it } from 'vitest';
import { dueRecurring, getBalances, getSettings, importBackup, parseBackup, resetLedger } from '../../core';
import { createTestDb } from '../../test/ledgerDb';
import { buildDemoBackup, type DemoNames } from './demoData';

const names: DemoNames = {
  cash: 'Cash', localBank: 'Japanese bank', homeBank: 'Taiwan bank', homeCard: 'Taiwan card',
  landlord: 'Landlord', partTimeJob: 'Izakaya job', friendPaidBack: 'Friend paid back',
};
const build = (today: string) => buildDemoBackup({ today, names, now: 1_700_000_000_000 });

describe('buildDemoBackup', () => {
  it.each(['2026-10-30', '2027-01-03', '2026-04-01', '2028-02-29'])('is a valid backup ending %s', (today) => {
    const { data } = parseBackup(build(today));
    expect(data.transactions.every((t) => t.date <= today)).toBe(true);
    // A full semester and then some.
    expect(new Set(data.transactions.map((t) => t.date.slice(0, 7))).size).toBe(7);
    expect(dueRecurring(data.recurring, today)).toEqual([]);
  });

  it('is the same every time for the same day', () => {
    expect(build('2026-10-30')).toEqual(build('2026-10-30'));
  });

  it('never takes cash or Suica below zero', () => {
    const { data } = build('2026-10-30');
    for (const id of ['demo-cash', 'demo-suica']) {
      let balance = data.accounts.find((a) => a.id === id)!.openingBalanceMinor;
      const days = [...new Set(data.transactions.filter((t) => t.accountId === id).map((t) => t.date))].sort();
      for (const day of days) {
        balance += data.transactions.filter((t) => t.accountId === id && t.date === day).reduce((sum, t) => sum + t.amountMinor, 0);
        expect(balance, `${id} on ${day}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('shows the features worth trying', () => {
    const { data } = build('2026-10-30');
    const card = data.transactions.filter((t) => t.originalCurrency === 'JPY');
    expect(card.some((t) => t.estimated)).toBe(true);
    expect(card.some((t) => !t.estimated)).toBe(true);
    expect(card.every((t) => t.feeMinor !== undefined && t.feeMinor < 0)).toBe(true);
    expect(data.transactions.some((t) => t.kind === 'expense' && t.amountMinor > 0)).toBe(true);
    expect(data.transactions.some((t) => t.kind === 'transfer')).toBe(true);
  });

  it('loads and clears like any data', async () => {
    const db = createTestDb();
    await importBackup(db, build('2026-10-30'));
    expect(await getSettings(db)).toEqual({ baseCurrency: 'TWD', semesterStart: 4, demo: true });
    const balances = await getBalances(db);
    expect(balances['demo-cash']).toBeGreaterThanOrEqual(0);

    await resetLedger(db);
    expect(await db.accounts.count()).toBe(0);
    expect(await db.transactions.count()).toBe(0);
    expect(await db.categories.count()).toBe(22);
    expect((await getSettings(db)).demo).toBeUndefined();
  });
});
