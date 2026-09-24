import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { createAccount, type NewAccount } from '../core/accounts';
import { LedgerDB } from '../core/db';

/** A fresh, isolated in-memory database for each test. */
export function createTestDb(): LedgerDB {
  return new LedgerDB('test', { indexedDB: new IDBFactory(), IDBKeyRange });
}

export function addAccount(db: LedgerDB, overrides: Partial<NewAccount> = {}) {
  return createAccount(db, { name: 'Wallet', kind: 'cash', currency: 'USD', ...overrides });
}
