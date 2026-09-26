import type { LedgerDB } from './db';
import { isCurrencyCode, type CurrencyCode } from './money';
import { requireCurrency } from './validate';

export interface Settings {
  /** Currency that reports, net worth and budgets are shown in. */
  baseCurrency: CurrencyCode;
}

export const DEFAULT_SETTINGS: Settings = { baseCurrency: 'TWD' };

export async function getSettings(db: LedgerDB): Promise<Settings> {
  const settings: Settings = { ...DEFAULT_SETTINGS };
  const baseCurrency = (await db.settings.get('baseCurrency'))?.value;
  if (isCurrencyCode(baseCurrency)) settings.baseCurrency = baseCurrency;
  return settings;
}

export async function updateSettings(db: LedgerDB, patch: Partial<Settings>): Promise<Settings> {
  if (patch.baseCurrency !== undefined) {
    await db.settings.put({ key: 'baseCurrency', value: requireCurrency(patch.baseCurrency) });
  }
  return getSettings(db);
}
