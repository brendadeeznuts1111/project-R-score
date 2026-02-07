// lib/core/circuit-breaker.ts — Circuit breaker pattern for resilient external calls

import {
  createNetworkError,
  createSystemError,
  EnterpriseErrorCode,
} from './core-errors';
import { safeAsync } from './error-handling';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  /** Normal operation, requests pass through */
  CLOSED = 'closed',
  /** Failure threshold reached, requests are blocked */
  OPEN = 'open',
  /** Testing if service has recovered */
  HALF_OPEN = 'half_open',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting to close (HALF_OPEN) */
  resetTimeoutMs: number;
  /** Success threshold in HALF_OPEN state to close circuit */
  successThreshold: number;
  /** Timeout for individual calls */
  callTimeoutMs: number;
  /** Half-open max calls (to prevent flooding) */
  halfOpenMaxCalls?: number;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveSuccesses: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalCalls: number;
  rejectedCalls: number;
  stateChanges: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000, // 30 seconds
  successThreshold: 3,
  callTimeoutMs: 10000,  // 10 seconds
  halfOpenMaxCalls: 3,
};

/**
 * Circuit Breaker Error
 */
export class CircuitBreakerOpenError extends Error {
  constructor(
    public readonly serviceName: string,
    public readonly lastError: Error | null,
    public readonly openDuration: number
  ) {
    super(
      `Circuit breaker is OPEN for service "${serviceName}". ` +
      `Last error: ${lastError?.message || 'Unknown'}. ` +
      `Open for ${Math.floor(openDuration / 1000)}s`
    );
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Circuit Breaker
 * 
 * Prevents cascading failures by temporarily blocking requests to failing services.
 * Implements the Circuit Breaker pattern from "Release It!" by Michael Nygard.
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service failing, requests are blocked immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 * 
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker('payment-api', {
 *   failureThreshold: 5,
 *   resetTimeoutMs: 30000,
 *   successThreshold: 2,
 * });
 * 
 * // Use the breaker
 * const result = await breaker.execute(async () => {
 *   return await fetchPayment(paymentId);
 * });
 * 
 * // Check statistics
 * console.log(breaker.getStats());
 * 
 * // Clean up when done
 * breaker.destroy();
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalCalls = 0;
  private rejectedCalls = 0;
  private stateChanges = 0;
  private lastError: Error | null = null;
  private halfOpenCalls = 0;
  private config: CircuitBreakerConfig;
  private monitoringInterval: Timer | null = null;

  constructor(
    private readonly serviceName: string,
    config?: Partial<CircuitBreakerConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startMonitoring();
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);
      
      if (timeSinceLastFailure >= this.config.resetTimeoutMs) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        this.rejectedCalls++;
        throw new CircuitBreakerOpenError(
          this.serviceName,
          this.lastError,
          timeSinceLastFailure
        );
      }
    }

    // In HALF_OPEN state, limit concurrent calls
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= (this.config.halfOpenMaxCalls || 1)) {
        this.rejectedCalls++;
        throw new CircuitBreakerOpenError(
          this.serviceName,
          this.lastError,
          Date.now() - (this.lastFailureTime || 0)
        );
      }
      this.halfOpenCalls++;
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      if (this.state === CircuitState.HALF_OPEN) {
        this.halfOpenCalls--;
      }
    }
  }

  /**
   * Execute with timeout protection
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(createNetworkError(
            EnterpriseErrorCode.NETWORK_TIMEOUT,
            `Circuit breaker call timed out after ${this.config.callTimeoutMs}ms`,
            this.serviceName
          ));
        }, this.config.callTimeoutMs);
      }),
    ]);
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successes++;
    this.consecutiveSuccesses++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.failures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();
    this.lastError = error;

    if (this.state === CircuitState.HALF_OPEN) {
      // Immediately go back to OPEN on failure in HALF_OPEN
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.stateChanges++;

      // Reset counters on state change
      if (newState === CircuitState.CLOSED) {
        this.failures = 0;
        this.consecutiveSuccesses = 0;
        this.halfOpenCalls = 0;
      } else if (newState === CircuitState.HALF_OPEN) {
        this.consecutiveSuccesses = 0;
        this.halfOpenCalls = 0;
      }

      console.log(
        `🔌 Circuit breaker "${this.serviceName}": ${oldState} → ${newState}`
      );
    }
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      rejectedCalls: this.rejectedCalls,
      stateChanges: this.stateChanges,
    };
  }

  /**
   * Force open the circuit (for maintenance/testing)
   */
  forceOpen(): void {
    this.lastFailureTime = Date.now();
    this.transitionTo(CircuitState.OPEN);
  }

  /**
   * Force close the circuit (recovery)
   */
  forceClose(): void {
    this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is closed (healthy)
   */
  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Check if circuit is open (failing)
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Start monitoring interval
   */
  private startMonitoring(): void {
    // Log stats every minute
    this.monitoringInterval = setInterval(() => {
      const stats = this.getStats();
      if (stats.totalCalls > 0) {
        console.log(`📊 Circuit "${this.serviceName}" stats:`, {
          state: stats.state,
          total: stats.totalCalls,
          rejected: stats.rejectedCalls,
          failures: stats.failures,
          successes: stats.successes,
        });
      }
    }, 60000);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

/**
 * Circuit breaker registry for managing multiple breakers
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  getOrCreate(
    serviceName: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, config));
    }
    return this.breakers.get(serviceName)!;
  }

  /**
   * Get existing circuit breaker
   */
  get(serviceName: string): CircuitBreaker | undefined {
    return this.breakers.get(serviceName);
  }

  /**
   * Remove a circuit breaker
   */
  remove(serviceName: string): void {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.destroy();
      this.breakers.delete(serviceName);
    }
  }

  /**
   * Get all statistics
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Get health status of all services
   */
  getHealthStatus(): Array<{
    service: string;
    healthy: boolean;
    state: CircuitState;
    rejectionRate: number;
  }> {
    return Array.from(this.breakers.entries()).map(([service, breaker]) => {
      const stats = breaker.getStats();
      const rejectionRate = stats.totalCalls > 0
        ? stats.rejectedCalls / stats.totalCalls
        : 0;
      
      return {
        service,
        healthy: breaker.isClosed(),
        state: stats.state,
        rejectionRate,
      };
    });
  }

  /**
   * Clean up all circuit breakers
   */
  destroyAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.destroy();
    }
    this.breakers.clear();
  }
}

