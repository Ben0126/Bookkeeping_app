import type { StudentCategory, StudentCategoryInfo, StudentCategoryType } from '../types';

// 留學生分類資訊資料庫（基礎資料，不包含用戶可見文字）
export const STUDENT_CATEGORY_INFO: Record<StudentCategory, Omit<StudentCategoryInfo, 'name' | 'description'>> = {
  // 學費相關
  'tuition': {
    code: 'tuition',
    type: 'tuition',
    country: 'Global',
    icon: '🎓',
    color: '#3B82F6',
    isEssential: true,
    budgetRecommendation: 2000
  },
  'tuition_fees': {
    code: 'tuition_fees',
    type: 'tuition',
    country: 'Global',
    icon: '💰',
    color: '#1D4ED8',
    isEssential: true,
    budgetRecommendation: 5000
  },
  'tuition_deposit': {
    code: 'tuition_deposit',
    type: 'tuition',
    country: 'Global',
    icon: '💳',
    color: '#1E40AF',
    isEssential: true,
    budgetRecommendation: 1000
  },
  'tuition_insurance': {
    code: 'tuition_insurance',
    type: 'tuition',
    country: 'Global',
    icon: '🛡️',
    color: '#1E3A8A',
    isEssential: true,
    budgetRecommendation: 200
  },

  // 生活費用
  'living': {
    code: 'living',
    type: 'living',
    country: 'Global',
    icon: '🏠',
    color: '#10B981',
    isEssential: true,
    budgetRecommendation: 1200
  },
  'rent': {
    code: 'rent',
    type: 'living',
    country: 'Global',
    icon: '🏘️',
    color: '#059669',
    isEssential: true,
    budgetRecommendation: 800
  },
  'utilities': {
    code: 'utilities',
    type: 'living',
    country: 'Global',
    icon: '⚡',
    color: '#047857',
    isEssential: true,
    budgetRecommendation: 150
  },
  'groceries': {
    code: 'groceries',
    type: 'living',
    country: 'Global',
    icon: '🛒',
    color: '#065F46',
    isEssential: true,
    budgetRecommendation: 300
  },
  'dining': {
    code: 'dining',
    type: 'living',
    country: 'Global',
    icon: '🍽️',
    color: '#064E3B',
    isEssential: false,
    budgetRecommendation: 200
  },

  // 學習用品
  'books': {
    code: 'books',
    type: 'books',
    country: 'Global',
    icon: '📚',
    color: '#8B5CF6',
    isEssential: true,
    budgetRecommendation: 300
  },
  'supplies': {
    code: 'supplies',
    type: 'books',
    country: 'Global',
    icon: '✏️',
    color: '#7C3AED',
    isEssential: true,
    budgetRecommendation: 50
  },
  'software': {
    code: 'software',
    type: 'books',
    country: 'Global',
    icon: '💻',
    color: '#6D28D9',
    isEssential: false,
    budgetRecommendation: 100
  },
  'equipment': {
    code: 'equipment',
    type: 'books',
    country: 'Global',
    icon: '🔬',
    color: '#5B21B6',
    isEssential: true,
    budgetRecommendation: 500
  },

  // 交通費用
  'transport': {
    code: 'transport',
    type: 'transport',
    country: 'Global',
    icon: '🚌',
    color: '#F59E0B',
    isEssential: true,
    budgetRecommendation: 150
  },
  'flight': {
    code: 'flight',
    type: 'transport',
    country: 'Global',
    icon: '✈️',
    color: '#D97706',
    isEssential: true,
    budgetRecommendation: 800
  },
  'local_transport': {
    code: 'local_transport',
    type: 'transport',
    country: 'Global',
    icon: '🚇',
    color: '#B45309',
    isEssential: true,
    budgetRecommendation: 100
  },
  'car_expenses': {
    code: 'car_expenses',
    type: 'transport',
    country: 'Global',
    icon: '🚗',
    color: '#92400E',
    isEssential: false,
    budgetRecommendation: 300
  },

  // 健康保險
  'health': {
    code: 'health',
    type: 'health',
    country: 'Global',
    icon: '🏥',
    color: '#EF4444',
    isEssential: true,
    budgetRecommendation: 100
  },
  'health_insurance': {
    code: 'health_insurance',
    type: 'health',
    country: 'Global',
    icon: '🏥',
    color: '#DC2626',
    isEssential: true,
    budgetRecommendation: 150
  },
  'medical': {
    code: 'medical',
    type: 'health',
    country: 'Global',
    icon: '💊',
    color: '#B91C1C',
    isEssential: true,
    budgetRecommendation: 50
  },
  'dental': {
    code: 'dental',
    type: 'health',
    country: 'Global',
    icon: '🦷',
    color: '#991B1B',
    isEssential: false,
    budgetRecommendation: 100
  },

  // 簽證費用
  'visa': {
    code: 'visa',
    type: 'visa',
    country: 'Global',
    icon: '📋',
    color: '#6B7280',
    isEssential: true,
    budgetRecommendation: 200
  },
  'visa_fees': {
    code: 'visa_fees',
    type: 'visa',
    country: 'Global',
    icon: '📄',
    color: '#4B5563',
    isEssential: true,
    budgetRecommendation: 300
  },
  'visa_renewal': {
    code: 'visa_renewal',
    type: 'visa',
    country: 'Global',
    icon: '🔄',
    color: '#374151',
    isEssential: true,
    budgetRecommendation: 200
  },
  'visa_consultation': {
    code: 'visa_consultation',
    type: 'visa',
    country: 'Global',
    icon: '⚖️',
    color: '#1F2937',
    isEssential: false,
    budgetRecommendation: 150
  },

  // 其他
  'other': {
    code: 'other',
    type: 'other',
    country: 'Global',
    icon: '📦',
    color: '#9CA3AF',
    isEssential: false,
    budgetRecommendation: 100
  },
  'entertainment': {
    code: 'entertainment',
    type: 'other',
    country: 'Global',
    icon: '🎬',
    color: '#A78BFA',
    isEssential: false,
    budgetRecommendation: 100
  },
  'shopping': {
    code: 'shopping',
    type: 'other',
    country: 'Global',
    icon: '🛍️',
    color: '#C084FC',
    isEssential: false,
    budgetRecommendation: 150
  },
  'emergency': {
    code: 'emergency',
    type: 'other',
    country: 'Global',
    icon: '🚨',
    color: '#F87171',
    isEssential: true,
    budgetRecommendation: 500
  }
};

