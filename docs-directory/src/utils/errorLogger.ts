export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  STORAGE = 'storage',
  VALIDATION = 'validation',
  DATABASE = 'database',
  UI = 'ui',
  SYSTEM = 'system',
  USER_INPUT = 'user_input'
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: number;
  additionalData?: Record<string, any>;
}

export interface ErrorLog {
  message: string;
  error?: Error;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  recoverable: boolean;
  recoverAttempts?: number;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private errorLogs: ErrorLog[] = [];
  private maxLogs = 1000;
  private recoveryCallbacks = new Map<string, () => Promise<boolean>>();

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(
    message: string,
    error?: Error,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    context: ErrorContext = {},
    recoverable: boolean = false
  ): void {
    const errorLog: ErrorLog = {
      message,
      error,
      severity,
      category,
      context: {
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        ...context
      },
      recoverable,
      recoverAttempts: 0
    };

    this.errorLogs.push(errorLog);
    
    // Keep only the most recent logs
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(-this.maxLogs);
    }

    // Console output with appropriate level
    this.outputToConsole(errorLog);
    
    // Store in localStorage for debugging
    this.persistError(errorLog);
  }

  private outputToConsole(errorLog: ErrorLog): void {
    const { message, error, severity, category, context } = errorLog;
    const contextStr = JSON.stringify(context, null, 2);
    
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        console.error(`🚨 CRITICAL [${category.toUpperCase()}] ${message}`, error, contextStr);
        break;
      case ErrorSeverity.HIGH:
        console.error(`❌ HIGH [${category.toUpperCase()}] ${message}`, error, contextStr);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(`⚠️ MEDIUM [${category.toUpperCase()}] ${message}`, error, contextStr);
        break;
      case ErrorSeverity.LOW:
        console.info(`ℹ️ LOW [${category.toUpperCase()}] ${message}`, error, contextStr);
        break;
    }
  }

  private persistError(errorLog: ErrorLog): void {
    try {
      const existingLogs = this.getStoredLogs();
      existingLogs.push(errorLog);
      
      // Keep only last 100 errors in localStorage
      const recentLogs = existingLogs.slice(-100);
      localStorage.setItem('error_logs', JSON.stringify(recentLogs));
    } catch (storageError) {
      console.warn('Failed to persist error log to localStorage:', storageError);
    }
  }

  private getStoredLogs(): ErrorLog[] {
    try {
      const stored = localStorage.getItem('error_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  // Error recovery mechanism
  registerRecoveryCallback(errorKey: string, callback: () => Promise<boolean>): void {
    this.recoveryCallbacks.set(errorKey, callback);
  }

  async attemptRecovery(errorLog: ErrorLog): Promise<boolean> {
    if (!errorLog.recoverable) {
      return false;
    }

    const errorKey = `${errorLog.category}_${errorLog.context.component}_${errorLog.context.action}`;
    const callback = this.recoveryCallbacks.get(errorKey);
    
    if (callback) {
      try {
        errorLog.recoverAttempts = (errorLog.recoverAttempts || 0) + 1;
        const recovered = await callback();
        
        if (recovered) {
          this.log(
            `Successfully recovered from error: ${errorLog.message}`,
            undefined,
            ErrorSeverity.LOW,
            ErrorCategory.SYSTEM,
            { ...errorLog.context, action: 'recovery_success' }
          );
        }
        
        return recovered;
      } catch (recoveryError) {
        this.log(
          `Recovery attempt failed for error: ${errorLog.message}`,
          recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)),
          ErrorSeverity.HIGH,
          ErrorCategory.SYSTEM,
          { ...errorLog.context, action: 'recovery_failed' }
        );
        return false;
      }
    }
    
    return false;
  }

  // Get error statistics
  getErrorStats(): Record<ErrorSeverity, number> {
    const stats = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    };

    this.errorLogs.forEach(log => {
      stats[log.severity]++;
    });

    return stats;
  }

  // Get recent errors
  getRecentErrors(limit: number = 50): ErrorLog[] {
    return this.errorLogs.slice(-limit);
  }

  // Clear error logs
  clearLogs(): void {
    this.errorLogs = [];
    try {
      localStorage.removeItem('error_logs');
    } catch {
      // Ignore localStorage errors
    }
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      logs: this.errorLogs,
      stats: this.getErrorStats()
    }, null, 2);
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();

// Convenience functions for common error types
export const logStorageError = (message: string, error?: Error, context?: ErrorContext): void => {
  errorLogger.log(message, error, ErrorSeverity.MEDIUM, ErrorCategory.STORAGE, context, true);
};

export const logNetworkError = (message: string, error?: Error, context?: ErrorContext): void => {
  errorLogger.log(message, error, ErrorSeverity.HIGH, ErrorCategory.NETWORK, context, true);
};

export const logValidationError = (message: string, error?: Error, context?: ErrorContext): void => {
  errorLogger.log(message, error, ErrorSeverity.LOW, ErrorCategory.VALIDATION, context, false);
};

export const logDatabaseError = (message: string, error?: Error, context?: ErrorContext): void => {
  errorLogger.log(message, error, ErrorSeverity.HIGH, ErrorCategory.DATABASE, context, true);
};

export const logUIError = (message: string, error?: Error, context?: ErrorContext): void => {
  errorLogger.log(message, error, ErrorSeverity.MEDIUM, ErrorCategory.UI, context, false);
};

export const logCriticalError = (message: string, error?: Error, context?: ErrorContext): void => {
  errorLogger.log(message, error, ErrorSeverity.CRITICAL, ErrorCategory.SYSTEM, context, true);
};
