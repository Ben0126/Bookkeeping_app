import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useLedgerDb } from '../../app/ledgerContext';
import { getSettings } from '../../core';
import { refreshRates } from './rateSource';

/**
 * Keeps exchange rates fresh in the background: on launch, when the app comes
 * back to the foreground, when the connection returns, and when the main
 * currency changes. Failures are silent; the overview offers a retry.
 */
export function RateUpdater() {
  const db = useLedgerDb();
  const base = useLiveQuery(async () => (await getSettings(db)).baseCurrency, [db]);

  useEffect(() => {
    if (!base) return;
    const update = () => {
      if (navigator.onLine === false) return;
      refreshRates(db, base).catch((error: unknown) => console.warn('Exchange rates not updated', error));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') update();
    };
    update();
    window.addEventListener('online', update);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', update);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [db, base]);

  return null;
}
