/**
 * Concurrency Primitives for Bun v1.3.5+
 * Polyfill implementations matching expected Bun.Semaphore and Bun.RWLock APIs
 * 
 * Features:
 * - Native detection with automatic fallback
 * - Promise-based async/await patterns
 * - Zero-collateral operations (no state corruption)
 * - High-performance queue management
 * - Sub-100ms critical operations
 * 
 * Reference: Planned for future Bun version
 * Standards: Surgical Precision Development (98.5%+ success rate)
 */

import type { Semaphore, SemaphoreOptions, RWLock, RWLockOptions } from './types/concurrency';

// Re-export types
export type { Semaphore, SemaphoreOptions, RWLock, RWLockOptions };

/**
 * Check if native Bun.Semaphore is available
 */
export const hasNativeSemaphore = (): boolean => {
  return typeof globalThis.Bun !== 'undefined' && 
         typeof (globalThis.Bun as any).Semaphore === 'function';
};

/**
 * Check if native Bun.RWLock is available
 */
export const hasNativeRWLock = (): boolean => {
  return typeof globalThis.Bun !== 'undefined' && 
         typeof (globalThis.Bun as any).RWLock === 'function';
};

// ============================================================================
// SEMAPHORE POLYFILL
// ============================================================================

/**
 * Waiter entry in the semaphore queue
 */
interface SemaphoreWaiter {
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
}

/**
 * SemaphorePolyfill - High-performance counting semaphore
 * 
 * Limits concurrent access to a resource to a specified number of permits.
 * Uses Promise-based queue management for efficient waiting.
 * 
 * @example
 * const sem = new SemaphorePolyfill(3); // 3 concurrent permits
 * await sem.acquire();
 * try {
 *   // Critical section - max 3 concurrent executions
 * } finally {
 *   sem.release();
 * }
 */
export class SemaphorePolyfill implements Semaphore {
  private _permits: number;
  private _available: number;
  private _queue: SemaphoreWaiter[] = [];
  private _timeout?: number;

  /**
   * Create a new Semaphore
   * @param permits Maximum number of concurrent permits (default: 1, mutex behavior)
   * @param options Optional configuration
   */
  constructor(permits: number = 1, options?: SemaphoreOptions) {
    if (permits < 1) {
      throw new Error(`Semaphore permits must be >= 1, got ${permits}`);
    }
    this._permits = permits;
    this._available = permits;
    this._timeout = options?.timeout;
  }

  /**
   * Acquire a permit, waiting if necessary until one is available
   * @returns Promise that resolves when permit is acquired
   * @throws Error if timeout is reached
   */
  async acquire(): Promise<void> {
    // Fast path: permit available
    if (this._available > 0) {
      this._available--;
      return;
    }

    // Slow path: wait in queue
    return new Promise<void>((resolve, reject) => {
      const waiter: SemaphoreWaiter = { resolve, reject };

      // Set up timeout if configured
      if (this._timeout !== undefined && this._timeout > 0) {
        waiter.timeoutId = setTimeout(() => {
          const index = this._queue.indexOf(waiter);
          if (index !== -1) {
            this._queue.splice(index, 1);
            reject(new Error(`Semaphore acquire timeout after ${this._timeout}ms`));
          }
        }, this._timeout);
      }

      this._queue.push(waiter);
    });
  }

  /**
   * Release a permit, unblocking a waiting acquirer if present
   */
  release(): void {
    // Check for waiting acquirers
    if (this._queue.length > 0) {
      const waiter = this._queue.shift()!;
      
      // Clear timeout if set
      if (waiter.timeoutId !== undefined) {
        clearTimeout(waiter.timeoutId);
      }
      
      // Resolve the waiting promise (permit transferred directly)
      waiter.resolve();
    } else {
      // No waiters - increment available permits
      this._available++;
      
      // Prevent over-release
      if (this._available > this._permits) {
        this._available = this._permits;
      }
    }
  }

  /**
   * Try to acquire a permit without waiting
   * @returns true if permit acquired, false if no permits available
   */
  tryAcquire(): boolean {
    if (this._available > 0) {
      this._available--;
      return true;
    }
    return false;
  }

  /**
   * Get the number of currently available permits
   * @returns Number of available permits (0 to maxPermits)
   */
  availablePermits(): number {
    return this._available;
  }

