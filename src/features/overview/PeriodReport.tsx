import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLedgerDb } from '../../app/ledgerContext';
import { updateSettings, type Category } from '../../core';
import { PeriodNav } from '../../ui/MonthNav';
import { inputClass } from '../../ui/styles';
import { useFormat } from '../../ui/useFormat';
import { cardClass, SpendingCard } from './overviewParts';
import type { PeriodOverview } from './periodOverview';
import { shiftPeriod, type ReportPeriod } from './periods';
import { useConvertedMoney } from './useConvertedMoney';
import { usePeriodOverview } from './usePeriodOverview';

/** A semester or a year: totals, month by month, and where the money went with each category's trend. */
export function PeriodReport({
  period,
  semesterStart,
  onNavigate,
}: {
  period: ReportPeriod;
  semesterStart: number;
  /** Called with a month of the period to show instead. */
  onNavigate: (month: string) => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const data = usePeriodOverview(period);
  const view = period.view === 'year' ? 'year' : 'semester';
  const first = period.months[0];
  const last = period.months[period.months.length - 1];

  return (
    <>
      <PeriodNav
        label={view === 'year' ? fmt.year(first) : fmt.monthSpan(first, last)}
        previousLabel={t('overview.previous', { context: view })}
        nextLabel={t('overview.next', { context: view })}
        onPrevious={() => onNavigate(shiftPeriod(period, -1, semesterStart).months[0])}
        onNext={() => onNavigate(shiftPeriod(period, 1, semesterStart).months[0])}
      />
      {data && <PeriodContent overview={data.overview} categories={data.categories} />}
      {view === 'semester' && <SemesterStartField value={semesterStart} />}
    </>
  );
}

function PeriodContent({ overview, categories }: { overview: PeriodOverview; categories: readonly Category[] }) {
  const { t } = useTranslation();
  const show = useConvertedMoney(overview);
  const view = overview.period.view === 'year' ? 'year' : 'semester';

  return (
    <>
      <SpendingCard
        title={t('overview.periodSpent', { context: view })}
        summary={overview.summary}
        native={overview.native}
        currency={overview.currency}
        missingRates={overview.missingRates}
        footer={
          overview.monthlyAverageMinor
            ? t('overview.monthlyAverage', { amount: show(overview.monthlyAverageMinor) })
            : undefined
        }
      />
      <MonthBars overview={overview} />
      <CategoryTrends overview={overview} categories={categories} />
    </>
  );
}

/** One row per month with its spending; each opens that month. */
function MonthBars({ overview }: { overview: PeriodOverview }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const show = useConvertedMoney(overview);
  const top = Math.max(0, ...overview.months.map((m) => m.expenseMinor));

  return (
    <section aria-labelledby="months-title" className={cardClass}>
      <h2 id="months-title" className="font-semibold">
        {t('overview.monthsTitle')}
      </h2>
      <ul>
        {overview.months.map(({ month, expenseMinor }) => (
          <li key={month}>
            <Link
              to={`/overview?month=${month}`}
              aria-label={t('overview.monthBar', { month: fmt.month(month), amount: show(expenseMinor) })}
              className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-100"
            >
              <span className="w-12 shrink-0 text-sm text-slate-500">{fmt.monthName(month)}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-full rounded-full bg-indigo-500"
                  style={{ width: `${top > 0 && expenseMinor > 0 ? Math.max(2, (expenseMinor / top) * 100) : 0}%` }}
                />
              </span>
              <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums">
                {expenseMinor === 0 ? <span className="font-normal text-slate-400">—</span> : show(expenseMinor)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Categories by spending, each with a small month-by-month chart. */
function CategoryTrends({ overview, categories }: { overview: PeriodOverview; categories: readonly Category[] }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const show = useConvertedMoney(overview);
  const byId = new Map(categories.map((c) => [c.id, c]));

  return (
    <section aria-labelledby="categories-title" className={cardClass}>
      <h2 id="categories-title" className="font-semibold">
        {t('overview.categoriesTitle')}
      </h2>
      {overview.categories.length === 0 ? (
        <p className="text-sm text-slate-500">{t('overview.noSpendingPeriod')}</p>
      ) : (
        <ul className="space-y-1">
          {overview.categories.map((row) => {
            const category = row.categoryId ? byId.get(row.categoryId) : undefined;
            const peak = Math.max(0, ...row.byMonth);
            return (
              <li key={row.categoryId ?? 'none'} className="flex items-center gap-3 px-1 py-2">
                <span className="text-xl" aria-hidden="true">
                  {category?.icon ?? '🏷️'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium text-slate-900">{fmt.categoryName(category)}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{show(row.totalMinor)}</span>
                  </span>
                  <span className="mt-1 flex items-end gap-2">
                    {/* Month by month: a trend at a glance, not exact figures. */}
                    <span className="flex h-6 flex-1 items-end gap-1" aria-hidden="true">
                      {row.byMonth.map((amount, i) => (
                        <span
                          key={overview.months[i].month}
                          className={`flex-1 rounded-sm ${amount > 0 ? 'bg-indigo-400' : 'bg-slate-100'}`}
                          style={{ height: `${peak > 0 && amount > 0 ? Math.max(15, (amount / peak) * 100) : 15}%` }}
                        />
                      ))}
                    </span>
                    <span className="w-10 shrink-0 text-right text-xs text-slate-500 tabular-nums">
                      {Math.round(row.share * 100)}%
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** When the school year's first semester starts; saved, since it differs by country and school. */
function SemesterStartField({ value }: { value: number }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const id = useId();
  return (
    <div className="space-y-1 px-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {t('overview.semesterStart')}
      </label>
      <select
        id={id}
        className={`${inputClass} w-auto`}
        value={value}
        onChange={(e) => void updateSettings(db, { semesterStart: Number(e.target.value) })}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <option key={month} value={month}>
            {fmt.monthName(`2026-${String(month).padStart(2, '0')}`)}
          </option>
        ))}
      </select>
      <p className="text-xs text-slate-500">{t('overview.semesterStartHint')}</p>
    </div>
  );
}
