import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { LedgerProvider } from './app/LedgerProvider';
import { ledgerDb } from './core';
import { RateUpdater } from './features/rates/RateUpdater';
import './i18n';
import './index.css';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LedgerProvider db={ledgerDb}>
      <RateUpdater />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LedgerProvider>
  </StrictMode>,
);
