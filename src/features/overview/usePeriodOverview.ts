import { useLiveQuery } from 'dexie-react-hooks';
import { useLedgerDb } from '../../app/ledgerContext';
import { getSettings, listAccounts, listCategories, listExchangeRates, listTransactions, toDateKey } from '../../core';
import { buildPeriodOverview } from './periodOverview';
import type { ReportPeriod } from './periods';

/** Live data for a semester or year; undefined while loading. */
export function usePeriodOverview(period: ReportPeriod) {
  const db = useLedgerDb();
  const { view, from, to } = period;
  return useLiveQuery(async () => {
    const today = toDateKey(new Date());
    const [transactions, accounts, categories, rates, settings] = await Promise.all([
      listTransactions(db, { from, to }),
      listAccounts(db, { includeArchived: true }),
      listCategories(db, { includeArchived: true }),
      listExchangeRates(db, { from, to }),
      getSettings(db),
    ]);
    const overview = buildPeriodOverview({
      period,
      today,
      transactions,
      accounts,
      categories,
      rates,
      baseCurrency: settings.baseCurrency,
    });
    return { overview, categories };
    // The period is fully described by its view and bounds.
  }, [db, view, from, to]);
}