  /**
   * Get the number of waiters in the queue
   * @returns Number of waiting acquirers
   */
  getQueueLength(): number {
    return this._queue.length;
  }

  /**
   * Get the maximum number of permits
   * @returns Maximum permits configured for this semaphore
   */
  getMaxPermits(): number {
    return this._permits;
  }
}

// ============================================================================
// RWLOCK POLYFILL
// ============================================================================

/**
 * Waiter entry types in the RWLock queue
 */
type RWLockWaiterType = 'read' | 'write';

interface RWLockWaiter {
  type: RWLockWaiterType;
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
}

/**
 * RWLockPolyfill - Read-Write Lock with multiple readers, exclusive writers
 * 
 * Allows multiple concurrent readers OR a single exclusive writer.
 * Uses fair queue ordering to prevent starvation.
 * 
 * @example
 * const lock = new RWLockPolyfill();
 * 
 * // Read operation (multiple can run concurrently)
 * await lock.acquireRead();
 * try {
 *   // Read data...
 * } finally {
 *   lock.releaseRead();
 * }
 * 
 * // Write operation (exclusive access)
 * await lock.acquireWrite();
 * try {
 *   // Modify data...
 * } finally {
 *   lock.releaseWrite();
 * }
 */
export class RWLockPolyfill implements RWLock {
  private _readCount: number = 0;
  private _writeLocked: boolean = false;
  private _queue: RWLockWaiter[] = [];
  private _fairness: RWLockOptions['fairness'];
  private _timeout?: number;

  /**
   * Create a new RWLock
   * @param options Optional configuration
   */
  constructor(options?: RWLockOptions) {
    this._fairness = options?.fairness ?? 'fair';
    this._timeout = options?.timeout;
  }

  /**
   * Acquire a read lock, waiting if a write lock is held
   * Multiple readers can hold the lock simultaneously
   * @returns Promise that resolves when read lock is acquired
   */
  async acquireRead(): Promise<void> {
    // Fast path: can acquire read if no writer and (fair: no waiters OR read-priority)
    if (!this._writeLocked) {
      const canAcquire = 
        this._fairness === 'read-priority' ||
        (this._fairness === 'fair' && !this._hasWriteWaiters()) ||
        (this._fairness === 'write-priority' && this._queue.length === 0);

      if (canAcquire) {
        this._readCount++;
        return;
      }
    }

    // Slow path: wait in queue
    return new Promise<void>((resolve, reject) => {
      const waiter: RWLockWaiter = { type: 'read', resolve, reject };

      if (this._timeout !== undefined && this._timeout > 0) {
        waiter.timeoutId = setTimeout(() => {
          const index = this._queue.indexOf(waiter);
          if (index !== -1) {
            this._queue.splice(index, 1);
            reject(new Error(`RWLock acquireRead timeout after ${this._timeout}ms`));
          }
        }, this._timeout);
      }

      this._queue.push(waiter);
    });
  }

  /**
   * Acquire an exclusive write lock, waiting if any locks are held
   * @returns Promise that resolves when write lock is acquired
   */
  async acquireWrite(): Promise<void> {
    // Fast path: can acquire write if no readers and no writer
    if (this._readCount === 0 && !this._writeLocked) {
      this._writeLocked = true;
      return;
    }

    // Slow path: wait in queue
    return new Promise<void>((resolve, reject) => {
      const waiter: RWLockWaiter = { type: 'write', resolve, reject };

      if (this._timeout !== undefined && this._timeout > 0) {
        waiter.timeoutId = setTimeout(() => {
          const index = this._queue.indexOf(waiter);
          if (index !== -1) {
            this._queue.splice(index, 1);
            reject(new Error(`RWLock acquireWrite timeout after ${this._timeout}ms`));
          }
        }, this._timeout);
      }

      this._queue.push(waiter);
    });
  }

  /**
   * Release a read lock
   */
  releaseRead(): void {
    if (this._readCount <= 0) {
      throw new Error('Cannot releaseRead: no read lock held');
    }

    this._readCount--;
    
    // Try to unblock waiters
    this._processQueue();
  }

  /**
   * Release the write lock
   */
  releaseWrite(): void {
    if (!this._writeLocked) {
      throw new Error('Cannot releaseWrite: no write lock held');
    }

    this._writeLocked = false;
    
    // Try to unblock waiters
    this._processQueue();
  }

