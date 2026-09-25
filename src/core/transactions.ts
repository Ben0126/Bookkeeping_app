import { newId, type LedgerDB } from './db';
import { LedgerError } from './errors';
import type { CurrencyCode } from './money';
import { findFeeCategory } from './categories';
import type { Account, Category, Transaction, TransactionKind } from './types';
import { optionalText, requireCurrency, requireDate, requireMinor, requirePositiveMinor } from './validate';

export interface IncomeExpenseInput {
  kind: 'income' | 'expense';
  accountId: string;
  /** Positive amount in the account currency's minor units. */
  amountMinor: number;
  date: string;
  categoryId?: string;
  payee?: string;
  note?: string;
  /** Foreign-currency amount charged before the bank converted it (positive). */
  original?: { amountMinor: number; currency: CurrencyCode };
  /**
   * Expenses only: money coming back, such as a refund or a friend paying
   * back their share. It is stored as an inflow that reduces spending in the
   * category instead of counting as income.
   */
  refund?: boolean;
  /**
   * Expenses only: the part of `amountMinor` that is a fee, such as a card's
   * foreign transaction fee (positive, less than `amountMinor`).
   */
  feeMinor?: number;
  /** Paid in another currency: the amounts are estimates, to check against the statement. */
  estimated?: boolean;
}

export interface TransferInput {
  kind: 'transfer';
  fromAccountId: string;
  toAccountId: string;
  /** Positive amount leaving `fromAccountId`, in its minor units. */
  amountMinor: number;
  /** Positive amount arriving in `toAccountId`; required when the currencies differ. */
  toAmountMinor?: number;
  date: string;
  note?: string;
  /**
   * When creating: a fee charged to `fromAccountId` (ATM, wire), in its minor
   * units. It is saved as its own expense, in the "fees" category unless
   * another is given, and is edited or deleted like any other expense.
   */
  fee?: { amountMinor: number; categoryId?: string };
}

export type TransactionInput = IncomeExpenseInput | TransferInput;

/**
 * Records an income, expense or transfer. Returns the stored postings: one
 * record, or two (outflow first) for a transfer, followed by its fee expense
 * if one was given.
 */
export async function createTransaction(db: LedgerDB, input: TransactionInput): Promise<Transaction[]> {
  return db.transaction('rw', [db.accounts, db.categories, db.transactions], async () => {
    const now = Date.now();
    const ctx: BuildContext = { ids: [], createdAt: now, updatedAt: now, existing: [] };
    const records = await buildRecords(db, input, ctx);
    if (input.kind === 'transfer' && input.fee !== undefined) {
      const categoryId = input.fee.categoryId ?? (await findFeeCategoryId(db));
      const fee: IncomeExpenseInput = {
        kind: 'expense',
        accountId: input.fromAccountId,
        amountMinor: input.fee.amountMinor,
        date: input.date,
        ...(categoryId !== undefined && { categoryId }),
        ...(input.note !== undefined && { note: input.note }),
      };
      records.push(...(await buildRecords(db, fee, ctx)));
    }
    await db.transactions.bulkAdd(records);
    return records;
  });
}

/**
 * Checks that `input` could be recorded (accounts, categories, amounts)
 * without writing anything; throws the same LedgerError a save would.
 */
export async function checkTransactionInput(db: LedgerDB, input: TransactionInput): Promise<void> {
  await db.transaction('r', [db.accounts, db.categories], () =>
    buildRecords(db, input, { ids: [], createdAt: 0, updatedAt: 0, existing: [] }),
  );
}

/** The built-in "fees" category, unless it has been hidden. */
async function findFeeCategoryId(db: LedgerDB): Promise<string | undefined> {
  const category = findFeeCategory(await db.categories.toArray());
  if (category?.archived) return undefined;
  return category?.id;
}

/**
 * Replaces the transaction that `id` belongs to (either leg of a transfer, or
 * its `transferId`). The kind may change, e.g. an expense into a transfer.
 * A transfer `fee` is ignored here: once saved, the fee is its own expense.
 */
export async function updateTransaction(
  db: LedgerDB,
  id: string,
  input: TransactionInput,
): Promise<Transaction[]> {
  return db.transaction('rw', [db.accounts, db.categories, db.transactions], async () => {
    const existing = await getTransactionGroup(db, id);
    const records = await buildRecords(db, input, {
      ids: existing.map((record) => record.id),
      transferId: existing[0].transferId,
      createdAt: existing[0].createdAt,
      updatedAt: Date.now(),
      existing,
    });
    await db.transactions.bulkDelete(existing.map((record) => record.id));
    await db.transactions.bulkAdd(records);
    return records;
  });
}

/** Deletes a transaction; deleting either leg of a transfer deletes both. */
export async function deleteTransaction(db: LedgerDB, id: string): Promise<void> {
  await db.transaction('rw', db.transactions, async () => {
    const group = await getTransactionGroup(db, id);
    await db.transactions.bulkDelete(group.map((record) => record.id));
  });
}

