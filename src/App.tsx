import React, { lazy } from 'react';
import { Route, Routes, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// 懶加載頁面組件
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const AccountsPage = lazy(() => import('./pages/Accounts'));
const TransactionsPage = lazy(() => import('./pages/Transactions'));
const StatisticsPage = lazy(() => import('./pages/Statistics'));
const NotificationsPage = lazy(() => import('./pages/Notifications'));
const SettingsPage = lazy(() => import('./pages/Settings'));
import { demonstrateLocaleDetection } from './utils/localeDemo';
import { NotificationService } from './services/notificationService';
import { PWAService } from './services/pwaService';
import PWAControls from './components/PWAControls';
import { OfflineSyncService } from './services/offlineSyncService';
import OfflineIndicator from './components/OfflineIndicator';
import PageWrapper from './components/PageWrapper';
import { MemoryOptimizationService } from './services/memoryOptimizationService';
import { QueryOptimizationService } from './services/queryOptimizationService';
import PerformanceMonitor from './components/PerformanceMonitor';
import { LoadingProvider } from './contexts/LoadingContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { LanguageProvider } from './contexts/LanguageContext';
import GlobalLoadingOverlay from './components/GlobalLoadingOverlay';
import ErrorNotification from './components/ErrorNotification';
import ResponsiveLayout from './components/ResponsiveLayout';
import ResponsiveNavigation from './components/ResponsiveNavigation';

const Layout = () => {
  const { t } = useTranslation();
  const navigationItems = [
    { path: '/', label: t('navigation.dashboard'), icon: '🏠', description: 'Dashboard' },
    { path: '/accounts', label: t('navigation.accounts'), icon: '💳', description: 'Manage accounts' },
    { path: '/transactions', label: t('navigation.transactions'), icon: '💰', description: 'Record transactions' },
    { path: '/statistics', label: t('navigation.statistics'), icon: '📊', description: 'View analytics' },
    { path: '/notifications', label: t('navigation.notifications'), icon: '🔔', description: 'Manage alerts' },
    { path: '/settings', label: t('navigation.settings'), icon: '⚙️', description: 'App settings' }
  ];

  return (
    <ResponsiveLayout>
      {/* PWA Controls */}
      <div className="mb-4">
        <PWAControls />
      </div>

      {/* Offline Sync Indicator */}
      <div className="mb-4">
        <OfflineIndicator />
      </div>
      
      {/* Main content */}
      <Outlet />

      {/* Performance Monitor (Dev Only) */}
      <PerformanceMonitor />
      
      {/* Responsive Navigation */}
      <ResponsiveNavigation items={navigationItems} />
    </ResponsiveLayout>
  );
};


function App() {
  // 在開發模式下顯示偵測資訊
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🌍 StudyBudget Pro - Locale Detection');
      demonstrateLocaleDetection();
    }
  }, []);

  // 初始化應用服務
  React.useEffect(() => {
    const initializeServices = async () => {
      try {
        // 初始化 PWA 服務
        await PWAService.initialize();
        console.log('🚀 PWA Service initialized');

        // 初始化離線同步服務
        await OfflineSyncService.initialize();
        console.log('🔄 Offline Sync Service initialized');

        // 初始化性能優化服務
        MemoryOptimizationService.initialize();
        await QueryOptimizationService.preloadCommonData();
        console.log('⚡ Performance optimization services initialized');

        // 初始化提醒系統
        await NotificationService.startNotificationSystem();
        console.log('🔔 Notification system initialized');
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };

    initializeServices();
  }, []);

  return (
    <ErrorProvider>
      <LoadingProvider>
        <LanguageProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
        <Route index element={
          <PageWrapper>
            <DashboardPage />
          </PageWrapper>
        } />
        <Route path="accounts" element={
          <PageWrapper>
            <AccountsPage />
          </PageWrapper>
        } />
        <Route path="transactions" element={
          <PageWrapper>
            <TransactionsPage />
          </PageWrapper>
        } />
        <Route path="statistics" element={
          <PageWrapper>
            <StatisticsPage />
          </PageWrapper>
        } />
        <Route path="notifications" element={
          <PageWrapper>
            <NotificationsPage />
          </PageWrapper>
        } />
        <Route path="settings" element={
          <PageWrapper>
            <SettingsPage />
          </PageWrapper>
        } />
          </Route>
        </Routes>
        
          {/* Global UX Components */}
          <GlobalLoadingOverlay />
          <ErrorNotification />
        </LanguageProvider>
      </LoadingProvider>
    </ErrorProvider>
  )
}

export default App
