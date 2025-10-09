import { db } from '../db';
import { getAllTransactions } from '../db/transactions';
import { getAllAccounts } from '../db/accounts';
import { getAllCategories } from '../db/categories';

// 離線同步狀態
export const SyncStatus = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  SYNCING: 'SYNCING',
  ERROR: 'ERROR',
  CONFLICT: 'CONFLICT'
} as const;

// 同步記錄介面
export interface SyncRecord {
  id?: number;
  tableName: string;
  recordId: number;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  synced: boolean;
  conflictResolved?: boolean;
}

// 離線操作隊列
export interface OfflineOperation {
  id?: number;
  tableName: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  retryCount: number;
  lastError?: string;
}

// 數據衝突解決策略
export const ConflictResolutionStrategy = {
  LOCAL_WINS: 'local_wins',
  REMOTE_WINS: 'remote_wins',
  NEWEST_WINS: 'newest_wins',
  MANUAL: 'manual'
} as const;

// 擴展資料庫以支援離線同步
import Dexie from 'dexie';

export class OfflineSyncDB extends Dexie {
  syncRecords!: Dexie.Table<SyncRecord, number>;
  offlineOperations!: Dexie.Table<OfflineOperation, number>;
  
  constructor() {
    super('StudyBudgetDB');
    this.version(4).stores({
      accounts: '++id, name, type, currency',
      transactions: '++id, type, date, accountId, categoryId',
      categories: '++id, name, type',
      merchantRules: '++id, pattern, categoryId, lastUsed, usageCount',
      notificationSettings: '++id, type, enabled, time, lastTriggered',
      notificationRecords: '++id, type, createdAt, isRead',
      budgetSettings: '++id, categoryId, amount, period, startDate, isActive',
      syncRecords: '++id, tableName, recordId, timestamp, synced',
      offlineOperations: '++id, tableName, operation, timestamp, retryCount',
    });
  }
}

export const offlineSyncDb = new OfflineSyncDB();

export class OfflineSyncService {
  private static currentStatus: keyof typeof SyncStatus = 'ONLINE';
  private static syncInterval: NodeJS.Timeout | null = null;
  private static conflictResolutionStrategy: keyof typeof ConflictResolutionStrategy = 'NEWEST_WINS';

  // 初始化離線同步服務
  static async initialize(): Promise<void> {
    try {
      // 檢測網路狀態
      this.currentStatus = navigator.onLine ? 'ONLINE' : 'OFFLINE';
      
      // 監聽網路狀態變化
      window.addEventListener('online', () => {
        this.handleNetworkOnline();
      });
      
      window.addEventListener('offline', () => {
        this.handleNetworkOffline();
      });

      // 啟動定期同步檢查
      this.startPeriodicSync();

      // 處理離線時未同步的操作
      await this.processOfflineOperations();

      console.log('🔄 Offline Sync Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Offline Sync Service:', error);
    }
  }

  // 處理網路上線
  private static async handleNetworkOnline(): Promise<void> {
    console.log('🌐 Network online - starting sync');
    this.currentStatus = 'SYNCING';
    
    try {
      await this.syncOfflineOperations();
      await this.processConflicts();
      this.currentStatus = 'ONLINE';
      
      // 通知應用程式網路已恢復
      window.dispatchEvent(new CustomEvent('offline-sync-status', {
        detail: { status: 'ONLINE' }
      }));
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.currentStatus = 'ERROR';
    }
  }

  // 處理網路離線
  private static async handleNetworkOffline(): Promise<void> {
    console.log('📴 Network offline - switching to offline mode');
    this.currentStatus = 'OFFLINE';
    
    // 通知應用程式進入離線模式
    window.dispatchEvent(new CustomEvent('offline-sync-status', {
      detail: { status: 'OFFLINE' }
    }));
  }

  // 啟動定期同步檢查
  private static startPeriodicSync(): void {
    // 每5分鐘檢查一次同步狀態
    this.syncInterval = setInterval(async () => {
      if (this.currentStatus === 'ONLINE') {
        await this.checkForPendingSync();
      }
    }, 5 * 60 * 1000);
  }