export class StudentCategoryService {
  /**
   * 獲取留學生分類資訊
   */
  static getStudentCategoryInfo(category: StudentCategory): Omit<StudentCategoryInfo, 'name' | 'description'> {
    return STUDENT_CATEGORY_INFO[category];
  }

  /**
   * 獲取分類名稱（需要國際化）
   */
  static getCategoryName(category: StudentCategory, t?: (key: string) => string): string {
    if (t) {
      return t(`studentCategories.${category}`) || category;
    }
    return category;
  }

  /**
   * 獲取分類描述（需要國際化）
   */
  static getCategoryDescription(category: StudentCategory, t?: (key: string) => string): string {
    if (t) {
      return t(`studentCategories.${category}Desc`) || '';
    }
    return '';
  }

  /**
   * 獲取所有留學生分類
   */
  static getAllStudentCategories(): StudentCategory[] {
    return Object.keys(STUDENT_CATEGORY_INFO) as StudentCategory[];
  }

  /**
   * 根據類型獲取分類
   */
  static getCategoriesByType(type: StudentCategoryType): StudentCategory[] {
    return this.getAllStudentCategories().filter(
      category => this.getStudentCategoryInfo(category).type === type
    );
  }

  /**
   * 獲取必要支出分類
   */
  static getEssentialCategories(): StudentCategory[] {
    return this.getAllStudentCategories().filter(
      category => this.getStudentCategoryInfo(category).isEssential
    );
  }

  /**
   * 獲取非必要支出分類
   */
  static getNonEssentialCategories(): StudentCategory[] {
    return this.getAllStudentCategories().filter(
      category => !this.getStudentCategoryInfo(category).isEssential
    );
  }

  /**
   * 獲取常用分類（留學生最常用）
   */
  static getCommonCategories(): StudentCategory[] {
    return [
      'tuition_fees',
      'rent',
      'groceries',
      'books',
      'transport',
      'health_insurance',
      'visa_fees',
      'utilities',
      'supplies',
      'dining'
    ];
  }

  /**
   * 獲取學費相關分類
   */
  static getTuitionCategories(): StudentCategory[] {
    return this.getCategoriesByType('tuition');
  }

  /**
   * 獲取生活費用分類
   */
  static getLivingCategories(): StudentCategory[] {
    return this.getCategoriesByType('living');
  }

  /**
   * 獲取學習用品分類
   */
  static getBooksCategories(): StudentCategory[] {
    return this.getCategoriesByType('books');
  }

  /**
   * 獲取交通費用分類
   */
  static getTransportCategories(): StudentCategory[] {
    return this.getCategoriesByType('transport');
  }

  /**
   * 獲取健康保險分類
   */
  static getHealthCategories(): StudentCategory[] {
    return this.getCategoriesByType('health');
  }

  /**
   * 獲取簽證費用分類
   */
  static getVisaCategories(): StudentCategory[] {
    return this.getCategoriesByType('visa');
  }

  /**
   * 獲取其他分類
   */
  static getOtherCategories(): StudentCategory[] {
    return this.getCategoriesByType('other');
  }

  /**
   * 檢查分類是否支援
   */
  static isSupportedCategory(category: string): category is StudentCategory {
    return category in STUDENT_CATEGORY_INFO;
  }

  /**
   * 獲取分類圖示
   */
  static getCategoryIcon(category: StudentCategory): string {
    return this.getStudentCategoryInfo(category).icon;
  }

  /**
   * 獲取分類顏色
   */
  static getCategoryColor(category: StudentCategory): string {
    return this.getStudentCategoryInfo(category).color;
  }

  /**
   * 獲取建議預算
   */
  static getBudgetRecommendation(category: StudentCategory): number | undefined {
    return this.getStudentCategoryInfo(category).budgetRecommendation;
  }

  /**
   * 檢查是否為必要支出
   */
  static isEssential(category: StudentCategory): boolean {
    return this.getStudentCategoryInfo(category).isEssential;
  }
}
