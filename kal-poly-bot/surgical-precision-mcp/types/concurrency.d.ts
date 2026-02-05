/**
 * Type Definitions for Bun Concurrency Primitives
 * Polyfill types matching expected Bun.Semaphore and Bun.RWLock APIs
 * 
 * Reference: Planned for future Bun version
 * Implementation: surgical-precision-mcp/concurrency-primitives.ts
 */

/**
 * Options for Semaphore construction
 */
export interface SemaphoreOptions {
  /** Optional timeout in milliseconds for acquire operations */
  timeout?: number;
}

/**
 * Semaphore interface for limiting concurrent access to resources
 * Matches expected Bun.Semaphore API pattern
 */
export interface Semaphore {
  /**
   * Acquire a permit, waiting if necessary until one is available
   * @returns Promise that resolves when permit is acquired
   */
  acquire(): Promise<void>;

  /**
   * Release a permit, potentially unblocking a waiting acquirer
   */
  release(): void;

  /**
   * Try to acquire a permit without waiting
   * @returns true if permit acquired, false otherwise
   */
  tryAcquire(): boolean;

  /**
   * Get the number of currently available permits
   * @returns Number of available permits
   */
  availablePermits(): number;

  /**
   * Get the number of waiters in the queue
   * @returns Number of waiting acquirers
   */
  getQueueLength(): number;
}

/**
 * Options for RWLock construction
 */
export interface RWLockOptions {
  /** Lock fairness policy */
  fairness?: 'read-priority' | 'write-priority' | 'fair';
  /** Optional timeout in milliseconds for acquire operations */
  timeout?: number;
}

/**
 * Read-Write Lock interface for concurrent read access with exclusive write access
 * Matches expected Bun.RWLock API pattern
 */
export interface RWLock {
  /**
   * Acquire a read lock, waiting if a write lock is held
   * Multiple readers can hold the lock simultaneously
   * @returns Promise that resolves when read lock is acquired
   */
  acquireRead(): Promise<void>;

  /**
   * Acquire an exclusive write lock, waiting if any locks are held
   * @returns Promise that resolves when write lock is acquired
   */
  acquireWrite(): Promise<void>;

  /**
   * Release a read lock
   */
  releaseRead(): void;

  /**
   * Release the write lock
   */
  releaseWrite(): void;

  /**
   * Try to acquire a read lock without waiting
   * @returns true if read lock acquired, false otherwise
   */
  tryAcquireRead(): boolean;

  /**
   * Try to acquire a write lock without waiting
   * @returns true if write lock acquired, false otherwise
   */
  tryAcquireWrite(): boolean;

  /**
   * Get the number of active read locks
   * @returns Number of current readers
   */
  getReadLockCount(): number;

  /**
   * Check if a write lock is currently held
   * @returns true if write locked, false otherwise
   */
  isWriteLocked(): boolean;

  /**
   * Get the total number of waiters (readers + writers)
   * @returns Number of waiting acquirers
   */
  getQueueLength(): number;
}

/**
 * Augment global Bun namespace for future compatibility
 * When native Bun.Semaphore/RWLock become available, these types will match
 */
declare global {
  namespace Bun {
    // Semaphore constructor (planned for future Bun version)
    const Semaphore: new (permits?: number, options?: SemaphoreOptions) => Semaphore | undefined;

    // RWLock constructor (planned for future Bun version)
    const RWLock: new (options?: RWLockOptions) => RWLock | undefined;
  }
}

export {};
