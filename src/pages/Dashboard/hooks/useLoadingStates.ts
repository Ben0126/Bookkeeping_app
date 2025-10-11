import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllAccounts } from '../../../db/accounts';
import { getAllTransactions } from '../../../db/transactions';
import { getAllCategories } from '../../../db/categories';

/**
 * 加載狀態管理Hook
 * 統一管理Dashboard的各種加載狀態
 */
export const useLoadingStates = () => {
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');

  // 獲取基礎數據
  const accounts = useLiveQuery(getAllAccounts);
  const transactions = useLiveQuery(getAllTransactions);
  const categories = useLiveQuery(getAllCategories);

  // 計算整體加載狀態
  const isLoading = useMemo(() => {
    return accounts === undefined || 
           transactions === undefined || 
           categories === undefined ||
           isInitialLoad ||
           isDataRefreshing ||
           isTransitioning;
  }, [accounts, transactions, categories, isInitialLoad, isDataRefreshing, isTransitioning]);

  // 計算加載進度
  const calculateLoadingProgress = () => {
    let progress = 0;
    let message = '';

    if (accounts !== undefined) {
      progress += 33;
      message = '載入帳戶數據...';
    }
    if (transactions !== undefined) {
      progress += 33;
      message = '載入交易數據...';
    }
    if (categories !== undefined) {
      progress += 34;
      message = '載入分類數據...';
    }

    setLoadingProgress(progress);
    setLoadingMessage(message);
  };

  // 模擬加載進度
  useEffect(() => {
    if (isInitialLoad) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setTimeout(() => {
            setIsInitialLoad(false);
          }, 500);
        }
        setLoadingProgress(progress);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isInitialLoad]);

  // 更新加載進度
  useEffect(() => {
    if (!isInitialLoad) {
      calculateLoadingProgress();
    }
  }, [accounts, transactions, categories, isInitialLoad]);

  // 開始數據刷新
  const startDataRefresh = () => {
    setIsDataRefreshing(true);
    setLoadingMessage('刷新數據中...');
    
    // 模擬刷新過程
    setTimeout(() => {
      setIsDataRefreshing(false);
      setLoadingMessage('');
    }, 1000);
  };

  // 開始過渡
  const startTransition = () => {
    setIsTransitioning(true);
    setLoadingMessage('切換頁面中...');
    
    setTimeout(() => {
      setIsTransitioning(false);
      setLoadingMessage('');
    }, 800);
  };

  // 獲取加載狀態信息
  const getLoadingInfo = () => {
    if (isInitialLoad) {
      return {
        message: '初始化應用...',
        progress: loadingProgress,
        type: 'initial' as const
      };
    }

    if (isDataRefreshing) {
      return {
        message: '刷新數據中...',
        progress: 50,
        type: 'refresh' as const
      };
    }

    if (isTransitioning) {
      return {
        message: '切換頁面中...',
        progress: 75,
        type: 'transition' as const
      };
    }

    if (isLoading) {
      return {
        message: loadingMessage || '載入中...',
        progress: loadingProgress,
        type: 'loading' as const
      };
    }

    return {
      message: '',
      progress: 100,
      type: 'complete' as const
    };
  };

  // 獲取骨架屏配置
  const getSkeletonConfig = () => {
    return {
      showFinancialOverviewSkeleton: accounts === undefined || transactions === undefined,
      showAccountSummarySkeleton: accounts === undefined,
      showRecentTransactionsSkeleton: transactions === undefined,
      showStatisticsPreviewSkeleton: transactions === undefined || categories === undefined,
      showNotificationsSummarySkeleton: true, // 通知總是顯示骨架屏
      showQuickActionsSkeleton: false // 快速操作不需要骨架屏
    };
  };

  // 獲取錯誤狀態
  const getErrorState = () => {
    const errors = [];

    if (accounts === null) {
      errors.push('無法載入帳戶數據');
    }
    if (transactions === null) {
      errors.push('無法載入交易數據');
    }
    if (categories === null) {
      errors.push('無法載入分類數據');
    }

    return {
      hasErrors: errors.length > 0,
      errors,
      canRetry: errors.length > 0
    };
  };

  // 重試加載
  const retryLoading = () => {
    setIsInitialLoad(true);
    setLoadingProgress(0);
    setLoadingMessage('重新載入...');
  };

  // 獲取加載動畫配置
  const getLoadingAnimationConfig = () => {
    const loadingInfo = getLoadingInfo();
    
    return {
      showSpinner: loadingInfo.type !== 'complete',
      showProgress: loadingInfo.type === 'initial' || loadingInfo.type === 'loading',
      showMessage: loadingInfo.message !== '',
      animationType: loadingInfo.type === 'transition' ? 'fade' : 'spin',
      duration: loadingInfo.type === 'transition' ? 800 : 0
    };
  };

  return {
    // 狀態
    isLoading,
    isInitialLoad,
    isDataRefreshing,
    isTransitioning,
    loadingProgress,
    loadingMessage,
    
    // 方法
    startDataRefresh,
    startTransition,
    retryLoading,
    
    // 信息
    getLoadingInfo,
    getSkeletonConfig,
    getErrorState,
    getLoadingAnimationConfig,
    
    // 數據狀態
    accountsLoaded: accounts !== undefined,
    transactionsLoaded: transactions !== undefined,
    categoriesLoaded: categories !== undefined,
    
    // 數據
    accounts: accounts || [],
    transactions: transactions || [],
    categories: categories || []
  };
};
