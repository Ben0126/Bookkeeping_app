import Dexie from 'dexie';
import { db } from '../db';
import type { Category, TransactionType } from '../types';
import { TransactionType as TxType } from '../types';

// 商家識別規則類型
interface MerchantRule {
  id?: number;
  pattern: string; // 商家名稱模式（支援正則表達式）
  categoryId: number;
  confidence: number; // 信心度 (0-100)
  lastUsed: Date;
  usageCount: number;
}

// 關鍵詞分類規則
interface KeywordRule {
  keywords: string[];
  categoryId: number;
  priority: number; // 優先級，數字越高優先級越高
}

// 擴展資料庫schema以支援商家規則
export class AutoCategorizationDB extends Dexie {
  merchantRules!: Dexie.Table<MerchantRule, number>;
  accounts!: Dexie.Table<any, number>;
  transactions!: Dexie.Table<any, number>;
  categories!: Dexie.Table<any, number>;
  
  constructor() {
    super('StudyBudgetDB');
    this.version(2).stores({
      accounts: '++id, name, type, currency',
      transactions: '++id, type, date, accountId, categoryId',
      categories: '++id, name, type',
      merchantRules: '++id, pattern, categoryId, lastUsed, usageCount',
    });
  }
}

// 升級資料庫
export const autoCatDb = new AutoCategorizationDB();

export class AutoCategorizationService {
  // 預設關鍵詞規則 - 基於留學生常見交易
  private static defaultKeywordRules: KeywordRule[] = [
    // 學費相關
    { keywords: ['tuition', 'university', 'college', 'school', 'education'], categoryId: -1, priority: 10 },
    
    // 餐飲
    { keywords: ['restaurant', 'cafe', 'coffee', 'food', 'mcdonald', 'subway', 'pizza', 'dining'], categoryId: -2, priority: 8 },
    { keywords: ['grocery', 'supermarket', 'walmart', 'target', 'costco'], categoryId: -3, priority: 8 },
    
    // 交通
    { keywords: ['gas', 'fuel', 'uber', 'lyft', 'taxi', 'metro', 'bus', 'parking'], categoryId: -4, priority: 7 },
    
    // 住宿
    { keywords: ['rent', 'apartment', 'housing', 'utilities', 'electric', 'internet', 'wifi'], categoryId: -5, priority: 9 },
    
    // 娛樂
    { keywords: ['movie', 'cinema', 'netflix', 'spotify', 'game', 'entertainment'], categoryId: -6, priority: 5 },
    
    // 健康醫療
    { keywords: ['hospital', 'clinic', 'pharmacy', 'medicine', 'doctor', 'dental'], categoryId: -7, priority: 8 },
    
    // 通訊
    { keywords: ['phone', 'mobile', 'verizon', 'att', 'tmobile'], categoryId: -8, priority: 7 },
    
    // 收入
    { keywords: ['salary', 'wage', 'payroll', 'scholarship', 'refund'], categoryId: -9, priority: 10 },
  ];

  // 根據交易描述自動分類
  static async autoCategorizeTran(
    notes: string, 
    amount: number, 
    type: TransactionType,
    categories: Category[]
  ): Promise<{ categoryId: number; confidence: number; reason: string } | null> {
    
    if (!notes || notes.trim().length === 0) {
      return null;
    }

    const cleanNotes = notes.toLowerCase().trim();
    
    // 1. 檢查商家規則
    const merchantMatch = await this.checkMerchantRules(cleanNotes);
    if (merchantMatch) {
      return {
        categoryId: merchantMatch.categoryId,
        confidence: merchantMatch.confidence,
        reason: `Merchant pattern: "${merchantMatch.pattern}"`
      };
    }

    // 2. 檢查關鍵詞規則
    const keywordMatch = await this.checkKeywordRules(cleanNotes, type, categories);
    if (keywordMatch) {
      return keywordMatch;
    }

    // 3. 基於金額的啟發式規則
    const amountMatch = await this.checkAmountHeuristics(amount, type, categories);
    if (amountMatch) {
      return amountMatch;
    }

    return null;
  }

