import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAccount,
  createRecurringRule,
  createTransaction,
  getAccountBalance,
  setExchangeRate,
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
  it('asks for an active account when every account is archived', async () => {
    await updateAccount(db, chase.id, { archived: true });
    await updateAccount(db, taiwan.id, { archived: true });
    renderApp(db, '/transactions');
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

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    change(screen.getByPlaceholderText('Search payee, note or category'), 'cost');
    await waitFor(() => expect(screen.queryByRole('button', { name: /Refund/ })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Costco/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText('Search payee, note or category')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    change(screen.getByLabelText('Filter by type'), 'income');
    await waitFor(() => expect(screen.queryByRole('button', { name: /Costco/ })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Refund/ })).toBeInTheDocument();

    // The active filter stays visible as a chip that clears it.
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.click(screen.getByRole('button', { name: /Type: Income/ }));
    expect(await screen.findByRole('button', { name: /Costco/ })).toBeInTheDocument();
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

describe('refunds and fees', () => {
  it('records money back as a refund that lowers spending in its category', async () => {
    await createTransaction(db, {
      kind: 'expense', accountId: chase.id, amountMinor: 6000, date: `${thisMonth}-01`, categoryId: 'default-dining', payee: 'Dishoom',
    });
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Refund' }));
    expect(within(dialog).getByText(/reduces spending in the category/)).toBeInTheDocument();
    // Refunds go back to expense categories.
    expect(within(dialog).queryByRole('button', { name: 'Salary' })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Chase/ }));
    change(within(dialog).getByLabelText('Amount'), '40');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dining out' }));
    change(within(dialog).getByLabelText('Payee'), 'Amy & Joe');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();

    const row = await screen.findByRole('button', { name: /Dining out\s*Refund.*Amy & Joe · Chase.*\+\$40\.00/ });
    const spent = (await screen.findByText('Spent this month')).parentElement!;
    await waitFor(() => expect(within(spent).getByText('$20.00')).toBeInTheDocument());
    expect(within((await screen.findByText('Received this month')).parentElement!).getByText('—')).toBeInTheDocument();
    expect(await getAccountBalance(db, chase.id)).toBe(98000);

    // It opens as a refund again.
    fireEvent.click(row);
    const editDialog = await screen.findByRole('dialog', { name: 'Edit transaction' });
    expect(await within(editDialog).findByRole('radio', { name: 'Refund' })).toHaveAttribute('aria-checked', 'true');
  });

  it('saves a transfer fee as its own expense', async () => {
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Transfer' }));
    change(within(dialog).getByLabelText('From account'), chase.id);
    change(within(dialog).getByLabelText('Amount sent'), '100');
    change(within(dialog).getByLabelText('To account'), taiwan.id);
    change(within(dialog).getByLabelText('Amount received (TWD)'), '3,200');
    change(within(dialog).getByLabelText('Fee (optional)'), '5');
    expect(within(dialog).getByText('Chase is charged $105.00 in all; the fee is saved as its own expense.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();

    expect(await screen.findByRole('button', { name: /Fees.*Chase.*-\$5\.00/ })).toBeInTheDocument();
    expect(await getAccountBalance(db, chase.id)).toBe(89500);
    expect(await getAccountBalance(db, taiwan.id)).toBe(3200);
  });

  it('checks the fee like any amount', async () => {
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Transfer' }));
    change(within(dialog).getByLabelText('From account'), taiwan.id);
    change(within(dialog).getByLabelText('To account'), chase.id);
    change(within(dialog).getByLabelText('Amount sent'), '32000');
    change(within(dialog).getByLabelText('Amount received (USD)'), '1000');
    change(within(dialog).getByLabelText('Fee (optional)'), '0.5');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('TWD amounts have no decimals')).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByLabelText('Fee (optional)')).toHaveFocus());
    expect(await db.transactions.count()).toBe(0);
  });
});

