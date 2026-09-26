import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addAccount, createTestDb } from '../test/ledgerDb';
import { updateAccount } from './accounts';
import { countBackup, exportBackup, importBackup, oldestChangeSince, parseBackup, readBackup, type Backup } from './backup';
import { setBudget } from './budgets';
import { seedDefaultCategories } from './categories';
import type { LedgerDB } from './db';
import { setExchangeRate } from './rates';
import { createRecurringRule } from './recurring';
import { updateSettings } from './settings';
import { createTransaction, updateTransaction } from './transactions';

let source: LedgerDB;
let backup: Backup;

beforeEach(async () => {
  source = createTestDb();
  await seedDefaultCategories(source);
  const usd = await addAccount(source, { name: 'Chase', currency: 'USD', openingBalanceMinor: 5000 });
  const twd = await addAccount(source, { name: '台銀', currency: 'TWD', color: '#123456' });
  await updateAccount(source, twd.id, { foreignFeeBps: 150 });
  await createTransaction(source, {
    kind: 'expense', accountId: usd.id, amountMinor: 1320, date: '2026-09-01', categoryId: 'default-dining',
    payee: 'Pret', original: { amountMinor: 1200, currency: 'EUR' },
  });
  await createTransaction(source, {
    kind: 'transfer', fromAccountId: twd.id, toAccountId: usd.id, amountMinor: 32000, toAmountMinor: 100000, date: '2026-09-02',
  });
  await createTransaction(source, {
    kind: 'expense', accountId: twd.id, amountMinor: 1091, feeMinor: 16, date: '2026-09-03', categoryId: 'default-dining',
    original: { amountMinor: 5000, currency: 'JPY' }, estimated: true,
  });
  await setExchangeRate(source, { from: 'USD', to: 'TWD', rate: 32, date: '2026-09-01' });
  await setBudget(source, { categoryId: 'default-dining', amountMinor: 5000, currency: 'TWD' });
  await updateSettings(source, { baseCurrency: 'USD' });
  await createRecurringRule(source, {
    template: { kind: 'expense', accountId: usd.id, amountMinor: 121800, feeMinor: 1800, categoryId: 'default-rent' },
    dayOfMonth: 1,
    startMonth: '2026-10',
  });
  backup = await exportBackup(source);
});

async function snapshot(db: LedgerDB) {
  const { data } = await exportBackup(db);
  return data;
}

describe('export and import', () => {
  it('round-trips every table through JSON', async () => {
    const target = createTestDb();
    await importBackup(target, JSON.stringify(backup));
    expect(await snapshot(target)).toEqual(backup.data);
  });

  it('replaces existing data', async () => {
    const target = createTestDb();
    await addAccount(target, { name: 'Will be replaced' });
    await importBackup(target, backup);
    expect((await target.accounts.toArray()).map((a) => a.name).sort()).toEqual(['Chase', '台銀']);
  });

  it('strips unknown fields and unknown settings', () => {
    const tampered = structuredClone(backup) as unknown as { data: Record<string, Record<string, unknown>[]> };
    tampered.data.accounts[0].injected = '<script>';
    tampered.data.settings.push({ key: 'theme', value: 'dark' });
    const parsed = parseBackup(tampered);
    expect(parsed.data.accounts[0]).not.toHaveProperty('injected');
    expect(parsed.data.settings).toEqual([{ key: 'baseCurrency', value: 'USD' }]);
  });
});

