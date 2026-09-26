import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  deleteRecurringRule,
  listAccounts,
  listCategories,
  listRecurringRules,
  recurringDate,
  shiftMonth,
  toMoneyInput,
  updateRecurringRule,
  type Account,
  type RecurringRule,
} from '../../core';
import { ErrorBanner, Field } from '../../ui/form';
import { MoneyInput } from '../../ui/MoneyInput';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '../../ui/styles';
import { checkAmount } from '../transactions/formState';
import { useFormat } from '../../ui/useFormat';
import { RuleSummary } from './RuleSummary';

/** Lists monthly entries; deleting one stops future entries and keeps recorded ones. */
export function RecurringSection() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const data = useLiveQuery(
    async () => ({
      rules: await listRecurringRules(db),
      accounts: await listAccounts(db, { includeArchived: true }),
      categories: await listCategories(db, { includeArchived: true }),
    }),
    [db],
  );
  const [confirming, setConfirming] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setError(null);
    try {
      await deleteRecurringRule(db, id);
      setConfirming(null);
    } catch (cause) {
      setError(fmt.error(cause));
    }
  };

  return (
    <section aria-labelledby="recurring-title" className="space-y-3 rounded-xl bg-surface p-4 ring-1 ring-slate-200">
      <h2 id="recurring-title" className="font-semibold">
        {t('recurring.title')}
      </h2>
      <p className="text-sm text-slate-600">{t('recurring.intro')}</p>
      {data && data.rules.length === 0 && <p className="text-sm text-slate-500">{t('recurring.empty')}</p>}
      {data && data.rules.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {data.rules.map((rule) => {
            const account = data.accounts.find((a) => a.id === rule.template.accountId);
            const category = data.categories.find((c) => c.id === rule.template.categoryId);
            const next = rule.lastMonth === undefined ? rule.startMonth : shiftMonth(rule.lastMonth, 1);
            const name = fmt.categoryName(category);
            return (
              <li key={rule.id} className="space-y-2 py-3">
                {editing === rule.id && account ? (
                  <RuleEditor rule={rule} account={account} name={name} onDone={() => setEditing(null)} />
                ) : (
                  <>
                    <RuleSummary
                      rule={rule}
                      account={account}
                      category={category}
                      details={t('recurring.schedule', { day: rule.dayOfMonth })}
                    />
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500">
                        {t('recurring.next', { date: fmt.day(recurringDate(rule.dayOfMonth, next)) })}
                      </p>
                      <div className="ml-auto flex gap-2">
                        {confirming === rule.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setConfirming(null)}
                              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={() => void remove(rule.id)}
                              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-rose-600 dark:text-rose-400 ring-1 ring-rose-200 hover:bg-rose-50"
                            >
                              {t('recurring.confirmStop', { name })}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditing(rule.id)}
                              className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                              aria-label={t('recurring.editLabel', { name })}
                            >
                              {t('recurring.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirming(rule.id)}
                              className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50"
                              aria-label={t('recurring.stopLabel', { name })}
                            >
                              {t('recurring.stop')}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ErrorBanner message={error} />
    </section>
  );
}

/** Changes what a rule records from now on, e.g. after a subscription price rise. */
function RuleEditor({
  rule,
  account,
  name,
  onDone,
}: {
  rule: RecurringRule;
  account: Account;
  name: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const id = useId();
  const [amount, setAmount] = useState(() => toMoneyInput(rule.template.amountMinor, account.currency));
  const [day, setDay] = useState(rule.dayOfMonth);
  const [payee, setPayee] = useState(rule.template.payee ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const checked = checkAmount(amount, account.currency);
    if ('error' in checked) {
      setError(fmt.formError(checked.error, account.currency));
      return;
    }
    try {
      await updateRecurringRule(db, rule.id, { amountMinor: checked.minor, dayOfMonth: day, payee });
      onDone();
    } catch (cause) {
      setError(fmt.error(cause));
    }
  };

  return (
    <form
      aria-label={t('recurring.editLabel', { name })}
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <p className="font-medium">{name}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('transactionForm.amount')} htmlFor={`${id}-amount`}>
          <MoneyInput id={`${id}-amount`} currency={account.currency} value={amount} onChange={setAmount} invalidProps={{}} />
        </Field>
        <Field label={t('recurring.day')} htmlFor={`${id}-day`}>
          <select id={`${id}-day`} className={inputClass} value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: 31 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {t('recurring.schedule', { day: value })}
              </option>
            ))}
          </select>
        </Field>
        <div className="col-span-2">
          <Field label={t('transactionForm.payee')} htmlFor={`${id}-payee`}>
            <input id={`${id}-payee`} className={inputClass} value={payee} onChange={(e) => setPayee(e.target.value)} />
          </Field>
        </div>
      </div>
      <p className="text-xs text-slate-500">{t('recurring.editHint')}</p>
      <ErrorBanner message={error} />
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} onClick={onDone}>
          {t('common.cancel')}
        </button>
        <button type="submit" className={primaryButtonClass}>
          {t('common.save')}
        </button>
      </div>
    </form>
  );
}
