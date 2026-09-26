import { describe, expect, it } from 'vitest';
import { guessCurrencyFromTimeZone } from './localCurrency';

describe('guessCurrencyFromTimeZone', () => {
  it.each([
    ['America/New_York', 'USD'],
    ['America/Los_Angeles', 'USD'],
    ['America/Toronto', 'CAD'],
    ['Asia/Tokyo', 'JPY'],
    ['Asia/Taipei', 'TWD'],
    ['Europe/London', 'GBP'],
    ['Europe/Berlin', 'EUR'],
    ['Australia/Sydney', 'AUD'],
    ['Pacific/Auckland', 'NZD'],
  ])('guesses %s → %s', (zone, currency) => {
    expect(guessCurrencyFromTimeZone(zone)).toBe(currency);
  });

  it('has no guess for unknown zones', () => {
    expect(guessCurrencyFromTimeZone('Africa/Nairobi')).toBeUndefined();
    expect(guessCurrencyFromTimeZone(undefined)).toBeUndefined();
  });
});
