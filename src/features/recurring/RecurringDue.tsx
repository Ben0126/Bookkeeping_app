import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  dueRecurring,
  listRecurringRules,
  postRecurring,
  skipRecurring,
  toDateKey,
  type Account,
  type Category,
  type DueRecurring,
} from '../../core';
import { ErrorBanner } from '../../ui/form';
import { useFormat } from '../../ui/useFormat';
import { RuleSummary } from './RuleSummary';

/** Monthly entries that have come due, each waiting for "Record" or "Skip". */
export function RecurringDue({
  accountsById,
  categoriesById,
}: {
  accountsById: ReadonlyMap<string, Account>;
  categoriesById: ReadonlyMap<string, Category>;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const rules = useLiveQuery(() => listRecurringRules(db), [db]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const due = rules ? dueRecurring(rules, toDateKey(new Date())) : [];
  if (due.length === 0) return null;

  const handle = async (item: DueRecurring, action: 'post' | 'skip') => {
    setBusy(true);
    setError(null);
    try {
      if (action === 'post') await postRecurring(db, item.rule.id, item.month);
      else await skipRecurring(db, item.rule.id, item.month);
    } catch (cause) {
      setError(fmt.error(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="recurring-due-title" className="space-y-2 rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-200">
      <h2 id="recurring-due-title" className="text-sm font-semibold text-indigo-900">
        {t('recurring.dueTitle', { count: due.length })}
      </h2>
      <ul className="space-y-2">
        {due.map((item) => {
          const { template } = item.rule;
          const category = template.categoryId ? categoriesById.get(template.categoryId) : undefined;
          return (
            <li key={item.rule.id} className="space-y-2 rounded-lg bg-surface p-3 ring-1 ring-indigo-100">
              <RuleSummary
                rule={item.rule}
                account={accountsById.get(template.accountId)}
                category={category}
                details={fmt.day(item.date)}
              />
              <div className="flex items-center gap-2">
                {item.laterMonths > 0 && (
                  <p className="text-xs text-slate-500">{t('recurring.laterMonths', { count: item.laterMonths })}</p>
                )}
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handle(item, 'skip')}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                    aria-label={t('recurring.skipLabel', { name: fmt.categoryName(category), date: fmt.day(item.date) })}
                  >
                    {t('recurring.skip')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handle(item, 'post')}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                    aria-label={t('recurring.postLabel', { name: fmt.categoryName(category), date: fmt.day(item.date) })}
                  >
                    {t('recurring.post')}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <ErrorBanner message={error} />
    </section>
  );
}
