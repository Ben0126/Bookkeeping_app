import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  getSettings,
  listBudgets,
  listExchangeRates,
  toDateKey,
  type Account,
  type Category,
  type CurrencyCode,
  type Transaction,
} from '../../core';
import { useFormat } from '../../ui/useFormat';
import { BudgetBar } from '../overview/BudgetBar';
import { buildMonthOverview } from '../overview/monthOverview';

interface MonthSummaryProps {
  month: string;
  /** The rows the list shows (already filtered). */
  rows: readonly Transaction[];
  accounts: readonly Account[];
  categories: readonly Category[];
  /** When the list is filtered, the monthly budget doesn't apply to what's shown. */
  filtered: boolean;
}

/** Month totals in the main currency, plus budget progress; opens the overview. */
export function MonthSummary({ month, rows, accounts, categories, filtered }: MonthSummaryProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const context = useLiveQuery(
    async () => ({ settings: await getSettings(db), rates: await listExchangeRates(db), budgets: await listBudgets(db) }),
    [db],
  );
  if (!context) return null;

  const overview = buildMonthOverview({
    month,
    today: toDateKey(new Date()),
    transactions: rows,
    accounts,
    categories,
    budgets: filtered ? [] : context.budgets,
    rates: context.rates,
    baseCurrency: context.settings.baseCurrency,
  });
  const base = overview.currency;
  const nativeCurrencies = (Object.keys(overview.native) as CurrencyCode[]).sort();
  const convertible = overview.missingRates.length === 0;
  const converted = nativeCurrencies.some((currency) => currency !== base);

  const renderTotal = (field: 'expenseMinor' | 'incomeMinor') => {
    const native = nativeCurrencies
      .map((currency) => ({ currency, amountMinor: overview.native[currency]![field] }))
      .filter(({ amountMinor }) => amountMinor !== 0);
    if (native.length === 0) return <span className="text-slate-400">—</span>;
    // Without every rate, show each currency on its own rather than a partial total.
    if (!convertible) {
      return native.map(({ currency, amountMinor }) => <div key={currency}>{fmt.money(amountMinor, currency)}</div>);
    }
    const total = overview.summary[field];
    return (
      <>
        <div>{converted ? t('overview.approx', { amount: fmt.money(total, base) }) : fmt.money(total, base)}</div>
        {converted && (
          <div className="text-xs font-normal text-slate-500">
            {native.map(({ currency, amountMinor }) => fmt.money(amountMinor, currency)).join('・')}
          </div>
        )}
      </>
    );
  };

  const { budget } = overview;
  return (
    <Link
      to={`/overview?month=${month}`}
      className="block rounded-xl bg-white p-3 ring-1 ring-slate-200 hover:ring-indigo-300"
    >
      <dl className="grid grid-cols-2 gap-3">
        {(['expense', 'income'] as const).map((kind) => (
          <div key={kind}>
            <dt className="text-xs font-medium text-slate-500">{t(`transactions.total.${kind}`)}</dt>
            <dd className={`mt-1 space-y-0.5 font-semibold tabular-nums ${kind === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
              {renderTotal(kind === 'income' ? 'incomeMinor' : 'expenseMinor')}
            </dd>
          </div>
        ))}
      </dl>
      {budget && (
        <div className="mt-3 space-y-1">
          <BudgetBar spentMinor={budget.spentMinor} limitMinor={budget.budget.amountMinor} thin />
          <p className={`text-xs ${budget.remainingMinor < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
            {budget.remainingMinor < 0
              ? t('transactions.budgetOver', { amount: fmt.money(-budget.remainingMinor, budget.budget.currency) })
              : budget.perDayMinor !== undefined
                ? t('transactions.budgetLeftPerDay', {
                    amount: fmt.money(budget.remainingMinor, budget.budget.currency),
                    perDay: fmt.money(budget.perDayMinor, budget.budget.currency),
                  })
                : t('transactions.budgetLeft', { amount: fmt.money(budget.remainingMinor, budget.budget.currency) })}
          </p>
        </div>
      )}
    </Link>
  );
}
