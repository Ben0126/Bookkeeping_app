import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLedgerDb } from '../../app/ledgerContext';
import { oldestChangeSince } from '../../core';
import { useToast } from '../../ui/toastContext';
import { useFormat } from '../../ui/useFormat';
import { readLastBackupAt, readSnoozedUntil, shouldRemindBackup, SNOOZE_MS, writeSnoozedUntil } from './backupFile';
import { useBackupSaver } from './useBackupSaver';

/** Nudges toward a backup once changes have gone a week without one, and makes it in one tap. */
export function BackupReminder() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const toast = useToast();
  const [lastBackupAt, setLastBackupAt] = useState(readLastBackupAt);
  const [snoozedUntil, setSnoozedUntil] = useState(readSnoozedUntil);
  const [now] = useState(Date.now);
  const [failed, setFailed] = useState(false);
  const oldestUnbackedAt = useLiveQuery(() => oldestChangeSince(db, lastBackupAt), [db, lastBackupAt]);
  const showing = shouldRemindBackup({ oldestUnbackedAt, snoozedUntil, now });
  // The backup is only read while the reminder is up.
  const { ready, counts, shareSupported, save } = useBackupSaver({ enabled: showing });

  if (!showing) return null;

  const snooze = () => {
    const until = Date.now() + SNOOZE_MS;
    writeSnoozedUntil(until);
    setSnoozedUntil(until);
  };

  const backUp = async () => {
    setFailed(false);
    try {
      const time = await save('auto');
      if (time === undefined) return;
      setLastBackupAt(time);
      if (counts) {
        const summary = t('backup.counts', { accounts: counts.accounts, transactions: counts.transactions });
        toast({ message: t('backupReminder.done', { counts: summary }) });
      }
    } catch (cause) {
      console.error('Could not save the backup', cause);
      setFailed(true);
    }
  };

  return (
    <div role="status" className="space-y-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <div className="space-y-1">
        <p>
          {lastBackupAt === undefined
            ? t('backupReminder.never')
            : t('backupReminder.stale', { when: fmt.daysAgo(lastBackupAt) })}
        </p>
        <p className="text-xs text-amber-800">{t(shareSupported ? 'backupReminder.shareHint' : 'backupReminder.downloadHint')}</p>
      </div>
      {failed && (
        <p role="alert" className="text-rose-700">
          {t('backupReminder.failed')}{' '}
          <Link to="/settings" className="font-semibold underline">
            {t('backupReminder.openSettings')}
          </Link>
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={snooze} className="rounded-lg px-3 py-2 font-medium text-amber-800 hover:bg-amber-100">
          {t('backupReminder.later')}
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => void backUp()}
          className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
        >
          {t('backupReminder.backUp')}
        </button>
      </div>
    </div>
  );
}
