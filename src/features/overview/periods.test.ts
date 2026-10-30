import { describe, expect, it } from 'vitest';
import { guessSemesterStart, monthsSoFar, periodContaining, shiftPeriod } from './periods';

describe('periodContaining', () => {
  it('covers the calendar year', () => {
    const year = periodContaining('year', '2026-10', 9);
    expect(year.months).toHaveLength(12);
    expect([year.from, year.to]).toEqual(['2026-01-01', '2026-12-31']);
  });

  it.each([
    // September start: Sep–Feb and Mar–Aug.
    ['2026-10', 9, '2026-09', '2027-02'],
    ['2027-02', 9, '2026-09', '2027-02'],
    ['2027-03', 9, '2027-03', '2027-08'],
    ['2026-08', 9, '2026-03', '2026-08'],
    // April start (Japan): Apr–Sep and Oct–Mar.
    ['2026-04', 4, '2026-04', '2026-09'],
    ['2027-01', 4, '2026-10', '2027-03'],
  ])('puts %s with semesters from month %i in %s–%s', (month, start, first, last) => {
    const { months } = periodContaining('semester', month, start);
    expect([months[0], months[5]]).toEqual([first, last]);
  });

  it('is a single month for the month view', () => {
    expect(periodContaining('month', '2026-02', 9)).toEqual({
      view: 'month', months: ['2026-02'], from: '2026-02-01', to: '2026-02-31',
    });
  });
});

describe('shiftPeriod', () => {
  it('moves by whole periods', () => {
    const semester = periodContaining('semester', '2026-10', 9);
    expect(shiftPeriod(semester, -1, 9).months[0]).toBe('2026-03');
    expect(shiftPeriod(semester, 1, 9).months[0]).toBe('2027-03');
    expect(shiftPeriod(periodContaining('year', '2026-10', 9), -1, 9).from).toBe('2025-01-01');
  });
});

describe('monthsSoFar', () => {
  const semester = periodContaining('semester', '2026-10', 9);
  it('counts months up to the current one', () => {
    expect(monthsSoFar(semester, '2026-10-30')).toBe(2);
    expect(monthsSoFar(semester, '2027-06-01')).toBe(6);
    expect(monthsSoFar(semester, '2026-08-31')).toBe(0);
  });
});

describe('guessSemesterStart', () => {
  it('follows the school year where the device is', () => {
    expect(guessSemesterStart('Asia/Tokyo')).toBe(4);
    expect(guessSemesterStart('Australia/Sydney')).toBe(2);
    expect(guessSemesterStart('Europe/London')).toBe(9);
    expect(guessSemesterStart(undefined)).toBe(9);
  });
});
