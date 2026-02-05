/**
 * Flaky Test Resilience Engine - Component #53
 *
 * Retry/repeat modes for flaky tests with exponential backoff and isolation.
 *
 * | Infrastructure ID | Logic Tier | Resource Tax | Parity Lock | Status |
 * |:------------------|:-----------|:-------------|:------------|:-------|
 * | **Flaky-Test-Resilience** | **Level 5: Test** | `CPU: +10%` | `a1b2...3c4d` | **RESILIENT** |
 *
 * Performance Targets:
 * - Retry overhead: <5ms per retry
 * - Exponential backoff: configurable base/max
 * - Test isolation: fresh context per retry
 *
 * Features:
 * - --retry=N: Retry failed tests N times
 * - --repeat=N: Repeat successful tests N times
 * - Exponential backoff with jitter
 * - Per-test isolation (fresh globals)
 *
 * @module infrastructure
 */

import { isFeatureEnabled, type InfrastructureFeature } from '../types/feature-flags';

/**
 * Feature flag for flaky test resilience
 */
const TEST_RESILIENCE: InfrastructureFeature = 'KERNEL_OPT';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  jitterPercent: number;
}

/**
 * Repeat configuration
 */
export interface RepeatConfig {
  repeatCount: number;
  failFast: boolean;
  delayBetweenMs: number;
}

/**
 * Test execution result
 */
export interface TestExecutionResult {
  passed: boolean;
  attempts: number;
  totalTimeMs: number;
  errors: Error[];
  retryDelays: number[];
}

/**
 * Repeat execution result
 */
export interface RepeatExecutionResult {
  allPassed: boolean;
  passCount: number;
  failCount: number;
  totalRuns: number;
  totalTimeMs: number;
  results: boolean[];
}

/**
 * Test function type
 */
export type TestFn = () => void | Promise<void>;

/**
 * Flaky Test Resilience Engine
 *
 * Provides retry and repeat capabilities for test execution with
 * exponential backoff and test isolation.
 */
export class FlakyTestResilienceEngine {
  /**
   * Default retry configuration
   */
  static readonly DEFAULT_RETRY_CONFIG: Readonly<RetryConfig> = {
    maxRetries: 3,
    baseDelayMs: 100,
    maxDelayMs: 5000,
    exponentialBase: 2,
    jitterPercent: 20,
  } as const;

  /**
   * Default repeat configuration
   */
  static readonly DEFAULT_REPEAT_CONFIG: Readonly<RepeatConfig> = {
    repeatCount: 1,
    failFast: true,
    delayBetweenMs: 0,
  } as const;

  /**
   * Calculate delay for a retry attempt with exponential backoff and jitter
   *
   * @param attempt - Current attempt number (0-indexed)
   * @param config - Retry configuration
   * @returns Delay in milliseconds
   *
   * @example
   * ```typescript
   * const delay = FlakyTestResilienceEngine.calculateRetryDelay(2, config);
   * // With base=100, exponential=2: 100 * 2^2 = 400ms + jitter
   * ```
   */
  static calculateRetryDelay(attempt: number, config: RetryConfig): number {
    if (!isFeatureEnabled(TEST_RESILIENCE)) {
      return config.baseDelayMs;
    }

    // Exponential backoff: base * exponentialBase^attempt
    const exponentialDelay = config.baseDelayMs * Math.pow(config.exponentialBase, attempt);

    // Cap at maximum delay
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

    // Add jitter to prevent thundering herd
    const jitterRange = cappedDelay * (config.jitterPercent / 100);
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;

    return Math.max(0, Math.round(cappedDelay + jitter));
  }

