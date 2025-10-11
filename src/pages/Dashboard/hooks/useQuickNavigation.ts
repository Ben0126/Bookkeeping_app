import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 快速導航Hook
 * 提供Dashboard到其他頁面的快速跳轉功能
 */
export const useQuickNavigation = () => {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  // 通用導航函數
  const navigateTo = useCallback(async (path: string, options?: { replace?: boolean; state?: any }) => {
    setIsNavigating(true);
    try {
      // 添加一個小的延遲來顯示導航狀態
      await new Promise(resolve => setTimeout(resolve, 100));
      navigate(path, options);
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setIsNavigating(false);
    }
  }, [navigate]);

  // 快速導航到帳戶頁面
  const navigateToAccounts = useCallback(() => {
    navigateTo('/accounts');
  }, [navigateTo]);

  // 快速導航到交易頁面
  const navigateToTransactions = useCallback(() => {
    navigateTo('/transactions');
  }, [navigateTo]);

  // 快速導航到統計頁面
  const navigateToStatistics = useCallback(() => {
    navigateTo('/statistics');
  }, [navigateTo]);

  // 快速導航到通知頁面
  const navigateToNotifications = useCallback(() => {
    navigateTo('/notifications');
  }, [navigateTo]);

  // 快速導航到設定頁面
  const navigateToSettings = useCallback(() => {
    navigateTo('/settings');
  }, [navigateTo]);

  // 快速導航到備份頁面
  const navigateToBackup = useCallback(() => {
    navigateTo('/backup');
  }, [navigateTo]);

  // 快速導航到學生功能頁面
  const navigateToStudentFeatures = useCallback(() => {
    navigateTo('/student-features');
  }, [navigateTo]);

  // 快速導航到新增帳戶
  const navigateToAddAccount = useCallback(() => {
    navigateTo('/accounts', { state: { action: 'add' } });
  }, [navigateTo]);

  // 快速導航到新增交易
  const navigateToAddTransaction = useCallback(() => {
    navigateTo('/transactions', { state: { action: 'add' } });
  }, [navigateTo]);

  // 快速導航到特定帳戶
  const navigateToAccount = useCallback((accountId: string) => {
    navigateTo(`/accounts/${accountId}`);
  }, [navigateTo]);

  // 快速導航到特定交易
  const navigateToTransaction = useCallback((transactionId: string) => {
    navigateTo(`/transactions/${transactionId}`);
  }, [navigateTo]);

  // 快速導航到特定通知
  const navigateToNotification = useCallback((notificationId: string) => {
    navigateTo(`/notifications/${notificationId}`);
  }, [navigateTo]);

  // 快速導航到統計詳情
  const navigateToStatisticsDetail = useCallback((period: string) => {
    navigateTo('/statistics', { state: { period } });
  }, [navigateTo]);

  // 快速導航到分類管理
  const navigateToCategoryManagement = useCallback(() => {
    navigateTo('/settings', { state: { tab: 'categories' } });
  }, [navigateTo]);

  // 快速導航到貨幣設定
  const navigateToCurrencySettings = useCallback(() => {
    navigateTo('/settings', { state: { tab: 'currency' } });
  }, [navigateTo]);

  // 快速導航到通知設定
  const navigateToNotificationSettings = useCallback(() => {
    navigateTo('/notifications', { state: { tab: 'settings' } });
  }, [navigateTo]);

  // 快速導航到備份設定
  const navigateToBackupSettingsTab = useCallback(() => {
    navigateTo('/backup', { state: { tab: 'settings' } });
  }, [navigateTo]);

  // 快速導航到學生功能設定
  const navigateToStudentFeatureSettings = useCallback(() => {
    navigateTo('/student-features', { state: { tab: 'settings' } });
  }, [navigateTo]);

  // 快速導航到幫助頁面
  const navigateToHelp = useCallback(() => {
    navigateTo('/help');
  }, [navigateTo]);

  // 快速導航到關於頁面
  const navigateToAbout = useCallback(() => {
    navigateTo('/about');
  }, [navigateTo]);

  // 快速導航到隱私政策
  const navigateToPrivacyPolicy = useCallback(() => {
    navigateTo('/privacy-policy');
  }, [navigateTo]);

  // 快速導航到使用條款
  const navigateToTermsOfService = useCallback(() => {
    navigateTo('/terms-of-service');
  }, [navigateTo]);

  // 快速導航到聯絡我們
  const navigateToContact = useCallback(() => {
    navigateTo('/contact');
  }, [navigateTo]);

  // 快速導航到意見回饋
  const navigateToFeedback = useCallback(() => {
    navigateTo('/feedback');
  }, [navigateTo]);

  // 快速導航到更新日誌
  const navigateToChangelog = useCallback(() => {
    navigateTo('/changelog');
  }, [navigateTo]);

  // 快速導航到常見問題
  const navigateToFAQ = useCallback(() => {
    navigateTo('/faq');
  }, [navigateTo]);

  // 快速導航到教學
  const navigateToTutorial = useCallback(() => {
    navigateTo('/tutorial');
  }, [navigateTo]);

  // 快速導航到快速開始
  const navigateToQuickStart = useCallback(() => {
    navigateTo('/quick-start');
  }, [navigateTo]);

  // 快速導航到進階功能
  const navigateToAdvancedFeatures = useCallback(() => {
    navigateTo('/advanced-features');
  }, [navigateTo]);

  // 快速導航到API文檔
  const navigateToAPIDocs = useCallback(() => {
    navigateTo('/api-docs');
  }, [navigateTo]);

  // 快速導航到開發者工具
  const navigateToDeveloperTools = useCallback(() => {
    navigateTo('/developer-tools');
  }, [navigateTo]);

  // 快速導航到系統狀態
  const navigateToSystemStatus = useCallback(() => {
    navigateTo('/system-status');
  }, [navigateTo]);

  // 快速導航到維護模式
  const navigateToMaintenanceMode = useCallback(() => {
    navigateTo('/maintenance');
  }, [navigateTo]);

  // 快速導航到錯誤頁面
  const navigateToErrorPage = useCallback((errorCode: string) => {
    navigateTo(`/error/${errorCode}`);
  }, [navigateTo]);

  // 快速導航到404頁面
  const navigateTo404 = useCallback(() => {
    navigateTo('/404');
  }, [navigateTo]);

  // 快速導航到500頁面
  const navigateTo500 = useCallback(() => {
    navigateTo('/500');
  }, [navigateTo]);

  // 快速導航到403頁面
  const navigateTo403 = useCallback(() => {
    navigateTo('/403');
  }, [navigateTo]);

  // 快速導航到401頁面
  const navigateTo401 = useCallback(() => {
    navigateTo('/401');
  }, [navigateTo]);

  // 快速導航到登入頁面
  const navigateToLogin = useCallback(() => {
    navigateTo('/login');
  }, [navigateTo]);

  // 快速導航到註冊頁面
  const navigateToRegister = useCallback(() => {
    navigateTo('/register');
  }, [navigateTo]);

  // 快速導航到忘記密碼頁面
  const navigateToForgotPassword = useCallback(() => {
    navigateTo('/forgot-password');
  }, [navigateTo]);

  // 快速導航到重設密碼頁面
  const navigateToResetPassword = useCallback(() => {
    navigateTo('/reset-password');
  }, [navigateTo]);

  // 快速導航到驗證郵件頁面
  const navigateToVerifyEmail = useCallback(() => {
    navigateTo('/verify-email');
  }, [navigateTo]);

  // 快速導航到個人資料頁面
  const navigateToProfile = useCallback(() => {
    navigateTo('/profile');
  }, [navigateTo]);

  // 快速導航到安全設定頁面
  const navigateToSecuritySettings = useCallback(() => {
    navigateTo('/security-settings');
  }, [navigateTo]);

  // 快速導航到隱私設定頁面
  const navigateToPrivacySettings = useCallback(() => {
    navigateTo('/privacy-settings');
  }, [navigateTo]);

  // 快速導航到通知偏好頁面
  const navigateToNotificationPreferences = useCallback(() => {
    navigateTo('/notification-preferences');
  }, [navigateTo]);

  // 快速導航到語言設定頁面
  const navigateToLanguageSettings = useCallback(() => {
    navigateTo('/language-settings');
  }, [navigateTo]);

  // 快速導航到主題設定頁面
  const navigateToThemeSettings = useCallback(() => {
    navigateTo('/theme-settings');
  }, [navigateTo]);

  // 快速導航到字體設定頁面
  const navigateToFontSettings = useCallback(() => {
    navigateTo('/font-settings');
  }, [navigateTo]);

  // 快速導航到顯示設定頁面
  const navigateToDisplaySettings = useCallback(() => {
    navigateTo('/display-settings');
  }, [navigateTo]);

  // 快速導航到音效設定頁面
  const navigateToSoundSettings = useCallback(() => {
    navigateTo('/sound-settings');
  }, [navigateTo]);

  // 快速導航到鍵盤快捷鍵頁面
  const navigateToKeyboardShortcuts = useCallback(() => {
    navigateTo('/keyboard-shortcuts');
  }, [navigateTo]);

  // 快速導航到滑鼠設定頁面
  const navigateToMouseSettings = useCallback(() => {
    navigateTo('/mouse-settings');
  }, [navigateTo]);

  // 快速導航到觸控設定頁面
  const navigateToTouchSettings = useCallback(() => {
    navigateTo('/touch-settings');
  }, [navigateTo]);

  // 快速導航到無障礙設定頁面
  const navigateToAccessibilitySettings = useCallback(() => {
    navigateTo('/accessibility-settings');
  }, [navigateTo]);

  // 快速導航到效能設定頁面
  const navigateToPerformanceSettings = useCallback(() => {
    navigateTo('/performance-settings');
  }, [navigateTo]);

  // 快速導航到網路設定頁面
  const navigateToNetworkSettings = useCallback(() => {
    navigateTo('/network-settings');
  }, [navigateTo]);

  // 快速導航到同步設定頁面
  const navigateToSyncSettings = useCallback(() => {
    navigateTo('/sync-settings');
  }, [navigateTo]);

  // 快速導航到離線設定頁面
  const navigateToOfflineSettings = useCallback(() => {
    navigateTo('/offline-settings');
  }, [navigateTo]);

  // 快速導航到快取設定頁面
  const navigateToCacheSettings = useCallback(() => {
    navigateTo('/cache-settings');
  }, [navigateTo]);

  // 快速導航到儲存設定頁面
  const navigateToStorageSettings = useCallback(() => {
    navigateTo('/storage-settings');
  }, [navigateTo]);

  // 快速導航到資料庫設定頁面
  const navigateToDatabaseSettings = useCallback(() => {
    navigateTo('/database-settings');
  }, [navigateTo]);

  // 快速導航到備份設定頁面
  const navigateToBackupSettingsPage = useCallback(() => {
    navigateTo('/backup-settings');
  }, [navigateTo]);

  // 快速導航到還原設定頁面
  const navigateToRestoreSettings = useCallback(() => {
    navigateTo('/restore-settings');
  }, [navigateTo]);

  // 快速導航到匯出設定頁面
  const navigateToExportSettings = useCallback(() => {
    navigateTo('/export-settings');
  }, [navigateTo]);

  // 快速導航到匯入設定頁面
  const navigateToImportSettings = useCallback(() => {
    navigateTo('/import-settings');
  }, [navigateTo]);

  // 快速導航到分享設定頁面
  const navigateToShareSettings = useCallback(() => {
    navigateTo('/share-settings');
  }, [navigateTo]);

  // 快速導航到協作設定頁面
  const navigateToCollaborationSettings = useCallback(() => {
    navigateTo('/collaboration-settings');
  }, [navigateTo]);

  // 快速導航到權限設定頁面
  const navigateToPermissionSettings = useCallback(() => {
    navigateTo('/permission-settings');
  }, [navigateTo]);

  // 快速導航到角色設定頁面
  const navigateToRoleSettings = useCallback(() => {
    navigateTo('/role-settings');
  }, [navigateTo]);

  // 快速導航到群組設定頁面
  const navigateToGroupSettings = useCallback(() => {
    navigateTo('/group-settings');
  }, [navigateTo]);

  // 快速導航到團隊設定頁面
  const navigateToTeamSettings = useCallback(() => {
    navigateTo('/team-settings');
  }, [navigateTo]);

  // 快速導航到組織設定頁面
  const navigateToOrganizationSettings = useCallback(() => {
    navigateTo('/organization-settings');
  }, [navigateTo]);

  // 快速導航到企業設定頁面
  const navigateToEnterpriseSettings = useCallback(() => {
    navigateTo('/enterprise-settings');
  }, [navigateTo]);

  // 快速導航到管理員設定頁面
  const navigateToAdminSettings = useCallback(() => {
    navigateTo('/admin-settings');
  }, [navigateTo]);

  // 快速導航到系統管理頁面
  const navigateToSystemManagement = useCallback(() => {
    navigateTo('/system-management');
  }, [navigateTo]);

  // 快速導航到日誌頁面
  const navigateToLogs = useCallback(() => {
    navigateTo('/logs');
  }, [navigateTo]);

  // 快速導航到監控頁面
  const navigateToMonitoring = useCallback(() => {
    navigateTo('/monitoring');
  }, [navigateTo]);

  // 快速導航到分析頁面
  const navigateToAnalytics = useCallback(() => {
    navigateTo('/analytics');
  }, [navigateTo]);

  // 快速導航到報告頁面
  const navigateToReports = useCallback(() => {
    navigateTo('/reports');
  }, [navigateTo]);

  // 快速導航到儀表板頁面
  const navigateToDashboard = useCallback(() => {
    navigateTo('/dashboard');
  }, [navigateTo]);

  // 快速導航到首頁
  const navigateToHome = useCallback(() => {
    navigateTo('/');
  }, [navigateTo]);

  // 快速導航到上一頁
  const navigateBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // 快速導航到下一頁
  const navigateForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  // 快速導航到重新整理
  const navigateRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    // 狀態
    isNavigating,
    
    // 基礎導航
    navigateTo,
    navigateBack,
    navigateForward,
    navigateRefresh,
    
    // 主要頁面導航
    navigateToHome,
    navigateToDashboard,
    navigateToAccounts,
    navigateToTransactions,
    navigateToStatistics,
    navigateToNotifications,
    navigateToSettings,
    navigateToBackup,
    navigateToStudentFeatures,
    
    // 快速操作導航
    navigateToAddAccount,
    navigateToAddTransaction,
    navigateToAccount,
    navigateToTransaction,
    navigateToNotification,
    navigateToStatisticsDetail,
    
    // 設定頁面導航
    navigateToCategoryManagement,
    navigateToCurrencySettings,
    navigateToNotificationSettings,
    navigateToBackupSettingsTab,
    navigateToStudentFeatureSettings,
    
    // 幫助和支援導航
    navigateToHelp,
    navigateToAbout,
    navigateToPrivacyPolicy,
    navigateToTermsOfService,
    navigateToContact,
    navigateToFeedback,
    navigateToChangelog,
    navigateToFAQ,
    navigateToTutorial,
    navigateToQuickStart,
    navigateToAdvancedFeatures,
    navigateToAPIDocs,
    navigateToDeveloperTools,
    navigateToSystemStatus,
    navigateToMaintenanceMode,
    
    // 錯誤頁面導航
    navigateToErrorPage,
    navigateTo404,
    navigateTo500,
    navigateTo403,
    navigateTo401,
    
    // 認證頁面導航
    navigateToLogin,
    navigateToRegister,
    navigateToForgotPassword,
    navigateToResetPassword,
    navigateToVerifyEmail,
    navigateToProfile,
    
    // 安全和隱私導航
    navigateToSecuritySettings,
    navigateToPrivacySettings,
    navigateToNotificationPreferences,
    
    // 外觀和體驗導航
    navigateToLanguageSettings,
    navigateToThemeSettings,
    navigateToFontSettings,
    navigateToDisplaySettings,
    navigateToSoundSettings,
    navigateToKeyboardShortcuts,
    navigateToMouseSettings,
    navigateToTouchSettings,
    navigateToAccessibilitySettings,
    
    // 效能和技術導航
    navigateToPerformanceSettings,
    navigateToNetworkSettings,
    navigateToSyncSettings,
    navigateToOfflineSettings,
    navigateToCacheSettings,
    navigateToStorageSettings,
    navigateToDatabaseSettings,
    
    // 資料管理導航
    navigateToBackupSettingsPage,
    navigateToRestoreSettings,
    navigateToExportSettings,
    navigateToImportSettings,
    navigateToShareSettings,
    navigateToCollaborationSettings,
    
    // 權限和管理導航
    navigateToPermissionSettings,
    navigateToRoleSettings,
    navigateToGroupSettings,
    navigateToTeamSettings,
    navigateToOrganizationSettings,
    navigateToEnterpriseSettings,
    navigateToAdminSettings,
    navigateToSystemManagement,
    
    // 監控和分析導航
    navigateToLogs,
    navigateToMonitoring,
    navigateToAnalytics,
    navigateToReports
  };
};
