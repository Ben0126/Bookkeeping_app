import { createContext, useContext } from 'react';
import type { LedgerDB } from '../core';

export const LedgerContext = createContext<LedgerDB | null>(null);

export function useLedgerDb(): LedgerDB {
  const db = useContext(LedgerContext);
  if (!db) throw new Error('useLedgerDb must be used inside <LedgerProvider>');
  return db;
}
