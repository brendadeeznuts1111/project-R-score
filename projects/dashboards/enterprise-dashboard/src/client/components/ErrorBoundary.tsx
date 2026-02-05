/**
 * ErrorBoundary - Comprehensive error boundary component
 *
 * Provides graceful error handling with:
 * - Error catching and logging
 * - User-friendly error messages
 * - Retry functionality
 * - Error reporting options
 * - Fallback UI components
 */

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  showReport?: boolean;
  title?: string;
  description?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error (in production, this would send to error reporting service)
    this.reportError(error, errorInfo);
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, this would send to Sentry, LogRocket, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // For now, just log to console with a distinctive format
    console.error("🚨 Error Report:", errorReport);

    // Could also store in localStorage for debugging
    try {
      const reports = JSON.parse(localStorage.getItem('error-reports') || '[]');
      reports.push(errorReport);
      // Keep only last 10 reports
      if (reports.length > 10) {
        reports.shift();
      }
      localStorage.setItem('error-reports', JSON.stringify(reports));
    } catch {
      // Ignore localStorage errors
    }
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      console.warn(`Maximum retry attempts (${maxRetries}) reached`);
      return;
    }

    this.setState({ retryCount: retryCount + 1, hasError: false, error: undefined, errorInfo: undefined });

    // Add a small delay before retry
    const timeout = setTimeout(() => {
      // Force re-render by updating a key or similar mechanism
      this.forceUpdate();
    }, 1000);

    this.retryTimeouts.push(timeout);
  };

  private handleReportError = () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    // Create a detailed error report
    const report = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => {
      alert("Error report copied to clipboard. Please send this to the development team.");
    }).catch(() => {
      // Fallback: open in new window
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      window.open(url);
      URL.revokeObjectURL(url);
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const { error, retryCount } = this.state;
      const { showRetry = true, showReport = true, title = "Something went wrong", description } = this.props;

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🚨</div>
            <h2 className="text-xl font-bold text-red-800 mb-2">{title}</h2>
            <p className="text-red-600 mb-4">
              {description || "An unexpected error occurred. Please try again or contact support if the problem persists."}
            </p>

            {error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-red-700 hover:text-red-900">
                  Technical Details
                </summary>
                <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-32">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}

            <div className="flex gap-2 justify-center flex-wrap">
              {showRetry && retryCount < 3 && (
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  🔄 Try Again {retryCount > 0 && `(${retryCount}/3)`}
                </button>
              )}

              {showReport && (
                <button
                  onClick={this.handleReportError}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  📋 Report Error
                </button>
              )}

              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                🔄 Reload Page
              </button>
            </div>

            {retryCount >= 3 && (
              <p className="text-sm text-red-500 mt-2">
                Maximum retry attempts reached. Please refresh the page or contact support.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to use error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Loading skeleton components
export function LoadingSkeleton({ className = "", lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded mb-2 last:mb-0"></div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white p-6 rounded-lg shadow ${className}`}>
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        <div className="h-3 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 h-12 rounded-t mb-2"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4 p-4 border-b border-gray-100 last:border-b-0">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="flex-1 h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Error message component
export function ErrorMessage({
  title = "Error",
  message,
  onRetry,
  showRetry = true,
  className = ""
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
  className?: string;
}) {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <span className="text-red-600 text-xl mr-3">⚠️</span>
        <div className="flex-1">
          <h3 className="text-red-800 font-semibold mb-1">{title}</h3>
          <p className="text-red-600 text-sm">{message}</p>
          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Empty state component
export function EmptyState({
  icon = "📭",
  title = "No data found",
  description = "There doesn't seem to be anything here yet.",
  action,
  actionLabel,
  className = ""
}: {
  icon?: string;
  title?: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      {action && actionLabel && (
        <button
          onClick={action}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}