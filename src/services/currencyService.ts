import type { Currency, CurrencyInfo } from '../types';

// 貨幣資訊資料庫
export const CURRENCY_INFO: Record<Currency, CurrencyInfo> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimalPlaces: 2,
    country: 'United States'
  },
  TWD: {
    code: 'TWD',
    name: 'Taiwan Dollar',
    symbol: 'NT$',
    decimalPlaces: 0,
    country: 'Taiwan'
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimalPlaces: 2,
    country: 'United Kingdom'
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    decimalPlaces: 2,
    country: 'Australia'
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimalPlaces: 2,
    country: 'European Union'
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    decimalPlaces: 0,
    country: 'Japan'
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    decimalPlaces: 2,
    country: 'Canada'
  },
  CHF: {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    decimalPlaces: 2,
    country: 'Switzerland'
  },
  CNY: {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    decimalPlaces: 2,
    country: 'China'
  },
  HKD: {
    code: 'HKD',
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    decimalPlaces: 2,
    country: 'Hong Kong'
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    decimalPlaces: 2,
    country: 'Singapore'
  },
  NZD: {
    code: 'NZD',
    name: 'New Zealand Dollar',
    symbol: 'NZ$',
    decimalPlaces: 2,
    country: 'New Zealand'
  }
};

export class CurrencyService {
  /**
   * 獲取貨幣資訊
   */
  static getCurrencyInfo(currency: Currency): CurrencyInfo {
    return CURRENCY_INFO[currency];
  }

  /**
   * 獲取所有支援的貨幣
   */
  static getAllCurrencies(): Currency[] {
    return Object.keys(CURRENCY_INFO) as Currency[];
  }

  /**
   * 格式化貨幣金額
   */
  static formatCurrency(amount: number, currency: Currency, locale?: string): string {
    const currencyInfo = this.getCurrencyInfo(currency);
    
    try {
      return new Intl.NumberFormat(locale || 'en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: currencyInfo.decimalPlaces,
        maximumFractionDigits: currencyInfo.decimalPlaces,
      }).format(amount);
    } catch (error) {
      // 如果格式化失敗，使用基本格式
      return `${currencyInfo.symbol}${amount.toFixed(currencyInfo.decimalPlaces)}`;
    }
  }

  /**
   * 獲取貨幣符號
   */
  static getCurrencySymbol(currency: Currency): string {
    return this.getCurrencyInfo(currency).symbol;
  }

  /**
   * 獲取貨幣名稱
   */
  static getCurrencyName(currency: Currency): string {
    return this.getCurrencyInfo(currency).name;
  }

  /**
   * 獲取貨幣國家
   */
  static getCurrencyCountry(currency: Currency): string {
    return this.getCurrencyInfo(currency).country;
  }

  /**
   * 檢查貨幣是否支援
   */
  static isSupportedCurrency(currency: string): currency is Currency {
    return currency in CURRENCY_INFO;
  }

  /**
   * 獲取常用貨幣（留學生常用）
   */
  static getCommonCurrencies(): Currency[] {
    return ['USD', 'TWD', 'GBP', 'AUD', 'EUR', 'JPY', 'CAD'];
  }

  /**
   * 獲取亞洲貨幣
   */
  static getAsianCurrencies(): Currency[] {
    return ['TWD', 'JPY', 'CNY', 'HKD', 'SGD'];
  }

  /**
   * 獲取歐洲貨幣
   */
  static getEuropeanCurrencies(): Currency[] {
    return ['EUR', 'GBP', 'CHF'];
  }

  /**
   * 獲取美洲貨幣
   */
  static getAmericanCurrencies(): Currency[] {
    return ['USD', 'CAD'];
  }

  /**
   * 獲取大洋洲貨幣
   */
  static getOceanianCurrencies(): Currency[] {
    return ['AUD', 'NZD'];
  }
}
