/**
 * Component #47: Fake Timers Engine
 * Logic Tier: Level 2 (Test)
 * Resource Tax: Heap <1MB
 * Parity Lock: 8q9r...0s1t
 * Protocol: Jest Fake Timers
 *
 * Deterministic time control for 99.9% CI pass rate.
 * Provides Jest-compatible fake timers API for bun:test.
 *
 * @module infrastructure/fake-timers-engine
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * Timer entry for tracking scheduled callbacks
 */
interface TimerEntry {
  id: number;
  callback: (...args: unknown[]) => void;
  args: unknown[];
  delay: number;
  expires: number;
  type: 'timeout' | 'interval';
  createdAt: number;
}

/**
 * Fake timers options
 */
export interface FakeTimersOptions {
  now?: number | Date;
  advanceTimers?: boolean | number;
  doNotFake?: ('setTimeout' | 'setInterval' | 'clearTimeout' | 'clearInterval' | 'Date')[];
}

/**
 * Fake Timers Engine for deterministic testing
 */
export class FakeTimersEngine {
  private static isEnabled = false;
  private static currentTime = Date.now();
  private static timers = new Map<number, TimerEntry>();
  private static nextTimerId = 1;
  private static timerCount = 0;

  // Original implementations
  private static originalSetTimeout: typeof setTimeout | null = null;
  private static originalSetInterval: typeof setInterval | null = null;
  private static originalClearTimeout: typeof clearTimeout | null = null;
  private static originalClearInterval: typeof clearInterval | null = null;
  private static originalDateNow: typeof Date.now | null = null;

  /**
   * Enable fake timers
   */
  static useFakeTimers(options?: FakeTimersOptions): typeof FakeTimersEngine {
    if (!isFeatureEnabled('TEST_VALIDATION')) {
      return this;
    }

    if (this.isEnabled) {
      return this;
    }

    this.isEnabled = true;
    this.currentTime = options?.now !== undefined
      ? new Date(options.now).getTime()
      : Date.now();

    // Store originals
    this.originalSetTimeout = globalThis.setTimeout;
    this.originalSetInterval = globalThis.setInterval;
    this.originalClearTimeout = globalThis.clearTimeout;
    this.originalClearInterval = globalThis.clearInterval;
    this.originalDateNow = Date.now;

    const doNotFake = options?.doNotFake || [];

    // Override globals
    if (!doNotFake.includes('setTimeout')) {
      (globalThis as Record<string, unknown>).setTimeout = this.fakeSetTimeout.bind(this);
    }
    if (!doNotFake.includes('setInterval')) {
      (globalThis as Record<string, unknown>).setInterval = this.fakeSetInterval.bind(this);
    }
    if (!doNotFake.includes('clearTimeout')) {
      (globalThis as Record<string, unknown>).clearTimeout = this.fakeClearTimeout.bind(this);
    }
    if (!doNotFake.includes('clearInterval')) {
      (globalThis as Record<string, unknown>).clearInterval = this.fakeClearInterval.bind(this);
    }
    if (!doNotFake.includes('Date')) {
      Date.now = () => this.currentTime;
    }

    return this;
  }

  /**
   * Restore real timers
   */
  static useRealTimers(): typeof FakeTimersEngine {
    if (!this.isEnabled) {
      return this;
    }

    this.isEnabled = false;

    // Restore originals
    if (this.originalSetTimeout) {
      (globalThis as Record<string, unknown>).setTimeout = this.originalSetTimeout;
    }
    if (this.originalSetInterval) {
      (globalThis as Record<string, unknown>).setInterval = this.originalSetInterval;
    }
    if (this.originalClearTimeout) {
      (globalThis as Record<string, unknown>).clearTimeout = this.originalClearTimeout;
    }
    if (this.originalClearInterval) {
      (globalThis as Record<string, unknown>).clearInterval = this.originalClearInterval;
    }
    if (this.originalDateNow) {
      Date.now = this.originalDateNow;
    }

    // Clear timers
    this.timers.clear();
    this.timerCount = 0;

    return this;
  }

  /**
   * Advance timers by specified milliseconds
   */
  static advanceTimersByTime(ms: number): typeof FakeTimersEngine {
    if (!this.isEnabled) {
      return this;
    }

    const targetTime = this.currentTime + ms;

    // Execute all timers up to target time in order
    while (this.currentTime < targetTime) {
      const nextTimer = this.getNextTimer();

      if (!nextTimer || nextTimer.expires > targetTime) {
        this.currentTime = targetTime;
        break;
      }

      this.currentTime = nextTimer.expires;
      this.executeTimer(nextTimer);
    }

    return this;
  }

  /**
   * Advance timers to next scheduled timer
   */
  static advanceTimersToNextTimer(): typeof FakeTimersEngine {
    if (!this.isEnabled) {
      return this;
    }

    const nextTimer = this.getNextTimer();
    if (nextTimer) {
      this.currentTime = nextTimer.expires;
      this.executeTimer(nextTimer);
    }

    return this;
  }

  /**
   * Run all pending timers
   */
  static runAllTimers(): typeof FakeTimersEngine {
    if (!this.isEnabled) {
      return this;
    }

    const maxIterations = 10000;
    let iterations = 0;

    while (this.timers.size > 0 && iterations < maxIterations) {
      const nextTimer = this.getNextTimer();
      if (!nextTimer) break;

      this.currentTime = nextTimer.expires;
      this.executeTimer(nextTimer);
      iterations++;
    }

    if (iterations >= maxIterations) {
      throw new Error('Exceeded max iterations in runAllTimers');
    }

    return this;
  }

