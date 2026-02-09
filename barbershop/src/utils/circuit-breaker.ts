#!/usr/bin/env bun
/**
 * BarberShop ELITE Circuit Breaker
 * =================================
 * Resilience pattern for external API calls
 * 
 * Elite Features:
 * - State machine (CLOSED, OPEN, HALF_OPEN)
 * - Exponential backoff
 * - Health check probes
 * - Bun.nanoseconds() timing
 * - Metrics integration
 */

import { nanoseconds } from 'bun';
import { metrics } from '../core/barber-elite-metrics';

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER STATES
// ═══════════════════════════════════════════════════════════════════════════════

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures before opening
  successThreshold: number;      // Successes needed to close
  timeoutMs: number;             // Time before half-open
  resetTimeoutMs: number;        // Exponential backoff base
  maxResetTimeoutMs: number;     // Max backoff
  healthCheckIntervalMs: number; // Health check frequency
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeoutMs: 60000,
  resetTimeoutMs: 5000,
  maxResetTimeoutMs: 60000,
  healthCheckIntervalMs: 10000,
};

interface CircuitMetrics {
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  totalCalls: number;
  stateChanges: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════════════

export class EliteCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private config: CircuitBreakerConfig;
  private metrics: CircuitMetrics;
  private nextAttempt = 0;
  private healthCheckTimer: Timer | null = null;
  private halfOpenCalls = 0;
  private maxHalfOpenCalls = 1;
  
  constructor(
    private name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      consecutiveSuccesses: 0,
      consecutiveFailures: 0,
      totalCalls: 0,
      stateChanges: 0,
    };
    
