import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
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
  type CurrencyCode,
} from '../../core';
import { ErrorBanner, Field, Segmented } from '../../ui/form';
import { ModalFooter } from '../../ui/Modal';
import { MoneyInput } from '../../ui/MoneyInput';
import { writePreference } from '../../ui/preferences';
import { dangerButtonClass, inputClass, primaryButtonClass, secondaryButtonClass } from '../../ui/styles';
import { useFormat } from '../../ui/useFormat';
import {
  defaultForeignCurrency,
  FORM_FIELDS,
  formStateToInput,
  isFormDirty,
  LAST_FOREIGN_CURRENCY_PREFERENCE,
  quoteRate,
  stateForNextEntry,
  type FormErrors,
  type FormField,
  type FormKind,
  type FormState,
} from './formState';

interface TransactionFormProps {
  /** All accounts and categories, archived included (for editing old entries). */
  accounts: readonly Account[];
  categories: readonly Category[];
  initial: FormState;
  /** Currency rates are quoted in, e.g. "1 JPY ≈ 0.21 TWD". */
  baseCurrency: CurrencyCode;
  /** Record or transfer id when editing. */
  editingId?: string;
  /** `keepOpen` is true after "save and add another". */
  onSaved: (date: string, keepOpen: boolean) => void;
  onDeleted: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

export function TransactionForm({
  accounts,
  categories,
  initial,
  baseCurrency,
  editingId,
  onSaved,
  onDeleted,
  onDirtyChange,
}: TransactionFormProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const id = useId();
  const [baseline, setBaseline] = useState(initial);
  const [state, setState] = useState(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [moreOpen, setMoreOpen] = useState(initial.note !== '' || initial.foreign);
  const amountInput = useRef<HTMLInputElement>(null);

  useEffect(() => onDirtyChange(isFormDirty(state, baseline)), [state, baseline, onDirtyChange]);

  // Archived accounts and categories stay selectable only if the entry already uses them.
  const selectableAccounts = accounts.filter(
    (a) => !a.archived || a.id === initial.accountId || a.id === initial.toAccountId,
  );
  const account = accounts.find((a) => a.id === state.accountId);
  const toAccount = accounts.find((a) => a.id === state.toAccountId);
  const crossCurrency = state.kind === 'transfer' && account && toAccount && account.currency !== toAccount.currency;

  const categoryOptions = useMemo(() => {
    if (state.kind === 'transfer') return [];
    const usable = categories.filter((c) => c.kind === state.kind && (!c.archived || c.id === initial.categoryId));
    const parents = usable.filter((c) => c.parentId === undefined);
    return parents.flatMap((parent) => [parent, ...usable.filter((c) => c.parentId === parent.id)]);
  }, [categories, state.kind, initial.categoryId]);

  const update = (patch: Partial<FormState>) => {
    setState((previous) => ({ ...previous, ...patch }));
    setSavedNotice(null);
    setErrors((previous) => {
      const next = { ...previous };
      for (const key of Object.keys(patch)) delete next[key as FormField];
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

  const focusFirstError = (found: FormErrors) => {
    const field = FORM_FIELDS.find((f) => found[f]);
    if (!field) return;
    if (field === 'originalAmount') setMoreOpen(true);
    // After the render that shows the message (and opens "More" if needed).
    setTimeout(() => document.getElementById(`${id}-${field}`)?.focus(), 0);
  };

  const summarize = (entry: FormState) => {
    const title =
      entry.kind === 'transfer'
        ? t('kinds.transfer')
        : fmt.categoryName(categories.find((c) => c.id === entry.categoryId));
    const minor = account ? parseMoney(entry.amount, account.currency) : null;
    return minor && account ? `${title} ${fmt.money(minor, account.currency)}` : title;
  };

  const save = async (keepOpen: boolean) => {
    setSubmitError(null);
    setSavedNotice(null);
    const result = formStateToInput(state, accounts);
    if (result.errors) {
      setErrors(result.errors);
      focusFirstError(result.errors);
      return;
    }
    setSaving(true);
    try {
      if (editingId) await updateTransaction(db, editingId, result.input);
      else await createTransaction(db, result.input);
      if (state.foreign) writePreference(LAST_FOREIGN_CURRENCY_PREFERENCE, state.originalCurrency);
      if (keepOpen) {
        const next = stateForNextEntry(state);
        setBaseline(next);
        setState(next);
        setSavedNotice(t('transactionForm.savedNotice', { entry: summarize(state) }));
        setSaving(false);
        amountInput.current?.focus();
      }
      onSaved(result.input.date, keepOpen);
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

  const errorMessage = (field: FormField, currency?: CurrencyCode) => {
    const code = errors[field];
    return code ? fmt.formError(code, currency) : undefined;
  };
  const invalidProps = (field: FormField) =>
    errors[field] ? { 'aria-invalid': true, 'aria-describedby': `${id}-${field}-error` } : {};

  const rateHint = (() => {
    if (!crossCurrency || !account || !toAccount) return undefined;
    const from = parseMoney(state.amount, account.currency);
    const to = parseMoney(state.toAmount, toAccount.currency);
    if (!from || !to || from <= 0 || to <= 0) return undefined;
    const rate = toMajor(to, toAccount.currency) / toMajor(from, account.currency);
    const quote = quoteRate(account.currency, toAccount.currency, rate, baseCurrency);
    return t('transactionForm.impliedRate', { ...quote, rate: fmt.rate(quote.rate) });
  })();

  const dateField = (
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
  );
  const noteField = (
    <Field label={t('transactionForm.note')} htmlFor={`${id}-note`}>
      <input
        id={`${id}-note`}
        className={inputClass}
        autoComplete="off"
        value={state.note}
        onChange={(e) => update({ note: e.target.value })}
      />
    </Field>
  );

  return (
    <form
      noValidate
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void save(false);
      }}
    >
      <div className="space-y-4 pb-4">
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

        {state.kind === 'transfer' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('transactionForm.fromAccount')} htmlFor={`${id}-accountId`} error={errorMessage('accountId')}>
              <AccountSelect
                id={`${id}-accountId`}
                accounts={selectableAccounts}
                value={state.accountId}
                onChange={(accountId) => update({ accountId })}
                invalidProps={invalidProps('accountId')}
              />
            </Field>
            <Field label={t('transactionForm.toAccount')} htmlFor={`${id}-toAccountId`} error={errorMessage('toAccountId')}>
              <AccountSelect
                id={`${id}-toAccountId`}
                accounts={selectableAccounts.filter((a) => a.id !== state.accountId)}
                value={state.toAccountId}
                onChange={(toAccountId) => update({ toAccountId })}
                invalidProps={invalidProps('toAccountId')}
              />
            </Field>
          </div>
        ) : (
          <AccountPicker
            id={`${id}-accountId`}
            label={t('transactionForm.account')}
            accounts={selectableAccounts}
            value={state.accountId}
            onChange={(accountId) => update({ accountId })}
            error={errorMessage('accountId')}
          />
        )}

        <Field
          label={state.kind === 'transfer' ? t('transactionForm.amountSent') : t('transactionForm.amount')}
          htmlFor={`${id}-amount`}
          error={errorMessage('amount', account?.currency)}
        >
          <MoneyInput
            id={`${id}-amount`}
            inputRef={amountInput}
            currency={account?.currency}
            large
            autoFocus={!editingId}
            value={state.amount}
            onChange={(amount) => update({ amount })}
            invalidProps={invalidProps('amount')}
          />
        </Field>

        {crossCurrency && toAccount && (
          <Field
            label={t('transactionForm.amountReceived', { currency: toAccount.currency })}
            htmlFor={`${id}-toAmount`}
            error={errorMessage('toAmount', toAccount.currency)}
            hint={rateHint}
          >
            <MoneyInput
              id={`${id}-toAmount`}
              currency={toAccount.currency}
              value={state.toAmount}
              onChange={(toAmount) => update({ toAmount })}
              invalidProps={invalidProps('toAmount')}
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

        <div className="grid grid-cols-2 gap-3">
          {dateField}
          {state.kind === 'transfer' ? (
            noteField
          ) : (
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
        </div>

        {state.kind !== 'transfer' && (
          <details
            open={moreOpen}
            onToggle={(e) => setMoreOpen(e.currentTarget.open)}
            className="rounded-lg ring-1 ring-slate-200"
          >
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-600">
              {t('transactionForm.more')}
            </summary>
            <div className="space-y-4 border-t border-slate-200 p-3">
              {noteField}
              <div className="space-y-2">
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
                <p className="text-xs text-slate-500">
                  {t('transactionForm.foreignHint', { currency: account?.currency ?? baseCurrency })}
                </p>
                {state.foreign && (
                  <div className="grid grid-cols-[6.5rem_1fr] gap-2">
                    <select
                      aria-label={t('transactionForm.originalCurrency')}
                      className={inputClass}
                      value={state.originalCurrency}
                      onChange={(e) => update({ originalCurrency: e.target.value as CurrencyCode })}
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
                          {errorMessage('originalAmount', state.originalCurrency)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </details>
        )}
      </div>

      <ModalFooter>
        <ErrorBanner message={submitError} />
        {savedNotice && (
          <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
            {savedNotice}
          </p>
        )}
        <div className="flex items-center gap-2">
          {editingId &&
            (confirmingDelete ? (
              <button type="button" className={dangerButtonClass} disabled={saving} onClick={() => void remove()}>
                {t('transactionForm.confirmDelete')}
              </button>
            ) : (
              <button type="button" className={dangerButtonClass} onClick={() => setConfirmingDelete(true)}>
                {t('common.delete')}
              </button>
            ))}
          <div className="ml-auto flex gap-2">
            {!editingId && (
              <button type="button" className={secondaryButtonClass} disabled={saving} onClick={() => void save(true)}>
                {t('transactionForm.saveAndNext')}
              </button>
            )}
            <button type="submit" className={`${primaryButtonClass} min-w-24`} disabled={saving}>
              {t('common.save')}
            </button>
          </div>
        </div>
      </ModalFooter>
    </form>
  );
}

/** Accounts as tappable chips: one tap to switch, and the currency is always in view. */
function AccountPicker({
  id,
  label,
  accounts,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  accounts: readonly Account[];
  value: string;
  onChange: (accountId: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <p id={`${id}-label`} className="text-sm font-medium text-slate-700">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined}
        className="flex flex-wrap gap-2"
      >
        {accounts.map((account, index) => {
          const selected = account.id === value;
          return (
            <button
              key={account.id}
              id={index === 0 ? id : undefined}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(account.id)}
              className={
                'flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-1.5 text-sm ring-1 ' +
                (selected
                  ? 'bg-indigo-600 font-semibold text-white ring-indigo-600'
                  : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50')
              }
            >
              <span
                className={
                  'rounded-full px-1.5 py-0.5 text-[11px] font-bold ' +
                  (selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')
                }
              >
                {account.currency}
              </span>
              {account.name}
            </button>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
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
