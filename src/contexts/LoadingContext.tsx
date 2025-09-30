import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface LoadingState {
  isLoading: boolean;
  loadingMessage: string;
  progress?: number;
}

interface LoadingContextType {
  loadingState: LoadingState;
  setLoading: (isLoading: boolean, message?: string, progress?: number) => void;
  showLoading: (message?: string, progress?: number) => void;
  hideLoading: () => void;
  updateProgress: (progress: number) => void;
  updateMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    loadingMessage: 'Loading...',
    progress: undefined
  });

  const setLoading = (isLoading: boolean, message: string = 'Loading...', progress?: number) => {
    setLoadingState({
      isLoading,
      loadingMessage: message,
      progress
    });
  };

  const showLoading = (message: string = 'Loading...', progress?: number) => {
    setLoading(true, message, progress);
  };

  const hideLoading = () => {
    setLoading(false);
  };

  const updateProgress = (progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress))
    }));
  };

  const updateMessage = (message: string) => {
    setLoadingState(prev => ({
      ...prev,
      loadingMessage: message
    }));
  };

  const value: LoadingContextType = {
    loadingState,
    setLoading,
    showLoading,
    hideLoading,
    updateProgress,
    updateMessage
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
