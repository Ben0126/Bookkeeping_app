import type { Account, Transaction, Category } from '../../../types';
import type { FinancialOverview, FinancialMetrics } from '../types';
import { TransactionType } from '../../../types';

/**
 * 儀表板計算工具函數
 * 提供各種財務計算和數據處理功能
 */

/**
 * 獲取貨幣符號
 */
export const getCurrencySymbol = (currency: string): string => {
  const symbols: { [key: string]: string } = {
    USD: '$',
    TWD: 'NT$',
    GBP: '£',
    AUD: 'A$',
    EUR: '€',
    JPY: '¥',
    CAD: 'C$',
    CHF: 'CHF',
    CNY: '¥',
    HKD: 'HK$',
    SGD: 'S$',
    NZD: 'NZ$'
  };
  
  return symbols[currency] || currency;
};

/**
 * 計算總資產（按貨幣分組）
 */
export const calculateTotalAssetsByCurrency = (accounts: Account[]): { [currency: string]: number } => {
  const totals: { [currency: string]: number } = {};
  
  accounts.forEach(account => {
    if (!totals[account.currency]) {
      totals[account.currency] = 0;
    }
    totals[account.currency] += account.balance;
  });
  
  return totals;
};

/**
 * 計算指定時間範圍內的收支（按貨幣分組）
 */
export const calculateIncomeExpenseByCurrency = (
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): { [currency: string]: { income: number; expense: number; net: number } } => {
  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= startDate && txDate <= endDate;
  });

  const results: { [currency: string]: { income: number; expense: number; net: number } } = {};

  filteredTransactions.forEach(tx => {
    if (!results[tx.currency]) {
      results[tx.currency] = { income: 0, expense: 0, net: 0 };
    }

    if (tx.type === TransactionType.INCOME) {
      results[tx.currency].income += tx.amount;
    } else if (tx.type === TransactionType.EXPENSE) {
      results[tx.currency].expense += tx.amount;
    }
  });

  // 計算淨值
  Object.keys(results).forEach(currency => {
    results[currency].net = results[currency].income - results[currency].expense;
  });

  return results;
};

/**
 * 計算本月財務概覽（按貨幣分組）
 */
export const calculateMonthlyOverviewByCurrency = (
  accounts: Account[],
  transactions: Transaction[]
): { [currency: string]: FinancialOverview } => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const totalAssetsByCurrency = calculateTotalAssetsByCurrency(accounts);
  const monthlyDataByCurrency = calculateIncomeExpenseByCurrency(transactions, startOfMonth, endOfMonth);

  const results: { [currency: string]: FinancialOverview } = {};

  // 合併所有貨幣的數據
  const allCurrencies = new Set([
    ...Object.keys(totalAssetsByCurrency),
    ...Object.keys(monthlyDataByCurrency)
  ]);

  allCurrencies.forEach(currency => {
    results[currency] = {
      totalAssets: totalAssetsByCurrency[currency] || 0,
      monthlyIncome: monthlyDataByCurrency[currency]?.income || 0,
      monthlyExpense: monthlyDataByCurrency[currency]?.expense || 0,
      netWorthChange: monthlyDataByCurrency[currency]?.net || 0,
      currency
    };
  });

  return results;
};

/**
 * 計算財務指標（按貨幣分組）
 */
export const calculateFinancialMetricsByCurrency = (
  accounts: Account[],
  transactions: Transaction[]
): { [currency: string]: FinancialMetrics } => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // 上個月數據
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const totalAssetsByCurrency = calculateTotalAssetsByCurrency(accounts);
  const monthlyDataByCurrency = calculateIncomeExpenseByCurrency(transactions, startOfMonth, endOfMonth);
  const lastMonthDataByCurrency = calculateIncomeExpenseByCurrency(transactions, startOfLastMonth, endOfLastMonth);

  const results: { [currency: string]: FinancialMetrics } = {};

  // 合併所有貨幣的數據
  const allCurrencies = new Set([
    ...Object.keys(totalAssetsByCurrency),
    ...Object.keys(monthlyDataByCurrency),
    ...Object.keys(lastMonthDataByCurrency)
  ]);

  allCurrencies.forEach(currency => {
    const monthlyData = monthlyDataByCurrency[currency] || { income: 0, expense: 0, net: 0 };
    const lastMonthData = lastMonthDataByCurrency[currency] || { income: 0, expense: 0, net: 0 };

    // 計算儲蓄率
    const savingsRate = monthlyData.income > 0 
      ? ((monthlyData.income - monthlyData.expense) / monthlyData.income) * 100 
      : 0;

    // 計算支出增長率
    const expenseGrowth = lastMonthData.expense > 0 
      ? ((monthlyData.expense - lastMonthData.expense) / lastMonthData.expense) * 100 
      : 0;

    // 計算收入增長率
    const incomeGrowth = lastMonthData.income > 0 
      ? ((monthlyData.income - lastMonthData.income) / lastMonthData.income) * 100 
      : 0;

    results[currency] = {
      totalAssets: totalAssetsByCurrency[currency] || 0,
      monthlyIncome: monthlyData.income,
      monthlyExpense: monthlyData.expense,
      netWorthChange: monthlyData.net,
      savingsRate,
      expenseGrowth,
      incomeGrowth
    };
  });

  return results;
};

