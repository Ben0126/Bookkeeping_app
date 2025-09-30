import React, { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useResponsive } from '../utils/responsive';

interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  description?: string;
}

interface ResponsiveNavigationProps {
  items: NavigationItem[];
  className?: string;
}

const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({
  items,
  className = ''
}) => {
  const location = useLocation();
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // 移動版底部導航
  if (isMobile) {
    return (
      <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 ${className}`}>
        <ul className="flex justify-around py-2">
          {items.map((item) => (
            <li key={item.path} className="flex-1">
              <Link
                to={item.path}
                className={`
                  flex flex-col items-center py-2 px-1 text-xs
                  transition-colors duration-200
                  ${location.pathname === item.path
                    ? 'text-blue-600 bg-blue-50 rounded-lg mx-1'
                    : 'text-gray-600 hover:text-blue-600'
                  }
                `}
              >
                <span className="text-lg mb-1">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  // 平板版底部導航 (稍大一些)
  if (isTablet) {
    return (
      <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 ${className}`}>
        <ul className="flex justify-around py-3">
          {items.map((item) => (
            <li key={item.path} className="flex-1">
              <Link
                to={item.path}
                className={`
                  flex flex-col items-center py-3 px-2 text-sm
                  transition-colors duration-200
                  ${location.pathname === item.path
                    ? 'text-blue-600 bg-blue-50 rounded-lg mx-2'
                    : 'text-gray-600 hover:text-blue-600'
                  }
                `}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  // 桌面版頂部導航
  if (isDesktop) {
    return (
      <nav className={`bg-white border-b border-gray-200 shadow-sm ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <span className="text-2xl">💰</span>
                <span className="text-xl font-bold text-gray-900">StudyBudget Pro</span>
              </Link>
            </div>

            {/* 導航項目 */}
            <div className="flex space-x-8">
              {items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
                    transition-colors duration-200
                    ${location.pathname === item.path
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return null;
};

// 響應式側邊欄組件
interface ResponsiveSidebarProps {
  children: ReactNode;
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const ResponsiveSidebar: React.FC<ResponsiveSidebarProps> = ({
  children,
  className = '',
  isOpen = false,
  onClose
}) => {
  const { isMobile, isTablet } = useResponsive();

  // 移動版和平板版：全屏覆蓋
  if (isMobile || isTablet) {
    return (
      <>
        {/* 背景遮罩 */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={onClose}
          />
        )}
        
        {/* 側邊欄 */}
        <div
          className={`
            fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50
            transform transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            ${className}
          `}
        >
          <div className="p-6">
            {/* 關閉按鈕 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <span className="text-2xl">×</span>
            </button>
            
            {children}
          </div>
        </div>
      </>
    );
  }

  // 桌面版：固定側邊欄
  return (
    <aside className={`w-80 bg-white border-r border-gray-200 ${className}`}>
      <div className="p-6">
        {children}
      </div>
    </aside>
  );
};

export default ResponsiveNavigation;
