#!/usr/bin/env bun

/**
 * Concurrent Operations Unit Tests
 *
 * Comprehensive tests for race conditions, transactions, and batch processing
 */

import { describe, test, expect, beforeEach } from "bun:test";
import {
  ConcurrentOperationsManager,
  BatchProcessor,
  ConcurrentMap,
  safeConcurrent,
  createBatchProcessor,
  TransactionOperation
} from '../lib/core/concurrent-operations.ts';
import { R2IntegrationError } from '../lib/core/error-handling.ts';

describe('ConcurrentOperationsManager', () => {
  let manager: ConcurrentOperationsManager;

  beforeEach(() => {
    manager = new ConcurrentOperationsManager(5);
  });

  describe('executeConcurrently', () => {
    test('should execute operations concurrently', async () => {
      const operations = [
        () => Promise.resolve('result1'),
        () => Promise.resolve('result2'),
        () => Promise.resolve('result3')
      ];

      const results = await manager.executeConcurrently(operations);

      expect(results.length).toBe(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(results[0].data).toBe('result1');
      expect(results[1].data).toBe('result2');
      expect(results[2].data).toBe('result3');
    });

    test('should handle individual operation failures', async () => {
      const operations = [
        () => Promise.resolve('success'),
        () => Promise.reject(new Error('failure')),
        () => Promise.resolve('success2')
      ];

      const results = await manager.executeConcurrently(operations, { failFast: false });

      expect(results.length).toBe(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
      expect(results[1].error?.includes('failure')).toBe(true);
    });

    test('should fail fast when configured', async () => {
      const operations = [
        () => Bun.sleep(100).then(() => 'slow'),
        () => Promise.reject(new Error('fast failure')),
        () => Promise.resolve('never reached')
      ];

      const startTime = Date.now();
      const results = await manager.executeConcurrently(operations, { failFast: true });
      const duration = Date.now() - startTime;

      // Should fail quickly, not wait for slow operation
      expect(duration < 200).toBe(true);
      expect(results.some(r => !r.success)).toBe(true);
    });

    test('should handle timeouts', async () => {
      const operations = [
        () => Bun.sleep(200).then(() => 'too slow'),
        () => Promise.resolve('fast')
      ];

      const results = await manager.executeConcurrently(operations, {
        timeout: 100,
        failFast: false
      });

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(false); // Should timeout
      expect(results[1].success).toBe(true);
      expect(results[0].error?.includes('timed out')).toBe(true);
    });

    test('should respect concurrency limits', async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;

      const operations = Array.from({ length: 10 }, (_, i) =>
        async () => {
          concurrentCount++;
          maxConcurrent = Math.max(maxConcurrent, concurrentCount);
          await Bun.sleep(50);
          concurrentCount--;
          return `result-${i}`;
        }
      );

      await manager.executeConcurrently(operations);

      // Should not exceed concurrency limit
      expect(maxConcurrent <= 5).toBe(true);
    });
  });

  describe('executeWithDependencies', () => {
    test('should resolve dependencies correctly', async () => {
      const results: string[] = [];

      const operations: TransactionOperation<string>[] = [
        {
          id: 'op1',
          execute: async () => {
            results.push('op1');
            return 'result1';
          }
        },
        {
          id: 'op2',
          execute: async () => {
            results.push('op2');
            return 'result2';
          },
          dependencies: ['op1']
        },
        {
          id: 'op3',
          execute: async () => {
            results.push('op3');
            return 'result3';
          },
          dependencies: ['op1', 'op2']
        }
      ];

      const operationResults = await manager.executeWithDependencies(operations);

      // Should execute in dependency order
      expect(results).toEqual(['op1', 'op2', 'op3']);
      expect(operationResults.every(r => r.success)).toBe(true);
    });

    test('should handle dependency failures', async () => {
      const operations: TransactionOperation<string>[] = [
        {
          id: 'op1',
          execute: async () => {
            throw new Error('op1 failed');
          }
        },
        {
          id: 'op2',
          execute: async () => 'result2',
          dependencies: ['op1']
        }
      ];

      const results = await manager.executeWithDependencies(operations);

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(false); // Should not execute due to failed dependency
    });

    test('should detect circular dependencies', async () => {
      const operations: TransactionOperation<string>[] = [
        {
          id: 'op1',
          execute: async () => 'result1',
          dependencies: ['op2']
        },
        {
          id: 'op2',
          execute: async () => 'result2',
          dependencies: ['op1']
        }
      ];

      const results = await manager.executeWithDependencies(operations);

      // Should not execute any operations due to circular dependency
      expect(results.length).toBe(0);
    });
  });

  describe('executeTransaction', () => {
    test('should commit successful transaction', async () => {
      const rollbackLog: string[] = [];

      const operations: TransactionOperation<string>[] = [
        {
          id: 'op1',
          execute: async () => 'result1',
          rollback: async (data) => {
            rollbackLog.push(`rollback-op1-${data}`);
          }
        },
        {
          id: 'op2',
          execute: async () => 'result2',
          rollback: async (data) => {
            rollbackLog.push(`rollback-op2-${data}`);
          }
        }
      ];

      const result = await manager.executeTransaction(operations);

      expect(result.success).toBe(true);
      expect(result.results.length).toBe(2);
      expect(rollbackLog.length).toBe(0); // No rollbacks on success
    });

    test('should rollback failed transaction', async () => {
      const rollbackLog: string[] = [];

      const operations: TransactionOperation<string>[] = [
        {
          id: 'op1',
          execute: async () => 'result1',
          rollback: async (data) => {
            rollbackLog.push(`rollback-op1-${data}`);
          }
        },
        {
          id: 'op2',
          execute: async () => {
            throw new Error('op2 failed');
          },
          rollback: async (data) => {
            rollbackLog.push(`rollback-op2-${data}`);
          }
        },
        {
          id: 'op3',
          execute: async () => 'result3',
          rollback: async (data) => {
            rollbackLog.push(`rollback-op3-${data}`);
          }
        }
      ];

      const result = await manager.executeTransaction(operations);

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(rollbackLog).toContain('rollback-op1-result1');
      // op2 should not be rolled back as it failed
      expect(rollbackLog).not.toContain('rollback-op2');
    });

    test('should handle rollback failures gracefully', async () => {
      const operations: TransactionOperation<string>[] = [
        {
          id: 'op1',
          execute: async () => 'result1',
          rollback: async () => {
            throw new Error('rollback failed');
          }
        },
        {
          id: 'op2',
          execute: async () => {
            throw new Error('op2 failed');
          }
        }
      ];

      const result = await manager.executeTransaction(operations);

      expect(result.success).toBe(false);
      // Should not throw despite rollback failure
      expect(result.rolledBack).toBe(true);
    });
  });

  describe('duplicate operation detection', () => {
    test('should prevent concurrent execution of same operation', async () => {
      let executionCount = 0;

      const operation = async () => {
        executionCount++;
        await Bun.sleep(100);
        return 'result';
      };

      // Try to execute same operation ID concurrently
      const promises = [
        manager.executeOperation(operation, 'same-id', { timeout: 200 }),
        manager.executeOperation(operation, 'same-id', { timeout: 200 })
      ];

      const results = await Promise.allSettled(promises);

      // One should succeed, one should fail
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
      expect(executionCount).toBe(1);
    });
  });
});

describe('BatchProcessor', () => {
  test('should process items in batches', async () => {
    const processedBatches: number[][] = [];

    const processor = new BatchProcessor(
      async (batch: number[]) => {
        processedBatches.push([...batch]);
        await Bun.sleep(10);
      },
      3, // batch size
      2  // max concurrency
    );

    const items = Array.from({ length: 10 }, (_, i) => i);
    const result = await processor.process(items);

    expect(result.processed).toBe(4); // 3 + 3 + 3 + 1 = 4 batches
    expect(result.errors).toBe(0);
    expect(processedBatches.length).toBe(4);
    expect(processedBatches[0]).toEqual([0, 1, 2]);
    expect(processedBatches[1]).toEqual([3, 4, 5]);
    expect(processedBatches[2]).toEqual([6, 7, 8]);
    expect(processedBatches[3]).toEqual([9]);
  });

  test('should handle batch processing failures', async () => {
    const processor = new BatchProcessor(
      async (batch: number[]) => {
        if (batch[0] === 3) {
          throw new Error('Batch failed');
        }
        // Success for other batches
      },
      2
    );

    const items = [1, 2, 3, 4, 5, 6];
    const result = await processor.process(items);

    expect(result.processed > 0).toBe(true);
    expect(result.errors > 0).toBe(true);
  });
});

describe('ConcurrentMap', () => {
  let concurrentMap: ConcurrentMap<string, string>;

  beforeEach(() => {
    concurrentMap = new ConcurrentMap<string, string>();
  });

  test('should handle concurrent access safely', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      concurrentMap.set(`key${i}`, `value${i}`)
    );

    await Promise.all(promises);

    // Verify all values were set
    for (let i = 0; i < 10; i++) {
      const value = await concurrentMap.get(`key${i}`);
      expect(value).toBe(`value${i}`);
    }
  });

  test('should serialize operations on same key', async () => {
    let operationOrder: string[] = [];

    const promises = [
      concurrentMap.withLock('test-key', async () => {
        operationOrder.push('op1-start');
        await Bun.sleep(50);
        operationOrder.push('op1-end');
        return 'result1';
      }),
      concurrentMap.withLock('test-key', async () => {
        operationOrder.push('op2-start');
        await Bun.sleep(10);
        operationOrder.push('op2-end');
        return 'result2';
      })
    ];

    const results = await Promise.all(promises);

    // Operations should be serialized
    expect(operationOrder).toEqual([
      'op1-start', 'op1-end', 'op2-start', 'op2-end'
    ]);
    expect(results[0]).toBe('result1');
    expect(results[1]).toBe('result2');
  });

  test('should allow concurrent operations on different keys', async () => {
    let operationOrder: string[] = [];

    const promises = [
      concurrentMap.withLock('key1', async () => {
        operationOrder.push('key1-start');
        await Bun.sleep(50);
        operationOrder.push('key1-end');
      }),
      concurrentMap.withLock('key2', async () => {
        operationOrder.push('key2-start');
        await Bun.sleep(10);
        operationOrder.push('key2-end');
      })
    ];

    await Promise.all(promises);

    // Operations on different keys can run concurrently
    expect(operationOrder).toEqual([
      'key1-start', 'key2-start', 'key2-end', 'key1-end'
    ]);
  });
});