/**
 * 按分類統計支出（按貨幣分組）
 */
export const calculateCategoryStatsByCurrency = (
  transactions: Transaction[],
  categories: Category[],
  startDate?: Date,
  endDate?: Date
): { [currency: string]: Array<{ name: string; amount: number; percentage: number; count: number }> } => {
  let filteredTransactions = transactions.filter(tx => tx.type === TransactionType.EXPENSE);
  
  if (startDate && endDate) {
    filteredTransactions = filteredTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= startDate && txDate <= endDate;
    });
  }

  const results: { [currency: string]: { [categoryName: string]: { name: string; amount: number; count: number } } } = {};
  
  filteredTransactions.forEach(tx => {
    const category = categories.find(cat => cat.id === tx.categoryId);
    const categoryName = category?.name || '未知分類';
    
    if (!results[tx.currency]) {
      results[tx.currency] = {};
    }
    
    if (!results[tx.currency][categoryName]) {
      results[tx.currency][categoryName] = { name: categoryName, amount: 0, count: 0 };
    }
    
    results[tx.currency][categoryName].amount += tx.amount;
    results[tx.currency][categoryName].count += 1;
  });

  // 計算百分比並排序
  const finalResults: { [currency: string]: Array<{ name: string; amount: number; percentage: number; count: number }> } = {};
  
  Object.keys(results).forEach(currency => {
    const categoryStats = results[currency];
    const totalExpense = Object.values(categoryStats).reduce((sum, stat) => sum + stat.amount, 0);

    finalResults[currency] = Object.values(categoryStats)
      .map(stat => ({
        name: stat.name,
        amount: stat.amount,
        percentage: totalExpense > 0 ? (stat.amount / totalExpense) * 100 : 0,
        count: stat.count
      }))
      .sort((a, b) => b.amount - a.amount);
  });

  return finalResults;
};

/**
 * 計算趨勢數據（按貨幣分組）
 */
export const calculateTrendDataByCurrency = (
  transactions: Transaction[],
  period: 'week' | 'month' | 'quarter' | 'year'
): { [currency: string]: Array<{ date: string; income: number; expense: number; net: number }> } => {
  const now = new Date();
  const startDate = new Date();
  
  switch (period) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= startDate && txDate <= now;
  });

  // 按貨幣和日期分組
  const results: { [currency: string]: { [dateKey: string]: { income: number; expense: number } } } = {};
  
  filteredTransactions.forEach(tx => {
    const dateKey = new Date(tx.date).toLocaleDateString();
    
    if (!results[tx.currency]) {
      results[tx.currency] = {};
    }
    
    if (!results[tx.currency][dateKey]) {
      results[tx.currency][dateKey] = { income: 0, expense: 0 };
    }
    
    if (tx.type === TransactionType.INCOME) {
      results[tx.currency][dateKey].income += tx.amount;
    } else if (tx.type === TransactionType.EXPENSE) {
      results[tx.currency][dateKey].expense += tx.amount;
    }
  });

  // 轉換為最終格式
  const finalResults: { [currency: string]: Array<{ date: string; income: number; expense: number; net: number }> } = {};
  
  Object.keys(results).forEach(currency => {
    const groups = results[currency];
    
    finalResults[currency] = Object.entries(groups)
      .map(([date, data]) => ({
        date,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  return finalResults;
};

/**
 * 格式化金額顯示
 */
export const formatCurrency = (amount: number, currency: string = 'USD', locale: string = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * 格式化百分比顯示
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * 獲取趨勢圖標
 */
export const getTrendIcon = (value: number): string => {
  if (value > 0) return '📈';
  if (value < 0) return '📉';
  return '➡️';
};

/**
 * 獲取趨勢顏色
 */
export const getTrendColor = (value: number): string => {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
};
