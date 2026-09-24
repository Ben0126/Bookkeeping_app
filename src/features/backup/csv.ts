import { toMoneyInput, type Account, type Category, type Transaction } from '../../core';
import { fileTimestamp } from './backupFile';

export type CsvKind = 'income' | 'expense' | 'refund' | 'transfer';

export interface CsvLabels {
  /** Column headings, in the order of the columns below. */
  headers: readonly string[];
  kind: (kind: CsvKind) => string;
  categoryName: (category: Category | undefined) => string;
}

/**
 * One row per posting, oldest first, so each account's rows sum to its
 * change in balance. Amounts are plain signed numbers ("-12.50") that
 * spreadsheets read as numbers. Columns: date, type, account, currency,
 * amount, fee included in the amount, category, payee, note, other account
 * (transfers), original currency, original amount.
 */
export function transactionsToCsv(
  transactions: readonly Transaction[],
  accounts: readonly Account[],
  categories: readonly Category[],
  labels: CsvLabels,
): string {
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const legsByTransfer = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.transferId === undefined) continue;
    legsByTransfer.set(t.transferId, [...(legsByTransfer.get(t.transferId) ?? []), t]);
  }

  // Entries saved together (a transfer and its fee) keep both transfer legs side by side.
  const sorted = [...transactions].sort(
    (a, b) =>
      (a.date !== b.date ? (a.date < b.date ? -1 : 1) : 0) ||
      a.createdAt - b.createdAt ||
      Number(a.transferId === undefined) - Number(b.transferId === undefined) ||
      a.amountMinor - b.amountMinor,
  );
  const rows = sorted.map((t) => {
    const account = accountById.get(t.accountId);
    const currency = account?.currency;
    const kind: CsvKind = t.kind === 'expense' && t.amountMinor > 0 ? 'refund' : t.kind;
    const other = t.transferId
      ? legsByTransfer.get(t.transferId)?.find((leg) => leg.id !== t.id)
      : undefined;
    return [
      t.date,
      labels.kind(kind),
      text(account?.name ?? ''),
      currency ?? '',
      currency ? toMoneyInput(t.amountMinor, currency) : String(t.amountMinor),
      t.feeMinor === undefined ? '' : currency ? toMoneyInput(t.feeMinor, currency) : String(t.feeMinor),
      t.kind === 'transfer' ? '' : text(labels.categoryName(t.categoryId ? categoryById.get(t.categoryId) : undefined)),
      text(t.payee ?? ''),
      text(t.note ?? ''),
      text(other ? (accountById.get(other.accountId)?.name ?? '') : ''),
      t.originalCurrency ?? '',
      t.originalCurrency && t.originalAmountMinor !== undefined ? toMoneyInput(t.originalAmountMinor, t.originalCurrency) : '',
    ];
  });

  return [labels.headers, ...rows].map((row) => row.map(quote).join(',')).join('\r\n') + '\r\n';
}

/** Keeps user text from being run as a spreadsheet formula ("=HYPERLINK(…)"). */
function text(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function quote(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * The CSV as a file. The byte order mark makes Excel read it as UTF-8, so
 * Chinese text is not garbled.
 */
export function toCsvFile(csv: string, now: Date): File {
  return new File(['﻿', csv], `studybudget-transactions-${fileTimestamp(now)}.csv`, { type: 'text/csv' });
}
