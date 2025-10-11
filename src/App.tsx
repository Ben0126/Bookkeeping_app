import React, { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { demonstrateLocaleDetection } from './utils/localeDemo';
import { NotificationService } from './services/notificationService';
import { PWAService } from './services/pwaService';
import { OfflineSyncService } from './services/offlineSyncService';
import { MemoryOptimizationService } from './services/memoryOptimizationService';
import { QueryOptimizationService } from './services/queryOptimizationService';
import { LoadingProvider } from './contexts/LoadingContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { LanguageProvider } from './contexts/LanguageContext';
import GlobalLoadingOverlay from './components/GlobalLoadingOverlay';
import ErrorNotification from './components/ErrorNotification';
import AppLayout from './components/AppLayout';

// 懶加載頁面組件
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const AccountsPage = lazy(() => import('./pages/Accounts'));
const TransactionsPage = lazy(() => import('./pages/Transactions'));
const StatisticsPage = lazy(() => import('./pages/Statistics'));
const NotificationsPage = lazy(() => import('./pages/Notifications'));
const SettingsPage = lazy(() => import('./pages/Settings'));

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
            <Route path="/" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="statistics" element={<StatisticsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
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
