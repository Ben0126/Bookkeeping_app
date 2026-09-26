import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLedgerDb } from '../../app/ledgerContext';
import { CURRENCY_CODES, deleteBudget, setBudget, toMoneyInput, type Budget, type CurrencyCode } from '../../core';
import { ErrorBanner, Field } from '../../ui/form';
import { ModalFooter } from '../../ui/Modal';
import { MoneyInput } from '../../ui/MoneyInput';
import { dangerButtonClass, inputClass, primaryButtonClass } from '../../ui/styles';
import { useFormat } from '../../ui/useFormat';
import { checkAmount, type FormErrorCode } from '../transactions/formState';

/** Sets the one overall monthly budget, in whatever currency the student thinks in. */
export function BudgetForm({
  budget,
  defaultCurrency,
  onDone,
  onDirtyChange,
}: {
  budget?: Budget;
  defaultCurrency: CurrencyCode;
  onDone: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const id = useId();
  const [initial] = useState(() => ({
    currency: budget?.currency ?? defaultCurrency,
    amount: budget ? toMoneyInput(budget.amountMinor, budget.currency) : '',
  }));
  const [currency, setCurrency] = useState<CurrencyCode>(initial.currency);
  const [amount, setAmount] = useState(initial.amount);
  const [amountError, setAmountError] = useState<FormErrorCode>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(
    () => onDirtyChange(currency !== initial.currency || amount !== initial.amount),
    [currency, amount, initial, onDirtyChange],
  );

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    setSaving(true);
    try {
      await action();
      onDone();
    } catch (cause) {
      setError(fmt.error(cause));
      setSaving(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const checked = checkAmount(amount, currency);
    if ('error' in checked) {
      setAmountError(checked.error);
      document.getElementById(`${id}-amount`)?.focus();
      return;
    }
    void run(() => setBudget(db, { amountMinor: checked.minor, currency }));
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-4 pb-4">
        <Field label={t('budgetForm.currency')} htmlFor={`${id}-currency`}>
          <select
            id={`${id}-currency`}
            className={inputClass}
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          >
            {CURRENCY_CODES.map((code) => (
              <option key={code} value={code}>
                {code} · {fmt.currencyName(code)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={t('budgetForm.amount')}
          htmlFor={`${id}-amount`}
          hint={t('budgetForm.hint')}
          error={amountError && fmt.formError(amountError, currency)}
        >
          <MoneyInput
            id={`${id}-amount`}
            currency={currency}
            large
            autoFocus={!budget}
            value={amount}
            onChange={(value) => {
              setAmount(value);
              setAmountError(undefined);
            }}
            invalidProps={amountError ? { 'aria-invalid': true } : {}}
          />
        </Field>
      </div>
      <ModalFooter>
        <ErrorBanner message={error} />
        <div className="flex items-center gap-2">
          {budget && (
            <button type="button" className={dangerButtonClass} disabled={saving} onClick={() => void run(() => deleteBudget(db, budget.id))}>
              {t('budgetForm.remove')}
            </button>
          )}
          <button type="submit" className={`${primaryButtonClass} ml-auto min-w-24`} disabled={saving}>
            {t('common.save')}
          </button>
        </div>
      </ModalFooter>
    </form>
  );
}
