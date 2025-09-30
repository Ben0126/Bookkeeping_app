// 這個檔案示範系統如何偵測和格式化不同地區的數據

import { CurrencyService } from '../services/currencyService';
import type { Currency } from '../types';

export const demonstrateLocaleDetection = () => {
  console.log('=== 系統自動偵測示範 ===');
  
  // 1. 獲取用戶的語言/地區設定
  const userLocales = navigator.languages || [navigator.language];
  console.log('用戶瀏覽器語言設定:', userLocales);
  
  // 2. 獲取系統時區
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log('系統時區:', timezone);
  
  // 3. 測試不同地區的日期格式
  const testDate = new Date('2023-12-25');
  console.log('\n=== 日期格式 ===');
  console.log('自動偵測:', testDate.toLocaleDateString());
  console.log('美國格式:', testDate.toLocaleDateString('en-US'));
  console.log('台灣格式:', testDate.toLocaleDateString('zh-TW'));
  console.log('英國格式:', testDate.toLocaleDateString('en-GB'));
  console.log('日本格式:', testDate.toLocaleDateString('ja-JP'));
  
  // 4. 測試不同地區的貨幣格式
  const testAmount = 1234.56;
  console.log('\n=== 貨幣格式測試 ===');
  
  // 測試多國貨幣格式化
  const currencies: Currency[] = ['USD', 'TWD', 'GBP', 'AUD', 'EUR', 'JPY'];
  currencies.forEach(currency => {
    const formatted = CurrencyService.formatCurrency(testAmount, currency);
    console.log(`${currency}: ${formatted}`);
  });
  
  // 5. 獲取詳細的格式選項
  const formatOptions = new Intl.NumberFormat().resolvedOptions();
  console.log('\n=== 系統偵測到的格式設定 ===');
  console.log('語言:', formatOptions.locale);
  console.log('數字系統:', formatOptions.numberingSystem);
  
  return {
    userLocales,
    timezone,
    detectedLocale: formatOptions.locale
  };
};

// 實際在我們應用中使用的格式化函數
export const formatCurrency = (amount: number, currency: Currency, locale?: string): string => {
  return CurrencyService.formatCurrency(amount, currency, locale);
};

export const formatDate = (date: Date) => {
  return date.toLocaleDateString();
};

// 如果需要，也可以手動偵測用戶偏好
export const detectUserPreferences = () => {
  const language = navigator.language || 'en-US';
  const languages = navigator.languages || [language];
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // 根據語言推測可能的地區
  const regionGuess = {
    'en-US': 'United States',
    'en-GB': 'United Kingdom', 
    'zh-TW': 'Taiwan',
    'zh-CN': 'China',
    'ja-JP': 'Japan',
    'ko-KR': 'Korea',
    'de-DE': 'Germany',
    'fr-FR': 'France',
    'es-ES': 'Spain',
  };
  
  return {
    primaryLanguage: language,
    allLanguages: languages,
    timezone,
    likelyRegion: regionGuess[language as keyof typeof regionGuess] || 'Unknown'
  };
};