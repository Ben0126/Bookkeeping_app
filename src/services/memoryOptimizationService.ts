// 記憶體優化服務
export class MemoryOptimizationService {
  private static memoryStats = {
    initialMemory: 0,
    peakMemory: 0,
    currentMemory: 0,
    gcCount: 0
  };

  private static observers = new Set<(stats: any) => void>();
  private static monitoringInterval: NodeJS.Timeout | null = null;

  // 初始化記憶體監控
  static initialize(): void {
    if ('memory' in performance) {
      this.memoryStats.initialMemory = (performance as any).memory.usedJSHeapSize;
      this.memoryStats.currentMemory = this.memoryStats.initialMemory;
      this.memoryStats.peakMemory = this.memoryStats.initialMemory;
      
      this.startMonitoring();
      console.log('🧠 Memory monitoring initialized');
    } else {
      console.warn('⚠️ Memory API not supported');
    }
  }

  // 開始監控記憶體使用
  private static startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateMemoryStats();
    }, 5000); // 每5秒檢查一次
  }

  // 更新記憶體統計
  private static updateMemoryStats(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.memoryStats.currentMemory = memory.usedJSHeapSize;
      
      if (this.memoryStats.currentMemory > this.memoryStats.peakMemory) {
        this.memoryStats.peakMemory = this.memoryStats.currentMemory;
      }
      
      // 通知觀察者
      this.notifyObservers();
      
      // 檢查是否需要垃圾回收
      this.checkGarbageCollection();
    }
  }

  // 檢查是否需要垃圾回收
  private static checkGarbageCollection(): void {
    const memoryUsage = this.getMemoryUsage();
    
    if (memoryUsage > 0.8) { // 80% 使用率
      console.warn('⚠️ High memory usage detected:', memoryUsage);
      this.triggerGarbageCollection();
    }
  }

  // 觸發垃圾回收
  static triggerGarbageCollection(): void {
    if ('gc' in window) {
      (window as any).gc();
      this.memoryStats.gcCount++;
      console.log('🗑️ Garbage collection triggered');
    } else {
      // 手動清理一些緩存
      this.cleanupCaches();
    }
  }

  // 清理緩存
  private static cleanupCaches(): void {
    // 清理圖片緩存
    this.clearImageCache();
    
    // 清理事件監聽器
    this.cleanupEventListeners();
    
    console.log('🧹 Manual cache cleanup performed');
  }

  // 清理圖片緩存
  private static clearImageCache(): void {
    // 清理未使用的圖片元素
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.complete || img.naturalWidth === 0) {
        img.src = '';
      }
    });
  }

  // 清理事件監聽器
  private static cleanupEventListeners(): void {
    // 這裡可以實現清理未使用的事件監聽器
    // 例如清理已經卸載的組件的事件監聽器
  }

  // 獲取記憶體使用率
  static getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
    return 0;
  }

  // 獲取記憶體統計
  static getMemoryStats(): typeof this.memoryStats {
    return { ...this.memoryStats };
  }

  // 添加記憶體觀察者
  static addObserver(callback: (stats: any) => void): void {
    this.observers.add(callback);
  }

  // 移除記憶體觀察者
  static removeObserver(callback: (stats: any) => void): void {
    this.observers.delete(callback);
  }

  // 通知觀察者
  private static notifyObservers(): void {
    const stats = this.getMemoryStats();
    this.observers.forEach(callback => {
      try {
        callback(stats);
      } catch (error) {
        console.error('Error in memory observer:', error);
      }
    });
  }

  // 優化大列表渲染
  static optimizeLargeList<T>(
    items: T[],
    renderItem: (item: T, index: number) => React.ReactNode,
    options: {
      itemHeight?: number;
      containerHeight?: number;
      overscan?: number;
    } = {}
  ): React.ReactNode[] {
    const {
      itemHeight = 50,
      containerHeight = 400,
      overscan = 5
    } = options;

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, 0); // 可以實現虛擬滾動
    const endIndex = Math.min(items.length, startIndex + visibleCount + overscan);

    return items.slice(startIndex, endIndex).map((item, index) => 
      renderItem(item, startIndex + index)
    );
  }

  // 防抖函數
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // 節流函數
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // 清理資源
  static cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.observers.clear();
    console.log('🧹 Memory optimization service cleaned up');
  }

  // 獲取性能指標
  static getPerformanceMetrics(): {
    memoryUsage: number;
    memoryStats: typeof MemoryOptimizationService.memoryStats;
    timestamp: number;
  } {
    return {
      memoryUsage: this.getMemoryUsage(),
      memoryStats: this.getMemoryStats(),
      timestamp: Date.now()
    };
  }

  // 記憶體洩漏檢測
  static detectMemoryLeaks(): {
    hasLeak: boolean;
    leakScore: number;
    recommendations: string[];
  } {
    const memoryUsage = this.getMemoryUsage();
    const stats = this.getMemoryStats();
    
    let leakScore = 0;
    const recommendations: string[] = [];
    
    // 檢查記憶體使用率
    if (memoryUsage > 0.7) {
      leakScore += 30;
      recommendations.push('High memory usage detected. Consider optimizing data structures.');
    }
    
    // 檢查記憶體增長趨勢
    const memoryGrowth = stats.currentMemory - stats.initialMemory;
    if (memoryGrowth > 10 * 1024 * 1024) { // 10MB
      leakScore += 40;
      recommendations.push('Significant memory growth detected. Check for memory leaks.');
    }
    
    // 檢查垃圾回收頻率
    if (stats.gcCount > 10) {
      leakScore += 20;
      recommendations.push('Frequent garbage collection. Optimize object creation and disposal.');
    }
    
    return {
      hasLeak: leakScore > 50,
      leakScore,
      recommendations
    };
  }
}
