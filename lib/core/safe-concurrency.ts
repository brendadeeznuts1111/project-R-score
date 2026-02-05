#!/usr/bin/env bun

/**
 * 🔄 Safe Concurrency Manager
 * 
 * Provides mutex, semaphore, and controlled concurrency patterns
 * for critical operations like secret management and file access.
 */

/**
 * Simple mutex implementation for exclusive access
 */
export class Mutex {
  private locked = false;
  private waiters: Array<() => void> = [];

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.waiters.push(resolve);
      }
    });
  }

  release(): void {
    if (this.waiters.length > 0) {
      const next = this.waiters.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }

  async withLock<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await operation();
    } finally {
      this.release();
    }
  }
}

/**
 * Semaphore for limiting concurrent operations
 */
export class Semaphore {
  private permits: number;
  private waiters: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waiters.push(resolve);
      }
    });
  }

  release(): void {
    if (this.waiters.length > 0) {
      const next = this.waiters.shift()!;
      next();
    } else {
      this.permits++;
    }
  }

  async withPermit<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await operation();
    } finally {
      this.release();
    }
  }
}

/**
 * Operation queue for dependency resolution
 */
export class OperationQueue {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency: number = 5) {
    this.maxConcurrency = maxConcurrency;
  }

  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedOperation = async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      };

      this.queue.push(wrappedOperation);
      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.running < this.maxConcurrency && this.queue.length > 0) {
      const operation = this.queue.shift()!;
      this.running++;
      operation();
    }
  }

  async flush(): Promise<void> {
    while (this.running > 0 || this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

/**
 * Global concurrency managers for different operation types
 */
export const ConcurrencyManagers = {
  keychain: new Mutex(), // Exclusive access to keychain
  secretResolution: new Mutex(), // Sequential secret resolution
  fileOperations: new Mutex(), // Exclusive file access
  networkRequests: new Semaphore(10), // Max 10 concurrent network requests
} as const;

/**
 * Safe concurrent execution with timeout
 */
export async function safeConcurrent<T>(
  operations: Array<() => Promise<T>>,
  maxConcurrency: number = 5,
  timeout: number = 30000
): Promise<Array<{ success: boolean; data?: T; error?: string }>> {
  const semaphore = new Semaphore(maxConcurrency);
  const results: Array<{ success: boolean; data?: T; error?: string }> = [];

  const promises = operations.map(async (operation, index) => {
    try {
      const result = await Promise.race([
        semaphore.withPermit(operation),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), timeout)
        )
      ]);
      results[index] = { success: true, data: result };
    } catch (error) {
      results[index] = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  await Promise.all(promises);
  return results;
}
