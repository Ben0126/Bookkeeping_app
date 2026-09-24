import { budgetId } from './budgets';
import type { LedgerDB } from './db';
import { LedgerError } from './errors';
import { exchangeRateId } from './rates';
import {
  ACCOUNT_KINDS,
  type Account,
  type Budget,
  type Category,
  type ExchangeRate,
  type SettingRow,
  type Transaction,
} from './types';
import {
  optionalText,
  requireCurrency,
  requireDate,
  requireMinor,
  requireName,
  requireOneOf,
  requirePositiveMinor,
} from './validate';

export const BACKUP_FORMAT = 'studybudget-backup';
export const BACKUP_VERSION = 1;

export interface BackupData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  exchangeRates: ExchangeRate[];
  budgets: Budget[];
  settings: SettingRow[];
}

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  data: BackupData;
}

export async function exportBackup(db: LedgerDB): Promise<Backup> {
  return db.transaction('r', db.tables, async () => ({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      accounts: await db.accounts.toArray(),
      categories: await db.categories.toArray(),
      transactions: await db.transactions.toArray(),
      exchangeRates: await db.exchangeRates.toArray(),
      budgets: await db.budgets.toArray(),
      settings: await db.settings.toArray(),
    },
  }));
}

/**
 * Replaces all data with a backup (a parsed object or its JSON text). The
 * backup is fully validated first and written in one transaction, so a bad
 * file leaves the existing data untouched.
 */
export async function importBackup(db: LedgerDB, raw: unknown): Promise<BackupData> {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      throw new LedgerError('INVALID_BACKUP', 'File is not valid JSON');
    }
  }
  const { data } = parseBackup(value);
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    await db.accounts.bulkAdd(data.accounts);
    await db.categories.bulkAdd(data.categories);
    await db.transactions.bulkAdd(data.transactions);
    await db.exchangeRates.bulkAdd(data.exchangeRates);
    await db.budgets.bulkAdd(data.budgets);
    await db.settings.bulkAdd(data.settings);
  });
  return data;
}

/** Validates a backup and returns a copy holding only known fields. */
export function parseBackup(value: unknown): Backup {
  const root = object(value, 'backup');
  if (root.format !== BACKUP_FORMAT) invalid('format', 'not a StudyBudget backup');
  if (!Number.isInteger(root.version) || (root.version as number) < 1) invalid('version', 'missing');
  if ((root.version as number) > BACKUP_VERSION) invalid('version', 'made by a newer version of the app');
  const data = object(root.data, 'data');

  const accounts = list(data.accounts, 'accounts', parseAccount);
  const categories = list(data.categories, 'categories', parseCategory);
  const transactions = list(data.transactions, 'transactions', parseTransaction);
  const exchangeRates = list(data.exchangeRates, 'exchangeRates', parseExchangeRate);
  const budgets = list(data.budgets, 'budgets', parseBudget);
  const settingsByKey = new Map<string, SettingRow>();
  for (const row of list(data.settings, 'settings', parseSetting)) {
    if (row) settingsByKey.set(row.key, row);
  }
  const settings = [...settingsByKey.values()];

  const accountById = uniqueIds(accounts, 'accounts');
  const categoryById = uniqueIds(categories, 'categories');
  uniqueIds(transactions, 'transactions');
  uniqueIds(exchangeRates, 'exchangeRates');
  uniqueIds(budgets, 'budgets');

  categories.forEach((category, i) => {
    if (category.parentId === undefined) return;
    const parent = categoryById.get(category.parentId);
    if (!parent || parent.kind !== category.kind || parent.parentId !== undefined) {
      invalid(`categories[${i}].parentId`, 'invalid parent');
    }
  });

  const legsByTransfer = new Map<string, Transaction[]>();
  transactions.forEach((t, i) => {
    const path = `transactions[${i}]`;
    const account = accountById.get(t.accountId);
    if (!account) invalid(`${path}.accountId`, 'unknown account');
    if (t.categoryId !== undefined) {
      const category = categoryById.get(t.categoryId);
      if (!category || category.kind !== t.kind) invalid(`${path}.categoryId`, 'unknown or mismatched category');
    }
    if (t.originalCurrency === account.currency) invalid(`${path}.originalCurrency`, 'same as account currency');
    if (t.transferId !== undefined) {
      const legs = legsByTransfer.get(t.transferId) ?? [];
      legs.push(t);
      legsByTransfer.set(t.transferId, legs);
    }
  });
  for (const [transferId, legs] of legsByTransfer) {
    const path = `transfer ${transferId}`;
    if (legs.length !== 2) invalid(path, `has ${legs.length} legs, expected 2`);
    const [out, into] = legs[0].amountMinor < 0 ? [legs[0], legs[1]] : [legs[1], legs[0]];
    if (out.amountMinor >= 0 || into.amountMinor <= 0) invalid(path, 'needs one outflow and one inflow');
    if (out.accountId === into.accountId) invalid(path, 'moves money within one account');
    if (out.date !== into.date) invalid(path, 'legs have different dates');
    const sameCurrency = accountById.get(out.accountId)?.currency === accountById.get(into.accountId)?.currency;
    if (sameCurrency && -out.amountMinor !== into.amountMinor) invalid(path, 'legs do not balance');
  }

  budgets.forEach((budget, i) => {
    if (budget.categoryId === undefined) return;
    if (categoryById.get(budget.categoryId)?.kind !== 'expense') {
      invalid(`budgets[${i}].categoryId`, 'unknown or non-expense category');
    }
  });

  return {
    format: BACKUP_FORMAT,
    version: root.version as number,
    exportedAt: typeof root.exportedAt === 'string' ? root.exportedAt : '',
    data: { accounts, categories, transactions, exchangeRates, budgets, settings },
  };
}

