import { db } from '../db';
import { getAllTransactions } from '../db/transactions';
import { getAllAccounts } from '../db/accounts';
import { getAllCategories } from '../db/categories';

// 查詢緩存接口
interface QueryCache {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

// 查詢優化服務
export class QueryOptimizationService {
  private static cache = new Map<string, QueryCache>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 50;

  // 生成緩存鍵
  private static generateCacheKey(query: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${query}:${paramsStr}`;
  }

  // 檢查緩存是否有效
  private static isCacheValid(cache: QueryCache): boolean {
    return Date.now() - cache.timestamp < cache.ttl;
  }

  // 清理過期緩存
  private static cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, cache] of this.cache.entries()) {
      if (now - cache.timestamp >= cache.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // 限制緩存大小
  private static limitCacheSize(): void {
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // 刪除最舊的緩存
      const toDelete = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  // 設置緩存
  private static setCache(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cleanupExpiredCache();
    this.limitCacheSize();
    
    this.cache.set(key, {
      key,
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // 獲取緩存
  private static getCache(key: string): any | null {
    const cache = this.cache.get(key);
    if (cache && this.isCacheValid(cache)) {
      return cache.data;
    }
    
    if (cache) {
      this.cache.delete(key);
    }
    
    return null;
  }

  // 優化的交易查詢
  static async getOptimizedTransactions(filters?: {
    accountId?: number;
    categoryId?: number;
    startDate?: Date;
    endDate?: Date;
    type?: string;
  }): Promise<any[]> {
    const cacheKey = this.generateCacheKey('transactions', filters);
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      console.log('📦 Cache hit for transactions query');
      return cached;
    }

    console.log('🔍 Executing optimized transactions query');
    
    let query = db.transactions.orderBy('date');
    
    // 應用過濾器
    if (filters?.accountId) {
      query = query.filter(tx => tx.accountId === filters.accountId);
    }
    
    if (filters?.categoryId) {
      query = query.filter(tx => tx.categoryId === filters.categoryId);
    }
    
    if (filters?.type) {
      query = query.filter(tx => tx.type === filters.type);
    }
    
    if (filters?.startDate) {
      query = query.filter(tx => new Date(tx.date) >= filters.startDate!);
    }
    
    if (filters?.endDate) {
      query = query.filter(tx => new Date(tx.date) <= filters.endDate!);
    }

    const result = await query.reverse().toArray();
    
    // 緩存結果
    this.setCache(cacheKey, result, 2 * 60 * 1000); // 2 minutes for transactions
    
    return result;
  }

  // 優化的帳戶查詢
  static async getOptimizedAccounts(): Promise<any[]> {
    const cacheKey = this.generateCacheKey('accounts');
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      console.log('📦 Cache hit for accounts query');
      return cached;
    }

    console.log('🔍 Executing optimized accounts query');
    
    const result = await getAllAccounts();
    
    // 緩存結果
    this.setCache(cacheKey, result, 10 * 60 * 1000); // 10 minutes for accounts
    
    return result;
  }

  // 優化的分類查詢
  static async getOptimizedCategories(type?: string): Promise<any[]> {
    const cacheKey = this.generateCacheKey('categories', { type });
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      console.log('📦 Cache hit for categories query');
      return cached;
    }

    console.log('🔍 Executing optimized categories query');
    
    let result = await getAllCategories();
    
    if (type) {
      result = result.filter(cat => cat.type === type);
    }
    
    // 緩存結果
    this.setCache(cacheKey, result, 15 * 60 * 1000); // 15 minutes for categories
    
    return result;
  }

  // 批量查詢優化
  static async getBatchData(): Promise<{
    transactions: any[];
    accounts: any[];
    categories: any[];
  }> {
    const cacheKey = this.generateCacheKey('batch_data');
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      console.log('📦 Cache hit for batch data query');
      return cached;
    }

    console.log('🔍 Executing optimized batch query');
    
    // 並行執行查詢
    const [transactions, accounts, categories] = await Promise.all([
      getAllTransactions(),
      getAllAccounts(),
      getAllCategories()
    ]);
    
    const result = { transactions, accounts, categories };
    
    // 緩存結果
    this.setCache(cacheKey, result, 3 * 60 * 1000); // 3 minutes for batch data
    
    return result;
  }

  // 統計查詢優化
  static async getOptimizedStatistics(period: string, startDate?: Date, endDate?: Date): Promise<any> {
    const cacheKey = this.generateCacheKey('statistics', { period, startDate, endDate });
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      console.log('📦 Cache hit for statistics query');
      return cached;
    }

    console.log('🔍 Executing optimized statistics query');
    
    // 獲取過濾後的交易數據
    const transactions = await this.getOptimizedTransactions({
      startDate,
      endDate
    });
    
    // 計算統計數據
    const result = {
      totalIncome: transactions
        .filter(tx => tx.type === 'Income')
        .reduce((sum, tx) => sum + tx.amount, 0),
      totalExpense: transactions
        .filter(tx => tx.type === 'Expense')
        .reduce((sum, tx) => sum + tx.amount, 0),
      transactionCount: transactions.length,
      period,
      lastUpdated: new Date()
    };
    
    // 緩存結果
    this.setCache(cacheKey, result, 1 * 60 * 1000); // 1 minute for statistics
    
    return result;
  }

  // 清理所有緩存
  static clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Query cache cleared');
  }

  // 獲取緩存統計
  static getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0 // 可以實現更複雜的命中率計算
    };
  }

  // 預加載常用數據
  static async preloadCommonData(): Promise<void> {
    console.log('🚀 Preloading common data...');
    
    try {
      await Promise.all([
        this.getOptimizedAccounts(),
        this.getOptimizedCategories(),
        this.getOptimizedTransactions()
      ]);
      
      console.log('✅ Common data preloaded successfully');
    } catch (error) {
      console.error('❌ Failed to preload common data:', error);
    }
  }

  // 智能預取
  static async smartPrefetch(userBehavior: {
    currentPage: string;
    frequentPages: string[];
  }): Promise<void> {
    console.log('🧠 Smart prefetch based on user behavior:', userBehavior);
    
    try {
      const prefetchPromises: Promise<any>[] = [];
      
      // 根據當前頁面預取相關數據
      switch (userBehavior.currentPage) {
        case 'transactions':
          prefetchPromises.push(
            this.getOptimizedAccounts(),
            this.getOptimizedCategories()
          );
          break;
        case 'statistics':
          prefetchPromises.push(
            this.getOptimizedTransactions(),
            this.getOptimizedStatistics('month')
          );
          break;
        case 'accounts':
          prefetchPromises.push(
            this.getOptimizedTransactions({ type: 'Income' }),
            this.getOptimizedTransactions({ type: 'Expense' })
          );
          break;
      }
      
      // 根據用戶常用頁面預取
      if (userBehavior.frequentPages.includes('statistics')) {
        prefetchPromises.push(this.getOptimizedStatistics('week'));
      }
      
      await Promise.all(prefetchPromises);
      console.log('✅ Smart prefetch completed');
    } catch (error) {
      console.error('❌ Smart prefetch failed:', error);
    }
  }
}
