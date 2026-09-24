import Dexie, { type DexieOptions, type Table } from 'dexie';
import type { Account, Budget, Category, ExchangeRate, SettingRow, Transaction } from './types';

/** Separate from the v1 `StudyBudgetDB`, which the old UI still uses. */
export const LEDGER_DB_NAME = 'studybudget-v2';

export class LedgerDB extends Dexie {
  declare accounts: Table<Account, string>;
  declare categories: Table<Category, string>;
  declare transactions: Table<Transaction, string>;
  declare exchangeRates: Table<ExchangeRate, string>;
  declare budgets: Table<Budget, string>;
  declare settings: Table<SettingRow, string>;

  constructor(name: string = LEDGER_DB_NAME, options?: DexieOptions) {
    super(name, options);
    this.version(1).stores({
      accounts: 'id',
      categories: 'id, kind, parentId',
      transactions: 'id, accountId, date, categoryId, transferId',
      exchangeRates: 'id, [from+to], date',
      budgets: 'id, categoryId',
      settings: 'key',
    });
  }
}

export function newId(): string {
  return crypto.randomUUID();
}

/** The app's database. Tests create their own `LedgerDB` instead. */
export const ledgerDb = new LedgerDB();
