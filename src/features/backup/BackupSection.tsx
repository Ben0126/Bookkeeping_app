import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBanner } from '../../ui/form';
import { primaryButtonClass, secondaryButtonClass } from '../../ui/styles';
import { useFormat } from '../../ui/useFormat';
import { useBackupSaver } from './useBackupSaver';

interface BackupSectionProps {
  lastBackupAt: number | undefined;
  onBackedUp: (time: number) => void;
}

export function BackupSection({ lastBackupAt, onBackedUp }: BackupSectionProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { ready, counts, shareSupported, save: saveBackup } = useBackupSaver();
  const [error, setError] = useState<string | null>(null);

  const save = async (method: 'download' | 'share') => {
    setError(null);
    try {
      const time = await saveBackup(method);
      if (time !== undefined) onBackedUp(time);
    } catch (cause) {
      console.error('Could not save the backup', cause);
      setError(t('backup.saveFailed'));
    }
  };

  return (
    <section aria-labelledby="backup-title" className="space-y-3 rounded-xl bg-surface p-4 ring-1 ring-slate-200">
      <h2 id="backup-title" className="font-semibold">
        {t('backup.title')}
      </h2>
      <p className="text-sm text-slate-600">{t('backup.intro')}</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-500">{t('backup.lastBackup')}</dt>
        <dd className={lastBackupAt === undefined ? 'font-medium text-amber-700' : 'text-slate-900'}>
          {lastBackupAt === undefined
            ? t('backup.never')
            : t('backup.lastBackupValue', { date: fmt.dateTime(lastBackupAt), relative: fmt.daysAgo(lastBackupAt) })}
        </dd>
        <dt className="text-slate-500">{t('backup.currentData')}</dt>
        <dd className="text-slate-900">{counts ? t('backup.counts', { accounts: counts.accounts, transactions: counts.transactions }) : '…'}</dd>
      </dl>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButtonClass} disabled={!ready} onClick={() => void save('download')}>
          {t('backup.download')}
        </button>
        {shareSupported && (
          <button type="button" className={secondaryButtonClass} disabled={!ready} onClick={() => void save('share')}>
            {t('backup.share')}
          </button>
        )}
      </div>
      {shareSupported && <p className="text-xs text-slate-500">{t('backup.shareHint')}</p>}
      <ErrorBanner message={error} />
    </section>
  );
}
