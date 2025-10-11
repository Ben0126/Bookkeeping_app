import type { UserStatus } from '../types';

/**
 * 用戶體驗工具函數
 * 提供各種用戶體驗相關的功能
 */

/**
 * 獲取用戶狀態的顯示文本
 */
export const getUserStatusText = (status: UserStatus): string => {
  const statusTexts = {
    new: '新用戶',
    active: '活躍用戶',
    experienced: '經驗用戶'
  };
  
  return statusTexts[status] || '未知狀態';
};

/**
 * 獲取用戶狀態的描述
 */
export const getUserStatusDescription = (status: UserStatus): string => {
  const descriptions = {
    new: '歡迎使用 StudyBudget Pro！讓我們開始您的財務管理之旅。',
    active: '您已經開始使用記帳功能，繼續保持這個好習慣！',
    experienced: '您已經熟練使用記帳功能，可以探索更多進階功能。'
  };
  
  return descriptions[status] || '歡迎使用 StudyBudget Pro！';
};

/**
 * 獲取用戶狀態的建議操作
 */
export const getUserStatusSuggestions = (status: UserStatus): string[] => {
  const suggestions = {
    new: [
      '創建您的第一個帳戶',
      '記錄第一筆交易',
      '設定預算目標',
      '探索應用功能'
    ],
    active: [
      '定期檢查財務狀況',
      '設定支出提醒',
      '查看統計分析',
      '優化預算分配'
    ],
    experienced: [
      '使用進階統計功能',
      '設定自動分類規則',
      '導出財務報告',
      '分享使用心得'
    ]
  };
  
  return suggestions[status] || [];
};

/**
 * 獲取用戶狀態的圖標
 */
export const getUserStatusIcon = (status: UserStatus): string => {
  const icons = {
    new: '👋',
    active: '🚀',
    experienced: '⭐'
  };
  
  return icons[status] || '👋';
};

/**
 * 獲取用戶狀態的主題色
 */
export const getUserStatusColor = (status: UserStatus): string => {
  const colors = {
    new: 'blue',
    active: 'green',
    experienced: 'purple'
  };
  
  return colors[status] || 'blue';
};

/**
 * 檢查是否應該顯示歡迎訊息
 */
export const shouldShowWelcomeMessage = (status: UserStatus): boolean => {
  return status === 'new';
};

/**
 * 檢查是否應該顯示進階功能
 */
export const shouldShowAdvancedFeatures = (status: UserStatus): boolean => {
  return status === 'experienced';
};

/**
 * 獲取適合的快速操作數量
 */
export const getQuickActionsCount = (status: UserStatus): number => {
  const counts = {
    new: 2,
    active: 3,
    experienced: 4
  };
  
  return counts[status] || 2;
};

/**
 * 獲取適合的統計圖表數量
 */
export const getChartsCount = (status: UserStatus): number => {
  const counts = {
    new: 1,
    active: 2,
    experienced: 3
  };
  
  return counts[status] || 1;
};

/**
 * 獲取適合的交易顯示數量
 */
export const getTransactionsCount = (status: UserStatus): number => {
  const counts = {
    new: 3,
    active: 5,
    experienced: 7
  };
  
  return counts[status] || 3;
};

/**
 * 獲取適合的帳戶顯示數量
 */
export const getAccountsCount = (status: UserStatus): number => {
  const counts = {
    new: 3,
    active: 5,
    experienced: 7
  };
  
  return counts[status] || 3;
};

/**
 * 檢查是否應該顯示提示
 */
export const shouldShowTips = (status: UserStatus): boolean => {
  return status === 'new' || status === 'active';
};

/**
 * 獲取適合的提示內容
 */
export const getTipsForUser = (status: UserStatus): string[] => {
  const tips = {
    new: [
      '點擊「新增帳戶」開始記錄您的財務狀況',
      '每筆交易都要及時記錄，養成好習慣',
      '定期查看統計分析，了解支出模式'
    ],
    active: [
      '設定預算目標，控制支出',
      '使用分類功能，更好地管理財務',
      '定期備份數據，確保數據安全'
    ],
    experienced: [
      '使用進階統計功能，深入分析財務狀況',
      '設定自動分類規則，提高記帳效率',
      '導出財務報告，與會計師或顧問分享'
    ]
  };
  
  return tips[status] || [];
};

/**
 * 獲取用戶等級
 */
export const getUserLevel = (status: UserStatus): number => {
  const levels = {
    new: 1,
    active: 2,
    experienced: 3
  };
  
  return levels[status] || 1;
};

/**
 * 獲取用戶等級名稱
 */
export const getUserLevelName = (status: UserStatus): string => {
  const levelNames = {
    new: '初學者',
    active: '熟練者',
    experienced: '專家'
  };
  
  return levelNames[status] || '初學者';
};

/**
 * 檢查是否應該顯示成就
 */
export const shouldShowAchievements = (status: UserStatus): boolean => {
  return status === 'active' || status === 'experienced';
};

/**
 * 獲取適合的成就內容
 */
export const getAchievementsForUser = (status: UserStatus): string[] => {
  const achievements = {
    active: [
      '連續記帳7天',
      '創建3個帳戶',
      '記錄50筆交易'
    ],
    experienced: [
      '連續記帳30天',
      '創建5個帳戶',
      '記錄200筆交易',
      '使用所有功能'
    ]
  };
  
  return achievements[status as keyof typeof achievements] || [];
};

/**
 * 獲取用戶狀態的進度百分比
 */
export const getUserStatusProgress = (status: UserStatus): number => {
  const progress = {
    new: 0,
    active: 50,
    experienced: 100
  };
  
  return progress[status] || 0;
};

/**
 * 獲取下一個狀態的提示
 */
export const getNextStatusHint = (status: UserStatus): string => {
  const hints = {
    new: '記錄更多交易，成為活躍用戶',
    active: '持續使用進階功能，成為經驗用戶',
    experienced: '您已經是專家級用戶！'
  };
  
  return hints[status] || '繼續使用應用，提升您的財務管理技能';
};
