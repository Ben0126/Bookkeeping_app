import React from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ResponsiveNavigation from './ResponsiveNavigation';
import PWAControls from './PWAControls';
import OfflineIndicator from './OfflineIndicator';
import PerformanceMonitor from './PerformanceMonitor';

const AppLayout: React.FC = () => {
  const { t } = useTranslation();

  // 導航項目配置
  const navigationItems = [
    { path: '/', label: t('navigation.dashboard'), icon: '🏠', description: 'Dashboard' },
    { path: '/accounts', label: t('navigation.accounts'), icon: '💳', description: 'Manage accounts' },
    { path: '/transactions', label: t('navigation.transactions'), icon: '💰', description: 'Record transactions' },
    { path: '/statistics', label: t('navigation.statistics'), icon: '📊', description: 'View analytics' },
    { path: '/notifications', label: t('navigation.notifications'), icon: '🔔', description: 'Manage alerts' },
    { path: '/settings', label: t('navigation.settings'), icon: '⚙️', description: 'App settings' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 桌面版頂部導航 */}
      <div className="hidden lg:block">
        <ResponsiveNavigation items={navigationItems} />
      </div>

      {/* 主要內容區域 */}
      <div className="lg:pt-16 pb-16 lg:pb-0">
        {/* PWA Controls */}
        <div className="mb-4 px-4 lg:px-6">
          <PWAControls />
        </div>

        {/* Offline Sync Indicator */}
        <div className="mb-4 px-4 lg:px-6">
          <OfflineIndicator />
        </div>
        
        {/* 頁面內容 */}
        <Outlet />

        {/* Performance Monitor (Dev Only) */}
        <PerformanceMonitor />
      </div>

      {/* 移動版和平板版底部導航 */}
      <div className="lg:hidden">
        <ResponsiveNavigation items={navigationItems} />
      </div>
    </div>
  );
};

export default AppLayout;
