import Dexie, { type Table } from 'dexie';
import type { Account, Transaction, Category } from '../types';

export class StudyBudgetDB extends Dexie {
  accounts!: Table<Account>;
  transactions!: Table<Transaction>;
  categories!: Table<Category>;

  constructor() {
    super('StudyBudgetDB');
    this.version(1).stores({
      accounts: '++id, name, type, currency',
      transactions: '++id, type, date, accountId, categoryId',
      categories: '++id, name, type',
    });
  }
}

export const db = new StudyBudgetDB();