/**
 * The postings that make up one transaction: a single record, or both legs of
 * a transfer (outflow first). `id` may be a record id or a transfer id.
 */
export async function getTransactionGroup(db: LedgerDB, id: string): Promise<Transaction[]> {
  const record = await db.transactions.get(id);
  if (record && record.transferId === undefined) return [record];

  const transferId = record?.transferId ?? id;
  const legs = await db.transactions.where('transferId').equals(transferId).toArray();
  if (legs.length === 0) throw new LedgerError('NOT_FOUND', `Transaction ${id} not found`);
  return legs.sort((a, b) => a.amountMinor - b.amountMinor);
}

/** The input that recreates a stored transaction, e.g. to prefill an edit form. */
export async function getTransactionInput(db: LedgerDB, id: string): Promise<TransactionInput> {
  return toTransactionInput(await getTransactionGroup(db, id));
}

export function toTransactionInput(group: readonly Transaction[]): TransactionInput {
  const [first, second] = group;
  if (first.kind === 'transfer') {
    if (!second) throw new LedgerError('NOT_FOUND', `Transfer ${first.transferId} is missing a leg`);
    const [out, into] = first.amountMinor < 0 ? [first, second] : [second, first];
    return {
      kind: 'transfer',
      fromAccountId: out.accountId,
      toAccountId: into.accountId,
      amountMinor: -out.amountMinor,
      toAmountMinor: into.amountMinor,
      date: out.date,
      ...(out.note !== undefined && { note: out.note }),
    };
  }
  const input: IncomeExpenseInput = {
    kind: first.kind,
    accountId: first.accountId,
    amountMinor: Math.abs(first.amountMinor),
    date: first.date,
  };
  if (first.kind === 'expense' && first.amountMinor > 0) input.refund = true;
  if (first.categoryId !== undefined) input.categoryId = first.categoryId;
  if (first.payee !== undefined) input.payee = first.payee;
  if (first.note !== undefined) input.note = first.note;
  if (first.originalAmountMinor !== undefined && first.originalCurrency !== undefined) {
    input.original = { amountMinor: Math.abs(first.originalAmountMinor), currency: first.originalCurrency };
  }
  if (first.feeMinor !== undefined) input.feeMinor = Math.abs(first.feeMinor);
  if (first.estimated) input.estimated = true;
  return input;
}

export interface TransactionFilter {
  accountId?: string;
  /**
   * Matches any of these categories. Listing the Fees category also matches
   * expenses that include a fee.
   */
  categoryIds?: readonly string[];
  kind?: TransactionKind;
  /** Inclusive "YYYY-MM-DD" bounds. */
  from?: string;
  to?: string;
  /** Case-insensitive match on payee and note. */
  search?: string;
  /**
   * Categories whose (displayed) name matches `search`, so searching "Dining"
   * also finds uncommented dining entries. The caller resolves names, since
   * built-in names are translated.
   */
  searchCategoryIds?: readonly string[];
  /** Only estimates still to check against a statement. */
  estimatedOnly?: boolean;
  offset?: number;
  limit?: number;
}

/** Postings matching `filter`, newest first. Each transfer leg is its own row. */
export async function listTransactions(db: LedgerDB, filter: TransactionFilter = {}): Promise<Transaction[]> {
  const { accountId, categoryIds, searchCategoryIds, kind, from, to, estimatedOnly, offset = 0, limit } = filter;
  const search = filter.search?.trim().toLocaleLowerCase();

  const collection = accountId !== undefined
    ? db.transactions.where('accountId').equals(accountId)
    : from !== undefined || to !== undefined
      ? db.transactions.where('date').between(from ?? '', to ?? '\uffff', true, true)
      : db.transactions.toCollection();

  const feeCategoryId = categoryIds || searchCategoryIds ? findFeeCategory(await db.categories.toArray())?.id : undefined;
  const inCategories = (t: Transaction, ids: readonly string[]) =>
    (t.categoryId !== undefined && ids.includes(t.categoryId)) ||
    (t.feeMinor !== undefined && feeCategoryId !== undefined && ids.includes(feeCategoryId));

  const rows = (await collection.toArray()).filter(
    (t) =>
      (kind === undefined || t.kind === kind) &&
      (!estimatedOnly || t.estimated === true) &&
      (from === undefined || t.date >= from) &&
      (to === undefined || t.date <= to) &&
      (categoryIds === undefined || inCategories(t, categoryIds)) &&
      (!search ||
        (t.payee?.toLocaleLowerCase().includes(search) ?? false) ||
        (t.note?.toLocaleLowerCase().includes(search) ?? false) ||
        (searchCategoryIds !== undefined && inCategories(t, searchCategoryIds))),
  );
  rows.sort(compareNewestFirst);
  return rows.slice(offset, limit === undefined ? undefined : offset + limit);
}

