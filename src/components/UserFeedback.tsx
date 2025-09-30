import React, { useState, useEffect } from 'react';

export interface FeedbackMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

interface UserFeedbackProps {
  message: FeedbackMessage | null;
  onClose: () => void;
}

const UserFeedback: React.FC<UserFeedbackProps> = ({ message, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      setIsLeaving(false);

      // 自動關閉
      const duration = message.duration || 4000;
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  if (!message || !isVisible) {
    return null;
  }

  const getStyles = (type: FeedbackMessage['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: '✅',
          iconBg: 'bg-green-100'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: '❌',
          iconBg: 'bg-red-100'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: '⚠️',
          iconBg: 'bg-yellow-100'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'ℹ️',
          iconBg: 'bg-blue-100'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: '📢',
          iconBg: 'bg-gray-100'
        };
    }
  };

  const styles = getStyles(message.type);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full mx-4">
      <div
        className={`${styles.bg} ${styles.border} border rounded-lg p-4 shadow-lg transform transition-all duration-300 ease-out ${
          isLeaving ? 'translate-y-[-100%] opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="flex items-start space-x-3">
          {/* 圖示 */}
          <div className={`${styles.iconBg} rounded-full p-1 flex-shrink-0`}>
            <span className="text-sm">{styles.icon}</span>
          </div>
          
          {/* 內容 */}
          <div className="flex-1 min-w-0">
            <p className={`${styles.text} font-medium text-sm`}>
              {message.message}
            </p>
            
            {/* 操作按鈕 */}
            {message.action && (
              <button
                onClick={message.action.handler}
                className={`${styles.text} text-xs underline hover:no-underline mt-2`}
              >
                {message.action.label}
              </button>
            )}
          </div>
          
          {/* 關閉按鈕 */}
          <button
            onClick={handleClose}
            className={`${styles.text} hover:opacity-75 flex-shrink-0`}
            aria-label="Close notification"
          >
            <span className="text-lg">×</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook for managing feedback messages
export const useUserFeedback = () => {
  const [currentMessage, setCurrentMessage] = useState<FeedbackMessage | null>(null);

  const showSuccess = (message: string, duration?: number, action?: FeedbackMessage['action']) => {
    setCurrentMessage({
      id: `success_${Date.now()}`,
      type: 'success',
      message,
      duration,
      action
    });
  };

  const showError = (message: string, duration?: number, action?: FeedbackMessage['action']) => {
    setCurrentMessage({
      id: `error_${Date.now()}`,
      type: 'error',
      message,
      duration,
      action
    });
  };

  const showWarning = (message: string, duration?: number, action?: FeedbackMessage['action']) => {
    setCurrentMessage({
      id: `warning_${Date.now()}`,
      type: 'warning',
      message,
      duration,
      action
    });
  };

  const showInfo = (message: string, duration?: number, action?: FeedbackMessage['action']) => {
    setCurrentMessage({
      id: `info_${Date.now()}`,
      type: 'info',
      message,
      duration,
      action
    });
  };

  const hideFeedback = () => {
    setCurrentMessage(null);
  };

  return {
    currentMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideFeedback
  };
};

export default UserFeedback;
