import React from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveGrid } from '../../components/ResponsiveLayout';
import { useDashboardData } from './hooks/useDashboardData';
import { useUserStatus } from './hooks/useUserStatus';
import { useDynamicContent } from './hooks/useDynamicContent';
import { useLoadingStates } from './hooks/useLoadingStates';
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';
import { useNotificationsIntegration } from './hooks/useNotificationsIntegration';
import { useQuickNavigation } from './hooks/useQuickNavigation';
import { 
  FinancialOverview, 
  AccountSummary, 
  RecentTransactions, 
  StatisticsPreview, 
  NotificationsSummary, 
  QuickActions, 
  WelcomeSection,
  PageTransition,
  LoadingTransition,
  ErrorTransition
} from './components';
import ErrorBoundary from './components/ErrorBoundary';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { userStatus, isLoading: userStatusLoading, isFirstTimeUser, transitionReady } = useUserStatus();
  const { data: dashboardData, isLoading: dataLoading, error } = useDashboardData();
  const dynamicContent = useDynamicContent();
  const loadingStates = useLoadingStates();
  const performanceMonitoring = usePerformanceMonitoring();
  const notificationsIntegration = useNotificationsIntegration();
  const quickNavigation = useQuickNavigation();

  // 開始性能監控
  React.useEffect(() => {
    performanceMonitoring.startMonitoring();
    performanceMonitoring.startRenderTimer();
    
    return () => {
      performanceMonitoring.endRenderTimer();
      performanceMonitoring.stopMonitoring();
    };
  }, []);

  // 結束渲染計時
  React.useEffect(() => {
    if (!loadingStates.isLoading) {
      performanceMonitoring.endRenderTimer();
    }
  }, [loadingStates.isLoading]);

  // 更新動態內容
  React.useEffect(() => {
    if (transitionReady) {
      dynamicContent.updateContentMode(userStatus);
    }
  }, [userStatus, transitionReady]);

  // 如果正在加載用戶狀態，顯示加載畫面
  if (userStatusLoading || loadingStates.isInitialLoad) {
    return (
      <ErrorBoundary>
        <LoadingTransition 
          isVisible={true}
          message={t('dashboard.loading.initializing')}
        />
      </ErrorBoundary>
    );
  }

  // 如果是新用戶，顯示歡迎頁面
  if (isFirstTimeUser) {
    return (
      <ErrorBoundary>
        <PageTransition isVisible={true}>
          <WelcomeSection 
            onGetStarted={() => {
              quickNavigation.navigateToAddAccount();
            }}
            onViewSettings={() => {
              quickNavigation.navigateToSettings();
            }}
          />
        </PageTransition>
      </ErrorBoundary>
    );
  }

  // 如果有錯誤，顯示錯誤頁面
  if (error) {
    return (
      <ErrorBoundary>
        <ErrorTransition 
          isVisible={true}
          error={error}
          onRetry={() => window.location.reload()}
        />
      </ErrorBoundary>
    );
  }

  // 如果沒有數據，顯示加載畫面
  if (!dashboardData || loadingStates.isLoading) {
    return (
      <ErrorBoundary>
        <LoadingTransition 
          isVisible={true}
          message={loadingStates.loadingMessage || t('dashboard.loading.loadingData')}
        />
      </ErrorBoundary>
    );
  }

  // 獲取顯示組件配置
  const displayConfig = dynamicContent.getDisplayComponents(userStatus);

  // 主頁面 - 銀行級儀表板
  return (
    <ErrorBoundary>
      <PageTransition isVisible={true}>
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* 簡化的頂部標題欄 */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">SB</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
                  <p className="text-sm text-gray-600">{t('dashboard.subtitle')}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* 通知鈴鐺 */}
                <button 
                  onClick={() => quickNavigation.navigateToNotifications()}
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 19.5L9 15H4l5-5V4l-5 5H9l-5 5v5z" />
                  </svg>
                  {notificationsIntegration.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {notificationsIntegration.unreadCount}
                    </span>
                  )}
                </button>
                
                {/* 用戶狀態指示器 */}
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    userStatus === 'new' ? 'bg-green-500' : 
                    userStatus === 'active' ? 'bg-blue-500' : 'bg-purple-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-700">
                    {t(`dashboard.userStatus.${userStatus}`)}
                  </span>
                </div>
              </div>
            </div>
          </div>
            {/* 財務概覽 */}
            {displayConfig.showFinancialOverview && (
              <FinancialOverview
                overview={dashboardData.financialOverview}
                isLoading={dataLoading}
              />
            )}

            {/* 主要內容網格 */}
            <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} className="gap-6">
              {/* 左側：帳戶摘要 */}
              {displayConfig.showAccountSummary && (
                <div className="space-y-6">
                  <AccountSummary 
                    accounts={dashboardData.accountSummaries}
                    isLoading={dataLoading}
                    onAccountClick={(accountId) => {
                      quickNavigation.navigateToAccount(accountId.toString());
                    }}
                  />
                </div>
              )}

              {/* 中間：最近交易 */}
              {displayConfig.showRecentTransactions && (
                <div className="space-y-6">
                  <RecentTransactions 
                    transactions={dashboardData.recentTransactions}
                    isLoading={dataLoading}
                    onTransactionClick={(transactionId) => {
                      quickNavigation.navigateToTransaction(transactionId.toString());
                    }}
                    onAddTransaction={() => {
                      quickNavigation.navigateToAddTransaction();
                    }}
                  />
                </div>
              )}

              {/* 右側：統計預覽和通知 */}
              <div className="space-y-6">
                {displayConfig.showStatisticsPreview && (
                  <StatisticsPreview 
                    statistics={dashboardData.statisticsPreview}
                    isLoading={dataLoading}
                    onViewDetails={() => {
                      quickNavigation.navigateToStatistics();
                    }}
                  />
                )}
                
                {displayConfig.showNotificationsSummary && (
                  <NotificationsSummary 
                    notifications={dashboardData.notificationSummaries}
                    isLoading={dataLoading}
                    onNotificationClick={(notificationId) => {
                      quickNavigation.navigateToNotification(notificationId.toString());
                    }}
                    onMarkAllRead={() => {
                      notificationsIntegration.handleMarkAllAsRead();
                    }}
                  />
                )}
              </div>
            </ResponsiveGrid>

            {/* 快速操作 */}
            {displayConfig.showQuickActions && (
              <QuickActions 
                actions={dashboardData.quickActions}
                onActionClick={(actionId) => {
                  // 根據actionId進行不同的導航
                  switch (actionId) {
                    case 'add-transaction':
                      quickNavigation.navigateToAddTransaction();
                      break;
                    case 'add-account':
                      quickNavigation.navigateToAddAccount();
                      break;
                    case 'view-statistics':
                      quickNavigation.navigateToStatistics();
                      break;
                    case 'view-settings':
                      quickNavigation.navigateToSettings();
                      break;
                    case 'settings':
                      quickNavigation.navigateToSettings();
                      break;
                    default:
                      console.log('Unknown action:', actionId);
                  }
                }}
              />
            )}
        </div>
      </PageTransition>
    </ErrorBoundary>
  );
};

export default Dashboard;