export function compareNewestFirst(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
  return a.amountMinor - b.amountMinor || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

interface BuildContext {
  /** Ids to reuse, in order (an update keeps its record ids). */
  ids: readonly string[];
  transferId?: string;
  createdAt: number;
  updatedAt: number;
  /** Records being replaced; their archived accounts/categories stay allowed. */
  existing: readonly Transaction[];
}

async function buildRecords(db: LedgerDB, input: TransactionInput, ctx: BuildContext): Promise<Transaction[]> {
  const date = requireDate(input.date);
  const amountMinor = requirePositiveMinor(input.amountMinor);
  const note = optionalText(input.note);
  const base = { date, createdAt: ctx.createdAt, updatedAt: ctx.updatedAt, ...(note !== undefined && { note }) };

  if (input.kind === 'transfer') {
    if (input.fromAccountId === input.toAccountId) {
      throw new LedgerError('SAME_ACCOUNT_TRANSFER', 'Cannot transfer to the same account');
    }
    const from = await requireUsableAccount(db, input.fromAccountId, ctx);
    const to = await requireUsableAccount(db, input.toAccountId, ctx);
    let toAmountMinor = amountMinor;
    if (from.currency === to.currency) {
      // A same-currency transfer moves money; a fee is a separate expense.
      if (input.toAmountMinor !== undefined && input.toAmountMinor !== amountMinor) {
        throw new LedgerError('TRANSFER_AMOUNT_MISMATCH', 'Both sides of a same-currency transfer must be equal');
      }
    } else {
      if (input.toAmountMinor === undefined) {
        throw new LedgerError('TRANSFER_AMOUNT_REQUIRED', `Enter the amount received in ${to.currency}`);
      }
      toAmountMinor = requirePositiveMinor(input.toAmountMinor);
    }
    const transferId = ctx.transferId ?? newId();
    return [
      { id: ctx.ids[0] ?? newId(), kind: 'transfer', accountId: from.id, amountMinor: -amountMinor, transferId, ...base },
      { id: ctx.ids[1] ?? newId(), kind: 'transfer', accountId: to.id, amountMinor: toAmountMinor, transferId, ...base },
    ];
  }

  if (input.kind !== 'income' && input.kind !== 'expense') {
    throw new LedgerError('INVALID_KIND', `Unknown transaction kind ${String((input as { kind: unknown }).kind)}`);
  }
  if (input.refund && input.kind !== 'expense') {
    throw new LedgerError('INVALID_KIND', 'Only expenses can be refunds');
  }
  const sign = input.kind === 'income' || input.refund ? 1 : -1;
  const account = await requireUsableAccount(db, input.accountId, ctx);
  const record: Transaction = {
    id: ctx.ids[0] ?? newId(),
    kind: input.kind,
    accountId: account.id,
    amountMinor: sign * amountMinor,
    ...base,
  };
  if (input.categoryId !== undefined) {
    record.categoryId = (await requireUsableCategory(db, input.categoryId, input.kind, ctx)).id;
  }
  const payee = optionalText(input.payee);
  if (payee) record.payee = payee;
  if (input.original !== undefined) {
    const currency = requireCurrency(input.original.currency);
    if (currency === account.currency) {
      throw new LedgerError('INVALID_ORIGINAL_AMOUNT', 'Original currency must differ from the account currency');
    }
    record.originalAmountMinor = sign * requirePositiveMinor(input.original.amountMinor);
    record.originalCurrency = currency;
  }
  if (input.feeMinor !== undefined) {
    if (input.kind !== 'expense' || input.refund) {
      throw new LedgerError('INVALID_FEE', 'Only expenses can include a fee');
    }
    const fee = requireMinor(input.feeMinor);
    if (fee <= 0 || fee >= amountMinor) throw new LedgerError('INVALID_FEE', 'Fee must be above zero and below the amount');
    record.feeMinor = sign * fee;
  }
  if (input.estimated) {
    if (input.original === undefined) {
      throw new LedgerError('INVALID_ORIGINAL_AMOUNT', 'Only amounts paid in another currency are estimated');
    }
    record.estimated = true;
  }
  return [record];
}

async function requireUsableAccount(db: LedgerDB, id: string, ctx: BuildContext): Promise<Account> {
  const account = await db.accounts.get(id);
  if (!account) throw new LedgerError('NOT_FOUND', `Account ${id} not found`);
  if (account.archived && !ctx.existing.some((record) => record.accountId === id)) {
    throw new LedgerError('ACCOUNT_ARCHIVED', `Account ${account.name} is archived`);
  }
  return account;
}

async function requireUsableCategory(
  db: LedgerDB,
  id: string,
  kind: 'income' | 'expense',
  ctx: BuildContext,
): Promise<Category> {
  const category = await db.categories.get(id);
  if (!category) throw new LedgerError('NOT_FOUND', `Category ${id} not found`);
  if (category.kind !== kind) {
    throw new LedgerError('CATEGORY_KIND_MISMATCH', `${category.name} is not an ${kind} category`);
  }
  if (category.archived && !ctx.existing.some((record) => record.categoryId === id)) {
    throw new LedgerError('CATEGORY_ARCHIVED', `Category ${category.name} is archived`);
  }
  return category;
}
