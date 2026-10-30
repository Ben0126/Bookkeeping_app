import type { LedgerDB } from './db';
import { LedgerError } from './errors';
import { isCurrencyCode, type CurrencyCode } from './money';
import { requireCurrency } from './validate';

export interface Settings {
  /** Currency that reports, net worth and budgets are shown in. */
  baseCurrency: CurrencyCode;
  /**
   * Month (1–12) the first of the school year's two six-month semesters
   * starts in, for semester reports. Unset until chosen; the UI then guesses.
   */
  semesterStart?: number;
  /** The ledger holds the sample data, loaded to look around before starting for real. */
  demo?: true;
}

export const DEFAULT_SETTINGS: Settings = { baseCurrency: 'TWD' };

export function isMonthNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12;
}

export async function getSettings(db: LedgerDB): Promise<Settings> {
  const settings: Settings = { ...DEFAULT_SETTINGS };
  const baseCurrency = (await db.settings.get('baseCurrency'))?.value;
  if (isCurrencyCode(baseCurrency)) settings.baseCurrency = baseCurrency;
  const semesterStart = (await db.settings.get('semesterStart'))?.value;
  if (isMonthNumber(semesterStart)) settings.semesterStart = semesterStart;
  if ((await db.settings.get('demo'))?.value === true) settings.demo = true;
  return settings;
}

export async function updateSettings(db: LedgerDB, patch: Partial<Settings>): Promise<Settings> {
  if (patch.baseCurrency !== undefined) {
    await db.settings.put({ key: 'baseCurrency', value: requireCurrency(patch.baseCurrency) });
  }
  if (patch.semesterStart !== undefined) {
    if (!isMonthNumber(patch.semesterStart)) throw new LedgerError('INVALID_DATE', 'Semester start must be a month, 1–12');
    await db.settings.put({ key: 'semesterStart', value: patch.semesterStart });
  }
  return getSettings(db);
}
