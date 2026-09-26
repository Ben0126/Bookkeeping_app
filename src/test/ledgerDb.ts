import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { createAccount, type NewAccount } from '../core/accounts';
import { LedgerDB } from '../core/db';

let count = 0;

/**
 * A fresh, isolated in-memory database for each test. Names must be unique:
 * Dexie caches live query results per database name across instances.
 */
export function createTestDb(): LedgerDB {
  return new LedgerDB(`test-${++count}`, { indexedDB: new IDBFactory(), IDBKeyRange });
}

export function addAccount(db: LedgerDB, overrides: Partial<NewAccount> = {}) {
  return createAccount(db, { name: 'Wallet', kind: 'cash', currency: 'USD', ...overrides });
}
