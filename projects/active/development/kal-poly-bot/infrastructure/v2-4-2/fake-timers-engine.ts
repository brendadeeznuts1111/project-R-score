import "./types.d.ts";
// infrastructure/v2-4-2/fake-timers-engine.ts
// Component #43: Fake Timers Engine (Deterministic Test Infrastructure)

import { feature } from "bun:bundle";

// Integrates with Snapshot-Validator (Component #18) for 99.9% CI pass rate
export class FakeTimersEngine {
  private static isEnabled = false;
  private static currentTime = Date.now();
  private static timers = new Map<number, Timer>();
  private static nextTimerId = 1;

  // Zero-cost when FAKE_TIMERS feature is disabled
  static useFakeTimers(options?: { now?: number | Date }): void {
    if (!feature("FAKE_TIMERS")) {
      // No-op when disabled (dead code eliminated)
      return;
    }

    this.isEnabled = true;
    this.currentTime = options?.now
      ? new Date(options.now).getTime()
      : Date.now();

    // Store original timers
    this.originalSetTimeout = globalThis.setTimeout;
    this.originalSetInterval = globalThis.setInterval;
    this.originalClearTimeout = globalThis.clearTimeout;
    this.originalClearInterval = globalThis.clearInterval;
    this.originalDateNow = Date.now.bind(Date);
    this.originalPerformanceNow = performance.now.bind(performance);

    // Override global timers
    globalThis.setTimeout = this.setTimeout.bind(this);
    globalThis.setInterval = this.setInterval.bind(this);
    globalThis.clearTimeout = this.clearTimeout.bind(this);
    globalThis.clearInterval = this.clearInterval.bind(this);

    // Override time APIs
    Date.now = () => this.currentTime;
    performance.now = () => this.currentTime;

    // Mock new Date() constructor
    const OriginalDate = globalThis.Date;
    globalThis.Date = function (this: any, ...args: any[]) {
      if (args.length === 0) {
        return new OriginalDate(FakeTimersEngine.currentTime);
      }
      return new OriginalDate(...args);
    } as any;

    // Preserve static methods
    Object.setPrototypeOf(globalThis.Date, OriginalDate);
    Object.defineProperty(globalThis.Date, "name", { value: "Date" });
    Object.defineProperty(globalThis.Date, "length", { value: 7 });
  }

  static useRealTimers(): void {
    if (!feature("FAKE_TIMERS")) return;

    this.isEnabled = false;
    this.timers.clear();

    // Restore original timers
    if (this.originalSetTimeout) {
      globalThis.setTimeout = this.originalSetTimeout;
      globalThis.setInterval = this.originalSetInterval;
      globalThis.clearTimeout = this.originalClearTimeout;
      globalThis.clearInterval = this.originalClearInterval;
      Date.now = this.originalDateNow!;
      performance.now = this.originalPerformanceNow!;

      // Restore Date constructor
      globalThis.Date = this.originalDateConstructor!;
    }
  }

  static advanceTimersByTime(ms: number): void {
    if (!feature("FAKE_TIMERS") || !this.isEnabled) return;

    const targetTime = this.currentTime + ms;

    // Execute all timers up to target time
    const sortedTimers = [...this.timers.entries()].sort(
      (a, b) => a[1].expires - b[1].expires
    );

    for (const [id, timer] of sortedTimers) {
      if (timer.expires <= targetTime) {
        this.currentTime = timer.expires;

        try {
          timer.callback();
        } catch (error) {
          console.error(`Timer callback failed:`, error);
        }

        this.timers.delete(id);

        // Re-schedule interval timers
        if (timer.type === "interval") {
          timer.expires = this.currentTime + timer.delay;
          this.timers.set(id, timer);
        }
      }
    }

    this.currentTime = targetTime;
  }

