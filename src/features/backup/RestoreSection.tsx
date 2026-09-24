import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  countBackup,
  exportBackup,
  importBackup,
  LedgerError,
  readBackup,
  type Backup,
  type BackupCounts,
} from '../../core';
import { ErrorBanner } from '../../ui/form';
import { secondaryButtonClass } from '../../ui/styles';
import { useFormat } from '../../ui/useFormat';
import { MAX_BACKUP_BYTES, writeLastBackupAt } from './backupFile';

type RestoreState =
  | { step: 'idle'; notice?: string }
  | { step: 'preview'; backup: Backup; fileName: string }
  | { step: 'busy' }
  | { step: 'restored'; counts: BackupCounts; snapshot: Backup; previousLastBackupAt: number | undefined }
  | { step: 'failed'; message: string; detail?: string };

interface RestoreSectionProps {
  lastBackupAt: number | undefined;
  onLastBackupChange: (time: number | undefined) => void;
}

export function RestoreSection({ lastBackupAt, onLastBackupChange }: RestoreSectionProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<RestoreState>({ step: 'idle' });
  const current = useLiveQuery(async () => countBackup((await exportBackup(db)).data), [db]);

  const setLastBackupAt = (time: number | undefined) => {
    writeLastBackupAt(time);
    onLastBackupChange(time);
  };

  const fail = (error: unknown) => {
    setState({
      step: 'failed',
      message: fmt.error(error),
      // The path of the bad field helps when someone edited the file by hand.
      ...(error instanceof LedgerError && error.code === 'INVALID_BACKUP' && { detail: error.message }),
    });
  };

  const choose = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setState({ step: 'failed', message: t('restore.tooLarge') });
      return;
    }
    try {
      setState({ step: 'preview', backup: readBackup(await file.text()), fileName: file.name });
    } catch (error) {
      fail(error);
    }
  };

  const restore = async (backup: Backup) => {
    setState({ step: 'busy' });
    try {
      // Kept in memory so the restore can be undone if it was the wrong file.
      const snapshot = await exportBackup(db);
      await importBackup(db, backup);
      const exportedAt = Date.parse(backup.exportedAt);
      const previousLastBackupAt = lastBackupAt;
      // The restored data is exactly what the file holds, so it counts as backed up.
      setLastBackupAt(Number.isFinite(exportedAt) ? exportedAt : Date.now());
      setState({ step: 'restored', counts: countBackup(backup.data), snapshot, previousLastBackupAt });
    } catch (error) {
      fail(error);
    }
  };

  const undo = async (snapshot: Backup, previousLastBackupAt: number | undefined) => {
    setState({ step: 'busy' });
    try {
      await importBackup(db, snapshot);
      setLastBackupAt(previousLastBackupAt);
      setState({ step: 'idle', notice: t('restore.undone') });
    } catch (error) {
      fail(error);
    }
  };

  const countsText = (counts: BackupCounts) =>
    t('backup.counts', { accounts: counts.accounts, transactions: counts.transactions });

  return (
    <section aria-labelledby="restore-title" className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <h2 id="restore-title" className="font-semibold">
        {t('restore.title')}
      </h2>
      <p className="text-sm text-slate-600">{t('restore.intro')}</p>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-label={t('restore.choose')}
        onChange={(e) => void choose(e.target.files?.[0])}
      />

      {state.step === 'preview' ? (
        <div className="space-y-3">
          <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
            <p className="font-medium break-all text-slate-900">{state.fileName}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-slate-500">{t('restore.backupTime')}</dt>
              <dd>
                {Number.isFinite(Date.parse(state.backup.exportedAt))
                  ? fmt.dateTime(Date.parse(state.backup.exportedAt))
                  : '—'}
              </dd>
              <dt className="text-slate-500">{t('restore.contents')}</dt>
              <dd>{countsText(countBackup(state.backup.data))}</dd>
            </dl>
          </div>
          <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            {t('restore.replaceWarning', { counts: current ? countsText(current) : '…' })}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={secondaryButtonClass} onClick={() => setState({ step: 'idle' })}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-rose-500"
              onClick={() => void restore(state.backup)}
            >
              {t('restore.confirm')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={state.step === 'busy'}
          onClick={() => fileInput.current?.click()}
        >
          {state.step === 'busy' ? t('restore.working') : t('restore.choose')}
        </button>
      )}

      {state.step === 'restored' && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200"
        >
          <p className="flex-1">{t('restore.done', { counts: countsText(state.counts) })}</p>
          <button
            type="button"
            className="font-semibold text-emerald-800 underline underline-offset-2"
            onClick={() => void undo(state.snapshot, state.previousLastBackupAt)}
          >
            {t('restore.undo')}
          </button>
        </div>
      )}
      {state.step === 'idle' && state.notice && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
          {state.notice}
        </p>
      )}
      {state.step === 'failed' && (
        <div className="space-y-1">
          <ErrorBanner message={state.message} />
          {state.detail && <p className="text-xs break-all text-slate-500">{state.detail}</p>}
        </div>
      )}
    </section>
  );
}