describe('searching', () => {
  it('searches every month and matches category names', async () => {
    const lastYear = shiftMonth(thisMonth, -12);
    await createTransaction(db, { kind: 'expense', accountId: chase.id, amountMinor: 8000, date: `${lastYear}-03`, payee: 'Dentist' });
    await createTransaction(db, { kind: 'expense', accountId: chase.id, amountMinor: 120000, date: `${thisMonth}-01`, categoryId: 'default-rent' });
    await createTransaction(db, { kind: 'expense', accountId: chase.id, amountMinor: 300, date: `${thisMonth}-01`, payee: 'Pret' });
    renderApp(db, '/transactions');
    await screen.findByRole('button', { name: /Pret/ });

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    change(screen.getByPlaceholderText('Search payee, note or category'), 'dentist');
    expect(await screen.findByRole('heading', { name: '1 match in all months' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dentist/ })).toBeInTheDocument();
    // Dates carry the year, since results span years.
    expect(screen.getByRole('region', { name: new RegExp(lastYear.slice(0, 4)) })).toBeInTheDocument();
    const spent = screen.getByText('Spent (results)').parentElement!;
    expect(within(spent).getByText('$80.00')).toBeInTheDocument();

    change(screen.getByPlaceholderText('Search payee, note or category'), 'RENT');
    expect(await screen.findByRole('button', { name: /Rent.*-\$1,200\.00/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pret|Dentist/ })).not.toBeInTheDocument();

    change(screen.getByPlaceholderText('Search payee, note or category'), '');
    expect(await screen.findByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Pret/ })).toBeInTheDocument();
  });
});

describe('monthly entries', () => {
  it('repeats an entry and records next month’s only when confirmed', async () => {
    const lastMonth = shiftMonth(thisMonth, -1);
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Chase/ }));
    change(within(dialog).getByLabelText('Amount'), '1200');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rent' }));
    change(within(dialog).getByLabelText('Date'), `${lastMonth}-01`);
    fireEvent.click(within(dialog).getByText('More: note, repeat monthly'));
    fireEvent.click(within(dialog).getByLabelText('Repeats monthly (rent, subscriptions…)'));
    expect(within(dialog).getByText(/Each month on day 1 you’ll be asked/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();

    // This month's rent is due (the 1st has passed) but not recorded yet.
    const due = await screen.findByRole('region', { name: '1 monthly entry is due' });
    expect(await db.transactions.count()).toBe(1);
    fireEvent.click(within(due).getByRole('button', { name: /^Record Rent/ }));
    await waitFor(() => expect(screen.queryByRole('region', { name: /monthly entr/ })).not.toBeInTheDocument());
    const entries = await db.transactions.orderBy('date').toArray();
    expect(entries.map((e) => [e.date, e.amountMinor, e.categoryId])).toEqual([
      [`${lastMonth}-01`, -120000, 'default-rent'],
      [`${thisMonth}-01`, -120000, 'default-rent'],
    ]);
  });

  it('skips a month and works through missed months in order', async () => {
    await createRecurringRule(db, {
      template: { kind: 'income', accountId: taiwan.id, amountMinor: 20000, categoryId: 'default-allowance' },
      dayOfMonth: 1,
      startMonth: shiftMonth(thisMonth, -2),
    });
    renderApp(db, '/transactions');
    const due = await screen.findByRole('region', { name: '1 monthly entry is due' });
    expect(within(due).getByText('2 more months waiting')).toBeInTheDocument();
    expect(within(due).getByText('+NT$20,000')).toBeInTheDocument();

    fireEvent.click(within(due).getByRole('button', { name: /^Skip Family support/ }));
    expect(await within(due).findByText('1 more month waiting')).toBeInTheDocument();
    fireEvent.click(within(due).getByRole('button', { name: /^Record Family support/ }));
    await waitFor(() => expect(within(due).queryByText(/more month/)).not.toBeInTheDocument());
    expect(await db.transactions.count()).toBe(1);
    expect((await db.transactions.toArray())[0].date).toBe(`${shiftMonth(thisMonth, -1)}-01`);
  });

  it('offers repeating only for new income and expenses', async () => {
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByLabelText('Repeats monthly (rent, subscriptions…)'));
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Refund' }));
    expect(within(dialog).queryByLabelText('Repeats monthly (rent, subscriptions…)')).not.toBeInTheDocument();
    expect(within(dialog).getByText('More: note')).toBeInTheDocument();

    // A choice made before switching to a refund doesn't carry over.
    fireEvent.click(within(dialog).getByRole('radio', { name: /Chase/ }));
    change(within(dialog).getByLabelText('Amount'), '5');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();
    expect(await db.transactions.count()).toBe(1);
    expect(await db.recurring.count()).toBe(0);
  });
});