/**
 * Global circuit breaker registry
 */
const globalRegistry = new CircuitBreakerRegistry();

/**
 * Execute with circuit breaker protection (uses global registry)
 */
export async function withCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>
): Promise<T> {
  const breaker = globalRegistry.getOrCreate(serviceName, config);
  return breaker.execute(fn);
}

/**
 * Get global circuit breaker registry
 */
export function getCircuitBreakerRegistry(): CircuitBreakerRegistry {
  return globalRegistry;
}

/**
 * Get circuit breaker health status
 */
export function getCircuitBreakerHealth(): ReturnType<
  CircuitBreakerRegistry['getHealthStatus']
> {
  return globalRegistry.getHealthStatus();
}

// Entry guard for testing
if (import.meta.main) {
  console.log('🔧 Circuit Breaker Demo\n');

  const breaker = new CircuitBreaker('test-service', {
    failureThreshold: 3,
    resetTimeoutMs: 5000,
    successThreshold: 2,
  });

  // Simulate failures
  console.log('Simulating 3 failures...');
  for (let i = 0; i < 3; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Service unavailable');
      });
    } catch (error) {
      console.log(`  Attempt ${i + 1}: ${(error as Error).message}`);
    }
  }

  console.log('\nState:', breaker.getState());
  console.log('Stats:', breaker.getStats());

  // Try to call again (should be blocked)
  console.log('\nTrying to call while OPEN...');
  try {
    await breaker.execute(async () => 'success');
  } catch (error) {
    console.log(`  Blocked: ${(error as Error).message}`);
  }

  // Wait for reset timeout
  console.log('\nWaiting 5 seconds for reset timeout...');
  await Bun.sleep(5000);

  // Now should be HALF_OPEN
  console.log('\nState after timeout:', breaker.getState());

  // Success in HALF_OPEN
  console.log('\nSending 2 successful requests...');
  for (let i = 0; i < 2; i++) {
    try {
      const result = await breaker.execute(async () => 'success');
      console.log(`  Attempt ${i + 1}: ${result}`);
    } catch (error) {
      console.log(`  Attempt ${i + 1}: ${(error as Error).message}`);
    }
  }

  console.log('\nFinal state:', breaker.getState());
  console.log('Final stats:', breaker.getStats());

  breaker.destroy();
  console.log('\n✅ Demo complete!');
}
