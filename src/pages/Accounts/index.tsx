import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Dialog } from '@headlessui/react';
import { getAllAccounts } from '../../db/accounts';
import AddAccountForm from './AddAccountForm';
import { useTranslation } from 'react-i18next';

const AccountsPage = () => {
  const { t } = useTranslation();
  const accounts = useLiveQuery(getAllAccounts);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('accounts.title')}</h1>
          <p className="text-gray-600 text-sm">{t('accounts.manageAccounts')}</p>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {t('accounts.addAccount')}
        </button>
      </div>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md mx-auto bg-white rounded-lg">
            <AddAccountForm onSuccess={() => setIsOpen(false)} />
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Account Cards */}
      <div className="space-y-3">
        {accounts?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>{t('accounts.noAccountsYet')}</p>
            <p className="text-sm">{t('accounts.clickToStart')}</p>
          </div>
        ) : (
          accounts?.map((account) => (
            <div key={account.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                  <p className="text-sm text-gray-600">{account.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    {new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: account.currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    }).format(account.balance)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {account.currency}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AccountsPage;
