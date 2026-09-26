import {
  createAccount,
  parseMoney,
  updateSettings,
  type AccountKind,
  type CurrencyCode,
  type LedgerDB,
  type NewAccount,
} from '../../core';
import { parseFeePercent } from '../accounts/feeRate';

export type SuggestionId = 'cash' | 'localBank' | 'homeBank' | 'homeCard';

/** An account offered during setup, as the raw text of its fields. */
export interface AccountDraft {
  id: SuggestionId;
  selected: boolean;
  name: string;
  kind: AccountKind;
  currency: CurrencyCode;
  /** Money held, or for a card the amount owed. */
  balance: string;
  /** Cards only: foreign transaction fee in percent. */
  feeRate: string;
}

/**
 * The accounts a student abroad usually has: local cash (and maybe a local
 * bank), plus a bank account and credit card from home. When studying in
 * the home currency, the local and home ones are the same.
 */
export function suggestAccounts({
  local,
  home,
  name,
}: {
  local: CurrencyCode;
  home: CurrencyCode;
  name: (id: SuggestionId) => string;
}): AccountDraft[] {
  const draft = (id: SuggestionId, kind: AccountKind, currency: CurrencyCode, selected: boolean): AccountDraft => ({
    id,
    selected,
    name: name(id),
    kind,
    currency,
    balance: '',
    // Taiwanese cards typically add 1.5% abroad.
    feeRate: kind === 'credit_card' && home === 'TWD' && local !== home ? '1.5' : '',
  });
  if (local === home) {
    return [draft('cash', 'cash', local, true), draft('homeBank', 'bank', home, true), draft('homeCard', 'credit_card', home, true)];
  }
  return [
    draft('cash', 'cash', local, true),
    draft('localBank', 'bank', local, false),
    draft('homeBank', 'bank', home, true),
    draft('homeCard', 'credit_card', home, true),
  ];
}

export type DraftError = 'name' | 'balance' | 'feeRate';

/** Checks the selected drafts and turns them into accounts to create. */
export function draftsToAccounts(
  drafts: readonly AccountDraft[],
): { accounts: NewAccount[]; errors?: undefined } | { accounts?: undefined; errors: Partial<Record<SuggestionId, DraftError>> } {
  const errors: Partial<Record<SuggestionId, DraftError>> = {};
  const accounts: NewAccount[] = [];
  for (const draft of drafts) {
    if (!draft.selected) continue;
    const entered = draft.balance.trim() === '' ? 0 : parseMoney(draft.balance, draft.currency);
    const foreignFeeBps = draft.kind === 'credit_card' ? parseFeePercent(draft.feeRate) : undefined;
    if (!draft.name.trim()) errors[draft.id] = 'name';
    else if (entered === null) errors[draft.id] = 'balance';
    else if (foreignFeeBps === null) errors[draft.id] = 'feeRate';
    else {
      accounts.push({
        name: draft.name,
        kind: draft.kind,
        currency: draft.currency,
        // A card's balance is typed as the amount owed.
        openingBalanceMinor: draft.kind === 'credit_card' ? -entered : entered,
        ...(foreignFeeBps !== undefined && { foreignFeeBps }),
      });
    }
  }
  return Object.keys(errors).length > 0 ? { errors } : { accounts };
}

/**
 * Saves the main currency and the first accounts together: all or nothing.
 * Accounts keep the given order (the first is the default for new entries).
 */
export async function completeSetup(
  db: LedgerDB,
  { baseCurrency, accounts }: { baseCurrency: CurrencyCode; accounts: readonly NewAccount[] },
): Promise<void> {
  const start = Date.now();
  await db.transaction('rw', [db.accounts, db.settings], async () => {
    await updateSettings(db, { baseCurrency });
    for (const [index, account] of accounts.entries()) await createAccount(db, account, { now: start + index });
  });
}
