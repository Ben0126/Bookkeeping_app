import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  createRateResolver,
  DEFAULT_SETTINGS,
  getSettings,
  getTransactionInput,
  listExchangeRates,
  listTransactions,
  toDateKey,
  type Account,
  type Category,
  type TransactionInput,
} from '../../core';
import { Modal } from '../../ui/Modal';
import { useDiscardGuard } from '../../ui/useDiscardGuard';
import { emptyFormState, formStateFromInput, suggestAccountId, withPaymentCurrency } from './formState';
import { readPaymentCurrency } from './paymentCurrency';
import { TransactionForm } from './TransactionForm';

/** How far back "the account you use most" looks. */
const RECENT_DAYS = 30;
/** How far back frequent entries and payee suggestions look. */
const HISTORY_DAYS = 90;
const DAY_MS = 86_400_000;

interface TransactionDialogProps {
  /** Omitted to create a new entry. */
  editingId?: string;
  accounts: readonly Account[];
  categories: readonly Category[];
  /** The account the list is filtered to, preselected for new entries. */
  filterAccountId?: string;
  /** Called with the date of the last entry saved, if any. */
  onClose: (lastSavedDate?: string) => void;
}

export function TransactionDialog({ editingId, accounts, categories, filterAccountId, onClose }: TransactionDialogProps) {
  const { t } = useTranslation();
  const db = useLedgerDb();
  const { setDirty, confirmDiscard } = useDiscardGuard(t('transactionForm.discardConfirm'));
  const lastSavedDate = useRef<string | undefined>(undefined);
  const settings = useLiveQuery(() => getSettings(db), [db]);
  const storedRates = useLiveQuery(() => listExchangeRates(db), [db]);
  const rates = useMemo(() => storedRates && createRateResolver(storedRates), [storedRates]);
  const [today] = useState(() => toDateKey(new Date()));
  const history = useLiveQuery(
    () => (editingId ? [] : listTransactions(db, { from: toDateKey(new Date(Date.now() - HISTORY_DAYS * DAY_MS)) })),
    [db, editingId],
  );
  const [edited, setEdited] = useState<TransactionInput | null | undefined>(undefined);

  useEffect(() => {
    if (!editingId) return;
    let active = true;
    getTransactionInput(db, editingId).then(
      (value) => active && setEdited(value),
      () => active && setEdited(null),
    );
    return () => {
      active = false;
    };
  }, [db, editingId]);

  const requestClose = () => {
    if (confirmDiscard()) onClose(lastSavedDate.current);
  };

  const initial = (() => {
    if (editingId) return edited ? formStateFromInput(edited, accounts) : undefined;
    if (!history) return undefined;
    const since = toDateKey(new Date(Date.now() - RECENT_DAYS * DAY_MS));
    const recent = history.filter((t) => t.date >= since);
    const accountId = suggestAccountId({ kind: 'expense', accounts, recent, filterAccountId });
    const account = accounts.find((a) => a.id === accountId);
    const empty = emptyFormState({ date: today, accountId });
    if (!account) return empty;
    // Start in the currency this account last paid in, e.g. yen on a Taiwanese card in Japan.
    const currency = readPaymentCurrency(account.id) ?? account.currency;
    return { ...empty, ...withPaymentCurrency(empty, currency, account.currency) };
  })();

  return (
    <Modal title={editingId ? t('transactions.edit') : t('transactions.add')} onClose={requestClose}>
      {editingId && edited === null ? (
        <p className="pb-6 text-sm text-slate-600">{t('transactions.notFound')}</p>
      ) : (
        initial &&
        settings &&
        rates && (
          <TransactionForm
            accounts={accounts}
            categories={categories}
            initial={initial}
            baseCurrency={settings.baseCurrency ?? DEFAULT_SETTINGS.baseCurrency}
            rates={rates}
            history={history}
            editingId={editingId}
            onDirtyChange={setDirty}
            onSaved={(date, keepOpen) => {
              lastSavedDate.current = date;
              if (!keepOpen) onClose(date);
            }}
            onDeleted={() => onClose()}
          />
        )
      )}
    </Modal>
  );
}
