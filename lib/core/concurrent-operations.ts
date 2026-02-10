// lib/core/concurrent-operations.ts — Safe concurrent operations manager

import { handleError, R2IntegrationError, safeAsyncWithRetry } from './error-handling';

/**
 * Operation result interface
 */
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  operationId: string;
  duration: number;
}

/**
 * Batch operation configuration
 */
export interface BatchConfig {
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
  failFast: boolean;
  timeout: number;
}

/**
 * Transaction operation
 */
export interface TransactionOperation<T = any> {
  id: string;
  execute: () => Promise<T>;
  rollback?: (data: T) => Promise<void>;
  dependencies?: string[];
}

/**
 * Concurrent operations manager
 */
export class ConcurrentOperationsManager {
  private runningOperations: Map<string, Promise<any>> = new Map();
  private operationQueue: Array<() => Promise<any>> = [];
  private maxConcurrency: number;
  private defaultConfig: BatchConfig;

  constructor(maxConcurrency: number = 10) {
    this.maxConcurrency = maxConcurrency;
    this.defaultConfig = {
      maxConcurrency,
      retryAttempts: 3,
      retryDelay: 1000,
      failFast: false,
      timeout: 30000,
    };
  }

  /**
   * Execute operations concurrently with proper error handling
   */
  async executeConcurrently<T>(
    operations: Array<() => Promise<T>>,
    config: Partial<BatchConfig> = {}
  ): Promise<OperationResult<T>[]> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const results: OperationResult<T>[] = [];
    const maxConcurrency = Math.max(1, finalConfig.maxConcurrency);
    let nextIndex = 0;
    let shouldStop = false;

    const runOperationAtIndex = async (index: number): Promise<void> => {
      const operationId = `op-${index}`;
      const startTime = Date.now();

      try {
        const data = await this.executeOperation(operations[index], operationId, finalConfig);
        results[index] = {
          success: true,
          data,
          operationId,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        results[index] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          operationId,
          duration: Date.now() - startTime,
        };
        if (finalConfig.failFast) {
          shouldStop = true;
        }
      }
    };

    const worker = async (): Promise<void> => {
      while (true) {
        if (shouldStop) return;
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= operations.length) return;
        await runOperationAtIndex(currentIndex);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(maxConcurrency, operations.length) }, () => worker())
    );

    const ordered = results.filter(Boolean);
    if (finalConfig.failFast) {
      const firstFailure = ordered.findIndex((result) => !result.success);
      if (firstFailure >= 0) {
        return ordered.slice(0, firstFailure + 1);
      }
    }
    return ordered;
  }

  /**
   * Execute operations with dependency resolution
   */
  async executeWithDependencies<T>(
    operations: TransactionOperation<T>[]
  ): Promise<OperationResult<T>[]> {
    const results: OperationResult<T>[] = [];
    const completed = new Set<string>();
    const failed = new Set<string>();
    const operationMap = new Map(operations.map(op => [op.id, op]));

    // Continue until all operations are completed or failed
    while (completed.size + failed.size < operations.length) {
      // Find operations that can be executed (all dependencies completed)
      const readyOperations = operations.filter(
        op =>
          !completed.has(op.id) &&
          !failed.has(op.id) &&
          (!op.dependencies || op.dependencies.every(dep => completed.has(dep)))
      );

      if (readyOperations.length === 0) {
        // Mark operations blocked by failed dependencies as failed.
        const blocked = operations.filter(
          (op) =>
            !completed.has(op.id) &&
            !failed.has(op.id) &&
            (op.dependencies?.some((dep) => failed.has(dep)) ?? false)
        );
        if (blocked.length > 0) {
          for (const op of blocked) {
            failed.add(op.id);
            results.push({
              success: false,
              error: `Dependency failed for operation ${op.id}`,
              operationId: op.id,
              duration: 0,
            });
          }
        }
        break;
      }

      // Execute ready operations concurrently
      const readyResults = await this.executeConcurrently(
        readyOperations.map(op => () => op.execute()),
        { failFast: false }
      );

      // Process results
      for (let i = 0; i < readyResults.length; i++) {
        const result = readyResults[i];
        const operation = readyOperations[i];

        if (result.success) {
          completed.add(operation.id);
          results.push({ ...result, operationId: operation.id });
        } else {
          failed.add(operation.id);

          // Rollback if rollback function is available
          if (operation.rollback && result.data) {
            try {
              await operation.rollback(result.data);
            } catch (rollbackError) {
              handleError(rollbackError, `rollback-${operation.id}`, 'medium');
            }
          }

          results.push({ ...result, operationId: operation.id });
        }
      }
    }

    return results;
  }

  /**
   * Execute a transaction-like operation
   */
  async executeTransaction<T>(
    operations: TransactionOperation<T>[]
  ): Promise<{ success: boolean; results: OperationResult<T>[]; rolledBack: boolean }> {
    const results = await this.executeWithDependencies(operations);
    const hasFailures = results.some(r => !r.success);

    if (hasFailures) {
      // Rollback all successful operations
      const rolledBack = await this.rollbackSuccessfulOperations(operations, results);
      return { success: false, results, rolledBack };
    }

    return { success: true, results, rolledBack: false };
  }

  /**
   * Execute operation with timeout and retry
   */
  private async executeOperation<T>(
    operation: () => Promise<T>,
    operationId: string,
    config: BatchConfig
  ): Promise<T> {
    // Check if operation is already running
    if (this.runningOperations.has(operationId)) {
      throw new R2IntegrationError(
        `Operation ${operationId} is already running`,
        'OPERATION_CONCURRENT',
        { operationId }
      );
    }

    // Add to running operations
    const operationPromise = this.runOperationWithTimeout(operation, config.timeout, operationId);
    this.runningOperations.set(operationId, operationPromise);

    try {
      const result = await operationPromise;
      return result;
    } finally {
      // Remove from running operations
      this.runningOperations.delete(operationId);
    }
  }

  /**
   * Run operation with timeout
   */
  private async runOperationWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
    operationId: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new R2IntegrationError(
            `Operation ${operationId} timed out after ${timeout}ms`,
            'OPERATION_TIMEOUT',
            { operationId, timeout }
          )
        );
      }, timeout);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Rollback successful operations
   */
  private async rollbackSuccessfulOperations<T>(
    operations: TransactionOperation<T>[],
    results: OperationResult<T>[]
  ): Promise<boolean> {
    const successfulResults = results.filter(r => r.success);
    let allRolledBack = true;

    // Rollback in reverse order
    for (let i = successfulResults.length - 1; i >= 0; i--) {
      const result = successfulResults[i];
      const operation = operations.find(op => op.id === result.operationId);

      if (operation && operation.rollback && result.data) {
        try {
          await operation.rollback(result.data);
        } catch (error) {
          handleError(error, `rollback-${operation.id}`, 'medium');
          allRolledBack = false;
        }
      }
    }

    return allRolledBack;
  }

  /**
   * Get running operations count
   */
  getRunningOperationsCount(): number {
    return this.runningOperations.size;
  }

  /**
   * Wait for all running operations to complete
   */
  async waitForAllOperations(): Promise<void> {
    const promises = Array.from(this.runningOperations.values());
    await Promise.allSettled(promises);
  }
}