  // 檢查商家規則
  private static async checkMerchantRules(notes: string): Promise<MerchantRule | null> {
    try {
      const rules = await autoCatDb.merchantRules.toArray();
      
      for (const rule of rules) {
        try {
          const regex = new RegExp(rule.pattern, 'i');
          if (regex.test(notes)) {
            // 更新使用統計
            await autoCatDb.merchantRules.update(rule.id!, {
              lastUsed: new Date(),
              usageCount: rule.usageCount + 1,
              confidence: Math.min(100, rule.confidence + 1) // 增加信心度
            });
            
            return rule;
          }
        } catch (regexError) {
          console.warn('Invalid regex pattern:', rule.pattern);
        }
      }
    } catch (error) {
      console.error('Error checking merchant rules:', error);
    }
    
    return null;
  }

  // 檢查關鍵詞規則
  private static async checkKeywordRules(
    notes: string, 
    type: TransactionType,
    categories: Category[]
  ): Promise<{ categoryId: number; confidence: number; reason: string } | null> {
    
    let bestMatch: { rule: KeywordRule; keyword: string; confidence: number } | null = null;

    for (const rule of this.defaultKeywordRules) {
      for (const keyword of rule.keywords) {
        if (notes.includes(keyword)) {
          // 計算信心度：基於優先級和關鍵詞匹配度
          const confidence = Math.min(95, rule.priority * 8 + keyword.length * 2);
          
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { rule, keyword, confidence };
          }
        }
      }
    }

    if (bestMatch) {
      // 找到對應的實際分類ID
      const targetCategoryName = this.getCategoryNameFromRuleId(bestMatch.rule.categoryId);
      const actualCategory = categories.find(cat => 
        cat.name.toLowerCase().includes(targetCategoryName.toLowerCase()) && 
        cat.type === type
      );

      if (actualCategory && actualCategory.id) {
        return {
          categoryId: actualCategory.id,
          confidence: bestMatch.confidence,
          reason: `Keyword match: "${bestMatch.keyword}"`
        };
      }
    }

