import React from 'react';
import { useTranslation } from 'react-i18next';
import { AccountTypeService } from '../services/accountTypeService';

export type Country = 
  | 'United States'
  | 'United Kingdom' 
  | 'Australia'
  | 'Taiwan'
  | 'European Union'
  | 'Japan'
  | 'Canada'
  | 'Global';

interface CountrySelectorProps {
  value: Country | '';
  onChange: (country: Country) => void;
  className?: string;
  showLabel?: boolean;
  label?: string;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  onChange,
  className = '',
  showLabel = true,
  label
}) => {
  const { t } = useTranslation();

  // 獲取所有可用的國家/地區
  const getAvailableCountries = (): Country[] => {
    const allAccountTypes = AccountTypeService.getAllAccountTypes();
    const countries = new Set<Country>();
    
    allAccountTypes.forEach(accountType => {
      const country = AccountTypeService.getAccountTypeCountry(accountType) as Country;
      countries.add(country);
    });
    
    return Array.from(countries).sort();
  };

  // 獲取國家/地區的翻譯
  const getCountryTranslation = (country: Country): string => {
    const countryKey = country.toLowerCase().replace(/\s+/g, '') as keyof typeof import('../locales/zh-TW.json')['countries'];
    return t(`countries.${countryKey}`) || country;
  };

  const countries = getAvailableCountries();

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700">
          {label || t('accounts.country')}
        </label>
      )}
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Country)}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
      >
        <option value="">{t('accounts.selectCountry')}</option>
        {countries.map((country) => (
          <option key={country} value={country}>
            {getCountryTranslation(country)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CountrySelector;
