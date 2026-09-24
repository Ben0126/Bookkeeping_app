import { describe, expect, it } from 'vitest';
import { fromDateKey, isDateKey, isMonthKey, monthOf, monthRange, shiftMonth, toDateKey } from './dates';

describe('isDateKey', () => {
  it.each(['2026-09-24', '2024-02-29', '2026-12-31'])('accepts %s', (value) => {
    expect(isDateKey(value)).toBe(true);
  });

  it.each(['2026-02-29', '2026-13-01', '2026-00-10', '2026-9-24', '2026-09-24T00:00', '', 20260924, null])(
    'rejects %j',
    (value) => {
      expect(isDateKey(value)).toBe(false);
    },
  );
});

describe('date helpers', () => {
  it('uses the local calendar day', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('derives months and month ranges', () => {
    expect(monthOf('2026-09-24')).toBe('2026-09');
    const { from, to } = monthRange('2026-02');
    expect('2026-02-28' >= from && '2026-02-28' <= to).toBe(true);
    expect('2026-03-01' <= to).toBe(false);
  });
});

describe('month helpers', () => {
  it('validates month keys', () => {
    expect(isMonthKey('2026-09')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('2026-9')).toBe(false);
    expect(isMonthKey(null)).toBe(false);
  });

  it('shifts across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-09', 0)).toBe('2026-09');
  });

  it('turns a date key back into a local date', () => {
    expect(toDateKey(fromDateKey('2026-02-28'))).toBe('2026-02-28');
  });
});
