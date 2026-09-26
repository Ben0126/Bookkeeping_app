import { newId, type LedgerDB } from './db';
import { LedgerError } from './errors';
import type { Category, CategoryKind } from './types';
import { optionalText, requireName, requireOneOf } from './validate';

/**
 * The built-in Fees category, found by its key or, once renamed (which
 * clears the key), by its seeded id.
 */
export function findFeeCategory(categories: readonly Category[]): Category | undefined {
  const fees = categories.filter((c) => c.kind === 'expense');
  return fees.find((c) => c.key === 'fees') ?? fees.find((c) => c.id === 'default-fees');
}

const CATEGORY_KINDS: readonly CategoryKind[] = ['income', 'expense'];

interface DefaultCategory {
  key: string;
  kind: CategoryKind;
  name: string;
  icon: string;
}

/** Seeded on first launch; `key` is the translation key, `name` the English fallback. */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  // Everyday spending first: these are picked many times a week.
  { key: 'dining', kind: 'expense', name: 'Dining out', icon: '🍜' },
  { key: 'groceries', kind: 'expense', name: 'Groceries & household', icon: '🛒' },
  { key: 'transport', kind: 'expense', name: 'Transport', icon: '🚌' },
  { key: 'shopping', kind: 'expense', name: 'Shopping', icon: '🛍️' },
  { key: 'entertainment', kind: 'expense', name: 'Entertainment', icon: '🎬' },
  { key: 'phone_internet', kind: 'expense', name: 'Phone & internet', icon: '📱' },
  { key: 'rent', kind: 'expense', name: 'Rent', icon: '🏠' },
  { key: 'utilities', kind: 'expense', name: 'Utilities', icon: '💡' },
  { key: 'books_supplies', kind: 'expense', name: 'Books & supplies', icon: '📚' },
  { key: 'health', kind: 'expense', name: 'Health', icon: '🏥' },
  { key: 'travel', kind: 'expense', name: 'Flights & travel', icon: '✈️' },
  { key: 'fees', kind: 'expense', name: 'Fees', icon: '🧾' },
  { key: 'tuition', kind: 'expense', name: 'Tuition', icon: '🎓' },
  { key: 'insurance', kind: 'expense', name: 'Insurance', icon: '🛡️' },
  { key: 'visa', kind: 'expense', name: 'Visa & documents', icon: '🛂' },
  { key: 'other_expense', kind: 'expense', name: 'Other expense', icon: '📦' },
  { key: 'allowance', kind: 'income', name: 'Family support', icon: '🏠' },
  { key: 'part_time', kind: 'income', name: 'Part-time job', icon: '⏱️' },
  { key: 'scholarship', kind: 'income', name: 'Scholarship', icon: '🎓' },
  { key: 'salary', kind: 'income', name: 'Salary', icon: '💼' },
  { key: 'investment', kind: 'income', name: 'Investment', icon: '📈' },
  { key: 'other_income', kind: 'income', name: 'Other income', icon: '➕' },
];

/**
 * Adds the default categories when there are none. Runs in one transaction,
 * so concurrent calls (e.g. React StrictMode) cannot insert duplicates.
 */
export async function seedDefaultCategories(db: LedgerDB): Promise<boolean> {
  return db.transaction('rw', db.categories, async () => {
    if ((await db.categories.count()) > 0) return false;
    const now = Date.now();
    await db.categories.bulkAdd(
      DEFAULT_CATEGORIES.map((category, index) => ({
        id: `default-${category.key}`,
        ...category,
        archived: false,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      })),
    );
    return true;
  });
}

export interface NewCategory {
  kind: CategoryKind;
  name: string;
  parentId?: string;
  icon?: string;
  color?: string;
}

export type CategoryPatch = Partial<
  Pick<Category, 'name' | 'parentId' | 'icon' | 'color' | 'archived' | 'sortOrder'>
>;

export async function getCategory(db: LedgerDB, id: string): Promise<Category> {
  const category = await db.categories.get(id);
  if (!category) throw new LedgerError('NOT_FOUND', `Category ${id} not found`);
  return category;
}

