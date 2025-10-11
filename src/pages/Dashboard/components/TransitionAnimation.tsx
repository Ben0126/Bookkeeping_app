import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface TransitionAnimationProps {
  isVisible: boolean;
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  animationType?: 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideDown';
  className?: string;
}

/**
 * 過渡動畫組件
 * 提供平滑的進入和退出動畫效果
 */
const TransitionAnimation: React.FC<TransitionAnimationProps> = ({
  isVisible,
  children,
  duration = 300,
  delay = 0,
  animationType = 'fade',
  className = ''
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, delay]);

  if (!shouldRender) return null;

  const getAnimationClasses = () => {
    const baseClasses = 'transition-all duration-300 ease-in-out';
    
    switch (animationType) {
      case 'fade':
        return `${baseClasses} ${isAnimating ? 'opacity-100' : 'opacity-0'}`;
      
      case 'slide':
        return `${baseClasses} ${isAnimating ? 'translate-x-0' : '-translate-x-full'}`;
      
      case 'scale':
        return `${baseClasses} ${isAnimating ? 'scale-100' : 'scale-95'}`;
      
      case 'slideUp':
        return `${baseClasses} ${isAnimating ? 'translate-y-0' : 'translate-y-4'}`;
      
      case 'slideDown':
        return `${baseClasses} ${isAnimating ? 'translate-y-0' : '-translate-y-4'}`;
      
      default:
        return baseClasses;
    }
  };

  return (
    <div 
      className={`${getAnimationClasses()} ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
};

/**
 * 頁面過渡組件
 * 用於整個頁面的過渡效果
 */
interface PageTransitionProps {
  isVisible: boolean;
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  isVisible,
  children,
  className = ''
}) => {
  return (
    <TransitionAnimation
      isVisible={isVisible}
      animationType="fade"
      duration={500}
      className={`min-h-screen ${className}`}
    >
      {children}
    </TransitionAnimation>
  );
};

/**
 * 卡片過渡組件
 * 用於卡片元素的過渡效果
 */
interface CardTransitionProps {
  isVisible: boolean;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const CardTransition: React.FC<CardTransitionProps> = ({
  isVisible,
  children,
  delay = 0,
  className = ''
}) => {
  return (
    <TransitionAnimation
      isVisible={isVisible}
      animationType="slideUp"
      duration={400}
      delay={delay}
      className={`${className}`}
    >
      {children}
    </TransitionAnimation>
  );
};

/**
 * 列表項過渡組件
 * 用於列表項目的過渡效果
 */
interface ListItemTransitionProps {
  isVisible: boolean;
  children: React.ReactNode;
  index: number;
  className?: string;
}

export const ListItemTransition: React.FC<ListItemTransitionProps> = ({
  isVisible,
  children,
  index,
  className = ''
}) => {
  return (
    <TransitionAnimation
      isVisible={isVisible}
      animationType="slideUp"
      duration={300}
      delay={index * 100}
      className={`${className}`}
    >
      {children}
    </TransitionAnimation>
  );
};

/**
 * 按鈕過渡組件
 * 用於按鈕的過渡效果
 */
interface ButtonTransitionProps {
  isVisible: boolean;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const ButtonTransition: React.FC<ButtonTransitionProps> = ({
  isVisible,
  children,
  delay = 0,
  className = ''
}) => {
  return (
    <TransitionAnimation
      isVisible={isVisible}
      animationType="scale"
      duration={200}
      delay={delay}
      className={`${className}`}
    >
      {children}
    </TransitionAnimation>
  );
};

/**
 * 進度條過渡組件
 * 用於進度條的過渡效果
 */
interface ProgressTransitionProps {
  isVisible: boolean;
  progress: number;
  className?: string;
}

export const ProgressTransition: React.FC<ProgressTransitionProps> = ({
  isVisible,
  progress,
  className = ''
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setDisplayProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayProgress(0);
    }
  }, [isVisible, progress]);

  return (
    <TransitionAnimation
      isVisible={isVisible}
      animationType="fade"
      duration={300}
      className={`w-full bg-gray-200 rounded-full h-2 ${className}`}
    >
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${displayProgress}%` }}
      />
    </TransitionAnimation>
  );
};

/**
 * 加載動畫組件
 * 用於顯示加載狀態
 */
interface LoadingTransitionProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export const LoadingTransition: React.FC<LoadingTransitionProps> = ({
  isVisible,
  message,
  className = ''
}) => {
  const { t } = useTranslation();

  return (
    <TransitionAnimation
      isVisible={isVisible}
      animationType="fade"
      duration={300}
      className={`flex items-center justify-center p-8 ${className}`}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message || t('common.loading')}</p>
      </div>
    </TransitionAnimation>
  );
};

/**
 * 錯誤狀態過渡組件
 * 用於顯示錯誤狀態
 */
interface ErrorTransitionProps {
  isVisible: boolean;
  error: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorTransition: React.FC<ErrorTransitionProps> = ({
  isVisible,
  error,
  onRetry,
  className = ''
}) => {
  const { t } = useTranslation();

  return (
    <TransitionAnimation
      isVisible={isVisible}
      animationType="fade"
      duration={300}
      className={`text-center p-8 ${className}`}
    >
      <div className="text-red-500">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('common.error')}</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('common.retry')}
          </button>
        )}
      </div>
    </TransitionAnimation>
  );
};

export default TransitionAnimation;
