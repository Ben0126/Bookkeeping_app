import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTransaction, toDateKey, type LedgerDB } from '../../core';
import { addAccount, createTestDb } from '../../test/ledgerDb';
import { renderApp } from '../../test/renderApp';

let db: LedgerDB;

beforeEach(() => {
  db = createTestDb();
});

const change = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });

describe('AccountsPage', () => {
  it('creates an account with an opening balance', async () => {
    renderApp(db, '/accounts');
    fireEvent.click(await screen.findByRole('button', { name: 'Add account' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add account' });

    change(within(dialog).getByLabelText('Name'), 'Chase');
    change(within(dialog).getByLabelText('Currency'), 'USD');
    change(within(dialog).getByLabelText('Opening balance'), '1,234.5');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: /Chase.*Bank account · USD.*\$1,234\.50/ })).toBeInTheDocument();
    expect((await db.accounts.toArray())[0]).toMatchObject({ name: 'Chase', currency: 'USD', openingBalanceMinor: 123450 });
  });

  it('rejects an invalid opening balance or name', async () => {
    renderApp(db, '/accounts');
    fireEvent.click(await screen.findByRole('button', { name: 'Add account' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add account' });

    change(within(dialog).getByLabelText('Opening balance'), 'abc');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText(/Enter an amount/)).toBeInTheDocument();

    change(within(dialog).getByLabelText('Opening balance'), '0');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Enter a name of 1–100 characters.');
    expect(await db.accounts.count()).toBe(0);
  });

  it('keeps accounts with transactions: currency locked, delete refused, archive allowed', async () => {
    const card = await addAccount(db, { name: 'Visa', kind: 'credit_card', currency: 'USD' });
    await createTransaction(db, { kind: 'expense', accountId: card.id, amountMinor: 2500, date: toDateKey(new Date()) });
    renderApp(db, '/accounts');

    fireEvent.click(await screen.findByRole('button', { name: /Visa.*-\$25\.00/ }));
    let dialog = await screen.findByRole('dialog', { name: 'Edit account' });
    await waitFor(() => expect(within(dialog).getByLabelText('Currency')).toBeDisabled());

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Really delete?' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/can't be deleted/);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Archived (1)')).toBeInTheDocument();
    expect(await screen.findByText('No accounts yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Visa/ }));
    dialog = await screen.findByRole('dialog', { name: 'Edit account' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Unarchive' }));
    await waitFor(() => expect(screen.queryByText('Archived (1)')).not.toBeInTheDocument());
  });

  it('links to the account’s transactions', async () => {
    const account = await addAccount(db, { name: 'Wallet', currency: 'TWD' });
    renderApp(db, '/accounts');
    await screen.findByRole('button', { name: /Wallet/ });
    const accountLink = screen
      .getAllByRole('link', { name: 'Transactions' })
      .find((link) => link.getAttribute('href')?.includes('account='));
    fireEvent.click(accountLink!);
    await screen.findByLabelText('Filter by account');
    expect(screen.getByLabelText('Filter by account')).toHaveValue(account.id);
  });
});
