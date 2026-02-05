#!/usr/bin/env bun

/**
 * 🧪 Lightweight Unit Testing Framework
 * 
 * Comprehensive testing with mocking, assertions, and coverage reporting
 */

import { handleError } from './error-handling';

/**
 * Test result interface
 */
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  assertions: number;
}

/**
 * Test suite interface
 */
export interface TestSuite {
  name: string;
  tests: TestResult[];
  duration: number;
  passed: number;
  failed: number;
}

/**
 * Assertion functions
 */
export class Assertions {
  private count: number = 0;

  /**
   * Assert that value is truthy
   */
  isTrue(value: any, message?: string): void {
    this.count++;
    if (!value) {
      throw new AssertionError(message || `Expected truthy value, got ${value}`);
    }
  }

  /**
   * Assert that value is falsy
   */
  isFalse(value: any, message?: string): void {
    this.count++;
    if (value) {
      throw new AssertionError(message || `Expected falsy value, got ${value}`);
    }
  }

  /**
   * Assert that values are equal
   */
  equal<T>(actual: T, expected: T, message?: string): void {
    this.count++;
    if (actual !== expected) {
      throw new AssertionError(
        message || `Expected ${expected}, got ${actual}`
      );
    }
  }

  /**
   * Assert that values are not equal
   */
  notEqual<T>(actual: T, expected: T, message?: string): void {
    this.count++;
    if (actual === expected) {
      throw new AssertionError(
        message || `Expected values to be different, got ${actual}`
      );
    }
  }

  /**
   * Assert that value is null
   */
  isNull(value: any, message?: string): void {
    this.count++;
    if (value !== null) {
      throw new AssertionError(message || `Expected null, got ${value}`);
    }
  }

  /**
   * Assert that value is not null
   */
  isNotNull(value: any, message?: string): void {
    this.count++;
    if (value === null) {
      throw new AssertionError(message || 'Expected not null');
    }
  }

  /**
   * Assert that value is undefined
   */
  isUndefined(value: any, message?: string): void {
    this.count++;
    if (value !== undefined) {
      throw new AssertionError(message || `Expected undefined, got ${value}`);
    }
  }

  /**
   * Assert that value is defined
   */
  isDefined(value: any, message?: string): void {
    this.count++;
    if (value === undefined) {
      throw new AssertionError(message || 'Expected defined value');
    }
  }

  /**
   * Assert that value is of expected type
   */
  isType(value: any, expectedType: string, message?: string): void {
    this.count++;
    const actualType = typeof value;
    if (actualType !== expectedType) {
      throw new AssertionError(
        message || `Expected type ${expectedType}, got ${actualType}`
      );
    }
  }

  /**
   * Assert that value is instance of class
   */
  isInstance<T>(value: any, expectedClass: new () => T, message?: string): void {
    this.count++;
    if (!(value instanceof expectedClass)) {
      throw new AssertionError(
        message || `Expected instance of ${expectedClass.name}`
      );
    }
  }

  /**
   * Assert that array contains expected value
   */
  contains<T>(array: T[], expected: T, message?: string): void {
    this.count++;
    if (!array.includes(expected)) {
      throw new AssertionError(
        message || `Expected array to contain ${expected}`
      );
    }
  }

  /**
   * Assert that array does not contain value
   */
  notContains<T>(array: T[], unexpected: T, message?: string): void {
    this.count++;
    if (array.includes(unexpected)) {
      throw new AssertionError(
        message || `Expected array to not contain ${unexpected}`
      );
    }
  }

  /**
   * Assert that string matches pattern
   */
  matches(value: string, pattern: RegExp, message?: string): void {
    this.count++;
    if (!pattern.test(value)) {
      throw new AssertionError(
        message || `Expected ${value} to match ${pattern}`
      );
    }
  }

