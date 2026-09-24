import { useLiveQuery } from 'dexie-react-hooks';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  getBalances,
  getSettings,
  listAccounts,
  listBudgets,
  listCategories,
  listExchangeRates,
  listTransactions,
  monthRange,
  toDateKey,
} from '../../core';
import { buildMonthOverview } from './monthOverview';

/** Live data for the overview page; undefined while loading. */
export function useMonthOverview(month: string) {
  const db = useLedgerDb();
  return useLiveQuery(async () => {
    const { from, to } = monthRange(month);
    const [transactions, accounts, categories, budgets, rates, settings, balances] = await Promise.all([
      listTransactions(db, { from, to }),
      listAccounts(db, { includeArchived: true }),
      listCategories(db, { includeArchived: true }),
      listBudgets(db),
      listExchangeRates(db),
      getSettings(db),
      getBalances(db),
    ]);
    const today = toDateKey(new Date());
    const overview = buildMonthOverview({
      month,
      today,
      transactions,
      accounts,
      categories,
      budgets,
      rates,
      baseCurrency: settings.baseCurrency,
    });
    return { overview, today, accounts, categories, budgets, rates, settings, balances };
  }, [db, month]);
}
