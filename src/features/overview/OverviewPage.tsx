import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  createRateResolver,
  isMonthKey,
  monthOf,
  netWorth,
  toDateKey,
  type Account,
  type Category,
  type CurrencyCode,
  type ExchangeRate,
} from '../../core';
import { Modal } from '../../ui/Modal';
import { MonthNav } from '../../ui/MonthNav';
import { guessLocalCurrency } from '../../ui/localCurrency';
import { primaryButtonClass } from '../../ui/styles';
import { useDiscardGuard } from '../../ui/useDiscardGuard';
import { useFormat } from '../../ui/useFormat';
import { refreshRates } from '../rates/rateSource';
import { BudgetBar } from './BudgetBar';
import { BudgetForm } from './BudgetForm';
import type { MonthOverview } from './monthOverview';
import { useMonthOverview } from './useMonthOverview';

const cardClass = 'space-y-3 rounded-xl bg-surface p-4 ring-1 ring-slate-200';

export function OverviewPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const monthParam = params.get('month');
  const month = isMonthKey(monthParam) ? monthParam : monthOf(toDateKey(new Date()));
  const data = useMonthOverview(month);
  const [editingBudget, setEditingBudget] = useState(false);
  const { setDirty, confirmDiscard } = useDiscardGuard(t('transactionForm.discardConfirm'));

  if (!data) return null;
  const { overview, accounts, categories, rates, balances, today } = data;
  const budget = data.budgets.find((b) => b.categoryId === undefined);

  return (
    <div className="space-y-4">
      <MonthNav month={month} onChange={(next) => setParams({ month: next })} />
      <SpendingCard overview={overview} />
      <BudgetCard overview={overview} onEdit={() => setEditingBudget(true)} />
      <CategoryRanking overview={overview} categories={categories} month={month} />
      <AccountsTotal accounts={accounts} balances={balances} rates={rates} base={overview.currency} today={today} />
      <RatesFootnote accounts={accounts} rates={rates} base={overview.currency} today={today} />

      {editingBudget && (
        <Modal title={t('budgetForm.title')} onClose={() => confirmDiscard() && setEditingBudget(false)}>
          <BudgetForm
            budget={budget}
            defaultCurrency={guessLocalCurrency() ?? overview.currency}
            onDone={() => setEditingBudget(false)}
            onDirtyChange={setDirty}
          />
        </Modal>
      )}
    </div>
  );
}

/** "≈ NT$12,345" when anything was converted, the plain amount otherwise. */
function useConvertedMoney(overview: MonthOverview) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const converted = Object.keys(overview.native).some((currency) => currency !== overview.currency);
  return (amountMinor: number) => {
    const money = fmt.money(amountMinor, overview.currency);
    // Nothing was converted into a zero, so it isn't approximate.
    return converted && amountMinor !== 0 ? t('overview.approx', { amount: money }) : money;
  };
}

function SpendingCard({ overview }: { overview: MonthOverview }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const show = useConvertedMoney(overview);
  const { summary } = overview;
  const nativeSpending = (Object.entries(overview.native) as [CurrencyCode, { expenseMinor: number }][])
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([, totals]) => totals.expenseMinor > 0)
    .map(([currency, totals]) => fmt.money(totals.expenseMinor, currency));
  const converted = Object.keys(overview.native).some((currency) => currency !== overview.currency);

  return (
    <section aria-labelledby="spent-title" className={cardClass}>
      <div>
        <h2 id="spent-title" className="text-sm font-medium text-slate-500">
          {t('overview.spent')}
        </h2>
        <p className="text-3xl font-bold tabular-nums">{show(summary.expenseMinor)}</p>
        {converted && nativeSpending.length > 0 && (
          <p className="text-sm text-slate-500">{t('overview.includes', { list: nativeSpending.join('、') })}</p>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">{t('overview.received')}</dt>
          <dd className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{show(summary.incomeMinor)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('overview.net')}</dt>
          <dd className={`font-semibold tabular-nums ${summary.netMinor < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900'}`}>
            {show(summary.netMinor)}
          </dd>
        </div>
      </dl>
      <MissingRatesNote currencies={overview.missingRates} />
    </section>
  );
}

function MissingRatesNote({ currencies }: { currencies: readonly CurrencyCode[] }) {
  const { t } = useTranslation();
  if (currencies.length === 0) return null;
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
      {t('overview.missingRates', { currencies: currencies.join('、') })}
    </p>
  );
}

