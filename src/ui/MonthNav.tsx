import { useTranslation } from 'react-i18next';
import { shiftMonth } from '../core';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { useFormat } from './useFormat';

/** "‹ September 2026 ›" — the page heading on month-based pages. */
export function MonthNav({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <PeriodNav
      label={fmt.month(month)}
      previousLabel={t('transactions.previousMonth')}
      nextLabel={t('transactions.nextMonth')}
      onPrevious={() => onChange(shiftMonth(month, -1))}
      onNext={() => onChange(shiftMonth(month, 1))}
    />
  );
}

/** "‹ heading ›" for stepping through months, semesters or years. */
export function PeriodNav({
  label,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
}: {
  label: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onPrevious} aria-label={previousLabel} className="rounded-full p-2 text-slate-600 hover:bg-slate-200">
        <ChevronLeftIcon />
      </button>
      <h1 className="min-w-32 text-center text-lg font-semibold">{label}</h1>
      <button type="button" onClick={onNext} aria-label={nextLabel} className="rounded-full p-2 text-slate-600 hover:bg-slate-200">
        <ChevronRightIcon />
      </button>
    </div>
  );
}
