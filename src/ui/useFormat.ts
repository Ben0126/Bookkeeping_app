import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  currencyDecimals,
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

const DAY = 24 * 60 * 60 * 1000;

/** Whole calendar days from `from` to `to` in local time (so "yesterday" means the previous date). */
function calendarDaysBetween(from: number, to: number): number {
  const a = new Date(from);
  const b = new Date(to);
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY,
  );
}

/** Locale-aware formatting of money, dates and ledger names for the current language. */
export function useFormat() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;

  return useMemo(() => {
    const currencyNames = new Intl.DisplayNames([locale], { type: 'currency' });
    const monthFormat = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' });
    const dayFormat = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', weekday: 'short' });
    const dayWithYearFormat = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
    const rateFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 4 });
    const dateTimeFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
    const relativeFormat = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    return {
      money: (amountMinor: number, currency: CurrencyCode) => formatMoney(amountMinor, currency, MONEY_LOCALE),
      /** Shows "+" on positive amounts; negatives already carry "-". */
      signedMoney: (amountMinor: number, currency: CurrencyCode) =>
        (amountMinor > 0 ? '+' : '') + formatMoney(amountMinor, currency, MONEY_LOCALE),
      rate: (value: number) => rateFormat.format(value),
      currencyName: (currency: CurrencyCode) => currencyNames.of(currency) ?? currency,
      month: (month: string) => monthFormat.format(fromDateKey(`${month}-01`)),
      day: (dateKey: string) => dayFormat.format(fromDateKey(dateKey)),
      dayWithYear: (dateKey: string) => dayWithYearFormat.format(fromDateKey(dateKey)),
      dateTime: (time: number) => dateTimeFormat.format(time),
      /** "today", "yesterday", "3 days ago" */
      daysAgo: (time: number, now: number = Date.now()) =>
        relativeFormat.format(-calendarDaysBetween(time, now), 'day'),
      categoryName: (category: Category | undefined) => {
        if (!category) return t('transactions.uncategorized');
        return category.key ? t(`categories.${category.key}`, { defaultValue: category.name }) : category.name;
      },
      accountKind: (kind: AccountKind) => t(`accountKinds.${kind}`),
      /** Message for a form error code under `transactionForm.errors`, worded for the currency. */
      formError: (code: string, currency?: CurrencyCode) => {
        const decimals = currency ? currencyDecimals(currency) : 0;
        return t(`transactionForm.errors.${code}`, {
          currency,
          decimals,
          context: code === 'amountTooPrecise' && decimals === 0 ? 'none' : undefined,
        });
      },
      error: (error: unknown) =>
        error instanceof LedgerError ? t(`errors.${error.code}`) : t('errors.UNKNOWN'),
    };
  }, [t, locale]);
}

export type Format = ReturnType<typeof useFormat>;
