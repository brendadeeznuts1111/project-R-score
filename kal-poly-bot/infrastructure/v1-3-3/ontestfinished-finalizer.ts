import "./types.d.ts";
// infrastructure/v1-3-3/ontestfinished-finalizer.ts
// Component #58: onTestFinished Finalizer for Clean Test State


// Export interfaces for type safety
export interface FinalizerFunction {
  (): void | Promise<void>;
}

export interface TestContext {
  id: string;
  name: string;
  startTime: number;
  finalizers: FinalizerFunction[];
  metadata: Record<string, unknown>;
}

export interface FinalizerMetrics {
  totalTests: number;
  finalizersRegistered: number;
  finalizersExecuted: number;
  averageCleanupTime: number;
  failedCleanups: number;
}

// Test finalization for Kalman backtesting
export class TestFinalizer {
  private static activeTests = new Map<string, TestContext>();
  private static globalFinalizers: FinalizerFunction[] = [];
  private static metrics: FinalizerMetrics = {
    totalTests: 0,
    finalizersRegistered: 0,
    finalizersExecuted: 0,
    averageCleanupTime: 0,
    failedCleanups: 0,
  };

  // Register a finalizer for the current test
  static onTestFinished(finalizer: FinalizerFunction): void {
    if (!process.env.FEATURE_ON_TEST_FINISHED === "1") {
      // Execute immediately when disabled
      finalizer();
      return;
    }

    const currentTest = this.getCurrentTest();
    if (currentTest) {
      currentTest.finalizers.push(finalizer);
      this.metrics.finalizersRegistered++;
    } else {
      // Register as global finalizer if no active test
      this.globalFinalizers.push(finalizer);
    }
  }

  // Wrap a test function with automatic finalization
  static withFinalizers<T extends (...args: any[]) => Promise<any>>(
    testFn: T,
    options?: { timeout?: number; metadata?: Record<string, unknown> }
  ): T {
    if (!process.env.FEATURE_ON_TEST_FINISHED === "1") {
      return testFn;
    }

    return (async (...args: any[]) => {
      const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const testContext: TestContext = {
        id: testId,
        name: testFn.name || "anonymous",
        startTime: performance.now(),
        finalizers: [],
        metadata: options?.metadata || {},
      };

      this.activeTests.set(testId, testContext);
      this.metrics.totalTests++;

      try {
        const result = await testFn(...args);
        return result;
      } finally {
        await this.runFinalizers(testContext);
        this.activeTests.delete(testId);
      }
    }) as T;
  }

  // Run all finalizers for a test
  private static async runFinalizers(testContext: TestContext): Promise<void> {
    const startTime = performance.now();

    try {
      // Run test-specific finalizers
      for (const finalizer of testContext.finalizers) {
        try {
          await finalizer();
          this.metrics.finalizersExecuted++;
        } catch (error) {
          console.error(`[FINALIZER] Error in test finalizer: ${error}`);
          this.metrics.failedCleanups++;
        }
      }

      // Run global finalizers
      for (const finalizer of this.globalFinalizers) {
        try {
          await finalizer();
        } catch (error) {
          console.error(`[FINALIZER] Error in global finalizer: ${error}`);
          this.metrics.failedCleanups++;
        }
      }

      const cleanupTime = performance.now() - startTime;
      this.updateAverageCleanupTime(cleanupTime);

      console.log(
        `[FINALIZER] Completed ${testContext.finalizers.length} finalizers in ${cleanupTime.toFixed(2)}ms`
      );
    } catch (error) {
      console.error(`[FINALIZER] Critical error during finalization: ${error}`);
      this.metrics.failedCleanups++;
    }
  }

  // Get current test context
  private static getCurrentTest(): TestContext | null {
    const tests = Array.from(this.activeTests.values());
    return tests.length > 0 ? tests[tests.length - 1] : null;
  }

  // Update average cleanup time
  private static updateAverageCleanupTime(cleanupTime: number): void {
    const totalFinalizations =
      this.metrics.finalizersExecuted + this.metrics.failedCleanups;
    if (totalFinalizations > 0) {
      this.metrics.averageCleanupTime =
        (this.metrics.averageCleanupTime * (totalFinalizations - 1) +
          cleanupTime) /
        totalFinalizations;
    }
  }

  // Clear all persistent state for Kalman patterns
  static clearPatternState(patternId: number): void {
    if (typeof localStorage !== "undefined") {
      const stateKeys = Object.keys(localStorage).filter(
        (k) =>
          k.includes(`pattern-${patternId}`) ||
          k.includes(`kalman-${patternId}`)
      );
      stateKeys.forEach((k) => localStorage.removeItem(k));
    }

    // Clear in-memory caches
    if (typeof globalThis !== "undefined" && globalThis.__kalman_cache) {
      delete globalThis.__kalman_cache[`pattern-${patternId}`];
    }

    console.log(`[FINALIZER] Cleared state for Pattern #${patternId}`);
  }

