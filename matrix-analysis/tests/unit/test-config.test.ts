#!/usr/bin/env bun
/**
 * Unit Tests for Test Config
 *
 * Tests the test configuration functionality.
 */

import { test, expect } from 'bun:test';
import { testConfig } from '../../src/lib/test-config';

test('should get timeout based on environment', () => {
  const timeout = testConfig.getTimeout();

  // Should return a number
  expect(typeof timeout).toBe('number');
  expect(timeout).toBeGreaterThan(0);
});

test('should get retry count', () => {
  const retryCount = testConfig.getRetryCount();

  // Should return a number
  expect(typeof retryCount).toBe('number');
  expect(retryCount).toBeGreaterThanOrEqual(0);
});

test('should get concurrency settings', () => {
  const concurrency = testConfig.getConcurrency();

  // Should return a number
  expect(typeof concurrency).toBe('number');
  expect(concurrency).toBeGreaterThan(0);
});

test('should determine if coverage should be enabled', () => {
  const coverage = testConfig.shouldEnableCoverage();

  // Should return a boolean
  expect(typeof coverage).toBe('boolean');
});

test('should get reporter configuration', () => {
  const reporters = testConfig.getReporter();

  // Should return an array
  expect(Array.isArray(reporters)).toBe(true);
  expect(reporters.length).toBeGreaterThan(0);
});

test('should get test patterns', () => {
  const patterns = testConfig.getTestPatterns();

  // Should return an array
  expect(Array.isArray(patterns)).toBe(true);
  expect(patterns.length).toBeGreaterThan(0);
});

test('should configure environment variables', () => {
  // Should not throw
  expect(() => {
    testConfig.configureEnvironment();
  }).not.toThrow();
});

test('should emit test start annotation', () => {
  // Should not throw
  expect(() => {
    testConfig.emitTestStart('test-file.ts');
  }).not.toThrow();
});

test('should emit test end annotation', () => {
  // Should not throw
  expect(() => {
    testConfig.emitTestEnd('test-file.ts', true, 1000);
  }).not.toThrow();
});

test('should get full configuration', () => {
  const config = testConfig.getConfig();

  // Should return an object with expected properties
  expect(typeof config).toBe('object');
  expect(config).toHaveProperty('timeout');
  expect(config).toHaveProperty('retryCount');
  expect(config).toHaveProperty('concurrency');
  expect(config).toHaveProperty('coverage');
  expect(config).toHaveProperty('reporters');
  expect(config).toHaveProperty('patterns');
  expect(config).toHaveProperty('ci');

  // Check types
  expect(typeof config.timeout).toBe('number');
  expect(typeof config.retryCount).toBe('number');
  expect(typeof config.concurrency).toBe('number');
  expect(typeof config.coverage).toBe('boolean');
  expect(Array.isArray(config.reporters)).toBe(true);
  expect(Array.isArray(config.patterns)).toBe(true);
  expect(typeof config.ci).toBe('object');
});
