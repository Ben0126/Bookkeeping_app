import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ResponsiveCard } from '../../../components/ResponsiveLayout';
import type { NotificationsSummaryProps } from '../types';

/**
 * 通知摘要組件
 * 顯示重要通知和提醒
 */
const NotificationsSummary: React.FC<NotificationsSummaryProps> = ({ 
  notifications, 
  isLoading = false,
  onNotificationClick,
  onMarkAllRead 
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t('dashboard.notificationsSummaryTitle')}</h2>
        <ResponsiveCard className="animate-pulse">
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </ResponsiveCard>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t('dashboard.notificationsSummaryTitle')}</h2>
        <ResponsiveCard className="text-center py-8">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">🔔</div>
            <p>{t('dashboard.noNotifications')}</p>
            <p className="text-sm">All caught up!</p>
          </div>
        </ResponsiveCard>
      </div>
    );
  }

  // 獲取通知類型圖標
  const getNotificationIcon = (type: string): string => {
    const icons = {
      'DAILY_REMINDER': '💰',
      'BUDGET_EXCEEDED': '🚨',
      'LOW_BALANCE': '💳',
      'WEEKLY_SUMMARY': '📊',
      'MONTHLY_SUMMARY': '📈',
    };
    return icons[type as keyof typeof icons] || '🔔';
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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">{t('dashboard.notificationsSummaryTitle')}</h2>
        <div className="flex space-x-2">
          {unreadCount > 0 && (
            <button 
              onClick={onMarkAllRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('dashboard.notificationsSummary.markAllRead')}
            </button>
          )}
          <Link 
            to="/notifications" 
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('dashboard.viewAll')} →
          </Link>
        </div>
      </div>
      
      <ResponsiveCard className="space-y-3">
        {notifications.slice(0, 5).map(notification => {
          const priorityColor = getPriorityColor(notification.priority);
          const typeIcon = getNotificationIcon(notification.type);
          
          return (
            <div 
              key={notification.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                notification.isRead
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
              onClick={() => onNotificationClick?.(notification.id)}
            >
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{typeIcon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 truncate">
                      {notification.title}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatNotificationTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityColor}`}>
                      {notification.priority} {t('dashboard.notificationsSummary.priority')}
                    </span>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {notifications.length > 5 && (
          <div className="text-center pt-3 border-t border-gray-100">
            <Link 
              to="/notifications" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('dashboard.notificationsSummary.viewAllNotifications', { count: notifications.length })} →
            </Link>
          </div>
        )}
      </ResponsiveCard>
    </div>
  );
};

export default NotificationsSummary;
