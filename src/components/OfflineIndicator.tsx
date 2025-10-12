import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { OfflineSyncService, SyncStatus } from '../services/offlineSyncService';

const OfflineIndicator: React.FC = () => {
  const { t } = useTranslation();
  const [syncStatus, setSyncStatus] = useState<keyof typeof SyncStatus>('ONLINE');
  const [pendingOperations, setPendingOperations] = useState<number>(0);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  useEffect(() => {
    // 初始化狀態
    setSyncStatus(OfflineSyncService.getSyncStatus() as keyof typeof SyncStatus);
    updatePendingOperations();

    // 監聽同步狀態變化
    const handleSyncStatusChange = (event: CustomEvent) => {
      setSyncStatus(event.detail.status as keyof typeof SyncStatus);
    };

    // 監聽衝突事件
    const handleConflict = (event: CustomEvent) => {
      console.log('Conflict detected:', event.detail.conflict);
      // 這裡可以顯示衝突解決界面
    };

    window.addEventListener('offline-sync-status', handleSyncStatusChange as EventListener);
    window.addEventListener('offline-sync-conflict', handleConflict as EventListener);

    // 定期更新待同步操作數量
    const interval = setInterval(updatePendingOperations, 10000); // 每10秒更新一次

    return () => {
      window.removeEventListener('offline-sync-status', handleSyncStatusChange as EventListener);
      window.removeEventListener('offline-sync-conflict', handleConflict as EventListener);
      clearInterval(interval);
    };
  }, []);

  const updatePendingOperations = async () => {
    try {
      const count = await OfflineSyncService.getPendingOperationsCount();
      setPendingOperations(count);
    } catch (error) {
      console.error('Error updating pending operations:', error);
    }
  };

  const handleManualSync = async () => {
    try {
      await OfflineSyncService.manualSync();
      await updatePendingOperations();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleClearFailed = async () => {
    try {
      await OfflineSyncService.clearFailedOperations();
      await updatePendingOperations();
    } catch (error) {
      console.error('Clear failed operations failed:', error);
    }
  };

  const getStatusIcon = (status: keyof typeof SyncStatus): string => {
    switch (status) {
      case 'ONLINE':
        return '🟢';
      case 'OFFLINE':
        return '🔴';
      case 'SYNCING':
        return '🔄';
      case 'ERROR':
        return '⚠️';
      case 'CONFLICT':
        return '⚡';
      default:
        return '❓';
    }
  };

  const getStatusText = (status: keyof typeof SyncStatus): string => {
    switch (status) {
      case 'ONLINE':
        return t('settings.online');
      case 'OFFLINE':
        return t('settings.offline');
      case 'SYNCING':
        return t('settings.syncing');
      case 'ERROR':
        return t('settings.error');
      case 'CONFLICT':
        return t('settings.conflict');
      default:
        return t('settings.unknown');
    }
  };

  const getStatusColor = (status: keyof typeof SyncStatus): string => {
    switch (status) {
      case 'ONLINE':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'OFFLINE':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'SYNCING':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'ERROR':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'CONFLICT':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // 只在離線、同步中、錯誤或衝突時顯示
  if (syncStatus === 'ONLINE' && pendingOperations === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* 主要狀態指示器 */}
      <div className={`border rounded-lg p-3 ${getStatusColor(syncStatus)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getStatusIcon(syncStatus)}</span>
            <div>
              <div className="text-sm font-medium">
                {getStatusText(syncStatus)}
              </div>
              {pendingOperations > 0 && (
                <div className="text-xs opacity-75">
                  {pendingOperations} {t('settings.operations')} {t('settings.pending')}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {syncStatus === 'ONLINE' && pendingOperations > 0 && (
              <button
                onClick={handleManualSync}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                {t('settings.syncNow')}
              </button>
            )}
            
            {syncStatus === 'ERROR' && (
              <button
                onClick={handleClearFailed}
                className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
              >
                {t('settings.clearFailed')}
              </button>
            )}
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {showDetails ? t('common.hide') : t('common.details')}
            </button>
          </div>
        </div>
      </div>

      {/* 詳細信息 */}
      {showDetails && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-800 mb-2">{t('settings.syncDetails')}</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div>{t('settings.status')}: {getStatusText(syncStatus)}</div>
            <div>{t('settings.pendingOperations')}: {pendingOperations}</div>
            <div>{t('settings.network')}: {navigator.onLine ? t('settings.online') : t('settings.offline')}</div>
            <div>{t('settings.lastCheck')}: {new Date().toLocaleTimeString()}</div>
          </div>
          
          {syncStatus === 'CONFLICT' && (
            <div className="mt-2 p-2 bg-purple-100 rounded text-xs text-purple-800">
              <strong>{t('settings.conflictDetected')}:</strong> {t('settings.conflictResolution')}
            </div>
          )}
          
          {syncStatus === 'ERROR' && (
            <div className="mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
              <strong>{t('settings.syncError')}:</strong> {t('settings.syncErrorDesc')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