    return null;
  }

  // 基於金額的啟發式規則
  private static async checkAmountHeuristics(
    amount: number, 
    type: TransactionType,
    categories: Category[]
  ): Promise<{ categoryId: number; confidence: number; reason: string } | null> {
    
    if (type !== TxType.EXPENSE) return null;

    let targetCategoryName = '';
    let confidence = 0;

    // 基於金額範圍推測分類
    if (amount >= 1000) {
      targetCategoryName = 'tuition'; // 學費
      confidence = 70;
    } else if (amount >= 500) {
      targetCategoryName = 'housing'; // 住宿
      confidence = 60;
    } else if (amount >= 100) {
      targetCategoryName = 'groceries'; // 雜貨
      confidence = 50;
    } else if (amount >= 20) {
      targetCategoryName = 'dining'; // 外食
      confidence = 40;
    } else {
      targetCategoryName = 'other'; // 其他
      confidence = 30;
    }

    // 找到對應的分類
    const actualCategory = categories.find(cat => 
      cat.name.toLowerCase().includes(targetCategoryName) && 
      cat.type === type
    );

    if (actualCategory && actualCategory.id) {
      return {
        categoryId: actualCategory.id,
        confidence,
        reason: `Amount-based heuristic: $${amount} suggests ${targetCategoryName}`
      };
    }

    return null;
  }

  // 學習用戶分類行為
  static async learnFromUserChoice(
    notes: string,
    userSelectedCategoryId: number,
    autoSuggestedCategoryId?: number
  ): Promise<void> {
    
    if (!notes || notes.trim().length === 0) return;

    const cleanNotes = notes.toLowerCase().trim();
    
    // 如果用戶選擇了不同於自動建議的分類，學習新的商家規則
    if (autoSuggestedCategoryId && userSelectedCategoryId !== autoSuggestedCategoryId) {
      await this.createOrUpdateMerchantRule(cleanNotes, userSelectedCategoryId, 'user_correction');
    } else if (!autoSuggestedCategoryId) {
      // 如果沒有自動建議，但用戶做了選擇，也要學習
      await this.createOrUpdateMerchantRule(cleanNotes, userSelectedCategoryId, 'user_choice');
    }
  }

  // 創建或更新商家規則
  private static async createOrUpdateMerchantRule(
    notes: string, 
    categoryId: number, 
    source: 'user_correction' | 'user_choice'
  ): Promise<void> {
    
    // 提取可能的商家名稱（去除數字、符號，保留主要單詞）
    const merchantPattern = this.extractMerchantPattern(notes);
    
    if (!merchantPattern || merchantPattern.length < 3) return;

    try {
      // 檢查是否已存在類似規則
      const existingRules = await autoCatDb.merchantRules
        .where('pattern')
        .equals(merchantPattern)
        .toArray();

      if (existingRules.length > 0) {
        // 更新現有規則
        const rule = existingRules[0];
        const newConfidence = source === 'user_correction' 
          ? Math.max(60, rule.confidence - 10) // 用戶修正降低信心度
          : Math.min(95, rule.confidence + 5);  // 用戶確認增加信心度

        await autoCatDb.merchantRules.update(rule.id!, {
          categoryId,
          confidence: newConfidence,
          lastUsed: new Date(),
          usageCount: rule.usageCount + 1
        });
      } else {
        // 創建新規則
        const initialConfidence = source === 'user_correction' ? 60 : 75;
        
        await autoCatDb.merchantRules.add({
          pattern: merchantPattern,
          categoryId,
          confidence: initialConfidence,
          lastUsed: new Date(),
          usageCount: 1
        });
      }
    } catch (error) {
      console.error('Error creating/updating merchant rule:', error);
    }
  }

  // 提取商家模式
  private static extractMerchantPattern(notes: string): string {
    // 移除數字、特殊符號，保留主要單詞
    let pattern = notes
      .replace(/[0-9]+/g, '') // 移除數字
      .replace(/[^\w\s]/g, ' ') // 移除特殊符號
      .replace(/\s+/g, ' ') // 合併多個空格
      .trim()
      .toLowerCase();

    // 取前面的主要單詞（通常是商家名稱）
    const words = pattern.split(' ').filter(word => word.length >= 3);
    
    if (words.length >= 2) {
      return words.slice(0, 2).join('.*'); // 使用正則表達式模式
    } else if (words.length === 1) {
      return words[0];
    }

    return '';
  }

  // 獲取規則ID對應的分類名稱
  private static getCategoryNameFromRuleId(ruleId: number): string {
    const mapping: { [key: number]: string } = {
      [-1]: 'tuition',
      [-2]: 'dining', 
      [-3]: 'groceries',
      [-4]: 'transportation',
      [-5]: 'housing',
      [-6]: 'entertainment',
      [-7]: 'health',
      [-8]: 'communication',
      [-9]: 'salary'
    };
    
    return mapping[ruleId] || 'other';
  }

  // 獲取用戶的分類統計（用於改進建議）
  static async getUserCategoryStats(): Promise<{ categoryId: number; count: number }[]> {
    try {
      const transactions = await db.transactions.toArray();
      const stats: { [key: number]: number } = {};

      transactions.forEach(tx => {
        if (tx.categoryId) {
          stats[tx.categoryId] = (stats[tx.categoryId] || 0) + 1;
        }
      });

      return Object.entries(stats)
        .map(([categoryId, count]) => ({ categoryId: Number(categoryId), count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error getting user category stats:', error);
      return [];
    }
  }

  // 清理過時的商家規則
  static async cleanupOldRules(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await autoCatDb.merchantRules
        .where('lastUsed')
        .below(thirtyDaysAgo)
        .and(rule => rule.usageCount < 3) // 只刪除使用次數少的
        .delete();
    } catch (error) {
      console.error('Error cleaning up old rules:', error);
    }
  }
}