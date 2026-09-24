import { describe, expect, it } from 'vitest';
import { feePercentInput, parseFeePercent } from './feeRate';

describe('fee rate', () => {
  it.each([
    ['1.5', 150],
    [' 1.5 % ', 150],
    ['0', 0],
    ['10', 1000],
    ['2.75', 275],
    ['', undefined],
    ['10.01', null],
    ['1.555', null],
    ['-1', null],
    ['abc', null],
  ] as const)('%j → %j', (text, bps) => {
    expect(parseFeePercent(text)).toBe(bps);
  });

  it('shows basis points as a percentage', () => {
    expect(feePercentInput(150)).toBe('1.5');
    expect(feePercentInput(0)).toBe('0');
    expect(feePercentInput(undefined)).toBe('');
  });
});
