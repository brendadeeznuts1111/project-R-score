/**
 * Component #58: OnTestFinished-Finalizer
 * Logic Tier: Level 2 (Test)
 * Resource Tax: Heap <0.5MB
 * Parity Lock: 2u3v...4w5x
 * Protocol: bun:test 1.3.3
 *
 * Cleanup after afterEach; supports async/done callbacks.
 * Provides Jest-compatible onTestFinished API for resource cleanup.
 *
 * @module infrastructure/ontestfinished-finalizer
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * Test state for tracking finalizers
 */
interface TestState {
  id: string;
  name?: string;
  finished: boolean;
  callbacks: FinalizerCallback[];
  startTime: number;
}

/**
 * Finalizer callback type
 */
export type FinalizerCallback = () => void | Promise<void>;

/**
 * Finalizer registration result
 */
export interface FinalizerResult {
  registered: boolean;
  testId?: string;
  callbackCount: number;
}

/**
 * OnTestFinished Finalizer for test cleanup
 * Runs cleanup callbacks after all test hooks complete
 */
export class OnTestFinishedFinalizer {
  private static testContexts = new Map<string, TestState>();
  private static currentTestId: string | null = null;
  private static finalizerCount = 0;

  /**
   * Set current test context
   */
  static setCurrentTest(testId: string, testName?: string): void {
    if (!isFeatureEnabled('TEST_VALIDATION')) return;

    this.currentTestId = testId;

    if (!this.testContexts.has(testId)) {
      this.testContexts.set(testId, {
        id: testId,
        name: testName,
        finished: false,
        callbacks: [],
        startTime: performance.now(),
      });
    }
  }

  /**
   * Clear current test context
   */
  static clearCurrentTest(): void {
    this.currentTestId = null;
  }

  /**
   * Register a finalizer callback
   */
  static register(callback: FinalizerCallback, testId?: string): FinalizerResult {
    if (!isFeatureEnabled('TEST_VALIDATION')) {
      return { registered: false, callbackCount: 0 };
    }

    const id = testId || this.currentTestId;

    if (!id) {
      console.warn('[OnTestFinished] No active test context');
      return { registered: false, callbackCount: 0 };
    }

    const context = this.testContexts.get(id);

    if (!context) {
      console.warn('[OnTestFinished] Test context not found:', id);
      return { registered: false, callbackCount: 0 };
    }

    if (context.finished) {
      console.warn('[OnTestFinished] Test already finished:', id);
      return { registered: false, callbackCount: context.callbacks.length };
    }

    context.callbacks.push(callback);
    this.finalizerCount++;

    return {
      registered: true,
      testId: id,
      callbackCount: context.callbacks.length,
    };
  }

  /**
   * Run all finalizers for a test
   */
  static async runFinalizers(testId: string): Promise<{
    success: boolean;
    errors: Error[];
    duration: number;
  }> {
    if (!isFeatureEnabled('TEST_VALIDATION')) {
      return { success: true, errors: [], duration: 0 };
    }

    const context = this.testContexts.get(testId);

    if (!context) {
      return { success: true, errors: [], duration: 0 };
    }

    const startTime = performance.now();
    const errors: Error[] = [];

    // Run callbacks in reverse order (LIFO)
    const callbacks = [...context.callbacks].reverse();

    for (const callback of callbacks) {
      try {
        await Promise.resolve(callback());
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
        console.error('[OnTestFinished] Callback error:', error);
      }
    }

    // Mark as finished and cleanup
    context.finished = true;
    context.callbacks.length = 0;

    const duration = performance.now() - startTime;

    // Log completion
    if (isFeatureEnabled('DEBUG')) {
      console.debug('[OnTestFinished] Finalized', {
        component: 58,
        testId,
        testName: context.name,
        callbackCount: callbacks.length,
        errors: errors.length,
        duration: `${duration.toFixed(2)}ms`,
      });
    }

    return {
      success: errors.length === 0,
      errors,
      duration,
    };
  }

  /**
   * Cleanup completed test contexts
   */
  static cleanup(testId: string): void {
    this.testContexts.delete(testId);
  }

  /**
   * Get pending finalizer count for a test
   */
  static getPendingCount(testId: string): number {
    const context = this.testContexts.get(testId);
    return context?.callbacks.length ?? 0;
  }

  /**
   * Get total registered finalizers
   */
  static getTotalFinalizerCount(): number {
    return this.finalizerCount;
  }

  /**
   * Reset all state (for testing)
   */
  static reset(): void {
    this.testContexts.clear();
    this.currentTestId = null;
    this.finalizerCount = 0;
  }
}

/**
 * Jest/Vitest-compatible onTestFinished function
 * Register cleanup callbacks that run after afterEach hooks
 */
export function onTestFinished(callback: FinalizerCallback): FinalizerResult {
  return OnTestFinishedFinalizer.register(callback);
}

/**
 * Test wrapper that automatically handles finalizers
 */
export function withFinalizers<T>(
  testFn: () => T | Promise<T>,
  testId?: string
): () => Promise<T> {
  return async () => {
    const id = testId || `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    OnTestFinishedFinalizer.setCurrentTest(id);

    try {
      const result = await Promise.resolve(testFn());
      await OnTestFinishedFinalizer.runFinalizers(id);
      return result;
    } finally {
      OnTestFinishedFinalizer.cleanup(id);
      OnTestFinishedFinalizer.clearCurrentTest();
    }
  };
}

/**
 * Decorator for test functions
 */
export function finalized<T extends (...args: unknown[]) => unknown>(
  _target: unknown,
  _propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> {
  const originalMethod = descriptor.value;

  if (!originalMethod) return descriptor;

  descriptor.value = function (this: unknown, ...args: unknown[]) {
    const testId = `test-${Date.now()}`;
    OnTestFinishedFinalizer.setCurrentTest(testId);

    try {
      const result = originalMethod.apply(this, args);

      if (result instanceof Promise) {
        return result.finally(async () => {
          await OnTestFinishedFinalizer.runFinalizers(testId);
          OnTestFinishedFinalizer.cleanup(testId);
          OnTestFinishedFinalizer.clearCurrentTest();
        });
      }

      // Sync function - run finalizers synchronously if possible
      OnTestFinishedFinalizer.runFinalizers(testId);
      OnTestFinishedFinalizer.cleanup(testId);
      OnTestFinishedFinalizer.clearCurrentTest();

      return result;
    } catch (error) {
      OnTestFinishedFinalizer.runFinalizers(testId);
      OnTestFinishedFinalizer.cleanup(testId);
      OnTestFinishedFinalizer.clearCurrentTest();
      throw error;
    }
  } as T;

  return descriptor;
}

/**
 * Enforce serial execution for tests using onTestFinished
 * (Not supported in concurrent tests)
 */
export function enforceSerial(testOptions: { concurrent?: boolean }): void {
  if (!isFeatureEnabled('TEST_VALIDATION')) return;

  if (testOptions.concurrent) {
    throw new Error(
      'onTestFinished is not supported in concurrent tests. Use test.serial or remove .concurrent.'
    );
  }
}

/**
 * Zero-cost exports for disabled feature
 */
export const registerFinalizer = isFeatureEnabled('TEST_VALIDATION')
  ? OnTestFinishedFinalizer.register.bind(OnTestFinishedFinalizer)
  : () => ({ registered: false, callbackCount: 0 });

export const runFinalizers = isFeatureEnabled('TEST_VALIDATION')
  ? OnTestFinishedFinalizer.runFinalizers.bind(OnTestFinishedFinalizer)
  : async () => ({ success: true, errors: [], duration: 0 });
