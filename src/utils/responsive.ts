// 響應式斷點配置
export const breakpoints = {
  xs: '320px',   // 手機 (小)
  sm: '640px',   // 手機 (大)
  md: '768px',   // 平板 (直向)
  lg: '1024px',  // 平板 (橫向) / 小桌面
  xl: '1280px',  // 桌面
  '2xl': '1536px' // 大桌面
} as const;

// 設備類型檢測
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const getDeviceType = (): DeviceType => {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// 螢幕方向檢測
export type ScreenOrientation = 'portrait' | 'landscape';

export const getScreenOrientation = (): ScreenOrientation => {
  if (typeof window === 'undefined') return 'landscape';
  
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
};

import React from 'react';

// 響應式 Hook
export const useResponsive = () => {
  const [deviceType, setDeviceType] = React.useState<DeviceType>(getDeviceType);
  const [orientation, setOrientation] = React.useState<ScreenOrientation>(getScreenOrientation);
  const [screenSize, setScreenSize] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  React.useEffect(() => {
    const handleResize = () => {
      setDeviceType(getDeviceType());
      setOrientation(getScreenOrientation());
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    deviceType,
    orientation,
    screenSize,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape'
  };
};

// 響應式類別生成器
export const getResponsiveClasses = (config: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
  portrait?: string;
  landscape?: string;
}) => {
  const classes = [];
  
  if (config.mobile) classes.push(`sm:${config.mobile}`);
  if (config.tablet) classes.push(`md:${config.tablet}`);
  if (config.desktop) classes.push(`lg:${config.desktop}`);
  if (config.portrait) classes.push(`portrait:${config.portrait}`);
  if (config.landscape) classes.push(`landscape:${config.landscape}`);
  
  return classes.join(' ');
};

// 響應式佈局配置
export const layoutConfig = {
  mobile: {
    padding: 'p-4',
    gap: 'gap-4',
    columns: 'grid-cols-1',
    sidebar: 'hidden',
    navigation: 'bottom'
  },
  tablet: {
    padding: 'p-6',
    gap: 'gap-6',
    columns: 'grid-cols-2',
    sidebar: 'hidden',
    navigation: 'bottom'
  },
  desktop: {
    padding: 'p-8',
    gap: 'gap-8',
    columns: 'grid-cols-3',
    sidebar: 'block',
    navigation: 'top'
  }
} as const;
