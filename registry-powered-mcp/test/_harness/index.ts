/**
 * Test Harness
 * Central export point for all test utilities
 */

// Re-export utilities
export {
  gcTick,
  sleep,
  createTestServer,
  createTempDir,
  cleanupTempDir,
  waitFor,
  mockRequest,
  responseText,
  responseJson,
  assertStatus,
} from "./utils";

// Re-export fixture helpers
export {
  loadFixture,
  loadConfigFixture,
  createFixture,
  mockRegistryData,
  mockRegistryConfig,
  createTempConfig,
} from "./fixtures";

// Re-export performance utilities
export {
  measurePerformance,
  assertPerformanceMetrics,
  detectPerformanceRegression,
  measureMemory,
  formatMetrics,
} from "./performance";

export type {
  PerformanceMetrics,
  PerformanceSLA,
} from "./performance";

// Re-export matchers
export {
  toMatchPerformance,
  toBeWithinSLA,
  toMatchSnapshot,
  toHaveStatus,
  toBeJSON,
  toMatchRoute,
  registerMatchers,
} from "./matchers";

// Re-export Bun test utilities for convenience
export { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
