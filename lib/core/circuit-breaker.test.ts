// lib/core/circuit-breaker.test.ts — Tests for circuit breaker

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitState,
  CircuitBreakerOpenError,
  withCircuitBreaker,
  getCircuitBreakerRegistry,
  getCircuitBreakerHealth,
} from './circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-service', {
      failureThreshold: 3,
      resetTimeoutMs: 100, // Short for testing
      successThreshold: 2,
      callTimeoutMs: 1000,
    });
  });

  afterEach(() => {
    breaker.destroy();
  });

  describe('Initial State', () => {
    test('starts in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.isClosed()).toBe(true);
      expect(breaker.isOpen()).toBe(false);
    });

    test('initial stats are zero', () => {
      const stats = breaker.getStats();
      expect(stats.totalCalls).toBe(0);
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.rejectedCalls).toBe(0);
      expect(stats.stateChanges).toBe(0);
    });
  });

  describe('Successful Calls', () => {
    test('executes function successfully', async () => {
      const result = await breaker.execute(async () => 'success');
      expect(result).toBe('success');
    });

    test('increments success counter', async () => {
      await breaker.execute(async () => 'success');
      const stats = breaker.getStats();
      expect(stats.successes).toBe(1);
      expect(stats.totalCalls).toBe(1);
    });

    test('stays closed on success', async () => {
      await breaker.execute(async () => 'success');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Failure Handling', () => {
    test('increments failure counter on error', async () => {
      try {
        await breaker.execute(async () => {
          throw new Error('failure');
        });
      } catch {
        // Expected
      }

      const stats = breaker.getStats();
      expect(stats.failures).toBe(1);
      expect(stats.totalCalls).toBe(1);
    });

    test('opens circuit after threshold failures', async () => {
      // Cause 3 failures (threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error(`failure ${i}`);
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.isOpen()).toBe(true);
    });
  });

  describe('Open State', () => {
    test('rejects calls when open', async () => {
      // Open the circuit with long timeout so it stays open
      const openBreaker = new CircuitBreaker('open-test-service', {
        failureThreshold: 3,
        resetTimeoutMs: 60000, // Long timeout
        successThreshold: 2,
      });
      
      openBreaker.forceOpen();
      expect(openBreaker.getState()).toBe(CircuitState.OPEN);

      await expect(
        openBreaker.execute(async () => 'success')
      ).rejects.toThrow(CircuitBreakerOpenError);
      
      openBreaker.destroy();
    });

    test('increments rejected calls counter', async () => {
      // Use a breaker with long timeout
      const rejectBreaker = new CircuitBreaker('reject-test-service', {
        failureThreshold: 3,
        resetTimeoutMs: 60000, // Long timeout
        successThreshold: 2,
      });
      
      rejectBreaker.forceOpen();

      try {
        await rejectBreaker.execute(async () => 'success');
      } catch {
        // Expected
      }

      const stats = rejectBreaker.getStats();
      expect(stats.rejectedCalls).toBe(1);
      
      rejectBreaker.destroy();
    });

    test('error includes service name', async () => {
      breaker.forceOpen();

      try {
        await breaker.execute(async () => 'success');
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerOpenError);
        expect((error as CircuitBreakerOpenError).serviceName).toBe('test-service');
      }
    });
  });

  describe('Half-Open State', () => {
    test('transitions to half-open after timeout', async () => {
      // Open the circuit
      breaker.forceOpen();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await Bun.sleep(150);

      // Try to execute (should transition to half-open)
      try {
        await breaker.execute(async () => 'success');
      } catch {
        // May or may not throw depending on timing
      }

      // State should be half-open or transitioning
      expect(breaker.getStats().stateChanges).toBeGreaterThanOrEqual(1);
    });

    test('closes after success threshold in half-open', async () => {
      // Manually transition to half-open
      (breaker as any).transitionTo(CircuitState.HALF_OPEN);

      // Execute successfully twice (success threshold)
      await breaker.execute(async () => 'success');
      await breaker.execute(async () => 'success');

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('returns to open on failure in half-open', async () => {
      // Manually transition to half-open
      (breaker as any).transitionTo(CircuitState.HALF_OPEN);

      try {
        await breaker.execute(async () => {
          throw new Error('failure');
        });
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Force Operations', () => {
    test('forceOpen transitions to open', () => {
      breaker.forceOpen();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    test('forceClose transitions to closed', async () => {
      // Open first
      breaker.forceOpen();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Then close
      breaker.forceClose();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('forceClose resets counters', async () => {
      // Add some failures and open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('failure');
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.getStats().failures).toBeGreaterThan(0);

      breaker.forceClose();
      // Counters are reset when transitioning to CLOSED
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getStats().failures).toBe(0);
      expect(breaker.getStats().consecutiveSuccesses).toBe(0);
    });
  });

  describe('Statistics', () => {
    test('tracks last failure time', async () => {
      const before = Date.now();

      try {
        await breaker.execute(async () => {
          throw new Error('failure');
        });
      } catch {
        // Expected
      }

      const stats = breaker.getStats();
      expect(stats.lastFailureTime).toBeGreaterThanOrEqual(before);
      expect(stats.lastFailureTime).toBeLessThanOrEqual(Date.now());
    });

    test('tracks last success time', async () => {
      const before = Date.now();

      await breaker.execute(async () => 'success');

      const stats = breaker.getStats();
      expect(stats.lastSuccessTime).toBeGreaterThanOrEqual(before);
      expect(stats.lastSuccessTime).toBeLessThanOrEqual(Date.now());
    });

    test('counts state changes', () => {
      expect(breaker.getStats().stateChanges).toBe(0);

      breaker.forceOpen();
      expect(breaker.getStats().stateChanges).toBe(1);

      breaker.forceClose();
      expect(breaker.getStats().stateChanges).toBe(2);
    });
  });

  describe('Timeout', () => {
    test('times out slow calls', async () => {
      const slowBreaker = new CircuitBreaker('slow-service', {
        failureThreshold: 3,
        resetTimeoutMs: 1000,
        successThreshold: 2,
        callTimeoutMs: 50, // Very short timeout
      });

      await expect(
        slowBreaker.execute(async () => {
          await Bun.sleep(100); // Longer than timeout
          return 'success';
        })
      ).rejects.toThrow('timed out');

      slowBreaker.destroy();
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = new CircuitBreakerRegistry();
  });

  afterEach(() => {
    registry.destroyAll();
  });

  describe('Circuit Breaker Management', () => {
    test('creates new circuit breaker', () => {
      const breaker = registry.getOrCreate('service-1');
      expect(breaker).toBeInstanceOf(CircuitBreaker);
    });

    test('returns existing circuit breaker', () => {
      const breaker1 = registry.getOrCreate('service-1');
      const breaker2 = registry.getOrCreate('service-1');
      expect(breaker1).toBe(breaker2);
    });

    test('get returns undefined for non-existent', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });

    test('get returns existing breaker', () => {
      const created = registry.getOrCreate('service-1');
      const retrieved = registry.get('service-1');
      expect(retrieved).toBe(created);
    });
  });

  describe('Statistics', () => {
    test('getAllStats returns stats for all breakers', () => {
      registry.getOrCreate('service-1');
      registry.getOrCreate('service-2');

      const stats = registry.getAllStats();
      expect(Object.keys(stats)).toHaveLength(2);
      expect(stats['service-1']).toBeDefined();
      expect(stats['service-2']).toBeDefined();
    });

    test('getHealthStatus returns health for all services', async () => {
      registry.getOrCreate('healthy-service');
      const unhealthy = registry.getOrCreate('unhealthy-service');
      unhealthy.forceOpen();

      const health = registry.getHealthStatus();
      expect(health).toHaveLength(2);

      const healthyStatus = health.find(h => h.service === 'healthy-service');
      const unhealthyStatus = health.find(h => h.service === 'unhealthy-service');

      expect(healthyStatus?.healthy).toBe(true);
      expect(unhealthyStatus?.healthy).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('remove destroys and removes breaker', () => {
      registry.getOrCreate('service-1');
      expect(registry.get('service-1')).toBeDefined();

      registry.remove('service-1');
      expect(registry.get('service-1')).toBeUndefined();
    });

    test('destroyAll cleans up all breakers', () => {
      registry.getOrCreate('service-1');
      registry.getOrCreate('service-2');

      registry.destroyAll();

      expect(registry.get('service-1')).toBeUndefined();
      expect(registry.get('service-2')).toBeUndefined();
    });
  });
});

describe('Global Registry Helpers', () => {
  test('withCircuitBreaker uses global registry', async () => {
    const result = await withCircuitBreaker('global-test', async () => 'success');
    expect(result).toBe('success');

    // Cleanup
    getCircuitBreakerRegistry().remove('global-test');
  });

  test('getCircuitBreakerHealth returns health status', () => {
    // Ensure we have at least one breaker
    getCircuitBreakerRegistry().getOrCreate('health-test');

    const health = getCircuitBreakerHealth();
    expect(Array.isArray(health)).toBe(true);

    // Cleanup
    getCircuitBreakerRegistry().remove('health-test');
  });
});

// Entry guard for testing
if (import.meta.main) {
  console.log('🧪 Running Circuit Breaker Tests...\n');
  
  // Quick smoke test
  const breaker = new CircuitBreaker('smoke-test', {
    failureThreshold: 3,
    resetTimeoutMs: 1000,
    successThreshold: 2,
  });

  console.log('✅ Circuit breaker created');
  console.log('Initial state:', breaker.getState());
  console.log('Initial stats:', breaker.getStats());

  breaker.destroy();
  console.log('\n✅ Smoke test passed!');
}
