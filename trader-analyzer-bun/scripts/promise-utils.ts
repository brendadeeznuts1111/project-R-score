#!/usr/bin/env bun

/**
 * @fileoverview Advanced Promise Utilities
 * @description High-performance promise utilities using Bun.peek and native APIs
 * @module promise-utils
 */

export class PromiseUtils {
  static peek = Bun.peek;

  static async raceWithTimeout<T>(
    promises: Promise<T>[],
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([...promises, timeoutPromise]);
  }

  static async allSettledWithTimeout<T>(
    promises: Promise<T>[],
    timeoutMs: number
  ): Promise<PromiseSettledResult<T>[]> {
    const results: PromiseSettledResult<T>[] = [];
    const settled = new Set<number>();

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        promises.forEach((_, index) => {
          if (!settled.has(index)) {
            results[index] = {
              status: 'rejected',
              reason: new Error(`Timeout after ${timeoutMs}ms`)
            };
          }
        });
        resolve();
      }, timeoutMs);
    });

    const settlementPromises = promises.map(async (promise, index) => {
      try {
        const value = await promise;
        if (!settled.has(index)) {
          results[index] = { status: 'fulfilled', value };
          settled.add(index);
        }
      } catch (reason) {
        if (!settled.has(index)) {
          results[index] = { status: 'rejected', reason };
          settled.add(index);
        }
      }
    });

    await Promise.allSettled([...settlementPromises, timeoutPromise]);
    return results;
  }

  static createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  }

  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      retries?: number;
      delay?: number;
      backoff?: number;
      shouldRetry?: (error: Error) => boolean;
    } = {}
  ): Promise<T> {
    const {
      retries = 3,
      delay = 100,
      backoff = 2,
      shouldRetry = () => true
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === retries || !shouldRetry(lastError)) {
          throw lastError;
        }

        if (attempt < retries) {
          const waitTime = delay * Math.pow(backoff, attempt);
          const jitter = Math.random() * waitTime * 0.1;
          await Bun.sleep(waitTime + jitter);
        }
      }
    }

    throw lastError!;
  }

  static async timeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutError?: Error
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  static async delay<T>(
    promise: Promise<T>,
    delayMs: number
  ): Promise<T> {
    const [result] = await Promise.all([
      promise,
      Bun.sleep(delayMs)
    ]);
    return result;
  }

  static async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return this.timeout(fn(), timeoutMs);
  }

  static async parallelLimit<T, R>(
    items: T[],
    mapper: (item: T, index: number) => Promise<R>,
    limit: number
  ): Promise<R[]> {
    const results: (R | undefined)[] = new Array(items.length);
    const executing: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const promise = (async () => {
        try {
          const result = await mapper(item, i);
          results[i] = result;
        } catch (error) {
          throw error;
        }
      })();

      if (executing.length >= limit) {
        await Promise.race(executing);
      }

      executing.push(promise.then(() => {
        executing.splice(executing.indexOf(promise), 1);
      }));
    }

    await Promise.all(executing);
    return results as R[];
  }

  static async batch<T, R>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
    }

    return results;
  }

  static memoize<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    getKey?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map<string, Promise<any>>();

    return ((...args: Parameters<T>) => {
      const key = getKey ? getKey(...args) : JSON.stringify(args);

      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const promise = fn(...args);
      cache.set(key, promise);

      // Clean up cache when promise settles
      promise.finally(() => {
        cache.delete(key);
      });

      return promise;
    }) as T;
  }

  static async settleAll<T>(
    promises: Promise<T>[]
  ): Promise<{
    fulfilled: { value: T; index: number }[];
    rejected: { reason: any; index: number }[];
  }> {
    const results = await Promise.allSettled(promises);

    const fulfilled: { value: T; index: number }[] = [];
    const rejected: { reason: any; index: number }[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        fulfilled.push({ value: result.value, index });
      } else {
        rejected.push({ reason: result.reason, index });
      }
    });

    return { fulfilled, rejected };
  }
}

/**
 * Promise pool for controlling concurrency
 */
export class PromisePool {
  private running = 0;
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  constructor(private concurrency: number) {}

  async add<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running < this.concurrency) {
      return this.run(fn);
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
    });
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    this.running++;

    try {
      const result = await fn();
      return result;
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.queue.length > 0 && this.running < this.concurrency) {
      const { fn, resolve, reject } = this.queue.shift()!;
      this.run(fn).then(resolve, reject);
    }
  }

  async waitForAll(): Promise<void> {
    while (this.running > 0 || this.queue.length > 0) {
      await Bun.sleep(1);
    }
  }

  get activeCount(): number {
    return this.running;
  }

  get queueSize(): number {
    return this.queue.length;
  }
}

// Demo function
async function demo() {
  console.log('🔮 Advanced Promise Utilities Demo\n');

  // 1. Promise peek
  console.log('Promise Peek:');
  const promise = Promise.resolve('Hello, World!');
  console.log('Promise status:', Bun.peek.status(promise));
  console.log('Promise value:', Bun.peek(promise));
  console.log();

  // 2. Retry with backoff
  console.log('Retry with Backoff:');
  let attempts = 0;
  try {
    await PromiseUtils.retry(
      async () => {
        attempts++;
        console.log(`  Attempt ${attempts}`);
        if (attempts < 3) {
          throw new Error('Simulated failure');
        }
        return 'Success!';
      },
      { retries: 3, delay: 100 }
    );
    console.log('✅ Operation succeeded after', attempts, 'attempts');
  } catch (error) {
    console.log('❌ Operation failed:', error);
  }
  console.log();

  // 3. Timeout
  console.log('Promise Timeout:');
  try {
    await PromiseUtils.timeout(
      new Promise(resolve => setTimeout(() => resolve('Slow operation'), 200)),
      100
    );
  } catch (error) {
    console.log('❌ Timeout:', error instanceof Error ? error.message : String(error));
  }

  try {
    const result = await PromiseUtils.timeout(
      Promise.resolve('Fast operation'),
      1000
    );
    console.log('✅ Fast operation:', result);
  } catch (error) {
    console.log('❌ Unexpected timeout');
  }
  console.log();

  // 4. Parallel limit
  console.log('Parallel Limit:');
  const items = Array.from({ length: 10 }, (_, i) => i);
  const results = await PromiseUtils.parallelLimit(
    items,
    async (item, index) => {
      await Bun.sleep(Math.random() * 100);
      return `Item ${item} processed`;
    },
    3 // Max 3 concurrent
  );
  console.log('Processed', results.length, 'items with concurrency limit of 3');
  console.log();

  // 5. Promise pool
  console.log('Promise Pool:');
  const pool = new PromisePool(2); // Max 2 concurrent

  const poolPromises = items.slice(0, 5).map((item, index) =>
    pool.add(async () => {
      console.log(`  Processing item ${item} (active: ${pool.activeCount}, queued: ${pool.queueSize})`);
      await Bun.sleep(200);
      return `Result ${item}`;
    })
  );

  const poolResults = await Promise.all(poolPromises);
  console.log('Pool results:', poolResults.length);
  console.log();

  console.log('✨ Promise utilities demo complete!');
}

// Run demo if executed directly
if (import.meta.main) {
  demo().catch(console.error);
}