import { describe, expect, it } from 'vitest';
import { convertMinor, formatMoney, parseMoney, roundHalfAwayFromZero, toMajor, toMoneyInput } from './money';

describe('parseMoney', () => {
  it.each([
    ['12.34', 'USD', 1234],
    ['1,234.5', 'USD', 123450],
    [' 7 ', 'USD', 700],
    ['.5', 'USD', 50],
    ['5.', 'USD', 500],
    ['-3.2', 'USD', -320],
    ['-0', 'USD', 0],
    ['1500', 'TWD', 1500],
    ['1500.00', 'TWD', 1500],
    ['300', 'JPY', 300],
  ] as const)('parses %j %s as %d', (input, currency, expected) => {
    expect(parseMoney(input, currency)).toBe(expected);
  });

  it.each([
    ['', 'USD'],
    ['.', 'USD'],
    ['abc', 'USD'],
    ['1.2.3', 'USD'],
    ['12.345', 'USD'],
    ['100.5', 'TWD'],
    ['1e3', 'USD'],
    ['99999999999999999999', 'USD'],
  ] as const)('rejects %j %s', (input, currency) => {
    expect(parseMoney(input, currency)).toBeNull();
  });

  it('adds cents without floating-point drift', () => {
    const total = parseMoney('0.1', 'USD')! + parseMoney('0.2', 'USD')!;
    expect(total).toBe(30);
    expect(toMajor(total, 'USD')).toBe(0.3);
  });
});

describe('roundHalfAwayFromZero', () => {
  it('rounds halves away from zero in both directions', () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
    expect(roundHalfAwayFromZero(2.4)).toBe(2);
    expect(Object.is(roundHalfAwayFromZero(-0.2), 0)).toBe(true);
  });

  it('ignores binary noise just below a half', () => {
    // 0.285 * 100 === 28.499999999999996 in IEEE 754.
    expect(roundHalfAwayFromZero(0.285 * 100)).toBe(29);
  });
});

describe('convertMinor', () => {
  it('converts between currencies with different decimals', () => {
    // US$123.45 × 32.1 = NT$3,962.745 → NT$3,963
    expect(convertMinor(12345, 'USD', 'TWD', 32.1)).toBe(3963);
    // NT$1,000 × 0.031 = US$31.00
    expect(convertMinor(1000, 'TWD', 'USD', 0.031)).toBe(3100);
    // ¥1,000 × 0.21 = NT$210
    expect(convertMinor(1000, 'JPY', 'TWD', 0.21)).toBe(210);
  });

  it('keeps the sign of the amount', () => {
    expect(convertMinor(-12345, 'USD', 'TWD', 32.1)).toBe(-3963);
  });

  it('returns the amount unchanged for the same currency', () => {
    expect(convertMinor(999, 'EUR', 'EUR', 123)).toBe(999);
  });

  it('rejects unusable rates', () => {
    expect(() => convertMinor(100, 'USD', 'TWD', 0)).toThrow(RangeError);
    expect(() => convertMinor(100, 'USD', 'TWD', Number.NaN)).toThrow(RangeError);
  });
});

describe('formatMoney', () => {
  it('formats with the currency precision', () => {
    expect(formatMoney(123456, 'USD', 'en-US')).toBe('$1,234.56');
    expect(formatMoney(1500, 'TWD', 'en-US')).toBe('NT$1,500');
    expect(formatMoney(1500, 'JPY', 'en-US')).toBe('¥1,500');
    expect(formatMoney(-500, 'USD', 'en-US')).toBe('-$5.00');
  });
});

describe('toMoneyInput', () => {
  it.each([
    [1250, 'USD', '12.50'],
    [5, 'USD', '0.05'],
    [-250000, 'USD', '-2500.00'],
    [1500, 'TWD', '1500'],
    [0, 'EUR', '0.00'],
  ] as const)('renders %d %s as %j and parses back', (minor, currency, text) => {
    expect(toMoneyInput(minor, currency)).toBe(text);
    expect(parseMoney(text, currency)).toBe(minor);
  });
});
