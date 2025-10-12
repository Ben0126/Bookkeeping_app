import React from 'react';
import type { AccountType } from '../types';
import { AccountTypeService } from '../services/accountTypeService';
import { useTranslation } from 'react-i18next';

interface AccountTypeSelectorProps {
  value: AccountType;
  onChange: (accountType: AccountType) => void;
  className?: string;
  showLabel?: boolean;
  label?: string;
  groupByCountry?: boolean;
  groupByCategory?: boolean;
  commonOnly?: boolean;
  country?: string;
  category?: 'bank' | 'cash' | 'credit' | 'investment' | 'crypto' | 'other';
}

const AccountTypeSelector: React.FC<AccountTypeSelectorProps> = ({
  value,
  onChange,
  className = '',
  showLabel = true,
  label,
  groupByCountry = false,
  groupByCategory = false,
  commonOnly = false,
  country,
  category
}) => {
  const { t } = useTranslation();

  // 獲取帳戶類型選項
  const getAccountTypeOptions = (): AccountType[] => {
    let options: AccountType[] = [];

    if (commonOnly) {
      options = AccountTypeService.getCommonAccountTypes();
    } else if (country) {
      options = AccountTypeService.getAccountTypesByCountry(country);
    } else if (category) {
      options = AccountTypeService.getAccountTypesByCategory(category);
    } else {
      options = AccountTypeService.getAllAccountTypes();
    }

    return options;
  };

  // 獲取帳戶類型翻譯
  const getAccountTypeTranslation = (accountType: AccountType): string => {
    return AccountTypeService.getAccountTypeName(accountType, t);
  };

  // 按國家分組帳戶類型
  const getGroupedAccountTypesByCountry = () => {
    const options = getAccountTypeOptions();
    const grouped: Record<string, AccountType[]> = {};

    options.forEach(accountType => {
      const country = AccountTypeService.getAccountTypeCountry(accountType);
      if (!grouped[country]) {
        grouped[country] = [];
      }
      grouped[country].push(accountType);
    });

    return grouped;
  };

  // 按類別分組帳戶類型
  const getGroupedAccountTypesByCategory = () => {
    const options = getAccountTypeOptions();
    const grouped: Record<string, AccountType[]> = {};

    options.forEach(accountType => {
      const category = AccountTypeService.getAccountTypeCategory(accountType);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(accountType);
    });

    return grouped;
  };

  const accountTypes = getAccountTypeOptions();
  const groupedByCountry = getGroupedAccountTypesByCountry();
  const groupedByCategory = getGroupedAccountTypesByCategory();

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700">
          {label || t('accounts.accountType')}
        </label>
      )}
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AccountType)}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
      >
        {groupByCountry ? (
          Object.entries(groupedByCountry).map(([countryName, countryAccountTypes]) => (
            <optgroup key={countryName} label={countryName}>
              {countryAccountTypes.map((accountType: AccountType) => (
                <option key={accountType} value={accountType}>
                  {getAccountTypeTranslation(accountType)}
                </option>
              ))}
            </optgroup>
          ))
        ) : groupByCategory ? (
          Object.entries(groupedByCategory).map(([categoryName, categoryAccountTypes]) => (
            <optgroup key={categoryName} label={t(`accountCategories.${categoryName}`)}>
              {categoryAccountTypes.map((accountType: AccountType) => (
                <option key={accountType} value={accountType}>
                  {getAccountTypeTranslation(accountType)}
                </option>
              ))}
            </optgroup>
          ))
        ) : (
          accountTypes.map((accountType: AccountType) => (
            <option key={accountType} value={accountType}>
              {getAccountTypeTranslation(accountType)}
            </option>
          ))
        )}
      </select>
    </div>
  );
};

export default AccountTypeSelector;
