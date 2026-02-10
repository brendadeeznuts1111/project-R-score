// exit-code-3.test.ts - v2.8: Exit Code >1 Demonstration (Unhandled Errors)

import { test, describe, expect } from 'bun:test';

const runFailureDemo = process.env.RUN_EXIT_CODE_FAILURE_DEMOS === '1';
const demoTest = runFailureDemo ? test : test.skip;

describe('Exit Code >1: Unhandled Errors', () => {
  test('should pass - this test is fine', () => {
    expect(1 + 1).toBe(2);
  });

  demoTest('should throw unhandled error - contributes to exit code >1', () => {
    throw new Error('Unhandled error in test');
  });

  test('should pass - but unhandled errors force exit code >1', () => {
    expect('working').toBe('working');
  });
  test('documents opt-in behavior for unhandled-error demos', () => {
    expect(typeof runFailureDemo).toBe('boolean');
  });
});

// Skipped: unhandled promise rejection (contributes to exit code >1)
// setTimeout(() => {
//   Promise.reject(new Error('Unhandled promise rejection outside test'));
// }, 100);

console.log(
  runFailureDemo
    ? '🚨 Unhandled-error demos enabled (RUN_EXIT_CODE_FAILURE_DEMOS=1).'
    : 'ℹ️ Unhandled-error demos skipped by default (set RUN_EXIT_CODE_FAILURE_DEMOS=1 to enable).'
);
