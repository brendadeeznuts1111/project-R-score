/**
 * Fire22 Retry and Circuit Breaker Utilities
 *
 * Implements retry logic and circuit breaker patterns for resilient error handling
 */

import { ErrorHandler } from './ErrorHandler';
import { ERROR_CODES } from './types';

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
  jitter: boolean;
  retryCondition?: (error: Error) => boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringPeriodMs: number;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions) {
    this.options = options;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.options.resetTimeoutMs) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      } else {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 2) {
        // Require 2 successes to close
        this.state = 'CLOSED';
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount,
    };
  }
}

export class RetryUtils {
  private static circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Retry operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config: RetryOptions = {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      exponentialBackoff: true,
      jitter: true,
      ...options,
    };

    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (config.retryCondition && !config.retryCondition(lastError)) {
          throw lastError;
        }

        // Don't delay after the last attempt
        if (attempt < config.maxAttempts) {
          const delay = this.calculateDelay(attempt, config);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Retry database operations
   */
  static async retryDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    request?: Request
  ): Promise<T> {
    const errorHandler = ErrorHandler.getInstance();

    return this.retry(operation, {
      maxAttempts: 3,
      baseDelayMs: 1000,
      exponentialBackoff: true,
      retryCondition: error => {
        // Retry on connection errors, timeouts, but not on syntax errors
        const message = error.message.toLowerCase();
        return (
          message.includes('connection') ||
          message.includes('timeout') ||
          message.includes('busy') ||
          message.includes('locked')
        );
      },
    }).catch(error => {
      throw errorHandler.createError(
        ERROR_CODES.DATABASE_ERROR,
        `Database operation failed: ${operationName}`,
        request,
        error,
        { operationName, maxAttempts: 3 }
      );
    });
  }

  /**
   * Retry external service calls with circuit breaker
   */
  static async retryExternalService<T>(
    serviceName: string,
    operation: () => Promise<T>,
    request?: Request
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(serviceName);
    const errorHandler = ErrorHandler.getInstance();

    try {
      return await circuitBreaker.execute(() =>
        this.retry(operation, {
          maxAttempts: 3,
          baseDelayMs: 2000,
          maxDelayMs: 10000,
          retryCondition: error => {
            const message = error.message.toLowerCase();
            return (
              message.includes('timeout') ||
              message.includes('network') ||
              message.includes('503') ||
              message.includes('502')
            );
          },
        })
      );
    } catch (error) {
      throw errorHandler.createError(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        `External service failed: ${serviceName}`,
        request,
        error as Error,
        {
          serviceName,
          circuitBreakerState: circuitBreaker.getState(),
          maxAttempts: 3,
        }
      );
    }
  }

  /**
   * Get or create circuit breaker for service
   */
  private static getCircuitBreaker(serviceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(
        serviceName,
        new CircuitBreaker({
          failureThreshold: 5,
          resetTimeoutMs: 60000, // 1 minute
          monitoringPeriodMs: 300000, // 5 minutes
        })
      );
    }
    return this.circuitBreakers.get(serviceName)!;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private static calculateDelay(attempt: number, config: RetryOptions): number {
    let delay = config.baseDelayMs;

    if (config.exponentialBackoff) {
      delay = Math.min(delay * Math.pow(2, attempt - 1), config.maxDelayMs);
    }

    if (config.jitter) {
      // Add ±25% jitter
      const jitterRange = delay * 0.25;
      delay += (Math.random() * 2 - 1) * jitterRange;
    }

    return Math.max(0, Math.floor(delay));
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable based on common patterns
   */
  static isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'temporarily unavailable',
      'service unavailable',
      '503',
      '502',
      '504',
      'econnreset',
      'enotfound',
      'locked',
      'busy',
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Get circuit breaker stats for monitoring
   */
  static getCircuitBreakerStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    this.circuitBreakers.forEach((breaker, serviceName) => {
      stats[serviceName] = breaker.getStats();
    });
    return stats;
  }

  /**
   * Reset circuit breaker for service (for testing/admin)
   */
  static resetCircuitBreaker(serviceName: string): void {
    this.circuitBreakers.delete(serviceName);
  }
}

/**
 * Timeout wrapper utility
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]);
}

/**
 * Fallback utility for graceful degradation
 */
export async function withFallback<T>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<T> | T,
  fallbackCondition?: (error: Error) => boolean
): Promise<T> {
  try {
    return await primaryOperation();
  } catch (error) {
    const shouldFallback = fallbackCondition
      ? fallbackCondition(error as Error)
      : RetryUtils.isRetryableError(error as Error);

    if (shouldFallback) {
      console.warn('Primary operation failed, using fallback:', error);
      return await fallbackOperation();
    }

    throw error;
  }
}
