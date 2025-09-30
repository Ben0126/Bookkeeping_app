import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudentCategoryService } from '../../services/studentCategoryService';
import StudentCategorySelector from '../../components/StudentCategorySelector';
import type { StudentCategory } from '../../types';

const StudentFeaturesPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<StudentCategory>('tuition_fees');

  const essentialCategories = StudentCategoryService.getEssentialCategories();
  const commonCategories = StudentCategoryService.getCommonCategories();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('studentFeatures.title')}
        </h1>
        <p className="text-gray-600">
          專為留學生設計的財務管理功能
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🎓</div>
            <div>
              <h3 className="font-semibold text-blue-900">學費追蹤</h3>
              <p className="text-sm text-blue-700">管理學期學費與相關費用</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🏠</div>
            <div>
              <h3 className="font-semibold text-green-900">生活費管理</h3>
              <p className="text-sm text-green-700">房租、水電、餐費等日常開支</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📋</div>
            <div>
              <h3 className="font-semibold text-purple-900">簽證費用</h3>
              <p className="text-sm text-purple-700">簽證申請與續簽費用追蹤</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Selector Demo */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">留學生分類選擇器</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">常用分類</h3>
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
              <h4 className="font-medium mb-2">必要支出</h4>
              <StudentCategorySelector
                value={selectedCategory}
                onChange={setSelectedCategory}
                showLabel={false}
                essentialOnly={true}
                showIcons={true}
              />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">學費相關</h4>
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
        <h2 className="text-xl font-semibold mb-4">分類詳細資訊</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">
                {StudentCategoryService.getCategoryIcon(selectedCategory)}
              </span>
              <div>
                <h3 className="font-medium">
                  {StudentCategoryService.getCategoryName(selectedCategory)}
                </h3>
                <p className="text-sm text-gray-600">
                  {StudentCategoryService.getCategoryDescription(selectedCategory)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                StudentCategoryService.isEssential(selectedCategory)
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {StudentCategoryService.isEssential(selectedCategory) ? '必要支出' : '非必要支出'}
              </div>
              {StudentCategoryService.getBudgetRecommendation(selectedCategory) && (
                <p className="text-sm text-gray-600 mt-1">
                  建議月預算: ${StudentCategoryService.getBudgetRecommendation(selectedCategory)}
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
          <p className="text-sm text-gray-600">追蹤各類別預算使用情況</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl mb-2">⏰</div>
          <h3 className="font-semibold mb-2">{t('studentFeatures.expenseReminder')}</h3>
          <p className="text-sm text-gray-600">重要費用到期提醒</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl mb-2">🌍</div>
          <h3 className="font-semibold mb-2">{t('studentFeatures.countryGuide')}</h3>
          <p className="text-sm text-gray-600">各國留學費用指南</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl mb-2">💱</div>
          <h3 className="font-semibold mb-2">{t('studentFeatures.currencyConverter')}</h3>
          <p className="text-sm text-gray-600">即時匯率換算</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl mb-2">📋</div>
          <h3 className="font-semibold mb-2">{t('studentFeatures.visaTracker')}</h3>
          <p className="text-sm text-gray-600">簽證費用與到期追蹤</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl mb-2">🎓</div>
          <h3 className="font-semibold mb-2">{t('studentFeatures.tuitionCalculator')}</h3>
          <p className="text-sm text-gray-600">學費計算與規劃</p>
        </div>
      </div>
    </div>
  );
};

export default StudentFeaturesPage;
