import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllAccounts } from '../../../db/accounts';
import { getAllTransactions } from '../../../db/transactions';
import { getAllCategories } from '../../../db/categories';
import { useUserStatus } from './useUserStatus';
import type { 
  DashboardData, 
  MultiCurrencyFinancialOverview,
  AccountSummary, 
  RecentTransaction, 
  StatisticsPreview, 
  NotificationSummary, 
  QuickAction,
  UseDashboardDataReturn 
} from '../types';
import { TransactionType } from '../../../types';

/**
 * 儀表板數據管理Hook
 * 統一管理所有儀表板相關數據
 */
export const useDashboardData = (): UseDashboardDataReturn => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 獲取基礎數據
  const accounts = useLiveQuery(getAllAccounts) || [];
  const transactions = useLiveQuery(getAllTransactions) || [];
  const categories = useLiveQuery(getAllCategories) || [];
  const { userStatus } = useUserStatus();

  // 計算財務概覽（按貨幣分組）
  const financialOverview = useMemo((): MultiCurrencyFinancialOverview => {
    if (accounts.length === 0) {
      return {};
    }

    // 計算本月收支
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= startOfMonth && txDate <= endOfMonth;
    });

    // 按貨幣分組計算
    const currencyData: { [currency: string]: { 
      totalAssets: number; 
      monthlyIncome: number; 
      monthlyExpense: number; 
    } } = {};

    // 計算帳戶餘額
    accounts.forEach(account => {
      if (!currencyData[account.currency]) {
        currencyData[account.currency] = { totalAssets: 0, monthlyIncome: 0, monthlyExpense: 0 };
      }
      currencyData[account.currency].totalAssets += account.balance;
    });

    // 計算本月收支
    monthlyTransactions.forEach(tx => {
      if (!currencyData[tx.currency]) {
        currencyData[tx.currency] = { totalAssets: 0, monthlyIncome: 0, monthlyExpense: 0 };
      }
      
      if (tx.type === TransactionType.INCOME) {
        currencyData[tx.currency].monthlyIncome += tx.amount;
      } else if (tx.type === TransactionType.EXPENSE) {
        currencyData[tx.currency].monthlyExpense += tx.amount;
      }
    });

    // 轉換為最終格式
    const result: MultiCurrencyFinancialOverview = {};
    Object.keys(currencyData).forEach(currency => {
      const data = currencyData[currency];
      result[currency] = {
        totalAssets: data.totalAssets,
        monthlyIncome: data.monthlyIncome,
        monthlyExpense: data.monthlyExpense,
        netWorthChange: data.monthlyIncome - data.monthlyExpense,
        currency
      };
    });

    return result;
  }, [accounts, transactions]);

  // 計算帳戶摘要
  const accountSummaries = useMemo((): AccountSummary[] => {
    return accounts.slice(0, 5).map(account => ({
      id: account.id!,
      name: account.name,
      type: account.type,
      balance: account.balance,
      currency: account.currency,
      color: account.color
    }));
  }, [accounts]);

  // 計算最近交易
  const recentTransactions = useMemo((): RecentTransaction[] => {
    return transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(tx => {
        const category = categories.find(cat => cat.id === tx.categoryId);
        const account = accounts.find(acc => acc.id === tx.accountId);
        
        return {
          id: tx.id!,
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency,
          date: new Date(tx.date),
          categoryName: category?.name || '未知分類',
          accountName: account?.name || '未知帳戶',
          notes: tx.notes
        };
      });
  }, [transactions, categories, accounts]);

  // 計算統計預覽
  const statisticsPreview = useMemo((): StatisticsPreview => {
    if (transactions.length === 0) {
      return {
        incomeExpenseRatio: 0,
        topCategories: [],
        monthlyTrend: 'stable',
        trendPercentage: 0
      };
    }

    // 計算收支比例
    const totalIncome = transactions
      .filter(tx => tx.type === TransactionType.INCOME)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalExpense = transactions
      .filter(tx => tx.type === TransactionType.EXPENSE)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const incomeExpenseRatio = totalExpense > 0 ? totalIncome / totalExpense : 0;

    // 計算熱門分類
    const categoryStats: { [key: string]: { name: string; amount: number } } = {};
    transactions
      .filter(tx => tx.type === TransactionType.EXPENSE)
      .forEach(tx => {
        const category = categories.find(cat => cat.id === tx.categoryId);
        const categoryName = category?.name || '未知分類';
        
        if (!categoryStats[categoryName]) {
          categoryStats[categoryName] = { name: categoryName, amount: 0 };
        }
        categoryStats[categoryName].amount += tx.amount;
      });

    const topCategories = Object.values(categoryStats)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map(cat => ({
        name: cat.name,
        amount: cat.amount,
        percentage: totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0
      }));

    // 簡化的月度趨勢計算
    const monthlyTrend: 'up' | 'down' | 'stable' = 'stable';
    const trendPercentage = 0;

    return {
      incomeExpenseRatio,
      topCategories,
      monthlyTrend,
      trendPercentage
    };
  }, [transactions, categories]);

  // 計算通知摘要（簡化版本）
  const notificationSummaries = useMemo((): NotificationSummary[] => {
    // 這裡返回空數組，實際應該從通知服務獲取
    return [];
  }, []);

  // 計算快速操作
  const quickActions = useMemo((): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        id: 'add-transaction',
        title: '新增交易',
        description: '記錄新的收入或支出',
        icon: '💰',
        path: '/transactions',
        color: 'blue'
      },
      {
        id: 'add-account',
        title: '新增帳戶',
        description: '添加新的銀行帳戶',
        icon: '💳',
        path: '/accounts',
        color: 'green'
      },
      {
        id: 'view-statistics',
        title: '查看統計',
        description: '分析財務數據',
        icon: '📊',
        path: '/statistics',
        color: 'purple'
      },
      {
        id: 'settings',
        title: '設定',
        description: '應用程式設定',
        icon: '⚙️',
        path: '/settings',
        color: 'gray'
      }
    ];

    // 根據用戶狀態調整快速操作
    if (userStatus === 'new') {
      return baseActions.slice(0, 2); // 新用戶只顯示基本操作
    }

    return baseActions;
  }, [userStatus]);

  // 組合所有數據
  const data = useMemo((): DashboardData | null => {
    if (accounts === undefined || transactions === undefined || categories === undefined) {
      return null;
    }

    return {
      userStatus,
      financialOverview,
      accountSummaries,
      recentTransactions,
      statisticsPreview,
      notificationSummaries,
      quickActions
    };
  }, [
    userStatus,
    financialOverview,
    accountSummaries,
    recentTransactions,
    statisticsPreview,
    notificationSummaries,
    quickActions
  ]);

  // 刷新數據
  const refresh = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 數據會通過LiveQuery自動更新
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新數據時發生錯誤');
      setIsLoading(false);
    }
  };

  // 監聽數據變化
  useEffect(() => {
    if (accounts !== undefined && transactions !== undefined && categories !== undefined) {
      setIsLoading(false);
      setError(null);
    }
  }, [accounts, transactions, categories]);

  return {
    data,
    isLoading,
    error,
    refresh
  };
};
