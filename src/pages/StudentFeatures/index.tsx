import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudentCategoryService } from '../../services/studentCategoryService';
import StudentCategorySelector from '../../components/StudentCategorySelector';
import type { StudentCategory } from '../../types';

const StudentFeaturesPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<StudentCategory>('tuition_fees');

  // const essentialCategories = StudentCategoryService.getEssentialCategories();
  // const commonCategories = StudentCategoryService.getCommonCategories();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('studentFeatures.title')}
        </h1>
        <p className="text-gray-600">
          {t('studentFeatures.subtitle')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🎓</div>
            <div>
              <h3 className="font-semibold text-blue-900">{t('studentFeatures.tuitionTracking')}</h3>
              <p className="text-sm text-blue-700">{t('studentFeatures.tuitionTrackingDesc')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🏠</div>
            <div>
              <h3 className="font-semibold text-green-900">{t('studentFeatures.livingExpenses')}</h3>
              <p className="text-sm text-green-700">{t('studentFeatures.livingExpensesDesc')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📋</div>
            <div>
              <h3 className="font-semibold text-purple-900">{t('studentFeatures.visaFees')}</h3>
              <p className="text-sm text-purple-700">{t('studentFeatures.visaFeesDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Selector Demo */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">{t('studentFeatures.categorySelectorDemo')}</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">{t('studentFeatures.commonCategories')}</h3>
            <StudentCategorySelector
              value={selectedCategory}
              onChange={setSelectedCategory}
              showLabel={true}
              groupByType={true}
              showIcons={true}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">{t('studentFeatures.essentialExpenses')}</h4>
              <StudentCategorySelector
                value={selectedCategory}
                onChange={setSelectedCategory}
                showLabel={false}
                essentialOnly={true}
                showIcons={true}
              />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">{t('studentFeatures.tuitionRelated')}</h4>
              <StudentCategorySelector
                value={selectedCategory}
                onChange={setSelectedCategory}
                showLabel={false}
                type="tuition"
                showIcons={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">{t('studentFeatures.categoryDetails')}</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">
                {StudentCategoryService.getCategoryIcon(selectedCategory)}
              </span>
              <div>
                <h3 className="font-medium">
                  {StudentCategoryService.getCategoryName(selectedCategory, t)}
                </h3>
                <p className="text-sm text-gray-600">
                  {StudentCategoryService.getCategoryDescription(selectedCategory, t)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                StudentCategoryService.isEssential(selectedCategory)
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {StudentCategoryService.isEssential(selectedCategory) ? t('studentFeatures.essentialExpense') : t('studentFeatures.nonEssentialExpense')}
              </div>
              {StudentCategoryService.getBudgetRecommendation(selectedCategory) && (
                <p className="text-sm text-gray-600 mt-1">
                  {t('studentFeatures.recommendedBudget')}: ${StudentCategoryService.getBudgetRecommendation(selectedCategory)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl mb-2">💰</div>
          <h3 className="font-semibold mb-2">{t('studentFeatures.budgetTracker')}</h3>
          <p className="text-sm text-gray-600">{t('studentFeatures.budgetTrackerDesc')}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl mb-2">⏰</div>
          <h3 className="font-semibold mb-2">{t('studentFeatures.expenseReminder')}</h3>
          <p className="text-sm text-gray-600">{t('studentFeatures.expenseReminderDesc')}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl mb-2">🌍</div>
          <h3 className="font-semibold mb-2">{t('studentFeatures.countryGuide')}</h3>
          <p className="text-sm text-gray-600">{t('studentFeatures.countryGuideDesc')}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl mb-2">💱</div>
          <h3 className="font-semibold mb-2">{t('studentFeatures.currencyConverter')}</h3>
          <p className="text-sm text-gray-600">{t('studentFeatures.currencyConverterDesc')}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl mb-2">📋</div>
          <h3 className="font-semibold mb-2">{t('studentFeatures.visaTracker')}</h3>
          <p className="text-sm text-gray-600">{t('studentFeatures.visaTrackerDesc')}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl mb-2">🎓</div>
          <h3 className="font-semibold mb-2">{t('studentFeatures.tuitionCalculator')}</h3>
          <p className="text-sm text-gray-600">{t('studentFeatures.tuitionCalculatorDesc')}</p>
        </div>
      </div>
    </div>
  );
};

export default StudentFeaturesPage;
