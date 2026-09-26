import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';
import { ChartIcon, HelpIcon, ListIcon, PlusIcon, SettingsIcon, WalletIcon } from '../ui/icons';
import { ToastProvider } from '../ui/ToastProvider';
import { useOpenNewEntry } from './useOpenNewEntry';

const NAV_ITEMS = [
  { to: '/transactions', labelKey: 'nav.transactions', icon: <ListIcon /> },
  { to: '/overview', labelKey: 'nav.overview', icon: <ChartIcon /> },
  { to: '/accounts', labelKey: 'nav.accounts', icon: <WalletIcon /> },
  { to: '/settings', labelKey: 'nav.settings', icon: <SettingsIcon /> },
] as const;

export function Layout() {
  const { t } = useTranslation();
  const openNewEntry = useOpenNewEntry();
  const [first, second, ...rest] = NAV_ITEMS;

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-6 px-4">
          <div className="flex items-center gap-2 font-semibold">
            <img src="/favicon.png" alt="" className="size-7 rounded-md" />
            <span>StudyBudget</span>
          </div>
          <nav aria-label={t('nav.label')} className="hidden h-full gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  'flex items-center gap-2 border-b-2 px-3 text-sm font-medium ' +
                  (isActive ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-600 hover:text-slate-900')
                }
              >
                {item.icon}
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
          <NavLink
            to="/guide"
            aria-label={t('nav.guide')}
            title={t('nav.guide')}
            className={({ isActive }) =>
              'ml-auto rounded-full p-2 hover:bg-slate-100 ' + (isActive ? 'text-indigo-700' : 'text-slate-500')
            }
          >
            <HelpIcon className="size-6" />
          </NavLink>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4 pb-40 md:pb-12">
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </main>

      <nav
        aria-label={t('nav.label')}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {[first, second].map((item) => (
            <BottomNavLink key={item.to} to={item.to} icon={item.icon} label={t(item.labelKey)} />
          ))}
          {/* In the bar rather than floating, so it never covers an amount in the list. */}
          <div className="flex items-start justify-center">
            <button
              type="button"
              onClick={openNewEntry}
              aria-label={t('transactions.add')}
              className="-mt-4 flex size-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg ring-4 ring-surface hover:bg-indigo-500"
            >
              <PlusIcon className="size-7" />
            </button>
          </div>
          {rest.map((item) => (
            <BottomNavLink key={item.to} to={item.to} icon={item.icon} label={t(item.labelKey)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function BottomNavLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        'flex flex-col items-center gap-0.5 py-2 text-xs font-medium ' +
        (isActive ? 'text-indigo-700' : 'text-slate-500')
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
