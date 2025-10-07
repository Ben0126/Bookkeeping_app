import React, { useState, useEffect } from 'react';
import { PWAService } from '../services/pwaService';

const PWAControls: React.FC = () => {
  const [isInstallAvailable, setIsInstallAvailable] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isDevControlsVisible, setIsDevControlsVisible] = useState(true);

  useEffect(() => {
    // 初始化狀態
    setIsInstalled(PWAService.isAppInstalled());
    setIsOffline(PWAService.isOffline());
    setIsInstallAvailable(PWAService.isInstallPromptAvailable());
    setIsUpdateAvailable(PWAService.isUpdateAvailable());

    // 監聽 PWA 事件
    const handleInstallAvailable = () => {
      setIsInstallAvailable(true);
      if (!PWAService.isAppInstalled()) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallAvailable(false);
      setShowInstallBanner(false);
    };

    const handleUpdateAvailable = () => {
      setIsUpdateAvailable(true);
      setShowUpdateBanner(true);
    };

    const handleOfflineStatus = (event: CustomEvent) => {
      setIsOffline(event.detail.isOffline);
    };

    // 監聽在線/離線狀態
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // 註冊事件監聽器
    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-app-installed', handleAppInstalled);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    window.addEventListener('pwa-offline-status', handleOfflineStatus as EventListener);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 清理事件監聽器
    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-app-installed', handleAppInstalled);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('pwa-offline-status', handleOfflineStatus as EventListener);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    const success = await PWAService.showInstallPrompt();
    if (success) {
      setShowInstallBanner(false);
    }
  };

  const handleUpdate = async () => {
    await PWAService.applyUpdate();
    setShowUpdateBanner(false);
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
  };

  const handleDismissUpdate = () => {
    setShowUpdateBanner(false);
  };

  const handleShare = async () => {
    await PWAService.shareApp();
  };

  const handleCloseDevControls = () => {
    setIsDevControlsVisible(false);
  };

  return (
    <div className="space-y-2">
      {/* 離線狀態指示器 */}
      {isOffline && (
        <div className="bg-amber-100 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="text-amber-600">⚡</div>
            <div>
              <p className="text-sm font-medium text-amber-800">Offline Mode</p>
              <p className="text-xs text-amber-700">
                You're currently offline. Some features may be limited.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 安裝橫幅 */}
      {showInstallBanner && !isInstalled && (
        <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="text-blue-600 text-xl">📱</div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  Install StudyBudget Pro
                </h3>
                <p className="text-xs text-blue-700 mt-1">
                  Add to your home screen for quick access and offline use!
                </p>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={handleInstall}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                  >
                    Install
                  </button>
                  <button
                    onClick={handleDismissInstall}
                    className="bg-blue-200 text-blue-800 px-3 py-1 rounded text-xs hover:bg-blue-300"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={handleDismissInstall}
              className="text-blue-400 hover:text-blue-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 更新橫幅 */}
      {showUpdateBanner && (
        <div className="bg-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="text-green-600 text-xl">🔄</div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-green-800">
                  Update Available
                </h3>
                <p className="text-xs text-green-700 mt-1">
                  A new version of StudyBudget Pro is ready!
                </p>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={handleUpdate}
                    className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                  >
                    Update Now
                  </button>
                  <button
                    onClick={handleDismissUpdate}
                    className="bg-green-200 text-green-800 px-3 py-1 rounded text-xs hover:bg-green-300"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={handleDismissUpdate}
              className="text-green-400 hover:text-green-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* PWA 控制按鈕 (只在已安裝時顯示) */}
      {isInstalled && (
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-gray-600">📱</div>
              <span className="text-sm font-medium text-gray-800">
                StudyBudget Pro
              </span>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                Installed
              </span>
            </div>
            <button
              onClick={handleShare}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Share
            </button>
          </div>
        </div>
      )}

      {/* 手動控制 (開發模式) */}
      {import.meta.env.DEV && isDevControlsVisible && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 relative">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-yellow-800">
              PWA Controls (Dev Mode)
            </h4>
            <button
              onClick={handleCloseDevControls}
              className="text-yellow-600 hover:text-yellow-800 text-lg font-bold leading-none"
              title="關閉 PWA Controls"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {isInstallAvailable && !isInstalled && (
              <button
                onClick={handleInstall}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
              >
                Install App
              </button>
            )}
            {isUpdateAvailable && (
              <button
                onClick={handleUpdate}
                className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
              >
                Apply Update
              </button>
            )}
            <button
              onClick={handleShare}
              className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700"
            >
              Share App
            </button>
            <button
              onClick={() => PWAService.checkForUpdates()}
              className="bg-orange-600 text-white px-3 py-1 rounded text-xs hover:bg-orange-700"
            >
              Check Updates
            </button>
          </div>
          <div className="mt-2 text-xs text-yellow-700">
            <p>Install Available: {isInstallAvailable ? '✅' : '❌'}</p>
            <p>Update Available: {isUpdateAvailable ? '✅' : '❌'}</p>
            <p>App Installed: {isInstalled ? '✅' : '❌'}</p>
            <p>Network: {isOffline ? '❌ Offline' : '✅ Online'}</p>
          </div>
        </div>
      )}

      {/* 重新顯示 PWA Controls 按鈕 (開發模式) */}
      {import.meta.env.DEV && !isDevControlsVisible && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-2">
          <button
            onClick={() => setIsDevControlsVisible(true)}
            className="text-xs text-gray-600 hover:text-gray-800"
            title="重新顯示 PWA Controls"
          >
            🔧 顯示 PWA Controls
          </button>
        </div>
      )}
    </div>
  );
};

export default PWAControls;
