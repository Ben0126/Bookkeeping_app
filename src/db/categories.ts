import { db } from '.';
import { TransactionType } from '../types';
import type { Category } from '../types';

export const addCategory = async (category: Category) => {
  return await db.categories.add(category);
};

export const getAllCategories = async () => {
  return await db.categories.toArray();
};

export const getCategoriesByType = async (type: TransactionType) => {
  return await db.categories.where('type').equals(type).toArray();
};

export const updateCategory = async (id: number, updatedCategory: Partial<Category>) => {
  return await db.categories.update(id, updatedCategory);
};

export const deleteCategory = async (id: number) => {
  return await db.categories.delete(id);
};

// Clean up duplicate categories
export const cleanupDuplicateCategories = async () => {
  const allCategories = await getAllCategories();
  const seen = new Set<string>();
  const toDelete: number[] = [];
  
  for (const category of allCategories) {
    const key = `${category.name}-${category.type}`;
    if (seen.has(key)) {
      if (category.id) {
        toDelete.push(category.id);
      }
    } else {
      seen.add(key);
    }
  }
  
  for (const id of toDelete) {
    await deleteCategory(id);
  }
};

// Initialize default categories
export const initializeDefaultCategories = async () => {
  // First clean up any duplicates
  await cleanupDuplicateCategories();
  
  const existingCategories = await getAllCategories();
  
  if (existingCategories.length === 0) {
    const defaultCategories: Omit<Category, 'id'>[] = [
      // Income categories
      { name: 'Salary', type: TransactionType.INCOME },
      { name: 'Allowance', type: TransactionType.INCOME },
      { name: 'Scholarship', type: TransactionType.INCOME },
      { name: 'Investment', type: TransactionType.INCOME },
      { name: 'Other Income', type: TransactionType.INCOME },
      
      // Expense categories
      { name: 'Tuition', type: TransactionType.EXPENSE },
      { name: 'Groceries', type: TransactionType.EXPENSE },
      { name: 'Dining', type: TransactionType.EXPENSE },
      { name: 'Transportation', type: TransactionType.EXPENSE },
      { name: 'Housing', type: TransactionType.EXPENSE },
      { name: 'Entertainment', type: TransactionType.EXPENSE },
      { name: 'Utilities', type: TransactionType.EXPENSE },
      { name: 'Health', type: TransactionType.EXPENSE },
      { name: 'Communication', type: TransactionType.EXPENSE },
      { name: 'Other Expense', type: TransactionType.EXPENSE },
    ];
    
    for (const category of defaultCategories) {
      await addCategory(category);
    }
  }
};
