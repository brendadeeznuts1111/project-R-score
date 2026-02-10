// exit-code-1.test.ts - v2.8: Exit Code 1 Demonstration (Test Failures)

import { test, describe, expect } from 'bun:test';

const runFailureDemo = process.env.RUN_EXIT_CODE_FAILURE_DEMOS === '1';
const demoTest = runFailureDemo ? test : test.skip;

describe('Exit Code 1: Test Failures', () => {
  test('should pass - this test is fine', () => {
    expect(2 + 2).toBe(4);
  });

  demoTest('should fail - contributes to exit code 1', () => {
    expect(true).toBe(false); // This will fail
  });

  demoTest('should also fail - another failure', () => {
    expect('hello').toBe('world'); // This will also fail
  });

  test('should pass - but overall exit code still 1', () => {
    expect('success').toContain('succ');
  });
  test('documents opt-in behavior for failure demos', () => {
    expect(typeof runFailureDemo).toBe('boolean');
  });
});

console.log(
  runFailureDemo
    ? '❌ Exit code failure demos enabled (RUN_EXIT_CODE_FAILURE_DEMOS=1).'
    : 'ℹ️ Exit code failure demos skipped by default (set RUN_EXIT_CODE_FAILURE_DEMOS=1 to enable).'
);
