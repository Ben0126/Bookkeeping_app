import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useLedgerDb } from '../../app/ledgerContext';
import { readTheme, setTheme, THEMES, type Theme } from '../../ui/theme';
import { LANGUAGE_NAMES, LANGUAGES } from '../../i18n';
import { Segmented } from '../../ui/form';
import { ChevronLeftIcon, ChevronRightIcon } from '../../ui/icons';
import { readLastBackupAt } from '../backup/backupFile';
import { BackupSection } from '../backup/BackupSection';
import { ExportSection } from '../backup/ExportSection';
import { RestoreSection } from '../backup/RestoreSection';
import { StorageSection } from '../backup/StorageSection';
import { RecurringSection } from '../recurring/RecurringSection';
import { BaseCurrencySection } from './BaseCurrencySection';
import { CategorySection } from './CategorySection';

/** Settings with long lists get their own page, keeping the main one short. */
export function CategoriesPage() {
  return (
    <SubPage>
      <CategorySection />
    </SubPage>
  );
}

export function RecurringPage() {
  return (
    <SubPage>
      <RecurringSection />
    </SubPage>
  );
}

function SubPage({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <Link to="/settings" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
        <ChevronLeftIcon className="size-4" />
        {t('settings.title')}
      </Link>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [lastBackupAt, setLastBackupAt] = useState(readLastBackupAt);
  const language = LANGUAGES.find((lng) => lng === i18n.resolvedLanguage) ?? 'en-US';
  const { hash } = useLocation();
  const db = useLedgerDb();
  const [theme, setThemeChoice] = useState<Theme>(readTheme);
  const counts = useLiveQuery(
    async () => ({
      categories: await db.categories.filter((c) => !c.archived).count(),
      recurring: await db.recurring.count(),
    }),
    [db],
  );

  // "Restore from a backup" on the welcome screen links here.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView?.();
  }, [hash]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">{t('settings.title')}</h1>
      <BackupSection lastBackupAt={lastBackupAt} onBackedUp={setLastBackupAt} />
      <RestoreSection lastBackupAt={lastBackupAt} onLastBackupChange={setLastBackupAt} />
      <BaseCurrencySection />
      <nav aria-label={t('settings.ledger')} className="overflow-hidden rounded-xl bg-surface ring-1 ring-slate-200">
        <ul className="divide-y divide-slate-100">
          <SettingsLink
            to="/settings/categories"
            title={t('categorySettings.title')}
            detail={counts && t('settings.categoriesDetail', { count: counts.categories })}
          />
          <SettingsLink
            to="/settings/recurring"
            title={t('recurring.title')}
            detail={counts && t('settings.recurringDetail', { count: counts.recurring })}
          />
        </ul>
      </nav>
      <ExportSection />
      <StorageSection />
      <section aria-labelledby="appearance-title" className="space-y-3 rounded-xl bg-surface p-4 ring-1 ring-slate-200">
        <h2 id="appearance-title" className="font-semibold">
          {t('settings.appearance')}
        </h2>
        <Segmented
          label={t('settings.appearance')}
          value={theme}
          onChange={(next) => {
            setTheme(next);
            setThemeChoice(next);
          }}
          options={THEMES.map((value) => ({ value, label: t(`settings.themes.${value}`) }))}
        />
      </section>
      <section aria-labelledby="language-title" className="space-y-3 rounded-xl bg-surface p-4 ring-1 ring-slate-200">
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
      <section aria-labelledby="help-title" className="space-y-2 rounded-xl bg-surface p-4 ring-1 ring-slate-200">
        <h2 id="help-title" className="font-semibold">
          {t('guide.title')}
        </h2>
        <p className="text-sm text-slate-600">{t('guide.settingsHint')}</p>
        <Link to="/guide" className="inline-block text-sm font-medium text-indigo-700 hover:underline">
          {t('guide.open')} →
        </Link>
      </section>
    </div>
  );
}

function SettingsLink({ to, title, detail }: { to: string; title: string; detail?: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-100">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          {detail && <span className="block text-sm text-slate-500">{detail}</span>}
        </span>
        <ChevronRightIcon className="size-5 text-slate-400" />
      </Link>
    </li>
  );
}
