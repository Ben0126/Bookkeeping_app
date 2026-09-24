import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatMoney,
  fromDateKey,
  LedgerError,
  type AccountKind,
  type Category,
  type CurrencyCode,
} from '../core';

/**
 * Money always uses en-US currency symbols ("$" for USD, "NT$" for TWD):
 * zh-TW writes TWD as a bare "$", which is ambiguous next to other dollars.
 * Both supported languages group digits the same way.
 */
const MONEY_LOCALE = 'en-US';

/** Locale-aware formatting of money, dates and ledger names for the current language. */
export function useFormat() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;

  return useMemo(() => {
    const currencyNames = new Intl.DisplayNames([locale], { type: 'currency' });
    const monthFormat = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' });
    const dayFormat = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', weekday: 'short' });
    const rateFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 4 });

    return {
      money: (amountMinor: number, currency: CurrencyCode) => formatMoney(amountMinor, currency, MONEY_LOCALE),
      /** Shows "+" on positive amounts; negatives already carry "-". */
      signedMoney: (amountMinor: number, currency: CurrencyCode) =>
        (amountMinor > 0 ? '+' : '') + formatMoney(amountMinor, currency, MONEY_LOCALE),
      rate: (value: number) => rateFormat.format(value),
      currencyName: (currency: CurrencyCode) => currencyNames.of(currency) ?? currency,
      month: (month: string) => monthFormat.format(fromDateKey(`${month}-01`)),
      day: (dateKey: string) => dayFormat.format(fromDateKey(dateKey)),
      categoryName: (category: Category | undefined) => {
        if (!category) return t('transactions.uncategorized');
        return category.key ? t(`categories.${category.key}`, { defaultValue: category.name }) : category.name;
      },
      accountKind: (kind: AccountKind) => t(`accountKinds.${kind}`),
      error: (error: unknown) =>
        error instanceof LedgerError ? t(`errors.${error.code}`) : t('errors.UNKNOWN'),
    };
  }, [t, locale]);
}

export type Format = ReturnType<typeof useFormat>;
