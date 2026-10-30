import { monthOf, shiftMonth } from '../../core';

/** What the overview covers: one month, a semester (six months) or a calendar year. */
export type PeriodView = 'month' | 'semester' | 'year';

export const PERIOD_VIEWS: readonly PeriodView[] = ['month', 'semester', 'year'];

export interface ReportPeriod {
  view: PeriodView;
  /** "YYYY-MM" months covered, oldest first. */
  months: string[];
  /** Inclusive "YYYY-MM-DD" bounds. */
  from: string;
  to: string;
}

const LENGTH: Record<PeriodView, number> = { month: 1, semester: 6, year: 12 };

/**
 * The period of `view` that contains `month`. A school year is two six-month
 * semesters, the first starting in `semesterStart` (1–12); September by
 * default, April in Japan, February in Australia.
 */
export function periodContaining(view: PeriodView, month: string, semesterStart: number): ReportPeriod {
  const monthIndex = Number(month.slice(5, 7));
  const offset = view === 'year' ? monthIndex - 1 : view === 'semester' ? (monthIndex - semesterStart + 12) % 6 : 0;
  const first = shiftMonth(month, -offset);
  const months = Array.from({ length: LENGTH[view] }, (_, i) => shiftMonth(first, i));
  return { view, months, from: `${first}-01`, to: `${months[months.length - 1]}-31` };
}

/** The period before (`-1`) or after (`1`) one. */
export function shiftPeriod(period: ReportPeriod, delta: number, semesterStart: number): ReportPeriod {
  return periodContaining(period.view, shiftMonth(period.months[0], delta * LENGTH[period.view]), semesterStart);
}

/** Months of the period up to and including `today`'s, for monthly averages. */
export function monthsSoFar(period: ReportPeriod, today: string): number {
  const current = monthOf(today);
  return period.months.filter((month) => month <= current).length;
}

/** Where semesters usually start for a student in the device's time zone. */
export function guessSemesterStart(timeZone: string | undefined): number {
  if (timeZone === 'Asia/Tokyo') return 4;
  if (timeZone?.startsWith('Australia/') || timeZone === 'Pacific/Auckland') return 2;
  return 9;
}
