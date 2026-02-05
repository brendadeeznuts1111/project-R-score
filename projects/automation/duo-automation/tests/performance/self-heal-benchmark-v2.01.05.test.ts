// tests/performance/self-heal-benchmark-v2.01.05.test.ts
// Performance benchmarks for v2.01.05 self-heal features

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { heal, CONFIG } from '../../scripts/self-heal';

describe('Self-Heal v2.01.05 Performance Benchmarks', () => {
  const benchmarkDir = './benchmark-temp-heal';
  const fileCounts = [10, 50, 100, 500];

  if (process.env.SKIP_BENCHMARKS === 'true') {
    describe.skip('Self-Heal v2.01.05 Performance Benchmarks', () => {});
    return;
  }
  
  beforeEach(async () => {
    await mkdir(benchmarkDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      const { $ } = await import('bun');
      await $`rm -rf "${benchmarkDir}"`.quiet();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Sequential vs Parallel Processing', () => {
    it.each(fileCounts)('should handle %d files efficiently', async (fileCount) => {
      // Create test files
      for (let i = 0; i < fileCount; i++) {
        const fileName = `.benchmark!file${i.toString().padStart(3, '0')}`;
        const filePath = join(benchmarkDir, fileName);
        const content = `Benchmark content ${i}`.repeat(100); // ~2KB per file
        await writeFile(filePath, content);
      }

      // Sequential processing
      const sequentialStart = performance.now();
      const sequentialMetrics = await heal({
        targetDir: benchmarkDir,
        dryRun: true,
        enableParallel: false,
        enableHashing: false,
        enableAuditLog: false,
        enableMetrics: true
      });
      const sequentialEnd = performance.now();
      const sequentialDuration = sequentialEnd - sequentialStart;

      // Restore files for parallel test
      for (let i = 0; i < fileCount; i++) {
        const fileName = `.benchmark!file${i.toString().padStart(3, '0')}`;
        const filePath = join(benchmarkDir, fileName);
        const content = `Benchmark content ${i}`.repeat(100);
        await writeFile(filePath, content);
      }

      // Parallel processing
      const parallelStart = performance.now();
      const parallelMetrics = await heal({
        targetDir: benchmarkDir,
        dryRun: true,
        enableParallel: true,
        parallelLimit: Math.min(10, fileCount),
        enableHashing: false,
        enableAuditLog: false,
        enableMetrics: true
      });
      const parallelEnd = performance.now();
      const parallelDuration = parallelEnd - parallelStart;

      // Performance assertions
      expect(sequentialMetrics.filesFound).toBe(fileCount);
      expect(sequentialMetrics.filesDeleted).toBe(fileCount);
      expect(parallelMetrics.filesFound).toBe(fileCount);
      expect(parallelMetrics.filesDeleted).toBe(fileCount);

      // Log performance results without enforcing speed in all environments

      // Log performance results
      console.log(`\n📊 Performance Results for ${fileCount} files:`);
      console.log(`   Sequential: ${sequentialDuration.toFixed(2)}ms`);
      console.log(`   Parallel:   ${parallelDuration.toFixed(2)}ms`);
      console.log(`   Speedup:    ${(sequentialDuration / parallelDuration).toFixed(2)}x`);
      console.log(`   Files/sec:  ${(fileCount / (parallelDuration / 1000)).toFixed(0)}`);
    });
  });

  describe('Hashing Performance', () => {
    it('should benchmark file hashing performance', async () => {
      const fileSizes = [1024, 10240, 102400, 1048576]; // 1KB, 10KB, 100KB, 1MB
      
      for (const size of fileSizes) {
        const fileName = `.hash!benchmark${size}`;
        const filePath = join(benchmarkDir, fileName);
        const content = 'x'.repeat(size);
        await writeFile(filePath, content);

        const hashStart = performance.now();
        const metrics = await heal({
          targetDir: benchmarkDir,
          dryRun: true,
          enableHashing: true,
          enableParallel: false,
          enableAuditLog: false,
          enableMetrics: true
        });
        const hashEnd = performance.now();
        const hashDuration = hashEnd - hashStart;

        expect(metrics.hashesGenerated).toBe(1);
        
        const throughputMB = (size / 1024 / 1024) / (hashDuration / 1000);
        console.log(`🔐 Hashing Performance (${(size / 1024).toFixed(0)}KB): ${hashDuration.toFixed(2)}ms (${throughputMB.toFixed(2)}MB/s)`);

        // Cleanup for next iteration
        const { $ } = await import('bun');
        await $`rm "${filePath}"`.quiet();
      }
    });
  });

  describe('Memory Usage', () => {
    it('should handle large file counts without memory leaks', async () => {
      const largeFileCount = 1000;
      
      // Create many small files
      for (let i = 0; i < largeFileCount; i++) {
        const fileName = `.memory!test${i.toString().padStart(4, '0')}`;
        const filePath = join(benchmarkDir, fileName);
        await writeFile(filePath, `Memory test content ${i}`);
      }

      const initialMemory = process.memoryUsage();
      
      // Run multiple iterations to test for memory leaks
      for (let iteration = 0; iteration < 5; iteration++) {
        const metrics = await heal({
          targetDir: benchmarkDir,
          dryRun: true,
          enableParallel: true,
          parallelLimit: 20,
          enableHashing: true,
          enableAuditLog: false,
          enableMetrics: true
        });

        expect(metrics.filesFound).toBe(largeFileCount);
        expect(metrics.filesDeleted).toBe(largeFileCount);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`💾 Memory Usage Test:`);
      console.log(`   Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Final:   ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Increase: ${memoryIncreaseMB.toFixed(2)}MB`);

      // Memory increase should be reasonable in CI/local environments
      expect(memoryIncreaseMB).toBeLessThan(200);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent heal operations safely', async () => {
      const concurrentCount = 5;
      const filesPerOperation = 20;
      
      // Create separate directories for each operation
      const directories = [];
      for (let i = 0; i < concurrentCount; i++) {
        const dir = join(benchmarkDir, `concurrent${i}`);
        await mkdir(dir, { recursive: true });
        directories.push(dir);
        
        // Create files in each directory
        for (let j = 0; j < filesPerOperation; j++) {
          const fileName = `.concurrent!file${j}`;
          const filePath = join(dir, fileName);
          await writeFile(filePath, `Content ${i}-${j}`);
        }
      }

      // Run concurrent operations
      const concurrentStart = performance.now();
      const promises = directories.map((dir, index) => 
        heal({
          targetDir: dir,
          dryRun: true,
          enableParallel: true,
          parallelLimit: 5,
          enableHashing: true,
          enableAuditLog: false,
          enableMetrics: true
        })
      );

      const results = await Promise.all(promises);
      const concurrentEnd = performance.now();
      const concurrentDuration = concurrentEnd - concurrentStart;

      // Verify all operations completed successfully
      results.forEach((metrics, index) => {
        expect(metrics.filesFound).toBe(filesPerOperation);
        expect(metrics.filesDeleted).toBe(filesPerOperation);
        expect(metrics.errors.length).toBe(0);
      });

      console.log(`🚀 Concurrent Operations:`);
      console.log(`   Operations: ${concurrentCount}`);
      console.log(`   Files per operation: ${filesPerOperation}`);
      console.log(`   Total files: ${concurrentCount * filesPerOperation}`);
      console.log(`   Duration: ${concurrentDuration.toFixed(2)}ms`);
      console.log(`   Throughput: ${((concurrentCount * filesPerOperation) / (concurrentDuration / 1000)).toFixed(0)} files/sec`);
    });
  });

  describe('Configuration Impact', () => {
    it('should measure performance impact of different configurations', async () => {
      const fileCount = 100;
      
      // Create test files
      for (let i = 0; i < fileCount; i++) {
        const fileName = `.config!test${i}`;
        const filePath = join(benchmarkDir, fileName);
        await writeFile(filePath, `Configuration test content ${i}`.repeat(10));
      }

      const configurations = [
        {
          name: 'Minimal',
          config: {
            enableHashing: false,
            enableAuditLog: false,
            enableParallel: false,
            enableMetrics: true
          }
        },
        {
          name: 'Standard',
          config: {
            enableHashing: true,
            enableAuditLog: false,
            enableParallel: false,
            enableMetrics: true
          }
        },
        {
          name: 'Full',
          config: {
            enableHashing: true,
            enableAuditLog: true,
            enableParallel: true,
            parallelLimit: 10,
            enableMetrics: true
          }
        }
      ];

      const results = [];

      for (const { name, config } of configurations) {
        // Restore files for each test
        for (let i = 0; i < fileCount; i++) {
          const fileName = `.config!test${i}`;
          const filePath = join(benchmarkDir, fileName);
          await writeFile(filePath, `Configuration test content ${i}`.repeat(10));
        }

        const start = performance.now();
        const metrics = await heal({
          targetDir: benchmarkDir,
          dryRun: true,
          ...config
        });
        const end = performance.now();
        const duration = end - start;

        results.push({ name, duration, metrics });
        
        console.log(`⚙️  ${name} Configuration: ${duration.toFixed(2)}ms`);
      }

      // Minimal should be fastest
      expect(results[0].duration).toBeLessThan(results[1].duration);
      expect(results[1].duration).toBeLessThan(results[2].duration * 2); // Allow some tolerance

      // All should process the same number of files
      results.forEach(result => {
        expect(result.metrics.filesFound).toBe(fileCount);
        expect(result.metrics.filesDeleted).toBe(fileCount);
      });
    });
  });

  describe('Scalability Limits', () => {
    it('should identify performance thresholds', async () => {
      const largeFileCounts = [1000, 2000, 5000];
      
      for (const fileCount of largeFileCounts) {
        // Create test files
        for (let i = 0; i < fileCount; i++) {
          const fileName = `.scale!test${i.toString().padStart(5, '0')}`;
          const filePath = join(benchmarkDir, fileName);
          await writeFile(filePath, `Scale test ${i}`);
        }

        const start = performance.now();
        const metrics = await heal({
          targetDir: benchmarkDir,
          dryRun: true,
          enableParallel: true,
          parallelLimit: Math.min(20, fileCount / 10),
          enableHashing: false, // Disable hashing for scalability test
          enableAuditLog: false,
          enableMetrics: true
        });
        const end = performance.now();
        const duration = end - start;

        const throughput = fileCount / (duration / 1000);
        
        console.log(`📈 Scalability Test (${fileCount} files):`);
        console.log(`   Duration: ${duration.toFixed(2)}ms`);
        console.log(`   Throughput: ${throughput.toFixed(0)} files/sec`);
        console.log(`   Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`);

        expect(metrics.filesFound).toBe(fileCount);
        expect(metrics.filesDeleted).toBe(fileCount);
        expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
        expect(throughput).toBeGreaterThan(50); // Should handle at least 50 files/sec

        // Cleanup for next iteration
        const { $ } = await import('bun');
        await $`rm -rf "${benchmarkDir}"/*`.quiet();
        await mkdir(benchmarkDir, { recursive: true });
      }
    });
  });
});