  /**
   * Assert that function throws error
   */
  async throws(
    fn: () => Promise<any> | any,
    expectedError?: string | RegExp,
    message?: string
  ): Promise<void> {
    this.count++;
    try {
      await fn();
      throw new AssertionError(message || 'Expected function to throw');
    } catch (error) {
      if (expectedError) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (typeof expectedError === 'string') {
          if (!errorMessage.includes(expectedError)) {
            throw new AssertionError(
              message || `Expected error message to contain "${expectedError}", got "${errorMessage}"`
            );
          }
        } else if (expectedError instanceof RegExp) {
          if (!expectedError.test(errorMessage)) {
            throw new AssertionError(
              message || `Expected error message to match ${expectedError}, got "${errorMessage}"`
            );
          }
        }
      }
    }
  }

  /**
   * Assert that function does not throw
   */
  async doesNotThrow(
    fn: () => Promise<any> | any,
    message?: string
  ): Promise<void> {
    this.count++;
    try {
      await fn();
    } catch (error) {
      throw new AssertionError(
        message || `Expected function not to throw, but threw: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Assert that number is in range
   */
  inRange(value: number, min: number, max: number, message?: string): void {
    this.count++;
    if (value < min || value > max) {
      throw new AssertionError(
        message || `Expected ${value} to be between ${min} and ${max}`
      );
    }
  }

  /**
   * Get assertion count
   */
  getAssertionCount(): number {
    return this.count;
  }

  /**
   * Reset assertion count
   */
  reset(): void {
    this.count = 0;
  }
}

/**
 * Custom assertion error
 */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

/**
 * Mock function
 */
export class Mock<T extends (...args: any[]) => any> {
  private calls: Array<{ args: Parameters<T>; result: ReturnType<T> }> = [];
  private implementation?: T;
  private returnValue?: ReturnType<T>;
  private throwValue?: Error;

  /**
   * Create mock function
   */
  constructor(private name: string = 'mock') {}

  /**
   * Execute mock function
   */
  async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    if (this.throwValue) {
      throw this.throwValue;
    }

    let result: ReturnType<T>;
    
    if (this.implementation) {
      result = await this.implementation(...args);
    } else if (this.returnValue !== undefined) {
      result = this.returnValue;
    } else {
      result = undefined as ReturnType<T>;
    }

    this.calls.push({ args: [...args], result });
    return result;
  }

  /**
   * Set implementation
   */
  impl(fn: T): this {
    this.implementation = fn;
    return this;
  }

  /**
   * Set return value
   */
  returns(value: ReturnType<T>): this {
    this.returnValue = value;
    return this;
  }

  /**
   * Set error to throw
   */
  throws(error: Error | string): this {
    this.throwValue = error instanceof Error ? error : new Error(error);
    return this;
  }

  /**
   * Reset mock
   */
  reset(): this {
    this.calls = [];
    this.implementation = undefined;
    this.returnValue = undefined;
    this.throwValue = undefined;
    return this;
  }

  /**
   * Get call count
   */
  callCount(): number {
    return this.calls.length;
  }

  /**
   * Get calls
   */
  getCalls(): Array<{ args: Parameters<T>; result: ReturnType<T> }> {
    return [...this.calls];
  }

  /**
   * Check if was called with specific arguments
   */
  calledWith(...args: Parameters<T>): boolean {
    return this.calls.some(call => 
      call.args.length === args.length &&
      call.args.every((arg, index) => arg === args[index])
    );
  }

  /**
   * Create mock function
   */
  createFunction(): T {
    return (async (...args: Parameters<T>) => {
      return this.execute(...args);
    }) as T;
  }
}

/**
 * Test runner
 */
export class TestRunner {
  private suites: TestSuite[] = [];
  private currentSuite?: TestSuite;

  /**
   * Create test suite
   */
  describe(name: string, fn: () => void): void {
    const parentSuite = this.currentSuite;
    this.currentSuite = {
      name,
      tests: [],
      duration: 0,
      passed: 0,
      failed: 0
    };

    fn();
    this.suites.push(this.currentSuite);
    this.currentSuite = parentSuite;
  }

  /**
   * Create test case
   */
  async it(name: string, fn: (assert: Assertions) => Promise<void> | void): Promise<void> {
    if (!this.currentSuite) {
      throw new Error('Test must be inside a describe block');
    }

    const suite = this.currentSuite;
    const startTime = Date.now();
    const assert = new Assertions();

    try {
      const result = fn(assert);
      if (result instanceof Promise) {
        await result;
      }

      suite.tests.push({
        name,
        passed: true,
        duration: Date.now() - startTime,
        assertions: assert.getAssertionCount()
      });
      suite.passed++;
    } catch (error) {
      suite.tests.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        assertions: assert.getAssertionCount()
      });
      suite.failed++;
    }
  }

  /**
   * Run all tests
   */
  async run(): Promise<{ suites: TestSuite[]; summary: TestSummary }> {
    const startTime = Date.now();

    for (const suite of this.suites) {
      const suiteStartTime = Date.now();
      
      for (const test of suite.tests) {
        // Tests are already executed in the it() method
      }
      
      suite.duration = Date.now() - suiteStartTime;
    }

    const totalDuration = Date.now() - startTime;
    const summary = this.generateSummary(totalDuration);

    return { suites: this.suites, summary };
  }

  /**
   * Generate test summary
   */
  private generateSummary(totalDuration: number): TestSummary {
    const totalTests = this.suites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = this.suites.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = this.suites.reduce((sum, suite) => sum + suite.failed, 0);
    const totalAssertions = this.suites.reduce((sum, suite) => 
      sum + suite.tests.reduce((testSum, test) => testSum + test.assertions, 0), 0
    );

    return {
      totalSuites: this.suites.length,
      totalTests,
      totalPassed,
      totalFailed,
      totalDuration,
      totalAssertions,
      successRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0
    };
  }

  /**
   * Reset all tests
   */
  reset(): void {
    this.suites = [];
    this.currentSuite = undefined;
  }
}

/**
 * Test summary interface
 */
export interface TestSummary {
  totalSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
  totalAssertions: number;
  successRate: number;
}

/**
 * Global test runner
 */
export const testRunner = new TestRunner();

/**
 * Convenience functions
 */
export const describe = testRunner.describe.bind(testRunner);
export const it = testRunner.it.bind(testRunner);

/**
 * Mock factory
 */
export function mock<T extends (...args: any[]) => any>(name?: string): Mock<T> {
  return new Mock<T>(name);
}

/**
 * Run tests and output results
 */
export async function runTests(): Promise<void> {
  try {
    const { suites, summary } = await testRunner.run();
    
    console.log('\n🧪 Test Results');
    console.log('='.repeat(50));
    
    for (const suite of suites) {
      console.log(`\n📋 ${suite.name}`);
      console.log(`  Duration: ${suite.duration}ms`);
      console.log(`  Tests: ${suite.passed + suite.failed}`);
      console.log(`  ✅ Passed: ${suite.passed}`);
      console.log(`  ❌ Failed: ${suite.failed}`);
      
      for (const test of suite.tests) {
        const status = test.passed ? '✅' : '❌';
        const assertions = test.assertions > 0 ? ` (${test.assertions} assertions)` : '';
        console.log(`    ${status} ${test.name}${assertions}`);
        
        if (!test.passed && test.error) {
          console.log(`       Error: ${test.error}`);
        }
      }
    }
    
    console.log('\n📊 Summary');
    console.log('='.repeat(50));
    console.log(`Suites: ${summary.totalSuites}`);
    console.log(`Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.totalPassed}`);
    console.log(`Failed: ${summary.totalFailed}`);
    console.log(`Assertions: ${summary.totalAssertions}`);
    console.log(`Duration: ${summary.totalDuration}ms`);
    console.log(`Success Rate: ${summary.successRate.toFixed(2)}%`);
    
    if (summary.totalFailed > 0) {
      console.log('\n❌ Some tests failed!');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
    }
    
  } catch (error) {
    handleError(error, 'TestRunner.runTests', 'high');
    process.exit(1);
  }
}

/**
 * Test utilities
 */
export const testUtils = {
  /**
   * Wait for specified time
   */
  wait: (ms: number): Promise<void> => Bun.sleep(ms),
  
  /**
   * Create fake data
   */
  fake: {
    string: (length: number = 10): string => 
      Math.random().toString(36).substring(2, 2 + length),
    
    number: (min: number = 0, max: number = 100): number =>
      Math.floor(Math.random() * (max - min + 1)) + min,
    
    email: (): string => 
      `test${Math.random().toString(36).substring(2)}@example.com`,
    
    url: (): string =>
      `https://example${Math.random().toString(36).substring(2)}.com`,
    
    date: (): Date => new Date(Date.now() - Math.random() * 10000000000),
    
    uuid: (): string => crypto.randomUUID()
  }
};