describe('invalid backups', () => {
  const corrupt = (mutate: (data: Backup['data'], root: Record<string, unknown>) => void) => {
    const copy = structuredClone(backup);
    mutate(copy.data, copy as unknown as Record<string, unknown>);
    return copy;
  };

  it.each<[string, Parameters<typeof corrupt>[0]]>([
    ['wrong format', (_, root) => { root.format = 'something-else'; }],
    ['newer version', (_, root) => { root.version = 99; }],
    ['unknown account', (data) => { data.transactions[0].accountId = 'ghost'; }],
    ['float amount', (data) => { data.transactions[0].amountMinor = -13.2; }],
    ['negative income', (data) => {
      data.transactions.push({ ...data.transactions.find((t) => t.kind === 'expense')!, id: 'x', kind: 'income', categoryId: undefined });
    }],
    ['string date', (data) => { data.transactions[0].date = 'Tue Sep 01 2026' as never; }],
    ['one-legged transfer', (data) => {
      data.transactions = data.transactions.filter((t) => !(t.kind === 'transfer' && t.amountMinor > 0));
    }],
    ['duplicate id', (data) => { data.accounts.push({ ...data.accounts[0] }); }],
    ['category of the wrong kind', (data) => {
      data.transactions.find((t) => t.kind === 'expense')!.categoryId = 'default-salary';
    }],
    ['budget on income category', (data) => { data.budgets[0].categoryId = 'default-salary'; data.budgets[0].id = 'category:default-salary'; }],
    ['missing table', (data) => { delete (data as Partial<Backup['data']>).exchangeRates; }],
    ['recurring rule on an unknown account', (data) => { data.recurring[0].template.accountId = 'ghost'; }],
    ['recurring rule on day 40', (data) => { data.recurring[0].dayOfMonth = 40; }],
    ['recurring fee as large as the amount', (data) => { data.recurring[0].template.feeMinor = 121800; }],
    ['fee rate above 10%', (data) => { data.accounts.find((a) => a.foreignFeeBps)!.foreignFeeBps = 2000; }],
    ['fee as large as the charge', (data) => { data.transactions.find((t) => t.feeMinor)!.feeMinor = -1091; }],
    ['estimate without a foreign amount', (data) => {
      const estimate = data.transactions.find((t) => t.estimated)!;
      delete estimate.originalAmountMinor;
      delete estimate.originalCurrency;
    }],
    ['estimate flag that is not true', (data) => { (data.transactions.find((t) => t.estimated)! as { estimated: unknown }).estimated = 'yes'; }],
    ['fee on income', (data) => {
      const income = data.transactions.find((t) => t.feeMinor)!;
      Object.assign(income, { kind: 'income', amountMinor: 1091, categoryId: undefined });
    }],
  ])('rejects %s and keeps existing data', async (_, mutate) => {
    const target = createTestDb();
    await addAccount(target, { name: 'Precious' });
    await expect(importBackup(target, corrupt(mutate))).rejects.toMatchObject({ code: 'INVALID_BACKUP' });
    expect((await target.accounts.toArray()).map((a) => a.name)).toEqual(['Precious']);
  });

  it('rolls back when writing fails part-way', async () => {
    const target = createTestDb();
    await addAccount(target, { name: 'Precious' });
    vi.spyOn(target.budgets, 'bulkAdd').mockRejectedValueOnce(new Error('disk full'));

    await expect(importBackup(target, backup)).rejects.toThrow('disk full');
    expect((await target.accounts.toArray()).map((a) => a.name)).toEqual(['Precious']);
    expect(await target.transactions.count()).toBe(0);
  });

  it('accepts backups made before recurring rules existed', async () => {
    const older = structuredClone(backup) as unknown as { data: Record<string, unknown> };
    delete older.data.recurring;
    const target = createTestDb();
    await importBackup(target, older);
    expect(await target.recurring.count()).toBe(0);
    expect(await target.accounts.count()).toBe(2);
  });

  it('rejects text that is not JSON', async () => {
    await expect(importBackup(createTestDb(), '{oops')).rejects.toMatchObject({ code: 'INVALID_BACKUP' });
  });
});

describe('readBackup', () => {
  it('parses and validates file text without writing anything', () => {
    expect(readBackup(JSON.stringify(backup)).data).toEqual(backup.data);
    expect(() => readBackup('not json')).toThrow(expect.objectContaining({ code: 'INVALID_BACKUP' }));
  });
});

describe('countBackup', () => {
  it('counts a transfer once', () => {
    expect(countBackup(backup.data)).toEqual({
      accounts: 2,
      categories: 22,
      transactions: 3,
      exchangeRates: 1,
      budgets: 1,
    });
  });
});

describe('oldestChangeSince', () => {
  it('finds the oldest account or transaction changed after a time', async () => {
    const db = createTestDb();
    expect(await oldestChangeSince(db)).toBeUndefined();

    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1_000);
    const account = await addAccount(db);
    now.mockReturnValue(2_000);
    const [expense] = await createTransaction(db, { kind: 'expense', accountId: account.id, amountMinor: 100, date: '2026-09-01' });
    now.mockReturnValue(3_000);
    await updateTransaction(db, expense.id, { kind: 'expense', accountId: account.id, amountMinor: 200, date: '2026-09-01' });
    now.mockRestore();

    expect(await oldestChangeSince(db)).toBe(1_000);
    expect(await oldestChangeSince(db, 1_000)).toBe(3_000);
    expect(await oldestChangeSince(db, 3_000)).toBeUndefined();
  });
});