describe('Utility Functions', () => {
  test('should provide safe concurrent execution', async () => {
    const operations = [
      () => Promise.resolve('result1'),
      () => Promise.reject(new Error('failure')),
      () => Promise.resolve('result2')
    ];

    const results = await safeConcurrent(operations);

    expect(results.length).toBe(3);
    expect(results.filter(r => r.success).length).toBe(2);
    expect(results.filter(r => !r.success).length).toBe(1);
  });

  test('should create batch processors', () => {
    const processor = createBatchProcessor(
      async (batch: string[]) => {
        // Process batch
      },
      5
    );

    expect(processor).toBeInstanceOf(BatchProcessor);
  });
});

describe('Edge Cases', () => {
  test('should handle empty operation lists', async () => {
    const manager = new ConcurrentOperationsManager();
    const results = await manager.executeConcurrently([]);

    expect(results.length).toBe(0);
  });

  test('should handle operations that return undefined', async () => {
    const manager = new ConcurrentOperationsManager();
    const operations = [
      () => Promise.resolve(undefined),
      () => Promise.resolve(null)
    ];

    const results = await manager.executeConcurrently(operations);

    expect(results.length).toBe(2);
    expect(results.every(r => r.success)).toBe(true);
    expect(results[0].data).toBe(undefined);
    expect(results[1].data).toBe(null);
  });

  test('should handle very long-running operations', async () => {
    const manager = new ConcurrentOperationsManager(2);

    const operations = [
      () => Bun.sleep(200).then(() => 'slow1'),
      () => Bun.sleep(200).then(() => 'slow2'),
      () => Bun.sleep(200).then(() => 'slow3')
    ];

    const startTime = Date.now();
    const results = await manager.executeConcurrently(operations, { timeout: 300 });
    const duration = Date.now() - startTime;

    // Should take longer due to concurrency limit
    expect(duration).toBeGreaterThanOrEqual(300);
    expect(duration < 500).toBe(true);
    expect(results.filter(r => r.success).length).toBe(3);
  });

  test('should handle rapid successive operations', async () => {
    const manager = new ConcurrentOperationsManager(10);

    const operations = Array.from({ length: 100 }, (_, i) =>
      () => Promise.resolve(`result-${i}`)
    );

    const results = await manager.executeConcurrently(operations);

    expect(results.length).toBe(100);
    expect(results.every(r => r.success)).toBe(true);
  });

  test('should handle memory pressure with many operations', async () => {
    const manager = new ConcurrentOperationsManager(5);

    // Create operations that use memory
    const operations = Array.from({ length: 50 }, (_, i) =>
      () => {
        const largeData = new Array(10000).fill(i);
        return Promise.resolve(largeData);
      }
    );

    const results = await manager.executeConcurrently(operations);

    expect(results.length).toBe(50);
    expect(results.every(r => r.success)).toBe(true);

    // Verify data integrity
    for (let i = 0; i < 50; i++) {
      const data = results[i].data;
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toBe(i);
    }
  });
});
