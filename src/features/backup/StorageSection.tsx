import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { secondaryButtonClass } from '../../ui/styles';

type Status = 'checking' | 'persisted' | 'not-persisted' | 'denied';

/**
 * Asks the browser to keep this app's storage instead of clearing it when
 * space runs low. Hidden where the Storage API is unavailable.
 */
export function StorageSection() {
  const { t } = useTranslation();
  const [supported] = useState(() => typeof navigator.storage?.persisted === 'function');
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    if (!supported) return;
    let active = true;
    navigator.storage.persisted().then(
      (persisted) => active && setStatus(persisted ? 'persisted' : 'not-persisted'),
      () => active && setStatus('not-persisted'),
    );
    return () => {
      active = false;
    };
  }, [supported]);

  if (!supported) return null;

  const request = async () => {
    const granted = await navigator.storage.persist().catch(() => false);
    setStatus(granted ? 'persisted' : 'denied');
  };

  return (
    <section aria-labelledby="storage-title" className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <h2 id="storage-title" className="font-semibold">
        {t('storage.title')}
      </h2>
      {status === 'persisted' && <p className="text-sm text-emerald-700">✓ {t('storage.persisted')}</p>}
      {(status === 'not-persisted' || status === 'denied') && (
        <>
          <p className="text-sm text-slate-600">{status === 'denied' ? t('storage.denied') : t('storage.notPersisted')}</p>
          <button type="button" className={secondaryButtonClass} onClick={() => void request()}>
            {t('storage.request')}
          </button>
        </>
      )}
      <p className="text-xs text-slate-500">{t('storage.iosTip')}</p>
    </section>
  );
}
