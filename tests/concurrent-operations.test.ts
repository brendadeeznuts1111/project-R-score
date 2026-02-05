#!/usr/bin/env bun

/**
 * 🧪 Concurrent Operations Unit Tests
 * 
 * Comprehensive tests for race conditions, transactions, and batch processing
 */

import { describe, it, mock, testUtils } from '../lib/core/unit-test-framework.ts';
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
    it('should execute operations concurrently', async (assert) => {
      const operations = [
        () => Promise.resolve('result1'),
        () => Promise.resolve('result2'),
        () => Promise.resolve('result3')
      ];

      const results = await manager.executeConcurrently(operations);
      
      assert.equal(results.length, 3);
      assert.isTrue(results.every(r => r.success));
      assert.equal(results[0].data, 'result1');
      assert.equal(results[1].data, 'result2');
      assert.equal(results[2].data, 'result3');
    });

    it('should handle individual operation failures', async (assert) => {
      const operations = [
        () => Promise.resolve('success'),
        () => Promise.reject(new Error('failure')),
        () => Promise.resolve('success2')
      ];

      const results = await manager.executeConcurrently(operations, { failFast: false });
      
      assert.equal(results.length, 3);
      assert.isTrue(results[0].success);
      assert.isFalse(results[1].success);
      assert.isTrue(results[2].success);
      assert.isTrue(results[1].error?.includes('failure'));
    });

    it('should fail fast when configured', async (assert) => {
      const operations = [
        () => testUtils.wait(100).then(() => 'slow'),
        () => Promise.reject(new Error('fast failure')),
        () => Promise.resolve('never reached')
      ];

      const startTime = Date.now();
      const results = await manager.executeConcurrently(operations, { failFast: true });
      const duration = Date.now() - startTime;

      // Should fail quickly, not wait for slow operation
      assert.isTrue(duration < 200);
      assert.isTrue(results.some(r => !r.success));
    });

    it('should handle timeouts', async (assert) => {
      const operations = [
        () => testUtils.wait(200).then(() => 'too slow'),
        () => Promise.resolve('fast')
      ];

      const results = await manager.executeConcurrently(operations, { 
        timeout: 100,
        failFast: false 
      });
      
      assert.equal(results.length, 2);
      assert.isFalse(results[0].success); // Should timeout
      assert.isTrue(results[1].success);
      assert.isTrue(results[0].error?.includes('timed out'));
    });

    it('should respect concurrency limits', async (assert) => {
      let concurrentCount = 0;
      let maxConcurrent = 0;

      const operations = Array.from({ length: 10 }, (_, i) => 
        async () => {
          concurrentCount++;
          maxConcurrent = Math.max(maxConcurrent, concurrentCount);
          await testUtils.wait(50);
          concurrentCount--;
          return `result-${i}`;
        }
      );

      await manager.executeConcurrently(operations);
      
      // Should not exceed concurrency limit
      assert.isTrue(maxConcurrent <= 5);
    });
  });

  describe('executeWithDependencies', () => {
    it('should resolve dependencies correctly', async (assert) => {
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
      assert.deepEqual(results, ['op1', 'op2', 'op3']);
      assert.isTrue(operationResults.every(r => r.success));
    });

    it('should handle dependency failures', async (assert) => {
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
      
      assert.equal(results.length, 2);
      assert.isFalse(results[0].success);
      assert.isFalse(results[1].success); // Should not execute due to failed dependency
    });

    it('should detect circular dependencies', async (assert) => {
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
      assert.equal(results.length, 0);
    });
  });

  describe('executeTransaction', () => {
    it('should commit successful transaction', async (assert) => {
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
      
      assert.isTrue(result.success);
      assert.equal(result.results.length, 2);
      assert.equal(rollbackLog.length, 0); // No rollbacks on success
    });

    it('should rollback failed transaction', async (assert) => {
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
      
      assert.isFalse(result.success);
      assert.isTrue(result.rolledBack);
      assert.isTrue(rollbackLog.includes('rollback-op1-result1'));
      // op2 should not be rolled back as it failed
      assert.isFalse(rollbackLog.includes('rollback-op2'));
    });

    it('should handle rollback failures gracefully', async (assert) => {
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
      
      assert.isFalse(result.success);
      // Should not throw despite rollback failure
      assert.isTrue(result.rolledBack);
    });
  });

  describe('duplicate operation detection', () => {
    it('should prevent concurrent execution of same operation', async (assert) => {
      let executionCount = 0;
      
      const operation = async () => {
        executionCount++;
        await testUtils.wait(100);
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
      
      assert.equal(successCount, 1);
      assert.equal(failureCount, 1);
      assert.equal(executionCount, 1);
    });
  });
});

describe('BatchProcessor', () => {
  it('should process items in batches', async (assert) => {
    const processedBatches: number[][] = [];
    
    const processor = new BatchProcessor(
      async (batch: number[]) => {
        processedBatches.push([...batch]);
        await testUtils.wait(10);
      },
      3, // batch size
      2  // max concurrency
    );

    const items = Array.from({ length: 10 }, (_, i) => i);
    const result = await processor.process(items);
    
    assert.equal(result.processed, 4); // 3 + 3 + 3 + 1 = 4 batches
    assert.equal(result.errors, 0);
    assert.equal(processedBatches.length, 4);
    assert.deepEqual(processedBatches[0], [0, 1, 2]);
    assert.deepEqual(processedBatches[1], [3, 4, 5]);
    assert.deepEqual(processedBatches[2], [6, 7, 8]);
    assert.deepEqual(processedBatches[3], [9]);
  });

  it('should handle batch processing failures', async (assert) => {
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
    
    assert.isTrue(result.processed > 0);
    assert.isTrue(result.errors > 0);
  });
});