type Fields = Record<string, unknown>;

function invalid(path: string, problem: string): never {
  throw new LedgerError('INVALID_BACKUP', `${path}: ${problem}`);
}

function object(value: unknown, path: string): Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid(path, 'expected an object');
  return value as Fields;
}

function list<T>(value: unknown, path: string, parse: (fields: Fields, path: string) => T): T[] {
  if (!Array.isArray(value)) invalid(path, 'expected a list');
  return value.map((item, i) => parse(object(item, `${path}[${i}]`), `${path}[${i}]`));
}

/** Runs a field validator, reporting failures against the field's path. */
function field<T>(path: string, read: () => T): T {
  try {
    return read();
  } catch (error) {
    if (error instanceof LedgerError) invalid(path, error.message);
    throw error;
  }
}

function id(fields: Fields, path: string): string {
  if (typeof fields.id !== 'string' || fields.id === '') invalid(`${path}.id`, 'missing');
  return fields.id;
}

function optionalId(fields: Fields, key: string, path: string): string | undefined {
  const value = fields[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value === '') invalid(`${path}.${key}`, 'expected an id');
  return value;
}

function timestamp(fields: Fields, key: 'createdAt' | 'updatedAt', path: string): number {
  if (typeof fields[key] !== 'number' || !Number.isFinite(fields[key])) invalid(`${path}.${key}`, 'expected a timestamp');
  return fields[key] as number;
}

function flag(fields: Fields, key: string, path: string): boolean {
  if (typeof fields[key] !== 'boolean') invalid(`${path}.${key}`, 'expected true or false');
  return fields[key] as boolean;
}

function assignOptionalText<T extends object>(target: T, fields: Fields, keys: readonly (keyof T & string)[], path: string) {
  for (const key of keys) {
    const text = field(`${path}.${key}`, () => optionalText(fields[key]));
    if (text !== undefined) (target as Record<string, unknown>)[key] = text;
  }
}

function parseAccount(fields: Fields, path: string): Account {
  const account: Account = {
    id: id(fields, path),
    name: field(`${path}.name`, () => requireName(fields.name)),
    kind: field(`${path}.kind`, () => requireOneOf(fields.kind, ACCOUNT_KINDS)),
    currency: field(`${path}.currency`, () => requireCurrency(fields.currency)),
    openingBalanceMinor: field(`${path}.openingBalanceMinor`, () => requireMinor(fields.openingBalanceMinor)),
    archived: flag(fields, 'archived', path),
    createdAt: timestamp(fields, 'createdAt', path),
    updatedAt: timestamp(fields, 'updatedAt', path),
  };
  assignOptionalText(account, fields, ['color'], path);
  return account;
}

function parseCategory(fields: Fields, path: string): Category {
  if (typeof fields.sortOrder !== 'number' || !Number.isFinite(fields.sortOrder)) {
    invalid(`${path}.sortOrder`, 'expected a number');
  }
  const category: Category = {
    id: id(fields, path),
    kind: field(`${path}.kind`, () => requireOneOf(fields.kind, ['income', 'expense'] as const)),
    name: field(`${path}.name`, () => requireName(fields.name)),
    archived: flag(fields, 'archived', path),
    sortOrder: fields.sortOrder,
    createdAt: timestamp(fields, 'createdAt', path),
    updatedAt: timestamp(fields, 'updatedAt', path),
  };
  const parentId = optionalId(fields, 'parentId', path);
  if (parentId !== undefined) category.parentId = parentId;
  assignOptionalText(category, fields, ['key', 'icon', 'color'], path);
  return category;
}