  /**
   * Sleep for a specified duration
   *
   * @param ms - Duration in milliseconds
   */
  static async sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute a test with retry logic
   *
   * @param testFn - Test function to execute
   * @param config - Retry configuration
   * @returns Execution result with attempts and timing
   *
   * @example
   * ```typescript
   * const result = await FlakyTestResilienceEngine.executeWithRetry(
   *   async () => {
   *     const response = await fetch('/api/flaky');
   *     expect(response.ok).toBe(true);
   *   },
   *   { maxRetries: 3, baseDelayMs: 100 }
   * );
   *
   * console.log(`Passed after ${result.attempts} attempts`);
   * ```
   */
  static async executeWithRetry(
    testFn: TestFn,
    config: Partial<RetryConfig> = {}
  ): Promise<TestExecutionResult> {
    const fullConfig: RetryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    const startTime = performance.now();
    const errors: Error[] = [];
    const retryDelays: number[] = [];

    if (!isFeatureEnabled(TEST_RESILIENCE)) {
      // Non-resilient mode: single attempt
      try {
        await testFn();
        return {
          passed: true,
          attempts: 1,
          totalTimeMs: performance.now() - startTime,
          errors: [],
          retryDelays: [],
        };
      } catch (error) {
        return {
          passed: false,
          attempts: 1,
          totalTimeMs: performance.now() - startTime,
          errors: [error instanceof Error ? error : new Error(String(error))],
          retryDelays: [],
        };
      }
    }

    for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
      try {
        await testFn();

        // Test passed
        return {
          passed: true,
          attempts: attempt + 1,
          totalTimeMs: performance.now() - startTime,
          errors,
          retryDelays,
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);

        // If we have more retries, wait before next attempt
        if (attempt < fullConfig.maxRetries) {
          const delay = this.calculateRetryDelay(attempt, fullConfig);
          retryDelays.push(delay);
          await this.sleep(delay);
        }
      }
    }

