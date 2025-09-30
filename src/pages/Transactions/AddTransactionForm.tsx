import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  TransactionType,
} from '../../types';
import type { Transaction, Currency, StudentCategory } from '../../types';
import { getAllAccounts } from '../../db/accounts';
import { addTransaction } from '../../db/transactions';
import { getCategoriesByType, initializeDefaultCategories, cleanupDuplicateCategories } from '../../db/categories';
import { AutoCategorizationService } from '../../services/autoCategorizationService';
import Input from '../../components/Input';
import CurrencySelector from '../../components/CurrencySelector';
import StudentCategorySelector from '../../components/StudentCategorySelector';
import { useFormValidation, ValidationRules } from '../../hooks/useFormValidation';
import { useLoading } from '../../contexts/LoadingContext';
import { useError } from '../../contexts/ErrorContext';
import { useUserFeedback } from '../../components/UserFeedback';
import { AnimatedButton, AnimatedCard } from '../../components/AnimatedTransition';
import { useTranslation } from 'react-i18next';

interface AddTransactionFormProps {
  onSuccess: () => void;
}

const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const accounts = useLiveQuery(getAllAccounts);
  const categories = useLiveQuery(() => getCategoriesByType(type));
  
  // UX Hooks
  const { showLoading, hideLoading } = useLoading();
  const { showError } = useError();
  const { showSuccess } = useUserFeedback();
  
  // Form validation
  const { validateForm, clearErrors } = useFormValidation({
    amount: ValidationRules.transactionAmount(t('transactions.enterValidAmount')),
    accountId: ValidationRules.required(t('transactions.selectAccount')),
    categoryId: ValidationRules.required(t('transactions.selectCategory')),
    exchangeRate: ValidationRules.exchangeRate(t('transactions.enterValidExchangeRate'))
  });
  
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [accountId, setAccountId] = useState<number | undefined>(undefined);
  const [amount, setAmount] = useState(0);
  const [transactionCurrency, setTransactionCurrency] = useState<Currency>('USD');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  
  // 留學生分類相關狀態
  const [studentCategory, setStudentCategory] = useState<StudentCategory | undefined>(undefined);
  const [isStudentExpense, setIsStudentExpense] = useState(false);
  
  // 自動分類相關狀態
  const [autoSuggestion, setAutoSuggestion] = useState<{
    categoryId: number;
    confidence: number;
    reason: string;
  } | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);

  const selectedAccount = accounts?.find(acc => acc.id === accountId);
  const needsExchangeRate = selectedAccount && selectedAccount.currency !== transactionCurrency;
  const convertedAmount = needsExchangeRate && exchangeRate ? amount * exchangeRate : amount;

  // 自動分類建議
  const handleAutoSuggestion = async () => {
    if (!notes.trim() || !categories || categories.length === 0) {
      setAutoSuggestion(null);
      setShowSuggestion(false);
      return;
    }

    try {
      const suggestion = await AutoCategorizationService.autoCategorizeTran(
        notes, 
        amount, 
        type, 
        categories
      );
      
      if (suggestion) {
        setAutoSuggestion(suggestion);
        setShowSuggestion(true);
      } else {
        setAutoSuggestion(null);
        setShowSuggestion(false);
      }
    } catch (error) {
      console.error('Auto categorization error:', error);
    }
  };

  // 接受自動建議
  const acceptSuggestion = () => {
    if (autoSuggestion) {
      setCategoryId(autoSuggestion.categoryId);
      setShowSuggestion(false);
    }
  };

  // 拒絕自動建議
  const rejectSuggestion = () => {
    setAutoSuggestion(null);
    setShowSuggestion(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    clearErrors();
    
    // Validate form data
    const formData = {
      amount,
      accountId,
      categoryId,
      exchangeRate: needsExchangeRate ? exchangeRate : undefined
    };
    
    if (!validateForm(formData)) {
      showError('Please fix the errors below before submitting');
      return;
    }
    
    if (!accountId || !selectedAccount || !categoryId) {
      showError('Please fill in all required fields');
      return;
    }
    
    if (needsExchangeRate && (!exchangeRate || exchangeRate <= 0)) {
      showError('Please enter a valid exchange rate');
      return;
    }
    
    try {
      showLoading('Adding transaction...', 0);
      
      const newTransaction: Omit<Transaction, 'id'> = {
        type,
        accountId,
        amount,
        currency: transactionCurrency,
        categoryId,
        date,
        notes: notes || undefined,
        ...(needsExchangeRate && exchangeRate ? { exchangeRate } : {}),
        ...(isStudentExpense && studentCategory ? { 
          studentCategory, 
          isStudentExpense: true 
        } : {}),
      };

      await addTransaction(newTransaction);

      // 學習用戶的分類選擇
      if (notes.trim()) {
        await AutoCategorizationService.learnFromUserChoice(
          notes,
          categoryId,
          autoSuggestion?.categoryId
        );
      }

      // Reset form
      setAmount(0);
      setExchangeRate(undefined);
      setNotes('');
      setCategoryId(undefined);
      setAutoSuggestion(null);
      setShowSuggestion(false);

      hideLoading();
      showSuccess('Transaction added successfully!');
      onSuccess();
    } catch (error) {
      console.error('Failed to add transaction:', error);
      hideLoading();
      showError('Failed to add transaction. Please try again.');
    }
  };

  // Initialize default categories and clean up duplicates
  React.useEffect(() => {
    const initCategories = async () => {
      await cleanupDuplicateCategories();
      await initializeDefaultCategories();
    };
    initCategories();
  }, []);

  // 交易類型翻譯映射
  const getTransactionTypeTranslation = (transactionType: TransactionType): string => {
    const typeMap: Record<TransactionType, string> = {
      [TransactionType.INCOME]: t('transactions.income'),
      [TransactionType.EXPENSE]: t('transactions.expense'),
      [TransactionType.TRANSFER]: t('transactions.transfer'),
    };
    return typeMap[transactionType] || transactionType;
  };
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (notes.trim().length >= 3) { // 至少3個字符才觸發
        handleAutoSuggestion();
      } else {
        setAutoSuggestion(null);
        setShowSuggestion(false);
      }
    }, 500); // 延遲500ms避免頻繁觸發

    return () => clearTimeout(debounceTimer);
  }, [notes, amount, type]);

  return (
    <AnimatedCard className="space-y-4 p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{t('transactions.addTransaction')}</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('transactions.transactionType')}</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TransactionType)}
          className="block w-full p-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {Object.values(TransactionType).map((transactionType) => (
            <option key={transactionType} value={transactionType}>
              {getTransactionTypeTranslation(transactionType)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('accounts.accountName')}</label>
        <select
          value={accountId || ''}
          onChange={(e) => setAccountId(Number(e.target.value) || undefined)}
          required
          className="block w-full p-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('transactions.selectAccount')}</option>
          {accounts?.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({acc.currency})
            </option>
          ))}
        </select>
      </div>

      <div>
        <CurrencySelector
          value={transactionCurrency}
          onChange={setTransactionCurrency}
          showLabel={true}
          commonOnly={true}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('transactions.amount')} ({transactionCurrency})
        </label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          required
          placeholder={t('transactions.amount')}
          className="block w-full p-3 text-base text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {needsExchangeRate && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exchange Rate (1 {transactionCurrency} = ? {selectedAccount.currency})
          </label>
          <Input
            type="number"
            step="0.0001"
            placeholder="Enter exchange rate"
            value={exchangeRate || ''}
            onChange={(e) => setExchangeRate(Number(e.target.value) || undefined)}
            required
          />
          {exchangeRate && (
            <p className="text-sm text-gray-600 mt-2">
              Converted amount: {convertedAmount.toFixed(2)} {selectedAccount.currency}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        
        {/* Auto-suggestion alert */}
        {showSuggestion && autoSuggestion && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-800">Smart Category Suggestion</h4>
                <p className="text-sm text-blue-700 mt-1">
                  {categories?.find(cat => cat.id === autoSuggestion.categoryId)?.name}
                  <span className="text-blue-600"> ({autoSuggestion.confidence}% confidence)</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">{autoSuggestion.reason}</p>
                <div className="flex space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={acceptSuggestion}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={rejectSuggestion}
                    className="text-xs bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <select
          value={categoryId || ''}
          onChange={(e) => setCategoryId(Number(e.target.value) || undefined)}
          required
          className="block w-full p-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a category</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
        <input
          type="date"
          value={date.toISOString().split('T')[0]}
          onChange={(e) => setDate(new Date(e.target.value))}
          required
          className="block w-full p-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add transaction notes..."
          className="block w-full p-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
        />
      </div>

      {/* 留學生專用分類 */}
      <div className="border-t pt-4">
        <div className="flex items-center mb-3">
          <input
            type="checkbox"
            id="isStudentExpense"
            checked={isStudentExpense}
            onChange={(e) => setIsStudentExpense(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isStudentExpense" className="ml-2 block text-sm font-medium text-gray-700">
            這是留學生相關費用
          </label>
        </div>
        
        {isStudentExpense && (
          <StudentCategorySelector
            value={studentCategory || 'tuition_fees'}
            onChange={setStudentCategory}
            showLabel={true}
            groupByType={true}
            showIcons={true}
          />
        )}
      </div>

        <AnimatedButton 
          type="submit" 
          className="w-full py-3 px-4 text-base"
        >
          Add Transaction
        </AnimatedButton>
      </form>
    </AnimatedCard>
  );
};

export default AddTransactionForm;
