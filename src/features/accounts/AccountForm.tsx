import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  ACCOUNT_KINDS,
  createAccount,
  CURRENCY_CODES,
  deleteAccount,
  parseMoney,
  toMoneyInput,
  updateAccount,
  type Account,
  type AccountKind,
  type CurrencyCode,
} from '../../core';
import { ErrorBanner, Field } from '../../ui/form';
import { dangerButtonClass, inputClass, primaryButtonClass, secondaryButtonClass } from '../../ui/styles';
import { useFormat } from '../../ui/useFormat';

interface AccountFormProps {
  /** Omitted when creating a new account. */
  account?: Account;
  defaultCurrency: CurrencyCode;
  onDone: () => void;
}

export function AccountForm({ account, defaultCurrency, onDone }: AccountFormProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const id = useId();
  const [name, setName] = useState(account?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'bank');
  const [currency, setCurrency] = useState<CurrencyCode>(account?.currency ?? defaultCurrency);
  const [opening, setOpening] = useState(account ? toMoneyInput(account.openingBalanceMinor, account.currency) : '');
  const [openingError, setOpeningError] = useState<string>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const transactionCount = useLiveQuery(
    () => (account ? db.transactions.where('accountId').equals(account.id).count() : 0),
    [db, account?.id],
  );
  const currencyLocked = (transactionCount ?? 0) > 0;

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
    const openingBalanceMinor = opening.trim() === '' ? 0 : parseMoney(opening, currency);
    if (openingBalanceMinor === null) {
      setOpeningError(t('transactionForm.errors.invalidAmount'));
      return;
    }
    void run(() =>
      account
        ? updateAccount(db, account.id, { name, kind, currency, openingBalanceMinor })
        : createAccount(db, { name, kind, currency, openingBalanceMinor }),
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
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
          <select id={`${id}-kind`} className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as AccountKind)}>
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
        label={t('accounts.openingBalance')}
        htmlFor={`${id}-opening`}
        error={openingError}
        hint={t('accounts.openingBalanceHint')}
      >
        <input
          id={`${id}-opening`}
          className={`${inputClass} tabular-nums`}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={opening}
          aria-invalid={openingError ? true : undefined}
          onChange={(e) => {
            setOpening(e.target.value);
            setOpeningError(undefined);
          }}
        />
      </Field>

      <ErrorBanner message={submitError} />

      <div className="flex flex-wrap items-center gap-2 pt-2">
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
        <div className="ml-auto flex gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onDone}>
            {t('common.cancel')}
          </button>
          <button type="submit" className={primaryButtonClass} disabled={saving}>
            {t('common.save')}
          </button>
        </div>
      </div>
    </form>
  );
}
