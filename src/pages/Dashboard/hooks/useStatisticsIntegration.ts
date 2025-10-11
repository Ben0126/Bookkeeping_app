import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllTransactions } from '../../../db/transactions';
import { getAllAccounts } from '../../../db/accounts';
import { getAllCategories } from '../../../db/categories';
import { TransactionType } from '../../../types';
// import type { Transaction, Account, Category } from '../../../types';
// 暫時移除未實現的函數導入
// import { 
//   calculateCategoryStatsByCurrency, 
//   calculateTrendDataByCurrency,
//   calculateFinancialMetricsByCurrency 
// } from '../utils/dashboardCalculations';

/**
 * 統計整合Hook
 * 整合現有Statistics頁面的邏輯到Dashboard
 */
export const useStatisticsIntegration = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 獲取基礎數據
  const transactions = useLiveQuery(getAllTransactions) || [];
  const accounts = useLiveQuery(getAllAccounts) || [];
  const categories = useLiveQuery(getAllCategories) || [];

  // 計算日期範圍
  const getDateRange = (period: 'week' | 'month' | 'quarter' | 'year') => {
    const now = new Date();
    const start = new Date();
    
    switch (period) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return { start, end: now };
  };

  // 篩選時間範圍內的交易
  const filteredTransactions = useMemo(() => {
    const { start, end } = getDateRange(selectedPeriod);
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= start && txDate <= end;
    });
  }, [transactions, selectedPeriod]);

  // 計算收支總額（按貨幣分組）
  const incomeExpenseByCurrency = useMemo(() => {
    const result: { [currency: string]: { income: number; expense: number; balance: number } } = {};
    
    filteredTransactions.forEach(tx => {
      if (!result[tx.currency]) {
        result[tx.currency] = { income: 0, expense: 0, balance: 0 };
      }
      
      if (tx.type === TransactionType.INCOME) {
        result[tx.currency].income += tx.amount;
      } else if (tx.type === TransactionType.EXPENSE) {
        result[tx.currency].expense += tx.amount;
      }
    });

    // 計算淨值
    Object.keys(result).forEach(currency => {
      result[currency].balance = result[currency].income - result[currency].expense;
    });

    return result;
  }, [filteredTransactions]);

  // 計算分類統計（按貨幣分組）
  const categoryStatsByCurrency = useMemo(() => {
    // 暫時返回空對象，等待實現
    return {};
  }, [filteredTransactions, categories]);

  // 計算趨勢數據（按貨幣分組）
  const trendDataByCurrency = useMemo(() => {
    // 暫時返回空對象，等待實現
    return {};
  }, [transactions, selectedPeriod]);

  // 計算財務指標（按貨幣分組）
  const financialMetricsByCurrency = useMemo(() => {
    // 暫時返回空對象，等待實現
    return {};
  }, [accounts, transactions]);

  // 計算帳戶統計
  const accountStats = useMemo(() => {
    const stats: { [currency: string]: { total: number; count: number } } = {};
    
    accounts.forEach(account => {
      if (!stats[account.currency]) {
        stats[account.currency] = { total: 0, count: 0 };
      }
      stats[account.currency].total += account.balance;
      stats[account.currency].count += 1;
    });

    return stats;
  }, [accounts]);

  // 準備月度對比數據
  const monthlyData = useMemo(() => {
    const monthlyData: { [key: string]: { [currency: string]: { income: number; expense: number } } } = {};

    transactions.forEach(tx => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {};
      }
      
      if (!monthlyData[monthKey][tx.currency]) {
        monthlyData[monthKey][tx.currency] = { income: 0, expense: 0 };
      }

      if (tx.type === TransactionType.INCOME) {
        monthlyData[monthKey][tx.currency].income += tx.amount;
      } else if (tx.type === TransactionType.EXPENSE) {
        monthlyData[monthKey][tx.currency].expense += tx.amount;
      }
    });

    return Object.entries(monthlyData)
      .map(([month, currencies]) => ({
        month: new Date(month + '-01').toLocaleDateString(undefined, { 
          year: 'numeric', 
          month: 'short' 
        }),
        currencies
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // 顯示最近6個月
  }, [transactions]);

  return {
    // 狀態
    selectedPeriod,
    setSelectedPeriod,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    
    // 數據
    transactions,
    accounts,
    categories,
    filteredTransactions,
    
    // 統計結果
    incomeExpenseByCurrency,
    categoryStatsByCurrency,
    trendDataByCurrency,
    financialMetricsByCurrency,
    accountStats,
    monthlyData,
    
    // 工具函數
    getDateRange
  };
};
