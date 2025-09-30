// src/types/index.ts

export type Currency = 'USD' | 'TWD' | 'GBP' | 'AUD' | 'EUR' | 'JPY' | 'CAD' | 'CHF' | 'CNY' | 'HKD' | 'SGD' | 'NZD';

// 貨幣常數定義
export const CURRENCIES = {
  USD: 'USD',
  TWD: 'TWD',
  GBP: 'GBP',
  AUD: 'AUD',
  EUR: 'EUR',
  JPY: 'JPY',
  CAD: 'CAD',
  CHF: 'CHF',
  CNY: 'CNY',
  HKD: 'HKD',
  SGD: 'SGD',
  NZD: 'NZD',
} as const;

// 貨幣資訊介面
export interface CurrencyInfo {
  code: Currency;
  name: string;
  symbol: string;
  decimalPlaces: number;
  country: string;
}

// 多國帳戶類型定義
export const AccountType = {
  // 美國帳戶類型
  US_CHECKING: 'US Checking Account',
  US_SAVINGS: 'US Savings Account',
  US_MONEY_MARKET: 'US Money Market Account',
  US_CD: 'US Certificate of Deposit',
  
  // 英國帳戶類型
  UK_CURRENT: 'UK Current Account',
  UK_SAVINGS: 'UK Savings Account',
  UK_ISA: 'UK Individual Savings Account',
  UK_PREMIUM: 'UK Premium Account',
  
  // 澳洲帳戶類型
  AU_TRANSACTION: 'AU Transaction Account',
  AU_SAVINGS: 'AU Savings Account',
  AU_TERM_DEPOSIT: 'AU Term Deposit',
  AU_OFFSET: 'AU Offset Account',
  
  // 台灣帳戶類型
  TW_CHECKING: 'TW Checking Account',
  TW_SAVINGS: 'TW Savings Account',
  TW_FOREIGN: 'TW Foreign Currency Account',
  
  // 歐洲帳戶類型
  EU_CURRENT: 'EU Current Account',
  EU_SAVINGS: 'EU Savings Account',
  EU_INVESTMENT: 'EU Investment Account',
  
  // 日本帳戶類型
  JP_ORDINARY: 'JP Ordinary Account',
  JP_SAVINGS: 'JP Savings Account',
  JP_FOREIGN: 'JP Foreign Currency Account',
  
  // 加拿大帳戶類型
  CA_CHEQUING: 'CA Chequing Account',
  CA_SAVINGS: 'CA Savings Account',
  CA_TFSA: 'CA Tax-Free Savings Account',
  
  // 通用帳戶類型
  CASH_WALLET: 'Cash Wallet',
  CREDIT_CARD: 'Credit Card',
  INVESTMENT: 'Investment Account',
  CRYPTO: 'Cryptocurrency Wallet',
  OTHER: 'Other',
} as const;

export type AccountType = typeof AccountType[keyof typeof AccountType];

// 帳戶類型資訊介面
export interface AccountTypeInfo {
  code: AccountType;
  name: string;
  country: string;
  category: 'bank' | 'cash' | 'credit' | 'investment' | 'crypto' | 'other';
  description: string;
  features: string[];
}

export interface Account {
  id?: number;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  color: string;
}

export const TransactionType = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
  TRANSFER: 'Transfer',
} as const;

export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

export interface Category {
  id?: number;
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
}

// Legacy enums removed - now using dynamic categories from database

export interface Transaction {
  id?: number;
  type: TransactionType;
  amount: number;
  currency: Currency;
  date: Date;
  accountId: number;
  categoryId: number;
  notes?: string;
  // For cross-currency transactions
  exchangeRate?: number;
  // For transfers
  toAccountId?: number;
  toAmount?: number;
  // For student-specific tracking
  studentCategory?: StudentCategory;
  isStudentExpense?: boolean;
}

// 留學生專用分類類型
export type StudentCategoryType = 'tuition' | 'living' | 'books' | 'transport' | 'health' | 'visa' | 'other';

// 留學生分類常數
export const StudentCategory = {
  // 學費相關
  TUITION: 'tuition',
  TUITION_FEES: 'tuition_fees',
  TUITION_DEPOSIT: 'tuition_deposit',
  TUITION_INSURANCE: 'tuition_insurance',
  
  // 生活費用
  LIVING: 'living',
  RENT: 'rent',
  UTILITIES: 'utilities',
  GROCERIES: 'groceries',
  DINING: 'dining',
  
  // 學習用品
  BOOKS: 'books',
  SUPPLIES: 'supplies',
  SOFTWARE: 'software',
  EQUIPMENT: 'equipment',
  
  // 交通費用
  TRANSPORT: 'transport',
  FLIGHT: 'flight',
  LOCAL_TRANSPORT: 'local_transport',
  CAR_EXPENSES: 'car_expenses',
  
  // 健康保險
  HEALTH: 'health',
  HEALTH_INSURANCE: 'health_insurance',
  MEDICAL: 'medical',
  DENTAL: 'dental',
  
  // 簽證費用
  VISA: 'visa',
  VISA_FEES: 'visa_fees',
  VISA_RENEWAL: 'visa_renewal',
  VISA_CONSULTATION: 'visa_consultation',
  
  // 其他
  OTHER: 'other',
  ENTERTAINMENT: 'entertainment',
  SHOPPING: 'shopping',
  EMERGENCY: 'emergency'
} as const;

export type StudentCategory = typeof StudentCategory[keyof typeof StudentCategory];

// 留學生分類資訊介面
export interface StudentCategoryInfo {
  code: StudentCategory;
  name: string;
  type: StudentCategoryType;
  country: string;
  description: string;
  icon: string;
  color: string;
  isEssential: boolean; // 是否為必要支出
  budgetRecommendation?: number; // 建議預算（月）
}

// 留學生預算設定介面
export interface StudentBudget {
  id?: number;
  country: string;
  category: StudentCategory;
  monthlyBudget: number;
  currency: Currency;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 留學生費用提醒介面
export interface StudentReminder {
  id?: number;
  title: string;
  description: string;
  category: StudentCategory;
  dueDate: Date;
  amount?: number;
  currency?: Currency;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  country: string;
}