    this.startHealthChecks();
  }
  
  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    const startNs = nanoseconds();
    
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        // Circuit open, use fallback or throw
        if (fallback) {
          console.log(`[CIRCUIT ${this.name}] OPEN - using fallback`);
          return fallback();
        }
        throw new CircuitBreakerError(`Circuit ${this.name} is OPEN`);
      }
      
      // Try half-open
      this.transitionTo('HALF_OPEN');
    }
    
    if (this.state === 'HALF_OPEN' && this.halfOpenCalls >= this.maxHalfOpenCalls) {
      throw new CircuitBreakerError(`Circuit ${this.name} HALF_OPEN limit reached`);
    }
    
    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      
      // Record latency
      const elapsedMs = Number(nanoseconds() - startNs) / 1e6;
      if (metrics) {
        metrics.httpRequestDuration.observe(elapsedMs / 1000, {
          method: 'CALL',
          path: this.name,
          status: '200',
        });
      }
      
      return result;
    } catch (error) {
      this.onFailure();
      
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }
  
  /**
   * Record successful call
   */
  private onSuccess(): void {
    this.metrics.successes++;
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastSuccessTime = Date.now();
    this.metrics.totalCalls++;
    
    if (this.state === 'HALF_OPEN') {
      if (this.metrics.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
      }
    }
  }
  
  /**
   * Record failed call
   */
  private onFailure(): void {
    this.metrics.failures++;
    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;
    this.metrics.lastFailureTime = Date.now();
    this.metrics.totalCalls++;
    
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      if (this.metrics.consecutiveFailures >= this.config.failureThreshold) {
        this.transitionTo('OPEN');
      }
    }
  }
  
  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;
    
    console.log(`[CIRCUIT ${this.name}] ${this.state} -> ${newState}`);
    
    this.state = newState;
    this.metrics.stateChanges++;
    this.halfOpenCalls = 0;
    
    if (newState === 'OPEN') {
      // Calculate exponential backoff
      const failures = Math.min(this.metrics.consecutiveFailures, 10);
      const backoff = Math.min(
        this.config.resetTimeoutMs * Math.pow(2, failures),
        this.config.maxResetTimeoutMs
      );
      this.nextAttempt = Date.now() + backoff;
      console.log(`[CIRCUIT ${this.name}] Will retry in ${backoff}ms`);
    } else if (newState === 'CLOSED') {
      this.metrics.consecutiveFailures = 0;
      this.metrics.consecutiveSuccesses = 0;
    }
  }
  
  /**
   * Start health check probes
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
        console.log(`[CIRCUIT ${this.name}] Health check: attempting HALF_OPEN`);
      }
    }, this.config.healthCheckIntervalMs);
  }
  
  /**
   * Force circuit open (for maintenance)
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
    this.nextAttempt = Date.now() + this.config.maxResetTimeoutMs;
  }
  
  /**
   * Force circuit closed (recovery)
   */
  forceClose(): void {
    this.transitionTo('CLOSED');
    this.metrics.consecutiveFailures = 0;
    this.metrics.consecutiveSuccesses = 0;
  }
  
  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get metrics
   */
  getMetrics(): CircuitMetrics & { state: CircuitState; nextAttempt: number } {
    return {
      ...this.metrics,
      state: this.state,
      nextAttempt: this.nextAttempt,
    };
  }
  
  /**
   * Format for Prometheus
   */
  toPrometheus(): string {
    const stateValue = this.state === 'CLOSED' ? 0 : this.state === 'HALF_OPEN' ? 1 : 2;
    
    let output = `# HELP circuit_breaker_state Circuit breaker state (0=closed, 1=half_open, 2=open)\n`;
    output += `# TYPE circuit_breaker_state gauge\n`;
    output += `circuit_breaker_state{name="${this.name}"} ${stateValue}\n\n`;
    
    output += `# HELP circuit_breaker_failures_total Total failures\n`;
    output += `# TYPE circuit_breaker_failures_total counter\n`;
    output += `circuit_breaker_failures_total{name="${this.name}"} ${this.metrics.failures}\n\n`;
    
    output += `# HELP circuit_breaker_successes_total Total successes\n`;
    output += `# TYPE circuit_breaker_successes_total counter\n`;
    output += `circuit_breaker_successes_total{name="${this.name}"} ${this.metrics.successes}\n\n`;
    
    output += `# HELP circuit_breaker_consecutive_failures Consecutive failures\n`;
    output += `# TYPE circuit_breaker_consecutive_failures gauge\n`;
    output += `circuit_breaker_consecutive_failures{name="${this.name}"} ${this.metrics.consecutiveFailures}\n\n`;
    
    return output;
  }
  
  /**
   * Destroy circuit breaker
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER ERROR
// ═══════════════════════════════════════════════════════════════════════════════

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

export class CircuitBreakerManager {
  private breakers = new Map<string, EliteCircuitBreaker>();
  
  get(name: string, config?: Partial<CircuitBreakerConfig>): EliteCircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new EliteCircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }
  
  getAllMetrics(): string {
    let output = '';
    for (const [name, breaker] of this.breakers) {
      output += breaker.toPrometheus() + '\n';
    }
    return output;
  }
  
  destroy(): void {
    for (const breaker of this.breakers.values()) {
      breaker.destroy();
    }
    this.breakers.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECORATOR FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function withCircuitBreaker(
  breaker: EliteCircuitBreaker,
  fallback?: (...args: unknown[]) => unknown
) {
  return function (
    _target: object,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      return breaker.execute(
        () => originalMethod.apply(this, args),
        fallback ? () => fallback(...args) : undefined
      );
    };
    
    return descriptor;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const circuitBreakers = new CircuitBreakerManager();

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  ⚡ ELITE CIRCUIT BREAKER                                       ║
╠══════════════════════════════════════════════════════════════════╣
║  Resilience • Exponential Backoff • Health Checks                ║
╚══════════════════════════════════════════════════════════════════╝
`);
  
  const breaker = new EliteCircuitBreaker('payment-api', {
    failureThreshold: 3,
    successThreshold: 2,
    timeoutMs: 5000,
    resetTimeoutMs: 2000,
  });
  
  // Simulate successful calls
  console.log('1. Simulating successful calls...\n');
  
  for (let i = 0; i < 5; i++) {
    try {
      const result = await breaker.execute(async () => {
        return { status: 'success', data: `payment-${i}` };
      });
      console.log(`   ✓ Call ${i + 1}:`, result);
    } catch (e) {
      console.log(`   ✗ Call ${i + 1}:`, (e as Error).message);
    }
  }
  
  // Simulate failures to trip circuit
  console.log('\n2. Simulating failures (circuit will open)...\n');
  
  for (let i = 0; i < 5; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Service unavailable');
      });
    } catch (e) {
      console.log(`   ✗ Call ${i + 1}:`, (e as Error).message);
    }
  }
  
  console.log(`\n   Circuit state: ${breaker.getState()}`);
  console.log(`   Next attempt: ${breaker.getMetrics().nextAttempt - Date.now()}ms`);
  
  // Try with fallback
  console.log('\n3. Using fallback while circuit is open...\n');
  
  const fallbackResult = await breaker.execute(
    async () => ({ status: 'live' }),
    () => ({ status: 'cached', data: 'fallback-data' })
  );
  
  console.log('   Fallback result:', fallbackResult);
  
  // Wait and recover
  console.log('\n4. Waiting for circuit to half-open...\n');
  
  await Bun.sleep(3000);
  
  // Successful recovery
  console.log('5. Recovery (successful calls)...\n');
  
  for (let i = 0; i < 5; i++) {
    try {
      const result = await breaker.execute(async () => {
        return { status: 'success', data: `recovery-${i}` };
      });
      console.log(`   ✓ Call ${i + 1}:`, result);
    } catch (e) {
      console.log(`   ✗ Call ${i + 1}:`, (e as Error).message);
    }
  }
  
  console.log(`\n   Circuit state: ${breaker.getState()}`);
  
  // Show Prometheus metrics
  console.log('\n6. Prometheus Metrics:\n');
  console.log(breaker.toPrometheus());
  
  // Final metrics
  const m = breaker.getMetrics();
  console.log('Final Stats:');
  console.log(`   Total calls: ${m.totalCalls}`);
  console.log(`   Successes: ${m.successes}`);
  console.log(`   Failures: ${m.failures}`);
  console.log(`   State changes: ${m.stateChanges}`);
  
  breaker.destroy();
  
  console.log('\n✅ Circuit Breaker demo complete!');
}

export default EliteCircuitBreaker;
