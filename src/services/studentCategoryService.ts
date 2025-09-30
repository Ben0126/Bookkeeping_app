import type { StudentCategory, StudentCategoryInfo, StudentCategoryType } from '../types';

// 留學生分類資訊資料庫
export const STUDENT_CATEGORY_INFO: Record<StudentCategory, StudentCategoryInfo> = {
  // 學費相關
  'tuition': {
    code: 'tuition',
    name: 'Tuition',
    type: 'tuition',
    country: 'Global',
    description: 'General tuition fees',
    icon: '🎓',
    color: '#3B82F6',
    isEssential: true,
    budgetRecommendation: 2000
  },
  'tuition_fees': {
    code: 'tuition_fees',
    name: 'Tuition Fees',
    type: 'tuition',
    country: 'Global',
    description: 'Semester tuition fees',
    icon: '💰',
    color: '#1D4ED8',
    isEssential: true,
    budgetRecommendation: 5000
  },
  'tuition_deposit': {
    code: 'tuition_deposit',
    name: 'Tuition Deposit',
    type: 'tuition',
    country: 'Global',
    description: 'Tuition deposit payment',
    icon: '💳',
    color: '#1E40AF',
    isEssential: true,
    budgetRecommendation: 1000
  },
  'tuition_insurance': {
    code: 'tuition_insurance',
    name: 'Tuition Insurance',
    type: 'tuition',
    country: 'Global',
    description: 'Student health insurance',
    icon: '🛡️',
    color: '#1E3A8A',
    isEssential: true,
    budgetRecommendation: 200
  },

  // 生活費用
  'living': {
    code: 'living',
    name: 'Living Expenses',
    type: 'living',
    country: 'Global',
    description: 'General living expenses',
    icon: '🏠',
    color: '#10B981',
    isEssential: true,
    budgetRecommendation: 1200
  },
  'rent': {
    code: 'rent',
    name: 'Rent',
    type: 'living',
    country: 'Global',
    description: 'Monthly rent payment',
    icon: '🏘️',
    color: '#059669',
    isEssential: true,
    budgetRecommendation: 800
  },
  'utilities': {
    code: 'utilities',
    name: 'Utilities',
    type: 'living',
    country: 'Global',
    description: 'Electricity, water, internet bills',
    icon: '⚡',
    color: '#047857',
    isEssential: true,
    budgetRecommendation: 150
  },
  'groceries': {
    code: 'groceries',
    name: 'Groceries',
    type: 'living',
    country: 'Global',
    description: 'Food and grocery shopping',
    icon: '🛒',
    color: '#065F46',
    isEssential: true,
    budgetRecommendation: 300
  },
  'dining': {
    code: 'dining',
    name: 'Dining Out',
    type: 'living',
    country: 'Global',
    description: 'Restaurant and takeout meals',
    icon: '🍽️',
    color: '#064E3B',
    isEssential: false,
    budgetRecommendation: 200
  },

  // 學習用品
  'books': {
    code: 'books',
    name: 'Books',
    type: 'books',
    country: 'Global',
    description: 'Textbooks and course materials',
    icon: '📚',
    color: '#8B5CF6',
    isEssential: true,
    budgetRecommendation: 300
  },
  'supplies': {
    code: 'supplies',
    name: 'School Supplies',
    type: 'books',
    country: 'Global',
    description: 'Notebooks, pens, stationery',
    icon: '✏️',
    color: '#7C3AED',
    isEssential: true,
    budgetRecommendation: 50
  },
  'software': {
    code: 'software',
    name: 'Software',
    type: 'books',
    country: 'Global',
    description: 'Educational software and licenses',
    icon: '💻',
    color: '#6D28D9',
    isEssential: false,
    budgetRecommendation: 100
  },
  'equipment': {
    code: 'equipment',
    name: 'Equipment',
    type: 'books',
    country: 'Global',
    description: 'Laptop, calculator, lab equipment',
    icon: '🔬',
    color: '#5B21B6',
    isEssential: true,
    budgetRecommendation: 500
  },

  // 交通費用
  'transport': {
    code: 'transport',
    name: 'Transportation',
    type: 'transport',
    country: 'Global',
    description: 'General transportation costs',
    icon: '🚌',
    color: '#F59E0B',
    isEssential: true,
    budgetRecommendation: 150
  },
  'flight': {
    code: 'flight',
    name: 'Flight Tickets',
    type: 'transport',
    country: 'Global',
    description: 'International and domestic flights',
    icon: '✈️',
    color: '#D97706',
    isEssential: true,
    budgetRecommendation: 800
  },
  'local_transport': {
    code: 'local_transport',
    name: 'Local Transport',
    type: 'transport',
    country: 'Global',
    description: 'Bus, subway, taxi fares',
    icon: '🚇',
    color: '#B45309',
    isEssential: true,
    budgetRecommendation: 100
  },
  'car_expenses': {
    code: 'car_expenses',
    name: 'Car Expenses',
    type: 'transport',
    country: 'Global',
    description: 'Gas, maintenance, insurance',
    icon: '🚗',
    color: '#92400E',
    isEssential: false,
    budgetRecommendation: 300
  },

  // 健康保險
  'health': {
    code: 'health',
    name: 'Health',
    type: 'health',
    country: 'Global',
    description: 'General health expenses',
    icon: '🏥',
    color: '#EF4444',
    isEssential: true,
    budgetRecommendation: 100
  },
  'health_insurance': {
    code: 'health_insurance',
    name: 'Health Insurance',
    type: 'health',
    country: 'Global',
    description: 'Student health insurance premium',
    icon: '🏥',
    color: '#DC2626',
    isEssential: true,
    budgetRecommendation: 150
  },
  'medical': {
    code: 'medical',
    name: 'Medical',
    type: 'health',
    country: 'Global',
    description: 'Doctor visits, medications',
    icon: '💊',
    color: '#B91C1C',
    isEssential: true,
    budgetRecommendation: 50
  },
  'dental': {
    code: 'dental',
    name: 'Dental',
    type: 'health',
    country: 'Global',
    description: 'Dental checkups and treatments',
    icon: '🦷',
    color: '#991B1B',
    isEssential: false,
    budgetRecommendation: 100
  },

  // 簽證費用
  'visa': {
    code: 'visa',
    name: 'Visa',
    type: 'visa',
    country: 'Global',
    description: 'General visa expenses',
    icon: '📋',
    color: '#6B7280',
    isEssential: true,
    budgetRecommendation: 200
  },
  'visa_fees': {
    code: 'visa_fees',
    name: 'Visa Fees',
    type: 'visa',
    country: 'Global',
    description: 'Student visa application fees',
    icon: '📄',
    color: '#4B5563',
    isEssential: true,
    budgetRecommendation: 300
  },
  'visa_renewal': {
    code: 'visa_renewal',
    name: 'Visa Renewal',
    type: 'visa',
    country: 'Global',
    description: 'Visa renewal and extension fees',
    icon: '🔄',
    color: '#374151',
    isEssential: true,
    budgetRecommendation: 200
  },
  'visa_consultation': {
    code: 'visa_consultation',
    name: 'Visa Consultation',
    type: 'visa',
    country: 'Global',
    description: 'Immigration lawyer consultation',
    icon: '⚖️',
    color: '#1F2937',
    isEssential: false,
    budgetRecommendation: 150
  },

  // 其他
  'other': {
    code: 'other',
    name: 'Other',
    type: 'other',
    country: 'Global',
    description: 'Other miscellaneous expenses',
    icon: '📦',
    color: '#9CA3AF',
    isEssential: false,
    budgetRecommendation: 100
  },
  'entertainment': {
    code: 'entertainment',
    name: 'Entertainment',
    type: 'other',
    country: 'Global',
    description: 'Movies, games, social activities',
    icon: '🎬',
    color: '#A78BFA',
    isEssential: false,
    budgetRecommendation: 100
  },
  'shopping': {
    code: 'shopping',
    name: 'Shopping',
    type: 'other',
    country: 'Global',
    description: 'Clothing, personal items',
    icon: '🛍️',
    color: '#C084FC',
    isEssential: false,
    budgetRecommendation: 150
  },
  'emergency': {
    code: 'emergency',
    name: 'Emergency',
    type: 'other',
    country: 'Global',
    description: 'Emergency and unexpected expenses',
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
  static getStudentCategoryInfo(category: StudentCategory): StudentCategoryInfo {
    return STUDENT_CATEGORY_INFO[category];
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
   * 獲取分類名稱
   */
  static getCategoryName(category: StudentCategory): string {
    return this.getStudentCategoryInfo(category).name;
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
   * 獲取分類描述
   */
  static getCategoryDescription(category: StudentCategory): string {
    return this.getStudentCategoryInfo(category).description;
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
