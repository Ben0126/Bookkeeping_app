import React, { useState, useEffect } from 'react';
import { MemoryOptimizationService } from '../services/memoryOptimizationService';
import { QueryOptimizationService } from '../services/queryOptimizationService';

const PerformanceMonitor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [memoryStats, setMemoryStats] = useState<any>(null);
  const [queryStats, setQueryStats] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  useEffect(() => {
    // 只在開發模式下顯示
    if (!import.meta.env.DEV) {
      return;
    }

    const updateStats = () => {
      setMemoryStats(MemoryOptimizationService.getMemoryStats());
      setQueryStats(QueryOptimizationService.getCacheStats());
      setPerformanceMetrics(MemoryOptimizationService.getPerformanceMetrics());
    };

    // 初始更新
    updateStats();

    // 添加記憶體觀察者
    MemoryOptimizationService.addObserver(updateStats);

    // 定期更新
    const interval = setInterval(updateStats, 2000);

    return () => {
      MemoryOptimizationService.removeObserver(updateStats);
      clearInterval(interval);
    };
  }, []);

  // 只在開發模式下渲染
  if (!import.meta.env.DEV) {
    return null;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMemoryUsageColor = (usage: number): string => {
    if (usage > 0.8) return 'text-red-600';
    if (usage > 0.6) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleClearCache = () => {
    QueryOptimizationService.clearCache();
    setQueryStats(QueryOptimizationService.getCacheStats());
  };

  const handleTriggerGC = () => {
    MemoryOptimizationService.triggerGarbageCollection();
    setMemoryStats(MemoryOptimizationService.getMemoryStats());
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        title="Performance Monitor"
      >
        {isVisible ? '📊' : '⚡'}
      </button>

      {/* Monitor Panel */}
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Performance Monitor</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Memory Stats */}
          {memoryStats && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Memory Usage</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Current:</span>
                  <span className={getMemoryUsageColor(performanceMetrics?.memoryUsage || 0)}>
                    {formatBytes(memoryStats.currentMemory)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Peak:</span>
                  <span>{formatBytes(memoryStats.peakMemory)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usage:</span>
                  <span className={getMemoryUsageColor(performanceMetrics?.memoryUsage || 0)}>
                    {((performanceMetrics?.memoryUsage || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GC Count:</span>
                  <span>{memoryStats.gcCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Query Cache Stats */}
          {queryStats && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Query Cache</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Cache Size:</span>
                  <span>{queryStats.size}/{queryStats.maxSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hit Rate:</span>
                  <span>{queryStats.hitRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleClearCache}
              className="w-full bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
            >
              Clear Query Cache
            </button>
            <button
              onClick={handleTriggerGC}
              className="w-full bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
            >
              Trigger GC
            </button>
          </div>

          {/* Performance Tips */}
          <div className="mt-4 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
            <strong>Tips:</strong>
            <ul className="mt-1 space-y-1">
              <li>• Keep memory usage below 80%</li>
              <li>• Clear cache if hit rate is low</li>
              <li>• Monitor GC frequency</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
