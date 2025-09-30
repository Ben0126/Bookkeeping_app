import React from 'react';
import type { Currency } from '../types';
import { CurrencyService } from '../services/currencyService';
import { useTranslation } from 'react-i18next';

interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  className?: string;
  showLabel?: boolean;
  label?: string;
  groupByRegion?: boolean;
  commonOnly?: boolean;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  className = '',
  showLabel = true,
  label,
  groupByRegion = false,
  commonOnly = false
}) => {
  const { t } = useTranslation();

  // 獲取貨幣選項
  const getCurrencyOptions = (): Currency[] => {
    if (commonOnly) {
      return CurrencyService.getCommonCurrencies();
    }
    return CurrencyService.getAllCurrencies();
  };

  // 獲取貨幣翻譯
  const getCurrencyTranslation = (currency: Currency): string => {
    const currencyKey = currency.toLowerCase() as keyof typeof import('../locales/zh-TW.json')['currencies'];
    return t(`currencies.${currencyKey}`) || CurrencyService.getCurrencyName(currency);
  };

  // 按地區分組貨幣
  const getGroupedCurrencies = () => {
    if (!groupByRegion) {
      return { all: getCurrencyOptions() };
    }

    return {
      common: CurrencyService.getCommonCurrencies(),
      asia: CurrencyService.getAsianCurrencies(),
      europe: CurrencyService.getEuropeanCurrencies(),
      america: CurrencyService.getAmericanCurrencies(),
      oceania: CurrencyService.getOceanianCurrencies(),
    };
  };

  const currencies = getCurrencyOptions();
  const groupedCurrencies = getGroupedCurrencies();

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700">
          {label || t('accounts.currency')}
        </label>
      )}
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Currency)}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
      >
        {groupByRegion ? (
          Object.entries(groupedCurrencies).map(([groupName, groupCurrencies]) => (
            <optgroup key={groupName} label={t(`currencyGroups.${groupName}`)}>
              {(groupCurrencies as Currency[]).map((currency: Currency) => (
                <option key={currency} value={currency}>
                  {currency} - {getCurrencyTranslation(currency)}
                </option>
              ))}
            </optgroup>
          ))
        ) : (
          currencies.map((currency: Currency) => (
            <option key={currency} value={currency}>
              {currency} - {getCurrencyTranslation(currency)}
            </option>
          ))
        )}
      </select>
    </div>
  );
};

export default CurrencySelector;