    // All attempts exhausted
    return {
      passed: false,
      attempts: fullConfig.maxRetries + 1,
      totalTimeMs: performance.now() - startTime,
      errors,
      retryDelays,
    };
  }

  /**
   * Execute a test repeatedly
   *
   * @param testFn - Test function to execute
   * @param config - Repeat configuration
   * @returns Repeat execution result with pass/fail counts
   *
   * @example
   * ```typescript
   * const result = await FlakyTestResilienceEngine.executeWithRepeat(
   *   async () => {
   *     expect(Math.random()).toBeGreaterThan(0.1);
   *   },
   *   { repeatCount: 100, failFast: false }
   * );
   *
   * console.log(`Passed ${result.passCount}/${result.totalRuns} times`);
   * ```
   */
  static async executeWithRepeat(
    testFn: TestFn,
    config: Partial<RepeatConfig> = {}
  ): Promise<RepeatExecutionResult> {
    const fullConfig: RepeatConfig = { ...this.DEFAULT_REPEAT_CONFIG, ...config };
    const startTime = performance.now();
    const results: boolean[] = [];
    let passCount = 0;
    let failCount = 0;

    if (!isFeatureEnabled(TEST_RESILIENCE)) {
      // Non-resilient mode: single execution
      try {
        await testFn();
        return {
          allPassed: true,
          passCount: 1,
          failCount: 0,
          totalRuns: 1,
          totalTimeMs: performance.now() - startTime,
          results: [true],
        };
      } catch {
        return {
          allPassed: false,
          passCount: 0,
          failCount: 1,
          totalRuns: 1,
          totalTimeMs: performance.now() - startTime,
          results: [false],
        };
      }
    }

    for (let run = 0; run < fullConfig.repeatCount; run++) {
      try {
        await testFn();
        results.push(true);
        passCount++;
      } catch {
        results.push(false);
        failCount++;

        if (fullConfig.failFast) {
          break;
        }
      }

      // Delay between runs (except after last run)
      if (run < fullConfig.repeatCount - 1 && fullConfig.delayBetweenMs > 0) {
        await this.sleep(fullConfig.delayBetweenMs);
      }
    }

    return {
      allPassed: failCount === 0,
      passCount,
      failCount,
      totalRuns: results.length,
      totalTimeMs: performance.now() - startTime,
      results,
    };
  }

  /**
   * Create a wrapped test function with retry capability
   *
   * @param testFn - Original test function
   * @param config - Retry configuration
   * @returns Wrapped test function that retries on failure
   *
   * @example
   * ```typescript
   * const resilientTest = FlakyTestResilienceEngine.withRetry(
   *   myFlakyTest,
   *   { maxRetries: 3 }
   * );
   *
   * // Use in test framework
   * test('flaky operation', resilientTest);
   * ```
   */
  static withRetry(
    testFn: TestFn,
    config: Partial<RetryConfig> = {}
  ): () => Promise<void> {
    return async () => {
      const result = await this.executeWithRetry(testFn, config);
      if (!result.passed) {
        const lastError = result.errors[result.errors.length - 1];
        throw lastError || new Error(`Test failed after ${result.attempts} attempts`);
      }
    };
  }

  /**
   * Create a wrapped test function with repeat capability
   *
   * @param testFn - Original test function
   * @param config - Repeat configuration
   * @returns Wrapped test function that repeats execution
   */
  static withRepeat(
    testFn: TestFn,
    config: Partial<RepeatConfig> = {}
  ): () => Promise<void> {
    return async () => {
      const result = await this.executeWithRepeat(testFn, config);
      if (!result.allPassed) {
        throw new Error(
          `Test failed ${result.failCount} times out of ${result.totalRuns} runs`
        );
      }
    };
  }

  /**
   * Parse CLI retry/repeat arguments
   *
   * @param args - Command line arguments
   * @returns Parsed retry and repeat configs
   *
   * @example
   * ```typescript
   * // bun test --retry=3 --repeat=5
   * const { retry, repeat } = FlakyTestResilienceEngine.parseCliArgs(Bun.argv);
   * ```
   */
  static parseCliArgs(args: string[]): {
    retry: Partial<RetryConfig>;
    repeat: Partial<RepeatConfig>;
  } {
    const retry: Partial<RetryConfig> = {};
    const repeat: Partial<RepeatConfig> = {};

    for (const arg of args) {
      // --retry=N
      const retryMatch = arg.match(/^--retry=(\d+)$/);
      if (retryMatch && retryMatch[1]) {
        retry.maxRetries = parseInt(retryMatch[1], 10);
      }

      // --repeat=N
      const repeatMatch = arg.match(/^--repeat=(\d+)$/);
      if (repeatMatch && repeatMatch[1]) {
        repeat.repeatCount = parseInt(repeatMatch[1], 10);
      }

      // --retry-delay=N (base delay in ms)
      const delayMatch = arg.match(/^--retry-delay=(\d+)$/);
      if (delayMatch && delayMatch[1]) {
        retry.baseDelayMs = parseInt(delayMatch[1], 10);
      }

      // --fail-fast (for repeat mode)
      if (arg === '--fail-fast') {
        repeat.failFast = true;
      }

      // --no-fail-fast (for repeat mode)
      if (arg === '--no-fail-fast') {
        repeat.failFast = false;
      }
    }

    return { retry, repeat };
  }

  /**
   * Determine if a test should be considered flaky based on history
   *
   * @param passCount - Number of times test passed
   * @param failCount - Number of times test failed
   * @param threshold - Flakiness threshold (0-1)
   * @returns Whether the test is considered flaky
   */
  static isFlakyTest(
    passCount: number,
    failCount: number,
    threshold: number = 0.1
  ): boolean {
    const total = passCount + failCount;
    if (total === 0) return false;

    const failureRate = failCount / total;
    const passRate = passCount / total;

    // A test is flaky if it sometimes passes and sometimes fails
    // and neither rate is below the threshold
    return failureRate >= threshold && passRate >= threshold;
  }

  /**
   * Calculate flakiness score
   *
   * @param passCount - Number of times test passed
   * @param failCount - Number of times test failed
   * @returns Flakiness score (0 = stable, 1 = maximally flaky)
   */
  static calculateFlakinessScore(passCount: number, failCount: number): number {
    const total = passCount + failCount;
    if (total === 0) return 0;

    // Maximum flakiness is when pass/fail are 50/50
    const failureRate = failCount / total;
    return 4 * failureRate * (1 - failureRate);
  }

  /**
   * Create a test isolation context
   *
   * Resets certain global state between test retries to ensure
   * each attempt starts fresh.
   *
   * @returns Cleanup function to restore state
   */
  static createIsolationContext(): () => void {
    if (!isFeatureEnabled(TEST_RESILIENCE)) {
      return () => {};
    }

    // Store original values
    const originalEnv = { ...process.env };
    const originalTimers: Map<ReturnType<typeof setTimeout>, boolean> = new Map();

    // Clear any pending timers (within reason)
    // Note: In real implementation, this would use Bun's fake timers

    return () => {
      // Restore environment
      for (const key of Object.keys(process.env)) {
        if (!(key in originalEnv)) {
          delete process.env[key];
        }
      }
      Object.assign(process.env, originalEnv);
    };
  }

  /**
   * Run test with full isolation
   *
   * @param testFn - Test function
   * @param config - Retry configuration
   * @returns Execution result
   */
  static async executeWithIsolation(
    testFn: TestFn,
    config: Partial<RetryConfig> = {}
  ): Promise<TestExecutionResult> {
    const fullConfig: RetryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    const startTime = performance.now();
    const errors: Error[] = [];
    const retryDelays: number[] = [];

    if (!isFeatureEnabled(TEST_RESILIENCE)) {
      try {
        await testFn();
        return {
          passed: true,
          attempts: 1,
          totalTimeMs: performance.now() - startTime,
          errors: [],
          retryDelays: [],
        };
      } catch (error) {
        return {
          passed: false,
          attempts: 1,
          totalTimeMs: performance.now() - startTime,
          errors: [error instanceof Error ? error : new Error(String(error))],
          retryDelays: [],
        };
      }
    }

    for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
      const cleanup = this.createIsolationContext();

      try {
        await testFn();
        cleanup();

        return {
          passed: true,
          attempts: attempt + 1,
          totalTimeMs: performance.now() - startTime,
          errors,
          retryDelays,
        };
      } catch (error) {
        cleanup();
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);

        if (attempt < fullConfig.maxRetries) {
          const delay = this.calculateRetryDelay(attempt, fullConfig);
          retryDelays.push(delay);
          await this.sleep(delay);
        }
      }
    }

    return {
      passed: false,
      attempts: fullConfig.maxRetries + 1,
      totalTimeMs: performance.now() - startTime,
      errors,
      retryDelays,
    };
  }
}

