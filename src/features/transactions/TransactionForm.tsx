import { useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  createTransaction,
  CURRENCY_CODES,
  deleteTransaction,
  parseMoney,
  toMajor,
  updateTransaction,
  type Account,
  type Category,
} from '../../core';
import { ErrorBanner, Field, Segmented } from '../../ui/form';
import { writePreference } from '../../ui/preferences';
import { dangerButtonClass, inputClass, primaryButtonClass, secondaryButtonClass } from '../../ui/styles';
import { useFormat } from '../../ui/useFormat';
import {
  defaultForeignCurrency,
  formStateToInput,
  LAST_ACCOUNT_PREFERENCE,
  type FormErrors,
  type FormKind,
  type FormState,
} from './formState';

interface TransactionFormProps {
  /** All accounts and categories, archived included (for editing old entries). */
  accounts: readonly Account[];
  categories: readonly Category[];
  initial: FormState;
  /** Record or transfer id when editing. */
  editingId?: string;
  onSaved: (date: string) => void;
  onDeleted: () => void;
  onCancel: () => void;
}

export function TransactionForm({
  accounts,
  categories,
  initial,
  editingId,
  onSaved,
  onDeleted,
  onCancel,
}: TransactionFormProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const id = useId();
  const [state, setState] = useState(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Archived accounts and categories stay selectable only if the entry already uses them.
  const selectableAccounts = accounts.filter(
    (a) => !a.archived || a.id === initial.accountId || a.id === initial.toAccountId,
  );
  const account = accounts.find((a) => a.id === state.accountId);
  const toAccount = accounts.find((a) => a.id === state.toAccountId);
  const crossCurrency = state.kind === 'transfer' && account && toAccount && account.currency !== toAccount.currency;

  const categoryOptions = useMemo(() => {
    if (state.kind === 'transfer') return [];
    const usable = categories.filter(
      (c) => c.kind === state.kind && (!c.archived || c.id === initial.categoryId),
    );
    const parents = usable.filter((c) => c.parentId === undefined);
    return parents.flatMap((parent) => [parent, ...usable.filter((c) => c.parentId === parent.id)]);
  }, [categories, state.kind, initial.categoryId]);

  const update = (patch: Partial<FormState>) => {
    setState((previous) => ({ ...previous, ...patch }));
    setErrors((previous) => {
      const next = { ...previous };
      for (const key of Object.keys(patch)) delete next[key as keyof FormErrors];
      return next;
    });
  };

  const changeKind = (kind: FormKind) => {
    const patch: Partial<FormState> = { kind };
    const category = categories.find((c) => c.id === state.categoryId);
    if (category && category.kind !== kind) patch.categoryId = '';
    if (kind === 'transfer' && !state.toAccountId) {
      patch.toAccountId = selectableAccounts.find((a) => !a.archived && a.id !== state.accountId)?.id ?? '';
    }
    update(patch);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    const result = formStateToInput(state, accounts);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    setSaving(true);
    try {
      if (editingId) await updateTransaction(db, editingId, result.input);
      else await createTransaction(db, result.input);
      writePreference(LAST_ACCOUNT_PREFERENCE, state.accountId);
      onSaved(result.input.date);
    } catch (error) {
      setSubmitError(fmt.error(error));
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await deleteTransaction(db, editingId);
      onDeleted();
    } catch (error) {
      setSubmitError(fmt.error(error));
      setSaving(false);
    }
  };

  const fieldError = (field: keyof FormErrors) => (errors[field] ? t(errors[field]) : undefined);
  const invalidProps = (field: keyof FormErrors) =>
    errors[field] ? { 'aria-invalid': true, 'aria-describedby': `${id}-${field}-error` } : {};

  const impliedRate = (() => {
    if (!crossCurrency || !account || !toAccount) return null;
    const from = parseMoney(state.amount, account.currency);
    const to = parseMoney(state.toAmount, toAccount.currency);
    if (!from || !to || from <= 0 || to <= 0) return null;
    return toMajor(to, toAccount.currency) / toMajor(from, account.currency);
  })();

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Segmented<FormKind>
        label={t('transactionForm.kind')}
        value={state.kind}
        onChange={changeKind}
        options={[
          { value: 'expense', label: t('kinds.expense') },
          { value: 'income', label: t('kinds.income') },
          { value: 'transfer', label: t('kinds.transfer') },
        ]}
      />

      <Field
        label={state.kind === 'transfer' ? t('transactionForm.amountSent') : t('transactionForm.amount')}
        htmlFor={`${id}-amount`}
        error={fieldError('amount')}
      >
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
            {account?.currency}
          </span>
          <input
            id={`${id}-amount`}
            className={`${inputClass} pl-14 text-lg font-semibold tabular-nums`}
            inputMode="decimal"
            autoComplete="off"
            autoFocus={!editingId}
            placeholder="0"
            value={state.amount}
            onChange={(e) => update({ amount: e.target.value })}
            {...invalidProps('amount')}
          />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={state.kind === 'transfer' ? t('transactionForm.fromAccount') : t('transactionForm.account')}
          htmlFor={`${id}-accountId`}
          error={fieldError('accountId')}
        >
          <AccountSelect
            id={`${id}-accountId`}
            accounts={selectableAccounts}
            value={state.accountId}
            onChange={(accountId) => update({ accountId })}
            invalidProps={invalidProps('accountId')}
          />
        </Field>

        {state.kind === 'transfer' ? (
          <Field label={t('transactionForm.toAccount')} htmlFor={`${id}-toAccountId`} error={fieldError('toAccountId')}>
            <AccountSelect
              id={`${id}-toAccountId`}
              accounts={selectableAccounts.filter((a) => a.id !== state.accountId)}
              value={state.toAccountId}
              onChange={(toAccountId) => update({ toAccountId })}
              invalidProps={invalidProps('toAccountId')}
            />
          </Field>
        ) : (
          <Field label={t('transactionForm.date')} htmlFor={`${id}-date`}>
            <input
              id={`${id}-date`}
              type="date"
              required
              className={inputClass}
              value={state.date}
              onChange={(e) => update({ date: e.target.value })}
            />
          </Field>
        )}
      </div>

      {crossCurrency && toAccount && (
        <Field
          label={t('transactionForm.amountReceived', { currency: toAccount.currency })}
          htmlFor={`${id}-toAmount`}
          error={fieldError('toAmount')}
          hint={
            impliedRate !== null && account
              ? // Quote the direction that reads as a number above 1, e.g. 1 USD ≈ 32 TWD.
                impliedRate >= 1
                ? t('transactionForm.impliedRate', { from: account.currency, to: toAccount.currency, rate: fmt.rate(impliedRate) })
                : t('transactionForm.impliedRate', { from: toAccount.currency, to: account.currency, rate: fmt.rate(1 / impliedRate) })
              : undefined
          }
        >
          <input
            id={`${id}-toAmount`}
            className={`${inputClass} tabular-nums`}
            inputMode="decimal"
            autoComplete="off"
            value={state.toAmount}
            onChange={(e) => update({ toAmount: e.target.value })}
            {...invalidProps('toAmount')}
          />
        </Field>
      )}

      {state.kind === 'transfer' && (
        <Field label={t('transactionForm.date')} htmlFor={`${id}-date`}>
          <input
            id={`${id}-date`}
            type="date"
            required
            className={inputClass}
            value={state.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </Field>
      )}

      {state.kind !== 'transfer' && (
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">{t('transactionForm.category')}</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {categoryOptions.map((category) => {
              const selected = category.id === state.categoryId;
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update({ categoryId: selected ? '' : category.id })}
                  className={
                    'flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-center text-xs leading-tight ring-1 ' +
                    (selected
                      ? 'bg-indigo-50 text-indigo-800 ring-2 ring-indigo-500'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')
                  }
                >
                  <span className="text-xl" aria-hidden="true">
                    {category.icon ?? '🏷️'}
                  </span>
                  <span className="line-clamp-2">{fmt.categoryName(category)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {state.kind !== 'transfer' && (
        <Field label={t('transactionForm.payee')} htmlFor={`${id}-payee`}>
          <input
            id={`${id}-payee`}
            className={inputClass}
            autoComplete="off"
            value={state.payee}
            onChange={(e) => update({ payee: e.target.value })}
          />
        </Field>
      )}

      <Field label={t('transactionForm.note')} htmlFor={`${id}-note`}>
        <input
          id={`${id}-note`}
          className={inputClass}
          autoComplete="off"
          value={state.note}
          onChange={(e) => update({ note: e.target.value })}
        />
      </Field>

      {state.kind !== 'transfer' && (
        <div className="space-y-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300 text-indigo-600"
              checked={state.foreign}
              onChange={(e) =>
                update({
                  foreign: e.target.checked,
                  ...(e.target.checked && state.originalCurrency === account?.currency
                    ? { originalCurrency: defaultForeignCurrency(account?.currency) }
                    : {}),
                })
              }
            />
            {t('transactionForm.foreign')}
          </label>
          {state.foreign && (
            <div className="grid grid-cols-[7rem_1fr] gap-2">
              <select
                aria-label={t('transactionForm.originalCurrency')}
                className={inputClass}
                value={state.originalCurrency}
                onChange={(e) => update({ originalCurrency: e.target.value as FormState['originalCurrency'] })}
              >
                {CURRENCY_CODES.filter((code) => code !== account?.currency).map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <div>
                <input
                  id={`${id}-originalAmount`}
                  aria-label={t('transactionForm.originalAmount')}
                  className={`${inputClass} tabular-nums`}
                  inputMode="decimal"
                  autoComplete="off"
                  value={state.originalAmount}
                  onChange={(e) => update({ originalAmount: e.target.value })}
                  {...invalidProps('originalAmount')}
                />
                {errors.originalAmount && (
                  <p id={`${id}-originalAmount-error`} className="mt-1 text-sm text-rose-600">
                    {t(errors.originalAmount)}
                  </p>
                )}
              </div>
            </div>
          )}
          <p className="text-xs text-slate-500">{t('transactionForm.foreignHint')}</p>
        </div>
      )}

      <ErrorBanner message={submitError} />

      <div className="flex flex-wrap items-center gap-2 pt-2">
        {editingId &&
          (confirmingDelete ? (
            <button type="button" className={dangerButtonClass} disabled={saving} onClick={remove}>
              {t('transactionForm.confirmDelete')}
            </button>
          ) : (
            <button type="button" className={dangerButtonClass} onClick={() => setConfirmingDelete(true)}>
              {t('common.delete')}
            </button>
          ))}
        <div className="ml-auto flex gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onCancel}>
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

function AccountSelect({
  id,
  accounts,
  value,
  onChange,
  invalidProps,
}: {
  id: string;
  accounts: readonly Account[];
  value: string;
  onChange: (accountId: string) => void;
  invalidProps: object;
}) {
  const { t } = useTranslation();
  return (
    <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} {...invalidProps}>
      <option value="" disabled>
        {t('transactionForm.chooseAccount')}
      </option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name} · {account.currency}
        </option>
      ))}
    </select>
  );
}
