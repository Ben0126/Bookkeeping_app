import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface FieldValidation {
  [key: string]: ValidationRule;
}

export interface FormErrors {
  [key: string]: string;
}

export interface UseFormValidationReturn {
  errors: FormErrors;
  validateField: (field: string, value: any) => string | null;
  validateForm: (data: any) => boolean;
  clearErrors: () => void;
  setFieldError: (field: string, error: string) => void;
  hasErrors: boolean;
}

export const useFormValidation = (
  validationRules: FieldValidation
): UseFormValidationReturn => {
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback((field: string, value: any): string | null => {
    const rule = validationRules[field];
    if (!rule) return null;

    // Required validation
    if (rule.required && (!value || value.toString().trim() === '')) {
      return rule.message || `${field} is required`;
    }

    // Skip other validations if value is empty and not required
    if (!value || value.toString().trim() === '') {
      return null;
    }

    // Min length validation
    if (rule.minLength && value.toString().length < rule.minLength) {
      return rule.message || `${field} must be at least ${rule.minLength} characters`;
    }

    // Max length validation
    if (rule.maxLength && value.toString().length > rule.maxLength) {
      return rule.message || `${field} must be no more than ${rule.maxLength} characters`;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value.toString())) {
      return rule.message || `${field} format is invalid`;
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }, [validationRules]);

  const validateForm = useCallback((data: any): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(field => {
      const error = validateField(field, data[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validateField, validationRules]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setFieldError = useCallback((field: string, error: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, []);

  const hasErrors = Object.keys(errors).length > 0;

  return {
    errors,
    validateField,
    validateForm,
    clearErrors,
    setFieldError,
    hasErrors
  };
};

// 預定義的驗證規則
export const ValidationRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || 'This field is required'
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    minLength: length,
    message: message || `Must be at least ${length} characters`
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    maxLength: length,
    message: message || `Must be no more than ${length} characters`
  }),

  email: (message?: string): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: message || 'Please enter a valid email address'
  }),

  phone: (message?: string): ValidationRule => ({
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    message: message || 'Please enter a valid phone number'
  }),

  positiveNumber: (message?: string): ValidationRule => ({
    custom: (value: any) => {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        return message || 'Please enter a positive number';
      }
      return null;
    }
  }),

  currency: (message?: string): ValidationRule => ({
    custom: (value: any) => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        return message || 'Please enter a valid amount';
      }
      if (num > 999999999) {
        return message || 'Amount is too large';
      }
      return null;
    }
  }),

  date: (message?: string): ValidationRule => ({
    custom: (value: any) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return message || 'Please enter a valid date';
      }
      if (date > new Date()) {
        return message || 'Date cannot be in the future';
      }
      return null;
    }
  }),

  accountName: (message?: string): ValidationRule => ({
    required: true,
    minLength: 1,
    maxLength: 50,
    message: message || 'Account name must be between 1 and 50 characters'
  }),

  transactionAmount: (message?: string): ValidationRule => ({
    required: true,
    custom: (value: any) => {
      const num = parseFloat(value);
      if (isNaN(num)) {
        return message || 'Please enter a valid amount';
      }
      if (num <= 0) {
        return message || 'Amount must be greater than 0';
      }
      if (num > 999999999) {
        return message || 'Amount is too large';
      }
      return null;
    }
  }),

  exchangeRate: (message?: string): ValidationRule => ({
    custom: (value: any) => {
      if (!value) return null; // Optional field
      const num = parseFloat(value);
      if (isNaN(num)) {
        return message || 'Please enter a valid exchange rate';
      }
      if (num <= 0) {
        return message || 'Exchange rate must be greater than 0';
      }
      if (num > 1000) {
        return message || 'Exchange rate seems too high';
      }
      return null;
    }
  })
};
