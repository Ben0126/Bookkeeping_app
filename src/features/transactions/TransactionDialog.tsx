import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  DEFAULT_SETTINGS,
  getSettings,
  getTransactionInput,
  isCurrencyCode,
  listTransactions,
  toDateKey,
  type Account,
  type Category,
  type TransactionInput,
} from '../../core';
import { Modal } from '../../ui/Modal';
import { readPreference } from '../../ui/preferences';
import { useDiscardGuard } from '../../ui/useDiscardGuard';
import {
  defaultForeignCurrency,
  emptyFormState,
  formStateFromInput,
  LAST_FOREIGN_CURRENCY_PREFERENCE,
  suggestAccountId,
} from './formState';
import { TransactionForm } from './TransactionForm';

/** How far back "the account you use most" looks. */
const RECENT_DAYS = 30;

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
  const [today] = useState(() => toDateKey(new Date()));
  const recent = useLiveQuery(
    () => (editingId ? [] : listTransactions(db, { from: toDateKey(new Date(Date.now() - RECENT_DAYS * 86_400_000)) })),
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

  const remembered = readPreference(LAST_FOREIGN_CURRENCY_PREFERENCE);
  const rememberedForeign = isCurrencyCode(remembered) ? remembered : undefined;

  const initial = (() => {
    if (editingId) return edited ? formStateFromInput(edited, accounts, rememberedForeign) : undefined;
    if (!recent) return undefined;
    const accountId = suggestAccountId({ kind: 'expense', accounts, recent, filterAccountId });
    const currency = accounts.find((a) => a.id === accountId)?.currency;
    return emptyFormState({ date: today, accountId, originalCurrency: defaultForeignCurrency(currency, rememberedForeign) });
  })();

  return (
    <Modal title={editingId ? t('transactions.edit') : t('transactions.add')} onClose={requestClose}>
      {editingId && edited === null ? (
        <p className="pb-6 text-sm text-slate-600">{t('transactions.notFound')}</p>
      ) : (
        initial &&
        settings && (
          <TransactionForm
            accounts={accounts}
            categories={categories}
            initial={initial}
            baseCurrency={settings.baseCurrency ?? DEFAULT_SETTINGS.baseCurrency}
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
