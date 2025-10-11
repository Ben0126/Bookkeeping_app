import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ResponsiveCard, ResponsiveGrid } from '../../../components/ResponsiveLayout';
import type { StatisticsPreviewProps } from '../types';
import { formatCurrency, formatPercentage, getTrendIcon, getTrendColor } from '../utils/dashboardCalculations';

/**
 * 統計預覽組件
 * 顯示關鍵統計指標和圖表預覽
 */
const StatisticsPreview: React.FC<StatisticsPreviewProps> = ({ 
  statistics, 
  isLoading = false,
  onViewDetails 
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t('dashboard.statisticsPreviewTitle')}</h2>
        <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 2 }} className="gap-4">
          <ResponsiveCard className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </ResponsiveCard>
          <ResponsiveCard className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </ResponsiveCard>
        </ResponsiveGrid>
      </div>
    );
  }

  if (statistics.topCategories.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t('dashboard.statisticsPreviewTitle')}</h2>
        <ResponsiveCard className="text-center py-8">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">📊</div>
            <p>{t('dashboard.noData')}</p>
            <Link 
              to="/statistics" 
              className="inline-block mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {t('dashboard.viewStatistics')}
            </Link>
          </div>
        </ResponsiveCard>
      </div>
    );
  }

  const trendIcon = getTrendIcon(statistics.trendPercentage);
  const trendColor = getTrendColor(statistics.trendPercentage);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">{t('dashboard.statisticsPreviewTitle')}</h2>
        <Link 
          to="/statistics" 
          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          {t('dashboard.viewAll')} →
        </Link>
      </div>
      
      <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 2 }} className="gap-4">
        {/* 收支比例卡片 */}
        <ResponsiveCard className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="text-center">
            <div className="text-3xl mb-3">⚖️</div>
            <div className="text-2xl font-bold text-purple-700 mb-2">
              {statistics.incomeExpenseRatio.toFixed(2)}
            </div>
            <div className="text-sm text-purple-600 mb-3">{t('dashboard.statisticsPreview.incomeExpenseRatio')}</div>
            <div className="text-xs text-gray-600">
              {statistics.incomeExpenseRatio > 1 ? t('dashboard.statisticsPreview.incomeExceedsExpenses') : t('dashboard.statisticsPreview.expensesExceedIncome')}
            </div>
          </div>
        </ResponsiveCard>
        
        {/* 月度趨勢卡片 */}
        <ResponsiveCard className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <div className="text-center">
            <div className="text-3xl mb-3">{trendIcon}</div>
            <div className={`text-2xl font-bold mb-2 ${trendColor}`}>
              {statistics.trendPercentage >= 0 ? '+' : ''}{formatPercentage(statistics.trendPercentage)}
            </div>
            <div className="text-sm text-indigo-600 mb-3">{t('dashboard.statisticsPreview.monthlyTrend')}</div>
            <div className="text-xs text-gray-600">
              {statistics.monthlyTrend === 'up' ? t('dashboard.statisticsPreview.spendingIncreased') : 
               statistics.monthlyTrend === 'down' ? t('dashboard.statisticsPreview.spendingDecreased') : t('dashboard.statisticsPreview.spendingStable')}
            </div>
          </div>
        </ResponsiveCard>
      </ResponsiveGrid>
      
      {/* 熱門分類 */}
      <ResponsiveCard>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.statisticsPreview.topCategories')}</h3>
            <span className="text-sm text-gray-500">{t('dashboard.statisticsPreview.thisMonth')}</span>
          </div>
          
          <div className="space-y-3">
            {statistics.topCategories.map((category, index) => (
              <div key={category.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: `hsl(${(index * 360) / statistics.topCategories.length}, 70%, 50%)`
                    }}
                  ></div>
                  <div>
                    <div className="font-medium text-gray-900">{category.name}</div>
                    <div className="text-sm text-gray-600">
                      {formatPercentage(category.percentage)} of total
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(category.amount, 'USD')}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {statistics.topCategories.length >= 3 && (
            <div className="text-center pt-3 border-t border-gray-100">
              <button 
                onClick={onViewDetails}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                {t('dashboard.statisticsPreview.viewDetailedBreakdown')} →
              </button>
            </div>
          )}
        </div>
      </ResponsiveCard>
    </div>
  );
};

export default StatisticsPreview;
