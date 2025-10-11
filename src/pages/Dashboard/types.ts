// Dashboard 專用類型定義

// 用戶狀態類型
export type UserStatus = 'new' | 'active' | 'experienced';

// 財務概覽數據
export interface FinancialOverview {
  totalAssets: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netWorthChange: number;
  currency: string;
}

// 多貨幣財務概覽數據
export interface MultiCurrencyFinancialOverview {
  [currency: string]: FinancialOverview;
}

// 帳戶摘要數據
export interface AccountSummary {
  id: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  color: string;
}

// 最近交易數據
export interface RecentTransaction {
  id: number;
  type: string;
  amount: number;
  currency: string;
  date: Date;
  categoryName: string;
  accountName: string;
  notes?: string;
}

// 統計預覽數據
export interface StatisticsPreview {
  incomeExpenseRatio: number;
  topCategories: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

// 通知摘要數據
export interface NotificationSummary {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high';
}

// 快速操作項目
export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

// Dashboard 整體數據
export interface DashboardData {
  userStatus: UserStatus;
  financialOverview: MultiCurrencyFinancialOverview;
  accountSummaries: AccountSummary[];
  recentTransactions: RecentTransaction[];
  statisticsPreview: StatisticsPreview;
  notificationSummaries: NotificationSummary[];
  quickActions: QuickAction[];
}

// 用戶狀態檢測結果
export interface UserStatusResult {
  status: UserStatus;
  hasAccounts: boolean;
  hasTransactions: boolean;
  accountCount: number;
  transactionCount: number;
  lastTransactionDate?: Date;
}

// 財務指標計算結果
export interface FinancialMetrics {
  totalAssets: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netWorthChange: number;
  savingsRate: number;
  expenseGrowth: number;
  incomeGrowth: number;
}

// 儀表板組件屬性
export interface DashboardComponentProps {
  data: DashboardData;
  isLoading?: boolean;
  onRefresh?: () => void;
}

// 財務概覽卡片屬性
export interface FinancialOverviewProps {
  overview: MultiCurrencyFinancialOverview;
  isLoading?: boolean;
}

// 帳戶摘要屬性
export interface AccountSummaryProps {
  accounts: AccountSummary[];
  isLoading?: boolean;
  onAccountClick?: (accountId: number) => void;
}

// 最近交易屬性
export interface RecentTransactionsProps {
  transactions: RecentTransaction[];
  isLoading?: boolean;
  onTransactionClick?: (transactionId: number) => void;
  onAddTransaction?: () => void;
}

// 統計預覽屬性
export interface StatisticsPreviewProps {
  statistics: StatisticsPreview;
  isLoading?: boolean;
  onViewDetails?: () => void;
}

// 通知摘要屬性
export interface NotificationsSummaryProps {
  notifications: NotificationSummary[];
  isLoading?: boolean;
  onNotificationClick?: (notificationId: number) => void;
  onMarkAllRead?: () => void;
}

// 快速操作屬性
export interface QuickActionsProps {
  actions: QuickAction[];
  onActionClick?: (actionId: string) => void;
}

// 歡迎區塊屬性
export interface WelcomeSectionProps {
  onGetStarted?: () => void;
  onViewSettings?: () => void;
}

// Hook 返回類型
export interface UseDashboardDataReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export interface UseUserStatusReturn {
  userStatus: UserStatus;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  isFirstTimeUser: boolean;
  hasAnyData: boolean;
  transitionReady: boolean;
}

export interface UseFinancialMetricsReturn {
  metrics: FinancialMetrics | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}