  // Clear all test state
  static clearAllTestState(): void {
    if (typeof localStorage !== "undefined") {
      const testKeys = Object.keys(localStorage).filter(
        (k) =>
          k.includes("pattern-") || k.includes("kalman-") || k.includes("test-")
      );
      testKeys.forEach((k) => localStorage.removeItem(k));
    }

    // Clear global caches
    if (typeof globalThis !== "undefined") {
      delete globalThis.__kalman_cache;
      delete globalThis.__test_state;
    }

    console.log("[FINALIZER] Cleared all test state");
  }

  // Get finalizer metrics
  static getMetrics(): FinalizerMetrics {
    return { ...this.metrics };
  }

  // Reset metrics
  static resetMetrics(): void {
    this.metrics = {
      totalTests: 0,
      finalizersRegistered: 0,
      finalizersExecuted: 0,
      averageCleanupTime: 0,
      failedCleanups: 0,
    };
  }

  // Create Kalman-specific finalizer
  static createKalmanFinalizer(patternId: number): FinalizerFunction {
    return async () => {
      console.log(`[FINALIZER] Cleaning up Kalman Pattern #${patternId}`);

      // Clear pattern state
      this.clearPatternState(patternId);

      // Reset any Kalman filter instances
      if (typeof globalThis !== "undefined" && globalThis.__kalman_filters) {
        delete globalThis.__kalman_filters[patternId];
      }

      // Clear WebSocket subscriptions for this pattern
      if (typeof globalThis !== "undefined" && globalThis.__ws_subscriptions) {
        const patternSubs = globalThis.__ws_subscriptions.filter(
          (sub: any) => sub.patternId !== patternId
        );
        globalThis.__ws_subscriptions = patternSubs;
      }

      // Force garbage collection if available
      if (typeof globalThis !== "undefined" && globalThis.gc) {
        globalThis.gc();
      }
    };
  }

  // Setup automatic cleanup for Kalman tests
  static setupKalmanTestCleanup(patternId: number): void {
    if (!process.env.FEATURE_ON_TEST_FINISHED === "1") return;

    const finalizer = this.createKalmanFinalizer(patternId);
    this.onTestFinished(finalizer);
  }

  // Run cleanup with timeout
  static async runCleanupWithTimeout(
    finalizer: FinalizerFunction,
    timeoutMs: number = 5000
  ): Promise<void> {
    if (!process.env.FEATURE_ON_TEST_FINISHED === "1") {
      await finalizer();
      return;
    }

    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Cleanup timeout after ${timeoutMs}ms`)),
        timeoutMs
      );
    });

    try {
      await Promise.race([finalizer(), timeoutPromise]);
    } catch (error) {
      console.error(`[FINALIZER] Cleanup failed: ${error}`);
      throw error;
    }
  }

  // Get active test contexts
  static getActiveTests(): TestContext[] {
    return Array.from(this.activeTests.values());
  }

  // Force cleanup of all tests
  static async forceCleanupAll(): Promise<void> {
    const activeTests = Array.from(this.activeTests.entries());

    for (const [testId, testContext] of activeTests) {
      try {
        await this.runFinalizers(testContext);
        this.activeTests.delete(testId);
      } catch (error) {
        console.error(
          `[FINALIZER] Force cleanup failed for ${testId}: ${error}`
        );
      }
    }

    // Run global finalizers
    for (const finalizer of this.globalFinalizers) {
      try {
        await finalizer();
      } catch (error) {
        console.error(`[FINALIZER] Global finalizer failed: ${error}`);
      }
    }

    console.log("[FINALIZER] Force cleanup completed");
  }
}

// Zero-cost export
export const {
  onTestFinished,
  withFinalizers,
  clearPatternState,
  clearAllTestState,
  getMetrics,
  resetMetrics,
  createKalmanFinalizer,
  setupKalmanTestCleanup,
  runCleanupWithTimeout,
  getActiveTests,
  forceCleanupAll,
} = process.env.FEATURE_ON_TEST_FINISHED === "1"
  ? TestFinalizer
  : {
      onTestFinished: (fn: FinalizerFunction) => fn(),
      withFinalizers: <T extends (...args: any[]) => Promise<any>>(fn: T) => fn,
      clearPatternState: () => {},
      clearAllTestState: () => {},
      getMetrics: () => ({
        totalTests: 0,
        finalizersRegistered: 0,
        finalizersExecuted: 0,
        averageCleanupTime: 0,
        failedCleanups: 0,
      }),
      resetMetrics: () => {},
      createKalmanFinalizer: () => async () => {},
      setupKalmanTestCleanup: () => {},
      runCleanupWithTimeout: async (fn: FinalizerFunction) => await fn(),
      getActiveTests: () => [],
      forceCleanupAll: async () => {},
    };

export default TestFinalizer;