export async function listCategories(
  db: LedgerDB,
  { kind, includeArchived = false }: { kind?: CategoryKind; includeArchived?: boolean } = {},
): Promise<Category[]> {
  const categories = kind
    ? await db.categories.where('kind').equals(kind).toArray()
    : await db.categories.toArray();
  return categories
    .filter((category) => includeArchived || !category.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createCategory(db: LedgerDB, input: NewCategory): Promise<Category> {
  return db.transaction('rw', db.categories, async () => {
    const kind = requireOneOf(input.kind, CATEGORY_KINDS);
    const name = requireName(input.name);
    const parentId = input.parentId ?? undefined;
    if (parentId !== undefined) await requireValidParent(db, parentId, kind);
    await requireUniqueName(db, { kind, name, parentId });

    let maxSortOrder = -1;
    await db.categories.each((c) => {
      maxSortOrder = Math.max(maxSortOrder, c.sortOrder);
    });
    const now = Date.now();
    const category: Category = {
      id: newId(),
      kind,
      name,
      archived: false,
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    };
    if (parentId !== undefined) category.parentId = parentId;
    const icon = optionalText(input.icon);
    if (icon) category.icon = icon;
    const color = optionalText(input.color);
    if (color) category.color = color;

    await db.categories.add(category);
    return category;
  });
}

export async function updateCategory(db: LedgerDB, id: string, patch: CategoryPatch): Promise<Category> {
  return db.transaction('rw', db.categories, async () => {
    const current = await getCategory(db, id);
    const next: Category = { ...current, updatedAt: Date.now() };

    if ('parentId' in patch && patch.parentId !== current.parentId) {
      if (patch.parentId === undefined) {
        delete next.parentId;
      } else {
        if (patch.parentId === id) throw new LedgerError('INVALID_CATEGORY_PARENT', 'A category cannot be its own parent');
        if ((await db.categories.where('parentId').equals(id).count()) > 0) {
          throw new LedgerError('INVALID_CATEGORY_PARENT', 'A category with subcategories cannot become a subcategory');
        }
        await requireValidParent(db, patch.parentId, current.kind);
        next.parentId = patch.parentId;
      }
    }
    if (patch.name !== undefined) {
      const name = requireName(patch.name);
      if (name !== current.name) {
        next.name = name;
        // A renamed built-in shows the user's name instead of the translation.
        delete next.key;
      }
    }
    if (next.name !== current.name || next.parentId !== current.parentId) {
      await requireUniqueName(db, { kind: next.kind, name: next.name, parentId: next.parentId, exceptId: id });
    }
    for (const field of ['icon', 'color'] as const) {
      if (patch[field] === undefined) continue;
      const value = optionalText(patch[field]);
      if (value) next[field] = value;
      else delete next[field];
    }
    if (patch.archived !== undefined) next.archived = patch.archived === true;
    if (patch.sortOrder !== undefined) {
      if (!Number.isFinite(patch.sortOrder)) throw new LedgerError('INVALID_AMOUNT', 'sortOrder must be a number');
      next.sortOrder = patch.sortOrder;
    }

    await db.categories.put(next);
    return next;
  });
}

/**
 * Deletes a category and its budget. A category that transactions still use
 * can only be deleted by moving them to `reassignTo` (same kind); otherwise
 * archive it. Subcategories must be moved or deleted first.
 */
export async function deleteCategory(
  db: LedgerDB,
  id: string,
  { reassignTo }: { reassignTo?: string } = {},
): Promise<void> {
  await db.transaction('rw', [db.categories, db.transactions, db.budgets, db.recurring], async () => {
    const category = await getCategory(db, id);
    if ((await db.categories.where('parentId').equals(id).count()) > 0) {
      throw new LedgerError('CATEGORY_IN_USE', 'Category has subcategories');
    }

    const used = db.transactions.where('categoryId').equals(id);
    const rules = () => db.recurring.filter((rule) => rule.template.categoryId === id);
    const usedCount = await used.count();
    if (usedCount > 0 && reassignTo === undefined) {
      throw new LedgerError('CATEGORY_IN_USE', 'Category has transactions; reassign them or archive it');
    }
    if (reassignTo !== undefined && (usedCount > 0 || (await rules().count()) > 0)) {
      const target = await getCategory(db, reassignTo);
      if (target.id === id) throw new LedgerError('CATEGORY_IN_USE', 'Cannot reassign to the category being deleted');
      if (target.kind !== category.kind) throw new LedgerError('CATEGORY_KIND_MISMATCH');
    }

    const now = Date.now();
    if (usedCount > 0) await used.modify({ categoryId: reassignTo, updatedAt: now });
    // Recurring rules follow their entries to the new category, or become uncategorized.
    await rules().modify((rule) => {
      const template = { ...rule.template };
      if (reassignTo === undefined) delete template.categoryId;
      else template.categoryId = reassignTo;
      rule.template = template;
      rule.updatedAt = now;
    });
    await db.budgets.where('categoryId').equals(id).delete();
    await db.categories.delete(id);
  });
}

async function requireValidParent(db: LedgerDB, parentId: string, kind: CategoryKind): Promise<void> {
  const parent = await db.categories.get(parentId);
  if (!parent) throw new LedgerError('INVALID_CATEGORY_PARENT', `Parent ${parentId} not found`);
  if (parent.kind !== kind) throw new LedgerError('INVALID_CATEGORY_PARENT', 'Parent must be the same kind');
  if (parent.parentId !== undefined) {
    throw new LedgerError('INVALID_CATEGORY_PARENT', 'Categories nest at most one level deep');
  }
}

async function requireUniqueName(
  db: LedgerDB,
  { kind, name, parentId, exceptId }: { kind: CategoryKind; name: string; parentId?: string; exceptId?: string },
): Promise<void> {
  const lowered = name.toLocaleLowerCase();
  const clash = await db.categories
    .where('kind')
    .equals(kind)
    .filter(
      (c) => c.id !== exceptId && c.parentId === parentId && c.name.toLocaleLowerCase() === lowered,
    )
    .first();
  if (clash) throw new LedgerError('DUPLICATE_NAME', `A category named "${name}" already exists`);
}
