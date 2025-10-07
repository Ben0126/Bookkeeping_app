import React, { useState, useEffect } from 'react';
import type { AccountType } from '../types';
import { AccountTypeService } from '../services/accountTypeService';
import { useTranslation } from 'react-i18next';
import CountrySelector from './CountrySelector';
import type { Country } from './CountrySelector';

interface CountryBasedAccountTypeSelectorProps {
  value: AccountType;
  onChange: (accountType: AccountType) => void;
  className?: string;
  showLabel?: boolean;
  label?: string;
}

const CountryBasedAccountTypeSelector: React.FC<CountryBasedAccountTypeSelectorProps> = ({
  value,
  onChange,
  className = '',
  showLabel = true,
  label
}) => {
  const { t } = useTranslation();
  const [selectedCountry, setSelectedCountry] = useState<Country | ''>('');
  const [availableAccountTypes, setAvailableAccountTypes] = useState<AccountType[]>([]);

  // 當國家改變時，更新可用的帳戶類型
  useEffect(() => {
    if (selectedCountry) {
      const accountTypes = AccountTypeService.getAccountTypesByCountry(selectedCountry);
      setAvailableAccountTypes(accountTypes);
      
      // 如果當前選擇的帳戶類型不在新國家的選項中，重置選擇
      if (value && !accountTypes.includes(value)) {
        onChange(accountTypes[0] || ('' as AccountType));
      }
    } else {
      setAvailableAccountTypes([]);
      onChange('' as AccountType);
    }
  }, [selectedCountry, onChange, value]);

  // 當帳戶類型改變時，自動設定對應的國家
  useEffect(() => {
    if (value) {
      const country = AccountTypeService.getAccountTypeCountry(value) as Country;
      if (country !== selectedCountry) {
        setSelectedCountry(country);
      }
    }
  }, [value, selectedCountry]);

  // 獲取帳戶類型翻譯
  const getAccountTypeTranslation = (accountType: AccountType): string => {
    const accountTypeKey = accountType.toLowerCase().replace(/\s+/g, '') as keyof typeof import('../locales/zh-TW.json')['accountTypes'];
    return t(`accountTypes.${accountTypeKey}`) || AccountTypeService.getAccountTypeName(accountType);
  };

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700">
          {label || t('accounts.accountType')}
        </label>
      )}
      
      {/* 國家/地區選擇器 */}
      <CountrySelector
        value={selectedCountry}
        onChange={(country) => {
          setSelectedCountry(country);
        }}
        showLabel={true}
        label={t('accounts.country')}
      />

      {/* 帳戶類型選擇器 */}
      <div className="flex flex-col space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {t('accounts.accountType')}
        </label>
        
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as AccountType)}
          disabled={!selectedCountry || availableAccountTypes.length === 0}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">
            {selectedCountry 
              ? t('accounts.selectAccountType') 
              : t('accounts.selectCountryFirst')
            }
          </option>
          {availableAccountTypes.map((accountType: AccountType) => (
            <option key={accountType} value={accountType}>
              {getAccountTypeTranslation(accountType)}
            </option>
          ))}
        </select>
        
        {selectedCountry && availableAccountTypes.length === 0 && (
          <p className="text-sm text-gray-500">
            {t('accounts.noAccountTypesForCountry')}
          </p>
        )}
      </div>
    </div>
  );
};

export default CountryBasedAccountTypeSelector;
