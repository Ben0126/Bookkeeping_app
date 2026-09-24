import { beforeEach, describe, expect, it } from 'vitest';
import { addAccount, createTestDb } from '../test/ledgerDb';
import { setBudget } from './budgets';
import {
  createCategory,
  DEFAULT_CATEGORIES,
  deleteCategory,
  findFeeCategory,
  listCategories,
  seedDefaultCategories,
  updateCategory,
} from './categories';
import type { LedgerDB } from './db';
import { createRecurringRule } from './recurring';
import { createTransaction } from './transactions';

let db: LedgerDB;

beforeEach(() => {
  db = createTestDb();
});

describe('seedDefaultCategories', () => {
  it('seeds once, in order', async () => {
    expect(await seedDefaultCategories(db)).toBe(true);
    expect(await seedDefaultCategories(db)).toBe(false);
    const categories = await listCategories(db);
    expect(categories.map((c) => c.key)).toEqual(DEFAULT_CATEGORIES.map((c) => c.key));
  });

  it('does not duplicate when called concurrently', async () => {
    const results = await Promise.all([seedDefaultCategories(db), seedDefaultCategories(db)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await db.categories.count()).toBe(DEFAULT_CATEGORIES.length);
  });

  it('filters by kind', async () => {
    await seedDefaultCategories(db);
    const income = await listCategories(db, { kind: 'income' });
    expect(income.length).toBeGreaterThan(0);
    expect(income.every((c) => c.kind === 'income')).toBe(true);
  });
});

describe('createCategory', () => {
  it('appends after existing categories', async () => {
    await seedDefaultCategories(db);
    const category = await createCategory(db, { kind: 'expense', name: 'Gym', icon: '🏋️' });
    expect(category.sortOrder).toBe(DEFAULT_CATEGORIES.length);
    expect((await listCategories(db)).at(-1)?.id).toBe(category.id);
  });

  it('rejects duplicate names among siblings, ignoring case', async () => {
    const food = await createCategory(db, { kind: 'expense', name: 'Food' });
    await expect(createCategory(db, { kind: 'expense', name: 'food' })).rejects.toMatchObject({ code: 'DUPLICATE_NAME' });

    // Same name is fine under a different parent or kind.
    await createCategory(db, { kind: 'expense', name: 'Food', parentId: food.id });
    await createCategory(db, { kind: 'income', name: 'Food' });
  });

  it('nests one level deep within the same kind', async () => {
    const food = await createCategory(db, { kind: 'expense', name: 'Food' });
    const coffee = await createCategory(db, { kind: 'expense', name: 'Coffee', parentId: food.id });
    const salary = await createCategory(db, { kind: 'income', name: 'Salary' });

    await expect(createCategory(db, { kind: 'expense', name: 'Latte', parentId: coffee.id }))
      .rejects.toMatchObject({ code: 'INVALID_CATEGORY_PARENT' });
    await expect(createCategory(db, { kind: 'expense', name: 'Bonus', parentId: salary.id }))
      .rejects.toMatchObject({ code: 'INVALID_CATEGORY_PARENT' });
    await expect(updateCategory(db, food.id, { parentId: salary.id }))
      .rejects.toMatchObject({ code: 'INVALID_CATEGORY_PARENT' });
  });
});

describe('updateCategory', () => {
  it('drops the translation key when a built-in is renamed', async () => {
    await seedDefaultCategories(db);
    const renamed = await updateCategory(db, 'default-dining', { name: '吃飯' });
    expect(renamed.name).toBe('吃飯');
    expect(renamed).not.toHaveProperty('key');

    const iconOnly = await updateCategory(db, 'default-rent', { icon: '🏢' });
    expect(iconOnly.key).toBe('rent');
  });

  it('moves a category to the top level', async () => {
    const food = await createCategory(db, { kind: 'expense', name: 'Food' });
    const coffee = await createCategory(db, { kind: 'expense', name: 'Coffee', parentId: food.id });
    const moved = await updateCategory(db, coffee.id, { parentId: undefined });
    expect(moved).not.toHaveProperty('parentId');
  });
});

describe('findFeeCategory', () => {
  it('finds the built-in Fees category, even renamed', async () => {
    await seedDefaultCategories(db);
    expect(findFeeCategory(await listCategories(db))?.id).toBe('default-fees');
    await updateCategory(db, 'default-fees', { name: 'Bank charges' });
    expect(findFeeCategory(await listCategories(db))?.id).toBe('default-fees');
    expect(findFeeCategory([])).toBeUndefined();
  });
});

describe('deleteCategory', () => {
  it('refuses while transactions use it, unless they are reassigned', async () => {
    await seedDefaultCategories(db);
    const account = await addAccount(db);
    const [expense] = await createTransaction(db, {
      kind: 'expense', accountId: account.id, amountMinor: 100, date: '2026-09-01', categoryId: 'default-dining',
    });

    await expect(deleteCategory(db, 'default-dining')).rejects.toMatchObject({ code: 'CATEGORY_IN_USE' });
    await expect(deleteCategory(db, 'default-dining', { reassignTo: 'default-salary' }))
      .rejects.toMatchObject({ code: 'CATEGORY_KIND_MISMATCH' });

    await deleteCategory(db, 'default-dining', { reassignTo: 'default-groceries' });
    expect(await db.categories.get('default-dining')).toBeUndefined();
    expect((await db.transactions.get(expense.id))?.categoryId).toBe('default-groceries');
  });

  it('moves recurring rules along, or leaves them uncategorized', async () => {
    await seedDefaultCategories(db);
    const account = await addAccount(db);
    const rule = (categoryId: string) =>
      createRecurringRule(db, { template: { kind: 'expense', accountId: account.id, amountMinor: 100, categoryId }, dayOfMonth: 1, startMonth: '2026-09' });
    const rent = await rule('default-rent');
    const gym = await rule('default-health');

    await expect(deleteCategory(db, 'default-rent', { reassignTo: 'default-salary' }))
      .rejects.toMatchObject({ code: 'CATEGORY_KIND_MISMATCH' });
    await deleteCategory(db, 'default-rent', { reassignTo: 'default-utilities' });
    await deleteCategory(db, 'default-health');

    expect((await db.recurring.get(rent.id))?.template.categoryId).toBe('default-utilities');
    expect((await db.recurring.get(gym.id))?.template).not.toHaveProperty('categoryId');
  });

  it('removes the category budget with it', async () => {
    await seedDefaultCategories(db);
    await setBudget(db, { categoryId: 'default-dining', amountMinor: 5000, currency: 'USD' });
    await deleteCategory(db, 'default-dining');
    expect(await db.budgets.count()).toBe(0);
  });

  it('refuses while it has subcategories', async () => {
    const food = await createCategory(db, { kind: 'expense', name: 'Food' });
    await createCategory(db, { kind: 'expense', name: 'Coffee', parentId: food.id });
    await expect(deleteCategory(db, food.id)).rejects.toMatchObject({ code: 'CATEGORY_IN_USE' });
  });
});