/**
 * Batch processor for large datasets
 */
export class BatchProcessor<T> {
  private manager: ConcurrentOperationsManager;
  private batchSize: number;
  private processor: (batch: T[]) => Promise<void>;

  constructor(
    processor: (batch: T[]) => Promise<void>,
    batchSize: number = 10,
    maxConcurrency: number = 5
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.manager = new ConcurrentOperationsManager(maxConcurrency);
  }

  /**
   * Process items in batches
   */
  async process(items: T[]): Promise<{ processed: number; errors: number }> {
    const batches: T[][] = [];

    // Create batches
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }

    // Process batches concurrently
    const results = await this.manager.executeConcurrently(
      batches.map(batch => () => this.processor(batch)),
      { failFast: false }
    );

    const processed = results.filter(r => r.success).length;
    const errors = results.filter(r => !r.success).length;

    return { processed, errors };
  }
}

/**
 * Safe map for concurrent operations
 */
export class ConcurrentMap<K, V> {
  private map: Map<K, V> = new Map();
  private locks: Map<K, Promise<void>> = new Map();

  /**
   * Get value with concurrent safety
   */
  async get(key: K): Promise<V | undefined> {
    // Wait for any ongoing operation on this key
    const lock = this.locks.get(key);
    if (lock) {
      await lock;
    }

    return this.map.get(key);
  }

  /**
   * Set value with concurrent safety
   */
  async set(key: K, value: V): Promise<void> {
    // Wait for any ongoing operation on this key
    const lock = this.locks.get(key);
    if (lock) {
      await lock;
    }

    // Create new lock for this operation
    const operationLock = (async () => {
      try {
        this.map.set(key, value);
      } finally {
        this.locks.delete(key);
      }
    })();

    this.locks.set(key, operationLock);
    await operationLock;
  }

  /**
   * Execute operation with lock
   */
  async withLock<R>(key: K, operation: (value: V | undefined) => Promise<R>): Promise<R> {
    // Wait for any ongoing operation on this key
    const lock = this.locks.get(key);
    if (lock) {
      await lock;
    }

    // Create new lock for this operation
    const operationLock = (async () => {
      try {
        const value = this.map.get(key);
        return await operation(value);
      } finally {
        this.locks.delete(key);
      }
    })();

    this.locks.set(key, operationLock);
    return operationLock;
  }

  /**
   * Get all entries
   */
  entries(): Array<[K, V]> {
    return Array.from(this.map.entries());
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.map.clear();
    this.locks.clear();
  }
}

/**
 * Global concurrent operations manager
 */
export const globalConcurrentManager = new ConcurrentOperationsManager(10);

/**
 * Utility function for safe concurrent execution
 */
export async function safeConcurrent<T>(
  operations: Array<() => Promise<T>>,
  config?: Partial<BatchConfig>
): Promise<OperationResult<T>[]> {
  return globalConcurrentManager.executeConcurrently(operations, config);
}

/**
 * Utility function for safe batch processing
 */
export function createBatchProcessor<T>(
  processor: (batch: T[]) => Promise<void>,
  batchSize?: number
): BatchProcessor<T> {
  return new BatchProcessor(processor, batchSize);
}
