import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { useLedgerDb } from '../../app/ledgerContext';
import { CURRENCY_CODES, getSettings, updateSettings, type CurrencyCode } from '../../core';
import { inputClass } from '../../ui/styles';
import { useFormat } from '../../ui/useFormat';

/** The currency totals are converted into; changing it fetches rates for it in the background. */
export function BaseCurrencySection() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const settings = useLiveQuery(() => getSettings(db), [db]);
  if (!settings) return null;

  return (
    <section aria-labelledby="base-currency-title" className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <h2 id="base-currency-title" className="font-semibold">
        {t('settings.baseCurrency')}
      </h2>
      <p className="text-sm text-slate-600">{t('settings.baseCurrencyHint')}</p>
      <select
        aria-label={t('settings.baseCurrency')}
        className={inputClass}
        value={settings.baseCurrency}
        onChange={(e) => void updateSettings(db, { baseCurrency: e.target.value as CurrencyCode })}
      >
        {CURRENCY_CODES.map((code) => (
          <option key={code} value={code}>
            {code} · {fmt.currencyName(code)}
          </option>
        ))}
      </select>
    </section>
  );
}
