import { db } from '../db';
import { getAllTransactions } from '../db/transactions';
import { getAllAccounts } from '../db/accounts';

// 提醒類型
export enum NotificationType {
  DAILY_REMINDER = 'daily_reminder',
  BUDGET_EXCEEDED = 'budget_exceeded',
  LOW_BALANCE = 'low_balance',
  WEEKLY_SUMMARY = 'weekly_summary',
  MONTHLY_SUMMARY = 'monthly_summary',
}

// 提醒設定介面
export interface NotificationSettings {
  id?: number;
  type: NotificationType;
  enabled: boolean;
  time?: string; // HH:MM 格式
  threshold?: number; // 用於餘額不足警告的閾值
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 提醒記錄介面
export interface NotificationRecord {
  id?: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

// 預算設定介面
export interface BudgetSetting {
  id?: number;
  categoryId?: number; // 可選，用於分類預算
  amount: number;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  isActive: boolean;
}

// 擴展資料庫以支援提醒功能
export class NotificationDB extends db.constructor {
  notificationSettings!: Dexie.Table<NotificationSettings, number>;
  notificationRecords!: Dexie.Table<NotificationRecord, number>;
  budgetSettings!: Dexie.Table<BudgetSetting, number>;
  
  constructor() {
    super('StudyBudgetDB');
    this.version(3).stores({
      accounts: '++id, name, type, currency',
      transactions: '++id, type, date, accountId, categoryId',
      categories: '++id, name, type',
      merchantRules: '++id, pattern, categoryId, lastUsed, usageCount',
      notificationSettings: '++id, type, enabled, time, lastTriggered',
      notificationRecords: '++id, type, createdAt, isRead',
      budgetSettings: '++id, categoryId, amount, period, startDate, isActive',
    });
  }
}

export const notificationDb = new NotificationDB();

export class NotificationService {
  // 瀏覽器通知權限
  static async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // 發送瀏覽器通知
  static async sendBrowserNotification(title: string, message: string, icon?: string): Promise<void> {
    const hasPermission = await this.requestNotificationPermission();
    
    if (hasPermission) {
      new Notification(title, {
        body: message,
        icon: icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'studybudget-notification',
        requireInteraction: false,
        silent: false,
      });
    }
  }

