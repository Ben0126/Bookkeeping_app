import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../i18n';
import { Segmented } from '../../ui/form';
import { readLastBackupAt } from '../backup/backupFile';
import { BackupSection } from '../backup/BackupSection';
import { ExportSection } from '../backup/ExportSection';
import { RestoreSection } from '../backup/RestoreSection';
import { StorageSection } from '../backup/StorageSection';
import { RecurringSection } from '../recurring/RecurringSection';
import { BaseCurrencySection } from './BaseCurrencySection';
import { CategorySection } from './CategorySection';

const LANGUAGE_NAMES: Record<(typeof LANGUAGES)[number], string> = {
  'zh-TW': '繁體中文',
  'en-US': 'English',
};

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [lastBackupAt, setLastBackupAt] = useState(readLastBackupAt);
  const language = LANGUAGES.find((lng) => lng === i18n.resolvedLanguage) ?? 'en-US';

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">{t('settings.title')}</h1>
      <BackupSection lastBackupAt={lastBackupAt} onBackedUp={setLastBackupAt} />
      <RestoreSection lastBackupAt={lastBackupAt} onLastBackupChange={setLastBackupAt} />
      <BaseCurrencySection />
      <RecurringSection />
      <CategorySection />
      <ExportSection />
      <StorageSection />
      <section aria-labelledby="language-title" className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <h2 id="language-title" className="font-semibold">
          {t('settings.language')}
        </h2>
        <Segmented
          label={t('settings.language')}
          value={language}
          onChange={(lng) => void i18n.changeLanguage(lng)}
          options={LANGUAGES.map((lng) => ({ value: lng, label: LANGUAGE_NAMES[lng] }))}
        />
      </section>
    </div>
  );
}
