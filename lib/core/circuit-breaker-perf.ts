// lib/core/circuit-breaker-perf.ts — Performance-optimized circuit breaker
// Optimizations: TTL cleanup, async queue for HALF_OPEN, deferred logging

import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitBreakerConfig,
  CircuitBreakerStats,
  CircuitState,
  CircuitBreakerOpenError,
} from './circuit-breaker';

interface QueuedRequest {
  resolve: () => void;
  reject: (error: Error) => void;
}

interface RegistryEntry {
  breaker: CircuitBreaker;
  lastAccessed: number;
}

/**
 * Optimized circuit breaker with:
 * - Async queue for HALF_OPEN state (prevents race conditions)
 * - Deferred logging (reduces event loop blocking)
 * - Log buffering (batch log writes)
 */
export class OptimizedCircuitBreaker extends CircuitBreaker {
  private halfOpenQueue: QueuedRequest[] = [];
  private logBuffer: string[] = [];
  private logFlushScheduled = false;

  /**
   * Execute with async queue for HALF_OPEN state
   * Prevents race condition where multiple calls pass check before increment
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check state and handle transitions
    const state = this.getState();
    
    if (state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - (this.getLastFailureTime() || 0);
      
      if (timeSinceLastFailure >= this.getResetTimeoutMs()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        this.incrementRejectedCalls();
        throw new CircuitBreakerOpenError(
          this.getServiceName(),
          this.getLastError(),
          timeSinceLastFailure
        );
      }
    }

    if (this.getState() === CircuitState.HALF_OPEN) {
      // Acquire slot through queue
      await this.acquireHalfOpenSlot();
      
      try {
        const result = await this.executeWithTimeout(fn);
        this.onSuccess();
        return result;
      } catch (error) {
        this.onFailure(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        this.releaseHalfOpenSlot();
      }
    } else {
      // CLOSED state
      try {
        const result = await this.executeWithTimeout(fn);
        this.onSuccess();
        return result;
      } catch (error) {
        this.onFailure(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    }
  }

  private async acquireHalfOpenSlot(): Promise<void> {
    return new Promise((resolve, reject) => {
      const maxCalls = this.getHalfOpenMaxCalls();
      
      if (this.getHalfOpenCalls() < maxCalls) {
        this.incrementHalfOpenCalls();
        resolve();
      } else {
        this.halfOpenQueue.push({ resolve, reject });
      }
    });
  }

  private releaseHalfOpenSlot(): void {
    const next = this.halfOpenQueue.shift();
    if (next) {
      // Transfer slot to waiting request
      next.resolve();
    } else {
      this.decrementHalfOpenCalls();
    }
  }

  /**
   * Deferred logging to reduce event loop blocking
   */
  protected logStateTransition(oldState: CircuitState, newState: CircuitState): void {
    this.logBuffer.push(
      `🔌 Circuit breaker "${this.getServiceName()}": ${oldState} → ${newState}`
    );
    this.scheduleLogFlush();
  }

  private scheduleLogFlush(): void {
    if (this.logFlushScheduled) return;
    
    this.logFlushScheduled = true;
    setImmediate(() => {
      if (this.logBuffer.length > 0) {
        console.log(this.logBuffer.join('\n'));
        this.logBuffer = [];
      }
      this.logFlushScheduled = false;
    });
  }

  // Helper methods to access protected state
  private getLastFailureTime(): number | null {
    return (this as any).lastFailureTime;
  }

  private getLastError(): Error | null {
    return (this as any).lastError;
  }

  private getResetTimeoutMs(): number {
    return (this as any).config.resetTimeoutMs;
  }

  private getServiceName(): string {
    return (this as any).serviceName;
  }

  private incrementRejectedCalls(): void {
    (this as any).rejectedCalls++;
  }

  private getHalfOpenMaxCalls(): number {
    return (this as any).config.halfOpenMaxCalls || 1;
  }

  private getHalfOpenCalls(): number {
    return (this as any).halfOpenCalls;
  }

  private incrementHalfOpenCalls(): void {
    (this as any).halfOpenCalls++;
  }

  private decrementHalfOpenCalls(): void {
    (this as any).halfOpenCalls = Math.max(0, (this as any).halfOpenCalls - 1);
  }

  private transitionTo(state: CircuitState): void {
    const oldState = this.getState();
    if (oldState === state) return;
    
    (this as any).transitionTo(state);
    this.logStateTransition(oldState, state);
  }

  private executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return (this as any).executeWithTimeout(fn);
  }

  private onSuccess(): void {
    (this as any).onSuccess();
  }

  private onFailure(error: Error): void {
    (this as any).onFailure(error);
  }
}

/**
 * Optimized circuit breaker registry with TTL cleanup
 * Prevents memory leaks when service names are dynamic
 */
