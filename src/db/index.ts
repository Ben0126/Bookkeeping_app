import Dexie, { type Table } from 'dexie';
import type { Account, Transaction, Category, MerchantRule } from '../types';

export class StudyBudgetDB extends Dexie {
  accounts!: Table<Account>;
  transactions!: Table<Transaction>;
  categories!: Table<Category>;
  merchantRules!: Table<MerchantRule>;

  constructor() {
    super('StudyBudgetDB');
    this.version(1).stores({
      accounts: '++id, name, type, currency',
      transactions: '++id, type, date, accountId, categoryId',
      categories: '++id, name, type',
    });

    // Version 2: Add merchantRules table
    this.version(2).stores({
      merchantRules: '++id, pattern, categoryId, lastUsed, usageCount'
    });
  }
}

export const db = new StudyBudgetDB();