  // 創建應用內通知記錄
  static async createNotificationRecord(
    type: NotificationType, 
    title: string, 
    message: string
  ): Promise<void> {
    try {
      await notificationDb.notificationRecords.add({
        type,
        title,
        message,
        isRead: false,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error creating notification record:', error);
    }
  }

  // 初始化預設提醒設定
  static async initializeDefaultSettings(): Promise<void> {
    try {
      const existingSettings = await notificationDb.notificationSettings.count();
      
      if (existingSettings === 0) {
        const defaultSettings: Omit<NotificationSettings, 'id'>[] = [
          {
            type: NotificationType.DAILY_REMINDER,
            enabled: true,
            time: '20:00', // 晚上8點提醒記帳
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            type: NotificationType.LOW_BALANCE,
            enabled: true,
            threshold: 100, // 餘額低於$100時提醒
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            type: NotificationType.WEEKLY_SUMMARY,
            enabled: true,
            time: '09:00', // 週一早上9點發送週報
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            type: NotificationType.MONTHLY_SUMMARY,
            enabled: true,
            time: '09:00', // 每月1號早上9點發送月報
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        for (const setting of defaultSettings) {
          await notificationDb.notificationSettings.add(setting);
        }
      }
    } catch (error) {
      console.error('Error initializing notification settings:', error);
    }
  }

  // 檢查每日記帳提醒
  static async checkDailyReminder(): Promise<void> {
    const settings = await notificationDb.notificationSettings
      .where('type')
      .equals(NotificationType.DAILY_REMINDER)
      .first();

    if (!settings || !settings.enabled) return;

    const now = new Date();
    const today = now.toDateString();
    
    // 檢查今天是否已經記帳
    const todayTransactions = await getAllTransactions();
    const hasTodayTransaction = todayTransactions.some(tx => 
      new Date(tx.date).toDateString() === today
    );

    // 檢查是否已經發送過今天的提醒
    const lastTriggered = settings.lastTriggered;
    const hasTriggeredToday = lastTriggered && 
      new Date(lastTriggered).toDateString() === today;

    if (!hasTodayTransaction && !hasTriggeredToday) {
      const title = '💰 Daily Reminder';
      const message = "Don't forget to record your transactions today! Keep track of your spending habits.";
      
      await this.sendBrowserNotification(title, message);
      await this.createNotificationRecord(NotificationType.DAILY_REMINDER, title, message);
      
      // 更新最後觸發時間
      await notificationDb.notificationSettings.update(settings.id!, {
        lastTriggered: now,
        updatedAt: now,
      });
    }
  }

  // 檢查預算超支警告
  static async checkBudgetExceeded(): Promise<void> {
    try {
      const activeBudgets = await notificationDb.budgetSettings
        .where('isActive')
        .equals(1)
        .toArray();

      for (const budget of activeBudgets) {
        const spent = await this.calculateSpentAmount(budget);
        const percentage = (spent / budget.amount) * 100;

        if (percentage >= 80) { // 超過80%預算時警告
          const title = percentage >= 100 ? '🚨 Budget Exceeded!' : '⚠️ Budget Warning!';
          const message = percentage >= 100 
            ? `You've exceeded your ${budget.period} budget by ${(percentage - 100).toFixed(1)}%!`
            : `You've used ${percentage.toFixed(1)}% of your ${budget.period} budget.`;
          
          await this.sendBrowserNotification(title, message);
          await this.createNotificationRecord(NotificationType.BUDGET_EXCEEDED, title, message);
        }
      }
    } catch (error) {
      console.error('Error checking budget exceeded:', error);
    }
  }

  // 檢查餘額不足警告
  static async checkLowBalance(): Promise<void> {
    const settings = await notificationDb.notificationSettings
      .where('type')
      .equals(NotificationType.LOW_BALANCE)
      .first();

    if (!settings || !settings.enabled || !settings.threshold) return;

    try {
      const accounts = await getAllAccounts();
      const lowBalanceAccounts = accounts.filter(account => 
        account.balance < settings.threshold!
      );

      if (lowBalanceAccounts.length > 0) {
        const title = '💳 Low Balance Alert';
        const accountNames = lowBalanceAccounts.map(acc => acc.name).join(', ');
        const message = `Warning: Low balance detected in ${accountNames}. Consider adding funds.`;
        
        await this.sendBrowserNotification(title, message);
        await this.createNotificationRecord(NotificationType.LOW_BALANCE, title, message);
      }
    } catch (error) {
      console.error('Error checking low balance:', error);
    }
  }

  // 生成週報
  static async generateWeeklyReport(): Promise<void> {
    const settings = await notificationDb.notificationSettings
      .where('type')
      .equals(NotificationType.WEEKLY_SUMMARY)
      .first();

    if (!settings || !settings.enabled) return;

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const transactions = await getAllTransactions();
      const weekTransactions = transactions.filter(tx => 
        new Date(tx.date) >= weekAgo
      );

      const totalIncome = weekTransactions
        .filter(tx => tx.type === 'Income')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalExpense = weekTransactions
        .filter(tx => tx.type === 'Expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const title = '📊 Weekly Report';
      const message = `This week: Income $${totalIncome.toFixed(2)}, Expenses $${totalExpense.toFixed(2)}, Net: $${(totalIncome - totalExpense).toFixed(2)}`;
      
      await this.sendBrowserNotification(title, message);
      await this.createNotificationRecord(NotificationType.WEEKLY_SUMMARY, title, message);

      // 更新最後觸發時間
      await notificationDb.notificationSettings.update(settings.id!, {
        lastTriggered: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error generating weekly report:', error);
    }
  }

  // 生成月報
  static async generateMonthlyReport(): Promise<void> {
    const settings = await notificationDb.notificationSettings
      .where('type')
      .equals(NotificationType.MONTHLY_SUMMARY)
      .first();

    if (!settings || !settings.enabled) return;

    try {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      const transactions = await getAllTransactions();
      const monthTransactions = transactions.filter(tx => 
        new Date(tx.date) >= monthAgo
      );

      const totalIncome = monthTransactions
        .filter(tx => tx.type === 'Income')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalExpense = monthTransactions
        .filter(tx => tx.type === 'Expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const title = '📊 Monthly Report';
      const message = `Last month: Income $${totalIncome.toFixed(2)}, Expenses $${totalExpense.toFixed(2)}, Net: $${(totalIncome - totalExpense).toFixed(2)}`;
      
      await this.sendBrowserNotification(title, message);
      await this.createNotificationRecord(NotificationType.MONTHLY_SUMMARY, title, message);

      // 更新最後觸發時間
      await notificationDb.notificationSettings.update(settings.id!, {
        lastTriggered: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error generating monthly report:', error);
    }
  }

  // 計算預算期間內的支出
  private static async calculateSpentAmount(budget: BudgetSetting): Promise<number> {
    const now = new Date();
    let startDate: Date;

    switch (budget.period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = budget.startDate;
    }

    const transactions = await getAllTransactions();
    const periodTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const matchesPeriod = txDate >= startDate && txDate <= now;
      const matchesCategory = budget.categoryId ? tx.categoryId === budget.categoryId : true;
      const isExpense = tx.type === 'Expense';
      
      return matchesPeriod && matchesCategory && isExpense;
    });

    return periodTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  // 啟動提醒系統
  static async startNotificationSystem(): Promise<void> {
    // 初始化設定
    await this.initializeDefaultSettings();
    
    // 請求通知權限
    await this.requestNotificationPermission();

    // 設定定時檢查（每小時檢查一次）
    setInterval(async () => {
      await this.checkDailyReminder();
      await this.checkBudgetExceeded();
      await this.checkLowBalance();
    }, 60 * 60 * 1000); // 1小時

    // 設定每日檢查（週報和月報）
    setInterval(async () => {
      const now = new Date();
      
      // 每週一檢查週報
      if (now.getDay() === 1) {
        await this.generateWeeklyReport();
      }
      
      // 每月1號檢查月報
      if (now.getDate() === 1) {
        await this.generateMonthlyReport();
      }
    }, 24 * 60 * 60 * 1000); // 24小時

    console.log('Notification system started');
  }

  // 獲取未讀通知數量
  static async getUnreadNotificationCount(): Promise<number> {
    try {
      return await notificationDb.notificationRecords
        .where('isRead')
        .equals(0)
        .count();
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  // 獲取最近的通知
  static async getRecentNotifications(limit = 10): Promise<NotificationRecord[]> {
    try {
      return await notificationDb.notificationRecords
        .orderBy('createdAt')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Error getting recent notifications:', error);
      return [];
    }
  }

  // 標記通知為已讀
  static async markNotificationAsRead(notificationId: number): Promise<void> {
    try {
      await notificationDb.notificationRecords.update(notificationId, {
        isRead: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // 標記所有通知為已讀
  static async markAllNotificationsAsRead(): Promise<void> {
    try {
      const unreadNotifications = await notificationDb.notificationRecords
        .where('isRead')
        .equals(0)
        .toArray();

      for (const notification of unreadNotifications) {
        if (notification.id) {
          await this.markNotificationAsRead(notification.id);
        }
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
}
