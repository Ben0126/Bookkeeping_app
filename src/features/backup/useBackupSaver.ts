import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useLedgerDb } from '../../app/ledgerContext';
import { countBackup, exportBackup } from '../../core';
import { canShareFiles, downloadFile, shareFile } from '../../ui/files';
import { toBackupFile, writeLastBackupAt } from './backupFile';

/** How a backup leaves the device: the share sheet (phones), a download, or whichever the device has. */
export type SaveMethod = 'share' | 'download' | 'auto';

/**
 * Keeps a backup ready and saves it in one tap. It is prepared ahead of time
 * because the share sheet must open straight from the click, with no await
 * before it. Pass `enabled: false` to skip reading the data while not needed.
 */
export function useBackupSaver({ enabled = true }: { enabled?: boolean } = {}) {
  const db = useLedgerDb();
  const backup = useLiveQuery(() => (enabled ? exportBackup(db) : undefined), [db, enabled]);
  const [shareSupported] = useState(() => canShareFiles());

  /** Resolves with the backup time, or undefined if the share sheet was closed; throws if saving failed. */
  const save = async (method: SaveMethod): Promise<number | undefined> => {
    if (!backup) return undefined;
    const now = new Date();
    const file = toBackupFile(backup, now);
    if (method === 'share' || (method === 'auto' && shareSupported)) {
      if ((await shareFile(file)) === 'cancelled') return undefined;
    } else {
      downloadFile(file);
    }
    writeLastBackupAt(now.getTime());
    return now.getTime();
  };

  return { ready: backup !== undefined, counts: backup ? countBackup(backup.data) : undefined, shareSupported, save };
}
