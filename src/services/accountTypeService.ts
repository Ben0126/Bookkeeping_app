import type { AccountType, AccountTypeInfo } from '../types';

// 帳戶類型資訊資料庫
export const ACCOUNT_TYPE_INFO: Record<AccountType, AccountTypeInfo> = {
  // 美國帳戶類型
  'US Checking Account': {
    code: 'US Checking Account',
    name: 'US Checking Account',
    country: 'United States',
    category: 'bank',
    description: 'Standard checking account for daily transactions',
    features: ['Debit card', 'Online banking', 'Check writing', 'ATM access']
  },
  'US Savings Account': {
    code: 'US Savings Account',
    name: 'US Savings Account',
    country: 'United States',
    category: 'bank',
    description: 'Interest-bearing savings account',
    features: ['Interest earning', 'Limited transactions', 'Online access', 'FDIC insured']
  },
  'US Money Market Account': {
    code: 'US Money Market Account',
    name: 'US Money Market Account',
    country: 'United States',
    category: 'bank',
    description: 'High-yield savings with check writing privileges',
    features: ['Higher interest', 'Check writing', 'Debit card', 'FDIC insured']
  },
  'US Certificate of Deposit': {
    code: 'US Certificate of Deposit',
    name: 'US Certificate of Deposit',
    country: 'United States',
    category: 'bank',
    description: 'Fixed-term deposit with guaranteed interest',
    features: ['Fixed interest rate', 'Term commitment', 'FDIC insured', 'No withdrawals']
  },

  // 英國帳戶類型
  'UK Current Account': {
    code: 'UK Current Account',
    name: 'UK Current Account',
    country: 'United Kingdom',
    category: 'bank',
    description: 'Standard current account for daily banking',
    features: ['Debit card', 'Online banking', 'Direct debits', 'Overdraft facility']
  },
  'UK Savings Account': {
    code: 'UK Savings Account',
    name: 'UK Savings Account',
    country: 'United Kingdom',
    category: 'bank',
    description: 'Interest-bearing savings account',
    features: ['Interest earning', 'Limited withdrawals', 'Online access', 'FSCS protected']
  },
  'UK Individual Savings Account': {
    code: 'UK Individual Savings Account',
    name: 'UK Individual Savings Account',
    country: 'United Kingdom',
    category: 'bank',
    description: 'Tax-free savings account with annual allowance',
    features: ['Tax-free interest', 'Annual allowance', 'Flexible access', 'FSCS protected']
  },
  'UK Premium Account': {
    code: 'UK Premium Account',
    name: 'UK Premium Account',
    country: 'United Kingdom',
    category: 'bank',
    description: 'Premium current account with additional benefits',
    features: ['Higher interest', 'Travel insurance', 'Concierge service', 'No fees']
  },

  // 澳洲帳戶類型
  'AU Transaction Account': {
    code: 'AU Transaction Account',
    name: 'AU Transaction Account',
    country: 'Australia',
    category: 'bank',
    description: 'Everyday transaction account',
    features: ['Debit card', 'Online banking', 'ATM access', 'Direct debits']
  },
  'AU Savings Account': {
    code: 'AU Savings Account',
    name: 'AU Savings Account',
    country: 'Australia',
    category: 'bank',
    description: 'High-interest savings account',
    features: ['High interest', 'Online access', 'Limited transactions', 'Government guarantee']
  },
  'AU Term Deposit': {
    code: 'AU Term Deposit',
    name: 'AU Term Deposit',
    country: 'Australia',
    category: 'bank',
    description: 'Fixed-term deposit with guaranteed returns',
    features: ['Fixed interest', 'Term commitment', 'Government guarantee', 'No early access']
  },
  'AU Offset Account': {
    code: 'AU Offset Account',
    name: 'AU Offset Account',
    country: 'Australia',
    category: 'bank',
    description: 'Account linked to home loan to reduce interest',
    features: ['Offset home loan', 'Flexible access', 'Interest savings', 'Tax benefits']
  },

  // 台灣帳戶類型
  'TW Checking Account': {
    code: 'TW Checking Account',
    name: 'TW Checking Account',
    country: 'Taiwan',
    category: 'bank',
    description: '台幣活期存款帳戶',
    features: ['提款卡', '網路銀行', '支票', 'ATM提款']
  },
  'TW Savings Account': {
    code: 'TW Savings Account',
    name: 'TW Savings Account',
    country: 'Taiwan',
    category: 'bank',
    description: '台幣定期存款帳戶',
    features: ['固定利率', '定期存款', '網路銀行', '存款保險']
  },
  'TW Foreign Currency Account': {
    code: 'TW Foreign Currency Account',
    name: 'TW Foreign Currency Account',
    country: 'Taiwan',
    category: 'bank',
    description: '外幣存款帳戶',
    features: ['多幣別', '匯率優惠', '網路銀行', '外幣提款']
  },

  // 歐洲帳戶類型
  'EU Current Account': {
    code: 'EU Current Account',
    name: 'EU Current Account',
    country: 'European Union',
    category: 'bank',
    description: 'Standard current account for EU residents',
    features: ['Debit card', 'Online banking', 'SEPA transfers', 'Overdraft']
  },
  'EU Savings Account': {
    code: 'EU Savings Account',
    name: 'EU Savings Account',
    country: 'European Union',
    category: 'bank',
    description: 'Interest-bearing savings account',
    features: ['Interest earning', 'Online access', 'Limited transactions', 'Deposit guarantee']
  },
  'EU Investment Account': {
    code: 'EU Investment Account',
    name: 'EU Investment Account',
    country: 'European Union',
    category: 'investment',
    description: 'Investment account for securities trading',
    features: ['Stock trading', 'Bond trading', 'Funds', 'Online platform']
  },

  // 日本帳戶類型
  'JP Ordinary Account': {
    code: 'JP Ordinary Account',
    name: 'JP Ordinary Account',
    country: 'Japan',
    category: 'bank',
    description: '普通預金口座',
    features: ['キャッシュカード', 'ネットバンキング', '振込', 'ATM利用']
  },
  'JP Savings Account': {
    code: 'JP Savings Account',
    name: 'JP Savings Account',
    country: 'Japan',
    category: 'bank',
    description: '定期預金口座',
    features: ['固定金利', '定期預金', 'ネットバンキング', '預金保険']
  },
  'JP Foreign Currency Account': {
    code: 'JP Foreign Currency Account',
    name: 'JP Foreign Currency Account',
    country: 'Japan',
    category: 'bank',
    description: '外貨預金口座',
    features: ['多通貨', '為替レート', 'ネットバンキング', '外貨両替']
  },

  // 加拿大帳戶類型
  'CA Chequing Account': {
    code: 'CA Chequing Account',
    name: 'CA Chequing Account',
    country: 'Canada',
    category: 'bank',
    description: 'Everyday chequing account',
    features: ['Debit card', 'Online banking', 'Cheque writing', 'ATM access']
  },
  'CA Savings Account': {
    code: 'CA Savings Account',
    name: 'CA Savings Account',
    country: 'Canada',
    category: 'bank',
    description: 'Interest-bearing savings account',
    features: ['Interest earning', 'Online access', 'Limited transactions', 'CDIC insured']
  },
  'CA Tax-Free Savings Account': {
    code: 'CA Tax-Free Savings Account',
    name: 'CA Tax-Free Savings Account',
    country: 'Canada',
    category: 'bank',
    description: 'Tax-free savings account with annual contribution room',
    features: ['Tax-free growth', 'Annual contribution', 'Flexible access', 'CDIC insured']
  },

  // 通用帳戶類型
  'Cash Wallet': {
    code: 'Cash Wallet',
    name: 'Cash Wallet',
    country: 'Global',
    category: 'cash',
    description: 'Physical cash wallet',
    features: ['Immediate access', 'No fees', 'Privacy', 'No interest']
  },
  'Credit Card': {
    code: 'Credit Card',
    name: 'Credit Card',
    country: 'Global',
    category: 'credit',
    description: 'Credit card account',
    features: ['Credit limit', 'Rewards', 'Online payments', 'Monthly billing']
  },
  'Investment Account': {
    code: 'Investment Account',
    name: 'Investment Account',
    country: 'Global',
    category: 'investment',
    description: 'Investment and trading account',
    features: ['Stock trading', 'Bond trading', 'Funds', 'Portfolio management']
  },
  'Cryptocurrency Wallet': {
    code: 'Cryptocurrency Wallet',
    name: 'Cryptocurrency Wallet',
    country: 'Global',
    category: 'crypto',
    description: 'Digital cryptocurrency wallet',
    features: ['Crypto storage', 'Trading', 'DeFi access', 'Blockchain transactions']
  },
  'Other': {
    code: 'Other',
    name: 'Other',
    country: 'Global',
    category: 'other',
    description: 'Other account types',
    features: ['Custom features', 'Flexible usage', 'Various benefits']
  }
};

