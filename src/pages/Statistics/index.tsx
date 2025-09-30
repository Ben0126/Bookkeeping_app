import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllTransactions } from '../../db/transactions';
import { getAllAccounts } from '../../db/accounts';
import { getAllCategories } from '../../db/categories';
import { TransactionType } from '../../types';
import type { Transaction, Account, Category } from '../../types';
import { CategoryPieChart, TrendChart, AccountBalanceChart, MonthlyComparisonChart } from '../../components/Charts';
// import { ResponsiveTitle } from '../../components/ResponsiveLayout'; // 預留響應式標題功能

// 統計分析工具函數
const StatisticsUtils = {
  // 計算日期範圍
  getDateRange: (period: 'week' | 'month' | 'quarter' | 'year') => {
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
  },
  
  // 篩選時間範圍內的交易
  filterTransactionsByPeriod: (
    transactions: Transaction[], 
    period: 'week' | 'month' | 'quarter' | 'year' | 'custom',
    customStart?: string,
    customEnd?: string
  ) => {
    if (period === 'custom') {
      if (!customStart || !customEnd) return transactions;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      // 設定結束日期為當天的23:59:59
      end.setHours(23, 59, 59, 999);
      return transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= start && txDate <= end;
      });
    }
    
    const { start, end } = StatisticsUtils.getDateRange(period);
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= start && txDate <= end;
    });
  },
  
  // 計算收支總額
  calculateIncomeExpense: (transactions: Transaction[]) => {
    const income = transactions
      .filter(tx => tx.type === TransactionType.INCOME)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const expense = transactions
      .filter(tx => tx.type === TransactionType.EXPENSE)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    return { income, expense, balance: income - expense };
  },
  
  // 按分類統計支出
  calculateCategoryStats: (transactions: Transaction[], categories: Category[]) => {
    const expenseTransactions = transactions.filter(tx => tx.type === TransactionType.EXPENSE);
    const categoryStats: { [key: string]: { name: string; amount: number; count: number } } = {};
    
    expenseTransactions.forEach(tx => {
      const category = categories.find(cat => cat.id === tx.categoryId);
      const categoryName = category?.name || 'Unknown';
      
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = { name: categoryName, amount: 0, count: 0 };
      }
      
      categoryStats[categoryName].amount += tx.amount;
      categoryStats[categoryName].count += 1;
    });
    
    return Object.values(categoryStats).sort((a, b) => b.amount - a.amount);
  },
  
  // 按帳戶統計餘額
  calculateAccountStats: (accounts: Account[]) => {
    const totalUSD = accounts
      .filter(acc => acc.currency === 'USD')
      .reduce((sum, acc) => sum + acc.balance, 0);
    
    const totalTWD = accounts
      .filter(acc => acc.currency === 'TWD')
      .reduce((sum, acc) => sum + acc.balance, 0);
    
    return { totalUSD, totalTWD, accounts: accounts.length };
  },

  // 準備趨勢圖表數據
  prepareTrendData: (transactions: Transaction[], period: 'week' | 'month' | 'quarter' | 'year' | 'custom') => {
    if (transactions.length === 0) return [];

    // 根據期間決定分組方式
    const groupBy = period === 'week' ? 'day' : period === 'year' ? 'month' : 'day';
    const groups: { [key: string]: { income: number; expense: number } } = {};

    transactions.forEach(tx => {
      const date = new Date(tx.date);
      let key: string;

      if (groupBy === 'day') {
        key = date.toLocaleDateString();
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groups[key]) {
        groups[key] = { income: 0, expense: 0 };
      }

      if (tx.type === TransactionType.INCOME) {
        groups[key].income += tx.amount;
      } else if (tx.type === TransactionType.EXPENSE) {
        groups[key].expense += tx.amount;
      }
    });

    return Object.entries(groups)
      .map(([date, data]) => ({
        date,
        income: data.income,
        expense: data.expense,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10); // 只顯示最近10個數據點
  },

  // 準備帳戶餘額圖表數據
  prepareAccountBalanceData: (accounts: Account[]) => {
    return accounts.map(account => ({
      name: account.name.length > 15 ? account.name.substring(0, 15) + '...' : account.name,
      balance: account.balance,
      currency: account.currency,
    }));
  },

  // 準備月度對比數據
  prepareMonthlyData: (transactions: Transaction[]) => {
    const monthlyData: { [key: string]: { income: number; expense: number } } = {};

    transactions.forEach(tx => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0 };
      }

      if (tx.type === TransactionType.INCOME) {
        monthlyData[monthKey].income += tx.amount;
      } else if (tx.type === TransactionType.EXPENSE) {
        monthlyData[monthKey].expense += tx.amount;
      }
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString(undefined, { 
          year: 'numeric', 
          month: 'short' 
        }),
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // 顯示最近6個月
  }
};

const StatisticsPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  // 響應式設計相關變數 (目前未使用，但保留以備將來擴展)
  // const { deviceType, isMobile, isTablet, isDesktop } = useResponsive();
  
  const transactions = useLiveQuery(getAllTransactions) || [];
  const accounts = useLiveQuery(getAllAccounts) || [];
  const categories = useLiveQuery(getAllCategories) || [];
  
  // 篩選時間範圍內的交易
  const filteredTransactions = StatisticsUtils.filterTransactionsByPeriod(
    transactions, 
    selectedPeriod, 
    customStartDate, 
    customEndDate
  );
  
  // 計算統計數據
  const { income, expense, balance } = StatisticsUtils.calculateIncomeExpense(filteredTransactions);
  const categoryStats = StatisticsUtils.calculateCategoryStats(filteredTransactions, categories);
  const accountStats = StatisticsUtils.calculateAccountStats(accounts);

  // 準備圖表數據
  const trendData = StatisticsUtils.prepareTrendData(filteredTransactions, selectedPeriod);
  const accountBalanceData = StatisticsUtils.prepareAccountBalanceData(accounts);
  const monthlyData = StatisticsUtils.prepareMonthlyData(transactions); // 使用全部交易數據來顯示歷史趨勢
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
        <p className="text-gray-600 text-sm">Analyze your financial data</p>
      </div>

      {/* Period Selector */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Time Period</h2>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['week', 'month', 'quarter'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`p-3 rounded-lg text-sm font-medium capitalize ${
                selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => setSelectedPeriod('year')}
            className={`p-3 rounded-lg text-sm font-medium capitalize ${
              selectedPeriod === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Year
          </button>
          <button
            onClick={() => setSelectedPeriod('custom')}
            className={`p-3 rounded-lg text-sm font-medium ${
              selectedPeriod === 'custom'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Custom Date Range Selector */}
        {selectedPeriod === 'custom' && (
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="text-sm font-medium text-purple-800 mb-3">Select Date Range</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-purple-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="block w-full p-2 text-sm border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-purple-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="block w-full p-2 text-sm border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            {customStartDate && customEndDate && (
              <div className="mt-3 p-2 bg-purple-100 rounded text-xs text-purple-800">
                <strong>Selected Range:</strong> {new Date(customStartDate).toLocaleDateString()} - {new Date(customEndDate).toLocaleDateString()}
                <br />
                <strong>Duration:</strong> {Math.ceil((new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
              </div>
            )}
          </div>
        )}
      </div>

      {/* Income vs Expense Overview */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Income vs Expense</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }).format(income)}
            </div>
            <div className="text-sm text-gray-600">Income</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }).format(expense)}
            </div>
            <div className="text-sm text-gray-600">Expense</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }).format(balance)}
            </div>
            <div className="text-sm text-gray-600">Net Balance</div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Income vs Expense Trend</h2>
        <TrendChart data={trendData} />
      </div>

      {/* Category Breakdown with Chart */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Expense by Category</h2>
        
        {categoryStats.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No expense data available</p>
            <p className="text-sm">Add some expense transactions to see category breakdown</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pie Chart */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Category Distribution</h3>
              <CategoryPieChart data={categoryStats} />
            </div>
            
            {/* Category List */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Category Details</h3>
              <div className="space-y-3">
                {categoryStats.map((stat, index) => (
                  <div key={stat.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500" style={{
                        backgroundColor: `hsl(${(index * 360) / categoryStats.length}, 70%, 50%)`
                      }}></div>
                      <div>
                        <div className="font-medium text-gray-900">{stat.name}</div>
                        <div className="text-sm text-gray-600">{stat.count} transactions</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {new Intl.NumberFormat(undefined, {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        }).format(stat.amount)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {expense > 0 ? ((stat.amount / expense) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Account Summary with Chart */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Account Summary</h2>
        
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                }).format(accountStats.totalUSD)}
              </div>
              <div className="text-sm text-gray-600">Total USD</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: 'TWD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(accountStats.totalTWD)}
              </div>
              <div className="text-sm text-gray-600">Total TWD</div>
            </div>
          </div>

          {/* Account Balance Chart */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Account Balance Distribution</h3>
            <AccountBalanceChart data={accountBalanceData} />
          </div>
          
          {/* Account List */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Account Details</h3>
            <div className="space-y-2">
              {accounts.map((account) => (
                <div key={account.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <div className="font-medium text-gray-900">{account.name}</div>
                    <div className="text-sm text-gray-600">{account.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency: account.currency,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      }).format(account.balance)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Comparison Chart */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Monthly Income vs Expense</h2>
        <MonthlyComparisonChart data={monthlyData} />
      </div>

      {/* Transaction Summary */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Transaction Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</div>
            <div className="text-sm text-gray-600">Total Transactions</div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedPeriod === 'custom' ? 
                (customStartDate && customEndDate ? 
                  `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}` : 
                  'custom range') :
                selectedPeriod === 'week' ? 'last week' : 
                selectedPeriod === 'month' ? 'last month' :
                selectedPeriod === 'quarter' ? 'last quarter' : 'last year'
              }
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{transactions.length}</div>
            <div className="text-sm text-gray-600">All Time</div>
            <div className="text-xs text-gray-500 mt-1">
              Total transactions recorded
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
