import type { Account, Transaction } from '../../core';

/** An entry made often, e.g. lunch at the student cafeteria paid in cash. */
export interface QuickPick {
  kind: 'expense' | 'income';
  payee?: string;
  categoryId?: string;
  accountId: string;
  count: number;
}

const normalize = (text: string | undefined) => text?.trim().toLocaleLowerCase() ?? '';

/** Everyday income and expenses; refunds and transfers are one-offs. */
function everyday(t: Transaction): t is Transaction & { kind: 'expense' | 'income' } {
  return (t.kind === 'expense' && t.amountMinor < 0) || t.kind === 'income';
}

/**
 * The payee, category and account combinations used at least twice,
 * most frequent first (then most recent), on accounts still in use.
 */
export function frequentEntries(
  recent: readonly Transaction[],
  accounts: readonly Account[],
  limit = 6,
): QuickPick[] {
  const active = new Set(accounts.filter((a) => !a.archived).map((a) => a.id));
  const picks = new Map<string, QuickPick & { last: string }>();
  for (const t of recent) {
    if (!everyday(t) || !active.has(t.accountId) || (!t.payee && !t.categoryId)) continue;
    const key = [t.kind, normalize(t.payee), t.categoryId ?? '', t.accountId].join('|');
    const pick = picks.get(key);
    if (pick) {
      pick.count += 1;
      if (t.date > pick.last) pick.last = t.date;
    } else {
      picks.set(key, {
        kind: t.kind,
        ...(t.payee && { payee: t.payee }),
        ...(t.categoryId && { categoryId: t.categoryId }),
        accountId: t.accountId,
        count: 1,
        last: t.date,
      });
    }
  }
  return [...picks.values()]
    .filter((pick) => pick.count >= 2)
    .sort((a, b) => b.count - a.count || (a.last < b.last ? 1 : a.last > b.last ? -1 : 0))
    .slice(0, limit)
    .map(({ kind, payee, categoryId, accountId, count }) => ({
      kind,
      ...(payee && { payee }),
      ...(categoryId && { categoryId }),
      accountId,
      count,
    }));
}

/** Payees used before, most frequent first, spelled as most recently typed. */
export function payeeSuggestions(recent: readonly Transaction[], limit = 30): string[] {
  const payees = new Map<string, { name: string; count: number; last: string }>();
  for (const t of recent) {
    const key = normalize(t.payee);
    if (!key || t.kind === 'transfer') continue;
    const entry = payees.get(key);
    if (!entry) payees.set(key, { name: t.payee!.trim(), count: 1, last: t.date });
    else {
      entry.count += 1;
      if (t.date >= entry.last) Object.assign(entry, { name: t.payee!.trim(), last: t.date });
    }
  }
  return [...payees.values()]
    .sort((a, b) => b.count - a.count || (a.last < b.last ? 1 : -1))
    .slice(0, limit)
    .map((entry) => entry.name);
}

/** The category most often used with this payee for this kind of entry. */
export function categoryForPayee(
  recent: readonly Transaction[],
  payee: string,
  kind: 'expense' | 'income',
): string | undefined {
  const key = normalize(payee);
  if (!key) return undefined;
  const counts = new Map<string, number>();
  for (const t of recent) {
    if (t.kind !== kind || !everyday(t) || !t.categoryId || normalize(t.payee) !== key) continue;
    counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
  }
  let best: string | undefined;
  for (const [categoryId, count] of counts) if (!best || count > counts.get(best)!) best = categoryId;
  return best;
}
