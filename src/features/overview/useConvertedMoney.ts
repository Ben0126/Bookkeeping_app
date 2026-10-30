import { useTranslation } from 'react-i18next';
import type { CurrencyCode, Summary } from '../../core';
import { useFormat } from '../../ui/useFormat';

/** "≈ NT$12,345" when anything was converted, the plain amount otherwise. */
export function useConvertedMoney({ native, currency }: { native: Summary['byCurrency']; currency: CurrencyCode }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const converted = Object.keys(native).some((code) => code !== currency);
  return (amountMinor: number) => {
    const money = fmt.money(amountMinor, currency);
    // Nothing was converted into a zero, so it isn't approximate.
    return converted && amountMinor !== 0 ? t('overview.approx', { amount: money }) : money;
  };
}
