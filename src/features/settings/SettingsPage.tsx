import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readLastBackupAt } from '../backup/backupFile';
import { BackupSection } from '../backup/BackupSection';
import { RestoreSection } from '../backup/RestoreSection';
import { StorageSection } from '../backup/StorageSection';

export function SettingsPage() {
  const { t } = useTranslation();
  const [lastBackupAt, setLastBackupAt] = useState(readLastBackupAt);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">{t('settings.title')}</h1>
      <BackupSection lastBackupAt={lastBackupAt} onBackedUp={setLastBackupAt} />
      <RestoreSection lastBackupAt={lastBackupAt} onLastBackupChange={setLastBackupAt} />
      <StorageSection />
    </div>
  );
}
