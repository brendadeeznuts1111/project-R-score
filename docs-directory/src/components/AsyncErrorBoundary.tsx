import React, { Component, ReactNode, ErrorInfo } from 'react';
import { errorLogger, ErrorCategory, ErrorSeverity } from '../utils/errorLogger';

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
}

interface AsyncErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
  isRetrying: boolean;
}

export class AsyncErrorBoundary extends Component<AsyncErrorBoundaryProps, AsyncErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: AsyncErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AsyncErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    errorLogger.log(
      'AsyncErrorBoundary caught an error',
      error,
      ErrorSeverity.HIGH,
      ErrorCategory.UI,
      {
        component: 'AsyncErrorBoundary',
        action: 'error_boundary_catch',
        errorBoundary: true,
        stack: errorInfo.componentStack
      }
    );

    this.props.onError?.(error, errorInfo);
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  handleRetry = async () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      errorLogger.log(
        'Maximum retry attempts reached',
        undefined,
        ErrorSeverity.MEDIUM,
        ErrorCategory.UI,
        { component: 'AsyncErrorBoundary', action: 'max_retries_reached', retryCount }
      );
      return;
    }

    this.setState({ isRetrying: true });

    // Exponential backoff for retries
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    
    const timeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1,
        isRetrying: false
      }));

      errorLogger.log(
        'Retrying after error',
        undefined,
        ErrorSeverity.LOW,
        ErrorCategory.UI,
        { component: 'AsyncErrorBoundary', action: 'retry_attempt', retryCount: retryCount + 1, delay }
      );
    }, delay);

    this.retryTimeouts.push(timeout);
  };

  render() {
    const { hasError, error, retryCount, isRetrying } = this.state;
    const { children, fallback, enableRetry = true, maxRetries = 3 } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const canRetry = enableRetry && retryCount < maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              An unexpected error occurred while loading this component.
            </p>
            
            {canRetry && (
              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  disabled={isRetrying}
                  className="w-full px-4 py-2 bg-cloudflare-orange text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRetrying ? 'Retrying...' : `Retry (${retryCount}/${maxRetries} attempts used)`}
                </button>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors mt-3"
            >
              Refresh Page
            </button>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
                  {error.stack || 'No stack trace available'}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

// Hook for async operations with error handling
export interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
  enableRetry?: boolean;
}

export interface UseAsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: () => Promise<void>;
  reset: () => void;
  retry: () => Promise<void>;
}

export function useAsync<T>(
  asyncOperation: () => Promise<T>,
  dependencies: React.DependencyList = [],
  options: UseAsyncOptions<T> = {}
): UseAsyncResult<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const {
    onSuccess,
    onError,
    retryCount: maxRetries = 3,
    retryDelay = 1000,
    enableRetry = true
  } = options;

  const execute = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncOperation();
      setData(result);
      setError(null);
      setRetryCount(0);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      errorLogger.log(
        'Async operation failed',
        error,
        ErrorSeverity.MEDIUM,
        ErrorCategory.SYSTEM,
        {
          component: 'useAsync',
          action: 'async_operation',
          retryCount,
          enableRetry
        }
      );

      setError(error);
      onError?.(error);

      // Auto-retry if enabled and within limits
      if (enableRetry && retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          execute();
        }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
      }
    } finally {
      setLoading(false);
    }
  }, [asyncOperation, retryCount, maxRetries, retryDelay, enableRetry, onSuccess, onError]);

  const reset = React.useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    setRetryCount(0);
  }, []);

  const retry = React.useCallback(async () => {
    setRetryCount(0);
    await execute();
  }, [execute]);

  // Execute on mount and when dependencies change
  React.useEffect(() => {
    execute();
  }, dependencies);

  return { data, loading, error, execute, reset, retry };
}

// Hook for async operations with manual trigger
export function useAsyncManual<T>(
  asyncOperation: () => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncResult<T> & { trigger: () => Promise<void> } {
  const { execute, ...rest } = useAsync(asyncOperation, [], options);
  
  const trigger = React.useCallback(async () => {
    await execute();
  }, [execute]);

  return { ...rest, execute, trigger };
}

// Component for handling async operations with loading/error states
interface AsyncComponentProps<T> {
  asyncOperation: () => Promise<T>;
  children: (data: T) => ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: (error: Error, retry: () => Promise<void>) => ReactNode;
  dependencies?: React.DependencyList;
  options?: UseAsyncOptions<T>;
}

export function AsyncComponent<T>({
  asyncOperation,
  children,
  loadingComponent,
  errorComponent,
  dependencies = [],
  options = {}
}: AsyncComponentProps<T>) {
  const { data, loading, error, retry } = useAsync(asyncOperation, dependencies, options);

  if (loading) {
    return <>{loadingComponent || <div className="animate-pulse">Loading...</div>}</>;
  }

  if (error) {
    if (errorComponent) {
      return <>{errorComponent(error, retry)}</>;
    }

    return (
      <div className="p-4 text-center">
        <div className="text-red-500 mb-2">⚠️</div>
        <p className="text-gray-600 dark:text-gray-400 mb-3">
          Failed to load content. Please try again.
        </p>
        <button
          onClick={retry}
          className="px-4 py-2 bg-cloudflare-orange text-white rounded-md hover:bg-orange-600 transition-colors"
        >
          Retry
        </button>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">
              Error Details
            </summary>
            <pre className="mt-2 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
              {error.stack || 'No stack trace available'}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (data) {
    return <>{children(data)}</>;
  }

  return null;
}

// Higher-order component for async error boundaries
export function withAsyncErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<AsyncErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AsyncErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AsyncErrorBoundary>
  );

  WrappedComponent.displayName = `withAsyncErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}
