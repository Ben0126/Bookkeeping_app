import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  createRateResolver,
  getBalances,
  getSettings,
  listAccounts,
  listExchangeRates,
  netWorth,
  toDateKey,
  type Account,
  type AccountKind,
  type CurrencyCode,
} from '../../core';
import { PlusIcon } from '../../ui/icons';
import { Modal } from '../../ui/Modal';
import { guessLocalCurrency } from '../../ui/localCurrency';
import { primaryButtonClass } from '../../ui/styles';
import { useDiscardGuard } from '../../ui/useDiscardGuard';
import { useFormat } from '../../ui/useFormat';
import { AccountForm } from './AccountForm';

const KIND_ICONS: Record<AccountKind, string> = {
  cash: '💵',
  bank: '🏦',
  credit_card: '💳',
  e_wallet: '📱',
  investment: '📈',
  other: '📁',
};

type DialogState = { mode: 'create' } | { mode: 'edit'; account: Account } | null;

export function AccountsPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const [dialog, setDialog] = useState<DialogState>(null);
  const { setDirty, confirmDiscard } = useDiscardGuard(t('transactionForm.discardConfirm'));

  const accounts = useLiveQuery(() => listAccounts(db, { includeArchived: true }), [db]);
  const balances = useLiveQuery(() => getBalances(db), [db]);
  const settings = useLiveQuery(() => getSettings(db), [db]);
  const rates = useLiveQuery(() => listExchangeRates(db), [db]);
  // Estimated foreign charges still to check against each account's statement.
  const estimates = useLiveQuery(async () => {
    const counts = new Map<string, number>();
    await db.transactions
      .filter((t) => t.estimated === true)
      .each((t) => counts.set(t.accountId, (counts.get(t.accountId) ?? 0) + 1));
    return counts;
  }, [db]);
  if (!accounts || !balances || !settings) return null;

  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);

  const totals = new Map<CurrencyCode, number>();
  for (const account of active) {
    totals.set(account.currency, (totals.get(account.currency) ?? 0) + (balances[account.id] ?? 0));
  }
  // One figure in the main currency, once more than one currency (or a foreign one) is involved.
  const converted =
    rates && [...totals.keys()].some((currency) => currency !== settings.baseCurrency)
      ? netWorth(
          balances,
          { accounts: active, baseCurrency: settings.baseCurrency, rates: createRateResolver(rates) },
          toDateKey(new Date()),
        )
      : undefined;

  const renderList = (list: readonly Account[]) => (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-surface ring-1 ring-slate-200">
      {list.map((account) => {
        const balance = balances[account.id] ?? 0;
        // Cash or a wallet can't go below zero: a withdrawal or top-up probably wasn't recorded.
        const impossible = balance < 0 && !account.archived && (account.kind === 'cash' || account.kind === 'e_wallet');
        const toCheck = estimates?.get(account.id) ?? 0;
        return (
          <li key={account.id}>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setDialog({ mode: 'edit', account })}
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-100"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl" aria-hidden="true">
                  {KIND_ICONS[account.kind]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-900">{account.name}</span>
                  <span className="block text-sm text-slate-500">
                    {fmt.accountKind(account.kind)} · {account.currency}
                  </span>
                </span>
                <span className={`shrink-0 font-semibold tabular-nums ${balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900'}`}>
                  {account.kind === 'credit_card' && balance < 0
                    ? t('accounts.owed', { amount: fmt.money(-balance, account.currency) })
                    : fmt.money(balance, account.currency)}
                </span>
              </button>
              <Link
                to={`/transactions?account=${encodeURIComponent(account.id)}`}
                className="shrink-0 px-3 py-3 text-sm font-medium text-indigo-700 hover:text-indigo-500"
              >
                {t('accounts.viewTransactions')}
              </Link>
            </div>
            {(impossible || toCheck > 0) && (
              <div className="space-y-1.5 px-3 pb-3 pl-16 text-sm">
                {impossible && (
                  <p className="text-amber-800">
                    {t('accounts.negativeHint')}{' '}
                    <button
                      type="button"
                      className="font-medium text-indigo-700 hover:underline"
                      onClick={() => setDialog({ mode: 'edit', account })}
                    >
                      {t('accounts.fixBalance')}
                    </button>
                  </p>
                )}
                {toCheck > 0 && (
                  <Link
                    to={`/transactions?account=${encodeURIComponent(account.id)}&estimated=1`}
                    className="block font-medium text-amber-800 hover:underline"
                  >
                    {t('accounts.estimatesToCheck', { count: toCheck })} →
                  </Link>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('accounts.title')}</h1>
        <button type="button" className={primaryButtonClass} onClick={() => setDialog({ mode: 'create' })}>
          <PlusIcon />
          {t('accounts.add')}
        </button>
      </div>

      {totals.size > 0 && (
        <div className="rounded-xl bg-surface p-3 ring-1 ring-slate-200">
          <p className="text-xs font-medium text-slate-500">{t('accounts.totals')}</p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-semibold tabular-nums">
            {[...totals].map(([currency, total]) => (
              <li key={currency} className={total < 0 ? 'text-rose-600 dark:text-rose-400' : undefined}>
                {fmt.money(total, currency)}
              </li>
            ))}
          </ul>
          {converted && converted.missingRates.length === 0 && (
            <p className="mt-1 text-sm text-slate-600">
              {t('accounts.totalApprox', { amount: fmt.money(converted.totalMinor, settings.baseCurrency) })}
            </p>
          )}
        </div>
      )}

      {active.length === 0 ? (
        <div className="rounded-xl bg-surface px-4 py-10 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          {t('accounts.empty')}
        </div>
      ) : (
        renderList(active)
      )}

      {archived.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer px-1 text-sm font-medium text-slate-500">
            {t('accounts.archivedCount', { count: archived.length })}
          </summary>
          <div className="mt-2">{renderList(archived)}</div>
        </details>
      )}

      {dialog && (
        <Modal
          title={dialog.mode === 'create' ? t('accounts.add') : t('accounts.edit')}
          onClose={() => confirmDiscard() && setDialog(null)}
        >
          <AccountForm
            account={dialog.mode === 'edit' ? dialog.account : undefined}
            currentBalanceMinor={dialog.mode === 'edit' ? balances[dialog.account.id] : undefined}
            // New accounts abroad are usually in the local currency, not the home one.
            defaultCurrency={guessLocalCurrency() ?? settings.baseCurrency}
            onDone={() => setDialog(null)}
            onDirtyChange={setDirty}
          />
        </Modal>
      )}
    </div>
  );
}
