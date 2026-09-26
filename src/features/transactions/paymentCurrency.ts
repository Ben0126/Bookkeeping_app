import { isCurrencyCode, type CurrencyCode } from '../../core';
import { readPreference, writePreference } from '../../ui/preferences';

/** Per device: the currency each account last paid in, e.g. JPY for a Taiwanese card used in Japan. */
const PAYMENT_CURRENCIES = 'paymentCurrencies';

function readAll(): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(readPreference(PAYMENT_CURRENCIES) ?? '{}');
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function readPaymentCurrency(accountId: string): CurrencyCode | undefined {
  const value = readAll()[accountId];
  return isCurrencyCode(value) ? value : undefined;
}

export function writePaymentCurrency(accountId: string, currency: CurrencyCode): void {
  writePreference(PAYMENT_CURRENCIES, JSON.stringify({ ...readAll(), [accountId]: currency }));
}
