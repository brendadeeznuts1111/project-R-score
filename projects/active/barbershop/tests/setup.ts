/**
 * Test Setup File
 * Configuration and utilities for test suite
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.CSRF_SECRET = 'test-csrf-secret-for-testing-only';
process.env.VARIANT_SECRET = 'test-variant-secret-for-testing-only';
process.env.LIFECYCLE_KEY = process.env.LIFECYCLE_KEY || 'test-lifecycle-key';

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Only show logs in verbose mode
if (!process.env.VERBOSE_TESTS) {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
}

// Cleanup function
export function restoreConsole() {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}