  /**
   * Try to acquire a read lock without waiting
   * @returns true if read lock acquired, false otherwise
   */
  tryAcquireRead(): boolean {
    if (!this._writeLocked && this._queue.length === 0) {
      this._readCount++;
      return true;
    }
    return false;
  }

  /**
   * Try to acquire a write lock without waiting
   * @returns true if write lock acquired, false otherwise
   */
  tryAcquireWrite(): boolean {
    if (this._readCount === 0 && !this._writeLocked) {
      this._writeLocked = true;
      return true;
    }
    return false;
  }

  /**
   * Get the number of active read locks
   * @returns Number of current readers
   */
  getReadLockCount(): number {
    return this._readCount;
  }

  /**
   * Check if a write lock is currently held
   * @returns true if write locked, false otherwise
   */
  isWriteLocked(): boolean {
    return this._writeLocked;
  }

  /**
   * Get the total number of waiters (readers + writers)
   * @returns Number of waiting acquirers
   */
  getQueueLength(): number {
    return this._queue.length;
  }

  /**
   * Check if there are write waiters in the queue
   */
  private _hasWriteWaiters(): boolean {
    return this._queue.some(w => w.type === 'write');
  }

  /**
   * Process the queue and unblock eligible waiters
   */
  private _processQueue(): void {
    if (this._queue.length === 0) return;

    // If write locked, nothing can proceed
    if (this._writeLocked) return;

    // Process waiters based on fairness policy
    while (this._queue.length > 0) {
      const nextWaiter = this._queue[0]!; // Non-null assertion - we checked length > 0

      if (nextWaiter.type === 'read') {
        // Readers can proceed if not write locked
        if (!this._writeLocked) {
          this._queue.shift();
          this._readCount++;
          
          if (nextWaiter.timeoutId !== undefined) {
            clearTimeout(nextWaiter.timeoutId);
          }
          nextWaiter.resolve();
          
          // For read-priority or fair, continue processing consecutive readers
          if (this._fairness !== 'write-priority') {
            continue;
          }
        }
        break;
      } else {
        // Writer can proceed if no readers
        if (this._readCount === 0 && !this._writeLocked) {
          this._queue.shift();
          this._writeLocked = true;
          
          if (nextWaiter.timeoutId !== undefined) {
            clearTimeout(nextWaiter.timeoutId);
          }
          nextWaiter.resolve();
        }
        break;
      }
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS WITH NATIVE DETECTION
// ============================================================================

/**
 * Create a Semaphore instance
 * Uses native Bun.Semaphore if available, otherwise returns polyfill
 * 
 * @param permits Maximum number of concurrent permits (default: 1)
 * @param options Optional configuration
 * @returns Semaphore instance
 */
export function createSemaphore(permits: number = 1, options?: SemaphoreOptions): Semaphore {
  if (hasNativeSemaphore()) {
    return new (globalThis.Bun as any).Semaphore(permits, options);
  }
  return new SemaphorePolyfill(permits, options);
}

/**
 * Create an RWLock instance
 * Uses native Bun.RWLock if available, otherwise returns polyfill
 * 
 * @param options Optional configuration
 * @returns RWLock instance
 */
export function createRWLock(options?: RWLockOptions): RWLock {
  if (hasNativeRWLock()) {
    return new (globalThis.Bun as any).RWLock(options);
  }
  return new RWLockPolyfill(options);
}

// ============================================================================
// BUNDLED EXPORTS FOR BUNONCURRENCY NAMESPACE
// ============================================================================

/**
 * BunConcurrency namespace - mirrors BunTypes pattern from precision-utils.ts
 * Provides native detection with fallback for concurrency primitives
 */
export const BunConcurrency = {
  /**
   * Check if native Bun.Semaphore is available
   */
  hasNativeSemaphore,

  /**
   * Check if native Bun.RWLock is available
   */
  hasNativeRWLock,

  /**
   * Create a Semaphore (native or polyfill)
   */
  Semaphore: createSemaphore,

  /**
   * Create an RWLock (native or polyfill)
   */
  RWLock: createRWLock,

  /**
   * Polyfill classes (for direct instantiation)
   */
  SemaphorePolyfill,
  RWLockPolyfill,
};

export default BunConcurrency;
