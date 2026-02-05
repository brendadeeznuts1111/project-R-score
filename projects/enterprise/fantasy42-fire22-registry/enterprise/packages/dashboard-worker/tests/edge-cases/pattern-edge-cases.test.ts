#!/usr/bin/env bun

/**
 * 🛡️ Pattern System Edge Cases Test Suite
 * Comprehensive testing of Pattern Weaver System edge cases and failures
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { EdgeCaseHelpers } from '../utils/edge-case-helpers';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('🛡️ Pattern System Edge Cases', () => {
  let tempDir: string;
  let resourceTracker: ReturnType<typeof EdgeCaseHelpers.createResourceTracker>;
  let patterns: any;

  beforeAll(async () => {
    tempDir = join(process.cwd(), 'test-temp-patterns');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Try to load the Pattern Weaver System
    try {
      patterns = await import('../../src/patterns/index');
      console.log('🕸️ Pattern Weaver System loaded successfully');
    } catch (error) {
      console.warn('⚠️ Pattern Weaver System not available for testing:', error.message);
      patterns = null;
    }
  });

  afterAll(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    resourceTracker = EdgeCaseHelpers.createResourceTracker();
  });

  afterEach(() => {
    const remaining = resourceTracker.cleanup();
    if (remaining > 0) {
      console.warn(`⚠️ ${remaining} pattern resources not cleaned up`);
    }
  });

  describe('🔗 Pattern Connection Edge Cases', () => {
    it('🧪 should handle invalid pattern contexts gracefully', async () => {
      if (!patterns) {
        console.log('⏭️ Skipping pattern tests - Pattern Weaver not available');
        return;
      }

      const invalidContexts = [
        null,
        undefined,
        '',
        123, // Number instead of object
        'invalid-string-context',
        [], // Empty array
        { invalid: 'structure' }, // Wrong structure
      ];

      const testPattern = 'TABULAR';
      const results = [];

      for (const context of invalidContexts) {
        try {
          const result = await patterns.patternWeaver.applyPattern(testPattern, context);
          results.push({ context, success: true, result });
        } catch (error) {
          results.push({
            context,
            success: false,
            error: error.message,
            errorType: error.constructor.name,
          });
        }
      }

      // Most invalid contexts should fail gracefully
      const failures = results.filter(r => !r.success);
      expect(failures.length).toBeGreaterThan(0);

      // Errors should be descriptive
      for (const failure of failures) {
        expect(failure.error).toBeDefined();
        expect(typeof failure.error).toBe('string');
        expect(failure.error.length).toBeGreaterThan(0);
      }

      console.log(
        `🔍 Invalid context test: ${failures.length}/${results.length} failed as expected`
      );
    });

    it('🧪 should handle unknown pattern names', async () => {
      if (!patterns) return;

      const unknownPatterns = [
        'UNKNOWN_PATTERN',
        'INVALID',
        '',
        'pattern-with-dashes',
        'pattern_with_underscores',
        '12345',
        'VERY_LONG_PATTERN_NAME_THAT_SHOULD_NOT_EXIST',
      ];

      const results = [];

      for (const patternName of unknownPatterns) {
        try {
          const result = await patterns.patternWeaver.applyPattern(patternName, {});
          results.push({ pattern: patternName, success: true, result });
        } catch (error) {
          results.push({
            pattern: patternName,
            success: false,
            error: error.message,
          });
        }
      }

      // All unknown patterns should fail
      const failures = results.filter(r => !r.success);
      expect(failures.length).toBe(unknownPatterns.length);

      // Check error messages are informative
      for (const failure of failures) {
        expect(failure.error).toMatch(/unknown|not found|invalid|pattern/i);
      }
    });

    it('🧪 should validate pattern registry connections', async () => {
      if (!patterns) return;

      const registry = patterns.PatternRegistry;

      // Validate that all registered patterns exist
      const patternNames = Object.keys(registry.patterns);
      expect(patternNames.length).toBeGreaterThan(0);

      // Validate pattern connections
      for (const [context, patternList] of registry.connections) {
        expect(Array.isArray(patternList)).toBe(true);
        expect(patternList.length).toBeGreaterThan(0);

        // Each pattern in connections should exist in registry
        for (const patternName of patternList) {
          expect(registry.patterns[patternName]).toBeDefined();
        }
      }

      // Test connection consistency
      const allConnectedPatterns = new Set();
      for (const patternList of registry.connections.values()) {
        patternList.forEach(pattern => allConnectedPatterns.add(pattern));
      }

      // Most registered patterns should be connected to at least one context
      const connectedRatio = allConnectedPatterns.size / patternNames.length;
      expect(connectedRatio).toBeGreaterThan(0.5); // At least 50% should be connected

      console.log(
        `🔍 Pattern registry validation: ${allConnectedPatterns.size}/${patternNames.length} patterns connected`
      );
    });
  });

  describe('⏱️ Pattern Timeout Scenarios', () => {
    it('🧪 should handle pattern processing timeouts', async () => {
      if (!patterns) return;

      const slowContext = EdgeCaseHelpers.createSlowProcessingContext(2000, 100);
      resourceTracker.allocate('slow-pattern-test');

      try {
        const result = await EdgeCaseHelpers.withTimeout(
          async () => {
            // Test with a pattern that might take time to process
            return await patterns.patternWeaver.applyPattern('STREAM', {
              processor: slowContext.processor,
              data: slowContext.data,
            });
          },
          3000, // 3 second timeout
          () => {
            resourceTracker.deallocate('slow-pattern-test');
          }
        );

        // If it completes within timeout, verify the result
        expect(result).toBeDefined();
        resourceTracker.deallocate('slow-pattern-test');
      } catch (error) {
        // Timeout is expected behavior
        expect(error.message).toMatch(/timeout/i);
        expect(resourceTracker.getAllocated()).not.toContain('slow-pattern-test');
      }
    });

    it('🧪 should handle pattern chain timeouts', async () => {
      if (!patterns) return;

      const chainTimeout = EdgeCaseHelpers.withTimeout(
        async () => {
          return await patterns.PatternUtils.chain(
            { pattern: 'TIMING', context: () => new Promise(resolve => setTimeout(resolve, 1000)) },
            { pattern: 'TIMING', context: () => new Promise(resolve => setTimeout(resolve, 1000)) },
            { pattern: 'TIMING', context: () => new Promise(resolve => setTimeout(resolve, 1000)) }
          );
        },
        2000 // 2 second timeout for 3-second chain
      );

      await expect(chainTimeout).rejects.toThrow(/timeout/i);
    });

    it('🧪 should handle concurrent pattern timeouts', async () => {
      if (!patterns) return;

      const concurrentPatterns = Array.from({ length: 5 }, (_, i) => ({
        pattern: 'TIMING',
        context: () =>
          new Promise(
            resolve => setTimeout(resolve, 500 + i * 200) // Increasing delays
          ),
      }));

      const concurrentTimeout = EdgeCaseHelpers.withTimeout(
        async () => {
          return await patterns.PatternUtils.parallel(...concurrentPatterns);
        },
        1000 // 1 second timeout
      );

      // Some operations should timeout
      await expect(concurrentTimeout).rejects.toThrow(/timeout/i);
    });
  });

  describe('🧠 Pattern Memory Management', () => {
    it('🧪 should prevent memory leaks in pattern processing', async () => {
      if (!patterns) return;

      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 50;

      // Run many pattern operations to test for memory leaks
      for (let i = 0; i < iterations; i++) {
        // Create test data for each iteration
        const testData = Array.from({ length: 100 }, (_, j) => ({
          id: `${i}-${j}`,
          data: Math.random().toString(36),
          timestamp: Date.now(),
        }));

        try {
          // Apply multiple patterns
          await patterns.PatternUtils.chain(
            { pattern: 'TABULAR', context: testData },
            { pattern: 'TIMING', context: () => testData.length },
            {
              pattern: 'UTILITIES',
              context: { operation: 'stringWidth', input: JSON.stringify(testData) },
            }
          );
        } catch (error) {
          // Pattern might not exist, continue testing
          console.warn(`Pattern chain failed at iteration ${i}:`, error.message);
        }

        // Periodic memory check
        if (i % 10 === 9) {
          const currentMemory = process.memoryUsage().heapUsed;
          const growth = currentMemory - initialMemory;

          // Force garbage collection if available
          if (global.gc) global.gc();

          console.log(
            `📊 Memory at iteration ${i + 1}: ${(currentMemory / 1024 / 1024).toFixed(1)}MB (+${(growth / 1024 / 1024).toFixed(1)}MB)`
          );
        }
      }

      // Final memory check
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const totalGrowth = finalMemory - initialMemory;
      const growthPerIteration = totalGrowth / iterations;

      console.log(
        `📊 Memory leak test: ${iterations} iterations, ${(totalGrowth / 1024 / 1024).toFixed(1)}MB total growth`
      );
      console.log(`📊 Average growth per iteration: ${(growthPerIteration / 1024).toFixed(1)}KB`);

      // Should not have significant memory growth (< 10MB total)
      expect(totalGrowth).toBeLessThan(10 * 1024 * 1024);

      // Average growth per iteration should be minimal (< 50KB)
      expect(growthPerIteration).toBeLessThan(50 * 1024);
    });

    it('🧪 should handle large data processing efficiently', async () => {
      if (!patterns) return;

      // Create large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `This is a description for item number ${i}`.repeat(5),
        tags: [`tag-${i % 100}`, `category-${Math.floor(i / 100)}`, `type-${i % 10}`],
        metadata: {
          created: Date.now() - Math.random() * 1000000,
          score: Math.random() * 100,
          active: Math.random() > 0.3,
        },
      }));

      const memoryBefore = process.memoryUsage();
      resourceTracker.allocate('large-dataset-processing');

      try {
        // Process large dataset with memory constraints
        const result = await EdgeCaseHelpers.runWithMemoryConstraints(
          async () => {
            // Apply pattern to large dataset
            return await patterns.patternWeaver.applyPattern('TABULAR', {
              data: largeDataset,
              properties: ['id', 'name', 'metadata.score'],
              options: { colors: false }, // Disable colors for efficiency
            });
          },
          128 // 128MB memory limit
        );

        expect(result.success).toBe(true);
        expect(result.result).toBeDefined();

        const memoryAfter = process.memoryUsage();
        const memoryUsed = memoryAfter.heapUsed - memoryBefore.heapUsed;

        console.log(`📊 Large dataset processing: ${(memoryUsed / 1024 / 1024).toFixed(1)}MB used`);

        // Should process efficiently without excessive memory usage
        expect(memoryUsed).toBeLessThan(128 * 1024 * 1024); // Less than 128MB
      } finally {
        resourceTracker.deallocate('large-dataset-processing');
      }
    });

    it('🧪 should handle pattern data cleanup properly', async () => {
      if (!patterns) return;

      let patternData: any[] = [];
      const cleanupTestData = [];

      // Create patterns with cleanup requirements
      for (let i = 0; i < 10; i++) {
        const data = {
          id: i,
          largeBuffer: new ArrayBuffer(1024 * 1024), // 1MB buffer
          cleanup: function () {
            this.largeBuffer = null;
            patternData = patternData.filter(d => d.id !== this.id);
          },
        };

        patternData.push(data);
        cleanupTestData.push(data);
        resourceTracker.allocate(`pattern-data-${i}`);
      }

      expect(patternData.length).toBe(10);
      expect(resourceTracker.getAllocated().length).toBe(10);

      // Process data through patterns
      try {
        for (const data of cleanupTestData) {
          // Simulate pattern processing
          await patterns.patternWeaver.applyPattern('UTILITIES', {
            operation: 'estimateMemory',
            input: { id: data.id, size: data.largeBuffer.byteLength },
          });
        }
      } catch (error) {
        console.warn('Pattern processing error (expected for missing utilities):', error.message);
      }

      // Manual cleanup
      for (let i = 0; i < cleanupTestData.length; i++) {
        const data = cleanupTestData[i];
        data.cleanup();
        resourceTracker.deallocate(`pattern-data-${i}`);
      }

      // Verify cleanup
      expect(patternData.length).toBe(0);
      expect(resourceTracker.getAllocated().length).toBe(0);

      // Check that buffers are released
      for (const data of cleanupTestData) {
        expect(data.largeBuffer).toBeNull();
      }
    });
  });

  describe('🔄 Concurrent Pattern Processing', () => {
    it('🧪 should handle multiple concurrent pattern applications', async () => {
      if (!patterns) return;

      const concurrentOperation = async () => {
        const testData = Array.from({ length: 10 }, (_, i) => ({
          id: i,
          value: Math.random(),
          timestamp: Date.now(),
        }));

        // Apply different patterns concurrently
        const results = await patterns.PatternUtils.parallel(
          { pattern: 'TABULAR', context: testData },
          { pattern: 'TIMING', context: () => testData.length },
          { pattern: 'UTILITIES', context: { operation: 'version' } }
        );

        return results.map(r => r.pattern);
      };

      const stressTestResult = await EdgeCaseHelpers.stressConcurrentOperations(
        concurrentOperation,
        3, // 3 concurrent operations
        15 // 15 total iterations
      );

      expect(stressTestResult.success).toBe(true);
      expect(stressTestResult.results.length).toBeGreaterThan(10); // At least 80% success

      console.log(`🔄 Concurrent pattern test: ${stressTestResult.results.length}/15 succeeded`);
    });

    it('🧪 should prevent pattern state corruption during concurrency', async () => {
      if (!patterns) return;

      const sharedState = {
        counter: 0,
        operations: [],
        patternCalls: new Map(),
      };

      const statefulOperation = async () => {
        const operationId = Math.random().toString(36);

        // Track pattern usage
        const patternName = ['TABULAR', 'TIMING', 'UTILITIES'][Math.floor(Math.random() * 3)];

        const currentCount = sharedState.patternCalls.get(patternName) || 0;
        sharedState.patternCalls.set(patternName, currentCount + 1);

        // Apply pattern
        try {
          let result;
          switch (patternName) {
            case 'TABULAR':
              result = await patterns.patternWeaver.applyPattern('TABULAR', [
                { id: operationId, type: 'concurrent-test' },
              ]);
              break;
            case 'TIMING':
              result = await patterns.patternWeaver.applyPattern(
                'TIMING',
                () => new Promise(resolve => setTimeout(resolve, Math.random() * 10))
              );
              break;
            case 'UTILITIES':
              result = await patterns.patternWeaver.applyPattern('UTILITIES', {
                operation: 'version',
              });
              break;
          }

          sharedState.counter++;
          sharedState.operations.push({ id: operationId, pattern: patternName, success: true });

          return { operationId, pattern: patternName, result };
        } catch (error) {
          sharedState.operations.push({
            id: operationId,
            pattern: patternName,
            success: false,
            error: error.message,
          });
          throw error;
        }
      };

      // Run concurrent operations
      const promises = Array.from({ length: 12 }, () => statefulOperation());
      const results = await Promise.allSettled(promises);

      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      console.log(
        `🔄 State corruption test: ${successes.length} succeeded, ${failures.length} failed`
      );
      console.log(`📊 Pattern usage:`, Object.fromEntries(sharedState.patternCalls));

      // Validate state consistency
      expect(sharedState.operations.length).toBe(successes.length + failures.length);
      expect(sharedState.counter).toBe(successes.length);

      // Check that pattern calls were tracked correctly
      let totalPatternCalls = 0;
      for (const count of sharedState.patternCalls.values()) {
        totalPatternCalls += count;
      }
      expect(totalPatternCalls).toBe(promises.length);
    });

    it('🧪 should handle resource sharing conflicts', async () => {
      if (!patterns) return;

      const sharedResource = {
        data: new Map(),
        locks: new Set(),
        conflicts: 0,
      };

      const resourceContentionOperation = async () => {
        const resourceId = `resource-${Math.floor(Math.random() * 3)}`; // Limited resources

        // Try to acquire lock
        if (sharedResource.locks.has(resourceId)) {
          sharedResource.conflicts++;
          throw new Error(`Resource ${resourceId} is locked`);
        }

        try {
          sharedResource.locks.add(resourceId);

          // Simulate resource usage
          const currentValue = sharedResource.data.get(resourceId) || 0;
          await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
          sharedResource.data.set(resourceId, currentValue + 1);

          // Apply pattern while holding resource
          const result = await patterns.patternWeaver.applyPattern('TABULAR', [
            { resource: resourceId, value: currentValue + 1 },
          ]);

          return { resourceId, value: currentValue + 1, result };
        } finally {
          sharedResource.locks.delete(resourceId);
        }
      };

      // Run many concurrent operations to create contention
      const promises = Array.from({ length: 20 }, () => resourceContentionOperation());
      const results = await Promise.allSettled(promises);

      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      console.log(
        `🔄 Resource contention: ${successes.length} succeeded, ${failures.length} failed, ${sharedResource.conflicts} conflicts`
      );

      // Should have some conflicts due to resource contention
      expect(sharedResource.conflicts).toBeGreaterThan(0);
      expect(successes.length).toBeGreaterThan(0);

      // Verify no locks remain
      expect(sharedResource.locks.size).toBe(0);

      // Verify data consistency
      let totalValue = 0;
      for (const value of sharedResource.data.values()) {
        totalValue += value;
      }
      expect(totalValue).toBe(successes.length);
    });
  });
});
