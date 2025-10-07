import { useState } from 'react';
import { AccountType } from '../../types';
import type { Account, Currency } from '../../types';
import { addAccount } from '../../db/accounts';
import Button from '../../components/Button';
import Input from '../../components/Input';
import CurrencySelector from '../../components/CurrencySelector';
import CountryBasedAccountTypeSelector from '../../components/CountryBasedAccountTypeSelector';
import { useTranslation } from 'react-i18next';

interface AddAccountFormProps {
  onSuccess: () => void;
}

const AddAccountForm: React.FC<AddAccountFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.US_CHECKING);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [initialBalance, setInitialBalance] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newAccount: Omit<Account, 'id'> = {
      name: name.trim(),
      type,
      currency,
      balance: parseFloat(initialBalance) || 0,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    };

    try {
      await addAccount(newAccount);
      onSuccess();
    } catch (error) {
      console.error('Error adding account:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <h2 className="text-xl font-semibold">{t('accounts.addAccount')}</h2>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          {t('accounts.accountName')}
        </label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <CountryBasedAccountTypeSelector
          value={type}
          onChange={setType}
          showLabel={true}
        />
      </div>
      <div>
        <CurrencySelector
          value={currency}
          onChange={setCurrency}
          showLabel={true}
          commonOnly={true}
        />
      </div>
      <div>
        <label htmlFor="balance" className="block text-sm font-medium text-gray-700">
          {t('accounts.initialBalance')}
        </label>
        <Input
          id="balance"
          type="number"
          step="0.01"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          placeholder={t('accounts.initialBalance')}
          required
        />
      </div>
      <Button type="submit">{t('common.add')}</Button>
    </form>
  );
};

export default AddAccountForm;