describe('paying in another currency', () => {
  let visa: Account;

  beforeEach(async () => {
    visa = await createAccount(db, { name: 'Visa', kind: 'credit_card', currency: 'TWD', foreignFeeBps: 150 });
    await setExchangeRate(db, { from: 'JPY', to: 'TWD', rate: 0.215, date: toDateKey(new Date()) });
  });

  const payIn = (dialog: HTMLElement, currency: string) =>
    change(within(dialog).getAllByLabelText('Currency paid in')[0], currency);

  it('estimates a yen purchase on a Taiwanese card, fee included, and remembers the currency', async () => {
    renderApp(db, '/transactions');
    let dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Visa/ }));
    payIn(dialog, 'JPY');
    change(within(dialog).getByLabelText('Amount'), '5,000');
    expect(within(dialog).getByText('Visa will be charged about NT$1,091, including a 1.5% foreign fee of NT$16')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dining out' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();

    expect(await screen.findByRole('button', { name: /Dining out\s*Est\..*Visa.*-NT\$1,091.*¥5,000.*incl\. NT\$16 fee/ })).toBeInTheDocument();
    expect(await db.transactions.toArray()).toMatchObject([
      { amountMinor: -1091, feeMinor: -16, originalAmountMinor: -5000, originalCurrency: 'JPY' },
    ]);

    // Next time, Visa (now the most used card) starts in yen, also after switching away and back.
    dialog = await openAddDialog();
    expect(within(dialog).getByRole('radio', { name: /Visa/ })).toHaveAttribute('aria-checked', 'true');
    expect(within(dialog).getAllByLabelText('Currency paid in')[0]).toHaveValue('JPY');
    fireEvent.click(within(dialog).getByRole('radio', { name: /Chase/ }));
    expect(within(dialog).getAllByLabelText('Currency paid in')[0]).toHaveValue('USD');
    fireEvent.click(within(dialog).getByRole('radio', { name: /Visa/ }));
    expect(within(dialog).getAllByLabelText('Currency paid in')[0]).toHaveValue('JPY');
  });

  it('takes the statement amount instead of the estimate', async () => {
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Visa/ }));
    payIn(dialog, 'JPY');
    change(within(dialog).getByLabelText('Amount'), '5000');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enter statement amount' }));

    const charged = within(dialog).getByLabelText('Charged (TWD)');
    expect(charged).toHaveValue('1091');
    await waitFor(() => expect(charged).toHaveFocus());
    expect(within(dialog).getByLabelText('Of which foreign fee')).toHaveValue('16');
    change(charged, '1,100');
    change(within(dialog).getByLabelText('Of which foreign fee'), '1100');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('The fee must be less than the amount charged')).toBeInTheDocument();

    change(within(dialog).getByLabelText('Of which foreign fee'), '17');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();
    expect(await db.transactions.toArray()).toMatchObject([{ amountMinor: -1100, feeMinor: -17, originalAmountMinor: -5000 }]);
  });

  it('asks for the charge when there is no rate for the currency', async () => {
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Visa/ }));
    payIn(dialog, 'EUR');
    change(within(dialog).getByLabelText('Amount'), '12');
    expect(within(dialog).getByText('No EUR to TWD rate yet; enter the amount on your statement.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Enter an amount')).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByLabelText('Charged (TWD)')).toHaveFocus());
    expect(await db.transactions.count()).toBe(0);
  });

  it('counts the fee under Fees when filtering by category', async () => {
    await createTransaction(db, {
      kind: 'expense', accountId: visa.id, amountMinor: 1091, feeMinor: 16, date: `${thisMonth}-01`, categoryId: 'default-dining',
      original: { amountMinor: 5000, currency: 'JPY' },
    });
    renderApp(db, '/transactions?category=default-fees');
    expect(await screen.findByRole('button', { name: /Dining out.*-NT\$1,091/ })).toBeInTheDocument();
    const spent = (await screen.findByText('Spent this month')).parentElement!;
    await waitFor(() => expect(within(spent).getByText('NT$16')).toBeInTheDocument());
  });
});

