// @bun/proxy/patterns/circuit-breaker.ts - Circuit breaker pattern (Code Point: 0x200-0x20F)

import { EventEmitter } from 'events';

// Circuit breaker states
export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, requests rejected
  HALF_OPEN = 'half_open' // Testing if service recovered
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  failureThreshold?: number;     // Number of failures before opening
  recoveryTimeout?: number;      // Time to wait before trying half-open (ms)
  monitoringPeriod?: number;     // Time window for failure counting (ms)
  successThreshold?: number;     // Successes needed to close circuit in half-open
  timeout?: number;              // Request timeout (ms)
  name?: string;                 // Circuit breaker name for logging
}

// Circuit breaker statistics
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  requests: number;
  rejections: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  stateChangeTime: Date;
}

// Circuit breaker implementation
export class CircuitBreaker extends EventEmitter {
  private config: Required<CircuitBreakerConfig>;
  private state: CircuitState = CircuitState.CLOSED;
  private stats: CircuitBreakerStats;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttemptTime: number = 0;
  private monitoringStart: number = Date.now();

  constructor(config: CircuitBreakerConfig = {}) {
    super();

    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 60000, // 1 minute
      successThreshold: 3,
      timeout: 30000, // 30 seconds
      name: 'CircuitBreaker',
      ...config
    };

    this.stats = {
      state: this.state,
      failures: 0,
      successes: 0,
      requests: 0,
      rejections: 0,
      stateChangeTime: new Date()
    };
  }

  // Execute a function with circuit breaker protection
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.stats.requests++;

    // Check if circuit should be opened
    if (this.shouldOpen()) {
      this.open();
      this.stats.rejections++;
      throw new Error(`Circuit breaker is OPEN for ${this.config.name}`);
    }

    // Check if we should attempt recovery
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttemptTime) {
      this.halfOpen();
    }

    // If still open, reject
    if (this.state === CircuitState.OPEN) {
      this.stats.rejections++;
      throw new Error(`Circuit breaker is OPEN for ${this.config.name}`);
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;

    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  // Execute function with timeout
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  // Handle successful execution
  private onSuccess(): void {
    this.stats.successes++;
    this.stats.lastSuccessTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.close();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  // Handle failed execution
  private onFailure(): void {
    this.stats.failures++;
    this.stats.lastFailureTime = new Date();
    this.failureCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.open();
    }
  }

  // Check if circuit should be opened
  private shouldOpen(): boolean {
    if (this.state === CircuitState.OPEN) {
      return true;
    }

    // Reset counters if monitoring period has passed
    if (Date.now() - this.monitoringStart > this.config.monitoringPeriod) {
      this.failureCount = 0;
      this.monitoringStart = Date.now();
    }

    return this.failureCount >= this.config.failureThreshold;
  }

  // Open the circuit
  private open(): void {
    if (this.state !== CircuitState.OPEN) {
      const previousState = this.state;
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      this.stats.stateChangeTime = new Date();

      this.emit('stateChange', {
        from: previousState,
        to: this.state,
        reason: 'failure_threshold_exceeded'
      });

      console.log(`=4 Circuit breaker ${this.config.name} opened`);
    }
  }

  // Close the circuit
  private close(): void {
    if (this.state !== CircuitState.CLOSED) {
      const previousState = this.state;
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      this.successCount = 0;
      this.stats.stateChangeTime = new Date();

      this.emit('stateChange', {
        from: previousState,
        to: this.state,
        reason: 'recovery_successful'
      });

      console.log(`=â Circuit breaker ${this.config.name} closed`);
    }
  }

  // Put circuit in half-open state
  private halfOpen(): void {
    if (this.state !== CircuitState.HALF_OPEN) {
      const previousState = this.state;
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      this.stats.stateChangeTime = new Date();

      this.emit('stateChange', {
        from: previousState,
        to: this.state,
        reason: 'recovery_attempt'
      });

      console.log(`=á Circuit breaker ${this.config.name} half-opened`);
    }
  }

  // Get current state
  getState(): CircuitState {
    return this.state;
  }

  // Get statistics
  getStats(): CircuitBreakerStats {
    return {
      ...this.stats,
      state: this.state
    };
  }

  // Get configuration
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  // Manually reset the circuit breaker
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.stats = {
      state: this.state,
      failures: 0,
      successes: 0,
      requests: 0,
      rejections: 0,
      stateChangeTime: new Date()
    };

    this.emit('reset');
    console.log(`= Circuit breaker ${this.config.name} reset`);
  }

  // Force open the circuit
  forceOpen(): void {
    this.open();
  }

  // Force close the circuit
  forceClose(): void {
    this.close();
  }

  // Check if circuit is available for requests
  isAvailable(): boolean {
    return this.state === CircuitState.CLOSED ||
           (this.state === CircuitState.HALF_OPEN);
  }

  // Get next retry time (for open circuits)
  getNextRetryTime(): number {
    return this.nextAttemptTime;
  }
}

// Factory function to create circuit breaker
export function createCircuitBreaker(config?: CircuitBreakerConfig): CircuitBreaker {
  return new CircuitBreaker(config);
}

// Higher-order function to wrap any async function with circuit breaker
export function withCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  config?: CircuitBreakerConfig
): ((...args: T) => Promise<R>) {
  const breaker = new CircuitBreaker(config);

  return async (...args: T): Promise<R> => {
    return breaker.execute(() => fn(...args));
  };
}

// Export default
export default CircuitBreaker;