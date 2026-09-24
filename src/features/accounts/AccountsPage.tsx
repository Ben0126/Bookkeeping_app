import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLedgerDb } from '../../app/ledgerContext';
import { getBalances, getSettings, listAccounts, type Account, type AccountKind, type CurrencyCode } from '../../core';
import { PlusIcon } from '../../ui/icons';
import { Modal } from '../../ui/Modal';
import { primaryButtonClass } from '../../ui/styles';
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

  const accounts = useLiveQuery(() => listAccounts(db, { includeArchived: true }), [db]);
  const balances = useLiveQuery(() => getBalances(db), [db]);
  const settings = useLiveQuery(() => getSettings(db), [db]);
  if (!accounts || !balances || !settings) return null;

  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);

  const totals = new Map<CurrencyCode, number>();
  for (const account of active) {
    totals.set(account.currency, (totals.get(account.currency) ?? 0) + (balances[account.id] ?? 0));
  }

  const renderList = (list: readonly Account[]) => (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      {list.map((account) => {
        const balance = balances[account.id] ?? 0;
        return (
          <li key={account.id} className="flex items-center">
            <button
              type="button"
              onClick={() => setDialog({ mode: 'edit', account })}
              className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left hover:bg-slate-50"
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
              <span className={`shrink-0 font-semibold tabular-nums ${balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {fmt.money(balance, account.currency)}
              </span>
            </button>
            <Link
              to={`/transactions?account=${encodeURIComponent(account.id)}`}
              className="shrink-0 px-3 py-3 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              {t('accounts.viewTransactions')}
            </Link>
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
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <p className="text-xs font-medium text-slate-500">{t('accounts.totals')}</p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-semibold tabular-nums">
            {[...totals].map(([currency, total]) => (
              <li key={currency} className={total < 0 ? 'text-rose-600' : undefined}>
                {fmt.money(total, currency)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {active.length === 0 ? (
        <div className="rounded-xl bg-white px-4 py-10 text-center text-sm text-slate-500 ring-1 ring-slate-200">
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
          onClose={() => setDialog(null)}
        >
          <AccountForm
            account={dialog.mode === 'edit' ? dialog.account : undefined}
            defaultCurrency={settings.baseCurrency}
            onDone={() => setDialog(null)}
          />
        </Modal>
      )}
    </div>
  );
}
