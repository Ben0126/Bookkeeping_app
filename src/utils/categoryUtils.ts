import type { TFunction } from 'i18next';

/**
 * Get the display name for a category, using translation if available.
 * 
 * @param categoryName The original category name (usually in English)
 * @param t The translation function from useTranslation
 * @returns The translated name or the original name if no translation is found
 */
export const getCategoryDisplayName = (categoryName: string, t: TFunction): string => {
    if (!categoryName) return '';

    // Check if the category name exists in the translation keys
    // We assume the category name matches the key in locales (case-insensitive or exact match depending on implementation)
    // Here we try to match exact keys first, then try to normalize

    // Common default categories mapping
    // This mapping should match the keys in en-US.json/zh-TW.json under "categories"
    const key = categoryName.replace(/\s+/g, ''); // Remove spaces for key matching, e.g. "Other Income" -> "OtherIncome"

    const translationKey = `categories.${key}`;
    const translated = t(translationKey);

    // If the translation returns the key itself (or something that indicates missing translation), return original
    // i18next usually returns the key if missing, but we can check if the result is different from the key
    if (translated !== translationKey && translated) {
        return translated;
    }

    return categoryName;
};
