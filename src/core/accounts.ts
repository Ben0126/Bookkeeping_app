import { newId, type LedgerDB } from './db';
import { LedgerError } from './errors';
import type { CurrencyCode } from './money';
import { ACCOUNT_KINDS, type Account, type AccountKind } from './types';
import { optionalText, requireCurrency, requireFeeBps, requireMinor, requireName, requireOneOf } from './validate';

export interface NewAccount {
  name: string;
  kind: AccountKind;
  currency: CurrencyCode;
  openingBalanceMinor?: number;
  foreignFeeBps?: number;
  color?: string;
}

export type AccountPatch = Partial<
  Pick<Account, 'name' | 'kind' | 'currency' | 'openingBalanceMinor' | 'color' | 'archived'>
> & {
  /** null clears the rate. */
  foreignFeeBps?: number | null;
};

export async function createAccount(db: LedgerDB, input: NewAccount): Promise<Account> {
  const now = Date.now();
  const account: Account = {
    id: newId(),
    name: requireName(input.name),
    kind: requireOneOf(input.kind, ACCOUNT_KINDS),
    currency: requireCurrency(input.currency),
    openingBalanceMinor: requireMinor(input.openingBalanceMinor ?? 0),
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  if (input.foreignFeeBps !== undefined) account.foreignFeeBps = requireFeeBps(input.foreignFeeBps);
  const color = optionalText(input.color);
  if (color) account.color = color;
  await db.accounts.add(account);
  return account;
}

export async function getAccount(db: LedgerDB, id: string): Promise<Account> {
  const account = await db.accounts.get(id);
  if (!account) throw new LedgerError('NOT_FOUND', `Account ${id} not found`);
  return account;
}

export async function listAccounts(
  db: LedgerDB,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<Account[]> {
  const accounts = await db.accounts.toArray();
  return accounts
    .filter((account) => includeArchived || !account.archived)
    .sort((a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name) || (a.id < b.id ? -1 : 1));
}

export async function updateAccount(db: LedgerDB, id: string, patch: AccountPatch): Promise<Account> {
  return db.transaction('rw', [db.accounts, db.transactions, db.recurring], async () => {
    const current = await getAccount(db, id);
    const next: Account = { ...current, updatedAt: Date.now() };

    if (patch.name !== undefined) next.name = requireName(patch.name);
    if (patch.kind !== undefined) next.kind = requireOneOf(patch.kind, ACCOUNT_KINDS);
    if (patch.openingBalanceMinor !== undefined) {
      next.openingBalanceMinor = requireMinor(patch.openingBalanceMinor);
    }
    if (patch.archived !== undefined) next.archived = patch.archived === true;
    if (patch.foreignFeeBps === null) delete next.foreignFeeBps;
    else if (patch.foreignFeeBps !== undefined) next.foreignFeeBps = requireFeeBps(patch.foreignFeeBps);
    if (patch.color !== undefined) {
      const color = optionalText(patch.color);
      if (color) next.color = color;
      else delete next.color;
    }
    if (patch.currency !== undefined && patch.currency !== current.currency) {
      next.currency = requireCurrency(patch.currency);
      // Existing postings and recurring amounts are in the old currency's minor units.
      if (
        (await db.transactions.where('accountId').equals(id).count()) > 0 ||
        (await db.recurring.filter((rule) => rule.template.accountId === id).count()) > 0
      ) {
        throw new LedgerError('CURRENCY_LOCKED', 'Cannot change the currency of an account with transactions');
      }
    }

    await db.accounts.put(next);
    return next;
  });
}

/**
 * Only accounts without transactions can be deleted; archive the others.
 * Recurring rules that post to the account are deleted with it.
 */
export async function deleteAccount(db: LedgerDB, id: string): Promise<void> {
  await db.transaction('rw', [db.accounts, db.transactions, db.recurring], async () => {
    await getAccount(db, id);
    if ((await db.transactions.where('accountId').equals(id).count()) > 0) {
      throw new LedgerError('ACCOUNT_IN_USE', 'Account has transactions; archive it instead');
    }
    await db.recurring.filter((rule) => rule.template.accountId === id).delete();
    await db.accounts.delete(id);
  });
}

export async function getAccountBalance(db: LedgerDB, id: string): Promise<number> {
  return db.transaction('r', [db.accounts, db.transactions], async () => {
    const account = await getAccount(db, id);
    let balance = account.openingBalanceMinor;
    await db.transactions
      .where('accountId')
      .equals(id)
      .each((transaction) => {
        balance += transaction.amountMinor;
      });
    return balance;
  });
}

/**
 * Makes the account's current balance equal `balanceMinor` (e.g. what the
 * bank app shows) by moving the opening balance. Past transactions are kept.
 */
export async function setAccountBalance(db: LedgerDB, id: string, balanceMinor: number): Promise<Account> {
  const target = requireMinor(balanceMinor);
  return db.transaction('rw', [db.accounts, db.transactions, db.recurring], async () => {
    const current = await getAccountBalance(db, id);
    const account = await getAccount(db, id);
    if (current === target) return account;
    return updateAccount(db, id, { openingBalanceMinor: account.openingBalanceMinor + target - current });
  });
}

/** Current balance of every account (archived included), keyed by account id. */
export async function getBalances(db: LedgerDB): Promise<Record<string, number>> {
  return db.transaction('r', [db.accounts, db.transactions], async () => {
    const balances: Record<string, number> = {};
    await db.accounts.each((account) => {
      balances[account.id] = account.openingBalanceMinor;
    });
    await db.transactions.each((transaction) => {
      balances[transaction.accountId] = (balances[transaction.accountId] ?? 0) + transaction.amountMinor;
    });
    return balances;
  });
}