describe('getting to the form quickly', () => {
  it('opens a new entry from the bar on any page', async () => {
    renderApp(db, '/overview');
    const bar = (await screen.findAllByRole('navigation', { name: 'Main' })).at(-1)!;
    fireEvent.click(within(bar).getByRole('button', { name: 'Add transaction' }));
    expect(await screen.findByRole('dialog', { name: 'Add transaction' })).toBeInTheDocument();
  });

  it('offers frequent entries that leave only the amount to type', async () => {
    for (const day of ['01', '02']) {
      await createTransaction(db, { kind: 'expense', accountId: taiwan.id, amountMinor: 120, date: `${thisMonth}-${day}`, payee: 'Pret', categoryId: 'default-dining' });
    }
    // Chase is used most, so the form starts there; the pick must switch accounts.
    for (const day of ['03', '04', '05']) {
      await createTransaction(db, { kind: 'expense', accountId: chase.id, amountMinor: 999, date: `${thisMonth}-${day}`, payee: `Once ${day}` });
    }
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    expect(within(dialog).getByRole('radio', { name: /Chase/ })).toHaveAttribute('aria-checked', 'true');
    within(dialog).getByLabelText('Payee').focus();
    const picks = within(dialog).getByRole('group', { name: 'Frequent' });
    expect(within(picks).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Pret (Dining out, Bank of Taiwan)',
    ]);
    fireEvent.click(within(picks).getByRole('button', { name: /Pret/ }));
    expect(within(picks).getByRole('button', { name: /Pret/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(dialog).getByRole('radio', { name: /Bank of Taiwan/ })).toHaveAttribute('aria-checked', 'true');
    expect(within(dialog).getByRole('button', { name: 'Dining out' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(within(dialog).getByLabelText('Amount')).toHaveFocus());
    change(within(dialog).getByLabelText('Amount'), '150');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();
    expect((await db.transactions.orderBy('date').last())).toMatchObject({ amountMinor: -150, payee: 'Pret', categoryId: 'default-dining' });
  });

  it('suggests payees and brings their usual category', async () => {
    await createTransaction(db, { kind: 'expense', accountId: chase.id, amountMinor: 450, date: `${thisMonth}-01`, payee: 'Trader Joe’s', categoryId: 'default-groceries' });
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    const payee = within(dialog).getByLabelText('Payee');
    const options = [...document.getElementById(payee.getAttribute('list')!)!.querySelectorAll('option')];
    expect(options.map((o) => o.getAttribute('value'))).toEqual(['Trader Joe’s']);
    change(payee, 'trader joe’s');
    expect(within(dialog).getByRole('button', { name: 'Groceries & household' })).toHaveAttribute('aria-pressed', 'true');

    // A category already chosen is kept.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dining out' }));
    change(payee, 'Trader Joe’s');
    expect(within(dialog).getByRole('button', { name: 'Dining out' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('estimated charges', () => {
  let visa: Account;
  const estimate = (date: string, amountMinor = 1091) =>
    createTransaction(db, {
      kind: 'expense', accountId: visa.id, amountMinor, feeMinor: 16, date, categoryId: 'default-dining',
      original: { amountMinor: 5000, currency: 'JPY' }, estimated: true,
    });

  beforeEach(async () => {
    visa = await createAccount(db, { name: 'Visa', kind: 'credit_card', currency: 'TWD', foreignFeeBps: 150 });
  });

  it('are listed across months from the card’s reminder, then confirmed one by one', async () => {
    await estimate(`${shiftMonth(thisMonth, -1)}-20`);
    await estimate(`${thisMonth}-02`, 2182);
    renderApp(db, '/accounts');
    fireEvent.click(await screen.findByRole('link', { name: /2 estimates to check/ }));

    expect(await screen.findByRole('heading', { name: '2 estimates to check' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Estimates/ })).toBeInTheDocument();
    const rows = screen.getAllByRole('button', { name: /Dining out\s*Est\./ });
    expect(rows).toHaveLength(2);

    // The amount matches the statement: tick it.
    fireEvent.click(rows[0]);
    let dialog = await screen.findByRole('dialog', { name: 'Edit transaction' });
    expect(await within(dialog).findByText(/estimate from exchange rates/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('Matches the statement'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();
    expect(await screen.findByRole('heading', { name: '1 estimate to check' })).toBeInTheDocument();

    // The statement differs: typing it confirms it.
    fireEvent.click(screen.getByRole('button', { name: /Dining out\s*Est\./ }));
    dialog = await screen.findByRole('dialog', { name: 'Edit transaction' });
    change(await within(dialog).findByLabelText('Charged (TWD)'), '1,095');
    expect(within(dialog).getByLabelText('Matches the statement')).toBeChecked();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();
    expect(await screen.findByRole('heading', { name: '0 estimates to check' })).toBeInTheDocument();
    expect(await db.transactions.filter((t) => t.estimated === true).count()).toBe(0);
  });

  it('keep the mark when only the note changes', async () => {
    const [record] = await estimate(`${thisMonth}-02`);
    renderApp(db, '/transactions');
    fireEvent.click(await screen.findByRole('button', { name: /Dining out\s*Est\./ }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit transaction' });
    fireEvent.click(await within(dialog).findByText('More: note'));
    change(within(dialog).getByLabelText('Note'), 'ramen');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();
    expect(await db.transactions.get(record.id)).toMatchObject({ note: 'ramen', estimated: true });
  });
});

describe('undo', () => {
  const toast = () => screen.findByText(/^(Saved|Updated|Deleted|Undone)/);

  it('takes back a new entry', async () => {
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Chase/ }));
    change(within(dialog).getByLabelText('Amount'), '12.50');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dining out' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();

    expect(await toast()).toHaveTextContent('Saved: Dining out $12.50');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('Undone')).toBeInTheDocument();
    await waitFor(async () => expect(await db.transactions.count()).toBe(0));
  });

  it('brings back a deleted entry and reverts an edit', async () => {
    const [record] = await createTransaction(db, { kind: 'expense', accountId: chase.id, amountMinor: 500, date: `${thisMonth}-01`, payee: 'Costco' });
    renderApp(db, '/transactions');

    fireEvent.click(await screen.findByRole('button', { name: /Costco/ }));
    let dialog = await screen.findByRole('dialog', { name: 'Edit transaction' });
    change(await within(dialog).findByLabelText('Amount'), '9');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitForDialogToClose();
    expect(await toast()).toHaveTextContent('Updated: Uncategorized $9.00');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect((await db.transactions.get(record.id))?.amountMinor).toBe(-500));

    fireEvent.click(await screen.findByRole('button', { name: /Costco.*-\$5\.00/ }));
    dialog = await screen.findByRole('dialog', { name: 'Edit transaction' });
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Delete' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Really delete?' }));
    await waitForDialogToClose();
    expect(await toast()).toHaveTextContent('Deleted: Uncategorized $5.00');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('button', { name: /Costco/ })).toBeInTheDocument();
    expect(await db.transactions.get(record.id)).toEqual(record);
  });

  it('takes back an entry saved with "add another", and a monthly rule with it', async () => {
    renderApp(db, '/transactions');
    const dialog = await openAddDialog();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Chase/ }));
    change(within(dialog).getByLabelText('Amount'), '1200');
    fireEvent.click(within(dialog).getByText('More: note, repeat monthly'));
    fireEvent.click(within(dialog).getByLabelText('Repeats monthly (rent, subscriptions…)'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save & add another' }));
    await within(dialog).findByText(/^Saved:/);
    expect(await db.recurring.count()).toBe(1);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Undo' }));
    expect(await within(dialog).findByText('Undone')).toBeInTheDocument();
    await waitFor(async () => expect(await db.transactions.count()).toBe(0));
    expect(await db.recurring.count()).toBe(0);
  });
});
