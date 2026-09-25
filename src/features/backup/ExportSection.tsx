import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLedgerDb } from '../../app/ledgerContext';
import { canShareFiles, downloadFile, shareFile } from '../../ui/files';
import { ErrorBanner } from '../../ui/form';
import { secondaryButtonClass } from '../../ui/styles';
import { useFormat } from '../../ui/useFormat';
import { toCsvFile, transactionsToCsv, type CsvLabels } from './csv';

const CSV_COLUMNS = [
  'date',
  'type',
  'account',
  'currency',
  'amount',
  'fee',
  'category',
  'payee',
  'note',
  'otherAccount',
  'originalCurrency',
  'originalAmount',
] as const;

/** Every transaction as a spreadsheet file. Not a backup: it cannot be restored. */
export function ExportSection() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  // Kept ready ahead of time: sharing must start straight from the click, with no await before it.
  const data = useLiveQuery(
    async () => ({
      transactions: await db.transactions.toArray(),
      accounts: await db.accounts.toArray(),
      categories: await db.categories.toArray(),
    }),
    [db],
  );
  const [shareSupported] = useState(() => canShareFiles('test.csv', 'text/csv'));
  const [error, setError] = useState<string | null>(null);
  const empty = data !== undefined && data.transactions.length === 0;

  const save = async (method: 'download' | 'share') => {
    if (!data) return;
    setError(null);
    const labels: CsvLabels = {
      headers: CSV_COLUMNS.map((column) => t(`csvExport.columns.${column}`)),
      kind: (kind) => t(`kinds.${kind}`),
      categoryName: fmt.categoryName,
    };
    const file = toCsvFile(transactionsToCsv(data.transactions, data.accounts, data.categories, labels), new Date());
    try {
      if (method === 'share') await shareFile(file);
      else downloadFile(file);
    } catch (cause) {
      console.error('Could not save the CSV file', cause);
      setError(t('csvExport.saveFailed'));
    }
  };

  return (
    <section aria-labelledby="csv-export-title" className="space-y-3 rounded-xl bg-surface p-4 ring-1 ring-slate-200">
      <h2 id="csv-export-title" className="font-semibold">
        {t('csvExport.title')}
      </h2>
      <p className="text-sm text-slate-600">{t('csvExport.intro')}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryButtonClass} disabled={!data || empty} onClick={() => void save('download')}>
          {t('csvExport.download')}
        </button>
        {shareSupported && (
          <button type="button" className={secondaryButtonClass} disabled={!data || empty} onClick={() => void save('share')}>
            {t('csvExport.share')}
          </button>
        )}
      </div>
      {empty && <p className="text-xs text-slate-500">{t('csvExport.empty')}</p>}
      <ErrorBanner message={error} />
    </section>
  );
}
