import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCategory,
  createTransaction,
  listBudgets,
  monthOf,
  saveExchangeRates,
  seedDefaultCategories,
  toDateKey,
  type Account,
  type LedgerDB,
} from '../../core';
import { addAccount, createTestDb } from '../../test/ledgerDb';
import { renderApp } from '../../test/renderApp';
import { daysInMonth } from './monthOverview';

let db: LedgerDB;
let yen: Account;
let dollars: Account;
let taiwan: Account;
const today = toDateKey(new Date());
const thisMonth = monthOf(today);

beforeEach(async () => {
  db = createTestDb();
  await seedDefaultCategories(db);
  yen = await addAccount(db, { name: 'Cash', currency: 'JPY', openingBalanceMinor: 100000 });
  dollars = await addAccount(db, { name: 'Chase', currency: 'USD', openingBalanceMinor: 50000 });
  taiwan = await addAccount(db, { name: 'Post office', currency: 'TWD', openingBalanceMinor: 10000 });
  // NT$1 = ¥5 = US$0.03125
  await saveExchangeRates(db, [
    { from: 'TWD', to: 'JPY', rate: 5, date: '2020-01-01' },
    { from: 'TWD', to: 'USD', rate: 0.03125, date: '2020-01-01' },
  ]);
  const spend = (accountId: string, amountMinor: number, categoryId: string) =>
    createTransaction(db, { kind: 'expense', accountId, amountMinor, date: `${thisMonth}-01`, categoryId });
  await spend(yen.id, 50000, 'default-dining'); // NT$10,000
  await spend(taiwan.id, 3000, 'default-dining');
  await spend(dollars.id, 25000, 'default-rent'); // NT$8,000
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const card = async (heading: string) => (await screen.findByRole('heading', { name: heading })).closest('section')!;

describe('OverviewPage', () => {
  it('converts the month into the main currency', async () => {
    renderApp(db, '/overview');
    const spent = await card('Spent this month');
    expect(within(spent).getByText('≈ NT$21,000')).toBeInTheDocument();
    expect(within(spent).getByText('Includes ¥50,000、NT$3,000、$250.00')).toBeInTheDocument();
  });

  it('ranks categories and links each to its transactions', async () => {
    renderApp(db, '/overview');
    const ranking = await card('Where it went');
    const links = within(ranking).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['🍜Dining out≈ NT$13,00062%', '🏠Rent≈ NT$8,00038%']);

    fireEvent.click(links[0]);
    expect(await screen.findByRole('button', { name: /Category: Dining out/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/Rent/)).not.toBeInTheDocument());
  });

  it('sets a budget and shows what is left per day', async () => {
    renderApp(db, '/overview');
    fireEvent.click(within(await card('Monthly budget')).getByRole('button', { name: 'Set a budget' }));
    const dialog = await screen.findByRole('dialog', { name: 'Monthly budget' });
    fireEvent.change(within(dialog).getByLabelText('Budget currency'), { target: { value: 'JPY' } });
    fireEvent.change(within(dialog).getByLabelText('How much you can spend per month'), { target: { value: '205,000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const budget = await card('Monthly budget ¥205,000');
    // Spent NT$21,000 = ¥105,000.
    expect(within(budget).getByText('Spent ¥105,000 (51%)')).toBeInTheDocument();
    expect(within(budget).getByText('¥100,000 left')).toBeInTheDocument();
    const daysLeft = daysInMonth(thisMonth) - Number(today.slice(8)) + 1;
    const perDay = Math.floor(100000 / daysLeft).toLocaleString('en-US');
    expect(within(budget).getByText(new RegExp(`about ¥${perDay} a day|¥${perDay} for today`))).toBeInTheDocument();
    expect(await listBudgets(db)).toMatchObject([{ id: 'overall', currency: 'JPY', amountMinor: 205000 }]);
  });

  it('warns when spending is over budget', async () => {
    renderApp(db, '/overview');
    fireEvent.click(within(await card('Monthly budget')).getByRole('button', { name: 'Set a budget' }));
    const dialog = await screen.findByRole('dialog', { name: 'Monthly budget' });
    fireEvent.change(within(dialog).getByLabelText('Budget currency'), { target: { value: 'TWD' } });
    fireEvent.change(within(dialog).getByLabelText('How much you can spend per month'), { target: { value: '20000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    const budget = await card('Monthly budget NT$20,000');
    expect(await within(budget).findByText('NT$1,000 over')).toBeInTheDocument();
    expect(within(budget).queryByText(/a day/)).not.toBeInTheDocument();
  });

  it('adds up all accounts in the main currency', async () => {
    renderApp(db, '/overview');
    const total = await card('All accounts');
    // ¥50,000 = NT$10,000; $250 = NT$8,000; NT$7,000
    expect(within(total).getByText('≈ NT$25,000')).toBeInTheDocument();
  });

  it('says which currencies have no rate instead of guessing', async () => {
    await db.exchangeRates.clear();
    renderApp(db, '/overview');
    const spent = await card('Spent this month');
    expect(within(spent).getByText('≈ NT$3,000')).toBeInTheDocument();
    expect(within(spent).getByText(/No exchange rate for JPY、USD yet/)).toBeInTheDocument();
  });

  it('shows the rates in use and can refresh them', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ date: '2026-09-24', twd: { usd: 0.03, jpy: 4.8 } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    renderApp(db, '/overview');

    expect(await screen.findByText(/1 JPY ≈ 0.2 TWD · 1 USD ≈ 32 TWD/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update rates' }));
    expect(await screen.findByText(/1 USD ≈ 33.3333 TWD/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports a failed refresh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    renderApp(db, '/overview');
    fireEvent.click(await screen.findByRole('button', { name: 'Update rates' }));
    expect(await screen.findByText(/Couldn't get exchange rates/)).toBeInTheDocument();
  });
});

describe('transactions summary', () => {
  it('shows converted totals and budget progress, and opens the overview', async () => {
    await db.budgets.put({ id: 'overall', amountMinor: 30000, currency: 'TWD', createdAt: 0, updatedAt: 0 });
    renderApp(db, '/transactions');
    const spent = (await screen.findByText('Spent this month')).parentElement!;
    expect(await within(spent).findByText('≈ NT$21,000')).toBeInTheDocument();
    expect(within(spent).getByText('¥50,000・NT$3,000・$250.00')).toBeInTheDocument();
    expect(screen.getByText(/NT\$9,000 of the budget left/)).toBeInTheDocument();

    fireEvent.click(spent);
    expect(await screen.findByRole('heading', { name: 'Where it went' })).toBeInTheDocument();
  });

  it('includes subcategories when filtering by a category', async () => {
    const coffee = await createCategory(db, { kind: 'expense', name: 'Coffee', parentId: 'default-dining' });
    await createTransaction(db, {
      kind: 'expense', accountId: taiwan.id, amountMinor: 120, date: `${thisMonth}-02`, categoryId: coffee.id, payee: 'Louisa',
    });
    renderApp(db, `/transactions?category=default-dining`);
    expect(await screen.findByRole('button', { name: /Louisa/ })).toBeInTheDocument();
  });

  it('clears a category filter', async () => {
    renderApp(db, `/transactions?category=default-rent`);
    fireEvent.click(await screen.findByRole('button', { name: /Category: Rent/ }));
    expect(await screen.findAllByText(/Dining out/)).not.toHaveLength(0);
  });
});

describe('main currency setting', () => {
  it('changes the currency totals are shown in', async () => {
    renderApp(db, '/settings');
    fireEvent.change(await screen.findByRole('combobox', { name: 'Main currency' }), { target: { value: 'USD' } });
    await waitFor(async () => expect((await db.settings.get('baseCurrency'))?.value).toBe('USD'));

    fireEvent.click(screen.getAllByRole('link', { name: 'Overview' })[0]);
    const spent = await card('Spent this month');
    // NT$21,000 = US$656.25
    expect(await within(spent).findByText('≈ $656.25')).toBeInTheDocument();
  });
});