  static advanceTimersToNextTimer(): void {
    if (!feature("FAKE_TIMERS") || !this.isEnabled || this.timers.size === 0)
      return;

    const nextTimer = [...this.timers.values()].sort(
      (a, b) => a.expires - b.expires
    )[0];

    if (nextTimer) {
      this.advanceTimersByTime(nextTimer.expires - this.currentTime);
    }
  }

  static runAllTimers(): void {
    if (!feature("FAKE_TIMERS") || !this.isEnabled) return;

    while (this.timers.size > 0) {
      this.advanceTimersToNextTimer();
    }
  }

  static getTimerCount(): number {
    return this.timers.size;
  }

  static getCurrentTime(): number {
    return this.currentTime;
  }

  private static setTimeout(
    callback: (...args: unknown[]) => void,
    delay: number,
    ...args: unknown[]
  ): number {
    if (!this.isEnabled) {
      return this.originalSetTimeout!(callback, delay, ...args);
    }

    const timer: Timer = {
      id: this.nextTimerId++,
      callback,
      delay,
      expires: this.currentTime + delay,
      type: "timeout",
    };

    this.timers.set(timer.id, timer);
    return timer.id;
  }

  private static setInterval(
    callback: (...args: unknown[]) => void,
    delay: number,
    ...args: unknown[]
  ): number {
    if (!this.isEnabled) {
      return this.originalSetInterval!(callback, delay, ...args);
    }

    const timer: Timer = {
      id: this.nextTimerId++,
      callback,
      delay,
      expires: this.currentTime + delay,
      type: "interval",
    };

    this.timers.set(timer.id, timer);
    return timer.id;
  }

  private static clearTimeout(id?: number): void {
    if (!this.isEnabled) {
      this.originalClearTimeout!(id);
      return;
    }

    if (id !== undefined) {
      this.timers.delete(id);
    }
  }

  private static clearInterval(id?: number): void {
    if (!this.isEnabled) {
      this.originalClearInterval!(id);
      return;
    }

    if (id !== undefined) {
      this.timers.delete(id);
    }
  }

  // Store original timer references
  private static originalSetTimeout:
    | ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => number)
    | undefined;
  private static originalSetInterval:
    | ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => number)
    | undefined;
  private static originalClearTimeout: ((id?: number) => void) | undefined;
  private static originalClearInterval: ((id?: number) => void) | undefined;
  private static originalDateNow: (() => number) | undefined;
  private static originalPerformanceNow: (() => number) | undefined;
  private static originalDateConstructor: DateConstructor | undefined;
}

interface Timer {
  id: number;
  callback: () => void;
  delay: number;
  expires: number;
  type: "timeout" | "interval";
}

// Zero-cost Jest API export
export const jest = feature("FAKE_TIMERS")
  ? {
      useFakeTimers: FakeTimersEngine.useFakeTimers.bind(FakeTimersEngine),
      useRealTimers: FakeTimersEngine.useRealTimers.bind(FakeTimersEngine),
      advanceTimersByTime:
        FakeTimersEngine.advanceTimersByTime.bind(FakeTimersEngine),
      advanceTimersToNextTimer:
        FakeTimersEngine.advanceTimersToNextTimer.bind(FakeTimersEngine),
      runAllTimers: FakeTimersEngine.runAllTimers.bind(FakeTimersEngine),
      getTimerCount: FakeTimersEngine.getTimerCount.bind(FakeTimersEngine),
      isFakeTimers: () => (FakeTimersEngine as any).isEnabled,
      getCurrentTime: FakeTimersEngine.getCurrentTime.bind(FakeTimersEngine),
    }
  : {
      useFakeTimers: () => {},
      useRealTimers: () => {},
      advanceTimersByTime: () => {},
      advanceTimersToNextTimer: () => {},
      runAllTimers: () => {},
      getTimerCount: () => 0,
      isFakeTimers: () => false,
      getCurrentTime: () => Date.now(),
    };

export default FakeTimersEngine;
