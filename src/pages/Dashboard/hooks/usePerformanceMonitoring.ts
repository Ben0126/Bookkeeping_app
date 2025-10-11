import { useState, useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentMountTime: number;
  dataLoadTime: number;
  transitionTime: number;
  errorCount: number;
  lastError: string | null;
}

interface PerformanceConfig {
  enableMemoryMonitoring: boolean;
  enableRenderTimeMonitoring: boolean;
  enableDataLoadMonitoring: boolean;
  enableTransitionMonitoring: boolean;
  enableErrorMonitoring: boolean;
  reportInterval: number;
  maxErrorCount: number;
}

/**
 * 性能監控Hook
 * 監控Dashboard的各種性能指標
 */
export const usePerformanceMonitoring = (config?: Partial<PerformanceConfig>) => {
  const defaultConfig: PerformanceConfig = {
    enableMemoryMonitoring: true,
    enableRenderTimeMonitoring: true,
    enableDataLoadMonitoring: true,
    enableTransitionMonitoring: true,
    enableErrorMonitoring: true,
    reportInterval: 5000,
    maxErrorCount: 10
  };

  const finalConfig = { ...defaultConfig, ...config };
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    componentMountTime: 0,
    dataLoadTime: 0,
    transitionTime: 0,
    errorCount: 0,
    lastError: null
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceReport, setPerformanceReport] = useState<any>(null);

  const mountTimeRef = useRef<number>(0);
  const renderStartTimeRef = useRef<number>(0);
  const dataLoadStartTimeRef = useRef<number>(0);
  const transitionStartTimeRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const lastErrorRef = useRef<string | null>(null);

  // 開始監控
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    mountTimeRef.current = performance.now();
    
    if (finalConfig.enableMemoryMonitoring) {
      startMemoryMonitoring();
    }
    
    if (finalConfig.enableRenderTimeMonitoring) {
      startRenderTimeMonitoring();
    }
  }, [finalConfig]);

  // 停止監控
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  // 內存監控
  const startMemoryMonitoring = useCallback(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
        }));
      }
    };

    const interval = setInterval(checkMemory, 1000);
    return () => clearInterval(interval);
  }, []);

  // 渲染時間監控
  const startRenderTimeMonitoring = useCallback(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'measure' && entry.name.includes('render')) {
          setMetrics(prev => ({
            ...prev,
            renderTime: entry.duration
          }));
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });
    return () => observer.disconnect();
  }, []);

  // 開始渲染計時
  const startRenderTimer = useCallback(() => {
    if (finalConfig.enableRenderTimeMonitoring) {
      renderStartTimeRef.current = performance.now();
      performance.mark('render-start');
    }
  }, [finalConfig]);

  // 結束渲染計時
  const endRenderTimer = useCallback(() => {
    if (finalConfig.enableRenderTimeMonitoring && renderStartTimeRef.current > 0) {
      const renderTime = performance.now() - renderStartTimeRef.current;
      performance.mark('render-end');
      performance.measure('render-time', 'render-start', 'render-end');
      
      setMetrics(prev => ({
        ...prev,
        renderTime
      }));
    }
  }, [finalConfig]);

  // 開始數據加載計時
  const startDataLoadTimer = useCallback(() => {
    if (finalConfig.enableDataLoadMonitoring) {
      dataLoadStartTimeRef.current = performance.now();
    }
  }, [finalConfig]);

  // 結束數據加載計時
  const endDataLoadTimer = useCallback(() => {
    if (finalConfig.enableDataLoadMonitoring && dataLoadStartTimeRef.current > 0) {
      const dataLoadTime = performance.now() - dataLoadStartTimeRef.current;
      setMetrics(prev => ({
        ...prev,
        dataLoadTime
      }));
    }
  }, [finalConfig]);

  // 開始過渡計時
  const startTransitionTimer = useCallback(() => {
    if (finalConfig.enableTransitionMonitoring) {
      transitionStartTimeRef.current = performance.now();
    }
  }, [finalConfig]);

  // 結束過渡計時
  const endTransitionTimer = useCallback(() => {
    if (finalConfig.enableTransitionMonitoring && transitionStartTimeRef.current > 0) {
      const transitionTime = performance.now() - transitionStartTimeRef.current;
      setMetrics(prev => ({
        ...prev,
        transitionTime
      }));
    }
  }, [finalConfig]);

  // 記錄錯誤
  const recordError = useCallback((error: Error) => {
    if (finalConfig.enableErrorMonitoring) {
      errorCountRef.current += 1;
      lastErrorRef.current = error.message;
      
      setMetrics(prev => ({
        ...prev,
        errorCount: errorCountRef.current,
        lastError: lastErrorRef.current
      }));
    }
  }, [finalConfig]);

  // 獲取性能報告
  const getPerformanceReport = useCallback(() => {
    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      config: finalConfig,
      userAgent: navigator.userAgent,
      url: window.location.href,
      componentMountTime: performance.now() - mountTimeRef.current
    };

    setPerformanceReport(report);
    return report;
  }, [metrics, finalConfig]);

  // 檢查性能問題
  const checkPerformanceIssues = useCallback(() => {
    const issues = [];

    if (metrics.renderTime > 100) {
      issues.push({
        type: 'slow-render',
        message: '渲染時間過長',
        value: metrics.renderTime,
        threshold: 100
      });
    }

    if (metrics.memoryUsage > 50) {
      issues.push({
        type: 'high-memory',
        message: '內存使用過高',
        value: metrics.memoryUsage,
        threshold: 50
      });
    }

    if (metrics.dataLoadTime > 2000) {
      issues.push({
        type: 'slow-data-load',
        message: '數據加載過慢',
        value: metrics.dataLoadTime,
        threshold: 2000
      });
    }

    if (metrics.transitionTime > 1000) {
      issues.push({
        type: 'slow-transition',
        message: '過渡動畫過慢',
        value: metrics.transitionTime,
        threshold: 1000
      });
    }

    if (metrics.errorCount > finalConfig.maxErrorCount) {
      issues.push({
        type: 'too-many-errors',
        message: '錯誤次數過多',
        value: metrics.errorCount,
        threshold: finalConfig.maxErrorCount
      });
    }

    return issues;
  }, [metrics, finalConfig]);

  // 自動性能報告
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      getPerformanceReport();
      const issues = checkPerformanceIssues();
      
      if (issues.length > 0) {
        console.warn('Performance issues detected:', issues);
        // 可以在這裡發送性能報告到監控服務
      }
    }, finalConfig.reportInterval);

    return () => clearInterval(interval);
  }, [isMonitoring, getPerformanceReport, checkPerformanceIssues, finalConfig]);

  // 組件卸載時的清理
  useEffect(() => {
    return () => {
      if (isMonitoring) {
        const finalReport = getPerformanceReport();
        console.log('Final performance report:', finalReport);
      }
    };
  }, [isMonitoring]); // 移除 getPerformanceReport 依賴

  // 獲取性能建議
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: Array<{
      type: string;
      message: string;
      priority: string;
    }> = [];
    const issues = checkPerformanceIssues();

    issues.forEach(issue => {
      switch (issue.type) {
        case 'slow-render':
          recommendations.push({
            type: 'optimization',
            message: '考慮使用React.memo或useMemo來優化渲染性能',
            priority: 'high'
          });
          break;
        case 'high-memory':
          recommendations.push({
            type: 'memory',
            message: '檢查是否有內存洩漏，考慮清理未使用的引用',
            priority: 'high'
          });
          break;
        case 'slow-data-load':
          recommendations.push({
            type: 'data',
            message: '考慮實現數據緩存或分頁加載',
            priority: 'medium'
          });
          break;
        case 'slow-transition':
          recommendations.push({
            type: 'animation',
            message: '優化過渡動畫，考慮使用CSS transforms',
            priority: 'low'
          });
          break;
        case 'too-many-errors':
          recommendations.push({
            type: 'error-handling',
            message: '加強錯誤處理和邊界檢查',
            priority: 'high'
          });
          break;
      }
    });

    return recommendations;
  }, [checkPerformanceIssues]);

  return {
    // 狀態
    metrics,
    isMonitoring,
    performanceReport,
    
    // 控制方法
    startMonitoring,
    stopMonitoring,
    
    // 計時方法
    startRenderTimer,
    endRenderTimer,
    startDataLoadTimer,
    endDataLoadTimer,
    startTransitionTimer,
    endTransitionTimer,
    
    // 監控方法
    recordError,
    getPerformanceReport,
    checkPerformanceIssues,
    getPerformanceRecommendations
  };
};
