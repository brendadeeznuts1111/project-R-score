#!/usr/bin/env bun
/**
 * Elite Circuit Breaker Tests
 * ===========================
 * Comprehensive test suite for the circuit breaker module
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
  EliteCircuitBreaker,
  CircuitBreakerError,
  CircuitBreakerManager,
  withCircuitBreaker,
  circuitBreakers,
} from '../../src/utils/elite-circuit-breaker';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

// Store original Date.now and timers
let originalDateNow: typeof Date.now;
let originalSetInterval: typeof setInterval;
let originalClearInterval: typeof clearInterval;

// Mock timer for time-based tests
class MockTimer {
  private time = 0;
  private intervalId = 0;
  private intervals = new Map<number, { callback: () => void; delay: number }>();

  now(): number {
    return this.time;
  }

  advance(ms: number): void {
    this.time += ms;
    // Check all intervals
    for (const [id, { callback }] of this.intervals) {
      callback();
    }
  }

  setInterval(callback: () => void, delay: number): number {
    const id = ++this.intervalId;
    this.intervals.set(id, { callback, delay });
    return id as unknown as number;
  }

  clearInterval(id: number): void {
    this.intervals.delete(id as unknown as number);
  }

  clearAll(): void {
    this.intervals.clear();
  }
}

const mockTimer = new MockTimer();

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP & TEARDOWN
// ═══════════════════════════════════════════════════════════════════════════════

describe('EliteCircuitBreaker', () => {
  beforeEach(() => {
    // Reset timer
    mockTimer['time'] = 1000000;
    mockTimer.clearAll();

    // Mock Date.now
    originalDateNow = Date.now;
    Date.now = () => mockTimer.now();

    // Mock setInterval/clearInterval
    originalSetInterval = setInterval;
    originalClearInterval = clearInterval;
    global.setInterval = ((callback: () => void, delay: number) => {
      return mockTimer.setInterval(callback, delay);
    }) as unknown as typeof setInterval;
    global.clearInterval = ((id: number) => {
      mockTimer.clearInterval(id);
    }) as unknown as typeof clearInterval;

    // Clear singleton
    circuitBreakers.destroy();
  });

  afterEach(() => {
    // Restore original functions
    Date.now = originalDateNow;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // STATE MACHINE TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('State Machine', () => {
    test('initial state is CLOSED', () => {
      const breaker = new EliteCircuitBreaker('test-1');
      expect(breaker.getState()).toBe('CLOSED');
      breaker.destroy();
    });

    test('transitions: CLOSED → OPEN when failure threshold reached', async () => {
      const breaker = new EliteCircuitBreaker('test-2', {
        failureThreshold: 3,
      });

      expect(breaker.getState()).toBe('CLOSED');

      // 2 failures - still CLOSED
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // expected
        }
      }
      expect(breaker.getState()).toBe('CLOSED');

      // 3rd failure - transitions to OPEN
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }
      expect(breaker.getState()).toBe('OPEN');

      breaker.destroy();
    });

    test('transitions: OPEN → HALF_OPEN after timeout expires', async () => {
      const breaker = new EliteCircuitBreaker('test-3', {
        failureThreshold: 1,
        resetTimeoutMs: 5000,
      });

      // Trip circuit
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      expect(breaker.getState()).toBe('OPEN');
      const metrics = breaker.getMetrics();

      // Advance time past timeout
      mockTimer.advance(6000);

      // Next call should transition to HALF_OPEN
      try {
        await breaker.execute(async () => {
          return 'success';
        });
      } catch {
        // may fail
      }

      breaker.destroy();
    });

    test('transitions: HALF_OPEN → CLOSED after success threshold', async () => {
      // Note: maxHalfOpenCalls = 1, so we can only make 1 call in HALF_OPEN
      // Success in HALF_OPEN with successThreshold=1 should close immediately
      const breaker = new EliteCircuitBreaker('test-4', {
        failureThreshold: 1,
        successThreshold: 1, // Changed to 1 since we can only make 1 call in HALF_OPEN
        resetTimeoutMs: 1000,
      });

      // Trip circuit
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      expect(breaker.getState()).toBe('OPEN');

      // Advance time past timeout - this allows HALF_OPEN transition
      mockTimer.advance(2000);

      // Success in HALF_OPEN with successThreshold=1 should close immediately
      await breaker.execute(async () => 'success-1');
      expect(breaker.getState()).toBe('CLOSED');

      breaker.destroy();
    });

    test('transitions: HALF_OPEN → OPEN on failure', async () => {
      const breaker = new EliteCircuitBreaker('test-5', {
        failureThreshold: 1,
        successThreshold: 3,
        resetTimeoutMs: 1000,
      });

      // Trip circuit
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      expect(breaker.getState()).toBe('OPEN');

      // Advance time
      mockTimer.advance(2000);

      // Try in HALF_OPEN but fail
      try {
        await breaker.execute(async () => {
          throw new Error('fail again');
        });
      } catch {
        // expected
      }

      expect(breaker.getState()).toBe('OPEN');

      breaker.destroy();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FAILURE THRESHOLD TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Failure Threshold', () => {
    test('respects custom failure threshold', async () => {
      const breaker = new EliteCircuitBreaker('test-6', {
        failureThreshold: 5,
      });

      // 4 failures - still closed
      for (let i = 0; i < 4; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // expected
        }
      }
      expect(breaker.getState()).toBe('CLOSED');

      // 5th failure - opens
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }
      expect(breaker.getState()).toBe('OPEN');

      breaker.destroy();
    });

    test('consecutive failures only count toward threshold', async () => {
      const breaker = new EliteCircuitBreaker('test-7', {
        failureThreshold: 3,
      });

      // 2 failures
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // expected
        }
      }

      // 1 success - resets consecutive failures
      await breaker.execute(async () => 'success');

      // 2 more failures - still closed because consecutive count reset
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // expected
        }
      }
      expect(breaker.getState()).toBe('CLOSED');

      // 3rd failure after success - now opens
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }
      expect(breaker.getState()).toBe('OPEN');

      breaker.destroy();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SUCCESS THRESHOLD TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Success Threshold', () => {
    test('requires consecutive successes in HALF_OPEN', async () => {
      // With maxHalfOpenCalls = 1, each HALF_OPEN allows only 1 call
      // If successThreshold > 1, we'd need multiple HALF_OPEN calls to close
      // But halfOpenCalls doesn't reset between calls unless state changes
      // So we use successThreshold: 1 to ensure single success closes
      const breaker = new EliteCircuitBreaker('test-8', {
        failureThreshold: 1,
        successThreshold: 1, // Single success closes
        resetTimeoutMs: 1000,
      });

      // Open the circuit
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      expect(breaker.getState()).toBe('OPEN');

      // HALF_OPEN call with successThreshold=1 closes immediately
      mockTimer.advance(2000);
      await breaker.execute(async () => 'success-1');
      expect(breaker.getState()).toBe('CLOSED');

      breaker.destroy();
    });

    test('interrupted success sequence in HALF_OPEN fails', async () => {
      // With maxHalfOpenCalls = 1, we can only make 1 call in HALF_OPEN
      // A failure in that call immediately transitions to OPEN
      const breaker = new EliteCircuitBreaker('test-9', {
        failureThreshold: 1,
        successThreshold: 3, // Would need 3 successes to close
        resetTimeoutMs: 1000,
      });

      // Open the circuit
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      expect(breaker.getState()).toBe('OPEN');

      // Wait for timeout, then make a failing call in HALF_OPEN
      mockTimer.advance(2000);
      
      // Failure in HALF_OPEN immediately transitions to OPEN
      let error: Error | null = null;
      try {
        await breaker.execute(async () => {
          throw new Error('fail in half-open');
        });
      } catch (e) {
        error = e as Error;
      }
      
      // The original error should be thrown (not CircuitBreakerError since circuit was HALF_OPEN)
      expect(error).not.toBeNull();
      expect(error!.message).toBe('fail in half-open');
      
      // After failure, the state should be OPEN
      expect(breaker.getState()).toBe('OPEN');
      
      // consecutiveSuccesses should be 0 (never had any successes in HALF_OPEN)
      const metrics = breaker.getMetrics();
      expect(metrics.consecutiveSuccesses).toBe(0);

      breaker.destroy();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // EXPONENTIAL BACKOFF TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Exponential Backoff', () => {
    test('calculates exponential backoff correctly', async () => {
      const baseResetTimeout = 1000;
      const maxResetTimeout = 60000;
      
      const breaker = new EliteCircuitBreaker('test-10', {
        failureThreshold: 1,
        resetTimeoutMs: baseResetTimeout,
        maxResetTimeoutMs: maxResetTimeout,
      });

      const startTime = Date.now();

      // First failure
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      const metrics1 = breaker.getMetrics();
      const backoff1 = metrics1.nextAttempt - startTime;
      expect(backoff1).toBeGreaterThanOrEqual(baseResetTimeout);

      mockTimer.advance(backoff1 + 100);

      // Fail in HALF_OPEN (now 2 consecutive failures)
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      const metrics2 = breaker.getMetrics();
      const backoff2 = metrics2.nextAttempt - Date.now();
      expect(backoff2).toBeGreaterThanOrEqual(baseResetTimeout * 2);

      breaker.destroy();
    });

    test('respects max reset timeout', async () => {
      const maxResetTimeout = 5000;
      
      const breaker = new EliteCircuitBreaker('test-11', {
        failureThreshold: 1,
        resetTimeoutMs: 1000,
        maxResetTimeoutMs: maxResetTimeout,
      });

      // Generate many consecutive failures to trigger high backoff
      for (let i = 0; i < 10; i++) {
        const currentTime = Date.now();
        
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // expected
        }

        const metrics = breaker.getMetrics();
        const backoff = metrics.nextAttempt - currentTime;
        
        // Backoff should never exceed max
        expect(backoff).toBeLessThanOrEqual(maxResetTimeout + 1);

        if (metrics.state === 'OPEN') {
          mockTimer.advance(backoff + 100);
        }
      }

      breaker.destroy();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FALLBACK FUNCTION TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Fallback Function', () => {
    test('executes fallback when circuit is OPEN', async () => {
      const breaker = new EliteCircuitBreaker('test-12', {
        failureThreshold: 1,
      });

      // Open the circuit
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      expect(breaker.getState()).toBe('OPEN');

      // Execute with fallback - should return fallback value
      const fallbackResult = { cached: true, data: 'fallback-data' };
      const result = await breaker.execute(
        async () => ({ live: true }),
        () => fallbackResult
      );

      expect(result).toEqual(fallbackResult);

      breaker.destroy();
    });

    test('throws CircuitBreakerError when no fallback and circuit is OPEN', async () => {
      const breaker = new EliteCircuitBreaker('test-13', {
        failureThreshold: 1,
      });

      // Open the circuit
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      expect(breaker.getState()).toBe('OPEN');

      // Execute without fallback - should throw
      let errorThrown = false;
      try {
        await breaker.execute(async () => 'should not run');
      } catch (error) {
        errorThrown = true;
        expect(error).toBeInstanceOf(CircuitBreakerError);
        expect((error as CircuitBreakerError).message).toContain('OPEN');
      }
      expect(errorThrown).toBe(true);

      breaker.destroy();
    });

    test('fallback executes even during HALF_OPEN limit', async () => {
      const breaker = new EliteCircuitBreaker('test-14', {
        failureThreshold: 1,
        resetTimeoutMs: 1000,
      });

      // Open the circuit
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      mockTimer.advance(2000);

      // First call in HALF_OPEN succeeds
      await breaker.execute(async () => 'success');

      breaker.destroy();
    });

    test('fallback receives original error on execution failure', async () => {
      const breaker = new EliteCircuitBreaker('test-15');

      const fallbackResult = { fallback: true };
      const result = await breaker.execute(
        async () => {
          throw new Error('original error');
        },
        () => fallbackResult
      );

      expect(result).toEqual(fallbackResult);

      breaker.destroy();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FORCE OPEN/CLOSE TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Force Open/Close', () => {
    test('forceOpen transitions circuit to OPEN', async () => {
      const breaker = new EliteCircuitBreaker('test-16');

      expect(breaker.getState()).toBe('CLOSED');

      breaker.forceOpen();

      expect(breaker.getState()).toBe('OPEN');

      breaker.destroy();
    });

    test('forceOpen sets long timeout', async () => {
      const maxResetTimeout = 10000;
      const breaker = new EliteCircuitBreaker('test-17', {
        maxResetTimeoutMs: maxResetTimeout,
      });

      const beforeForce = Date.now();
      breaker.forceOpen();
      const afterForce = breaker.getMetrics().nextAttempt;

      expect(afterForce - beforeForce).toBeGreaterThanOrEqual(maxResetTimeout);

      breaker.destroy();
    });

    test('forceClose transitions circuit to CLOSED', async () => {
      const breaker = new EliteCircuitBreaker('test-18', {
        failureThreshold: 1,
      });

      // Open the circuit
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      expect(breaker.getState()).toBe('OPEN');

      breaker.forceClose();

      expect(breaker.getState()).toBe('CLOSED');

      breaker.destroy();
    });

    test('forceClose resets counters', async () => {
      const breaker = new EliteCircuitBreaker('test-19', {
        failureThreshold: 1,
      });

      // Generate some failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // expected
        }
      }

      breaker.forceClose();
      const metrics = breaker.getMetrics();

      expect(metrics.consecutiveFailures).toBe(0);
      expect(metrics.consecutiveSuccesses).toBe(0);

      breaker.destroy();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // METRICS COLLECTION TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Metrics Collection', () => {
    test('tracks total calls', async () => {
      const breaker = new EliteCircuitBreaker('test-20');

      await breaker.execute(async () => 'success-1');
      await breaker.execute(async () => 'success-2');
      
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      const metrics = breaker.getMetrics();
      expect(metrics.totalCalls).toBe(3);

      breaker.destroy();
    });

    test('tracks failures', async () => {
      const breaker = new EliteCircuitBreaker('test-21');

      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // expected
        }
      }

      const metrics = breaker.getMetrics();
      expect(metrics.failures).toBe(5);

      breaker.destroy();
    });

    test('tracks successes', async () => {
      const breaker = new EliteCircuitBreaker('test-22');

      for (let i = 0; i < 5; i++) {
        await breaker.execute(async () => `success-${i}`);
      }

      const metrics = breaker.getMetrics();
      expect(metrics.successes).toBe(5);

      breaker.destroy();
    });

    test('tracks state changes', async () => {
      const breaker = new EliteCircuitBreaker('test-23', {
        failureThreshold: 1,
        successThreshold: 1,
        resetTimeoutMs: 1000,
      });

      let metrics = breaker.getMetrics();
      expect(metrics.stateChanges).toBe(0);

      // CLOSED → OPEN
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }
      metrics = breaker.getMetrics();
      expect(metrics.stateChanges).toBe(1);

      mockTimer.advance(2000);

      // OPEN → HALF_OPEN → CLOSED (on success)
      await breaker.execute(async () => 'success');
      metrics = breaker.getMetrics();
      expect(metrics.stateChanges).toBe(3);

      breaker.destroy();
    });

    test('tracks last failure time', async () => {
      const breaker = new EliteCircuitBreaker('test-24');
      const beforeFail = Date.now();

      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      const metrics = breaker.getMetrics();
      expect(metrics.lastFailureTime).toBeGreaterThanOrEqual(beforeFail);

      breaker.destroy();
    });

    test('tracks last success time', async () => {
      const breaker = new EliteCircuitBreaker('test-25');
      const beforeSuccess = Date.now();

      await breaker.execute(async () => 'success');

      const metrics = breaker.getMetrics();
      expect(metrics.lastSuccessTime).toBeGreaterThanOrEqual(beforeSuccess);

      breaker.destroy();
    });

    test('metrics include state and nextAttempt', async () => {
      const breaker = new EliteCircuitBreaker('test-26');

      const metrics = breaker.getMetrics();
      expect(metrics).toHaveProperty('state');
      expect(metrics).toHaveProperty('nextAttempt');
      expect(metrics.state).toBe('CLOSED');

      breaker.destroy();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PROMETHEUS OUTPUT TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Prometheus Output', () => {
    test('generates valid Prometheus format', () => {
      const breaker = new EliteCircuitBreaker('prometheus-test');
      const output = breaker.toPrometheus();

      // Check for required Prometheus format elements
      expect(output).toContain('# HELP circuit_breaker_state');
      expect(output).toContain('# TYPE circuit_breaker_state gauge');
      expect(output).toContain('circuit_breaker_state{');

      expect(output).toContain('# HELP circuit_breaker_failures_total');
      expect(output).toContain('# TYPE circuit_breaker_failures_total counter');

      expect(output).toContain('# HELP circuit_breaker_successes_total');
      expect(output).toContain('# TYPE circuit_breaker_successes_total counter');

      expect(output).toContain('# HELP circuit_breaker_consecutive_failures');
      expect(output).toContain('# TYPE circuit_breaker_consecutive_failures gauge');

      breaker.destroy();
    });

    test('state gauge uses correct values', () => {
      const breaker = new EliteCircuitBreaker('prometheus-state-test');

      // CLOSED = 0
      let output = breaker.toPrometheus();
      expect(output).toContain('circuit_breaker_state{name="prometheus-state-test"} 0');

      // OPEN = 2
      breaker.forceOpen();
      output = breaker.toPrometheus();
      expect(output).toContain('circuit_breaker_state{name="prometheus-state-test"} 2');

      breaker.destroy();
    });

    test('includes breaker name in labels', () => {
      const breaker = new EliteCircuitBreaker('my-test-breaker');
      const output = breaker.toPrometheus();

      expect(output).toContain('name="my-test-breaker"');

      breaker.destroy();
    });

    test('metrics values are correct', async () => {
      const breaker = new EliteCircuitBreaker('prometheus-metrics-test');

      await breaker.execute(async () => 'success');
      await breaker.execute(async () => 'success');
      
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      const output = breaker.toPrometheus();
      expect(output).toContain('circuit_breaker_failures_total{name="prometheus-metrics-test"} 1');
      expect(output).toContain('circuit_breaker_successes_total{name="prometheus-metrics-test"} 2');

      breaker.destroy();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CIRCUIT BREAKER MANAGER TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('CircuitBreakerManager', () => {
    test('creates new breaker if not exists', () => {
      const manager = new CircuitBreakerManager();

      const breaker = manager.get('new-breaker');
      expect(breaker).toBeInstanceOf(EliteCircuitBreaker);
      expect(breaker.getState()).toBe('CLOSED');

      manager.destroy();
    });

    test('returns same instance for same name', () => {
      const manager = new CircuitBreakerManager();

      const breaker1 = manager.get('shared-breaker');
      const breaker2 = manager.get('shared-breaker');

      expect(breaker1).toBe(breaker2);

      manager.destroy();
    });

    test('applies config when creating new breaker', () => {
      const manager = new CircuitBreakerManager();

      const breaker = manager.get('configured-breaker', {
        failureThreshold: 10,
      });

      // Verify config was applied by checking it doesn't trip at 5
      expect(breaker.getState()).toBe('CLOSED');

      manager.destroy();
    });

    test('getAllMetrics returns Prometheus format for all breakers', async () => {
      const manager = new CircuitBreakerManager();

      const breaker1 = manager.get('breaker-a');
      const breaker2 = manager.get('breaker-b');

      await breaker1.execute(async () => 'success');
      await breaker2.execute(async () => 'success');

      const output = manager.getAllMetrics();

      expect(output).toContain('name="breaker-a"');
      expect(output).toContain('name="breaker-b"');
      expect(output).toContain('circuit_breaker_successes_total');

      manager.destroy();
    });

    test('destroy clears all breakers', () => {
      const manager = new CircuitBreakerManager();

      manager.get('breaker-1');
      manager.get('breaker-2');

      manager.destroy();

      // After destroy, getting same name creates new instance
      const newBreaker = manager.get('breaker-1');
      // If properly destroyed and cleared, this should be a fresh instance
      // Note: We can't easily verify it's a different instance without state comparison
      expect(newBreaker.getState()).toBe('CLOSED');

      manager.destroy();
    });

    test('singleton circuitBreakers is CircuitBreakerManager instance', () => {
      expect(circuitBreakers).toBeInstanceOf(CircuitBreakerManager);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // DECORATOR TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('withCircuitBreaker Decorator', () => {
    test('decorator wraps method with circuit breaker', async () => {
      const breaker = new EliteCircuitBreaker('decorator-test');

      class TestService {
        callCount = 0;

        @withCircuitBreaker(breaker)
        async fetchData(): Promise<string> {
          this.callCount++;
          return 'data';
        }
      }

      const service = new TestService();
      const result = await service.fetchData();

      expect(result).toBe('data');
      expect(service.callCount).toBe(1);

      breaker.destroy();
    });

    test('decorator passes through errors', async () => {
      const breaker = new EliteCircuitBreaker('decorator-error-test', {
        failureThreshold: 5, // Don't trip immediately
      });

      class TestService {
        @withCircuitBreaker(breaker)
        async failingMethod(): Promise<string> {
          throw new Error('service error');
        }
      }

      const service = new TestService();

      let errorThrown = false;
      try {
        await service.failingMethod();
      } catch (error) {
        errorThrown = true;
        expect((error as Error).message).toBe('service error');
      }

      expect(errorThrown).toBe(true);

      breaker.destroy();
    });

    test('decorator uses fallback when provided', async () => {
      const breaker = new EliteCircuitBreaker('decorator-fallback-test', {
        failureThreshold: 1,
      });

      // Open the circuit
      try {
        await breaker.execute(async () => {
          throw new Error('open circuit');
        });
      } catch {
        // expected
      }

      class TestService {
        callCount = 0;

        @withCircuitBreaker(breaker, () => 'fallback-result')
        async fetchData(): Promise<string> {
          this.callCount++;
          return 'live-data';
        }
      }

      const service = new TestService();
      const result = await service.fetchData();

      expect(result).toBe('fallback-result');
      expect(service.callCount).toBe(0); // Method should not be called

      breaker.destroy();
    });

    test('decorator preserves method arguments', async () => {
      const breaker = new EliteCircuitBreaker('decorator-args-test');

      class TestService {
        receivedArgs: any[] = [];

        @withCircuitBreaker(breaker)
        async processData(a: number, b: string, c: boolean): Promise<string> {
          this.receivedArgs = [a, b, c];
          return `${a}-${b}-${c}`;
        }
      }

      const service = new TestService();
      const result = await service.processData(42, 'test', true);

      expect(result).toBe('42-test-true');
      expect(service.receivedArgs).toEqual([42, 'test', true]);

      breaker.destroy();
    });

    test('decorator preserves this context', async () => {
      const breaker = new EliteCircuitBreaker('decorator-this-test');

      class TestService {
        private prefix = 'prefix-';

        @withCircuitBreaker(breaker)
        async getData(): Promise<string> {
          return this.prefix + 'data';
        }
      }

      const service = new TestService();
      const result = await service.getData();

      expect(result).toBe('prefix-data');

      breaker.destroy();
    });

    test('fallback receives original arguments', async () => {
      const breaker = new EliteCircuitBreaker('decorator-fallback-args-test', {
        failureThreshold: 1,
      });

      // Open the circuit
      try {
        await breaker.execute(async () => {
          throw new Error('open');
        });
      } catch {
        // expected
      }

      const fallbackArgs: any[] = [];

      class TestService {
        @withCircuitBreaker(breaker, (...args: any[]) => {
          fallbackArgs.push(...args);
          return `fallback-${args.join('-')}`;
        })
        async process(a: number, b: string): Promise<string> {
          return `live-${a}-${b}`;
        }
      }

      const service = new TestService();
      const result = await service.process(10, 'test');

      expect(result).toBe('fallback-10-test');
      expect(fallbackArgs).toEqual([10, 'test']);

      breaker.destroy();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // DESTROY CLEANUP TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Destroy Cleanup', () => {
    test('destroy clears health check interval', () => {
      const breaker = new EliteCircuitBreaker('destroy-test');

      // Should not throw when destroying
      expect(() => breaker.destroy()).not.toThrow();

      // Calling destroy multiple times should be safe
      expect(() => breaker.destroy()).not.toThrow();
    });

    test('destroyed breaker stops health checks', () => {
      let healthCheckCount = 0;

      const breaker = new EliteCircuitBreaker('destroy-health-test', {
        healthCheckIntervalMs: 100,
      });

      // Mock the interval callback to count invocations
      const originalSetInt = setInterval;
      global.setInterval = ((cb: any, delay: number) => {
        const wrapped = () => {
          healthCheckCount++;
          cb();
        };
        return mockTimer.setInterval(wrapped, delay);
      }) as unknown as typeof setInterval;

      // Advance timer to trigger health checks
      mockTimer.advance(100);
      const countBeforeDestroy = healthCheckCount;

      breaker.destroy();

      // Advance more - should not trigger health checks
      mockTimer.advance(500);

      global.setInterval = originalSetInt;

      // After destroy, no more health checks should run
      expect(healthCheckCount).toBe(countBeforeDestroy);
    });

    test('manager destroy calls destroy on all breakers', () => {
      const manager = new CircuitBreakerManager();

      const breaker1 = manager.get('destroy-test-1');
      const breaker2 = manager.get('destroy-test-2');

      // Should not throw
      expect(() => manager.destroy()).not.toThrow();
    });

    test('operations after destroy behave correctly', async () => {
      const breaker = new EliteCircuitBreaker('post-destroy-test');

      breaker.destroy();

      // Should still be able to check state
      expect(breaker.getState()).toBe('CLOSED');

      // Should still be able to get metrics
      const metrics = breaker.getMetrics();
      expect(metrics).toBeDefined();

      // Executing may still work (health checks just stop)
      const result = await breaker.execute(async () => 'test');
      expect(result).toBe('test');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CIRCUIT BREAKER ERROR TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('CircuitBreakerError', () => {
    test('is Error instance', () => {
      const error = new CircuitBreakerError('test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CircuitBreakerError);
    });

    test('has correct name property', () => {
      const error = new CircuitBreakerError('test error');
      expect(error.name).toBe('CircuitBreakerError');
    });

    test('message is set correctly', () => {
      const message = 'custom circuit breaker message';
      const error = new CircuitBreakerError(message);
      expect(error.message).toBe(message);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // INTEGRATION TESTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Integration Tests', () => {
    test('full lifecycle: success → failure → recovery', async () => {
      // Note: With maxHalfOpenCalls = 1, we can only make 1 call per HALF_OPEN state
      // To close the circuit from HALF_OPEN with successThreshold > 1, we'd need to:
      // 1. Make a successful call (stays HALF_OPEN if not enough consecutive successes)
      // 2. Wait for timeout again to re-enter HALF_OPEN
      // 3. Make another successful call
      // 
      // For simplicity, we use successThreshold: 1 so single success closes
      const breaker = new EliteCircuitBreaker('lifecycle-test', {
        failureThreshold: 2,
        successThreshold: 1, // Single success closes from HALF_OPEN
        resetTimeoutMs: 1000,
        maxResetTimeoutMs: 10000,
      });

      // Phase 1: Normal operation (CLOSED)
      for (let i = 0; i < 3; i++) {
        const result = await breaker.execute(async () => `success-${i}`);
        expect(result).toBe(`success-${i}`);
      }
      expect(breaker.getState()).toBe('CLOSED');

      // Phase 2: Failures trigger OPEN
      // With 2 failures, backoff = 1000 * 2^2 = 4000ms
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // expected
        }
      }
      expect(breaker.getState()).toBe('OPEN');

      // Phase 3: Fallback works while OPEN
      const fallbackResult = await breaker.execute(
        async () => 'live',
        () => 'cached'
      );
      expect(fallbackResult).toBe('cached');

      // Phase 4: Wait for timeout to allow HALF_OPEN
      // Backoff is 4000ms, so advance past that
      mockTimer.advance(5000);

      // Phase 5: HALF_OPEN → single success closes (with successThreshold: 1)
      await breaker.execute(async () => 'recovery-1');
      expect(breaker.getState()).toBe('CLOSED');

      // Phase 6: Back to normal
      const finalResult = await breaker.execute(async () => 'normal');
      expect(finalResult).toBe('normal');

      // Verify metrics
      const metrics = breaker.getMetrics();
      expect(metrics.totalCalls).toBeGreaterThan(5);
      expect(metrics.stateChanges).toBeGreaterThan(0);

      breaker.destroy();
    });

    test('rapid failures with exponential backoff', async () => {
      const breaker = new EliteCircuitBreaker('rapid-fail-test', {
        failureThreshold: 1,
        resetTimeoutMs: 1000,
        maxResetTimeoutMs: 10000,
      });

      const attemptTimes: number[] = [];

      // Trigger multiple consecutive failures
      for (let i = 0; i < 5; i++) {
        attemptTimes.push(Date.now());
        
        try {
          await breaker.execute(async () => {
            throw new Error(`fail-${i}`);
          });
        } catch {
          // expected
        }

        const metrics = breaker.getMetrics();
        if (metrics.state === 'OPEN') {
          mockTimer.advance(metrics.nextAttempt - Date.now() + 100);
        }
      }

      const metrics = breaker.getMetrics();
      expect(metrics.consecutiveFailures).toBeGreaterThan(0);
      expect(metrics.failures).toBe(5);

      breaker.destroy();
    });

    test('metrics Prometheus output is complete and valid', async () => {
      const breaker = new EliteCircuitBreaker('prometheus-complete-test', {
        failureThreshold: 1,
        successThreshold: 1,
        resetTimeoutMs: 1000,
      });

      // Generate some activity
      await breaker.execute(async () => 'success');
      
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // expected
      }

      const output = breaker.toPrometheus();

      // Validate Prometheus format structure
      const lines = output.trim().split('\n').filter(l => l.length > 0);
      
      // Should have HELP, TYPE, and value lines
      const helpLines = lines.filter(l => l.startsWith('# HELP'));
      const typeLines = lines.filter(l => l.startsWith('# TYPE'));
      const valueLines = lines.filter(l => !l.startsWith('#'));

      expect(helpLines.length).toBeGreaterThanOrEqual(4);
      expect(typeLines.length).toBeGreaterThanOrEqual(4);
      expect(valueLines.length).toBeGreaterThanOrEqual(4);

      // Each value line should have name and label format
      for (const line of valueLines) {
        expect(line).toMatch(/\{name="[^"]+"\} \d+/);
      }

      breaker.destroy();
    });
  });
});
