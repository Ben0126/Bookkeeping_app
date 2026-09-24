import { useEffect, type ReactNode } from 'react';
import { seedDefaultCategories, type LedgerDB } from '../core';
import { LedgerContext } from './ledgerContext';

/** Supplies the database to the app and seeds the default categories on first launch. */
export function LedgerProvider({ db, children }: { db: LedgerDB; children: ReactNode }) {
  useEffect(() => {
    seedDefaultCategories(db).catch((error: unknown) => {
      console.error('Could not seed default categories', error);
    });
  }, [db]);

  return <LedgerContext value={db}>{children}</LedgerContext>;
}
