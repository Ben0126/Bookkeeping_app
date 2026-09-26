import type { Transaction } from '../../core';

/** One row in the transaction list. */
export type Entry =
  | { type: 'single'; id: string; date: string; record: Transaction }
  | {
      type: 'transfer';
      /** The transfer id. */
      id: string;
      date: string;
      outflow: Transaction;
      inflow: Transaction;
      /** Which leg belongs to the account the list is filtered to, if any. */
      side?: 'outflow' | 'inflow';
    };

/**
 * Turns listed postings (newest first) into list rows. Both legs of a
 * transfer become one row; `legs` supplies legs the filter left out, so a
 * transfer shown for one account still knows the other account.
 */
export function toEntries(
  rows: readonly Transaction[],
  legs: readonly Transaction[],
  accountId?: string,
): Entry[] {
  const legsByTransfer = new Map<string, Map<string, Transaction>>();
  for (const leg of [...rows, ...legs]) {
    if (leg.transferId === undefined) continue;
    let pair = legsByTransfer.get(leg.transferId);
    if (!pair) legsByTransfer.set(leg.transferId, (pair = new Map()));
    pair.set(leg.id, leg);
  }

  const entries: Entry[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.transferId === undefined) {
      entries.push({ type: 'single', id: row.id, date: row.date, record: row });
      continue;
    }
    if (seen.has(row.transferId)) continue;
    seen.add(row.transferId);

    const pair = [...(legsByTransfer.get(row.transferId)?.values() ?? [])];
    const outflow = pair.find((leg) => leg.amountMinor < 0);
    const inflow = pair.find((leg) => leg.amountMinor > 0);
    if (!outflow || !inflow) {
      entries.push({ type: 'single', id: row.id, date: row.date, record: row });
      continue;
    }
    const side =
      accountId === outflow.accountId ? 'outflow' : accountId === inflow.accountId ? 'inflow' : undefined;
    entries.push({ type: 'transfer', id: row.transferId, date: row.date, outflow, inflow, ...(side && { side }) });
  }
  return entries;
}

/** Groups rows by day, keeping their order. */
export function groupByDate(entries: readonly Entry[]): { date: string; entries: Entry[] }[] {
  const groups: { date: string; entries: Entry[] }[] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (last?.date === entry.date) last.entries.push(entry);
    else groups.push({ date: entry.date, entries: [entry] });
  }
  return groups;
}
