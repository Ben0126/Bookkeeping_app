import { useTranslation } from 'react-i18next';
import { shiftMonth } from '../core';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { useFormat } from './useFormat';

/** "‹ September 2026 ›" — the page heading on month-based pages. */
export function MonthNav({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label={t('transactions.previousMonth')}
        className="rounded-full p-2 text-slate-600 hover:bg-slate-200"
      >
        <ChevronLeftIcon />
      </button>
      <h1 className="min-w-32 text-center text-lg font-semibold">{fmt.month(month)}</h1>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label={t('transactions.nextMonth')}
        className="rounded-full p-2 text-slate-600 hover:bg-slate-200"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}
