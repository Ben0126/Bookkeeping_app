import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../core';
import { groupByDate, toEntries } from './entries';

const posting = (fields: Pick<Transaction, 'id' | 'kind' | 'accountId' | 'amountMinor' | 'date'> & Partial<Transaction>): Transaction => ({
  createdAt: 0,
  updatedAt: 0,
  ...fields,
});

const expense = posting({ id: 'e1', kind: 'expense', accountId: 'usd', amountMinor: -500, date: '2026-09-03' });
const outflow = posting({ id: 'o1', kind: 'transfer', accountId: 'usd', amountMinor: -1000, date: '2026-09-02', transferId: 'x' });
const inflow = posting({ id: 'i1', kind: 'transfer', accountId: 'twd', amountMinor: 32000, date: '2026-09-02', transferId: 'x' });
const income = posting({ id: 'n1', kind: 'income', accountId: 'twd', amountMinor: 900, date: '2026-09-02' });

describe('toEntries', () => {
  it('merges both legs of a transfer into one row', () => {
    const entries = toEntries([expense, outflow, inflow, income], []);
    expect(entries.map((e) => [e.type, e.id])).toEqual([
      ['single', 'e1'],
      ['transfer', 'x'],
      ['single', 'n1'],
    ]);
    expect(entries[1]).toMatchObject({ outflow: { id: 'o1' }, inflow: { id: 'i1' } });
    expect(entries[1]).not.toHaveProperty('side');
  });

  it('uses looked-up legs and marks the side when filtered to one account', () => {
    const [entry] = toEntries([inflow], [outflow, inflow], 'twd');
    expect(entry).toMatchObject({ type: 'transfer', side: 'inflow', outflow: { id: 'o1' } });
    expect(toEntries([outflow], [outflow, inflow], 'usd')[0]).toMatchObject({ side: 'outflow' });
  });

  it('falls back to a plain row when a leg is missing', () => {
    expect(toEntries([outflow], [])[0]).toMatchObject({ type: 'single', id: 'o1' });
  });
});

describe('groupByDate', () => {
  it('groups consecutive rows by day', () => {
    const groups = groupByDate(toEntries([expense, outflow, inflow, income], []));
    expect(groups.map((g) => [g.date, g.entries.length])).toEqual([
      ['2026-09-03', 1],
      ['2026-09-02', 2],
    ]);
  });
});
