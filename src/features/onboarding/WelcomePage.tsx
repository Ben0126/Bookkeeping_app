import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useLedgerDb } from '../../app/ledgerContext';
import { CURRENCY_CODES, getSettings, type CurrencyCode } from '../../core';
import { LANGUAGE_NAMES, LANGUAGES } from '../../i18n';
import { ErrorBanner, Field, Segmented } from '../../ui/form';
import { guessLocalCurrency } from '../../ui/localCurrency';
import { MoneyInput } from '../../ui/MoneyInput';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '../../ui/styles';
import { useFormat } from '../../ui/useFormat';
import { completeSetup, draftsToAccounts, suggestAccounts, type AccountDraft, type DraftError, type SuggestionId } from './setup';

const STEPS = ['intro', 'currencies', 'accounts', 'safety'] as const;
type Step = (typeof STEPS)[number];

const FEATURES = [
  { id: 'currencies', icon: '🌏' },
  { id: 'card', icon: '💳' },
  { id: 'budget', icon: '📊' },
  { id: 'private', icon: '🔒' },
] as const;

/**
 * First launch: what the app does, then the currencies and the first
 * accounts, then how the data is kept. Nothing is saved until the end.
 */
export function WelcomePage() {
  const { t, i18n } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const id = useId();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const step: Step = STEPS.find((s) => s === params.get('step')) ?? 'intro';
  const accountCount = useLiveQuery(() => db.accounts.count(), [db]);
  const settings = useLiveQuery(() => getSettings(db), [db]);

  const [local, setLocal] = useState<CurrencyCode>(() => guessLocalCurrency() ?? 'USD');
  const [home, setHome] = useState<CurrencyCode>();
  const [totalsIn, setTotalsIn] = useState<'home' | 'local'>('home');
  const [drafts, setDrafts] = useState<{ key: string; list: AccountDraft[] }>();
  const [draftErrors, setDraftErrors] = useState<Partial<Record<SuggestionId, DraftError>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (accountCount === undefined || !settings) return null;
  // Already set up, e.g. restored from a backup or finished just now.
  if (accountCount > 0) return <Navigate to="/transactions" replace />;

  const homeCurrency = home ?? settings.baseCurrency;
  const baseCurrency = totalsIn === 'local' ? local : homeCurrency;
  const language = LANGUAGES.find((lng) => lng === i18n.resolvedLanguage) ?? 'en-US';
  const goTo = (next: Step) => setParams(next === 'intro' ? {} : { step: next });

  const suggestionName = (suggestion: SuggestionId) =>
    t(`welcome.accounts.${suggestion}`, {
      context: local === homeCurrency ? 'same' : homeCurrency === 'TWD' ? 'taiwan' : undefined,
    });

  const toAccounts = () => {
    // Suggestions follow the currencies; edits survive going back and forth unless those change.
    const key = `${local}:${homeCurrency}`;
    if (drafts?.key !== key) {
      setDrafts({ key, list: suggestAccounts({ local, home: homeCurrency, name: suggestionName }) });
      setDraftErrors({});
    }
    goTo('accounts');
  };

  const updateDraft = (suggestion: SuggestionId, patch: Partial<AccountDraft>) => {
    setDrafts((previous) =>
      previous && { ...previous, list: previous.list.map((d) => (d.id === suggestion ? { ...d, ...patch } : d)) },
    );
    setDraftErrors((previous) => {
      const next = { ...previous };
      delete next[suggestion];
      return next;
    });
  };

  const list = drafts?.list ?? [];
  const noneSelected = !list.some((d) => d.selected);

  const toSafety = () => {
    const result = draftsToAccounts(list);
    if (result.errors) {
      setDraftErrors(result.errors);
      const first = list.find((d) => result.errors[d.id]);
      if (first) setTimeout(() => document.getElementById(`${id}-${first.id}-${result.errors[first.id]}`)?.focus(), 0);
      return;
    }
    goTo('safety');
  };

  const finish = async () => {
    const result = draftsToAccounts(list);
    if (result.errors) return goTo('accounts');
    setSaving(true);
    setSaveError(null);
    // Ask the browser to keep the data rather than clear it under storage pressure.
    void navigator.storage?.persist?.().catch(() => false);
    try {
      await completeSetup(db, { baseCurrency, accounts: result.accounts });
      navigate('/transactions', { replace: true });
    } catch (error) {
      setSaveError(fmt.error(error));
      setSaving(false);
    }
  };

  const stepNumber = STEPS.indexOf(step);

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-4">
        <header className="flex items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-2 font-semibold">
            <img src="/favicon.png" alt="" className="size-7 rounded-md" />
            <span>StudyBudget</span>
          </div>
          {step === 'intro' ? (
            <div className="w-44">
              <Segmented
                label={t('settings.language')}
                value={language}
                onChange={(lng) => void i18n.changeLanguage(lng)}
                options={LANGUAGES.map((lng) => ({ value: lng, label: LANGUAGE_NAMES[lng] }))}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t('welcome.stepOf', { step: stepNumber, total: STEPS.length - 1 })}</p>
          )}
        </header>

        <main className="flex-1 space-y-5 pb-6">
          {step === 'intro' && (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">{t('welcome.title')}</h1>
                <p className="text-slate-600">{t('welcome.subtitle')}</p>
              </div>
              <ul className="space-y-3">
                {FEATURES.map((feature) => (
                  <li key={feature.id} className="flex gap-3 rounded-xl bg-surface p-3 ring-1 ring-slate-200">
                    <span className="text-2xl" aria-hidden="true">
                      {feature.icon}
                    </span>
                    <div>
                      <p className="font-semibold">{t(`welcome.features.${feature.id}.title`)}</p>
                      <p className="text-sm text-slate-600">{t(`welcome.features.${feature.id}.body`)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-slate-600">
                <Link to="/guide" className="font-medium text-indigo-700 hover:underline">
                  {t('welcome.readGuide')}
                </Link>
              </p>
            </>
          )}

          {step === 'currencies' && (
            <>
              <StepTitle title={t('welcome.currencies.title')} intro={t('welcome.currencies.intro')} />
              <Field label={t('welcome.currencies.local')} htmlFor={`${id}-local`} hint={t('welcome.currencies.localHint')}>
                <CurrencySelect id={`${id}-local`} value={local} onChange={setLocal} />
              </Field>
              <Field label={t('welcome.currencies.home')} htmlFor={`${id}-home`} hint={t('welcome.currencies.homeHint')}>
                <CurrencySelect id={`${id}-home`} value={homeCurrency} onChange={setHome} />
              </Field>
              {local !== homeCurrency && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700">{t('welcome.currencies.totals')}</p>
                  <Segmented
                    label={t('welcome.currencies.totals')}
                    value={totalsIn}
                    onChange={setTotalsIn}
                    options={[
                      { value: 'home', label: `${homeCurrency} · ${fmt.currencyName(homeCurrency)}` },
                      { value: 'local', label: `${local} · ${fmt.currencyName(local)}` },
                    ]}
                  />
                  <p className="text-xs text-slate-500">{t('welcome.currencies.totalsHint')}</p>
                </div>
              )}
            </>
          )}

          {step === 'accounts' && (
            <>
              <StepTitle title={t('welcome.accounts.title')} intro={t('welcome.accounts.intro')} />
              <div className="space-y-3">
                {list.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    id={`${id}-${draft.id}`}
                    title={suggestionName(draft.id)}
                    draft={draft}
                    error={draftErrors[draft.id]}
                    onChange={(patch) => updateDraft(draft.id, patch)}
                  />
                ))}
              </div>
              {noneSelected && <p className="text-sm text-amber-700">{t('welcome.accounts.chooseOne')}</p>}
            </>
          )}

          {step === 'safety' && (
            <>
              <StepTitle title={t('welcome.safety.title')} intro={t('welcome.safety.intro')} />
              <ul className="space-y-3">
                {(['private', 'backup', 'install'] as const).map((point, index) => (
                  <li key={point} className="flex gap-3 rounded-xl bg-surface p-3 ring-1 ring-slate-200">
                    <span className="text-2xl" aria-hidden="true">
                      {['🔒', '💾', '📲'][index]}
                    </span>
                    <div>
                      <p className="font-semibold">{t(`welcome.safety.${point}.title`)}</p>
                      <p className="text-sm text-slate-600">{t(`welcome.safety.${point}.body`)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <ErrorBanner message={saveError} />
            </>
          )}
        </main>

        <footer className="sticky bottom-0 -mx-4 space-y-2 border-t border-slate-200 bg-slate-50/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          {step === 'intro' ? (
            <>
              <button type="button" className={`${primaryButtonClass} w-full`} onClick={() => goTo('currencies')}>
                {t('welcome.start')}
              </button>
              <div className="flex gap-2">
                <Link to="/settings#restore" className={`${secondaryButtonClass} flex-1`}>
                  {t('welcome.restore')}
                </Link>
                <Link to="/accounts" className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  {t('welcome.skip')}
                </Link>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={saving}
                onClick={() => goTo(STEPS[stepNumber - 1])}
              >
                {t('welcome.back')}
              </button>
              {step === 'currencies' && (
                <button type="button" className={`${primaryButtonClass} flex-1`} onClick={toAccounts}>
                  {t('welcome.next')}
                </button>
              )}
              {step === 'accounts' && (
                <button type="button" className={`${primaryButtonClass} flex-1`} disabled={noneSelected} onClick={toSafety}>
                  {t('welcome.next')}
                </button>
              )}
              {step === 'safety' && (
                <button type="button" className={`${primaryButtonClass} flex-1`} disabled={saving} onClick={() => void finish()}>
                  {t('welcome.finish')}
                </button>
              )}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

function StepTitle({ title, intro }: { title: string; intro: ReactNode }) {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-slate-600">{intro}</p>
    </div>
  );
}

function CurrencySelect({ id, value, onChange }: { id: string; value: CurrencyCode; onChange: (c: CurrencyCode) => void }) {
  const fmt = useFormat();
  return (
    <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value as CurrencyCode)}>
      {CURRENCY_CODES.map((code) => (
        <option key={code} value={code}>
          {code} · {fmt.currencyName(code)}
        </option>
      ))}
    </select>
  );
}

/** One suggested account: tick it, and optionally rename it and give its balance. */
function DraftCard({
  id,
  title,
  draft,
  error,
  onChange,
}: {
  id: string;
  title: string;
  draft: AccountDraft;
  error: DraftError | undefined;
  onChange: (patch: Partial<AccountDraft>) => void;
}) {
  const { t } = useTranslation();
  const card = draft.kind === 'credit_card';
  const invalid = (field: DraftError) =>
    error === field ? { 'aria-invalid': true, 'aria-describedby': `${id}-${field}-error` } : {};
  return (
    <section aria-label={title} className="rounded-xl bg-surface p-3 ring-1 ring-slate-200">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="size-5 rounded border-slate-300 text-indigo-600"
          checked={draft.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
        />
        <span className="flex-1 font-medium">{title}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{draft.currency}</span>
      </label>
      {draft.selected && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field
              label={t('accounts.name')}
              htmlFor={`${id}-name`}
              error={error === 'name' ? t('welcome.accounts.nameRequired') : undefined}
            >
              <input
                id={`${id}-name`}
                className={inputClass}
                autoComplete="off"
                value={draft.name}
                onChange={(e) => onChange({ name: e.target.value })}
                {...invalid('name')}
              />
            </Field>
          </div>
          <div className={card ? '' : 'col-span-2'}>
            <Field
              label={card ? t('accounts.amountOwed') : t('accounts.currentBalance')}
              htmlFor={`${id}-balance`}
              error={error === 'balance' ? t('transactionForm.errors.amountInvalid') : undefined}
            >
              <MoneyInput
                id={`${id}-balance`}
                currency={draft.currency}
                value={draft.balance}
                onChange={(balance) => onChange({ balance })}
                invalidProps={invalid('balance')}
              />
            </Field>
          </div>
          {card && (
            <Field
              label={t('welcome.accounts.feeRate')}
              htmlFor={`${id}-feeRate`}
              error={error === 'feeRate' ? t('accounts.foreignFeeInvalid') : undefined}
            >
              <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-surface shadow-xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30">
                <input
                  id={`${id}-feeRate`}
                  className="min-w-0 flex-1 px-3 py-2 text-base tabular-nums outline-none placeholder:text-slate-300"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={draft.feeRate}
                  onChange={(e) => onChange({ feeRate: e.target.value })}
                  {...invalid('feeRate')}
                />
                <span className="flex shrink-0 items-center bg-slate-100 px-3 text-sm font-bold text-slate-600">%</span>
              </div>
            </Field>
          )}
        </div>
      )}
      {draft.selected && card && <p className="mt-2 text-xs text-slate-500">{t('welcome.accounts.feeHint')}</p>}
    </section>
  );
}
