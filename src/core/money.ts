/**
 * Money is always stored as an integer number of minor units (cents, or whole
 * units for currencies without a fractional part) so sums never pick up
 * floating-point drift.
 */
export const CURRENCIES = {
  TWD: { decimals: 0 },
  USD: { decimals: 2 },
  GBP: { decimals: 2 },
  EUR: { decimals: 2 },
  AUD: { decimals: 2 },
  CAD: { decimals: 2 },
  NZD: { decimals: 2 },
  JPY: { decimals: 0 },
  CNY: { decimals: 2 },
  HKD: { decimals: 2 },
  SGD: { decimals: 2 },
  CHF: { decimals: 2 },
} as const satisfies Record<string, { decimals: number }>;

export type CurrencyCode = keyof typeof CURRENCIES;

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && Object.hasOwn(CURRENCIES, value);
}

export function currencyDecimals(currency: CurrencyCode): number {
  return CURRENCIES[currency].decimals;
}

/** Rounds half away from zero, ignoring binary noise such as 28.499999999999996. */
export function roundHalfAwayFromZero(value: number): number {
  const rounded = Math.round(Number(Math.abs(value).toFixed(9)));
  if (rounded === 0) return 0;
  return value < 0 ? -rounded : rounded;
}

/** Converts minor units to a major-unit number, for display and charts only. */
export function toMajor(amountMinor: number, currency: CurrencyCode): number {
  return amountMinor / 10 ** currencyDecimals(currency);
}

const AMOUNT_PATTERN = /^(-)?(\d*)(?:\.(\d*))?$/;

/**
 * Parses user input such as "1,234.5" into minor units. Returns null when the
 * input is not a number or has more precision than the currency allows.
 */
export function parseMoney(input: string, currency: CurrencyCode): number | null {
  const match = AMOUNT_PATTERN.exec(input.trim().replace(/[,\s]/g, ''));
  if (!match) return null;
  const [, sign, whole = '', fraction = ''] = match;
  if (whole === '' && fraction === '') return null;

  const decimals = currencyDecimals(currency);
  if (/[^0]/.test(fraction.slice(decimals))) return null;

  const digits = (whole || '0') + fraction.slice(0, decimals).padEnd(decimals, '0');
  const minor = Number(digits);
  if (!Number.isSafeInteger(minor)) return null;
  return sign && minor !== 0 ? -minor : minor;
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amountMinor: number, currency: CurrencyCode, locale?: string): string {
  const cacheKey = `${locale ?? ''}|${currency}`;
  let formatter = formatters.get(cacheKey);
  if (!formatter) {
    const decimals = currencyDecimals(currency);
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(cacheKey, formatter);
  }
  return formatter.format(toMajor(amountMinor, currency));
}

/**
 * Converts an amount between currencies. `rate` is how many units of `to` one
 * unit of `from` buys (major units, e.g. USD→TWD ≈ 32).
 */
export function convertMinor(
  amountMinor: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rate: number,
): number {
  if (from === to) return amountMinor;
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new RangeError(`Invalid exchange rate ${rate} for ${from}→${to}`);
  }
  const scale = 10 ** (currencyDecimals(to) - currencyDecimals(from));
  return roundHalfAwayFromZero(amountMinor * rate * scale);
}
