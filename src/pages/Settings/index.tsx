import { useState, useEffect } from 'react';
import { PWAService } from '../../services/pwaService';
import { OfflineSyncService } from '../../services/offlineSyncService';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const SettingsPage = () => {
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState<string>('1.0.0');
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [networkStatus, setNetworkStatus] = useState<any>({});
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [pendingOperations, setPendingOperations] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<string>('online');

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    try {
      const version = await PWAService.getAppVersion();
      const size = await PWAService.getCacheSize();
      const network = PWAService.getNetworkStatus();
      const pendingOps = await OfflineSyncService.getPendingOperationsCount();
      const syncStat = OfflineSyncService.getSyncStatus();
      
      setAppVersion(version);
      setCacheSize(size);
      setNetworkStatus(network);
      setIsInstalled(PWAService.isAppInstalled());
      setIsUpdateAvailable(PWAService.isUpdateAvailable());
      setPendingOperations(pendingOps);
      setSyncStatus(syncStat);
    } catch (error) {
      console.error('Failed to load settings data:', error);
    }
  };

  const handleClearCache = async () => {
    try {
      await PWAService.clearCache();
      await loadSettingsData(); // 重新載入數據
      alert('Cache cleared successfully!');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache');
    }
  };

  const handleCheckUpdates = async () => {
    try {
      await PWAService.checkForUpdates();
      await loadSettingsData(); // 重新載入數據
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  };

  const handleApplyUpdate = async () => {
    try {
      await PWAService.applyUpdate();
    } catch (error) {
      console.error('Failed to apply update:', error);
    }
  };

  const handleInstallApp = async () => {
    try {
      const success = await PWAService.showInstallPrompt();
      if (success) {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error('Failed to install app:', error);
    }
  };

  const handleShareApp = async () => {
    try {
      await PWAService.shareApp();
    } catch (error) {
      console.error('Failed to share app:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600 text-sm">Manage app preferences and settings</p>
      </div>

      {/* Language Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.language')}</h2>
        <LanguageSwitcher />
      </div>

      {/* App Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.appInfo')}</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('settings.version')}</span>
            <span className="text-sm font-medium text-gray-900">{appVersion}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('settings.installationStatus')}</span>
            <span className={`text-sm font-medium ${isInstalled ? 'text-green-600' : 'text-orange-600'}`}>
              {isInstalled ? t('settings.installed') : t('settings.browserApp')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('settings.cacheSize')}</span>
            <span className="text-sm font-medium text-gray-900">{formatBytes(cacheSize)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('settings.networkStatus')}</span>
            <span className={`text-sm font-medium ${networkStatus.online ? 'text-green-600' : 'text-red-600'}`}>
              {networkStatus.online ? t('settings.online') : t('settings.offline')}
              {networkStatus.type && (
                <span className="text-gray-500 ml-1">({networkStatus.type})</span>
              )}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('settings.syncStatus')}</span>
            <span className={`text-sm font-medium ${
              syncStatus === 'online' ? 'text-green-600' : 
              syncStatus === 'offline' ? 'text-red-600' : 
              syncStatus === 'syncing' ? 'text-blue-600' : 'text-yellow-600'
            }`}>
              {syncStatus === 'online' ? t('settings.synced') : 
               syncStatus === 'offline' ? t('settings.offline') : 
               syncStatus === 'syncing' ? t('settings.syncing') : t('settings.error')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('settings.pendingOperations')}</span>
            <span className="text-sm font-medium text-gray-900">
              {pendingOperations} {t('settings.operations')}
            </span>
          </div>
        </div>
      </div>

      {/* PWA Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.appManagement')}</h2>
        <div className="space-y-3">
          {!isInstalled && PWAService.isInstallPromptAvailable() && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-900">{t('settings.installApp')}</h3>
                  <p className="text-sm text-blue-700">{t('settings.installDesc')}</p>
                </div>
                <button
                  onClick={handleInstallApp}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                >
                  {t('settings.install')}
                </button>
              </div>
            </div>
          )}

          {isUpdateAvailable && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-green-900">{t('settings.updateAvailable')}</h3>
                  <p className="text-sm text-green-700">{t('settings.updateDesc')}</p>
                </div>
                <button
                  onClick={handleApplyUpdate}
                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700"
                >
                  {t('settings.update')}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleCheckUpdates}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">🔄</span>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{t('settings.checkUpdates')}</div>
                  <div className="text-xs text-gray-500">{t('settings.checkUpdatesDesc')}</div>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </button>

            <button
              onClick={handleShareApp}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">📤</span>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{t('settings.shareApp')}</div>
                  <div className="text-xs text-gray-500">{t('settings.shareAppDesc')}</div>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </button>

            <button
              onClick={handleClearCache}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">🗑️</span>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{t('settings.clearCache')}</div>
                  <div className="text-xs text-gray-500">{t('settings.clearCacheDesc')}</div>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Offline Sync Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.offlineSync')}</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={async () => {
                await OfflineSyncService.manualSync();
                await loadSettingsData();
              }}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">🔄</span>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{t('settings.manualSync')}</div>
                  <div className="text-xs text-gray-500">{t('settings.manualSyncDesc')}</div>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </button>

            <button
              onClick={async () => {
                await OfflineSyncService.clearFailedOperations();
                await loadSettingsData();
              }}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">🗑️</span>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{t('settings.clearFailedOps')}</div>
                  <div className="text-xs text-gray-500">{t('settings.clearFailedOpsDesc')}</div>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </button>

            <button
              onClick={async () => {
                const data = await OfflineSyncService.exportData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `studybudget-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">📥</span>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{t('settings.exportData')}</div>
                  <div className="text-xs text-gray-500">{t('settings.exportDataDesc')}</div>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.dataManagement')}</h2>
        <div className="space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-3">
              <span className="text-yellow-600 text-lg">⚠️</span>
              <div>
                <h3 className="font-medium text-yellow-900">{t('settings.localStorageTitle')}</h3>
                <p className="text-sm text-yellow-700">{t('settings.localStorageDesc')}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start space-x-3">
              <span className="text-green-600 text-lg">🔒</span>
              <div>
                <h3 className="font-medium text-green-900">{t('settings.privacyTitle')}</h3>
                <p className="text-sm text-green-700">{t('settings.privacyDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.aboutAppTitle')}</h2>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{t('settings.aboutAppDesc')}</p>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{t('settings.version')} {appVersion}</span>
            <span>•</span>
            <span>{t('settings.madeWithLove')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