function parseTransaction(fields: Fields, path: string): Transaction {
  const kind = field(`${path}.kind`, () => requireOneOf(fields.kind, ['income', 'expense', 'transfer'] as const));
  const amountMinor = field(`${path}.amountMinor`, () => requireMinor(fields.amountMinor));
  if (amountMinor === 0) invalid(`${path}.amountMinor`, 'must not be zero');
  if (kind === 'income' && amountMinor < 0) invalid(`${path}.amountMinor`, 'income must be positive');
  if (kind === 'expense' && amountMinor > 0) invalid(`${path}.amountMinor`, 'expense must be negative');

  const transaction: Transaction = {
    id: id(fields, path),
    kind,
    accountId: optionalId(fields, 'accountId', path) ?? invalid(`${path}.accountId`, 'missing'),
    amountMinor,
    date: field(`${path}.date`, () => requireDate(fields.date)),
    createdAt: timestamp(fields, 'createdAt', path),
    updatedAt: timestamp(fields, 'updatedAt', path),
  };

  const categoryId = optionalId(fields, 'categoryId', path);
  const transferId = optionalId(fields, 'transferId', path);
  if (kind === 'transfer') {
    if (transferId === undefined) invalid(`${path}.transferId`, 'missing on a transfer');
    if (categoryId !== undefined) invalid(`${path}.categoryId`, 'transfers have no category');
    transaction.transferId = transferId;
  } else {
    if (transferId !== undefined) invalid(`${path}.transferId`, `unexpected on ${kind}`);
    if (categoryId !== undefined) transaction.categoryId = categoryId;
  }
  assignOptionalText(transaction, fields, ['payee', 'note'], path);

  if (fields.originalAmountMinor !== undefined || fields.originalCurrency !== undefined) {
    if (kind === 'transfer') invalid(`${path}.originalAmountMinor`, 'not allowed on transfers');
    const original = field(`${path}.originalAmountMinor`, () =>
      requirePositiveMinor(Math.abs(fields.originalAmountMinor as number)),
    );
    transaction.originalAmountMinor = Math.sign(amountMinor) * original;
    transaction.originalCurrency = field(`${path}.originalCurrency`, () => requireCurrency(fields.originalCurrency));
  }
  return transaction;
}

function parseExchangeRate(fields: Fields, path: string): ExchangeRate {
  const from = field(`${path}.from`, () => requireCurrency(fields.from));
  const to = field(`${path}.to`, () => requireCurrency(fields.to));
  const date = field(`${path}.date`, () => requireDate(fields.date));
  if (from === to) invalid(path, 'rate needs two different currencies');
  if (typeof fields.rate !== 'number' || !Number.isFinite(fields.rate) || fields.rate <= 0) {
    invalid(`${path}.rate`, 'expected a positive number');
  }
  if (id(fields, path) !== exchangeRateId(from, to, date)) invalid(`${path}.id`, 'does not match pair and date');
  return { id: exchangeRateId(from, to, date), from, to, rate: fields.rate, date, updatedAt: timestamp(fields, 'updatedAt', path) };
}

function parseBudget(fields: Fields, path: string): Budget {
  const categoryId = optionalId(fields, 'categoryId', path);
  if (id(fields, path) !== budgetId(categoryId)) invalid(`${path}.id`, 'does not match category');
  const budget: Budget = {
    id: budgetId(categoryId),
    amountMinor: field(`${path}.amountMinor`, () => requirePositiveMinor(fields.amountMinor)),
    currency: field(`${path}.currency`, () => requireCurrency(fields.currency)),
    createdAt: timestamp(fields, 'createdAt', path),
    updatedAt: timestamp(fields, 'updatedAt', path),
  };
  if (categoryId !== undefined) budget.categoryId = categoryId;
  return budget;
}

/** Known settings are validated; unknown keys are dropped. */
function parseSetting(fields: Fields, path: string): SettingRow | null {
  if (fields.key === 'baseCurrency') {
    return { key: 'baseCurrency', value: field(`${path}.value`, () => requireCurrency(fields.value)) };
  }
  return null;
}

function uniqueIds<T extends { id: string }>(rows: readonly T[], path: string): Map<string, T> {
  const byId = new Map<string, T>();
  rows.forEach((row, i) => {
    if (byId.has(row.id)) invalid(`${path}[${i}].id`, `duplicate id ${row.id}`);
    byId.set(row.id, row);
  });
  return byId;
}
