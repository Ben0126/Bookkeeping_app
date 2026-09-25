import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  isMonthKey,
  listAccounts,
  listCategories,
  listTransactions,
  monthOf,
  monthRange,
  toDateKey,
  type Account,
  type Category,
  type TransactionKind,
} from '../../core';
import { BackupReminder } from '../backup/BackupReminder';
import { RecurringDue } from '../recurring/RecurringDue';
import { CloseIcon, FilterIcon, PlusIcon, SearchIcon, TransferIcon } from '../../ui/icons';
import { MonthNav } from '../../ui/MonthNav';
import { inputClass, primaryButtonClass } from '../../ui/styles';
import { useFormat } from '../../ui/useFormat';
import { groupByDate, toEntries, type Entry } from './entries';
import { MonthSummary } from './MonthSummary';
import { TransactionDialog } from './TransactionDialog';

const KINDS: readonly TransactionKind[] = ['expense', 'income', 'transfer'];

export function TransactionsPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const [params, setParams] = useSearchParams();
  const [editingId, setEditingId] = useState<string | null>(null);
  // In the URL so the "+" in the bottom bar can open it from any page.
  const adding = params.get('add') === '1';
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const today = toDateKey(new Date());
  const monthParam = params.get('month');
  const month = isMonthKey(monthParam) ? monthParam : monthOf(today);
  const accountId = params.get('account') || undefined;
  const kind = KINDS.find((k) => k === params.get('kind'));
  const search = params.get('q') ?? '';
  const searching = search.trim() !== '';
  const categoryFilter = params.get('category') || undefined;
  const estimatedOnly = params.get('estimated') === '1';
  // A search looks through every month ("when did I last pay the dentist?"), as does
  // the list of estimates still to check against a statement.
  const allMonths = searching || estimatedOnly;
  const { from, to } = allMonths ? { from: undefined, to: undefined } : monthRange(month);

  const setParam = (key: string, value: string | undefined) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: key === 'q' },
    );

  const accounts = useLiveQuery(() => listAccounts(db, { includeArchived: true }), [db]);
  const categories = useLiveQuery(() => listCategories(db, { includeArchived: true }), [db]);
  // Searching "rent" or "房租" also finds entries in that category; names are matched as displayed.
  const searchCategoryKey = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle || !categories) return '';
    return categories
      .filter((c) => fmt.categoryName(c).toLocaleLowerCase().includes(needle))
      .map((c) => c.id)
      .join(',');
  }, [categories, search, fmt]);
  const listed = useLiveQuery(async () => {
    // A parent category also covers its subcategories.
    const categoryIds = categoryFilter
      ? [categoryFilter, ...(await db.categories.where('parentId').equals(categoryFilter).primaryKeys())]
      : undefined;
    const searchCategoryIds = searchCategoryKey ? searchCategoryKey.split(',') : [];
    const rows = await listTransactions(db, {
      from,
      to,
      accountId,
      kind,
      search,
      categoryIds,
      searchCategoryIds,
      estimatedOnly,
    });
    const transferIds = [...new Set(rows.flatMap((row) => (row.transferId ? [row.transferId] : [])))];
    const legs = transferIds.length > 0 ? await db.transactions.where('transferId').anyOf(transferIds).toArray() : [];
    return { rows, entries: toEntries(rows, legs, accountId), categoryIds };
  }, [db, from, to, accountId, kind, search, searchCategoryKey, categoryFilter, estimatedOnly]);
  const estimateCount = useLiveQuery(() => db.transactions.filter((t) => t.estimated === true).count(), [db]);

  const accountsById = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);
  const activeAccounts = (accounts ?? []).filter((a) => !a.archived);
  const hasEntries = useLiveQuery(async () => (await db.transactions.limit(1).count()) > 0, [db]);

  if (!accounts || !categories || hasEntries === undefined) return null;

  // First launch: set up currencies and accounts (or restore a backup).
  if (accounts.length === 0) return <Navigate to="/welcome" replace />;

  if (activeAccounts.length === 0) {
    return (
      <div className="mt-8 rounded-2xl bg-surface p-8 text-center ring-1 ring-slate-200">
        <p className="text-4xl" aria-hidden="true">
          👛
        </p>
        <h1 className="mt-3 text-lg font-semibold">{t('transactions.noAccountsTitle')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('transactions.noAccountsBody')}</p>
        <Link to="/accounts" className={`${primaryButtonClass} mt-5`}>
          {t('transactions.goToAccounts')}
        </Link>
      </div>
    );
  }

  const openNewEntry = () => setParam('add', '1');
  const closeAndShow = (date?: string) => {
    setEditingId(null);
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete('add');
        if (date && !allMonths && monthOf(date) !== month) next.set('month', monthOf(date));
        return next;
      },
      { replace: true },
    );
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setParam('q', undefined);
  };
  const filterCount = [accountId, kind, categoryFilter, estimatedOnly].filter(Boolean).length;
  const chipClass =
    'inline-flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pr-2 pl-3 text-sm font-medium text-indigo-800 ring-1 ring-indigo-200 hover:bg-indigo-100';
  const iconButtonClass = (active: boolean) =>
    'relative rounded-full p-2 hover:bg-slate-200 ' + (active ? 'text-indigo-700' : 'text-slate-600');
  // Results across months span years.
  const dayLabel = allMonths ? fmt.dayWithYear : fmt.day;

  return (
    <div className="space-y-4">
      <BackupReminder />
      <RecurringDue accountsById={accountsById} categoriesById={categoriesById} />
      <div className="flex items-center justify-between gap-2">
        {allMonths ? (
          <h1 className="py-1.5 text-lg font-semibold">
            {!listed
              ? t('transactions.search')
              : searching
                ? t('transactions.searchResults', { count: listed.entries.length })
                : t('transactions.estimatedResults', { count: listed.entries.length })}
          </h1>
        ) : (
          <MonthNav month={month} onChange={(next) => setParam('month', next)} />
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={iconButtonClass(searchOpen || searching)}
            aria-label={t('transactions.search')}
            aria-expanded={searchOpen || searching}
            onClick={() => (searchOpen || searching ? closeSearch() : setSearchOpen(true))}
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className={iconButtonClass(filtersOpen || filterCount > 0)}
            aria-label={t('transactions.filters')}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <FilterIcon />
            {filterCount > 0 && (
              <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {filterCount}
              </span>
            )}
          </button>
          {/* Phones use the "+" in the bottom bar. */}
          <div className="ml-2 hidden md:block">
            <button type="button" className={primaryButtonClass} onClick={openNewEntry}>
              <PlusIcon />
              {t('transactions.add')}
            </button>
          </div>
        </div>
      </div>

      {(searchOpen || searching) && (
        <div className="flex items-center gap-2">
          <label className="relative flex-1">
            <span className="sr-only">{t('transactions.search')}</span>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="search"
              className={`${inputClass} pl-10`}
              placeholder={t('transactions.searchPlaceholder')}
              autoFocus={searchOpen && !searching}
              value={search}
              onChange={(e) => setParam('q', e.target.value)}
            />
          </label>
          <button type="button" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200" onClick={closeSearch}>
            {t('common.cancel')}
          </button>
        </div>
      )}

      {filtersOpen && (
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label={t('transactions.filterAccount')}
            className={inputClass}
            value={accountId ?? ''}
            onChange={(e) => setParam('account', e.target.value)}
          >
            <option value="">{t('transactions.allAccounts')}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.archived ? t('accounts.archivedName', { name: account.name }) : account.name}
              </option>
            ))}
          </select>
          <select
            aria-label={t('transactions.filterKind')}
            className={inputClass}
            value={kind ?? ''}
            onChange={(e) => setParam('kind', e.target.value)}
          >
            <option value="">{t('transactions.allKinds')}</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </select>
          {(estimateCount ?? 0) > 0 && (
            <label className="col-span-2 flex items-center gap-2 px-1 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300 text-indigo-600"
                checked={estimatedOnly}
                onChange={(e) => setParam('estimated', e.target.checked ? '1' : undefined)}
              />
              {t('transactions.estimatedFilter', { count: estimateCount })}
            </label>
          )}
        </div>
      )}

      {filterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {accountId && (
            <button type="button" onClick={() => setParam('account', undefined)} className={chipClass}>
              {t('transactions.filterAccountChip', { name: accountsById.get(accountId)?.name ?? '?' })}
              <span className="sr-only">{t('transactions.clearFilter')}</span>
              <CloseIcon className="size-4" />
            </button>
          )}
          {kind && (
            <button type="button" onClick={() => setParam('kind', undefined)} className={chipClass}>
              {t('transactions.filterKindChip', { name: t(`kinds.${kind}`) })}
              <span className="sr-only">{t('transactions.clearFilter')}</span>
              <CloseIcon className="size-4" />
            </button>
          )}
          {estimatedOnly && (
            <button type="button" onClick={() => setParam('estimated', undefined)} className={chipClass}>
              {t('transactions.estimatedChip')}
              <span className="sr-only">{t('transactions.clearFilter')}</span>
              <CloseIcon className="size-4" />
            </button>
          )}
          {categoryFilter && (
            <button type="button" onClick={() => setParam('category', undefined)} className={chipClass}>
              {t('transactions.filterCategory', { name: fmt.categoryName(categoriesById.get(categoryFilter)) })}
              <span className="sr-only">{t('transactions.clearFilter')}</span>
              <CloseIcon className="size-4" />
            </button>
          )}
        </div>
      )}

      {kind !== 'transfer' && listed && (
        <MonthSummary
          month={allMonths ? undefined : month}
          rows={listed.rows}
          accounts={accounts}
          categories={categories}
          filtered={Boolean(search || accountId || kind || categoryFilter)}
          categoryIds={listed.categoryIds}
        />
      )}

      {listed && listed.entries.length === 0 ? (
        <div className="rounded-xl bg-surface px-4 py-10 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          {searching || filterCount > 0 ? t('transactions.noMatches') : t('transactions.emptyMonth')}
          {!hasEntries && (
            <Link to="/guide" className="mt-3 block font-medium text-indigo-700 hover:underline">
              {t('transactions.firstTimeGuide')}
            </Link>
          )}
        </div>
      ) : (
        listed &&
        groupByDate(listed.entries).map((group) => (
          <section key={group.date} aria-label={dayLabel(group.date)}>
            <h2 className="px-1 pb-1 text-xs font-medium text-slate-500">{dayLabel(group.date)}</h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-surface ring-1 ring-slate-200">
              {group.entries.map((entry) => (
                <li key={entry.id}>
                  <EntryRow
                    entry={entry}
                    accountsById={accountsById}
                    categoriesById={categoriesById}
                    onOpen={() => setEditingId(entry.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {(adding || editingId) && (
        <TransactionDialog
          editingId={editingId ?? undefined}
          accounts={accounts}
          categories={categories}
          filterAccountId={accountId}
          onClose={closeAndShow}
        />
      )}
    </div>
  );
}

function EntryRow({
  entry,
  accountsById,
  categoriesById,
  onOpen,
}: {
  entry: Entry;
  accountsById: ReadonlyMap<string, Account>;
  categoriesById: ReadonlyMap<string, Category>;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();

  let icon: ReactNode;
  let title: string;
  let details: string;
  let amount: string;
  let amountClass: string;
  const extra: string[] = [];
  const badges: { label: string; className: string }[] = [];

  if (entry.type === 'single') {
    const record = entry.record;
    const account = accountsById.get(record.accountId);
    const category = record.categoryId ? categoriesById.get(record.categoryId) : undefined;
    icon = <span className="text-xl">{category?.icon ?? (record.kind === 'income' ? '💰' : '🏷️')}</span>;
    title = record.kind === 'transfer' ? t('kinds.transfer') : fmt.categoryName(category);
    if (record.kind === 'expense' && record.amountMinor > 0) {
      badges.push({ label: t('kinds.refund'), className: 'bg-emerald-50 text-emerald-700' });
    }
    if (record.estimated) {
      badges.push({ label: t('transactions.estimatedBadge'), className: 'bg-amber-50 text-amber-800' });
    }
    details = [record.payee, account?.name, record.note].filter(Boolean).join(' · ');
    amount = account ? fmt.signedMoney(record.amountMinor, account.currency) : '';
    amountClass = record.amountMinor > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900';
    if (record.originalAmountMinor !== undefined && record.originalCurrency) {
      extra.push(fmt.money(Math.abs(record.originalAmountMinor), record.originalCurrency));
    }
    // Under the amounts rather than in the details line, where it got cut off.
    if (record.feeMinor !== undefined && account) {
      extra.push(t('transactions.feeIncluded', { fee: fmt.money(-record.feeMinor, account.currency) }));
    }
  } else {
    const fromAccount = accountsById.get(entry.outflow.accountId);
    const toAccount = accountsById.get(entry.inflow.accountId);
    icon = <TransferIcon className="size-5 text-slate-500" />;
    title = t('kinds.transfer');
    details = [`${fromAccount?.name ?? '?'} → ${toAccount?.name ?? '?'}`, entry.outflow.note].filter(Boolean).join(' · ');
    amountClass = 'text-slate-600';
    if (!fromAccount || !toAccount) {
      amount = '';
    } else if (entry.side === 'outflow') {
      amount = fmt.signedMoney(entry.outflow.amountMinor, fromAccount.currency);
    } else if (entry.side === 'inflow') {
      amount = fmt.signedMoney(entry.inflow.amountMinor, toAccount.currency);
      amountClass = 'text-emerald-600 dark:text-emerald-400';
    } else {
      amount = fmt.money(-entry.outflow.amountMinor, fromAccount.currency);
      if (fromAccount.currency !== toAccount.currency) {
        extra.push(`→ ${fmt.money(entry.inflow.amountMinor, toAccount.currency)}`);
      }
    }
  }

  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-100">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-medium text-slate-900">{title}</span>
          {badges.map((badge) => (
            <span key={badge.label} className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          ))}
        </span>
        {details && <span className="block truncate text-sm text-slate-500">{details}</span>}
      </span>
      <span className="shrink-0 text-right tabular-nums">
        <span className={`block font-semibold ${amountClass}`}>{amount}</span>
        {extra.map((line) => (
          <span key={line} className="block text-xs text-slate-500">
            {line}
          </span>
        ))}
      </span>
    </button>
  );
}
