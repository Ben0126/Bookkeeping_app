import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  const dialog = await screen.findByRole('dialog', { name: 'Add transaction' });
  // The form appears once recent entries are loaded to pick the default account.
  await within(dialog).findByLabelText('Amount');
  return dialog;
};

/** happy-dom has no window.confirm; the app uses it to guard unsaved input. */
function stubConfirm(answer: boolean) {
  const confirm = vi.fn(() => answer);
  Object.defineProperty(window, 'confirm', { value: confirm, configurable: true, writable: true });
  return confirm;
}

const change = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as unknown as Record<string, unknown>).confirm;
});

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
    fireEvent.click(within(dialog).getByRole('radio', { name: /Chase/ }));
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
    within(dialog).getByLabelText('Payee').focus();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Enter an amount')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Amount')).toHaveAttribute('aria-invalid', 'true');
    // The field with the problem gets focus, scrolling it into view.
    await waitFor(() => expect(within(dialog).getByLabelText('Amount')).toHaveFocus());
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
    fireEvent.click(within(dialog).getByRole('radio', { name: /Chase/ }));
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
    const choices = within(within(dialog).getByRole('radiogroup', { name: 'Account' })).getAllByRole('radio');
    expect(choices.map((c) => c.textContent)).toEqual(['USDChase']);
  });
});

describe('quick entry', () => {
  it('saves and starts the next entry on the same account without closing', async () => {
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Chase/ }));
    change(within(dialog).getByLabelText('Amount'), '4.50');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dining out' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save & add another' }));

    expect(await within(dialog).findByText('Saved: Dining out $4.50. Go ahead with the next one.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Amount')).toHaveValue('');
    expect(within(dialog).getByLabelText('Amount')).toHaveFocus();
    expect(within(dialog).getByRole('radio', { name: /Chase/ })).toHaveAttribute('aria-checked', 'true');
    expect(within(dialog).getByRole('button', { name: 'Dining out' })).toHaveAttribute('aria-pressed', 'false');

    change(within(dialog).getByLabelText('Amount'), '2');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();
    expect(await db.transactions.count()).toBe(2);
  });

  it('starts on the account used most for spending lately', async () => {
    for (const amountMinor of [100, 200, 300]) {
      await createTransaction(db, { kind: 'expense', accountId: chase.id, amountMinor, date: `${thisMonth}-01` });
    }
    // The latest entry is a one-off from the home bank; it should not become the default.
    await createTransaction(db, { kind: 'expense', accountId: taiwan.id, amountMinor: 399, date: `${thisMonth}-02` });
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    expect(await within(dialog).findByRole('radio', { name: /Chase/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('asks before throwing away typed input', async () => {
    const confirm = stubConfirm(false);
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    change(within(dialog).getByLabelText('Amount'), '12');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    confirm.mockReturnValue(true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitForDialogToClose();
    expect(await db.transactions.count()).toBe(0);
  });

  it('closes an untouched form without asking', async () => {
    const confirm = stubConfirm(true);
    renderApp(db, '/transactions');
    await openAddDialog();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitForDialogToClose();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('explains amounts with too many decimals for the currency', async () => {
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Bank of Taiwan/ }));
    change(within(dialog).getByLabelText('Amount'), '12.5');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('TWD amounts have no decimals')).toBeInTheDocument();
  });

  it('quotes yen in the base currency', async () => {
    const yen = await addAccount(db, { name: 'Cash', currency: 'JPY' });
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Transfer' }));
    change(within(dialog).getByLabelText('From account'), taiwan.id);
    change(within(dialog).getByLabelText('To account'), yen.id);
    change(within(dialog).getByLabelText('Amount sent'), '21500');
    change(within(dialog).getByLabelText('Amount received (JPY)'), '100000');
    expect(within(dialog).getByText('≈ 1 JPY = 0.215 TWD')).toBeInTheDocument();
  });
});
