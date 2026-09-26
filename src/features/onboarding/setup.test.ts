import { describe, expect, it, vi } from 'vitest';
import { getSettings, listAccounts } from '../../core';
import { createTestDb } from '../../test/ledgerDb';
import { completeSetup, draftsToAccounts, suggestAccounts, type AccountDraft } from './setup';

const name = (id: string) => id;

describe('suggestAccounts', () => {
  it('offers local cash and bank, plus a bank account and card from home', () => {
    const drafts = suggestAccounts({ local: 'JPY', home: 'TWD', name });
    expect(drafts.map(({ id, kind, currency, selected, feeRate }) => [id, kind, currency, selected, feeRate])).toEqual([
      ['cash', 'cash', 'JPY', true, ''],
      ['localBank', 'bank', 'JPY', false, ''],
      ['homeBank', 'bank', 'TWD', true, ''],
      // Taiwanese cards typically charge 1.5% abroad.
      ['homeCard', 'credit_card', 'TWD', true, '1.5'],
    ]);
  });

  it('merges local and home when they are the same, and leaves other fees blank', () => {
    expect(suggestAccounts({ local: 'TWD', home: 'TWD', name }).map((d) => [d.id, d.feeRate])).toEqual([
      ['cash', ''],
      ['homeBank', ''],
      ['homeCard', ''],
    ]);
    expect(suggestAccounts({ local: 'GBP', home: 'USD', name }).find((d) => d.id === 'homeCard')?.feeRate).toBe('');
  });
});

describe('draftsToAccounts', () => {
  const drafts = (): AccountDraft[] => suggestAccounts({ local: 'JPY', home: 'TWD', name: (id) => `My ${id}` });

  it('keeps the ticked accounts, a card balance as money owed', () => {
    const list = drafts().map((d) =>
      d.id === 'cash' ? { ...d, balance: '20,000' } : d.id === 'homeCard' ? { ...d, balance: '3,000' } : d,
    );
    expect(draftsToAccounts(list)).toEqual({
      accounts: [
        { name: 'My cash', kind: 'cash', currency: 'JPY', openingBalanceMinor: 20000 },
        { name: 'My homeBank', kind: 'bank', currency: 'TWD', openingBalanceMinor: 0 },
        { name: 'My homeCard', kind: 'credit_card', currency: 'TWD', openingBalanceMinor: -3000, foreignFeeBps: 150 },
      ],
    });
  });

  it('reports the first problem of each ticked account', () => {
    const list = drafts().map((d) => {
      if (d.id === 'cash') return { ...d, name: ' ' };
      if (d.id === 'localBank') return { ...d, balance: 'abc' }; // not ticked: ignored
      if (d.id === 'homeBank') return { ...d, balance: '12.5' }; // TWD has no decimals
      return { ...d, feeRate: '20' };
    });
    expect(draftsToAccounts(list)).toEqual({ errors: { cash: 'name', homeBank: 'balance', homeCard: 'feeRate' } });
  });
});

describe('completeSetup', () => {
  it('saves the main currency and the accounts in the given order', async () => {
    const db = createTestDb();
    // Created within the same millisecond, the accounts would otherwise sort by name.
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    await completeSetup(db, {
      baseCurrency: 'JPY',
      accounts: [
        { name: 'Zeta cash', kind: 'cash', currency: 'JPY' },
        { name: 'Alpha bank', kind: 'bank', currency: 'TWD' },
      ],
    });
    expect((await getSettings(db)).baseCurrency).toBe('JPY');
    vi.restoreAllMocks();
    expect((await listAccounts(db)).map((a) => a.name)).toEqual(['Zeta cash', 'Alpha bank']);
  });

  it('saves nothing when an account is invalid', async () => {
    const db = createTestDb();
    await expect(
      completeSetup(db, {
        baseCurrency: 'JPY',
        accounts: [
          { name: 'Cash', kind: 'cash', currency: 'JPY' },
          { name: '', kind: 'bank', currency: 'TWD' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'INVALID_NAME' });
    expect(await db.accounts.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
  });
});
