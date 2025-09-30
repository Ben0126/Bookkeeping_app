import React from 'react';
import { useError, type AppError } from '../contexts/ErrorContext';

const ErrorNotification: React.FC = () => {
  const { errors, removeError } = useError();

  if (errors.length === 0) {
    return null;
  }

  const getErrorStyles = (type: AppError['type']) => {
    switch (type) {
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

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {errors.map((error) => {
        const styles = getErrorStyles(error.type);
        
        return (
          <div
            key={error.id}
            className={`${styles.bg} ${styles.border} border rounded-lg p-4 shadow-lg transform transition-all duration-300 ease-out animate-slide-in`}
          >
            <div className="flex items-start space-x-3">
              {/* 圖示 */}
              <div className={`${styles.iconBg} rounded-full p-1 flex-shrink-0`}>
                <span className="text-sm">{styles.icon}</span>
              </div>
              
              {/* 內容 */}
              <div className="flex-1 min-w-0">
                <p className={`${styles.text} font-medium text-sm`}>
                  {error.message}
                </p>
                
                {error.details && (
                  <p className={`${styles.text} text-xs mt-1 opacity-75`}>
                    {error.details}
                  </p>
                )}
                
                {/* 操作按鈕 */}
                {error.action && (
                  <button
                    onClick={error.action.handler}
                    className={`${styles.text} text-xs underline hover:no-underline mt-2`}
                  >
                    {error.action.label}
                  </button>
                )}
              </div>
              
              {/* 關閉按鈕 */}
              {error.dismissible && (
                <button
                  onClick={() => removeError(error.id)}
                  className={`${styles.text} hover:opacity-75 flex-shrink-0`}
                  aria-label="Dismiss notification"
                >
                  <span className="text-lg">×</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ErrorNotification;
