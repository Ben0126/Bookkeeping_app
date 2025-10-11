import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { NotificationService, NotificationType } from '../../../services/notificationService';
import type { NotificationRecord } from '../../../services/notificationService';
import { notificationDb } from '../../../services/notificationService';

/**
 * 通知整合Hook
 * 整合現有Notifications頁面的邏輯到Dashboard
 */
export const useNotificationsIntegration = () => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');
  const [isLoading, setIsLoading] = useState(false);

  // 使用 useLiveQuery 來即時更新通知
  const notifications = useLiveQuery(() => 
    NotificationService.getRecentNotifications(20)
  ) || [];
  
  const unreadCount = useLiveQuery(() => 
    NotificationService.getUnreadNotificationCount()
  ) || 0;

  const settings = useLiveQuery(() => 
    notificationDb.notificationSettings.toArray()
  ) || [];

  // 格式化通知時間
  const formatNotificationTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  // 獲取通知類型的顯示名稱
  const getNotificationTypeName = (type: keyof typeof NotificationType): string => {
    const typeNames = {
      DAILY_REMINDER: 'Daily Reminder',
      BUDGET_EXCEEDED: 'Budget Alert',
      LOW_BALANCE: 'Balance Alert',
      WEEKLY_SUMMARY: 'Weekly Report',
      MONTHLY_SUMMARY: 'Monthly Report',
    };
    return typeNames[type] || type;
  };

  // 獲取通知類型的圖示
  const getNotificationIcon = (type: keyof typeof NotificationType): string => {
    const icons = {
      DAILY_REMINDER: '💰',
      BUDGET_EXCEEDED: '🚨',
      LOW_BALANCE: '💳',
      WEEKLY_SUMMARY: '📊',
      MONTHLY_SUMMARY: '📈',
    };
    return icons[type] || '🔔';
  };

  // 獲取通知優先級顏色
  const getPriorityColor = (priority: string): string => {
    const colors = {
      'high': 'text-red-600 bg-red-50 border-red-200',
      'medium': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'low': 'text-blue-600 bg-blue-50 border-blue-200',
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  // 處理通知點擊
  const handleNotificationClick = async (notification: NotificationRecord) => {
    if (!notification.isRead && notification.id) {
      setIsLoading(true);
      try {
        await NotificationService.markNotificationAsRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 標記所有為已讀
  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    try {
      await NotificationService.markAllNotificationsAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 更新提醒設定
  const handleSettingToggle = async (settingId: number, enabled: boolean) => {
    try {
      await notificationDb.notificationSettings.update(settingId, {
        enabled,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating notification setting:', error);
    }
  };

  // 更新提醒時間
  const handleTimeUpdate = async (settingId: number, time: string) => {
    try {
      await notificationDb.notificationSettings.update(settingId, {
        time,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating notification time:', error);
    }
  };

  // 刪除通知
  const handleDeleteNotification = async (notificationId: number) => {
    setIsLoading(true);
    try {
      // 使用現有的刪除方法
      await notificationDb.notificationRecords.delete(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 清除所有已讀通知
  const handleClearReadNotifications = async () => {
    setIsLoading(true);
    try {
      // 刪除所有已讀通知
      await notificationDb.notificationRecords.where('isRead').equals(1).delete();
    } catch (error) {
      console.error('Error clearing read notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 按優先級分組通知
  const notificationsByPriority = useMemo(() => {
    const grouped = {
      high: [] as NotificationRecord[],
      medium: [] as NotificationRecord[],
      low: [] as NotificationRecord[]
    };

    notifications.forEach(notification => {
      // 假設優先級為 low，因為 NotificationRecord 沒有 priority 屬性
      const priority = 'low';
      if (grouped[priority as keyof typeof grouped]) {
        grouped[priority as keyof typeof grouped].push(notification);
      }
    });

    return grouped;
  }, [notifications]);

  // 獲取通知統計
  const notificationStats = useMemo(() => {
    const stats = {
      total: notifications.length,
      unread: unreadCount,
      read: notifications.length - unreadCount,
      byType: {} as { [key: string]: number },
      byPriority: {
        high: 0,
        medium: 0,
        low: 0
      }
    };

    notifications.forEach(notification => {
      // 按類型統計
      const type = notification.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // 按優先級統計（假設為 low）
      const priority = 'low';
      stats.byPriority[priority as keyof typeof stats.byPriority] += 1;
    });

    return stats;
  }, [notifications, unreadCount]);

  return {
    // 狀態
    activeTab,
    setActiveTab,
    isLoading,
    
    // 數據
    notifications,
    unreadCount,
    settings,
    notificationsByPriority,
    notificationStats,
    
    // 工具函數
    formatNotificationTime,
    getNotificationTypeName,
    getNotificationIcon,
    getPriorityColor,
    
    // 操作方法
    handleNotificationClick,
    handleMarkAllAsRead,
    handleSettingToggle,
    handleTimeUpdate,
    handleDeleteNotification,
    handleClearReadNotifications
  };
};
