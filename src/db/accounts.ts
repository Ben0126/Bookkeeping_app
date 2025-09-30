import { db } from '.';
import type { Account } from '../types';

export const addAccount = async (account: Account) => {
  return await db.accounts.add(account);
};

export const getAllAccounts = async () => {
  return await db.accounts.toArray();
};

export const updateAccount = async (id: number, updatedAccount: Partial<Account>) => {
  return await db.accounts.update(id, updatedAccount);
};

export const deleteAccount = async (id: number) => {
  return await db.accounts.delete(id);
};

export const updateAccountBalance = async (accountId: number, amount: number, isIncome: boolean) => {
  const account = await db.accounts.get(accountId);
  if (!account) return;
  
  const newBalance = isIncome ? account.balance + amount : account.balance - amount;
  return await db.accounts.update(accountId, { balance: newBalance });
};
