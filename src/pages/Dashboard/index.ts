// Dashboard 模組統一導出文件

// 類型定義
export * from './types';

// Hooks
export { useUserStatus, useUserStatusDetails } from './hooks/useUserStatus';
export { useDashboardData } from './hooks/useDashboardData';
export { useStatisticsIntegration } from './hooks/useStatisticsIntegration';
export { useNotificationsIntegration } from './hooks/useNotificationsIntegration';
export { useQuickNavigation } from './hooks/useQuickNavigation';
export { useDynamicContent } from './hooks/useDynamicContent';
export { useLoadingStates } from './hooks/useLoadingStates';
export { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';

// 工具函數
export * from './utils/dashboardCalculations';
export * from './utils/userExperienceUtils';

// 組件
export { default } from './index.tsx';
