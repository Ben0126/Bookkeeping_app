import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createTransaction,
  getAccountBalance,
  monthOf,
  seedDefaultCategories,
  shiftMonth,
  toDateKey,
  updateAccount,
  type Account,
  type LedgerDB,
} from '../../core';
import { addAccount, createTestDb } from '../../test/ledgerDb';
import { renderApp } from '../../test/renderApp';

let db: LedgerDB;
let chase: Account;
let taiwan: Account;
const thisMonth = monthOf(toDateKey(new Date()));

beforeEach(async () => {
  db = createTestDb();
  await seedDefaultCategories(db);
  chase = await addAccount(db, { name: 'Chase', kind: 'bank', currency: 'USD', openingBalanceMinor: 100000 });
  taiwan = await addAccount(db, { name: 'Bank of Taiwan', kind: 'bank', currency: 'TWD' });
});

const openAddDialog = async () => {
  fireEvent.click((await screen.findAllByRole('button', { name: 'Add transaction' }))[0]);
  return screen.findByRole('dialog', { name: 'Add transaction' });
};

const change = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });

const waitForDialogToClose = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

describe('TransactionsPage', () => {
  it('asks for an account first when there is none', async () => {
    const empty = createTestDb();
    renderApp(empty, '/transactions');
    fireEvent.click(await screen.findByRole('link', { name: 'Go to accounts' }));
    expect(await screen.findByRole('heading', { name: 'Accounts' })).toBeInTheDocument();
  });

  it('adds, edits and deletes an expense', async () => {
    renderApp(db, '/transactions');
    expect(await screen.findByText(/Nothing recorded this month yet/)).toBeInTheDocument();

    // Add
    const dialog = await openAddDialog();
    change(within(dialog).getByLabelText('Account'), chase.id);
    change(within(dialog).getByLabelText('Amount'), '12.50');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dining out' }));
    change(within(dialog).getByLabelText('Payee'), 'Pret');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();

    const row = await screen.findByRole('button', { name: /Dining out.*Pret · Chase.*-\$12\.50/ });
    await waitFor(async () => expect(await getAccountBalance(db, chase.id)).toBe(98750));

    // Edit
    fireEvent.click(row);
    const editDialog = await screen.findByRole('dialog', { name: 'Edit transaction' });
    const amount = await within(editDialog).findByLabelText('Amount');
    expect(amount).toHaveValue('12.50');
    change(amount, '20');
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();
    expect(await screen.findByRole('button', { name: /-\$20\.00/ })).toBeInTheDocument();
    expect(await getAccountBalance(db, chase.id)).toBe(98000);

    // Delete (two steps)
    fireEvent.click(screen.getByRole('button', { name: /-\$20\.00/ }));
    const deleteDialog = await screen.findByRole('dialog', { name: 'Edit transaction' });
    fireEvent.click(await within(deleteDialog).findByRole('button', { name: 'Delete' }));
    fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Really delete?' }));
    await waitForDialogToClose();
    expect(await screen.findByText(/Nothing recorded this month yet/)).toBeInTheDocument();
    expect(await getAccountBalance(db, chase.id)).toBe(100000);
  });

  it('shows validation errors without saving', async () => {
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText(/Enter an amount above 0/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Amount')).toHaveAttribute('aria-invalid', 'true');
    expect(await db.transactions.count()).toBe(0);
  });

  it('records a cross-currency transfer with the amount received', async () => {
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Transfer' }));
    change(within(dialog).getByLabelText('From account'), chase.id);
    change(within(dialog).getByLabelText('Amount sent'), '100');
    change(within(dialog).getByLabelText('To account'), taiwan.id);
    change(within(dialog).getByLabelText('Amount received (TWD)'), '3,200');
    expect(within(dialog).getByText('≈ 1 USD = 32 TWD')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();

    expect(await screen.findByRole('button', { name: /Transfer.*Chase → Bank of Taiwan.*\$100\.00.*→ NT\$3,200/ })).toBeInTheDocument();
    expect(await getAccountBalance(db, chase.id)).toBe(90000);
    expect(await getAccountBalance(db, taiwan.id)).toBe(3200);
  });

  it('shows a transfer from the filtered account’s side', async () => {
    await createTransaction(db, {
      kind: 'transfer', fromAccountId: chase.id, toAccountId: taiwan.id,
      amountMinor: 10000, toAmountMinor: 3200, date: `${thisMonth}-01`,
    });
    renderApp(db, `/transactions?account=${taiwan.id}`);
    expect(await screen.findByRole('button', { name: /Chase → Bank of Taiwan.*\+NT\$3,200/ })).toBeInTheDocument();
  });

  it('filters by search text and type', async () => {
    await createTransaction(db, { kind: 'expense', accountId: chase.id, amountMinor: 500, date: `${thisMonth}-01`, payee: 'Costco' });
    await createTransaction(db, { kind: 'income', accountId: chase.id, amountMinor: 900, date: `${thisMonth}-02`, note: 'Refund' });
    renderApp(db, '/transactions');
    await screen.findByRole('button', { name: /Costco/ });

    change(screen.getByPlaceholderText('Search payee or note'), 'cost');
    await waitFor(() => expect(screen.queryByRole('button', { name: /Refund/ })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Costco/ })).toBeInTheDocument();

    change(screen.getByPlaceholderText('Search payee or note'), '');
    change(screen.getByLabelText('Filter by type'), 'income');
    await waitFor(() => expect(screen.queryByRole('button', { name: /Costco/ })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Refund/ })).toBeInTheDocument();
  });

  it('quotes the implied rate in its readable direction', async () => {
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Transfer' }));
    change(within(dialog).getByLabelText('From account'), taiwan.id);
    change(within(dialog).getByLabelText('To account'), chase.id);
    change(within(dialog).getByLabelText('Amount sent'), '32000');
    change(within(dialog).getByLabelText('Amount received (USD)'), '1000');
    expect(within(dialog).getByText('≈ 1 USD = 32 TWD')).toBeInTheDocument();
  });

  it('moves between months and totals each currency', async () => {
    const lastMonth = shiftMonth(thisMonth, -1);
    await createTransaction(db, { kind: 'expense', accountId: chase.id, amountMinor: 1250, date: `${lastMonth}-15` });
    await createTransaction(db, { kind: 'expense', accountId: taiwan.id, amountMinor: 300, date: `${lastMonth}-16` });
    renderApp(db, '/transactions');
    await screen.findByText(/Nothing recorded this month yet/);

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    const spent = (await screen.findByText('Spent this month')).parentElement!;
    await waitFor(() => expect(within(spent).getByText('$12.50')).toBeInTheDocument());
    expect(within(spent).getByText('NT$300')).toBeInTheDocument();
    // Currencies with nothing to report are left out rather than shown as zero.
    expect(within((await screen.findByText('Received this month')).parentElement!).getByText('—')).toBeInTheDocument();
  });

  it('jumps to the month of a transaction saved in another month', async () => {
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    change(within(dialog).getByLabelText('Account'), chase.id);
    change(within(dialog).getByLabelText('Amount'), '5');
    const lastMonth = shiftMonth(thisMonth, -1);
    change(within(dialog).getByLabelText('Date'), `${lastMonth}-10`);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();
    expect(await screen.findByRole('button', { name: /-\$5\.00/ })).toBeInTheDocument();
  });

  it('does not offer archived accounts for new transactions', async () => {
    await updateAccount(db, taiwan.id, { archived: true });
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    const options = within(within(dialog).getByLabelText('Account')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Choose an account', 'Chase · USD']);
  });
});
