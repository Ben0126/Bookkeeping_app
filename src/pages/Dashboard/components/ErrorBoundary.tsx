import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

/**
 * 錯誤邊界組件
 * 捕獲子組件中的JavaScript錯誤，並顯示降級UI
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // 調用錯誤處理回調
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 記錄錯誤到控制台
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 可以在這裡添加錯誤報告服務
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetOnPropsChange && resetKeys) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // 這裡可以集成錯誤報告服務，如 Sentry、LogRocket 等
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId
    };

    // 示例：發送到錯誤報告服務
    // ErrorReportingService.report(errorReport);
    
    console.log('Error report:', errorReport);
  };

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 如果有自定義的fallback組件，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 否則使用默認的錯誤UI
      return <DefaultErrorFallback 
        error={this.state.error} 
        errorInfo={this.state.errorInfo}
        errorId={this.state.errorId}
        onRetry={this.handleRetry}
        onReload={this.handleReload}
      />;
    }

    return this.props.children;
  }
}

/**
 * 默認錯誤降級組件
 */
interface DefaultErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  onRetry: () => void;
  onReload: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  onRetry,
  onReload
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('common.error')}
        </h1>
        <p className="text-gray-600 mb-4">
          {t('dashboard.errorBoundary.message')}
        </p>
        
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-left mb-4 p-4 bg-gray-100 rounded">
            <summary className="cursor-pointer font-semibold mb-2">
              {t('dashboard.errorBoundary.errorDetails')}
            </summary>
            <div className="text-sm text-gray-700">
              <p className="mb-2">
                <strong>{t('dashboard.errorBoundary.error')}:</strong> {error.message}
              </p>
              {error.stack && (
                <pre className="whitespace-pre-wrap text-xs bg-gray-200 p-2 rounded">
                  {error.stack}
                </pre>
              )}
              {errorInfo && errorInfo.componentStack && (
                <div className="mt-2">
                  <strong>{t('dashboard.errorBoundary.componentStack')}:</strong>
                  <pre className="whitespace-pre-wrap text-xs bg-gray-200 p-2 rounded mt-1">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('dashboard.errorBoundary.retry')}
          </button>
          <button
            onClick={onReload}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {t('dashboard.errorBoundary.reload')}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-4">
          {t('dashboard.errorBoundary.errorId')}: {errorId}
        </p>
      </div>
    </div>
  );
};

/**
 * 高階組件：為組件添加錯誤邊界
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * Hook：用於在函數組件中處理錯誤
 */
export const useErrorHandler = () => {
  const handleError = (error: Error, errorInfo?: string) => {
    console.error('Error caught by useErrorHandler:', error);
    
    // 可以在這裡添加錯誤報告邏輯
    const errorReport = {
      message: error.message,
      stack: error.stack,
      errorInfo,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    
    console.log('Error report:', errorReport);
  };

  return { handleError };
};

export default ErrorBoundary;
