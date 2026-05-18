#!/usr/bin/env bun

/**
 * 🛡️ Fire22 Edge Case Testing Utilities
 * Comprehensive helpers for testing edge cases and failure scenarios
 */

import { spawn } from 'bun';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

export interface EdgeCaseResult {
  success: boolean;
  message: string;
  details?: any;
  duration?: number;
  memoryUsage?: number;
}

export interface ResourceTracker {
  allocate: (resource: string) => void;
  deallocate: (resource: string) => void;
  getAllocated: () => string[];
  cleanup: () => void;
}

/**
 * 🛡️ Comprehensive Edge Case Testing Utilities
 */
export const EdgeCaseHelpers = {
  /**
   * 🧠 Create memory pressure scenarios
   */
  createMemoryPressure: (sizeMB: number) => {
    const bytes = sizeMB * 1024 * 1024;
    const buffer = new ArrayBuffer(bytes);
    const view = new Uint8Array(buffer);

    return {
      data: view,
      execute: async function () {
        // Simulate intensive memory operations
        for (let i = 0; i < this.data.length; i += 1024) {
          this.data[i] = Math.floor(Math.random() * 255);

          // Yield occasionally to prevent blocking
          if (i % (1024 * 1024) === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }

        return {
          processed: this.data.length,
          checksum: this.data.reduce((sum, byte, i) => sum + byte * (i % 256), 0),
        };
      },

      cleanup: function () {
        // Force cleanup
        this.data = new Uint8Array(0);
      },

      getSize: function () {
        return this.data.length;
      },
    };
  },

  /**
   * ⏱️ Execute operation with timeout and cleanup
   */
  withTimeout: async <T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    cleanup?: () => void
  ): Promise<T> => {
    const controller = new AbortController();
    let timeoutId: Timer;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      // Execute cleanup if provided
      if (cleanup) {
        try {
          cleanup();
        } catch (cleanupError) {
          console.warn('⚠️ Cleanup failed during timeout:', cleanupError);
        }
      }

      throw error;
    }
  },

  /**
   * 🔄 Simulate partial failures with configurable failure rate
   */
  simulatePartialFailure: (failureRate: number) => {
    const failures = new Set<number>();

    return {
      shouldFail: (index: number): boolean => {
        if (failures.has(index)) return true;

        if (Math.random() < failureRate) {
          failures.add(index);
          return true;
        }

        return false;
      },

      processItem: <T>(item: T, index: number): T => {
        if (this.shouldFail(index)) {
          throw new Error(`Simulated failure for item ${index}: ${JSON.stringify(item)}`);
        }
        return item;
      },

      getFailureCount: (): number => failures.size,
      reset: (): void => failures.clear(),
    };
  },

  /**
   * 🏗️ Create corrupted package.json scenarios
   */
  createCorruptedPackage: (type: 'syntax' | 'structure' | 'values' = 'syntax') => {
    const corruptedPackages = {
      syntax: '{"name": "@fire22/test", "version": "1.0.0",', // Missing closing brace
      structure: {
        name: '', // Invalid empty name
        version: 'invalid.version.format.too.many.parts',
        dependencies: 'should-be-object', // Wrong type
        scripts: null, // Wrong type
        main: 123, // Wrong type
      },
      values: {
        name: '@fire22/test',
        version: '1.0.0',
        dependencies: {
          'non-existent-package': '^99.99.99',
          '': '1.0.0', // Empty package name
          'invalid@package@name': '1.0.0',
        },
        scripts: {
          test: 'rm -rf / --no-preserve-root', // Dangerous script
          build: '', // Empty script
        },
      },
    };

    return corruptedPackages[type];
  },

  /**
   * 🔗 Create circular dependency scenarios
   */
  createCircularDependency: () => {
    const packages = new Map([
      [
        '@fire22/package-a',
        {
          dependencies: ['@fire22/package-b', '@fire22/shared'],
          version: '1.0.0',
        },
      ],
      [
        '@fire22/package-b',
        {
          dependencies: ['@fire22/package-c'],
          version: '1.0.0',
        },
      ],
      [
        '@fire22/package-c',
        {
          dependencies: ['@fire22/package-a'], // Creates circular dependency
          version: '1.0.0',
        },
      ],
      [
        '@fire22/shared',
        {
          dependencies: ['@fire22/package-c'], // Another circular path
          version: '1.0.0',
        },
      ],
    ]);

    return {
      packages,
      detectCircular: (): string[] => {
        const visited = new Set<string>();
        const visiting = new Set<string>();
        const cycles: string[] = [];

        function visit(packageName: string, path: string[] = []): void {
          if (visiting.has(packageName)) {
            const cycleStart = path.indexOf(packageName);
            const cycle = path.slice(cycleStart).concat(packageName);
            cycles.push(cycle.join(' → '));
            return;
          }

          if (visited.has(packageName)) return;

          visiting.add(packageName);
          const pkg = packages.get(packageName);

          if (pkg?.dependencies) {
            for (const dep of pkg.dependencies) {
              visit(dep, [...path, packageName]);
            }
          }

          visiting.delete(packageName);
          visited.add(packageName);
        }

        for (const packageName of packages.keys()) {
          if (!visited.has(packageName)) {
            visit(packageName);
          }
        }

        return cycles;
      },
    };
  },

  /**
   * 📊 Resource tracking for cleanup validation
   */
  createResourceTracker: (): ResourceTracker => {
    const allocated = new Map<string, { timestamp: number; metadata?: any }>();

    return {
      allocate: (resource: string, metadata?: any) => {
        allocated.set(resource, {
          timestamp: Date.now(),
          metadata,
        });
      },

      deallocate: (resource: string) => {
        return allocated.delete(resource);
      },

      getAllocated: () => {
        return Array.from(allocated.keys());
      },

      cleanup: () => {
        const count = allocated.size;
        allocated.clear();
        return count;
      },
    };
  },

  /**
   * 🐌 Create slow processing contexts for timeout testing
   */
  createSlowProcessingContext: (delayMs: number = 3000, dataSize: number = 1000) => ({
    processor: async (data: any[]) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));

      // Simulate CPU-intensive processing
      const result = data.map((item, index) => ({
        ...item,
        processed: true,
        processingTime: Date.now(),
        hash: (item.id || index).toString(36),
      }));

      return result;
    },

    data: Array.from({ length: dataSize }, (_, i) => ({
      id: i,
      value: Math.random(),
      timestamp: Date.now(),
    })),

    expectedDelay: delayMs,
  }),

  /**
   * 🧪 Run operation with memory constraints (simulate --smol flag)
   */
  runWithMemoryConstraints: async <T>(
    operation: () => Promise<T>,
    maxMemoryMB: number = 64
  ): Promise<EdgeCaseResult & { result?: T }> => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    try {
      // Monitor memory usage during operation
      const memoryMonitor = setInterval(() => {
        const current = process.memoryUsage();
        const usedMB = current.heapUsed / 1024 / 1024;

        if (usedMB > maxMemoryMB) {
          clearInterval(memoryMonitor);
          throw new Error(`Memory limit exceeded: ${usedMB.toFixed(2)}MB > ${maxMemoryMB}MB`);
        }
      }, 100);

      const result = await operation();
      clearInterval(memoryMonitor);

      const endTime = Date.now();
      const endMemory = process.memoryUsage();

      return {
        success: true,
        message: 'Operation completed within memory constraints',
        result,
        duration: endTime - startTime,
        memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
        details: {
          maxMemoryMB,
          peakMemoryMB: endMemory.heapUsed / 1024 / 1024,
        },
      };
    } catch (error) {
      const endTime = Date.now();
      const endMemory = process.memoryUsage();

      return {
        success: false,
        message: `Memory-constrained operation failed: ${error.message}`,
        duration: endTime - startTime,
        memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
        details: {
          maxMemoryMB,
          error: error.message,
        },
      };
    }
  },

  /**
   * 🔧 Simulate file system errors
   */
  simulateFileSystemErrors: (errorType: 'permission' | 'space' | 'corruption' | 'network') => {
    const tempDir = join(process.cwd(), 'test-temp-fs-errors');

    return {
      setup: () => {
        if (!existsSync(tempDir)) {
          mkdirSync(tempDir, { recursive: true });
        }
      },

      createErrorScenario: (filename: string) => {
        const filePath = join(tempDir, filename);

        switch (errorType) {
          case 'permission':
            // Create file and remove permissions (Unix-like systems)
            writeFileSync(filePath, '{"test": "data"}');
            if (process.platform !== 'win32') {
              try {
                require('fs').chmodSync(filePath, 0o000);
              } catch (e) {
                // Fallback for systems where chmod fails
              }
            }
            break;

          case 'space':
            // Simulate disk space error by trying to write large file
            try {
              const largeBuffer = Buffer.alloc(1024 * 1024 * 1024); // 1GB
              writeFileSync(filePath, largeBuffer);
            } catch (error) {
              // Expected to fail on systems with insufficient space
            }
            break;

          case 'corruption':
            // Create partially corrupted JSON
            writeFileSync(filePath, '{"name": "@fire22/test", "version": "1.0.0"');
            break;

          case 'network':
            // Simulate network file system timeout
            setTimeout(() => {
              if (existsSync(filePath)) {
                rmSync(filePath, { force: true });
              }
            }, 1000);
            writeFileSync(filePath, '{"test": "network-file"}');
            break;
        }

        return filePath;
      },

      cleanup: () => {
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true });
        }
      },
    };
  },

  /**
   * 🌐 Simulate network timeouts and failures
   */
  simulateNetworkFailures: (failureType: 'timeout' | 'connection' | 'partial' | 'slowdown') => ({
    createFailureScenario: async (url: string) => {
      switch (failureType) {
        case 'timeout':
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Network timeout')), 1000);
          });

        case 'connection':
          throw new Error('Connection refused');

        case 'partial':
          // Return partial response
          return Promise.resolve({
            ok: false,
            status: 206,
            statusText: 'Partial Content',
            json: () => Promise.resolve({ partial: true }),
          });

        case 'slowdown':
          await new Promise(resolve => setTimeout(resolve, 5000));
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ slow: true }),
          });
      }
    },
  }),

  /**
   * ⚡ Test Bun version compatibility
   */
  testBunVersionCompatibility: async () => {
    try {
      const proc = spawn(['bun', '--version'], { stdout: 'pipe' });
      const version = (await proc.text()).trim();

      return {
        version,
        compatible: true,
        features: {
          test: typeof Bun?.test !== 'undefined',
          spawn: typeof Bun?.spawn !== 'undefined',
          file: typeof Bun?.file !== 'undefined',
          inspect: typeof Bun?.inspect !== 'undefined',
        },
      };
    } catch (error) {
      return {
        version: 'unknown',
        compatible: false,
        error: error.message,
      };
    }
  },

  /**
   * 🔄 Stress test concurrent operations
   */
  stressConcurrentOperations: async <T>(
    operation: () => Promise<T>,
    concurrency: number = 10,
    iterations: number = 100
  ): Promise<EdgeCaseResult & { results: T[] }> => {
    const startTime = Date.now();
    const results: T[] = [];
    const errors: Error[] = [];

    try {
      // Create batches of concurrent operations
      for (let batch = 0; batch < iterations; batch += concurrency) {
        const promises = Array.from({ length: Math.min(concurrency, iterations - batch) }, () =>
          operation()
        );

        const batchResults = await Promise.allSettled(promises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            errors.push(result.reason);
          }
        }

        // Small delay between batches to prevent overwhelming
        if (batch + concurrency < iterations) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      const duration = Date.now() - startTime;
      const successRate = results.length / iterations;

      return {
        success: successRate >= 0.8, // 80% success rate threshold
        message: `Concurrent stress test completed: ${results.length}/${iterations} succeeded`,
        duration,
        results,
        details: {
          concurrency,
          iterations,
          successRate,
          errors: errors.slice(0, 5).map(e => e.message), // First 5 errors
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Concurrent stress test failed: ${error.message}`,
        duration: Date.now() - startTime,
        results,
        details: { error: error.message },
      };
    }
  },
};

export default EdgeCaseHelpers;
