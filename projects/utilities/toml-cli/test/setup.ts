import { beforeEach, afterEach } from "bun:test";
import { resetScopeContext, setScopeEnvironment } from "../config/scope.config.ts";

/**
 * Test setup for automatic scope isolation
 * Ensures each test runs in a clean, isolated scope context
 */

// Reset scope context before each test
beforeEach(() => {
  // Reset environment variables that affect scoping
  delete process.env.HOST;
  delete process.env.DOMAIN;
  delete process.env.PLATFORM_OVERRIDE;

  // Reset Bun environment
  delete Bun.env.HOST;
  delete Bun.env.DOMAIN;
  delete Bun.env.PLATFORM_OVERRIDE;

  // Reset scope context
  resetScopeContext();

  // Set default test environment (development/localhost)
  setScopeEnvironment({
    HOST: "localhost",
    PLATFORM_OVERRIDE: "Any",
  });
});

// Clean up after each test
afterEach(() => {
  // Ensure no test pollution
  resetScopeContext();
});

/**
 * Helper function to set up test scope
 */
export function setupTestScope(env: {
  HOST?: string;
  DOMAIN?: string;
  PLATFORM_OVERRIDE?: string;
}) {
  resetScopeContext();
  setScopeEnvironment(env);
}

/**
 * Helper to mock scope context for testing
 */
export function mockScopeContext(mockContext: {
  domain?: string;
  platform?: string;
  detectedScope?: "ENTERPRISE" | "DEVELOPMENT" | "PERSONAL" | "PUBLIC";
}) {
  // This would require more complex mocking in a real implementation
  // For now, we use environment variable mocking
  setScopeEnvironment({
    HOST: mockContext.domain,
    PLATFORM_OVERRIDE: mockContext.platform,
  });
}

/**
 * Test utilities for scope testing
 */
export const scopeTestUtils = {
  /**
   * Test enterprise scope
   */
  async testEnterpriseScope(testFn: () => Promise<void> | void) {
    setupTestScope({ HOST: "apple.com" });
    await testFn();
  },

  /**
   * Test development scope
   */
  async testDevelopmentScope(testFn: () => Promise<void> | void) {
    setupTestScope({ HOST: "localhost" });
    await testFn();
  },

  /**
   * Test personal scope
   */
  async testPersonalScope(testFn: () => Promise<void> | void) {
    setupTestScope({ HOST: "gmail.com" });
    await testFn();
  },

  /**
   * Test public scope
   */
  async testPublicScope(testFn: () => Promise<void> | void) {
    setupTestScope({ HOST: "public" });
    await testFn();
  },

  /**
   * Test with custom domain
   */
  async testWithDomain(domain: string, testFn: () => Promise<void> | void) {
    setupTestScope({ HOST: domain });
    await testFn();
  },

  /**
   * Test with specific platform
   */
  async testWithPlatform(platform: string, testFn: () => Promise<void> | void) {
    setupTestScope({ PLATFORM_OVERRIDE: platform });
    await testFn();
  },
};

/**
 * Performance testing utilities
 */
export const performanceTestUtils = {
  /**
   * Time a function execution
   */
  async timeExecution<T>(
    fn: () => Promise<T> | T,
    label?: string
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    if (label) {
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    }

    return { result, duration };
  },

  /**
   * Run performance benchmark
   */
  async benchmark(
    name: string,
    fn: () => Promise<void> | void,
    iterations: number = 100
  ) {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { duration } = await this.timeExecution(fn);
      times.push(duration);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log(`📊 Benchmark: ${name}`);
    console.log(`   Iterations: ${iterations}`);
    console.log(`   Average: ${avg.toFixed(2)}ms`);
    console.log(`   Min: ${min.toFixed(2)}ms`);
    console.log(`   Max: ${max.toFixed(2)}ms`);

    return { avg, min, max, times };
  },
};

/**
 * Memory testing utilities
 */
export const memoryTestUtils = {
  /**
   * Get current memory usage
   */
  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    };
  },

  /**
   * Monitor memory usage during test
   */
  async monitorMemory<T>(
    fn: () => Promise<T> | T,
    label?: string
  ): Promise<{ result: T; memoryDelta: number; peakMemory: number }> {
    const before = this.getMemoryUsage();
    let peakMemory = before.heapUsed;

    // Run function with memory monitoring
    const result = await fn();

    // Force GC to get accurate readings (if available)
    if (typeof Bun !== 'undefined' && Bun.gc) {
      Bun.gc();
    }

    const after = this.getMemoryUsage();

    const memoryDelta = after.heapUsed - before.heapUsed;

    if (label) {
      console.log(`🧠 ${label} memory: ${memoryDelta > 0 ? '+' : ''}${memoryDelta} bytes`);
    }

    return { result, memoryDelta, peakMemory };
  },
};

/**
 * Compliance testing utilities
 */
export const complianceTestUtils = {
  /**
   * Assert compliance is valid
   */
  assertComplianceValid() {
    const { validateMatrixCompliance } = require("../utils/matrixValidator.ts");
    const result = validateMatrixCompliance();

    if (!result.valid) {
      throw new Error(`Compliance check failed: ${result.reason}\nViolations: ${result.violations?.join(', ')}`);
    }
  },

  /**
   * Assert specific feature is enabled
   */
  assertFeatureEnabled(feature: string) {
    const { isFeatureEnabled } = require("../config/scope.config.ts");

    if (!isFeatureEnabled(feature as any)) {
      throw new Error(`Feature '${feature}' is not enabled in current scope`);
    }
  },

  /**
   * Assert specific integration is allowed
   */
  assertIntegrationAllowed(integration: string) {
    const { isIntegrationAllowed } = require("../config/scope.config.ts");

    if (!isIntegrationAllowed(integration as any)) {
      throw new Error(`Integration '${integration}' is not allowed in current scope`);
    }
  },
};