describe('ConcurrentMap', () => {
  let concurrentMap: ConcurrentMap<string, string>;

  beforeEach(() => {
    concurrentMap = new ConcurrentMap<string, string>();
  });

  it('should handle concurrent access safely', async (assert) => {
    const promises = Array.from({ length: 10 }, (_, i) => 
      concurrentMap.set(`key${i}`, `value${i}`)
    );

    await Promise.all(promises);
    
    // Verify all values were set
    for (let i = 0; i < 10; i++) {
      const value = await concurrentMap.get(`key${i}`);
      assert.equal(value, `value${i}`);
    }
  });

  it('should serialize operations on same key', async (assert) => {
    let operationOrder: string[] = [];
    
    const promises = [
      concurrentMap.withLock('test-key', async () => {
        operationOrder.push('op1-start');
        await testUtils.wait(50);
        operationOrder.push('op1-end');
        return 'result1';
      }),
      concurrentMap.withLock('test-key', async () => {
        operationOrder.push('op2-start');
        await testUtils.wait(10);
        operationOrder.push('op2-end');
        return 'result2';
      })
    ];

    const results = await Promise.all(promises);
    
    // Operations should be serialized
    assert.deepEqual(operationOrder, [
      'op1-start', 'op1-end', 'op2-start', 'op2-end'
    ]);
    assert.equal(results[0], 'result1');
    assert.equal(results[1], 'result2');
  });

  it('should allow concurrent operations on different keys', async (assert) => {
    let operationOrder: string[] = [];
    
    const promises = [
      concurrentMap.withLock('key1', async () => {
        operationOrder.push('key1-start');
        await testUtils.wait(50);
        operationOrder.push('key1-end');
      }),
      concurrentMap.withLock('key2', async () => {
        operationOrder.push('key2-start');
        await testUtils.wait(10);
        operationOrder.push('key2-end');
      })
    ];

    await Promise.all(promises);
    
    // Operations on different keys can run concurrently
    assert.deepEqual(operationOrder, [
      'key1-start', 'key2-start', 'key2-end', 'key1-end'
    ]);
  });
});

describe('Utility Functions', () => {
  it('should provide safe concurrent execution', async (assert) => {
    const operations = [
      () => Promise.resolve('result1'),
      () => Promise.reject(new Error('failure')),
      () => Promise.resolve('result2')
    ];

    const results = await safeConcurrent(operations);
    
    assert.equal(results.length, 3);
    assert.equal(results.filter(r => r.success).length, 2);
    assert.equal(results.filter(r => !r.success).length, 1);
  });

  it('should create batch processors', (assert) => {
    const processor = createBatchProcessor(
      async (batch: string[]) => {
        // Process batch
      },
      5
    );
    
    assert.isTrue(processor instanceof BatchProcessor);
  });
});

describe('Edge Cases', () => {
  it('should handle empty operation lists', async (assert) => {
    const manager = new ConcurrentOperationsManager();
    const results = await manager.executeConcurrently([]);
    
    assert.equal(results.length, 0);
  });

  it('should handle operations that return undefined', async (assert) => {
    const operations = [
      () => Promise.resolve(undefined),
      () => Promise.resolve(null)
    ];

    const results = await manager.executeConcurrently(operations);
    
    assert.equal(results.length, 2);
    assert.isTrue(results.every(r => r.success));
    assert.equal(results[0].data, undefined);
    assert.equal(results[1].data, null);
  });

  it('should handle very long-running operations', async (assert) => {
    const manager = new ConcurrentOperationsManager(2);
    
    const operations = [
      () => testUtils.wait(200).then(() => 'slow1'),
      () => testUtils.wait(200).then(() => 'slow2'),
      () => testUtils.wait(200).then(() => 'slow3')
    ];

    const startTime = Date.now();
    const results = await manager.executeConcurrently(operations, { timeout: 300 });
    const duration = Date.now() - startTime;

    // Should take longer due to concurrency limit
    assert.isTrue(duration >= 300);
    assert.isTrue(duration < 500);
    assert.equal(results.filter(r => r.success).length, 3);
  });

  it('should handle rapid successive operations', async (assert) => {
    const manager = new ConcurrentOperationsManager(10);
    
    const operations = Array.from({ length: 100 }, (_, i) => 
      () => Promise.resolve(`result-${i}`)
    );

    const results = await manager.executeConcurrently(operations);
    
    assert.equal(results.length, 100);
    assert.isTrue(results.every(r => r.success));
  });

  it('should handle memory pressure with many operations', async (assert) => {
    const manager = new ConcurrentOperationsManager(5);
    
    // Create operations that use memory
    const operations = Array.from({ length: 50 }, (_, i) => 
      () => {
        const largeData = new Array(10000).fill(i);
        return Promise.resolve(largeData);
      }
    );

    const results = await manager.executeConcurrently(operations);
    
    assert.equal(results.length, 50);
    assert.isTrue(results.every(r => r.success));
    
    // Verify data integrity
    for (let i = 0; i < 50; i++) {
      const data = results[i].data;
      assert.isTrue(Array.isArray(data));
      assert.equal(data[0], i);
    }
  });
});

// Run tests if this file is executed directly
if (import.meta.main) {
  const { runTests } = await import('../lib/core/unit-test-framework.ts');
  await runTests();
}