export class AccountTypeService {
  /**
   * 獲取帳戶類型資訊
   */
  static getAccountTypeInfo(accountType: AccountType): AccountTypeInfo {
    return ACCOUNT_TYPE_INFO[accountType];
  }

  /**
   * 獲取所有帳戶類型
   */
  static getAllAccountTypes(): AccountType[] {
    return Object.keys(ACCOUNT_TYPE_INFO) as AccountType[];
  }

  /**
   * 根據國家獲取帳戶類型
   */
  static getAccountTypesByCountry(country: string): AccountType[] {
    return this.getAllAccountTypes().filter(
      type => this.getAccountTypeInfo(type).country === country
    );
  }

  /**
   * 根據類別獲取帳戶類型
   */
  static getAccountTypesByCategory(category: AccountTypeInfo['category']): AccountType[] {
    return this.getAllAccountTypes().filter(
      type => this.getAccountTypeInfo(type).category === category
    );
  }

  /**
   * 獲取常用帳戶類型（留學生常用）
   */
  static getCommonAccountTypes(): AccountType[] {
    return [
      'US Checking Account',
      'US Savings Account',
      'UK Current Account',
      'UK Savings Account',
      'AU Transaction Account',
      'AU Savings Account',
      'TW Checking Account',
      'TW Savings Account',
      'Cash Wallet',
      'Credit Card'
    ];
  }

