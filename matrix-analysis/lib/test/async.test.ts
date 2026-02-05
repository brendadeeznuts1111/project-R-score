import { describe, it, expect } from "bun:test";
import {
  retry,
  retrySafe,
  pool,
  poolSafe,
  debounce,
  throttle,
  deferred,
  withTimeout,
  withTimeoutSafe,
} from "../src/core/async.ts";

describe("async", () => {
  describe("BN-070: retry", () => {
    it("should resolve on first try", async () => {
      const result = await retry(async () => 42);
      expect(result).toBe(42);
    });

    it("should retry on failure then succeed", async () => {
      let calls = 0;
      const result = await retry(async (attempt) => {
        calls++;
        if (attempt < 2) throw new Error("fail");
        return "ok";
      }, { retries: 3, delayMs: 10 });
      expect(result).toBe("ok");
      expect(calls).toBe(3);
    });

    it("should throw after exhausting retries", async () => {
      await expect(
        retry(async () => { throw new Error("always"); }, { retries: 2, delayMs: 10 })
      ).rejects.toThrow("always");
    });

    it("should call onRetry callback", async () => {
      let retryCount = 0;
      await retry(async (attempt) => {
        if (attempt < 1) throw new Error("fail");
        return true;
      }, { retries: 2, delayMs: 10, onRetry: () => { retryCount++; } });
      expect(retryCount).toBe(1);
    });

    it("should respect shouldRetry predicate", async () => {
      await expect(
        retry(async () => { throw new Error("fatal"); }, {
          retries: 3,
          delayMs: 10,
          shouldRetry: (err) => (err as Error).message !== "fatal",
        })
      ).rejects.toThrow("fatal");
    });

    it("retrySafe should return null on failure", async () => {
      const result = await retrySafe(async () => { throw new Error("fail"); }, { retries: 1, delayMs: 10 });
      expect(result).toBeNull();
    });
  });

  describe("BN-071: pool", () => {
    it("should process all items", async () => {
      const results = await pool([1, 2, 3, 4], async (n) => n * 2, 2);
      expect(results).toEqual([2, 4, 6, 8]);
    });

    it("should respect concurrency limit", async () => {
      let concurrent = 0;
      let maxConcurrent = 0;
      await pool(Array.from({ length: 10 }, (_, i) => i), async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await Bun.sleep(5);
        concurrent--;
      }, 3);
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it("should preserve order", async () => {
      const results = await pool([30, 10, 20], async (ms) => {
        await Bun.sleep(ms);
        return ms;
      }, 3);
      expect(results).toEqual([30, 10, 20]);
    });

    it("poolSafe should return null for failed items", async () => {
      const results = await poolSafe([1, 2, 3], async (n) => {
        if (n === 2) throw new Error("fail");
        return n;
      }, 2);
      expect(results).toEqual([1, null, 3]);
    });
  });

  describe("BN-072: debounce", () => {
    it("should delay execution", async () => {
      let called = 0;
      const fn = debounce(() => { called++; }, 20);
      fn();
      fn();
      fn();
      expect(called).toBe(0);
      await Bun.sleep(50);
      expect(called).toBe(1);
    });

    it("should cancel pending execution", async () => {
      let called = 0;
      const fn = debounce(() => { called++; }, 20);
      fn();
      fn.cancel();
      await Bun.sleep(50);
      expect(called).toBe(0);
    });
  });

  describe("BN-073: throttle", () => {
    it("should execute immediately on first call", async () => {
      let called = 0;
      const fn = throttle(() => { called++; }, 50);
      fn();
      expect(called).toBe(1);
      fn.cancel();
    });

    it("should throttle subsequent calls", async () => {
      let called = 0;
      const fn = throttle(() => { called++; }, 30);
      fn();
      fn();
      fn();
      expect(called).toBe(1);
      await Bun.sleep(50);
      expect(called).toBe(2);
      fn.cancel();
    });

    it("should cancel pending throttled call", async () => {
      let called = 0;
      const fn = throttle(() => { called++; }, 50);
      fn(); // immediate
      fn(); // queued
      expect(called).toBe(1);
      fn.cancel(); // cancel the queued call
      await Bun.sleep(80);
      expect(called).toBe(1); // stayed at 1
    });
  });

  describe("BN-074: deferred & withTimeout", () => {
    it("should create resolvable deferred", async () => {
      const d = deferred<number>();
      setTimeout(() => d.resolve(99), 5);
      expect(await d.promise).toBe(99);
    });

    it("should create rejectable deferred", async () => {
      const d = deferred<number>();
      setTimeout(() => d.reject(new Error("nope")), 5);
      await expect(d.promise).rejects.toThrow("nope");
    });

    it("withTimeout should resolve if fast enough", async () => {
      const result = await withTimeout(Promise.resolve(42), 1000);
      expect(result).toBe(42);
    });

    it("withTimeout should reject on timeout", async () => {
      await expect(
        withTimeout(new Promise(() => {}), 20, "too slow")
      ).rejects.toThrow("too slow");
    });

    it("withTimeoutSafe should return null on timeout", async () => {
      const result = await withTimeoutSafe(new Promise(() => {}), 20);
      expect(result).toBeNull();
    });
  });
});
