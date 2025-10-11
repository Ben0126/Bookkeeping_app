import React from 'react';
import { useTranslation } from 'react-i18next';
import type { RecentTransactionsProps } from '../types';
import { formatCurrency } from '../utils/dashboardCalculations';
import { CardTransition, ListItemTransition, ButtonTransition } from './TransitionAnimation';

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ 
  transactions, 
  isLoading = false, 
  onTransactionClick,
  onAddTransaction 
}) => {
  const { t, i18n } = useTranslation();

  if (isLoading) {
    return (
      <CardTransition isVisible={true} delay={200}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.recentTransactionsTitle')}</h3>
            <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </CardTransition>
    );
  }

  if (transactions.length === 0) {
    return (
      <CardTransition isVisible={true} delay={200}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.recentTransactionsTitle')}</h3>
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">{t('dashboard.noTransactions')}</p>
            <p className="text-gray-400 text-sm mt-2">{t('dashboard.recentTransactionsDetails.emptyState')}</p>
            <ButtonTransition isVisible={true} delay={300}>
              <button
                onClick={onAddTransaction}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 font-medium"
              >
                {t('dashboard.addTransaction')}
              </button>
            </ButtonTransition>
          </div>
        </div>
      </CardTransition>
    );
  }

  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'income':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
        );
      case 'expense':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
          </svg>
        );
      case 'transfer':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'income':
        return 'bg-emerald-500';
      case 'expense':
        return 'bg-red-500';
      case 'transfer':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTransactionAmountColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'income':
        return 'text-emerald-600';
      case 'expense':
        return 'text-red-600';
      case 'transfer':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTransactionDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return t('dashboard.recentTransactions.today');
    } else if (diffDays === 2) {
      return t('dashboard.recentTransactions.yesterday');
    } else if (diffDays <= 7) {
      return t('dashboard.recentTransactions.daysAgo', { count: diffDays - 1 });
    } else {
      return date.toLocaleDateString(i18n.language);
    }
  };

  return (
    <CardTransition isVisible={true} delay={200}>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.recentTransactionsTitle')}</h3>
            <p className="text-sm text-gray-600 mt-1">{t('dashboard.recentTransactionsDetails.subtitle')}</p>
          </div>
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>

        <div className="space-y-3">
          {transactions.map((transaction, index) => (
            <ListItemTransition key={transaction.id} isVisible={true} index={index}>
              <button
                onClick={() => onTransactionClick?.(transaction.id)}
                className="w-full p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${getTransactionTypeColor(transaction.type)} rounded-lg flex items-center justify-center text-white`}>
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div className="text-left">
                      <h5 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {transaction.categoryName}
                      </h5>
                      <p className="text-sm text-gray-500">{transaction.accountName}</p>
                      {transaction.notes && (
                        <p className="text-xs text-gray-400 mt-1 truncate max-w-48">
                          {transaction.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getTransactionAmountColor(transaction.type)}`}>
                      {transaction.type === 'expense' ? '-' : '+'}
                      {formatCurrency(transaction.amount, transaction.currency, i18n.language)}
                    </p>
                    <p className="text-xs text-gray-500">{formatTransactionDate(transaction.date)}</p>
                  </div>
                </div>
              </button>
            </ListItemTransition>
          ))}
        </div>

        {/* 查看更多和添加交易按鈕 */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex space-x-3">
          <button
            onClick={() => {
              // 導航到交易頁面
              console.log('Navigate to transactions page');
            }}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
          >
            {t('dashboard.recentTransactionsDetails.viewAll')}
          </button>
          <ButtonTransition isVisible={true} delay={100}>
            <button
              onClick={onAddTransaction}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 font-medium"
            >
              {t('dashboard.addTransaction')}
            </button>
          </ButtonTransition>
        </div>
      </div>
    </CardTransition>
  );
};

export default RecentTransactions;