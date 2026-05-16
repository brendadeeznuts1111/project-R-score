import { errorLogger, ErrorCategory, ErrorContext, ErrorSeverity } from './errorLogger';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: Error) => boolean;
}

export interface RecoveryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

export class RecoveryManager {
  private static instance: RecoveryManager;
  private activeRecoveries = new Map<string, Promise<any>>();

  private constructor() {}

  static getInstance(): RecoveryManager {
    if (!RecoveryManager.instance) {
      RecoveryManager.instance = new RecoveryManager();
    }
    return RecoveryManager.instance;
  }

  // Generic retry mechanism with exponential backoff
  async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context: ErrorContext
  ): Promise<RecoveryResult<T>> {
    const recoveryKey = `${context.component}_${context.action}`;
    
    // Prevent multiple concurrent recoveries for the same operation
    if (this.activeRecoveries.has(recoveryKey)) {
      try {
        const result = await this.activeRecoveries.get(recoveryKey)!;
        return { success: true, data: result, attempts: 1 };
      } catch (error) {
        // If the existing recovery failed, proceed with new attempt
        this.activeRecoveries.delete(recoveryKey);
      }
    }

    const recoveryPromise = this.performRetry(operation, config, context);
    this.activeRecoveries.set(recoveryKey, recoveryPromise);

    try {
      const result = await recoveryPromise;
      this.activeRecoveries.delete(recoveryKey);
      return { success: true, data: result, attempts: 1 };
    } catch (error) {
      this.activeRecoveries.delete(recoveryKey);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error(String(error)),
        attempts: config.maxAttempts 
      };
    }
  }

  private async performRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context: ErrorContext
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          errorLogger.log(
            `Operation succeeded after ${attempt} attempts`,
            undefined,
            ErrorSeverity.LOW,
            ErrorCategory.SYSTEM,
            { ...context, attempts: attempt }
          );
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry this error
        if (config.retryCondition && !config.retryCondition(lastError)) {
          break;
        }

        // Don't retry on the last attempt
        if (attempt === config.maxAttempts) {
          break;
        }

        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        errorLogger.log(
          `Operation failed, retrying in ${delay}ms (attempt ${attempt}/${config.maxAttempts})`,
          lastError,
          ErrorSeverity.MEDIUM,
          ErrorCategory.SYSTEM,
          { ...context, attempt, delay, nextAttemptIn: delay }
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  // Circuit breaker pattern
  async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitBreakerKey: string,
    context: ErrorContext,
    timeout: number = 5000
  ): Promise<T> {
    const state = this.getCircuitBreakerState(circuitBreakerKey);
    
    if (state.isOpen) {
      if (Date.now() - state.lastFailureTime > 60000) { // 1 minute timeout
        state.isOpen = false;
        state.failureCount = 0;
        errorLogger.log(
          `Circuit breaker for ${circuitBreakerKey} reset to half-open`,
          undefined,
          ErrorSeverity.LOW,
          ErrorCategory.SYSTEM,
          context
        );
      } else {
        throw new Error(`Circuit breaker is open for ${circuitBreakerKey}`);
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        this.createTimeoutPromise(timeout)
      ]);

      // Reset on success
      state.failureCount = 0;
      state.isOpen = false;
      
      return result;
    } catch (error) {
      state.failureCount++;
      state.lastFailureTime = Date.now();

      if (state.failureCount >= 5) { // Open circuit after 5 failures
        state.isOpen = true;
        errorLogger.log(
          `Circuit breaker opened for ${circuitBreakerKey} after ${state.failureCount} failures`,
          error instanceof Error ? error : new Error(String(error)),
          ErrorSeverity.HIGH,
          ErrorCategory.SYSTEM,
          context
        );
      }

      throw error;
    }
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
    });
  }

  private circuitBreakerStates = new Map<string, {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: number;
  }>();

  private getCircuitBreakerState(key: string) {
    if (!this.circuitBreakerStates.has(key)) {
      this.circuitBreakerStates.set(key, {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: 0
      });
    }
    return this.circuitBreakerStates.get(key)!;
  }

  // Graceful degradation
  async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (primaryError) {
      errorLogger.log(
        'Primary operation failed, attempting fallback',
        primaryError instanceof Error ? primaryError : new Error(String(primaryError)),
        ErrorSeverity.MEDIUM,
        ErrorCategory.SYSTEM,
        context
      );

      try {
        const result = await fallbackOperation();
        errorLogger.log(
          'Fallback operation succeeded',
          undefined,
          ErrorSeverity.LOW,
          ErrorCategory.SYSTEM,
          { ...context, action: 'fallback_success' }
        );
        return result;
      } catch (fallbackError) {
        errorLogger.log(
          'Both primary and fallback operations failed',
          fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
          ErrorSeverity.HIGH,
          ErrorCategory.SYSTEM,
          { ...context, action: 'fallback_failed' }
        );
        throw fallbackError;
      }
    }
  }

  // Cache recovery
  async recoverFromCache<T>(
    key: string,
    fallbackData: T,
    maxAge: number = 300000 // 5 minutes
  ): Promise<T | null> {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age > maxAge) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return data;
    } catch (error) {
      errorLogger.log(
        `Failed to recover from cache for key: ${key}`,
        error instanceof Error ? error : new Error(String(error)),
        ErrorSeverity.LOW,
        ErrorCategory.STORAGE,
        { action: 'cache_recovery', key }
      );
      return null;
    }
  }

  // Store data in cache for recovery
  cacheForRecovery(key: string, data: any): void {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      errorLogger.log(
        `Failed to cache data for key: ${key}`,
        error instanceof Error ? error : new Error(String(error)),
        ErrorSeverity.LOW,
        ErrorCategory.STORAGE,
        { action: 'cache_storage', key }
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get recovery statistics
  getRecoveryStats(): Record<string, any> {
    return {
      activeRecoveries: this.activeRecoveries.size,
      circuitBreakers: Array.from(this.circuitBreakerStates.entries()).map(([key, state]) => ({
        key,
        isOpen: state.isOpen,
        failureCount: state.failureCount,
        lastFailureTime: state.lastFailureTime
      }))
    };
  }
}

// Export singleton instance
export const recoveryManager = RecoveryManager.getInstance();

// Default retry configurations
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error: Error) => {
    // Retry on network errors and timeouts
    return error.message.includes('network') || 
           error.message.includes('timeout') ||
           error.message.includes('fetch');
  }
};

export const AGGRESSIVE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 500,
  maxDelay: 15000,
  backoffMultiplier: 1.5,
  retryCondition: () => true // Retry all errors
};

// Convenience functions
export const withRetry = <T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<RecoveryResult<T>> => {
  return recoveryManager.withRetry(operation, config, context);
};

export const withFallback = <T>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<T>,
  context: ErrorContext
): Promise<T> => {
  return recoveryManager.withFallback(primaryOperation, fallbackOperation, context);
};

export const withCircuitBreaker = <T>(
  operation: () => Promise<T>,
  circuitBreakerKey: string,
  context: ErrorContext,
  timeout?: number
): Promise<T> => {
  return recoveryManager.withCircuitBreaker(operation, circuitBreakerKey, context, timeout);
};