function BudgetCard({ overview, onEdit }: { overview: MonthOverview; onEdit: () => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { budget } = overview;

  if (!budget) {
    return (
      <section aria-labelledby="budget-title" className={cardClass}>
        <h2 id="budget-title" className="font-semibold">
          {t('overview.budgetTitle')}
        </h2>
        <p className="text-sm text-slate-600">{t('overview.budgetEmpty')}</p>
        <button type="button" className={primaryButtonClass} onClick={onEdit}>
          {t('overview.setBudget')}
        </button>
      </section>
    );
  }

  const { currency, amountMinor } = budget.budget;
  const over = budget.remainingMinor < 0;
  return (
    <section aria-labelledby="budget-title" className={cardClass}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="budget-title" className="font-semibold">
          {t('overview.budgetTitle')} <span className="tabular-nums">{fmt.money(amountMinor, currency)}</span>
        </h2>
        <button type="button" onClick={onEdit} className="text-sm font-medium text-indigo-700 hover:text-indigo-500">
          {t('overview.editBudget')}
        </button>
      </div>
      <BudgetBar spentMinor={budget.spentMinor} limitMinor={amountMinor} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <span className="text-slate-600">
          {t('overview.budgetSpent', {
            amount: fmt.money(budget.spentMinor, currency),
            percent: `${Math.round((budget.spentMinor / amountMinor) * 100)}%`,
          })}
        </span>
        <span className={`font-semibold tabular-nums ${over ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900'}`}>
          {over
            ? t('overview.budgetOver', { amount: fmt.money(-budget.remainingMinor, currency) })
            : t('overview.budgetLeft', { amount: fmt.money(budget.remainingMinor, currency) })}
        </span>
      </div>
      {budget.perDayMinor !== undefined && budget.daysLeft !== undefined && !over && (
        <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
          {t('overview.perDay', { count: budget.daysLeft, amount: fmt.money(budget.perDayMinor, currency) })}
        </p>
      )}
      <MissingRatesNote currencies={budget.missingRates} />
    </section>
  );
}

function CategoryRanking({
  overview,
  categories,
  month,
}: {
  overview: MonthOverview;
  categories: readonly Category[];
  month: string;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const show = useConvertedMoney(overview);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const top = overview.categories[0]?.totalMinor ?? 0;

  return (
    <section aria-labelledby="categories-title" className={cardClass}>
      <h2 id="categories-title" className="font-semibold">
        {t('overview.categoriesTitle')}
      </h2>
      {overview.categories.length === 0 ? (
        <p className="text-sm text-slate-500">{t('overview.noSpending')}</p>
      ) : (
        <ul className="space-y-1">
          {overview.categories.map((row) => {
            const category = row.categoryId ? byId.get(row.categoryId) : undefined;
            const content = (
              <>
                <span className="text-xl" aria-hidden="true">
                  {category?.icon ?? '🏷️'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium text-slate-900">{fmt.categoryName(category)}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{show(row.totalMinor)}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-indigo-500"
                        style={{ width: `${top > 0 ? Math.max(2, (row.totalMinor / top) * 100) : 0}%` }}
                      />
                    </span>
                    <span className="w-10 text-right text-xs text-slate-500 tabular-nums">{Math.round(row.share * 100)}%</span>
                  </span>
                </span>
              </>
            );
            return (
              <li key={row.categoryId ?? 'none'}>
                {row.categoryId ? (
                  <Link
                    to={`/transactions?month=${month}&category=${encodeURIComponent(row.categoryId)}`}
                    className="flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-slate-50 dark:hover:bg-slate-100"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-1 py-2">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function AccountsTotal({
  accounts,
  balances,
  rates,
  base,
  today,
}: {
  accounts: readonly Account[];
  balances: Readonly<Record<string, number>>;
  rates: readonly ExchangeRate[];
  base: CurrencyCode;
  today: string;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const active = accounts.filter((a) => !a.archived);
  if (active.length === 0) return null;
  const total = netWorth(balances, { accounts: active, baseCurrency: base, rates: createRateResolver(rates) }, today);
  const converted = active.some((a) => a.currency !== base);

  return (
    <section aria-labelledby="accounts-total-title" className={cardClass}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="accounts-total-title" className="text-sm font-medium text-slate-500">
          {t('overview.accountsTotal')}
        </h2>
        <Link to="/accounts" className="text-sm font-medium text-indigo-700 hover:text-indigo-500">
          {t('overview.viewAccounts')}
        </Link>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${total.totalMinor < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
        {converted ? t('overview.approx', { amount: fmt.money(total.totalMinor, base) }) : fmt.money(total.totalMinor, base)}
      </p>
      <MissingRatesNote currencies={total.missingRates} />
    </section>
  );
}

function RatesFootnote({
  accounts,
  rates,
  base,
  today,
}: {
  accounts: readonly Account[];
  rates: readonly ExchangeRate[];
  base: CurrencyCode;
  today: string;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const [status, setStatus] = useState<'idle' | 'working' | 'failed'>('idle');
  const used = [...new Set(accounts.filter((a) => !a.archived && a.currency !== base).map((a) => a.currency))];
  if (used.length === 0) return null;

  const resolve = createRateResolver(rates);
  const latest = rates.reduce<string | undefined>((max, r) => (!max || r.date > max ? r.date : max), undefined);
  const quotes = used
    .map((currency) => {
      const rate = resolve(currency, base, today);
      return rate === undefined ? undefined : `1 ${currency} ≈ ${fmt.rate(rate)} ${base}`;
    })
    .filter(Boolean);

  const refresh = async () => {
    setStatus('working');
    try {
      await refreshRates(db, base, { force: true });
      setStatus('idle');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <footer className="space-y-1 px-1 text-xs text-slate-500">
      <p>
        {latest ? t('overview.ratesUpdated', { date: fmt.day(latest) }) : t('overview.ratesNone')}
        {quotes.length > 0 && ` · ${quotes.join(' · ')}`}
      </p>
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={status === 'working'}
        className="font-medium text-indigo-700 hover:text-indigo-500 disabled:text-slate-400"
      >
        {status === 'working' ? t('overview.refreshing') : t('overview.refreshRates')}
      </button>
      {status === 'failed' && <p className="text-rose-600 dark:text-rose-400">{t('overview.refreshFailed')}</p>}
    </footer>
  );
}