  // 檢查待同步的操作
  private static async checkForPendingSync(): Promise<void> {
    try {
      const pendingOperations = await offlineSyncDb.offlineOperations
        .where('retryCount')
        .below(3)
        .toArray();

      if (pendingOperations.length > 0) {
        console.log(`🔄 Found ${pendingOperations.length} pending operations`);
        await this.syncOfflineOperations();
      }
    } catch (error) {
      console.error('❌ Error checking pending sync:', error);
    }
  }

  // 記錄離線操作
  static async recordOfflineOperation(
    tableName: string,
    operation: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    try {
      await offlineSyncDb.offlineOperations.add({
        tableName,
        operation,
        data,
        timestamp: new Date(),
        retryCount: 0
      });

      console.log(`📝 Recorded offline operation: ${operation} on ${tableName}`);
    } catch (error) {
      console.error('❌ Failed to record offline operation:', error);
    }
  }

  // 同步離線操作
  private static async syncOfflineOperations(): Promise<void> {
    if (this.currentStatus !== 'ONLINE') {
      return;
    }

    try {
      const operations = await offlineSyncDb.offlineOperations
        .where('retryCount')
        .below(3)
        .toArray();

      for (const operation of operations) {
        try {
          await this.executeOperation(operation);
          
          // 操作成功，從隊列中移除
          await offlineSyncDb.offlineOperations.delete(operation.id!);
          
          console.log(`✅ Synced operation: ${operation.operation} on ${operation.tableName}`);
        } catch (error) {
          // 操作失敗，增加重試次數
          await offlineSyncDb.offlineOperations.update(operation.id!, {
            retryCount: operation.retryCount + 1,
            lastError: error instanceof Error ? error.message : 'Unknown error'
          });
          
          console.error(`❌ Failed to sync operation:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error syncing offline operations:', error);
    }
  }

  // 執行操作
  private static async executeOperation(operation: OfflineOperation): Promise<void> {
    // 這裡模擬與服務器的同步
    // 在實際應用中，這裡會是 API 調用
    
    switch (operation.tableName) {
      case 'transactions':
        await this.syncTransactionOperation(operation);
        break;
      case 'accounts':
        await this.syncAccountOperation(operation);
        break;
      case 'categories':
        await this.syncCategoryOperation(operation);
        break;
      default:
        console.warn(`⚠️ Unknown table: ${operation.tableName}`);
    }
  }

  // 同步交易操作
  private static async syncTransactionOperation(operation: OfflineOperation): Promise<void> {
    // 模擬 API 調用延遲
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 在實際應用中，這裡會是：
    // const response = await fetch('/api/transactions', {
    //   method: operation.operation === 'create' ? 'POST' : 
    //           operation.operation === 'update' ? 'PUT' : 'DELETE',
    //   body: JSON.stringify(operation.data)
    // });
    
    console.log(`🔄 Syncing transaction ${operation.operation}:`, operation.data);
  }

  // 同步帳戶操作
  private static async syncAccountOperation(operation: OfflineOperation): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`🔄 Syncing account ${operation.operation}:`, operation.data);
  }

  // 同步分類操作
  private static async syncCategoryOperation(operation: OfflineOperation): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`🔄 Syncing category ${operation.operation}:`, operation.data);
  }

  // 處理數據衝突
  private static async processConflicts(): Promise<void> {
    try {
      const conflicts = await offlineSyncDb.syncRecords
        .where('conflictResolved')
        .equals(0)
        .toArray();

      for (const conflict of conflicts) {
        await this.resolveConflict(conflict);
      }
    } catch (error) {
      console.error('❌ Error processing conflicts:', error);
    }
  }

  // 解決衝突
  private static async resolveConflict(conflict: SyncRecord): Promise<void> {
    try {
      let resolvedData: any;

      switch (this.conflictResolutionStrategy) {
        case 'LOCAL_WINS':
          resolvedData = conflict.data;
          break;
          
        case 'REMOTE_WINS':
          // 在實際應用中，這裡會從服務器獲取最新數據
          resolvedData = conflict.data; // 模擬遠端數據
          break;
          
        case 'NEWEST_WINS':
          // 比較時間戳，使用最新的數據
          resolvedData = conflict.data; // 簡化處理
          break;
          
        case 'MANUAL':
          // 需要用戶手動解決
          this.currentStatus = 'CONFLICT';
          window.dispatchEvent(new CustomEvent('offline-sync-conflict', {
            detail: { conflict }
          }));
          return;
      }

      // 更新本地數據
      await this.updateLocalData(conflict.tableName, conflict.recordId, resolvedData);
      
      // 標記衝突已解決
      await offlineSyncDb.syncRecords.update(conflict.id!, {
        conflictResolved: true,
        data: resolvedData
      });

      console.log(`✅ Resolved conflict for ${conflict.tableName}:${conflict.recordId}`);
    } catch (error) {
      console.error('❌ Error resolving conflict:', error);
    }
  }

  // 更新本地數據
  private static async updateLocalData(tableName: string, recordId: number, data: any): Promise<void> {
    switch (tableName) {
      case 'transactions':
        await db.transactions.update(recordId, data);
        break;
      case 'accounts':
        await db.accounts.update(recordId, data);
        break;
      case 'categories':
        await db.categories.update(recordId, data);
        break;
    }
  }

  // 處理離線時未同步的操作
  private static async processOfflineOperations(): Promise<void> {
    try {
      const operations = await offlineSyncDb.offlineOperations.toArray();
      
      if (operations.length > 0) {
        console.log(`📋 Found ${operations.length} offline operations to process`);
        
        // 如果網路可用，立即同步
        if (this.currentStatus === 'ONLINE') {
          await this.syncOfflineOperations();
        }
      }
    } catch (error) {
      console.error('❌ Error processing offline operations:', error);
    }
  }

  // 公共方法：獲取同步狀態
  static getSyncStatus(): keyof typeof SyncStatus {
    return this.currentStatus;
  }

  // 公共方法：獲取待同步操作數量
  static async getPendingOperationsCount(): Promise<number> {
    try {
      return await offlineSyncDb.offlineOperations.count();
    } catch (error) {
      console.error('❌ Error getting pending operations count:', error);
      return 0;
    }
  }

  // 公共方法：手動觸發同步
  static async manualSync(): Promise<void> {
    if (this.currentStatus === 'ONLINE') {
      this.currentStatus = 'SYNCING';
      
      try {
        await this.syncOfflineOperations();
        await this.processConflicts();
        this.currentStatus = 'ONLINE';
        
        console.log('✅ Manual sync completed');
      } catch (error) {
        console.error('❌ Manual sync failed:', error);
        this.currentStatus = 'ERROR';
      }
    }
  }

  // 公共方法：清理失敗的操作
  static async clearFailedOperations(): Promise<void> {
    try {
      await offlineSyncDb.offlineOperations
        .where('retryCount')
        .aboveOrEqual(3)
        .delete();
      
      console.log('🗑️ Cleared failed operations');
    } catch (error) {
      console.error('❌ Error clearing failed operations:', error);
    }
  }

  // 公共方法：設置衝突解決策略
  static setConflictResolutionStrategy(strategy: keyof typeof ConflictResolutionStrategy): void {
    this.conflictResolutionStrategy = strategy;
    console.log(`⚙️ Conflict resolution strategy set to: ${strategy}`);
  }

  // 公共方法：獲取衝突解決策略
  static getConflictResolutionStrategy(): keyof typeof ConflictResolutionStrategy {
    return this.conflictResolutionStrategy;
  }

  // 公共方法：導出數據用於備份
  static async exportData(): Promise<any> {
    try {
      const [transactions, accounts, categories] = await Promise.all([
        getAllTransactions(),
        getAllAccounts(),
        getAllCategories()
      ]);

      return {
        transactions,
        accounts,
        categories,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      throw error;
    }
  }

  // 公共方法：導入數據
  static async importData(data: any): Promise<void> {
    try {
      // 驗證數據格式
      if (!data.transactions || !data.accounts || !data.categories) {
        throw new Error('Invalid data format');
      }

      // 清空現有數據
      await db.transactions.clear();
      await db.accounts.clear();
      await db.categories.clear();

      // 導入新數據
      await db.transactions.bulkAdd(data.transactions);
      await db.accounts.bulkAdd(data.accounts);
      await db.categories.bulkAdd(data.categories);

      console.log('✅ Data imported successfully');
    } catch (error) {
      console.error('❌ Error importing data:', error);
      throw error;
    }
  }

  // 清理資源
  static cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}
