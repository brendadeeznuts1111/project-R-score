/**
 * [KYC][UTILITY][INTERFACE][META:{export}]
 * Circuit Breaker Configuration
 * Prevents cascading failures from external API calls
 */

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  resetTimeout: number; // Milliseconds before attempting reset
  monitoringWindow: number; // Time window for failure counting
}

export type CircuitState = "closed" | "open" | "half-open";

/**
 * [KYC][UTILITY][CLASS][META:{export}]
 * Circuit Breaker Implementation
 * Protects against external API failures
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
        this.state = "half-open";
        this.successCount = 0;
      } else {
        throw new Error("Circuit breaker is OPEN - service unavailable");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === "half-open") {
      this.successCount++;
      if (this.successCount >= 2) {
        // Require 2 successes to fully close
        this.state = "closed";
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = "open";
    } else if (this.state === "half-open") {
      // Failed in half-open, go back to open
      this.state = "open";
      this.successCount = 0;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }

  reset(): void {
    this.state = "closed";
    this.failures = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

// Pre-configured circuit breakers for external services
export const googlePlayIntegrityBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  monitoringWindow: 300000, // 5 minutes
});

export const awsTextractBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  monitoringWindow: 300000, // 5 minutes
});

export const adbCommandBreaker = new CircuitBreaker({
  failureThreshold: 10, // More tolerant for ADB
  resetTimeout: 30000, // 30 seconds
  monitoringWindow: 300000, // 5 minutes
});
