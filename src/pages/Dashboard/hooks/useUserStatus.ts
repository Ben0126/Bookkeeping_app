import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllAccounts } from '../../../db/accounts';
import { getAllTransactions } from '../../../db/transactions';
import type { UserStatus, UserStatusResult, UseUserStatusReturn } from '../types';

/**
 * 用戶狀態檢測Hook
 * 基於帳戶數量、交易記錄判斷用戶狀態
 */
export const useUserStatus = (): UseUserStatusReturn => {
  const [userStatus, setUserStatus] = useState<UserStatus>('new');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);
  const [hasAnyData, setHasAnyData] = useState(false);
  const [transitionReady, setTransitionReady] = useState(false);

  // 使用LiveQuery獲取實時數據
  const accounts = useLiveQuery(getAllAccounts) || [];
  const transactions = useLiveQuery(getAllTransactions) || [];

  // 檢測用戶狀態
  const detectUserStatus = (): UserStatusResult => {
    const accountCount = accounts.length;
    const transactionCount = transactions.length;
    const hasAccounts = accountCount > 0;
    const hasTransactions = transactionCount > 0;
    
    // 獲取最後一筆交易日期
    const lastTransactionDate = transactions.length > 0 
      ? new Date(Math.max(...transactions.map(tx => new Date(tx.date).getTime())))
      : undefined;

    // 判斷用戶狀態的邏輯
    let status: UserStatus = 'new';
    
    if (!hasAccounts && !hasTransactions) {
      status = 'new'; // 新用戶：沒有帳戶和交易
    } else if (hasAccounts && transactionCount < 10) {
      status = 'active'; // 活躍用戶：有帳戶但交易較少
    } else if (hasAccounts && transactionCount >= 10) {
      status = 'experienced'; // 經驗用戶：有帳戶且交易較多
    }

    return {
      status,
      hasAccounts,
      hasTransactions,
      accountCount,
      transactionCount,
      lastTransactionDate
    };
  };

  // 刷新用戶狀態
  const refresh = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = detectUserStatus();
      setUserStatus(result.status);
      
      // 更新首次使用狀態
      const isFirstTime = result.status === 'new';
      setIsFirstTimeUser(isFirstTime);
      
      // 更新數據存在狀態
      const hasData = result.hasAccounts || result.hasTransactions;
      setHasAnyData(hasData);
      
      // 設置過渡準備狀態
      setTransitionReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '檢測用戶狀態時發生錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  // 當數據變化時自動更新狀態
  useEffect(() => {
    if (accounts !== undefined && transactions !== undefined) {
      refresh();
    }
  }, [accounts, transactions]);

  return {
    userStatus,
    isLoading,
    error,
    refresh,
    isFirstTimeUser,
    hasAnyData,
    transitionReady
  };
};

/**
 * 獲取用戶狀態的詳細信息
 */
export const useUserStatusDetails = () => {
  const accounts = useLiveQuery(getAllAccounts) || [];
  const transactions = useLiveQuery(getAllTransactions) || [];
  
  return {
    accountCount: accounts.length,
    transactionCount: transactions.length,
    hasAccounts: accounts.length > 0,
    hasTransactions: transactions.length > 0,
    lastTransactionDate: transactions.length > 0 
      ? new Date(Math.max(...transactions.map(tx => new Date(tx.date).getTime())))
      : undefined,
    firstAccountDate: accounts.length > 0 
      ? new Date(Math.min(...accounts.map(() => new Date().getTime())))
      : undefined,
    firstTransactionDate: transactions.length > 0 
      ? new Date(Math.min(...transactions.map(tx => new Date(tx.date).getTime())))
      : undefined
  };
};
