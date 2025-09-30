import React, { type ReactNode } from 'react';

interface AnimatedTransitionProps {
  children: ReactNode;
  type?: 'fade' | 'slide' | 'scale' | 'bounce';
  duration?: number;
  delay?: number;
  className?: string;
}

const AnimatedTransition: React.FC<AnimatedTransitionProps> = ({
  children,
  type = 'fade',
  duration = 300,
  delay = 0,
  className = ''
}) => {
  const getAnimationClasses = () => {
    const baseClasses = 'transition-all ease-out';
    const durationClass = `duration-${duration}`;
    
    switch (type) {
      case 'fade':
        return `${baseClasses} ${durationClass} opacity-0 animate-fade-in`;
      case 'slide':
        return `${baseClasses} ${durationClass} transform translate-y-4 animate-slide-in`;
      case 'scale':
        return `${baseClasses} ${durationClass} transform scale-95 animate-scale-in`;
      case 'bounce':
        return `${baseClasses} ${durationClass} transform animate-bounce-in`;
      default:
        return `${baseClasses} ${durationClass}`;
    }
  };

  const style = {
    transitionDelay: `${delay}ms`
  };

  return (
    <div 
      className={`${getAnimationClasses()} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

// 預定義的動畫組件
export const FadeIn: React.FC<Omit<AnimatedTransitionProps, 'type'>> = (props) => (
  <AnimatedTransition {...props} type="fade" />
);

export const SlideIn: React.FC<Omit<AnimatedTransitionProps, 'type'>> = (props) => (
  <AnimatedTransition {...props} type="slide" />
);

export const ScaleIn: React.FC<Omit<AnimatedTransitionProps, 'type'>> = (props) => (
  <AnimatedTransition {...props} type="scale" />
);

export const BounceIn: React.FC<Omit<AnimatedTransitionProps, 'type'>> = (props) => (
  <AnimatedTransition {...props} type="bounce" />
);

// 列表動畫組件
interface AnimatedListProps {
  children: ReactNode[];
  staggerDelay?: number;
  className?: string;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  staggerDelay = 100,
  className = ''
}) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <AnimatedTransition
          key={index}
          type="slide"
          delay={index * staggerDelay}
          className="mb-2"
        >
          {child}
        </AnimatedTransition>
      ))}
    </div>
  );
};

// 按鈕動畫組件
interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  type?: 'button' | 'submit' | 'reset';
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  disabled = false,
  className = '',
  variant = 'primary',
  type = 'button'
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'secondary':
        return 'bg-gray-200 hover:bg-gray-300 text-gray-900';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${getVariantClasses()}
        px-4 py-2 rounded-lg font-medium
        transition-all duration-200 ease-out
        transform hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
    >
      {children}
    </button>
  );
};

// 卡片動畫組件
interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  hover = true
}) => {
  return (
    <div
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200 p-4
        transition-all duration-200 ease-out
        ${hover ? 'hover:shadow-md hover:border-gray-300 transform hover:-translate-y-1' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default AnimatedTransition;
