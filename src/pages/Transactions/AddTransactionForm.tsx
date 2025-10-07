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
import { AnimatedButton } from '../../components/AnimatedTransition';
import { ResponsiveCard } from '../../components/ResponsiveLayout';
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
    <ResponsiveCard className="relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-red-50 opacity-50"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-200/20 to-red-200/20 rounded-full -translate-y-16 translate-x-16"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4">
            <span className="text-white text-xl">➕</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('transactions.addTransaction')}</h2>
            <p className="text-gray-600 text-sm">記錄您的收入與支出</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <span className="mr-2">📊</span>
              {t('transactions.transactionType')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {Object.values(TransactionType).map((transactionType) => (
                <button
                  key={transactionType}
                  type="button"
                  onClick={() => setType(transactionType)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    type === transactionType
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg mb-1">
                      {transactionType === TransactionType.INCOME ? '💰' : 
                       transactionType === TransactionType.EXPENSE ? '💸' : '🔄'}
                    </div>
                    <div className="text-xs font-medium">
                      {getTransactionTypeTranslation(transactionType)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Account Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <span className="mr-2">🏦</span>
              {t('accounts.accountName')}
            </label>
            <select
              value={accountId || ''}
              onChange={(e) => setAccountId(Number(e.target.value) || undefined)}
              required
              className="block w-full p-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white hover:border-gray-300"
            >
              <option value="">{t('transactions.selectAccount')}</option>
              {accounts?.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Currency and Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <CurrencySelector
                value={transactionCurrency}
                onChange={setTransactionCurrency}
                showLabel={true}
                commonOnly={true}
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 flex items-center">
                <span className="mr-2">💵</span>
                {t('transactions.amount')} ({transactionCurrency})
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                placeholder="0.00"
                className="block w-full p-4 text-base text-right border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white hover:border-gray-300"
              />
            </div>
          </div>

          {/* Exchange Rate */}
          {needsExchangeRate && (
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl">
              <div className="flex items-center mb-3">
                <span className="text-yellow-600 mr-2">💱</span>
                <label className="text-sm font-semibold text-gray-700">
                  Exchange Rate (1 {transactionCurrency} = ? {selectedAccount.currency})
                </label>
              </div>
              <Input
                type="number"
                step="0.0001"
                placeholder="Enter exchange rate"
                value={exchangeRate || ''}
                onChange={(e) => setExchangeRate(Number(e.target.value) || undefined)}
                required
                className="bg-white"
              />
              {exchangeRate && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Converted amount:</span> {convertedAmount.toFixed(2)} {selectedAccount.currency}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Category Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <span className="mr-2">🏷️</span>
              Category
            </label>
            
            {/* Auto-suggestion alert */}
            {showSuggestion && autoSuggestion && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-800">🤖 Smart Category Suggestion</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {categories?.find(cat => cat.id === autoSuggestion.categoryId)?.name}
                      <span className="text-blue-600 font-medium"> ({autoSuggestion.confidence}% confidence)</span>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">{autoSuggestion.reason}</p>
                    <div className="flex space-x-2 mt-3">
                      <button
                        type="button"
                        onClick={acceptSuggestion}
                        className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        ✓ Accept
                      </button>
                      <button
                        type="button"
                        onClick={rejectSuggestion}
                        className="text-xs bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                      >
                        ✗ Dismiss
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
              className="block w-full p-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white hover:border-gray-300"
            >
              <option value="">Select a category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          {/* Date */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <span className="mr-2">📅</span>
              Date
            </label>
            <input
              type="date"
              value={date.toISOString().split('T')[0]}
              onChange={(e) => setDate(new Date(e.target.value))}
              required
              className="block w-full p-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white hover:border-gray-300"
            />
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <span className="mr-2">📝</span>
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add transaction notes..."
              className="block w-full p-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white hover:border-gray-300 resize-none"
              rows={3}
            />
          </div>

          {/* Student Expense Section */}
          <div className="border-t-2 border-gray-100 pt-6">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="isStudentExpense"
                checked={isStudentExpense}
                onChange={(e) => setIsStudentExpense(e.target.checked)}
                className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="isStudentExpense" className="ml-3 block text-sm font-semibold text-gray-700 flex items-center">
                <span className="mr-2">🎓</span>
                這是留學生相關費用
              </label>
            </div>
            
            {isStudentExpense && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                <StudentCategorySelector
                  value={studentCategory || 'tuition_fees'}
                  onChange={setStudentCategory}
                  showLabel={true}
                  groupByType={true}
                  showIcons={true}
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <AnimatedButton 
              type="submit" 
              className="w-full py-4 px-6 text-lg font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <span className="flex items-center justify-center">
                <span className="mr-2">✨</span>
                Add Transaction
              </span>
            </AnimatedButton>
          </div>
        </form>
      </div>
    </ResponsiveCard>
  );
};

export default AddTransactionForm;
