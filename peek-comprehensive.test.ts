import { peek } from "bun";
import { expect, test, describe } from "bun:test";

describe("Bun.peek() - Comprehensive Tests", () => {
  test("reads fulfilled promise result without await", () => {
    const promise = Promise.resolve("hello world");
    
    // no await necessary!
    expect(peek(promise)).toBe("hello world");
    
    // peek again returns same cached result
    expect(peek(promise)).toBe("hello world");
  });

  test("peek.status reads promise status without resolving", () => {
    const fulfilled = Promise.resolve(true);
    const pending = new Promise(() => {});
    
    expect(peek.status(fulfilled)).toBe("fulfilled");
    expect(peek.status(pending)).toBe("pending");
    
    // Non-promises are considered fulfilled
    expect(peek.status(42)).toBe("fulfilled");
    expect(peek.status("string")).toBe("fulfilled");
    expect(peek.status(null)).toBe("fulfilled");
  });

  test("returns pending promise unchanged", () => {
    const pending = new Promise(() => {}); // Never resolves
    expect(peek(pending)).toBe(pending);
  });

  test("returns non-promise values unchanged", () => {
    expect(peek(42)).toBe(42);
    expect(peek("string")).toBe("string");
    expect(peek(true)).toBe(true);
    expect(peek(null)).toBe(null);
    expect(peek(undefined)).toBe(undefined);
    expect(peek({})).toEqual({});
    expect(peek([])).toEqual([]);
  });

  test("works with different data types", () => {
    // String
    const stringPromise = Promise.resolve("test string");
    expect(peek(stringPromise)).toBe("test string");
    
    // Number
    const numberPromise = Promise.resolve(123);
    expect(peek(numberPromise)).toBe(123);
    
    // Boolean
    const boolPromise = Promise.resolve(false);
    expect(peek(boolPromise)).toBe(false);
    
    // Object
    const objPromise = Promise.resolve({ key: "value" });
    expect(peek(objPromise)).toEqual({ key: "value" });
    
    // Array
    const arrayPromise = Promise.resolve([1, 2, 3]);
    expect(peek(arrayPromise)).toEqual([1, 2, 3]);
    
    // Null
    const nullPromise = Promise.resolve(null);
    expect(peek(nullPromise)).toBe(null);
  });

  test("performance: peek is faster than await for resolved promises", async () => {
    const promise = Promise.resolve("performance test");
    
    // Measure peek performance
    const peekStart = performance.now();
    const peekResult = peek(promise);
    const peekEnd = performance.now();
    const peekTime = peekEnd - peekStart;
    
    // Measure await performance
    const awaitStart = performance.now();
    const awaitResult = await promise;
    const awaitEnd = performance.now();
    const awaitTime = awaitEnd - awaitStart;
    
    // Both should return same result
    expect(peekResult).toBe(awaitResult);
    
    // peek should be faster (or at least not significantly slower)
    console.log(`peek(): ${peekTime.toFixed(3)}ms, await: ${awaitTime.toFixed(3)}ms`);
    expect(peekTime).toBeLessThan(awaitTime + 1); // Allow 1ms tolerance
  });

  test("performance: peek.status is extremely fast", () => {
    const promise = Promise.resolve("test");
    
    // Measure status checking performance
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      peek.status(promise);
    }
    const end = performance.now();
    
    const time = end - start;
    console.log(`10,000 peek.status() calls: ${time.toFixed(3)}ms`);
    expect(time).toBeLessThan(10); // Should be extremely fast
  });

  test("practical usage: conditional processing", () => {
    function processData(data: string): string | Promise<string> {
      if (data.length < 10) {
        // Small data - process synchronously
        return Promise.resolve(data.toUpperCase());
      } else {
        // Large data - process asynchronously
        return new Promise(resolve => 
          setTimeout(() => resolve(data.toUpperCase()), 10)
        );
      }
    }
    
    const smallData = "hello";
    const largeData = "this is a very long string";
    
    const smallPromise = processData(smallData);
    const largePromise = processData(largeData);
    
    // Small data should be immediately available
    const smallResult = peek(smallPromise);
    expect(smallResult).toBe("HELLO");
    
    // Large data should still be pending
    const largeResult = peek(largePromise);
    expect(largeResult).toBe(largePromise);
  });

  test("practical usage: smart processing with peek.status", () => {
    function processSmart<T>(promise: Promise<T>): T | Promise<T> | undefined {
      const status = peek.status(promise);
      
      switch (status) {
        case "fulfilled":
          return peek(promise) as T; // Already resolved, get value synchronously
        case "pending":
          return promise; // Still pending, return promise for async handling
        case "rejected":
          return undefined; // Rejected, return undefined or handle error
        default:
          return undefined;
      }
    }
    
    const quickResult = Promise.resolve("instant");
    const slowResult = new Promise(resolve => setTimeout(() => resolve("delayed"), 100));
    
    const quick = processSmart(quickResult);
    const slow = processSmart(slowResult);
    
    expect(quick).toBe("instant"); // Available immediately
    expect(slow).toBe(slowResult); // Still pending
  });

  test("practical usage: caching with peek", () => {
    const cache = new Map<Promise<any>, any>();
    
    function getCachedResult<T>(promise: Promise<T>): T | undefined {
      if (cache.has(promise)) {
        return cache.get(promise);
      }
      
      const result = peek(promise);
      if (result !== undefined && result !== promise) {
        cache.set(promise, result);
        return result as T;
      }
      
      return undefined;
    }
    
    const promise = Promise.resolve({ id: 1, data: "cached" });
    
    // First call - should cache the result
    const first = getCachedResult(promise);
    expect(first).toEqual({ id: 1, data: "cached" });
    
    // Second call - should return from cache
    const second = getCachedResult(promise);
    expect(second).toEqual({ id: 1, data: "cached" });
    
    // Verify cache was used
    expect(cache.size).toBe(1);
    expect(cache.get(promise)).toEqual({ id: 1, data: "cached" });
  });

  test("practical usage: promise aggregation with status filtering", () => {
    const promises = [
      Promise.resolve("first"),
      Promise.resolve("second"),
      new Promise(resolve => setTimeout(() => resolve("third"), 50)),
      Promise.resolve("fourth")
    ];
    
    function getPromisesByStatus<T>(promises: Promise<T>[], status: string): Promise<T>[] {
      return promises.filter(p => peek.status(p) === status);
    }
    
    function getResolvedResults<T>(promises: Promise<T>[]): (T | undefined)[] {
      const results: (T | undefined)[] = [];
      
      for (const promise of promises) {
        const value = peek(promise);
        if (value !== undefined && value !== promise) {
          results.push(value as T);
        } else {
          results.push(undefined);
        }
      }
      
      return results;
    }
    
    const fulfilled = getPromisesByStatus(promises, "fulfilled");
    const pending = getPromisesByStatus(promises, "pending");
    
    expect(fulfilled).toHaveLength(3);
    expect(pending).toHaveLength(1);
    
    // Get values from fulfilled promises
    const values = fulfilled.map(p => peek(p) as string);
    expect(values).toEqual(["first", "second", "fourth"]);
    
    const currentResults = getResolvedResults(promises);
    expect(currentResults).toEqual(["first", "second", undefined, "fourth"]);
    
    // Check after delay
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const laterResults = getResolvedResults(promises);
        expect(laterResults).toEqual(["first", "second", "third", "fourth"]);
        resolve();
      }, 100);
    });
  });
});
