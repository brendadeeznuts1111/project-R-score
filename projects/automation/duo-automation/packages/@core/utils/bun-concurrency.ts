/**
 * Bun-Native Concurrency Utilities
 * High-performance replacements for p-limit and other concurrency libraries
 * Zero external dependencies
 */

interface Task<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

/**
 * Bun-native promise limiter
 * Replaces p-limit with zero dependencies
 */
export class BunPromiseLimiter {
  private queue: Task<any>[] = [];
  private running: number = 0;
  private concurrency: number;
  private drainPromise: { promise: Promise<void>; resolve: () => void } | null = null;

  constructor(concurrency: number = 10) {
    this.concurrency = Math.max(1, concurrency);
  }

  /**
   * Add a promise to the queue
   */
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  /**
   * Process the queue
   */
  private async process(): Promise<void> {
    while (this.running < this.concurrency && this.queue.length > 0) {
      this.running++;
      const task = this.queue.shift();

      if (!task) {
        this.running--;
        break;
      }

      // Execute task without awaiting here to allow other tasks to start
      task.fn().then(
        (result) => {
          task.resolve(result);
          this.onTaskComplete();
        },
        (error) => {
          task.reject(error instanceof Error ? error : new Error(String(error)));
          this.onTaskComplete();
        }
      );
    }
  }

  private onTaskComplete(): void {
    this.running--;
    if (this.queue.length > 0) {
      this.process();
    } else if (this.running === 0 && this.drainPromise) {
      this.drainPromise.resolve();
      this.drainPromise = null;
    }
  }

  /**
   * Clear the queue
   */
  clear(): void {
    // Reject all pending tasks
    this.queue.forEach(task => {
      task.reject(new Error('Promise limiter cleared'));
    });
    this.queue = [];
  }

  /**
   * Get current queue statistics
   */
  getStats(): { pending: number; running: number; concurrency: number } {
    return {
      pending: this.queue.length,
      running: this.running,
      concurrency: this.concurrency
    };
  }

  /**
   * Wait for all running tasks to complete
   */
  async drain(): Promise<void> {
    if (this.running === 0 && this.queue.length === 0) {
      return;
    }

    if (!this.drainPromise) {
      let resolve!: () => void;
      const promise = new Promise<void>((r) => { resolve = r; });
      this.drainPromise = { promise, resolve };
    }

    return this.drainPromise.promise;
  }
}

/**
 * Create a promise limiter
 */
export function createPromiseLimiter(concurrency: number = 10): BunPromiseLimiter {
  return new BunPromiseLimiter(concurrency);
}

/**
 * Run promises with concurrency limit
 * Replaces p-limit default export
 */
export function pLimit(concurrency: number = 10) {
  const limiter = new BunPromiseLimiter(concurrency);
  
  return {
    add: <T>(fn: () => Promise<T>) => limiter.add(fn),
    clear: () => limiter.clear(),
    getStats: () => limiter.getStats(),
    drain: () => limiter.drain()
  };
}

/**
 * Batch processing utility
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 10
): Promise<R[]> {
  const limiter = new BunPromiseLimiter(concurrency);
  
  const promises = items.map(item => 
    limiter.add(() => processor(item))
  );
  
  return Promise.all(promises);
}

/**
 * Parallel map with concurrency control
 */
export async function parallelMap<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  concurrency: number = 10
): Promise<R[]> {
  const limiter = new BunPromiseLimiter(concurrency);
  
  const promises = items.map((item, index) => 
    limiter.add(() => mapper(item, index))
  );
  
  return Promise.all(promises);
}

/**
 * Parallel filter with concurrency control
 */
export async function parallelFilter<T>(
  items: T[],
  predicate: (item: T, index: number) => Promise<boolean>,
  concurrency: number = 10
): Promise<T[]> {
  const results = await parallelMap(items, predicate, concurrency);
  return items.filter((_, index) => results[index]);
}

/**
 * Race with timeout
 */
export async function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error = new Error('Promise timed out')
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(timeoutError), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    maxDelay?: number;
    backoff?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    maxDelay = 10000,
    backoff = 2,
    onRetry
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === retries) {
        throw lastError;
      }
      
      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }
      
      const nextDelay = Math.min(delay * Math.pow(backoff, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, nextDelay));
    }
  }
  
  throw lastError!;
}

/**
 * Debounce promise execution
 */
export function debouncePromise<T>(
  fn: () => Promise<T>,
  delay: number
): () => Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<T> | null = null;
  
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    if (!pendingPromise) {
      pendingPromise = new Promise<T>((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            pendingPromise = null;
            timeoutId = null;
          }
        }, delay);
      });
    }
    
    return pendingPromise;
  };
}

/**
 * Throttle promise execution
 */
export function throttlePromise<T>(
  fn: () => Promise<T>,
  interval: number
): () => Promise<T> {
  let lastExecution = 0;
  let pendingPromise: Promise<T> | null = null;
  
  return () => {
    if (!pendingPromise) {
      pendingPromise = new Promise<T>((resolve, reject) => {
        const execute = async () => {
          try {
            const now = Date.now();
            const timeSinceLastExecution = now - lastExecution;
            
            if (timeSinceLastExecution < interval) {
              await new Promise(resolve => setTimeout(resolve, interval - timeSinceLastExecution));
            }
            
            lastExecution = Date.now();
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            pendingPromise = null;
          }
        };
        
        execute();
      });
    }
    
    return pendingPromise;
  };
}