import React from 'react';
import type { StudentCategory, StudentCategoryType } from '../types';
import { StudentCategoryService } from '../services/studentCategoryService';
import { useTranslation } from 'react-i18next';

interface StudentCategorySelectorProps {
  value: StudentCategory;
  onChange: (category: StudentCategory) => void;
  className?: string;
  showLabel?: boolean;
  label?: string;
  groupByType?: boolean;
  essentialOnly?: boolean;
  type?: StudentCategoryType;
  showIcons?: boolean;
}

const StudentCategorySelector: React.FC<StudentCategorySelectorProps> = ({
  value,
  onChange,
  className = '',
  showLabel = true,
  label,
  groupByType = false,
  essentialOnly = false,
  type,
  showIcons = true
}) => {
  const { t } = useTranslation();

  // 獲取分類選項
  const getCategoryOptions = (): StudentCategory[] => {
    let options: StudentCategory[] = [];

    if (essentialOnly) {
      options = StudentCategoryService.getEssentialCategories();
    } else if (type) {
      options = StudentCategoryService.getCategoriesByType(type);
    } else {
      options = StudentCategoryService.getAllStudentCategories();
    }

    return options;
  };

  // 獲取分類翻譯
  const getCategoryTranslation = (category: StudentCategory): string => {
    return StudentCategoryService.getCategoryName(category, t);
  };

  // 按類型分組分類
  const getGroupedCategoriesByType = () => {
    const options = getCategoryOptions();
    const grouped: Record<StudentCategoryType, StudentCategory[]> = {
      tuition: [],
      living: [],
      books: [],
      transport: [],
      health: [],
      visa: [],
      other: []
    };

    options.forEach(category => {
      const categoryInfo = StudentCategoryService.getStudentCategoryInfo(category);
      grouped[categoryInfo.type].push(category);
    });

    // 移除空的分組
    Object.keys(grouped).forEach(key => {
      if (grouped[key as StudentCategoryType].length === 0) {
        delete grouped[key as StudentCategoryType];
      }
    });

    return grouped;
  };

  const categories = getCategoryOptions();
  const groupedByType = getGroupedCategoriesByType();

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700">
          {label || t('transactions.category')}
        </label>
      )}
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as StudentCategory)}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
      >
        {groupByType ? (
          Object.entries(groupedByType).map(([typeName, typeCategories]) => (
            <optgroup key={typeName} label={t(`studentCategoryTypes.${typeName}`)}>
              {typeCategories.map((category: StudentCategory) => (
                <option key={category} value={category}>
                  {showIcons && `${StudentCategoryService.getCategoryIcon(category)} `}
                  {getCategoryTranslation(category)}
                </option>
              ))}
            </optgroup>
          ))
        ) : (
          categories.map((category: StudentCategory) => (
            <option key={category} value={category}>
              {showIcons && `${StudentCategoryService.getCategoryIcon(category)} `}
              {getCategoryTranslation(category)}
            </option>
          ))
        )}
      </select>
    </div>
  );
};

export default StudentCategorySelector;
