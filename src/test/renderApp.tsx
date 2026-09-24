import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { LedgerProvider } from '../app/LedgerProvider';
import type { LedgerDB } from '../core';

/** Renders the whole app at `path` against a test database. */
export function renderApp(db: LedgerDB, path: string) {
  return render(
    <LedgerProvider db={db}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </LedgerProvider>,
  );
}
