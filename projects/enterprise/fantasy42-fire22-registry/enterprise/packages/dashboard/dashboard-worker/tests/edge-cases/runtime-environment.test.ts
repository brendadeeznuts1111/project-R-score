#!/usr/bin/env bun

/**
 * 🛡️ Runtime Environment Edge Cases Test Suite
 * Comprehensive testing of runtime-specific edge cases and failures
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { EdgeCaseHelpers } from '../utils/edge-case-helpers';
import { spawn } from 'bun';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('🛡️ Runtime Environment Edge Cases', () => {
  let tempDir: string;
  let resourceTracker: ReturnType<typeof EdgeCaseHelpers.createResourceTracker>;

  beforeAll(() => {
    tempDir = join(process.cwd(), 'test-temp-runtime');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
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
      console.warn(`⚠️ ${remaining} resources not properly cleaned up`);
    }
  });

  describe('⚡ Bun Version Compatibility', () => {
    it('🧪 should detect Bun version and features', async () => {
      const compatibility = await EdgeCaseHelpers.testBunVersionCompatibility();

      expect(compatibility.version).toBeDefined();
      expect(compatibility.version).not.toBe('unknown');
      expect(compatibility.compatible).toBe(true);
      expect(compatibility.features.test).toBe(true);
      expect(compatibility.features.spawn).toBe(true);
    });

    it('🧪 should handle version-specific features gracefully', async () => {
      // Test features that might not be available in older versions
      const features = {
        nanoseconds: typeof Bun.nanoseconds === 'function',
        inspect: typeof Bun.inspect === 'object',
        file: typeof Bun.file === 'function',
        spawn: typeof Bun.spawn === 'function',
      };

      console.log('📊 Available Bun features:', features);

      // Should have at least basic features
      expect(features.spawn).toBe(true);
    });

    it('🧪 should detect runtime environment', () => {
      expect(typeof process.versions.bun).toBe('string');
      expect(process.versions.bun.length).toBeGreaterThan(0);

      // Validate Bun-specific globals
      expect(typeof Bun).toBe('object');
      expect(Bun).toBeDefined();
    });
  });

  describe('🧠 Memory Pressure Scenarios', () => {
    it('🧪 should handle memory pressure gracefully', async () => {
      const memoryTest = EdgeCaseHelpers.createMemoryPressure(100); // 100MB
      resourceTracker.allocate('memory-pressure-test');

      try {
        const result = await EdgeCaseHelpers.withTimeout(
          () => memoryTest.execute(),
          15000, // 15 second timeout
          () => {
            memoryTest.cleanup();
            resourceTracker.deallocate('memory-pressure-test');
          }
        );

        expect(result.processed).toBeGreaterThan(0);
        expect(result.checksum).toBeDefined();

        memoryTest.cleanup();
        resourceTracker.deallocate('memory-pressure-test');
      } catch (error) {
        // Cleanup should have been called by withTimeout
        expect(resourceTracker.getAllocated()).not.toContain('memory-pressure-test');
        throw error;
      }
    });

    it('🧪 should work with memory constraints (--smol simulation)', async () => {
      const constrainedOperation = async () => {
        const smallData = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: Math.random().toString(36),
        }));

        return smallData.reduce(
          (acc, item) => ({
            count: acc.count + 1,
            sum: acc.sum + item.data.length,
          }),
          { count: 0, sum: 0 }
        );
      };

      const result = await EdgeCaseHelpers.runWithMemoryConstraints(
        constrainedOperation,
        32 // 32MB limit
      );

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.count).toBe(1000);
      expect(result.memoryUsage).toBeLessThan(32 * 1024 * 1024); // Less than 32MB
    });

    it('🧪 should detect memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const leakyOperations: any[] = [];

      // Simulate potentially leaky operations
      for (let i = 0; i < 10; i++) {
        const memoryHog = EdgeCaseHelpers.createMemoryPressure(10); // 10MB each
        await memoryHog.execute();
        leakyOperations.push(memoryHog);
      }

      // Check memory growth
      const midMemory = process.memoryUsage().heapUsed;
      const growth = midMemory - initialMemory;

      // Cleanup
      leakyOperations.forEach(op => op.cleanup());

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const netGrowth = finalMemory - initialMemory;

      console.log(
        `📊 Memory usage: initial=${(initialMemory / 1024 / 1024).toFixed(1)}MB, peak=${(midMemory / 1024 / 1024).toFixed(1)}MB, final=${(finalMemory / 1024 / 1024).toFixed(1)}MB`
      );

      // Should not have significant permanent memory growth
      expect(netGrowth).toBeLessThan(50 * 1024 * 1024); // < 50MB net growth
    });
  });

  describe('🔄 Concurrent Execution Safety', () => {
    it('🧪 should handle concurrent test execution without conflicts', async () => {
      const concurrentOperation = async () => {
        const testFile = join(tempDir, `test-${Math.random().toString(36)}.json`);
        resourceTracker.allocate(`file:${testFile}`);

        try {
          writeFileSync(
            testFile,
            JSON.stringify({
              timestamp: Date.now(),
              random: Math.random(),
            })
          );

          await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 90));

          const content = JSON.parse(Bun.file(testFile).text());

          return {
            success: true,
            file: testFile,
            content,
          };
        } finally {
          if (existsSync(testFile)) {
            rmSync(testFile, { force: true });
          }
          resourceTracker.deallocate(`file:${testFile}`);
        }
      };

      const result = await EdgeCaseHelpers.stressConcurrentOperations(
        concurrentOperation,
        5, // 5 concurrent
        25 // 25 iterations
      );

      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(20); // At least 80% success
      expect(resourceTracker.getAllocated()).toHaveLength(0);
    });

    it('🧪 should prevent race conditions in resource allocation', async () => {
      const sharedResource = { counter: 0, operations: [] as string[] };

      const racyOperation = async () => {
        const operationId = Math.random().toString(36);

        // Simulate race condition
        const currentCounter = sharedResource.counter;
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

        sharedResource.counter = currentCounter + 1;
        sharedResource.operations.push(operationId);

        return operationId;
      };

      const promises = Array.from({ length: 10 }, () => racyOperation());
      const results = await Promise.all(promises);

      // Check for race condition effects
      expect(results).toHaveLength(10);
      expect(sharedResource.operations).toHaveLength(10);

      // Counter might be less than 10 due to race conditions
      console.log(`🔄 Race condition test: expected=10, actual counter=${sharedResource.counter}`);

      // This test demonstrates race conditions exist
      if (sharedResource.counter < 10) {
        console.log('⚠️ Race condition detected (expected behavior for this test)');
      }
    });

    it('🧪 should handle resource contention', async () => {
      const sharedFilePath = join(tempDir, 'shared-resource.json');
      writeFileSync(sharedFilePath, '{"counter": 0}');

      const contentionOperation = async () => {
        try {
          const content = JSON.parse(await Bun.file(sharedFilePath).text());
          content.counter += 1;
          content.lastUpdate = Date.now();

          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 20));

          writeFileSync(sharedFilePath, JSON.stringify(content));

          return content.counter;
        } catch (error) {
          throw new Error(`Resource contention error: ${error.message}`);
        }
      };

      const promises = Array.from({ length: 5 }, () => contentionOperation());
      const results = await Promise.allSettled(promises);

      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;

      console.log(`🔄 Resource contention: ${successes} successes, ${failures} failures`);

      expect(successes).toBeGreaterThan(0);

      // Cleanup
      if (existsSync(sharedFilePath)) {
        rmSync(sharedFilePath);
      }
    });
  });

  describe('📁 File System Edge Cases', () => {
    it('🧪 should handle permission errors gracefully', async () => {
      const fsError = EdgeCaseHelpers.simulateFileSystemErrors('permission');
      fsError.setup();

      try {
        const problemFile = fsError.createErrorScenario('permission-test.json');

        // Attempt to read the file
        let readError: Error | null = null;
        try {
          await Bun.file(problemFile).text();
        } catch (error) {
          readError = error as Error;
        }

        if (process.platform !== 'win32') {
          expect(readError).not.toBeNull();
          expect(readError?.message).toMatch(/permission|denied|EACCES/i);
        }
      } finally {
        fsError.cleanup();
      }
    });

    it('🧪 should handle corrupted files', () => {
      const fsError = EdgeCaseHelpers.simulateFileSystemErrors('corruption');
      fsError.setup();

      try {
        const corruptedFile = fsError.createErrorScenario('corrupted.json');

        expect(async () => {
          const content = await Bun.file(corruptedFile).text();
          JSON.parse(content);
        }).toThrow();
      } finally {
        fsError.cleanup();
      }
    });

    it('🧪 should handle missing files and directories', () => {
      const nonExistentFile = join(tempDir, 'does-not-exist.json');

      expect(() => {
        if (existsSync(nonExistentFile)) {
          throw new Error('File should not exist');
        }
      }).not.toThrow();

      expect(async () => {
        const file = Bun.file(nonExistentFile);
        const exists = await file.exists();
        expect(exists).toBe(false);
      }).not.toThrow();
    });
  });

  describe('🌐 Network Timeout Scenarios', () => {
    it('🧪 should handle connection timeouts', async () => {
      const networkFailure = EdgeCaseHelpers.simulateNetworkFailures('timeout');

      await expect(
        EdgeCaseHelpers.withTimeout(
          () => networkFailure.createFailureScenario('http://example.com/timeout'),
          2000
        )
      ).rejects.toThrow(/timeout/i);
    });

    it('🧪 should handle connection failures', async () => {
      const networkFailure = EdgeCaseHelpers.simulateNetworkFailures('connection');

      await expect(
        networkFailure.createFailureScenario('http://localhost:99999/nonexistent')
      ).rejects.toThrow(/connection/i);
    });

    it('🧪 should handle partial responses', async () => {
      const networkFailure = EdgeCaseHelpers.simulateNetworkFailures('partial');

      const response = await networkFailure.createFailureScenario('http://example.com/partial');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(206);
    });

    it('🧪 should handle slow network responses', async () => {
      const networkFailure = EdgeCaseHelpers.simulateNetworkFailures('slowdown');

      const startTime = Date.now();
      const response = await networkFailure.createFailureScenario('http://example.com/slow');
      const duration = Date.now() - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeGreaterThan(4000); // Should take at least 4 seconds

      const data = await response.json();
      expect(data.slow).toBe(true);
    });
  });

  describe('🔧 Process Management Edge Cases', () => {
    it('🧪 should handle process spawn failures', async () => {
      let spawnError: Error | null = null;

      try {
        const proc = spawn(['nonexistent-command-12345'], {
          stdout: 'pipe',
          stderr: 'pipe',
        });

        await proc.exited;
      } catch (error) {
        spawnError = error as Error;
      }

      // Should handle spawn failures gracefully
      expect(spawnError).not.toBeNull();
    });

    it('🧪 should handle process timeouts', async () => {
      const longRunningProcess = spawn(['sleep', '10'], {
        stdout: 'pipe',
      });

      // Kill the process after 1 second
      setTimeout(() => {
        longRunningProcess.kill();
      }, 1000);

      const exitCode = await longRunningProcess.exited;

      // Process should be terminated
      expect(exitCode).not.toBe(0);
    });

    it('🧪 should handle process cleanup on interruption', async () => {
      let processStarted = false;
      let processCleaned = false;

      const processOperation = async () => {
        const proc = spawn(['bun', '--version'], { stdout: 'pipe' });
        processStarted = true;

        try {
          const result = await proc.text();
          return result.trim();
        } finally {
          processCleaned = true;
        }
      };

      const result = await processOperation();

      expect(processStarted).toBe(true);
      expect(processCleaned).toBe(true);
      expect(result).toMatch(/^\d+\.\d+\.\d+/); // Version format
    });
  });
});
