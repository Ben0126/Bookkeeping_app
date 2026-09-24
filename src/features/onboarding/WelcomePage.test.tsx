import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getSettings, listAccounts, seedDefaultCategories, type LedgerDB } from '../../core';
import { addAccount, createTestDb } from '../../test/ledgerDb';
import { renderApp } from '../../test/renderApp';

let db: LedgerDB;

beforeEach(async () => {
  db = createTestDb();
  await seedDefaultCategories(db);
});

const change = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

/** From the first screen to the accounts step, studying in Japan with a Taiwanese bank. */
async function toAccountsStep() {
  renderApp(db, '/transactions');
  fireEvent.click(await screen.findByRole('button', { name: 'Get started (about a minute)' }));
  expect(await screen.findByRole('heading', { name: 'Where are you studying?' })).toBeInTheDocument();
  change(screen.getByLabelText('Local currency'), 'JPY');
  change(screen.getByLabelText('Home currency'), 'TWD');
  click('Next');
  expect(await screen.findByRole('heading', { name: 'Which accounts do you use?' })).toBeInTheDocument();
}

describe('first launch', () => {
  it('sets up currencies and the first accounts, then starts on the transactions', async () => {
    await toAccountsStep();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    const cash = screen.getByRole('region', { name: 'Cash' });
    expect(within(cash).getByRole('checkbox')).toBeChecked();
    expect(within(screen.getByRole('region', { name: 'Local bank account' })).getByRole('checkbox')).not.toBeChecked();
    change(within(cash).getByLabelText('Current balance'), '20,000');
    const card = screen.getByRole('region', { name: 'Credit card from Taiwan' });
    expect(within(card).getByLabelText('Foreign fee')).toHaveValue('1.5');
    change(within(card).getByLabelText('Amount owed'), '3,000');
    click('Next');

    expect(await screen.findByRole('heading', { name: 'Your data stays on this phone' })).toBeInTheDocument();
    expect(await db.accounts.count()).toBe(0); // nothing saved before the end
    click('Done, start tracking');

    expect(await screen.findByText(/Nothing recorded this month yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New here? Read the guide' })).toBeInTheDocument();
    expect((await listAccounts(db)).map(({ name, kind, currency, openingBalanceMinor, foreignFeeBps }) => ({
      name, kind, currency, openingBalanceMinor, foreignFeeBps,
    }))).toEqual([
      { name: 'Cash', kind: 'cash', currency: 'JPY', openingBalanceMinor: 20000, foreignFeeBps: undefined },
      { name: 'Bank account in Taiwan', kind: 'bank', currency: 'TWD', openingBalanceMinor: 0, foreignFeeBps: undefined },
      { name: 'Credit card from Taiwan', kind: 'credit_card', currency: 'TWD', openingBalanceMinor: -3000, foreignFeeBps: 150 },
    ]);
    expect((await getSettings(db)).baseCurrency).toBe('TWD');
  });

  it('can show totals in the local currency', async () => {
    renderApp(db, '/welcome?step=currencies');
    change(await screen.findByLabelText('Local currency'), 'GBP');
    change(screen.getByLabelText('Home currency'), 'TWD');
    fireEvent.click(screen.getByRole('radio', { name: /^GBP/ }));
    click('Next');
    await screen.findByRole('heading', { name: 'Which accounts do you use?' });
    click('Next');
    fireEvent.click(await screen.findByRole('button', { name: 'Done, start tracking' }));
    await screen.findByText(/Nothing recorded this month yet/);
    expect((await getSettings(db)).baseCurrency).toBe('GBP');
  });

  it('checks the accounts and keeps edits when going back', async () => {
    await toAccountsStep();
    const cash = screen.getByRole('region', { name: 'Cash' });
    change(within(cash).getByLabelText('Name'), ' ');
    click('Next');
    expect(await within(cash).findByText('Enter a name')).toBeInTheDocument();
    await waitFor(() => expect(within(cash).getByLabelText('Name')).toHaveFocus());

    change(within(cash).getByLabelText('Name'), 'Wallet');
    click('Back');
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
    expect(within(await screen.findByRole('region', { name: 'Cash' })).getByLabelText('Name')).toHaveValue('Wallet');

    for (const checkbox of screen.getAllByRole('checkbox')) {
      if ((checkbox as HTMLInputElement).checked) fireEvent.click(checkbox);
    }
    expect(screen.getByText('Choose at least one account.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('offers to restore a backup instead', async () => {
    renderApp(db, '/transactions');
    fireEvent.click(await screen.findByRole('link', { name: 'Restore a backup' }));
    expect(await screen.findByRole('button', { name: 'Choose backup file' })).toBeInTheDocument();
  });

  it('can be skipped', async () => {
    renderApp(db, '/welcome');
    fireEvent.click(await screen.findByRole('link', { name: 'Skip' }));
    expect(await screen.findByRole('heading', { name: 'Accounts' })).toBeInTheDocument();
  });

  it('is left behind once there are accounts', async () => {
    await addAccount(db, { name: 'Chase' });
    renderApp(db, '/welcome');
    expect(await screen.findByText(/Nothing recorded this month yet/)).toBeInTheDocument();
  });
});

describe('guide', () => {
  it('opens from the header and explains everyday situations', async () => {
    await addAccount(db, { name: 'Chase' });
    renderApp(db, '/transactions');
    fireEvent.click(await screen.findByRole('link', { name: 'Guide' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Guide' })).toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Using your home card abroad' });
    expect(within(card).getByText(/Enter statement amount/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('region', { name: 'Backups and new phones' })).getByRole('link', { name: /Go to Settings/ }));
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('is linked from the welcome screen', async () => {
    renderApp(db, '/welcome');
    fireEvent.click(await screen.findByRole('link', { name: 'Read the guide first' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Guide' })).toBeInTheDocument();
  });
});
