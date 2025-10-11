import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FinancialOverviewProps } from '../types';
import { formatCurrency } from '../utils/dashboardCalculations';
import { CardTransition } from './TransitionAnimation';

const FinancialOverview: React.FC<FinancialOverviewProps> = ({ overview, isLoading }) => {
  const { t, i18n } = useTranslation();

  if (isLoading) {
    return (
      <CardTransition isVisible={true} delay={0}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('dashboard.financialOverview')}</h2>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded-lg mb-3"></div>
                <div className="h-10 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </CardTransition>
    );
  }

  const currencies = Object.keys(overview);
  
  if (currencies.length === 0) {
    return (
      <CardTransition isVisible={true} delay={0}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('dashboard.financialOverview')}</h2>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">{t('dashboard.noData')}</p>
            <p className="text-gray-400 text-sm mt-2">{t('dashboard.financialOverviewDetails.emptyState')}</p>
          </div>
        </div>
      </CardTransition>
    );
  }

  return (
    <CardTransition isVisible={true} delay={0}>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.financialOverview')}</h2>
            <p className="text-gray-600 mt-1">{t('dashboard.financialOverviewDetails.subtitle')}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
        
        {currencies.map((currency, currencyIndex) => {
          const data = overview[currency];
          return (
            <div key={currency} className={`${currencyIndex > 0 ? 'mt-8 pt-8 border-t border-gray-200' : ''}`}>
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-sm font-bold text-gray-700">{currency}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">{currency} {t('dashboard.financialOverviewDetails.currency')}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <CardTransition isVisible={true} delay={100}>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-slate-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-slate-600 bg-slate-200 px-2 py-1 rounded-full">
                        {t('dashboard.financialOverviewDetails.total')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{t('dashboard.totalAssets')}</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(data.totalAssets, currency, i18n.language)}
                    </p>
                  </div>
                </CardTransition>
                
                <CardTransition isVisible={true} delay={200}>
                  <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl p-6 border border-emerald-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-200 px-2 py-1 rounded-full">
                        {t('dashboard.financialOverviewDetails.income')}
                      </span>
                    </div>
                    <p className="text-sm text-emerald-600 mb-2">{t('dashboard.monthlyIncome')}</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {formatCurrency(data.monthlyIncome, currency, i18n.language)}
                    </p>
                  </div>
                </CardTransition>
                
                <CardTransition isVisible={true} delay={300}>
                  <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl p-6 border border-red-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-red-600 bg-red-200 px-2 py-1 rounded-full">
                        {t('dashboard.financialOverviewDetails.expense')}
                      </span>
                    </div>
                    <p className="text-sm text-red-600 mb-2">{t('dashboard.monthlyExpense')}</p>
                    <p className="text-2xl font-bold text-red-700">
                      {formatCurrency(data.monthlyExpense, currency, i18n.language)}
                    </p>
                  </div>
                </CardTransition>
                
                <CardTransition isVisible={true} delay={400}>
                  <div className={`rounded-xl p-6 border hover:shadow-md transition-all duration-200 ${
                    data.netWorthChange >= 0 
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200' 
                      : 'bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        data.netWorthChange >= 0 ? 'bg-blue-500' : 'bg-orange-500'
                      }`}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        data.netWorthChange >= 0 
                          ? 'text-blue-600 bg-blue-200' 
                          : 'text-orange-600 bg-orange-200'
                      }`}>
                        {data.netWorthChange >= 0 ? t('dashboard.financialOverviewDetails.profit') : t('dashboard.financialOverviewDetails.loss')}
                      </span>
                    </div>
                    <p className={`text-sm mb-2 ${
                      data.netWorthChange >= 0 ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      {t('dashboard.netWorthChange')}
                    </p>
                    <p className={`text-2xl font-bold ${
                      data.netWorthChange >= 0 ? 'text-blue-700' : 'text-orange-700'
                    }`}>
                      {formatCurrency(data.netWorthChange, currency, i18n.language)}
                    </p>
                  </div>
                </CardTransition>
              </div>
            </div>
          );
        })}
      </div>
    </CardTransition>
  );
};

export default FinancialOverview;