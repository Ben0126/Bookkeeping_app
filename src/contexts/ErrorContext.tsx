import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface AppError {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  timestamp: Date;
  details?: string;
  action?: {
    label: string;
    handler: () => void;
  };
  dismissible?: boolean;
}

interface ErrorContextType {
  errors: AppError[];
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  showError: (message: string, details?: string, action?: AppError['action']) => void;
  showWarning: (message: string, details?: string, action?: AppError['action']) => void;
  showInfo: (message: string, details?: string, action?: AppError['action']) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<AppError[]>([]);

  const addError = (error: Omit<AppError, 'id' | 'timestamp'>) => {
    const newError: AppError = {
      ...error,
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setErrors(prev => [...prev, newError]);

    // 自動清除 info 類型的錯誤
    if (error.type === 'info') {
      setTimeout(() => {
        removeError(newError.id);
      }, 5000);
    }
  };

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const showError = (message: string, details?: string, action?: AppError['action']) => {
    addError({
      message,
      type: 'error',
      details,
      action,
      dismissible: true
    });
  };

  const showWarning = (message: string, details?: string, action?: AppError['action']) => {
    addError({
      message,
      type: 'warning',
      details,
      action,
      dismissible: true
    });
  };

  const showInfo = (message: string, details?: string, action?: AppError['action']) => {
    addError({
      message,
      type: 'info',
      details,
      action,
      dismissible: true
    });
  };

  const value: ErrorContextType = {
    errors,
    addError,
    removeError,
    clearErrors,
    showError,
    showWarning,
    showInfo
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};
