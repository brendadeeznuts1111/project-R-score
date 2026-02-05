/**
 * CashApp Circuit Breaker - API Protection Pattern
 * Enterprise-Grade Circuit Breaker with Automatic Recovery
 */

import type { CircuitBreakerError } from './types.js';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting half-open */
  resetTimeout: number;
  /** Maximum attempts in half-open state */
  halfOpenMaxAttempts: number;
  /** Success threshold to close circuit */
  successThreshold?: number;
  /** Monitoring window in ms */
  monitoringWindow?: number;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  requests: number;
  lastFailure: number;
  lastSuccess: number;
  nextAttempt: number;
  totalBlocked: number;
}

/**
 * Circuit breaker result
 */
export interface CircuitResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  fromCache?: boolean;
}

/**
 * CashApp Circuit Breaker Implementation
 * Implements the circuit breaker pattern for API protection
 */
export class CashAppCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private requestCount: number = 0;
  private lastFailure: number = 0;
  private lastSuccess: number = 0;
  private nextAttempt: number = 0;
  private totalBlocked: number = 0;
  private halfOpenAttempts: number = 0;
  private failureTimestamps: number[] = [];

  constructor(private readonly config: CircuitBreakerConfig) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<CircuitResult<T>> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() >= this.nextAttempt) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
      } else {
        this.totalBlocked++;
        const error = new Error(`Circuit breaker is open. Retry after ${this.nextAttempt}`);
        (error as CircuitBreakerError).code = 'CIRCUIT_OPEN';
        
        // Try fallback if available
        if (fallback) {
          try {
            const fallbackResult = await fallback();
            return { success: true, data: fallbackResult, fromCache: true };
          } catch (fallbackError) {
            return { success: false, error: fallbackError as Error };
          }
        }
        
        return { success: false, error: error as Error };
      }
    }

    this.requestCount++;

    try {
      const result = await fn();
      this.recordSuccess();
      return { success: true, data: result };
    } catch (error) {
      this.recordFailure();
      return { success: false, error: error as Error };
    }
  }

  /**
   * Record a successful request
   */
  private recordSuccess(): void {
    this.successCount++;
    this.lastSuccess = Date.now();
    this.successCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= (this.config.successThreshold || 1)) {
        this.close();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Record a failed request
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailure = Date.now();
    this.failureTimestamps.push(Date.now());

    // Clean up old failure timestamps
    const windowStart = Date.now() - (this.config.monitoringWindow || 60000);
    this.failureTimestamps = this.failureTimestamps.filter(t => t > windowStart);

    if (this.state === CircuitState.HALF_OPEN) {
      this.open();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpen()) {
        this.open();
      }
    }
  }

  /**
   * Determine if circuit should be opened
   */
  private shouldOpen(): boolean {
    // Check absolute failure count
    if (this.failureCount >= this.config.failureThreshold) {
      return true;
    }

    // Check failure rate in monitoring window
    if (this.config.monitoringWindow && this.failureTimestamps.length > 0) {
      const windowStart = Date.now() - this.config.monitoringWindow;
      const recentFailures = this.failureTimestamps.filter(t => t > windowStart);
      const recentRequests = this.requestCount || 1;
      const failureRate = recentFailures.length / recentRequests;
      
      // Open if failure rate exceeds 50%
      if (failureRate > 0.5 && recentFailures.length >= this.config.failureThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Open the circuit
   */
  private open(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.config.resetTimeout;
    this.halfOpenAttempts = 0;
  }

  /**
   * Close the circuit
   */
  close(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.failureTimestamps = [];
  }

  /**
   * Force open the circuit
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.config.resetTimeout;
  }

  /**
   * Force close the circuit
   */
  forceClose(): void {
    this.close();
  }

  /**
   * Get current circuit metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      requests: this.requestCount,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      nextAttempt: this.nextAttempt,
      totalBlocked: this.totalBlocked
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit allows requests
   */
  isAllowed(): boolean {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() >= this.nextAttempt) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
        return true;
      }
      return false;
    }
    return true;
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailure = 0;
    this.lastSuccess = 0;
    this.nextAttempt = 0;
    this.totalBlocked = 0;
    this.halfOpenAttempts = 0;
    this.failureTimestamps = [];
  }

  /**
   * Get status for display
   */
  toString(): string {
    const metrics = this.getMetrics();
    const nextAttempt = metrics.nextAttempt > 0 
      ? new Date(metrics.nextAttempt).toISOString()
      : 'N/A';
    
    return `[CashAppCircuitBreaker] State: ${metrics.state} | ` +
      `Failures: ${metrics.failures} | ` +
      `Successes: ${metrics.successes} | ` +
      `Blocked: ${metrics.totalBlocked} | ` +
      `Next Attempt: ${nextAttempt}`;
  }
}

/**
 * Create a configured circuit breaker
 */
export function createCashAppCircuitBreaker(
  failureThreshold: number = 5,
  resetTimeout: number = 60000,
  halfOpenMaxAttempts: number = 3
): CashAppCircuitBreaker {
  return new CashAppCircuitBreaker({
    failureThreshold,
    resetTimeout,
    halfOpenMaxAttempts
  });
}

/**
 * Wrap a function with circuit breaker
 */
export function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  breaker: CashAppCircuitBreaker,
  fallback?: () => Promise<T>
): () => Promise<CircuitResult<T>> {
  return () => breaker.execute(fn, fallback);
}
