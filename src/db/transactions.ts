import { db } from '.';
import { TransactionType } from '../types';
import type { Transaction } from '../types';
import { updateAccountBalance } from './accounts';
import { OfflineSyncService } from '../services/offlineSyncService';

export const addTransaction = async (transaction: Transaction) => {
  // Add the transaction to the database
  const transactionId = await db.transactions.add(transaction);
  
  // Update account balance
  const isIncome = transaction.type === TransactionType.INCOME;
  let amountToUpdate = transaction.amount;
  
  // If it's a cross-currency transaction, use the converted amount
  if (transaction.exchangeRate) {
    amountToUpdate = transaction.amount * transaction.exchangeRate;
  }
  
  await updateAccountBalance(transaction.accountId, amountToUpdate, isIncome);
  
  // Record offline operation for sync
  await OfflineSyncService.recordOfflineOperation('transactions', 'create', {
    ...transaction,
    id: transactionId
  });
  
  return transactionId;
};

export const getAllTransactions = async () => {
  return await db.transactions.toArray();
};

export const getTransactionsByAccountId = async (accountId: number) => {
  return await db.transactions.where('accountId').equals(accountId).toArray();
}

export const updateTransaction = async (id: number, updatedTransaction: Partial<Transaction>) => {
  const result = await db.transactions.update(id, updatedTransaction);
  
  // Record offline operation for sync
  await OfflineSyncService.recordOfflineOperation('transactions', 'update', {
    id,
    ...updatedTransaction
  });
  
  return result;
};

export const deleteTransaction = async (id: number) => {
  const result = await db.transactions.delete(id);
  
  // Record offline operation for sync
  await OfflineSyncService.recordOfflineOperation('transactions', 'delete', { id });
  
  return result;
};
