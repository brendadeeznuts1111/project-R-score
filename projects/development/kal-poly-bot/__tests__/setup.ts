#!/usr/bin/env bun
/**
 * MCP Tool Test Setup and Configuration
 *
 * Preload module for test environment initialization, global test utilities,
 * and environment-specific configuration.
 */

import { beforeAll, beforeEach, afterEach, afterAll } from 'bun:test';

// =============================================================================
// TEST ENVIRONMENT CONFIGURATION
// =============================================================================

// Set test environment variables
Bun.env.NODE_ENV = Bun.env.NODE_ENV || 'test';
Bun.env.BUN_TEST = 'true';
Bun.env.MATRIX_TEST_MODE = 'true';

// Global test configuration
globalThis.TEST_CONFIG = {
  timeout: 30000,
  retries: 2,
  seed: 2444615283,
  coverageEnabled: true,
  parallelJobs: 4
};

// Configure Bun runtime for testing
if (Bun.env.BUN_RUNTIME === 'test') {
  console.log('\n🧪 MCP Tool Test Environment Initialized');
  console.log(`   Node.js Version: ${process.version}`);
  console.log(`   Bun Version: ${Bun.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);
  console.log(`   Test Seed: ${globalThis.TEST_CONFIG.seed}`);
}

// =============================================================================
// GLOBAL TEST UTILITIES
// =============================================================================

/**
 * Test helper for MCP tool responses
 */
globalThis.createMockToolResponse = <T>(data: T, metadata?: any) => ({
  success: true,
  data,
  metadata: {
    timestamp: new Date().toISOString(),
    testEnvironment: true,
    ...metadata
  },
  version: '1.01.01-test'
});

/**
 * Test helper for error responses
 */
globalThis.createMockErrorResponse = (errorType: string, message: string) => ({
  success: false,
  error: {
    type: errorType,
    message,
    timestamp: new Date().toISOString(),
    testEnvironment: true
  },
  version: '1.01.01-test'
});

/**
 * Test helper for MCP search queries
 */
globalThis.createMockSearchQuery = (options: {
  query?: string;
  filters?: any;
  limit?: number;
  includeRelated?: boolean;
}) => ({
  query: options.query || 'test query',
  filters: options.filters || {},
  context: 'test-analysis',
  limit: options.limit || 10,
  includeRelated: options.includeRelated ?? true,
  exportFormat: 'detailed'
});

/**
 * Test helper for benchmark timing
 */
globalThis.timeOperation = async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;
  return { result, duration };
};

/**
 * Test helper for memory usage monitoring
 */
globalThis.measureMemoryUsage = async <T>(operation: () => Promise<T>): Promise<T> => {
  const heapBefore = process.memoryUsage().heapUsed;

  const result = await operation();

  const heapAfter = process.memoryUsage().heapUsed;
  const memoryDelta = heapAfter - heapBefore;

  console.log(`   📊 Memory usage: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);

  return result;
};

/**
 * Test helper for file cleanup
 */
globalThis.cleanupTestFiles = async (files: string[]): Promise<void> => {
  for (const file of files) {
    try {
      await Bun.file(file).delete();
    } catch (error) {
      // File might not exist, continue
    }
  }
};

// =============================================================================
// ASYNC TEST HOOKS
// =============================================================================

/**
 * Global test setup - runs once before all tests
 */
beforeAll(async () => {
  console.log('\n🔧 Setting up MCP Tool Test Environment...');

  // Preload matrix data for all tests
  globalThis.TEST_MATRIX_DATA = {
    errors: [
      {
        code: 'ERR_TEST_001',
        description: 'Test error for unit testing',
        severity: 'critical',
        status: 'active'
      },
      {
        code: 'ERR_TEST_002',
        description: 'Warning test error',
        severity: 'warning',
        status: 'active'
      }
    ],
    envVars: [
      {
        name: 'BUN_TEST_VAR',
        description: 'Test environment variable',
        status: 'active',
        defaultValue: 'test-value'
      }
    ],
    resources: []
  };

  // Warm up the test environment
  await new Promise(resolve => setTimeout(resolve, 10));

  console.log('✅ MCP Tool Test Environment Ready');
});

/**
 * Global test teardown - runs once after all tests
 */
afterAll(async () => {
  console.log('\n🧹 Cleaning up MCP Tool Test Environment...');

  // Clean up global test data
  delete globalThis.TEST_CONFIG;
  delete globalThis.TEST_MATRIX_DATA;

  // Wait for any pending operations
  await new Promise(resolve => setTimeout(resolve, 10));

  console.log('✅ MCP Tool Test Environment Cleaned Up');
});

/**
 * Per-test setup - runs before each test
 */
beforeEach(async () => {
  // Reset any test-specific state
  globalThis.TEST_ITERATION = (globalThis.TEST_ITERATION || 0) + 1;

  // Ensure clean environment for each test
  if (Bun.env.BUN_TEST_CLEANUP !== 'false') {
    // Reset environment variables that tests might modify
    delete Bun.env.TEST_MODIFIED_VAR;
  }
});

