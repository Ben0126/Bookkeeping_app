import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllAccounts } from '../../../db/accounts';
import { getAllTransactions } from '../../../db/transactions';
import { getAllCategories } from '../../../db/categories';
import type { UserStatus } from '../types';

/**
 * 動態內容切換Hook
 * 根據用戶狀態和數據豐富度動態調整顯示內容
 */
export const useDynamicContent = () => {
  const [contentMode, setContentMode] = useState<'welcome' | 'dashboard' | 'transitioning'>('welcome');
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 獲取基礎數據
  const accounts = useLiveQuery(getAllAccounts) || [];
  const transactions = useLiveQuery(getAllTransactions) || [];
  const categories = useLiveQuery(getAllCategories) || [];

  // 計算數據豐富度
  const dataRichness = useMemo(() => {
    const accountScore = Math.min(accounts.length * 10, 50);
    const transactionScore = Math.min(transactions.length * 2, 30);
    const categoryScore = Math.min(categories.length * 5, 20);
    
    return accountScore + transactionScore + categoryScore;
  }, [accounts.length, transactions.length, categories.length]);

  // 計算內容模式
  const calculateContentMode = (userStatus: UserStatus): 'welcome' | 'dashboard' => {
    if (userStatus === 'new' && dataRichness < 20) {
      return 'welcome';
    }
    return 'dashboard';
  };

  // 觸發內容切換
  const triggerContentTransition = (targetMode: 'welcome' | 'dashboard') => {
    if (contentMode === targetMode) return;

    setIsTransitioning(true);
    setContentMode('transitioning');
    setTransitionProgress(0);

    // 模擬過渡動畫
    const duration = 800; // 800ms 過渡時間
    const steps = 20;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = (currentStep / steps) * 100;
      setTransitionProgress(progress);

      if (currentStep >= steps) {
        clearInterval(interval);
        setContentMode(targetMode);
        setIsTransitioning(false);
        setTransitionProgress(100);
        
        // 重置進度
        setTimeout(() => setTransitionProgress(0), 100);
      }
    }, stepDuration);
  };

  // 根據用戶狀態自動切換內容
  const updateContentMode = (userStatus: UserStatus) => {
    const newMode = calculateContentMode(userStatus);
    if (newMode !== contentMode && !isTransitioning) {
      triggerContentTransition(newMode);
    }
  };

  // 獲取當前應該顯示的組件
  const getDisplayComponents = (userStatus: UserStatus) => {
    const mode = calculateContentMode(userStatus);
    
    switch (mode) {
      case 'welcome':
        return {
          showWelcome: true,
          showDashboard: false,
          showFinancialOverview: false,
          showAccountSummary: false,
          showRecentTransactions: false,
          showStatisticsPreview: false,
          showNotificationsSummary: false,
          showQuickActions: true, // 快速操作始終顯示
        };
      
      case 'dashboard':
        return {
          showWelcome: false,
          showDashboard: true,
          showFinancialOverview: true,
          showAccountSummary: true,
          showRecentTransactions: true,
          showStatisticsPreview: true,
          showNotificationsSummary: true,
          showQuickActions: true,
        };
      
      default:
        return {
          showWelcome: false,
          showDashboard: false,
          showFinancialOverview: false,
          showAccountSummary: false,
          showRecentTransactions: false,
          showStatisticsPreview: false,
          showNotificationsSummary: false,
          showQuickActions: true,
        };
    }
  };

  // 獲取過渡動畫樣式
  const getTransitionStyles = () => {
    if (!isTransitioning) return {};

    return {
      opacity: transitionProgress / 100,
      transform: `translateY(${20 - (transitionProgress / 100) * 20}px)`,
      transition: 'all 0.3s ease-in-out',
    };
  };

  // 獲取內容建議
  const getContentSuggestions = (userStatus: UserStatus) => {
    const suggestions = [];

    if (userStatus === 'new') {
      suggestions.push({
        type: 'primary',
        title: '開始您的財務管理之旅',
        description: '添加您的第一個帳戶，開始記錄收支',
        action: 'add-account',
        priority: 'high'
      });
    } else if (userStatus === 'active') {
      if (accounts.length === 0) {
        suggestions.push({
          type: 'info',
          title: '添加更多帳戶',
          description: '管理不同類型的帳戶，更好地追蹤財務狀況',
          action: 'add-account',
          priority: 'medium'
        });
      }
      
      if (transactions.length < 5) {
        suggestions.push({
          type: 'info',
          title: '記錄更多交易',
          description: '養成記帳習慣，獲得更好的財務洞察',
          action: 'add-transaction',
          priority: 'medium'
        });
      }
    } else if (userStatus === 'experienced') {
      suggestions.push({
        type: 'success',
        title: '探索進階功能',
        description: '使用統計分析和預算功能，優化您的財務管理',
        action: 'view-statistics',
        priority: 'low'
      });
    }

    return suggestions;
  };

  // 獲取個性化問候語
  const getPersonalizedGreeting = (userStatus: UserStatus) => {
    const greetings = {
      new: {
        title: '歡迎使用 StudyBudget Pro',
        subtitle: '您的智能財務管理助手',
        description: '讓我們開始您的財務管理之旅'
      },
      active: {
        title: '歡迎回來',
        subtitle: '繼續管理您的財務',
        description: `您已經記錄了 ${transactions.length} 筆交易`
      },
      experienced: {
        title: '財務管理專家',
        subtitle: '您的財務狀況一目了然',
        description: `您已經管理了 ${accounts.length} 個帳戶和 ${transactions.length} 筆交易`
      }
    };

    return greetings[userStatus] || greetings.new;
  };

  return {
    // 狀態
    contentMode,
    transitionProgress,
    isTransitioning,
    dataRichness,
    
    // 方法
    triggerContentTransition,
    updateContentMode,
    getDisplayComponents,
    getTransitionStyles,
    getContentSuggestions,
    getPersonalizedGreeting,
    
    // 數據
    accounts,
    transactions,
    categories
  };
};
