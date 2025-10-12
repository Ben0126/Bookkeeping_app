import type { AccountType, AccountTypeInfo } from '../types';

// 帳戶類型資訊資料庫（基礎資料，不包含用戶可見文字）
export const ACCOUNT_TYPE_INFO: Record<AccountType, Omit<AccountTypeInfo, 'name' | 'description' | 'features'>> = {
  // 美國帳戶類型
  'US Checking Account': {
    code: 'US Checking Account',
    country: 'United States',
    category: 'bank'
  },
  'US Savings Account': {
    code: 'US Savings Account',
    country: 'United States',
    category: 'bank'
  },
  'US Money Market Account': {
    code: 'US Money Market Account',
    country: 'United States',
    category: 'bank'
  },
  'US Certificate of Deposit': {
    code: 'US Certificate of Deposit',
    country: 'United States',
    category: 'bank'
  },

  // 英國帳戶類型
  'UK Current Account': {
    code: 'UK Current Account',
    country: 'United Kingdom',
    category: 'bank'
  },
  'UK Savings Account': {
    code: 'UK Savings Account',
    country: 'United Kingdom',
    category: 'bank'
  },
  'UK Individual Savings Account': {
    code: 'UK Individual Savings Account',
    country: 'United Kingdom',
    category: 'bank'
  },
  'UK Premium Account': {
    code: 'UK Premium Account',
    country: 'United Kingdom',
    category: 'bank'
  },

  // 澳洲帳戶類型
  'AU Transaction Account': {
    code: 'AU Transaction Account',
    country: 'Australia',
    category: 'bank'
  },
  'AU Savings Account': {
    code: 'AU Savings Account',
    country: 'Australia',
    category: 'bank'
  },
  'AU Term Deposit': {
    code: 'AU Term Deposit',
    country: 'Australia',
    category: 'bank'
  },
  'AU Offset Account': {
    code: 'AU Offset Account',
    country: 'Australia',
    category: 'bank'
  },

  // 台灣帳戶類型
  'TW Checking Account': {
    code: 'TW Checking Account',
    country: 'Taiwan',
    category: 'bank'
  },
  'TW Savings Account': {
    code: 'TW Savings Account',
    country: 'Taiwan',
    category: 'bank'
  },
  'TW Foreign Currency Account': {
    code: 'TW Foreign Currency Account',
    country: 'Taiwan',
    category: 'bank'
  },

  // 歐洲帳戶類型
  'EU Current Account': {
    code: 'EU Current Account',
    country: 'European Union',
    category: 'bank'
  },
  'EU Savings Account': {
    code: 'EU Savings Account',
    country: 'European Union',
    category: 'bank'
  },
  'EU Investment Account': {
    code: 'EU Investment Account',
    country: 'European Union',
    category: 'investment'
  },

  // 日本帳戶類型
  'JP Ordinary Account': {
    code: 'JP Ordinary Account',
    country: 'Japan',
    category: 'bank'
  },
  'JP Savings Account': {
    code: 'JP Savings Account',
    country: 'Japan',
    category: 'bank'
  },
  'JP Foreign Currency Account': {
    code: 'JP Foreign Currency Account',
    country: 'Japan',
    category: 'bank'
  },

  // 加拿大帳戶類型
  'CA Chequing Account': {
    code: 'CA Chequing Account',
    country: 'Canada',
    category: 'bank'
  },
  'CA Savings Account': {
    code: 'CA Savings Account',
    country: 'Canada',
    category: 'bank'
  },
  'CA Tax-Free Savings Account': {
    code: 'CA Tax-Free Savings Account',
    country: 'Canada',
    category: 'bank'
  },

  // 通用帳戶類型
  'Cash Wallet': {
    code: 'Cash Wallet',
    country: 'Global',
    category: 'cash'
  },
  'Credit Card': {
    code: 'Credit Card',
    country: 'Global',
    category: 'credit'
  },
  'Investment Account': {
    code: 'Investment Account',
    country: 'Global',
    category: 'investment'
  },
  'Cryptocurrency Wallet': {
    code: 'Cryptocurrency Wallet',
    country: 'Global',
    category: 'crypto'
  },
  'Other': {
    code: 'Other',
    country: 'Global',
    category: 'other'
  }
};

export class AccountTypeService {
  /**
   * 獲取帳戶類型資訊
   */
  static getAccountTypeInfo(accountType: AccountType): Omit<AccountTypeInfo, 'name' | 'description' | 'features'> {
    return ACCOUNT_TYPE_INFO[accountType];
  }

  /**
   * 獲取帳戶類型名稱（需要國際化）
   */
  static getAccountTypeName(accountType: AccountType, t?: (key: string) => string): string {
    if (t) {
      const accountTypeKey = accountType.toLowerCase().replace(/\s+/g, '');
      return t(`accountTypes.${accountTypeKey}`) || accountType;
    }
    return accountType;
  }

  /**
   * 獲取帳戶類型描述（需要國際化）
   */
  static getAccountTypeDescription(accountType: AccountType, t?: (key: string) => string): string {
    if (t) {
      const accountTypeKey = accountType.toLowerCase().replace(/\s+/g, '');
      return t(`accountTypes.${accountTypeKey}Desc`) || '';
    }
    return '';
  }

  /**
   * 獲取帳戶類型功能（需要國際化）
   */
  static getAccountTypeFeatures(accountType: AccountType, t?: (key: string) => string): string[] {
    if (t) {
      const accountTypeKey = accountType.toLowerCase().replace(/\s+/g, '');
      const featuresKey = `accountTypes.${accountTypeKey}Features`;
      const features = t(featuresKey);
      if (features && features !== featuresKey) {
        return features.split(',').map(f => f.trim());
      }
    }
    return [];
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
}
