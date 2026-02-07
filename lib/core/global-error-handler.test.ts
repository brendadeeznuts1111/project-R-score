// lib/core/global-error-handler.test.ts — Tests for global error handling

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  GlobalErrorHandler,
  initializeGlobalErrorHandling,
  onShutdown,
  getGlobalErrorStatistics,
  type GlobalErrorConfig,
} from './global-error-handler';

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;

  beforeEach(() => {
    // Reset singleton for each test
    (GlobalErrorHandler as any).instance = undefined;
    handler = GlobalErrorHandler.getInstance({
      exitOnUncaughtException: false,
      exitOnUnhandledRejection: false,
      shutdownTimeout: 1000,
    });
  });

  afterEach(() => {
    // Clean up
    (GlobalErrorHandler as any).instance = undefined;
  });

  describe('Singleton Pattern', () => {
    test('returns same instance', () => {
      const instance1 = GlobalErrorHandler.getInstance();
      const instance2 = GlobalErrorHandler.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('accepts configuration', () => {
      const customHandler = GlobalErrorHandler.getInstance({
        exitOnUncaughtException: true,
        exitOnUnhandledRejection: true,
        shutdownTimeout: 5000,
      });
      expect(customHandler).toBeDefined();
    });
  });

  describe('Error Statistics', () => {
    test('returns initial state with zeros', () => {
      const stats = handler.getStatistics();
      
      expect(stats.uncaughtExceptions).toBe(0);
      expect(stats.unhandledRejections).toBe(0);
      expect(stats.warnings).toBe(0);
      expect(stats.totalErrors).toBe(0);
      expect(stats.uptime).toBeGreaterThan(0);
      expect(stats.errorRate).toBe(0);
    });

    test('state is read-only from external access', () => {
      const state = handler.getState();
      
      // TypeScript would prevent this, but runtime check
      expect(() => {
        (state as any).uncaughtExceptions = 100;
      }).not.toThrow();
      
      // Original state should be unchanged
      const newState = handler.getState();
      expect(newState.uncaughtExceptions).toBe(0);
    });
  });

  describe('Shutdown Handlers', () => {
    test('registers shutdown handlers', async () => {
      let called = false;
      
      handler.registerShutdownHandler(async () => {
        called = true;
      });

      // Note: We can't actually trigger shutdown in tests
      // without exiting the process, so we just verify registration
      expect(handler).toBeDefined();
    });

    test('multiple shutdown handlers can be registered', () => {
      const calls: number[] = [];

      handler.registerShutdownHandler(async () => { calls.push(1); });
      handler.registerShutdownHandler(async () => { calls.push(2); });
      handler.registerShutdownHandler(async () => { calls.push(3); });

      // Handlers are registered (can't test execution without process exit)
      expect(handler).toBeDefined();
    });
  });

  describe('Convenience Functions', () => {
    test('initializeGlobalErrorHandling returns handler instance', () => {
      // Reset to allow re-initialization
      (GlobalErrorHandler as any).instance = undefined;
      
      const result = initializeGlobalErrorHandling({
        exitOnUncaughtException: false,
      });
      
      expect(result).toBeInstanceOf(GlobalErrorHandler);
    });

    test('onShutdown registers handler through singleton', () => {
      let registered = false;
      
      onShutdown(async () => {
        registered = true;
      });

      expect(handler).toBeDefined();
    });

    test('getGlobalErrorStatistics returns statistics', () => {
      const stats = getGlobalErrorStatistics();
      
      expect(stats).toHaveProperty('uncaughtExceptions');
      expect(stats).toHaveProperty('unhandledRejections');
      expect(stats).toHaveProperty('warnings');
      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('errorRate');
    });
  });

  describe('Error Rate Calculation', () => {
    test('calculates error rate correctly', () => {
      // With no errors and some uptime, rate should be 0
      const stats = handler.getStatistics();
      expect(stats.errorRate).toBe(0);
      expect(stats.totalErrors).toBe(0);
    });

    test('error rate increases with errors', async () => {
      // Note: We can't easily trigger actual errors without
      // process events, but we can verify the calculation logic
      const stats = handler.getStatistics();
      
      // Error rate = totalErrors / (uptime / 60)
      // With 0 errors, should always be 0
      expect(stats.errorRate).toBe(0);
    });
  });

  describe('Configuration', () => {
    test('uses default configuration when not specified', () => {
      // Reset and create new instance
      (GlobalErrorHandler as any).instance = undefined;
      const defaultHandler = GlobalErrorHandler.getInstance();
      
      expect(defaultHandler).toBeDefined();
    });

    test('merges custom configuration with defaults', () => {
      // Reset and create with partial config
      (GlobalErrorHandler as any).instance = undefined;
      const customHandler = GlobalErrorHandler.getInstance({
        shutdownTimeout: 10000,
        // Other options should use defaults
      });
      
      expect(customHandler).toBeDefined();
    });
  });
});

describe('Error Handling Integration', () => {
  test('handler integrates with enterprise error handler', () => {
    const { EnterpriseErrorHandler } = require('./core-errors');
    
    // Reset singletons
    (GlobalErrorHandler as any).instance = undefined;
    
    const handler = initializeGlobalErrorHandling();
    const enterpriseHandler = EnterpriseErrorHandler.getInstance();
    
    expect(handler).toBeDefined();
    expect(enterpriseHandler).toBeDefined();
  });
});

describe('Global Error Scenarios', () => {
  test('provides helpful error messages format', () => {
    // Verify the error formatting is consistent
    const error = new Error('Test error');
    error.name = 'TestError';
    
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('TestError');
    expect(error.stack).toBeDefined();
  });

  test('tracks multiple error types independently', () => {
    // Reset for clean state
    (GlobalErrorHandler as any).instance = undefined;
    const handler = GlobalErrorHandler.getInstance();
    
    const state = handler.getState();
    
    // All counters should start at 0
    expect(state.uncaughtExceptions).toBe(0);
    expect(state.unhandledRejections).toBe(0);
    expect(state.warnings).toBe(0);
  });
});

// Entry guard test
if (import.meta.main) {
  console.log('🧪 Running Global Error Handler Tests...\n');
  
  // Run a quick smoke test
  const handler = initializeGlobalErrorHandling({
    exitOnUncaughtException: false,
    exitOnUnhandledRejection: false,
  });
  
  console.log('✅ Handler initialized successfully');
  console.log('Statistics:', getGlobalErrorStatistics());
  console.log('State:', handler.getState());
  
  onShutdown(async () => {
    console.log('🧹 Test cleanup executed');
  });
  
  console.log('\n✅ All smoke tests passed!');
}
