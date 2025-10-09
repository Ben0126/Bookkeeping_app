import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { NotificationService, NotificationType } from '../../services/notificationService';
import type { NotificationRecord } from '../../services/notificationService';
import { notificationDb } from '../../services/notificationService';

const NotificationsPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');
  
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

    if (diffMins < 1) return t('notifications.justNow');
    if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays });
    
    return date.toLocaleDateString();
  };

  // 獲取通知類型的顯示名稱
  const getNotificationTypeName = (type: keyof typeof NotificationType): string => {
    const typeNames = {
      DAILY_REMINDER: t('notifications.dailyReminder'),
      BUDGET_EXCEEDED: t('notifications.budgetAlert'),
      LOW_BALANCE: t('notifications.balanceAlert'),
      WEEKLY_SUMMARY: t('notifications.weeklyReport'),
      MONTHLY_SUMMARY: t('notifications.monthlyReport'),
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

  // 處理通知點擊
  const handleNotificationClick = async (notification: NotificationRecord) => {
    if (!notification.isRead && notification.id) {
      await NotificationService.markNotificationAsRead(notification.id);
    }
  };

  // 標記所有為已讀
  const handleMarkAllAsRead = async () => {
    await NotificationService.markAllNotificationsAsRead();
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

  // 更新閾值
  const handleThresholdUpdate = async (settingId: number, threshold: number) => {
    try {
      await notificationDb.notificationSettings.update(settingId, {
        threshold,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating notification threshold:', error);
    }
  };

  // 測試通知
  const handleTestNotification = async () => {
    await NotificationService.sendBrowserNotification(
      t('notifications.testNotificationTitle'),
      t('notifications.testNotificationMessage')
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('notifications.title')}</h1>
          <p className="text-gray-600 text-sm">
            {unreadCount > 0 ? `${unreadCount} ${t('notifications.unreadNotifications')}` : t('notifications.allCaughtUp')}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {t('notifications.markAllAsRead')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'notifications'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('notifications.notifications')} {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('common.settings')}
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'notifications' ? (
            // 通知列表
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">🔔</div>
                  <p>{t('notifications.noNotificationsYet')}</p>
                  <p className="text-sm">{t('notifications.notifyImportantUpdates')}</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      notification.isRead
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 truncate">
                            {notification.title}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {formatNotificationTime(new Date(notification.createdAt))}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {getNotificationTypeName(notification.type)}
                          </span>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // 設定頁面
            <div className="space-y-6">
              {/* Test Notification */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-2">{t('notifications.testNotifications')}</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  {t('notifications.browserNotificationsWorking')}
                </p>
                <button
                  onClick={handleTestNotification}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm hover:bg-yellow-700"
                >
                  {t('notifications.sendTestNotification')}
                </button>
              </div>

              {/* Notification Settings */}
              <div className="space-y-4">
                {settings.map((setting: any) => (
                  <div key={setting.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {getNotificationTypeName(setting.type)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {setting.type === NotificationType.DAILY_REMINDER && 
                            t('notifications.dailyReminderDesc')
                          }
                          {setting.type === NotificationType.LOW_BALANCE && 
                            t('notifications.lowBalanceDesc')
                          }
                          {setting.type === NotificationType.WEEKLY_SUMMARY && 
                            t('notifications.weeklySummaryDesc')
                          }
                          {setting.type === NotificationType.MONTHLY_SUMMARY && 
                            t('notifications.monthlySummaryDesc')
                          }
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={setting.enabled}
                          onChange={(e) => handleSettingToggle(setting.id!, e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {setting.enabled && (
                      <div className="space-y-3">
                        {setting.time && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t('notifications.notificationTime')}
                            </label>
                            <input
                              type="time"
                              value={setting.time}
                              onChange={(e) => handleTimeUpdate(setting.id!, e.target.value)}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        )}

                        {setting.type === NotificationType.LOW_BALANCE && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t('notifications.alertWhenBalanceBelow')}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={setting.threshold || 100}
                              onChange={(e) => handleThresholdUpdate(setting.id!, Number(e.target.value))}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
