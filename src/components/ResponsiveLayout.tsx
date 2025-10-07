import React, { type ReactNode } from 'react';
import { useResponsive, layoutConfig } from '../utils/responsive';

interface ResponsiveLayoutProps {
  children: ReactNode;
  className?: string;
  showSidebar?: boolean;
  sidebarContent?: ReactNode;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  className = '',
  showSidebar = false,
  sidebarContent
}) => {
  const { deviceType, isDesktop, isMobile, isTablet } = useResponsive();
  
  const config = layoutConfig[deviceType];
  const shouldShowSidebar = showSidebar && isDesktop;

  // 根據設備類型添加適當的間距
  const getContentPadding = () => {
    if (isDesktop) {
      return 'pt-16'; // 桌面版：為頂部導航欄留空間
    } else if (isMobile || isTablet) {
      return 'pb-20'; // 行動版：為底部導航欄留空間
    }
    return '';
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className={`flex ${config.gap}`}>
        {/* 主內容區域 */}
        <main className={`flex-1 ${config.padding} ${getContentPadding()} ${shouldShowSidebar ? 'lg:mr-6' : ''}`}>
          {children}
        </main>
        
        {/* 側邊欄 (僅桌面版) */}
        {shouldShowSidebar && sidebarContent && (
          <aside className="hidden lg:block w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {sidebarContent}
          </aside>
        )}
      </div>
    </div>
  );
};

// 響應式網格組件
interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className = '',
  cols = { mobile: 1, tablet: 2, desktop: 3 }
}) => {
  const { deviceType } = useResponsive();
  
  const getGridCols = () => {
    switch (deviceType) {
      case 'mobile':
        return `grid-cols-${cols.mobile || 1}`;
      case 'tablet':
        return `grid-cols-${cols.tablet || 2}`;
      case 'desktop':
        return `grid-cols-${cols.desktop || 3}`;
      default:
        return 'grid-cols-1';
    }
  };

  return (
    <div className={`grid ${getGridCols()} gap-4 md:gap-6 lg:gap-8 ${className}`}>
      {children}
    </div>
  );
};

// 響應式卡片組件
interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  className = '',
  hover = true
}) => {
  const { deviceType } = useResponsive();
  
  const getPadding = () => {
    switch (deviceType) {
      case 'mobile':
        return 'p-4';
      case 'tablet':
        return 'p-5';
      case 'desktop':
        return 'p-6';
      default:
        return 'p-4';
    }
  };

  return (
    <div
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200
        ${getPadding()}
        ${hover ? 'hover:shadow-md hover:border-gray-300 transition-all duration-200' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// 響應式按鈕組件
interface ResponsiveButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false
}) => {
  const { deviceType } = useResponsive();
  
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

  const getSizeClasses = () => {
    const baseSize = {
      mobile: { sm: 'px-3 py-2 text-sm', md: 'px-4 py-2 text-base', lg: 'px-6 py-3 text-lg' },
      tablet: { sm: 'px-4 py-2 text-sm', md: 'px-5 py-3 text-base', lg: 'px-8 py-4 text-lg' },
      desktop: { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3 text-base', lg: 'px-8 py-4 text-lg' }
    };
    
    return baseSize[deviceType][size];
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${getVariantClasses()}
        ${getSizeClasses()}
        rounded-lg font-medium
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

// 響應式標題組件
interface ResponsiveTitleProps {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export const ResponsiveTitle: React.FC<ResponsiveTitleProps> = ({
  children,
  level = 1,
  className = ''
}) => {
  const { deviceType } = useResponsive();
  
  const getSizeClasses = () => {
    const sizes = {
      mobile: { 1: 'text-2xl', 2: 'text-xl', 3: 'text-lg', 4: 'text-base', 5: 'text-sm', 6: 'text-xs' },
      tablet: { 1: 'text-3xl', 2: 'text-2xl', 3: 'text-xl', 4: 'text-lg', 5: 'text-base', 6: 'text-sm' },
      desktop: { 1: 'text-4xl', 2: 'text-3xl', 3: 'text-2xl', 4: 'text-xl', 5: 'text-lg', 6: 'text-base' }
    };
    
    return sizes[deviceType][level];
  };

  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;

  return React.createElement(
    Tag,
    { className: `font-bold text-gray-900 ${getSizeClasses()} ${className}` },
    children
  );
};

export default ResponsiveLayout;
