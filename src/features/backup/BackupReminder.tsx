import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLedgerDb } from '../../app/ledgerContext';
import { oldestChangeSince } from '../../core';
import { useFormat } from '../../ui/useFormat';
import { readLastBackupAt, readSnoozedUntil, shouldRemindBackup, SNOOZE_MS, writeSnoozedUntil } from './backupFile';

/** Nudges toward a backup once changes have gone a week without one. */
export function BackupReminder() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const [lastBackupAt] = useState(readLastBackupAt);
  const [snoozedUntil, setSnoozedUntil] = useState(readSnoozedUntil);
  const [now] = useState(Date.now);
  const oldestUnbackedAt = useLiveQuery(() => oldestChangeSince(db, lastBackupAt), [db, lastBackupAt]);

  if (!shouldRemindBackup({ oldestUnbackedAt, snoozedUntil, now })) return null;

  const snooze = () => {
    const until = Date.now() + SNOOZE_MS;
    writeSnoozedUntil(until);
    setSnoozedUntil(until);
  };

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200 sm:flex-row sm:items-center"
    >
      <p className="flex-1">
        {lastBackupAt === undefined
          ? t('backupReminder.never')
          : t('backupReminder.stale', { when: fmt.daysAgo(lastBackupAt) })}
      </p>
      <div className="flex shrink-0 justify-end gap-2">
        <button type="button" onClick={snooze} className="rounded-lg px-3 py-1.5 font-medium text-amber-800 hover:bg-amber-100">
          {t('backupReminder.later')}
        </button>
        <Link to="/settings" className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-500">
          {t('backupReminder.backUp')}
        </Link>
      </div>
    </div>
  );
}