  /**
   * 獲取銀行帳戶類型
   */
  static getBankAccountTypes(): AccountType[] {
    return this.getAccountTypesByCategory('bank');
  }

  /**
   * 獲取現金帳戶類型
   */
  static getCashAccountTypes(): AccountType[] {
    return this.getAccountTypesByCategory('cash');
  }

  /**
   * 獲取信用卡帳戶類型
   */
  static getCreditAccountTypes(): AccountType[] {
    return this.getAccountTypesByCategory('credit');
  }

  /**
   * 獲取投資帳戶類型
   */
  static getInvestmentAccountTypes(): AccountType[] {
    return this.getAccountTypesByCategory('investment');
  }

  /**
   * 獲取加密貨幣帳戶類型
   */
  static getCryptoAccountTypes(): AccountType[] {
    return this.getAccountTypesByCategory('crypto');
  }

  /**
   * 檢查帳戶類型是否支援
   */
  static isSupportedAccountType(accountType: string): accountType is AccountType {
    return accountType in ACCOUNT_TYPE_INFO;
  }

  /**
   * 獲取帳戶類型名稱
   */
  static getAccountTypeName(accountType: AccountType): string {
    return this.getAccountTypeInfo(accountType).name;
  }

  /**
   * 獲取帳戶類型國家
   */
  static getAccountTypeCountry(accountType: AccountType): string {
    return this.getAccountTypeInfo(accountType).country;
  }

  /**
   * 獲取帳戶類型類別
   */
  static getAccountTypeCategory(accountType: AccountType): AccountTypeInfo['category'] {
    return this.getAccountTypeInfo(accountType).category;
  }

  /**
   * 獲取帳戶類型描述
   */
  static getAccountTypeDescription(accountType: AccountType): string {
    return this.getAccountTypeInfo(accountType).description;
  }

  /**
   * 獲取帳戶類型功能
   */
  static getAccountTypeFeatures(accountType: AccountType): string[] {
    return this.getAccountTypeInfo(accountType).features;
  }
}