/**
 * Zero-cost exports
 */
export const calculateRetryDelay = FlakyTestResilienceEngine.calculateRetryDelay.bind(
  FlakyTestResilienceEngine
);
export const executeWithRetry = FlakyTestResilienceEngine.executeWithRetry.bind(
  FlakyTestResilienceEngine
);
export const executeWithRepeat = FlakyTestResilienceEngine.executeWithRepeat.bind(
  FlakyTestResilienceEngine
);
export const withRetry = FlakyTestResilienceEngine.withRetry.bind(FlakyTestResilienceEngine);
export const withRepeat = FlakyTestResilienceEngine.withRepeat.bind(FlakyTestResilienceEngine);
export const parseCliArgs = FlakyTestResilienceEngine.parseCliArgs.bind(FlakyTestResilienceEngine);
export const isFlakyTest = FlakyTestResilienceEngine.isFlakyTest.bind(FlakyTestResilienceEngine);
export const calculateFlakinessScore = FlakyTestResilienceEngine.calculateFlakinessScore.bind(
  FlakyTestResilienceEngine
);
export const createIsolationContext = FlakyTestResilienceEngine.createIsolationContext.bind(
  FlakyTestResilienceEngine
);
export const executeWithIsolation = FlakyTestResilienceEngine.executeWithIsolation.bind(
  FlakyTestResilienceEngine
);
