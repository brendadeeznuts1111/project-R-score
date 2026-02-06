// exit-code-3.test.ts - v2.8: Exit Code >1 Demonstration (Unhandled Errors)

import { test, describe, expect } from 'bun:test';

describe('Exit Code >1: Unhandled Errors', () => {
  test('should pass - this test is fine', () => {
    expect(1 + 1).toBe(2);
  });

  test('should throw unhandled error - contributes to exit code >1', () => {
    throw new Error('Unhandled error in test');
  });

  test('should pass - but unhandled errors force exit code >1', () => {
    expect('working').toBe('working');
  });
});

// Create unhandled promise rejection (also contributes to exit code >1)
setTimeout(() => {
  Promise.reject(new Error('Unhandled promise rejection outside test'));
}, 100);

console.log('🚨 This file will result in Exit Code >1 (unhandled errors)');