/**
 * Per-test teardown - runs after each test
 */
afterEach(async () => {
  // Clean up after each test
  if (globalThis.TEST_TEMP_FILES) {
    await cleanupTestFiles(globalThis.TEST_TEMP_FILES);
    globalThis.TEST_TEMP_FILES = [];
  }

  // Reset timers
  jest.clearAllTimers?.();
});

// =============================================================================
// TEST EXTENSIONS AND POLYFILLS
// =============================================================================

/**
 * Extend test matchers for MCP tool specific assertions
 */
declare global {
  var expect: any;
  function createMockToolResponse<T>(data: T, metadata?: any): any;
  function createMockErrorResponse(errorType: string, message: string): any;
  function createMockSearchQuery(options: {
    query?: string;
    filters?: any;
    limit?: number;
    includeRelated?: boolean;
  }): any;
  function timeOperation<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }>;
  function measureMemoryUsage<T>(operation: () => Promise<T>): Promise<T>;
  function cleanupTestFiles(files: string[]): Promise<void>;
  function assertPerformance(operation: string, duration: number, memoryDelta?: number): void;

  var TEST_CONFIG: any;
  var TEST_MATRIX_DATA: any;
  var TEST_ITERATION: number;
  var TEST_TEMP_FILES: string[];
  var PERFORMANCE_BASELINES: any;
}

// Add custom matchers (if Jest matchers available)
if (typeof expect !== 'undefined' && expect.extend) {
  expect.extend({
    /**
     * Custom matcher for MCP tool responses
     */
    toBeValidToolResponse(received: any) {
      const pass = received &&
                   typeof received === 'object' &&
                   'success' in received &&
                   'version' in received &&
                   received.version.startsWith('1.01.01');

      if (pass) {
        return {
          message: () => `Expected ${received} to be an invalid MCP tool response`,
          pass: true
        };
      } else {
        return {
          message: () => `Expected valid MCP tool response, received: ${JSON.stringify(received)}`,
          pass: false
        };
      }
    },

    /**
     * Custom matcher for error responses
     */
    toBeErrorResponse(received: any) {
      const pass = received &&
                   typeof received === 'object' &&
                   received.success === false &&
                   'error' in received &&
                   typeof received.error === 'object';

      if (pass) {
        return {
          message: () => `Expected ${received} to be an invalid error response`,
          pass: true
        };
      } else {
        return {
          message: () => `Expected valid error response, received: ${JSON.stringify(received)}`,
          pass: false
        };
      }
    }
  });
}

// =============================================================================
// PERFORMANCE BASELINE CONFIGURATION
// =============================================================================

/**
 * Performance baseline thresholds for regression detection
 */
globalThis.PERFORMANCE_BASELINES = {
  search: {
    simple: 10,     // 10ms for basic search
    complex: 50,    // 50ms for complex queries
    maxAcceptable: 200 // 200ms maximum acceptable
  },
  memory: {
    searchDelta: 5 * 1024 * 1024, // 5MB max heap increase per search
    repeatedOperations: 10 * 1024 * 1024 // 10MB max for repeated ops
  },
  concurrency: {
    minThroughput: 10, // 10 operations per second minimum
    maxConcurrency: 20  // Maximum concurrent operations
  }
};

/**
 * Performance assertion helpers
 */
globalThis.assertPerformance = (operation: string, duration: number, memoryDelta?: number) => {
  const baseline = globalThis.PERFORMANCE_BASELINES[operation];

  if (!baseline) {
    console.warn(`⚠️ No performance baseline defined for: ${operation}`);
    return;
  }

  if (duration > baseline.maxAcceptable) {
    throw new Error(
      `Performance regression in ${operation}: ` +
      `${duration.toFixed(2)}ms > ${baseline.maxAcceptable}ms baseline`
    );
  }

  if (memoryDelta && Math.abs(memoryDelta) > baseline.memoryDelta) {
    console.warn(
      `📊 Memory usage in ${operation}: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
    );
  }
};

// =============================================================================
// TEST SUITE METADATA
// =============================================================================

/**
 * Export test metadata for external tools
 */
export const TEST_METADATA = {
  framework: 'bun:test',
  version: '1.01.01',
  target: 'matrix-mcp-tools',
  features: [
    'semantic-search',
    'matrix-analysis',
    'performance-benchmarking',
    'error-handling',
    'concurrent-execution',
    'memory-profiling'
  ],
  configuration: {
    root: './__tests__',
    coverage: true,
    timeout: 30000,
    retries: 2,
    randomization: true,
    seed: 2444615283
  },
  environment: {
    nodeVersion: process.version,
    bunVersion: Bun.version,
    platform: process.platform,
    arch: process.arch
  }
};

console.log('🎯 MCP Tool Test Setup Complete - Ready for Test Execution');
