// PWA 服務管理
export class PWAService {
  private static installPromptEvent: any = null;
  private static isInstalled = false;
  private static updateAvailable = false;

  // 初始化 PWA 服務
  static async initialize(): Promise<void> {
    try {
      await this.registerServiceWorker();
      this.setupInstallPrompt();
      this.setupUpdateChecking();
      this.detectIfInstalled();
      
      console.log('🚀 PWA Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize PWA Service:', error);
    }
  }

  // 註冊 Service Worker
  private static async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('✅ Service Worker registered:', registration.scope);

        // 監聽 Service Worker 更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            console.log('🔄 New Service Worker installing...');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('📦 New Service Worker installed, update available');
                this.updateAvailable = true;
                this.notifyUpdateAvailable();
              }
            });
          }
        });

        // 監聽 Service Worker 消息
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event);
        });

        return;
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
        throw error;
      }
    } else {
      console.warn('⚠️ Service Worker not supported');
      throw new Error('Service Worker not supported');
    }
  }

  // 設置安裝提示
  private static setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('📱 Install prompt available');
      
      // 阻止自動顯示
      event.preventDefault();
      
      // 儲存事件以供後續使用
      this.installPromptEvent = event;
      
      // 通知應用程式可以安裝
      this.notifyInstallAvailable();
    });

    // 監聽安裝事件
    window.addEventListener('appinstalled', () => {
      console.log('🎉 App installed successfully');
      this.isInstalled = true;
      this.installPromptEvent = null;
      this.notifyAppInstalled();
    });
  }

  // 設置更新檢查
  private static setupUpdateChecking(): void {
    // 定期檢查更新 (每小時)
    setInterval(() => {
      this.checkForUpdates();
    }, 60 * 60 * 1000);

    // 頁面可見時檢查更新
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates();
      }
    });
  }

  // 檢測是否已安裝
  private static detectIfInstalled(): void {
    // 檢查是否在獨立模式運行
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('📱 App running in standalone mode');
    }

    // 檢查是否從主屏幕啟動
    if ((window.navigator as any).standalone === true) {
      this.isInstalled = true;
      console.log('📱 App launched from home screen');
    }
  }

  // 處理 Service Worker 消息
  private static handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'VERSION_INFO':
        console.log('📋 Service Worker version:', data.version);
        break;
        
      case 'CACHE_UPDATED':
        console.log('💾 Cache updated:', data);
        break;
        
      case 'OFFLINE_STATUS':
        this.notifyOfflineStatus(data.isOffline);
        break;
    }
  }

  // 公共方法：顯示安裝提示
  static async showInstallPrompt(): Promise<boolean> {
    if (!this.installPromptEvent) {
      console.warn('⚠️ Install prompt not available');
      return false;
    }

    try {
      // 顯示安裝提示
      this.installPromptEvent.prompt();
      
      // 等待用戶回應
      const { outcome } = await this.installPromptEvent.userChoice;
      
      console.log('📱 Install prompt result:', outcome);
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted install prompt');
        return true;
      } else {
        console.log('❌ User dismissed install prompt');
        return false;
      }
    } catch (error) {
      console.error('❌ Install prompt failed:', error);
      return false;
    } finally {
      this.installPromptEvent = null;
    }
  }

  // 公共方法：檢查更新
  static async checkForUpdates(): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration) {
          await registration.update();
          console.log('🔄 Checked for Service Worker updates');
        }
      } catch (error) {
        console.error('❌ Update check failed:', error);
      }
    }
  }

  // 公共方法：應用更新
  static async applyUpdate(): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        // 告訴 Service Worker 跳過等待
        navigator.serviceWorker.controller.postMessage({
          type: 'SKIP_WAITING'
        });
        
        // 重新載入頁面以使用新版本
        window.location.reload();
      } catch (error) {
        console.error('❌ Apply update failed:', error);
      }
    }
  }

  // 公共方法：獲取安裝狀態
  static isAppInstalled(): boolean {
    return this.isInstalled;
  }

  // 公共方法：獲取更新狀態
  static isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  // 公共方法：獲取安裝提示是否可用
  static isInstallPromptAvailable(): boolean {
    return this.installPromptEvent !== null;
  }

  // 公共方法：獲取離線狀態
  static isOffline(): boolean {
    return !navigator.onLine;
  }

  // 公共方法：快取重要資源
  static async cacheImportantResources(urls: string[]): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_URLS',
        data: { urls }
      });
    }
  }

  // 公共方法：清理快取
  static async clearCache(): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE'
      });
    }
  }

  // 通知方法：安裝可用
  private static notifyInstallAvailable(): void {
    // 觸發自定義事件
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  }

  // 通知方法：應用已安裝
  private static notifyAppInstalled(): void {
    // 觸發自定義事件
    window.dispatchEvent(new CustomEvent('pwa-app-installed'));
  }

  // 通知方法：更新可用
  private static notifyUpdateAvailable(): void {
    // 觸發自定義事件
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }

  // 通知方法：離線狀態變化
  private static notifyOfflineStatus(isOffline: boolean): void {
    // 觸發自定義事件
    window.dispatchEvent(new CustomEvent('pwa-offline-status', {
      detail: { isOffline }
    }));
  }

  // 工具方法：獲取應用版本
  static async getAppVersion(): Promise<string> {
    try {
      // 嘗試從 Service Worker 獲取版本
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        return new Promise((resolve) => {
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data.version || '1.0.0');
          };
          navigator.serviceWorker.controller?.postMessage(
            { type: 'GET_VERSION' },
            [messageChannel.port2]
          );
          
          // 超時處理
          setTimeout(() => resolve('1.0.0'), 1000);
        });
      }
      
      // 回退到預設版本
      return '1.0.0';
    } catch (error) {
      console.error('❌ Failed to get app version:', error);
      return '1.0.0';
    }
  }

  // 工具方法：獲取快取大小
  static async getCacheSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      } catch (error) {
        console.error('❌ Failed to get cache size:', error);
        return 0;
      }
    }
    return 0;
  }

  // 工具方法：獲取網路狀態
  static getNetworkStatus(): { online: boolean; type?: string; downlink?: number } {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      online: navigator.onLine,
      type: connection?.effectiveType,
      downlink: connection?.downlink
    };
  }

  // 工具方法：共享應用
  static async shareApp(): Promise<boolean> {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'StudyBudget Pro',
          text: 'A personal bookkeeping app for students studying abroad',
          url: window.location.origin
        });
        return true;
      } catch (error) {
        console.error('❌ Share failed:', error);
        return false;
      }
    } else {
      // 回退到複製連結
      try {
        await navigator.clipboard.writeText(window.location.origin);
        console.log('📋 App URL copied to clipboard');
        return true;
      } catch (error) {
        console.error('❌ Copy to clipboard failed:', error);
        return false;
      }
    }
  }
}
