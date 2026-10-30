import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useLedgerDb } from '../../app/ledgerContext';
import { getSettings, resetLedger } from '../../core';
import { writeLastBackupAt } from '../backup/backupFile';

/** While the sample data is loaded: says so on every page, and clears it to start for real. */
export function DemoBanner() {
  const { t } = useTranslation();
  const db = useLedgerDb();
  const navigate = useNavigate();
  const demo = useLiveQuery(async () => (await getSettings(db)).demo === true, [db]);
  const [clearing, setClearing] = useState(false);
  if (!demo) return null;

  const startForReal = async () => {
    if (!window.confirm(t('demo.exitConfirm'))) return;
    setClearing(true);
    await resetLedger(db);
    // A backup of the sample doesn't protect anything real.
    writeLastBackupAt(undefined);
    navigate('/welcome', { replace: true });
    setClearing(false);
  };

  return (
    <div role="status" className="mb-4 space-y-2 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900 ring-1 ring-indigo-200">
      <p>{t('demo.banner')}</p>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={clearing}
          onClick={() => void startForReal()}
          className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {t('demo.exit')}
        </button>
      </div>
    </div>
  );
}
