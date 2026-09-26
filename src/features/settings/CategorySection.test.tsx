import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seedDefaultCategories, type LedgerDB } from '../../core';
import i18n from '../../i18n';
import { addAccount, createTestDb } from '../../test/ledgerDb';
import { renderApp } from '../../test/renderApp';

let db: LedgerDB;

beforeEach(async () => {
  db = createTestDb();
  await seedDefaultCategories(db);
  await addAccount(db, { name: 'Chase' });
});

afterEach(async () => {
  await i18n.changeLanguage('en-US');
});

const categoriesSection = async () => (await screen.findByRole('heading', { name: 'Categories' })).closest('section')!;

async function categoryChipsInAddForm() {
  fireEvent.click(screen.getAllByRole('link', { name: 'Transactions' })[0]);
  fireEvent.click((await screen.findAllByRole('button', { name: 'Add transaction' }))[0]);
  const dialog = await screen.findByRole('dialog', { name: 'Add transaction' });
  await within(dialog).findByLabelText('Amount');
  return within(within(dialog).getByRole('group', { name: 'Category' }))
    .getAllByRole('button')
    .map((chip) => chip.textContent);
}

describe('category settings', () => {
  it('hides a category from the entry form', async () => {
    renderApp(db, '/settings/categories');
    const section = await categoriesSection();
    fireEvent.click(await within(section).findByRole('switch', { name: 'Show “Tuition” when adding entries' }));
    await waitFor(async () => expect((await db.categories.get('default-tuition'))?.archived).toBe(true));

    const chips = await categoryChipsInAddForm();
    expect(chips.some((text) => text?.includes('Tuition'))).toBe(false);
    expect(chips.some((text) => text?.includes('Dining out'))).toBe(true);
  });

  it('adds a category with an icon', async () => {
    renderApp(db, '/settings/categories');
    const section = await categoriesSection();
    fireEvent.click(within(section).getByRole('button', { name: 'Add category' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add category' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Coffee' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '☕' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(section).findByRole('button', { name: 'Edit “Coffee”' })).toBeInTheDocument();
    const coffee = (await db.categories.toArray()).find((c) => c.name === 'Coffee');
    expect(coffee).toMatchObject({ kind: 'expense', icon: '☕', archived: false });
    expect(await categoryChipsInAddForm()).toContain('☕Coffee');
  });

  it('rejects a duplicate name', async () => {
    renderApp(db, '/settings/categories');
    const section = await categoriesSection();
    fireEvent.click(within(section).getByRole('button', { name: 'Add category' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add category' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Rent' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('That name is already taken.');
  });

  it('changes a built-in icon but keeps its translated name', async () => {
    renderApp(db, '/settings/categories');
    const section = await categoriesSection();
    fireEvent.click(await within(section).findByRole('button', { name: 'Edit “Dining out”' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit category' });
    fireEvent.click(within(dialog).getByRole('button', { name: '☕' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(async () => expect((await db.categories.get('default-dining'))?.icon).toBe('☕'));
    expect((await db.categories.get('default-dining'))?.key).toBe('dining');
  });
});

describe('language setting', () => {
  it('switches the interface language', async () => {
    renderApp(db, '/settings');
    fireEvent.click(await screen.findByRole('radio', { name: '繁體中文' }));
    expect(await screen.findByRole('heading', { name: '設定' })).toBeInTheDocument();
  });
});
