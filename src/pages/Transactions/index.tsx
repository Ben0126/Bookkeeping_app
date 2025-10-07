import { useLiveQuery } from 'dexie-react-hooks';
import { getAllTransactions } from '../../db/transactions';
import { getAllCategories } from '../../db/categories';
import AddTransactionForm from './AddTransactionForm';
import { useTranslation } from 'react-i18next';
import { ResponsiveCard, ResponsiveGrid } from '../../components/ResponsiveLayout';

const TransactionsPage = () => {
  const { t } = useTranslation();
  const transactions = useLiveQuery(getAllTransactions);
  const categories = useLiveQuery(getAllCategories);

  // 交易類型翻譯映射
  const getTransactionTypeTranslation = (type: string): string => {
    const typeMap: Record<string, string> = {
      'Income': t('transactions.income'),
      'Expense': t('transactions.expense'),
      'Transfer': t('transactions.transfer'),
    };
    return typeMap[type] || type;
  };

  // 獲取交易類型圖標
  const getTransactionTypeIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      'Income': '💰',
      'Expense': '💸',
      'Transfer': '🔄',
    };
    return iconMap[type] || '📝';
  };

  // 獲取交易類型顏色
  const getTransactionTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      'Income': 'text-green-600 bg-green-50 border-green-200',
      'Expense': 'text-red-600 bg-red-50 border-red-200',
      'Transfer': 'text-blue-600 bg-blue-50 border-blue-200',
    };
    return colorMap[type] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/5 to-red-600/5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-400/10 to-red-400/10 rounded-full -translate-y-48 translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-yellow-400/10 to-orange-400/10 rounded-full translate-y-32 -translate-x-32"></div>
        
        <div className="relative z-10 px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Main Content Grid */}
            <ResponsiveGrid cols={{ mobile: 1, tablet: 1, desktop: 2 }} className="gap-8">
              {/* Transaction Form */}
              <div className="order-2 lg:order-1">
                <AddTransactionForm onSuccess={() => { /* maybe clear form or show notification */ }} />
              </div>
              
              {/* Recent Transactions */}
              <div className="order-1 lg:order-2">
                <ResponsiveCard className="h-fit">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white text-lg">📊</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{t('transactions.recentTransactions')}</h2>
                      <p className="text-sm text-gray-600">最近記錄的交易</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {transactions?.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-3xl text-gray-400">📝</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('transactions.noTransactionsYet')}</h3>
                        <p className="text-gray-500 text-sm">{t('transactions.useFormToStart')}</p>
                      </div>
                    ) : (
                      transactions?.slice(0, 5).map((tx) => {
                        const category = categories?.find(cat => cat.id === tx.categoryId);
                        const typeColor = getTransactionTypeColor(tx.type);
                        const typeIcon = getTransactionTypeIcon(tx.type);
                        
                        return (
                          <div key={tx.id} className="group bg-white p-4 rounded-xl border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300 hover:-translate-y-1">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeColor.split(' ')[1]} ${typeColor.split(' ')[2]}`}>
                                  <span className="text-lg">{typeIcon}</span>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                    {category?.name || t('transactions.unknownCategory')}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {getTransactionTypeTranslation(tx.type)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-lg font-bold ${tx.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                  {tx.type === 'Income' ? '+' : '-'}
                                  {new Intl.NumberFormat(undefined, { 
                                    style: 'currency', 
                                    currency: tx.currency,
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  }).format(tx.amount)}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(tx.date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            {(tx.exchangeRate || tx.notes) && (
                              <div className="pt-3 border-t border-gray-100 space-y-2">
                                {tx.exchangeRate && (
                                  <div className="flex items-center text-xs text-blue-600">
                                    <span className="mr-2">💱</span>
                                    {t('transactions.exchangeRateLabel')}: {tx.exchangeRate} ({tx.currency})
                                  </div>
                                )}
                                {tx.notes && (
                                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg italic">
                                    <span className="mr-2">📝</span>
                                    {tx.notes}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    
                    {transactions && transactions.length > 5 && (
                      <div className="text-center pt-4">
                        <button className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors">
                          查看所有交易 →
                        </button>
                      </div>
                    )}
                  </div>
                </ResponsiveCard>
              </div>
            </ResponsiveGrid>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
