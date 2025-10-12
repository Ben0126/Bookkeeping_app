import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OfflineSyncService } from '../../services/offlineSyncService';

const BackupPage = () => {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await OfflineSyncService.exportData();
      
      // 創建下載連結
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `studybudget-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      console.log('✅ Data exported successfully');
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert(t('messages.error.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(false);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // 驗證數據格式
      if (!data.transactions || !data.accounts || !data.categories) {
        throw new Error(t('messages.error.invalidBackupFormat'));
      }

      // 確認導入
      const confirmed = window.confirm(
        t('messages.confirm.importData')
      );
      
      if (confirmed) {
        await OfflineSyncService.importData(data);
        setImportSuccess(true);
        console.log('✅ Data imported successfully');
      }
    } catch (error) {
      console.error('❌ Import failed:', error);
      setImportError(error instanceof Error ? error.message : t('messages.error.importFailed'));
    } finally {
      setIsImporting(false);
      // 重置文件輸入
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.backup')}</h1>
        <p className="text-gray-600 text-sm">{t('settings.backupDesc')}</p>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.exportData')}</h2>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {t('settings.exportDataDesc')}
          </p>
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? t('common.loading') : `📥 ${t('settings.exportData')}`}
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.importData')}</h2>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {t('settings.importDataDesc')}
          </p>
          
          <div className="space-y-2">
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              disabled={isImporting}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            
            {isImporting && (
              <div className="text-sm text-blue-600">{t('settings.importingData')}</div>
            )}
            
            {importSuccess && (
              <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                ✅ {t('messages.success.dataImported')}
              </div>
            )}
            
            {importError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                ❌ {importError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.dataInfo')}</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>{t('settings.backupFormat')}:</span>
            <span className="font-medium">JSON</span>
          </div>
          <div className="flex justify-between">
            <span>{t('settings.includes')}:</span>
            <span className="font-medium">{t('settings.dataIncludes')}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('settings.storage')}:</span>
            <span className="font-medium">{t('settings.localStorageOnly')}</span>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-2">⚠️ {t('settings.importantNotes')}</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• {t('settings.backupNote1')}</li>
          <li>• {t('settings.backupNote2')}</li>
          <li>• {t('settings.backupNote3')}</li>
          <li>• {t('settings.backupNote4')}</li>
          <li>• {t('settings.backupNote5')}</li>
        </ul>
      </div>

      {/* Sync Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">🔄 {t('settings.syncStatus')}</h3>
        <p className="text-sm text-blue-700">
          {t('settings.syncStatusDesc')}
        </p>
      </div>
    </div>
  );
};

export default BackupPage;
