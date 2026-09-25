import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  ACCOUNT_KINDS,
  createAccount,
  CURRENCY_CODES,
  deleteAccount,
  parseMoney,
  setAccountBalance,
  toMoneyInput,
  updateAccount,
  type Account,
  type AccountKind,
  type CurrencyCode,
} from '../../core';
import { ErrorBanner, Field } from '../../ui/form';
import { ModalFooter } from '../../ui/Modal';
import { dangerButtonClass, inputClass, primaryButtonClass, secondaryButtonClass } from '../../ui/styles';
import { useFormat } from '../../ui/useFormat';
import { feePercentInput, parseFeePercent } from './feeRate';

/** Credit cards are entered as the amount owed; everything else as money held. */
const isDebt = (kind: AccountKind) => kind === 'credit_card';

interface AccountFormProps {
  /** Omitted when creating a new account. */
  account?: Account;
  /** The account's balance now, when editing. */
  currentBalanceMinor?: number;
  defaultCurrency: CurrencyCode;
  onDone: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

export function AccountForm({ account, currentBalanceMinor = 0, defaultCurrency, onDone, onDirtyChange }: AccountFormProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const id = useId();
  const [initial] = useState(() => {
    const kind = account?.kind ?? 'bank';
    return {
      name: account?.name ?? '',
      kind,
      currency: account?.currency ?? defaultCurrency,
      // What the user sees: "balance now", or "amount owed" for a card.
      balance: account ? toMoneyInput(isDebt(kind) ? -currentBalanceMinor : currentBalanceMinor, account.currency) : '',
      feeRate: feePercentInput(account?.foreignFeeBps),
    };
  });
  const [name, setName] = useState(initial.name);
  const [kind, setKind] = useState<AccountKind>(initial.kind);
  const [currency, setCurrency] = useState<CurrencyCode>(initial.currency);
  const [balance, setBalance] = useState(initial.balance);
  const [balanceError, setBalanceError] = useState<string>();
  const [feeRate, setFeeRate] = useState(initial.feeRate);
  const [feeRateError, setFeeRateError] = useState<string>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    onDirtyChange(
      name !== initial.name ||
        kind !== initial.kind ||
        currency !== initial.currency ||
        balance !== initial.balance ||
        feeRate !== initial.feeRate,
    );
  }, [name, kind, currency, balance, feeRate, initial, onDirtyChange]);

  const transactionCount = useLiveQuery(
    () => (account ? db.transactions.where('accountId').equals(account.id).count() : 0),
    [db, account?.id],
  );
  const currencyLocked = (transactionCount ?? 0) > 0;

  const changeKind = (next: AccountKind) => {
    // "Owed 120" on a card is "-120" in a bank account, so flip the number when crossing over.
    if (isDebt(next) !== isDebt(kind)) {
      const minor = parseMoney(balance, currency);
      if (minor !== null && minor !== 0) setBalance(toMoneyInput(-minor, currency));
    }
    setKind(next);
  };

  const run = async (action: () => Promise<unknown>) => {
    setSubmitError(null);
    setSaving(true);
    try {
      await action();
      onDone();
    } catch (error) {
      setSubmitError(fmt.error(error));
      setSaving(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const entered = balance.trim() === '' ? 0 : parseMoney(balance, currency);
    if (entered === null) {
      setBalanceError(t('transactionForm.errors.amountInvalid'));
      document.getElementById(`${id}-balance`)?.focus();
      return;
    }
    // Cash has no card fee; a rate left from another kind is dropped.
    const foreignFeeBps = kind === 'cash' ? undefined : parseFeePercent(feeRate);
    if (foreignFeeBps === null) {
      setFeeRateError(t('accounts.foreignFeeInvalid'));
      document.getElementById(`${id}-feeRate`)?.focus();
      return;
    }
    const balanceMinor = isDebt(kind) ? -entered : entered;
    void run(async () => {
      if (!account) {
        await createAccount(db, { name, kind, currency, openingBalanceMinor: balanceMinor, foreignFeeBps });
        return;
      }
      await db.transaction('rw', [db.accounts, db.transactions, db.recurring], async () => {
        await updateAccount(db, account.id, { name, kind, currency, foreignFeeBps: foreignFeeBps ?? null });
        if (balance !== initial.balance) await setAccountBalance(db, account.id, balanceMinor);
      });
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-4 pb-4">
        <Field label={t('accounts.name')} htmlFor={`${id}-name`}>
          <input
            id={`${id}-name`}
            className={inputClass}
            autoFocus={!account}
            autoComplete="off"
            placeholder={t('accounts.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('accounts.kind')} htmlFor={`${id}-kind`}>
            <select
              id={`${id}-kind`}
              className={inputClass}
              value={kind}
              onChange={(e) => changeKind(e.target.value as AccountKind)}
            >
              {ACCOUNT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {fmt.accountKind(k)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={t('accounts.currency')}
            htmlFor={`${id}-currency`}
            hint={currencyLocked ? t('accounts.currencyLocked') : undefined}
          >
            <select
              id={`${id}-currency`}
              className={inputClass}
              value={currency}
              disabled={currencyLocked}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            >
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code} · {fmt.currencyName(code)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label={isDebt(kind) ? t('accounts.amountOwed') : t('accounts.currentBalance')}
          htmlFor={`${id}-balance`}
          error={balanceError}
          hint={isDebt(kind) ? t('accounts.amountOwedHint') : t('accounts.currentBalanceHint')}
        >
          <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-surface shadow-xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30">
            <span className="flex shrink-0 items-center bg-slate-100 px-3 text-sm font-bold text-slate-600">{currency}</span>
            <input
              id={`${id}-balance`}
              className="min-w-0 flex-1 px-3 py-2 text-base tabular-nums outline-none placeholder:text-slate-300"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={balance}
              aria-invalid={balanceError ? true : undefined}
              onChange={(e) => {
                setBalance(e.target.value);
                setBalanceError(undefined);
              }}
            />
          </div>
        </Field>

        {kind !== 'cash' && (
          <Field
            label={t('accounts.foreignFee')}
            htmlFor={`${id}-feeRate`}
            error={feeRateError}
            hint={t('accounts.foreignFeeHint')}
          >
            <div className="flex w-36 overflow-hidden rounded-lg border border-slate-300 bg-surface shadow-xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30">
              <input
                id={`${id}-feeRate`}
                className="min-w-0 flex-1 px-3 py-2 text-base tabular-nums outline-none placeholder:text-slate-300"
                inputMode="decimal"
                autoComplete="off"
                placeholder="1.5"
                value={feeRate}
                aria-invalid={feeRateError ? true : undefined}
                onChange={(e) => {
                  setFeeRate(e.target.value);
                  setFeeRateError(undefined);
                }}
              />
              <span className="flex shrink-0 items-center bg-slate-100 px-3 text-sm font-bold text-slate-600">%</span>
            </div>
          </Field>
        )}
      </div>

      <ModalFooter>
        <ErrorBanner message={submitError} />
        <div className="flex flex-wrap items-center gap-2">
          {account && (
            <>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={saving}
                onClick={() => void run(() => updateAccount(db, account.id, { archived: !account.archived }))}
              >
                {account.archived ? t('accounts.unarchive') : t('accounts.archive')}
              </button>
              {confirmingDelete ? (
                <button
                  type="button"
                  className={dangerButtonClass}
                  disabled={saving}
                  onClick={() => void run(() => deleteAccount(db, account.id))}
                >
                  {t('accounts.confirmDelete')}
                </button>
              ) : (
                <button type="button" className={dangerButtonClass} onClick={() => setConfirmingDelete(true)}>
                  {t('common.delete')}
                </button>
              )}
            </>
          )}
          <button type="submit" className={`${primaryButtonClass} ml-auto min-w-24`} disabled={saving}>
            {t('common.save')}
          </button>
        </div>
      </ModalFooter>
    </form>
  );
}
