import { useLiveQuery } from 'dexie-react-hooks';
import { getAllTransactions } from '../../db/transactions';
import { getAllCategories } from '../../db/categories';
import AddTransactionForm from './AddTransactionForm';
import { useTranslation } from 'react-i18next';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('transactions.title')}</h1>
        <p className="text-gray-600 text-sm">{t('transactions.trackIncomeExpense')}</p>
      </div>
      
      {/* Transaction Form */}
      <div>
        <AddTransactionForm onSuccess={() => { /* maybe clear form or show notification */ }} />
      </div>
      
      {/* Recent Transactions */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900">{t('transactions.recentTransactions')}</h2>
        <div className="space-y-3">
          {transactions?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('transactions.noTransactionsYet')}</p>
              <p className="text-sm">{t('transactions.useFormToStart')}</p>
            </div>
          ) : (
            transactions?.map((tx) => {
              const category = categories?.find(cat => cat.id === tx.categoryId);
              return (
                <div key={tx.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{category?.name || t('transactions.unknownCategory')}</h4>
                      <p className="text-sm text-gray-600">
                        {getTransactionTypeTranslation(tx.type)}
                      </p>
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
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>{new Date(tx.date).toLocaleDateString()}</div>
                    {tx.exchangeRate && (
                      <div className="text-xs text-blue-600">
                        {t('transactions.exchangeRateLabel')}: {tx.exchangeRate} ({tx.currency})
                      </div>
                    )}
                    {tx.notes && (
                      <div className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded mt-2">
                        {tx.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
