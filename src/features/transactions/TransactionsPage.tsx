import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  isMonthKey,
  listAccounts,
  listCategories,
  listTransactions,
  monthOf,
  monthRange,
  shiftMonth,
  toDateKey,
  totalsByCurrency,
  type Account,
  type Category,
  type CurrencyCode,
  type TransactionKind,
} from '../../core';
import { BackupReminder } from '../backup/BackupReminder';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SearchIcon, TransferIcon } from '../../ui/icons';
import { inputClass, primaryButtonClass } from '../../ui/styles';
import { useFormat } from '../../ui/useFormat';
import { groupByDate, toEntries, type Entry } from './entries';
import { TransactionDialog } from './TransactionDialog';

type DialogState = { mode: 'create' } | { mode: 'edit'; id: string } | null;

const KINDS: readonly TransactionKind[] = ['expense', 'income', 'transfer'];

export function TransactionsPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>(null);

  const today = toDateKey(new Date());
  const monthParam = params.get('month');
  const month = isMonthKey(monthParam) ? monthParam : monthOf(today);
  const accountId = params.get('account') || undefined;
  const kind = KINDS.find((k) => k === params.get('kind'));
  const search = params.get('q') ?? '';
  const { from, to } = monthRange(month);

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
  const listed = useLiveQuery(async () => {
    const rows = await listTransactions(db, { from, to, accountId, kind, search });
    const transferIds = [...new Set(rows.flatMap((row) => (row.transferId ? [row.transferId] : [])))];
    const legs = transferIds.length > 0 ? await db.transactions.where('transferId').anyOf(transferIds).toArray() : [];
    return { rows, entries: toEntries(rows, legs, accountId) };
  }, [db, from, to, accountId, kind, search]);

  const accountsById = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);
  const activeAccounts = (accounts ?? []).filter((a) => !a.archived);

  if (!accounts || !categories) return null;

  if (activeAccounts.length === 0) {
    return (
      <div className="mt-8 rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
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

  const closeAndShow = (date?: string) => {
    setDialog(null);
    if (date && monthOf(date) !== month) setParam('month', monthOf(date));
  };

  const totals = listed ? totalsByCurrency(listed.rows, accounts) : {};
  const currencies = Object.keys(totals).sort() as CurrencyCode[];

  return (
    <div className="space-y-4">
      <BackupReminder />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setParam('month', shiftMonth(month, -1))}
            aria-label={t('transactions.previousMonth')}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-200"
          >
            <ChevronLeftIcon />
          </button>
          <h1 className="min-w-32 text-center text-lg font-semibold">{fmt.month(month)}</h1>
          <button
            type="button"
            onClick={() => setParam('month', shiftMonth(month, 1))}
            aria-label={t('transactions.nextMonth')}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-200"
          >
            <ChevronRightIcon />
          </button>
        </div>
        {/* Phones use the floating button instead. */}
        <div className="hidden md:block">
          <button type="button" className={primaryButtonClass} onClick={() => setDialog({ mode: 'create' })}>
            <PlusIcon />
            {t('transactions.add')}
          </button>
        </div>
      </div>

      {kind !== 'transfer' && (
        <dl className="grid grid-cols-2 gap-3">
          {(['expense', 'income'] as const).map((totalKind) => {
            const field = totalKind === 'income' ? 'incomeMinor' : 'expenseMinor';
            const amounts = currencies
              .map((currency) => ({ currency, amountMinor: totals[currency]![field] }))
              .filter(({ amountMinor }) => amountMinor !== 0);
            return (
              <div key={totalKind} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <dt className="text-xs font-medium text-slate-500">{t(`transactions.total.${totalKind}`)}</dt>
                <dd className={`mt-1 space-y-0.5 font-semibold tabular-nums ${totalKind === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {amounts.length === 0 ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    amounts.map(({ currency, amountMinor }) => <div key={currency}>{fmt.money(amountMinor, currency)}</div>)
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_10rem_8rem]">
        <label className="relative col-span-2 sm:col-span-1">
          <span className="sr-only">{t('transactions.search')}</span>
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <SearchIcon />
          </span>
          <input
            type="search"
            className={`${inputClass} pl-10`}
            placeholder={t('transactions.searchPlaceholder')}
            value={search}
            onChange={(e) => setParam('q', e.target.value)}
          />
        </label>
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
      </div>

      {listed && listed.entries.length === 0 ? (
        <div className="rounded-xl bg-white px-4 py-10 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          {search || accountId || kind ? t('transactions.noMatches') : t('transactions.emptyMonth')}
        </div>
      ) : (
        listed &&
        groupByDate(listed.entries).map((group) => (
          <section key={group.date} aria-label={fmt.day(group.date)}>
            <h2 className="px-1 pb-1 text-xs font-medium text-slate-500">{fmt.day(group.date)}</h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
              {group.entries.map((entry) => (
                <li key={entry.id}>
                  <EntryRow
                    entry={entry}
                    accountsById={accountsById}
                    categoriesById={categoriesById}
                    onOpen={() => setDialog({ mode: 'edit', id: entry.id })}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <button
        type="button"
        onClick={() => setDialog({ mode: 'create' })}
        aria-label={t('transactions.add')}
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 md:hidden"
      >
        <PlusIcon className="size-7" />
      </button>

      {dialog && (
        <TransactionDialog
          editingId={dialog.mode === 'edit' ? dialog.id : undefined}
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
  let extra: string | undefined;

  if (entry.type === 'single') {
    const record = entry.record;
    const account = accountsById.get(record.accountId);
    const category = record.categoryId ? categoriesById.get(record.categoryId) : undefined;
    icon = <span className="text-xl">{category?.icon ?? (record.kind === 'income' ? '💰' : '🏷️')}</span>;
    title = record.kind === 'transfer' ? t('kinds.transfer') : fmt.categoryName(category);
    details = [record.payee, account?.name, record.note].filter(Boolean).join(' · ');
    amount = account ? fmt.signedMoney(record.amountMinor, account.currency) : '';
    amountClass = record.amountMinor > 0 ? 'text-emerald-600' : 'text-slate-900';
    if (record.originalAmountMinor !== undefined && record.originalCurrency) {
      extra = fmt.money(Math.abs(record.originalAmountMinor), record.originalCurrency);
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
      amountClass = 'text-emerald-600';
    } else {
      amount = fmt.money(-entry.outflow.amountMinor, fromAccount.currency);
      if (fromAccount.currency !== toAccount.currency) {
        extra = `→ ${fmt.money(entry.inflow.amountMinor, toAccount.currency)}`;
      }
    }
  }

  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-slate-50">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-900">{title}</span>
        {details && <span className="block truncate text-sm text-slate-500">{details}</span>}
      </span>
      <span className="shrink-0 text-right tabular-nums">
        <span className={`block font-semibold ${amountClass}`}>{amount}</span>
        {extra && <span className="block text-xs text-slate-500">{extra}</span>}
      </span>
    </button>
  );
}
