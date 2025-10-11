import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AccountSummaryProps } from '../types';
import { formatCurrency } from '../utils/dashboardCalculations';
import { CardTransition, ListItemTransition } from './TransitionAnimation';

const AccountSummary: React.FC<AccountSummaryProps> = ({ 
  accounts, 
  isLoading = false, 
  onAccountClick 
}) => {
  const { t, i18n } = useTranslation();

  if (isLoading) {
    return (
      <CardTransition isVisible={true} delay={100}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.accountSummaryTitle')}</h3>
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

  if (accounts.length === 0) {
    return (
      <CardTransition isVisible={true} delay={100}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.accountSummaryTitle')}</h3>
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">{t('dashboard.noAccounts')}</p>
            <p className="text-gray-400 text-sm mt-2">{t('dashboard.accountSummaryDetails.emptyState')}</p>
          </div>
        </div>
      </CardTransition>
    );
  }

  // 按貨幣分組帳戶
  const accountsByCurrency = accounts.reduce((acc, account) => {
    if (!acc[account.currency]) {
      acc[account.currency] = [];
    }
    acc[account.currency].push(account);
    return acc;
  }, {} as { [currency: string]: typeof accounts });

  const getAccountTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bank':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'cash':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        );
      case 'credit':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bank':
        return 'bg-blue-500';
      case 'cash':
        return 'bg-green-500';
      case 'credit':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <CardTransition isVisible={true} delay={100}>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.accountSummaryTitle')}</h3>
            <p className="text-sm text-gray-600 mt-1">{t('dashboard.accountSummaryDetails.subtitle')}</p>
          </div>
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(accountsByCurrency).map(([currency, currencyAccounts]) => (
            <div key={currency}>
              {/* 貨幣標題 */}
              <div className="flex items-center mb-4">
                <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center mr-2">
                  <span className="text-xs font-bold text-gray-700">{currency}</span>
                </div>
                <h4 className="text-sm font-medium text-gray-600">
                  {currency} {t('dashboard.accountSummaryDetails.currency')}
                </h4>
                <div className="ml-auto text-sm text-gray-500">
                  {currencyAccounts.length} {t('dashboard.accountSummaryDetails.accounts')}
                </div>
              </div>

              {/* 帳戶列表 */}
              <div className="space-y-3">
                {currencyAccounts.map((account, index) => (
                  <ListItemTransition key={account.id} isVisible={true} index={index}>
                    <button
                      onClick={() => onAccountClick?.(account.id)}
                      className="w-full p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 ${getAccountTypeColor(account.type)} rounded-lg flex items-center justify-center text-white`}>
                            {getAccountTypeIcon(account.type)}
                          </div>
                          <div className="text-left">
                            <h5 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {account.name}
                            </h5>
                            <p className="text-sm text-gray-500 capitalize">{account.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(account.balance, account.currency, i18n.language)}
                          </p>
                          <p className="text-xs text-gray-500">{account.currency}</p>
                        </div>
                      </div>
                    </button>
                  </ListItemTransition>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 查看更多按鈕 */}
        {accounts.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                // 導航到帳戶頁面
                console.log('Navigate to accounts page');
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 font-medium"
            >
              {t('dashboard.accountSummaryDetails.viewAll')}
            </button>
          </div>
        )}
      </div>
    </CardTransition>
  );
};

export default AccountSummary;