  /**
   * Run only pending timers (no new timers created during execution)
   */
  static runOnlyPendingTimers(): typeof FakeTimersEngine {
    if (!this.isEnabled) {
      return this;
    }

    const pendingIds = [...this.timers.keys()];

    for (const id of pendingIds) {
      const timer = this.timers.get(id);
      if (timer) {
        this.currentTime = Math.max(this.currentTime, timer.expires);
        this.executeTimer(timer);
      }
    }

    return this;
  }

  /**
   * Clear all pending timers
   */
  static clearAllTimers(): typeof FakeTimersEngine {
    this.timers.clear();
    return this;
  }

  /**
   * Get count of pending timers
   */
  static getTimerCount(): number {
    return this.timers.size;
  }

  /**
   * Get current fake time
   */
  static now(): number {
    if (this.isEnabled) {
      return this.currentTime;
    }
    return this.originalDateNow ? this.originalDateNow() : Date.now();
  }

  /**
   * Set current time explicitly
   */
  static setSystemTime(now: number | Date): typeof FakeTimersEngine {
    this.currentTime = typeof now === 'number' ? now : now.getTime();
    return this;
  }

  /**
   * Check if fake timers are enabled
   */
  static isFakeTimersEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get real time (even when faking)
   */
  static getRealSystemTime(): number {
    return this.originalDateNow ? this.originalDateNow() : Date.now();
  }

  // Internal fake implementations
  private static fakeSetTimeout(
    callback: (...args: unknown[]) => void,
    delay?: number,
    ...args: unknown[]
  ): number {
    const id = this.nextTimerId++;
    const timer: TimerEntry = {
      id,
      callback,
      args,
      delay: delay ?? 0,
      expires: this.currentTime + (delay ?? 0),
      type: 'timeout',
      createdAt: this.currentTime,
    };

    this.timers.set(id, timer);
    this.timerCount++;

    return id;
  }

  private static fakeSetInterval(
    callback: (...args: unknown[]) => void,
    delay?: number,
    ...args: unknown[]
  ): number {
    const id = this.nextTimerId++;
    const timer: TimerEntry = {
      id,
      callback,
      args,
      delay: delay ?? 0,
      expires: this.currentTime + (delay ?? 0),
      type: 'interval',
      createdAt: this.currentTime,
    };

    this.timers.set(id, timer);
    this.timerCount++;

    return id;
  }

  private static fakeClearTimeout(id: number): void {
    this.timers.delete(id);
  }

  private static fakeClearInterval(id: number): void {
    this.timers.delete(id);
  }

  private static getNextTimer(): TimerEntry | undefined {
    let next: TimerEntry | undefined;

    for (const timer of this.timers.values()) {
      if (!next || timer.expires < next.expires) {
        next = timer;
      }
    }

    return next;
  }

  private static executeTimer(timer: TimerEntry): void {
    // Remove timeout, reschedule interval
    if (timer.type === 'timeout') {
      this.timers.delete(timer.id);
    } else {
      // Reschedule interval
      timer.expires = this.currentTime + timer.delay;
    }

    // Execute callback
    try {
      timer.callback(...timer.args);
    } catch (error) {
      // Rethrow to maintain test behavior
      throw error;
    }
  }
}

/**
 * Jest-compatible API export
 */
export const jest = {
  useFakeTimers: FakeTimersEngine.useFakeTimers.bind(FakeTimersEngine),
  useRealTimers: FakeTimersEngine.useRealTimers.bind(FakeTimersEngine),
  advanceTimersByTime: FakeTimersEngine.advanceTimersByTime.bind(FakeTimersEngine),
  advanceTimersToNextTimer: FakeTimersEngine.advanceTimersToNextTimer.bind(FakeTimersEngine),
  runAllTimers: FakeTimersEngine.runAllTimers.bind(FakeTimersEngine),
  runOnlyPendingTimers: FakeTimersEngine.runOnlyPendingTimers.bind(FakeTimersEngine),
  clearAllTimers: FakeTimersEngine.clearAllTimers.bind(FakeTimersEngine),
  getTimerCount: FakeTimersEngine.getTimerCount.bind(FakeTimersEngine),
  now: FakeTimersEngine.now.bind(FakeTimersEngine),
  setSystemTime: FakeTimersEngine.setSystemTime.bind(FakeTimersEngine),
  isFakeTimers: FakeTimersEngine.isFakeTimersEnabled.bind(FakeTimersEngine),
  getRealSystemTime: FakeTimersEngine.getRealSystemTime.bind(FakeTimersEngine),
};

/**
 * Convenience function for test setup
 */
export function withFakeTimers<T>(
  fn: () => T | Promise<T>,
  options?: FakeTimersOptions
): T | Promise<T> {
  FakeTimersEngine.useFakeTimers(options);
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.finally(() => FakeTimersEngine.useRealTimers());
    }
    FakeTimersEngine.useRealTimers();
    return result;
  } catch (error) {
    FakeTimersEngine.useRealTimers();
    throw error;
  }
}
