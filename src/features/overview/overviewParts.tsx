import { useTranslation } from 'react-i18next';
import type { CurrencyCode, Summary } from '../../core';
import { useFormat } from '../../ui/useFormat';
import { useConvertedMoney } from './useConvertedMoney';

export const cardClass = 'space-y-3 rounded-xl bg-surface p-4 ring-1 ring-slate-200';

export function MissingRatesNote({ currencies }: { currencies: readonly CurrencyCode[] }) {
  const { t } = useTranslation();
  if (currencies.length === 0) return null;
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
      {t('overview.missingRates', { currencies: currencies.join('、') })}
    </p>
  );
}

/** The big spending figure with income and net under it, for a month or a longer period. */
export function SpendingCard({
  title,
  summary,
  native,
  currency,
  missingRates,
  footer,
}: {
  title: string;
  summary: Summary;
  native: Summary['byCurrency'];
  currency: CurrencyCode;
  missingRates: readonly CurrencyCode[];
  footer?: string;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const show = useConvertedMoney({ native, currency });
  const nativeSpending = (Object.entries(native) as [CurrencyCode, { expenseMinor: number }][])
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([, totals]) => totals.expenseMinor > 0)
    .map(([code, totals]) => fmt.money(totals.expenseMinor, code));
  const converted = Object.keys(native).some((code) => code !== currency);

  return (
    <section aria-labelledby="spent-title" className={cardClass}>
      <div>
        <h2 id="spent-title" className="text-sm font-medium text-slate-500">
          {title}
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
      {footer && <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">{footer}</p>}
      <MissingRatesNote currencies={missingRates} />
    </section>
  );
}
