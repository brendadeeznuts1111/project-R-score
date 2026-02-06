// exit-code-1.test.ts - v2.8: Exit Code 1 Demonstration (Test Failures)

import { test, describe, expect } from 'bun:test';

describe('Exit Code 1: Test Failures', () => {
  test('should pass - this test is fine', () => {
    expect(2 + 2).toBe(4);
  });

  test('should fail - contributes to exit code 1', () => {
    expect(true).toBe(false); // This will fail
  });

  test('should also fail - another failure', () => {
    expect('hello').toBe('world'); // This will also fail
  });

  test('should pass - but overall exit code still 1', () => {
    expect('success').toContain('succ');
  });
});

console.log('❌ This file will result in Exit Code 1 (test failures)');