export class OptimizedCircuitBreakerRegistry {
  private breakers = new Map<string, RegistryEntry>();
  private cleanupInterval: Timer | null = null;
  private readonly DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private ttlMs: number = DEFAULT_TTL_MS) {
    this.startCleanup();
  }

  /**
   * Get or create a circuit breaker with TTL tracking
   */
  getOrCreate(
    serviceName: string,
    config?: Partial<CircuitBreakerConfig>
  ): OptimizedCircuitBreaker {
    this.updateLastAccessed(serviceName);
    
    const existing = this.breakers.get(serviceName);
    if (existing) {
      return existing.breaker as OptimizedCircuitBreaker;
    }

    const breaker = new OptimizedCircuitBreaker(serviceName, config);
    this.breakers.set(serviceName, {
      breaker,
      lastAccessed: Date.now(),
    });
    return breaker;
  }

  /**
   * Get existing circuit breaker
   */
  get(serviceName: string): OptimizedCircuitBreaker | undefined {
    this.updateLastAccessed(serviceName);
    return this.breakers.get(serviceName)?.breaker as OptimizedCircuitBreaker;
  }

  /**
   * Remove a circuit breaker
   */
  remove(serviceName: string): void {
    const entry = this.breakers.get(serviceName);
    if (entry) {
      entry.breaker.destroy();
      this.breakers.delete(serviceName);
    }
  }

  /**
   * Get all statistics
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, entry] of this.breakers) {
      stats[name] = entry.breaker.getStats();
    }
    return stats;
  }

  /**
   * Get health status with rejection rate caching
   */
  getHealthStatus(): Array<{
    service: string;
    healthy: boolean;
    state: CircuitState;
    rejectionRate: number;
  }> {
    return Array.from(this.breakers.entries()).map(([service, entry]) => {
      const stats = entry.breaker.getStats();
      const rejectionRate = stats.totalCalls > 0
        ? stats.rejectedCalls / stats.totalCalls
        : 0;
      
      return {
        service,
        healthy: entry.breaker.isClosed(),
        state: stats.state,
        rejectionRate,
      };
    });
  }

  /**
   * Clean up all circuit breakers
   */
  destroyAll(): void {
    this.stopCleanup();
    for (const entry of this.breakers.values()) {
      entry.breaker.destroy();
    }
    this.breakers.clear();
  }

  /**
   * Get registry stats
   */
  getStats(): {
    totalBreakers: number;
    avgLastAccessedMs: number;
    oldestBreakerMs: number;
  } {
    const now = Date.now();
    const accessTimes: number[] = [];
    let oldest = now;

    for (const entry of this.breakers.values()) {
      const age = now - entry.lastAccessed;
      accessTimes.push(age);
      oldest = Math.min(oldest, age);
    }

    const avg = accessTimes.length > 0
      ? accessTimes.reduce((a, b) => a + b, 0) / accessTimes.length
      : 0;

    return {
      totalBreakers: this.breakers.size,
      avgLastAccessedMs: avg,
      oldestBreakerMs: oldest === now ? 0 : oldest,
    };
  }

  private updateLastAccessed(serviceName: string): void {
    const entry = this.breakers.get(serviceName);
    if (entry) {
      entry.lastAccessed = Date.now();
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_CHECK_INTERVAL_MS);
  }

  private stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.ttlMs;
    let cleaned = 0;
    
    for (const [name, entry] of this.breakers) {
      if (entry.lastAccessed < cutoff) {
        // Only clean healthy circuits to preserve failure state
        if (entry.breaker.isClosed()) {
          entry.breaker.destroy();
          this.breakers.delete(name);
          cleaned++;
        }
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} unused circuit breakers`);
    }
  }
}

// Benchmark comparison
export async function benchmarkCircuitBreaker(): Promise<void> {
  console.log('🔬 Circuit Breaker Performance Test\n');
  
  const iterations = 100000;
  
  // Test original
  const { CircuitBreaker: OriginalBreaker } = await import('./circuit-breaker');
  const original = new OriginalBreaker('original-test');
  
  console.log(`Running ${iterations.toLocaleString()} iterations...\n`);
  
  const start1 = performance.now();
  for (let i = 0; i < iterations; i++) {
    await original.execute(async () => 'success');
  }
  const time1 = performance.now() - start1;
  
  // Test optimized
  const optimized = new OptimizedCircuitBreaker('optimized-test');
  
  const start2 = performance.now();
  for (let i = 0; i < iterations; i++) {
    await optimized.execute(async () => 'success');
  }
  const time2 = performance.now() - start2;
  
  console.log(`Original:  ${time1.toFixed(2)}ms (${(iterations / (time1 / 1000)).toFixed(0)} ops/sec)`);
  console.log(`Optimized: ${time2.toFixed(2)}ms (${(iterations / (time2 / 1000)).toFixed(0)} ops/sec)`);
  console.log(`Overhead:  ${((time2 / time1 - 1) * 100).toFixed(1)}%`);
  
  original.destroy();
  optimized.destroy();
}

// Entry guard
if (import.meta.main) {
  benchmarkCircuitBreaker();
}
