// test/wiki-template-benchmark.test.ts - Performance benchmarks for wiki template system

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { MCPWikiGenerator, WikiTemplate, WikiGenerationRequest } from '../lib/mcp/wiki-generator-mcp';
import { DocumentationProvider } from '../lib/docs/constants/enums';
import { MultiThreadedWikiGenerator } from '../lib/mcp/multi-threaded-wiki-generator';
import { AdvancedCacheManager } from '../lib/utils/advanced-cache-manager';

describe('Wiki Template System - Performance Benchmarks', () => {
  const testTemplates: WikiTemplate[] = [];
  let multiThreadedGenerator: MultiThreadedWikiGenerator;
  let cacheManager: AdvancedCacheManager;

  beforeAll(async () => {
    // Initialize components
    multiThreadedGenerator = new MultiThreadedWikiGenerator({
      minWorkers: 4,
      maxWorkers: 8,
      workerScript: new URL('../lib/mcp/wiki-worker.ts', import.meta.url).href,
      taskTimeout: 60000,
      maxRetries: 3
    });

    cacheManager = new AdvancedCacheManager({
      maxSize: 1000,
      defaultTTL: 600000,
      enableCompression: true,
      compressionThreshold: 1024
    });

    // Create test templates
    for (let i = 0; i < 20; i++) {
      const template: WikiTemplate = {
        name: `Benchmark Template ${i + 1}`,
        description: `Template for performance benchmarking ${i + 1}`,
        provider: [
          DocumentationProvider.CONFLUENCE,
          DocumentationProvider.GITBOOK,
          DocumentationProvider.NOTION,
          DocumentationProvider.SLACK
        ][i % 4],
        workspace: `benchmark/workspace-${i + 1}`,
        format: ['markdown', 'html', 'json', 'all'][i % 4] as any,
        includeExamples: i % 2 === 0,
        customSections: i % 3 === 0 ? [
          '## Performance Metrics',
          '## Benchmark Results',
          '## Optimization Notes'
        ] : undefined,
        tags: [`benchmark`, `test`, `perf`, `template${i + 1}`],
        category: ['api', 'documentation', 'tutorial', 'reference'][i % 4] as any,
        priority: ['low', 'medium', 'high', 'critical'][i % 3] as any,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      testTemplates.push(template);
      MCPWikiGenerator.registerCustomTemplate(template);
    }
  });

  afterAll(async () => {
    await multiThreadedGenerator.shutdown();
    MCPWikiGenerator.clearCache();
  });

  describe('Single-threaded Performance', () => {
    it('should generate content within acceptable time limits', async () => {
      const template = testTemplates[0];
      const request: WikiGenerationRequest = {
        format: 'markdown',
        workspace: template.workspace,
        includeExamples: true,
        context: 'Performance benchmark test'
      };

      const startTime = performance.now();
      const result = await MCPWikiGenerator.generateWikiContent(template.name, request);
      const endTime = performance.now();

      const generationTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(generationTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.files.markdown).toBeDefined();
      expect(result.files.markdown!.length).toBeGreaterThan(100);

      console.log(`Single-threaded generation time: ${generationTime.toFixed(2)}ms`);
    });

    it('should handle multiple sequential generations efficiently', async () => {
      const numGenerations = 10;
      const times: number[] = [];

      for (let i = 0; i < numGenerations; i++) {
        const template = testTemplates[i % testTemplates.length];
        const request: WikiGenerationRequest = {
          format: 'markdown',
          workspace: template.workspace,
          includeExamples: true
        };

        const startTime = performance.now();
        const result = await MCPWikiGenerator.generateWikiContent(template.name, request);
        const endTime = performance.now();

        expect(result.success).toBe(true);
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      expect(averageTime).toBeLessThan(3000); // Average should be under 3 seconds
      expect(maxTime).toBeLessThan(10000); // Max should be under 10 seconds

      console.log(`Sequential generation stats:`);
      console.log(`  Average: ${averageTime.toFixed(2)}ms`);
      console.log(`  Min: ${minTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxTime.toFixed(2)}ms`);
    });
  });

  describe('Multi-threaded Performance', () => {
    it('should demonstrate significant speedup with concurrent generation', async () => {
      const numConcurrent = 10;
      const templates = testTemplates.slice(0, numConcurrent);

      // Sequential benchmark
      const sequentialStart = performance.now();
      for (const template of templates) {
        await MCPWikiGenerator.generateWikiContent(template.name, {
          format: 'markdown',
          workspace: template.workspace
        });
      }
      const sequentialEnd = performance.now();
      const sequentialTime = sequentialEnd - sequentialStart;

      // Concurrent benchmark
      const concurrentStart = performance.now();
      const concurrentPromises = templates.map(template =>
        multiThreadedGenerator.generateWikiContent(template, {
          format: 'markdown',
          workspace: template.workspace
        })
      );
      const concurrentResults = await Promise.all(concurrentPromises);
      const concurrentEnd = performance.now();
      const concurrentTime = concurrentEnd - concurrentStart;

      // Verify all succeeded
      expect(concurrentResults.every(r => r.success)).toBe(true);

      // Calculate speedup
      const speedup = sequentialTime / concurrentTime;

      expect(speedup).toBeGreaterThan(1.5); // Should be at least 1.5x faster
      expect(concurrentTime).toBeLessThan(sequentialTime);

      const stats = multiThreadedGenerator.getStats();
      expect(stats.completedTasks).toBe(numConcurrent);
      expect(stats.throughputPerSecond).toBeGreaterThan(0);

      console.log(`Performance comparison for ${numConcurrent} generations:`);
      console.log(`  Sequential: ${sequentialTime.toFixed(2)}ms`);
      console.log(`  Concurrent: ${concurrentTime.toFixed(2)}ms`);
      console.log(`  Speedup: ${speedup.toFixed(2)}x`);
      console.log(`  Throughput: ${stats.throughputPerSecond.toFixed(2)} tasks/sec`);
    });

    it('should handle high-load scenarios efficiently', async () => {
      const highLoadCount = 50;
      const templates = Array.from({ length: highLoadCount }, (_, i) => 
        testTemplates[i % testTemplates.length]
      );

      const startTime = performance.now();
      const promises = templates.map(template =>
        multiThreadedGenerator.generateWikiContent(template, {
          format: 'markdown',
          workspace: `${template.workspace}-${Math.random()}`
        })
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const successCount = results.filter(r => r.success).length;
      const successRate = successCount / results.length;

      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds

      const stats = multiThreadedGenerator.getStats();
      expect(stats.completedTasks).toBe(highLoadCount);

      console.log(`High-load test (${highLoadCount} concurrent tasks):`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`  Throughput: ${stats.throughputPerSecond.toFixed(2)} tasks/sec`);
      console.log(`  Active workers: ${stats.activeWorkers}/${stats.totalWorkers}`);
    });
  });

  describe('Cache Performance', () => {
    it('should demonstrate cache hit performance benefits', async () => {
      const template = testTemplates[0];
      const cacheKey = `benchmark-${template.name}`;
      const request: WikiGenerationRequest = {
        format: 'markdown',
        workspace: template.workspace,
        includeExamples: true
      };

      // First generation (cache miss)
      const missStart = performance.now();
      const result1 = await MCPWikiGenerator.generateWikiContent(template.name, request);
      const missEnd = performance.now();
      const missTime = missEnd - missStart;

      // Cache the result
      await cacheManager.set(cacheKey, result1);

      // Second generation (cache hit simulation)
      const hitStart = performance.now();
      const cachedResult = await cacheManager.get(cacheKey);
      const hitEnd = performance.now();
      const hitTime = hitEnd - hitStart;

      expect(result1.success).toBe(true);
      expect(cachedResult).toBeDefined();
      expect(cachedResult.success).toBe(true);
      expect(hitTime).toBeLessThan(missTime);

      const speedup = missTime / hitTime;

      console.log(`Cache performance:`);
      console.log(`  Cache miss: ${missTime.toFixed(2)}ms`);
      console.log(`  Cache hit: ${hitTime.toFixed(2)}ms`);
      console.log(`  Cache speedup: ${speedup.toFixed(2)}x`);

      const cacheStats = cacheManager.getStats();
      expect(cacheStats.hits).toBe(1);
      expect(cacheStats.sets).toBe(1);
    });

    it('should handle high-volume cache operations efficiently', async () => {
      const numOperations = 1000;
      const testData = Array.from({ length: numOperations }, (_, i) => ({
        key: `benchmark-key-${i}`,
        value: {
          content: `Test content ${i}`.repeat(10), // Make it substantial
          metadata: { index: i, timestamp: Date.now() }
        }
      }));

      // Benchmark cache sets
      const setStart = performance.now();
      for (const data of testData) {
        await cacheManager.set(data.key, data.value);
      }
      const setEnd = performance.now();
      const setTime = setEnd - setStart;

      // Benchmark cache gets
      const getStart = performance.now();
      for (const data of testData) {
        await cacheManager.get(data.key);
      }
      const getEnd = performance.now();
      const getTime = getEnd - getStart;

      const setOpsPerSec = numOperations / (setTime / 1000);
      const getOpsPerSec = numOperations / (getTime / 1000);

      expect(setOpsPerSec).toBeGreaterThan(100); // Should handle 100+ sets/sec
      expect(getOpsPerSec).toBeGreaterThan(1000); // Should handle 1000+ gets/sec

      const stats = cacheManager.getStats();
      expect(stats.sets).toBe(numOperations);
      expect(stats.hits).toBe(numOperations);

      console.log(`High-volume cache operations (${numOperations} ops):`);
      console.log(`  Sets: ${setOpsPerSec.toFixed(0)} ops/sec (${setTime.toFixed(2)}ms total)`);
      console.log(`  Gets: ${getOpsPerSec.toFixed(0)} ops/sec (${getTime.toFixed(2)}ms total)`);
      console.log(`  Memory usage: ${stats.memoryUsage} bytes`);
      console.log(`  Hit rate: ${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)}%`);
    });
  });

  describe('Scoring Performance', () => {
    it('should calculate template scores efficiently', async () => {
      const template = testTemplates[0];

      const startTime = performance.now();
      const scores = await MCPWikiGenerator.scoreCrossReferences(template.name);
      const endTime = performance.now();

      const scoringTime = endTime - startTime;

      expect(scores).toBeDefined();
      expect(scores.rssFeedItems).toBeDefined();
      expect(scores.gitCommits).toBeDefined();
      expect(scores.relatedTemplates).toBeDefined();
      expect(scores.overallScore).toBeDefined();
      expect(scoringTime).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Scoring performance: ${scoringTime.toFixed(2)}ms`);
      console.log(`  RSS items: ${scores.rssFeedItems.length}`);
      console.log(`  Git commits: ${scores.gitCommits.length}`);
      console.log(`  Related templates: ${scores.relatedTemplates.length}`);
    });

    it('should handle batch scoring efficiently', async () => {
      const numTemplates = 10;
      const templates = testTemplates.slice(0, numTemplates);

      const startTime = performance.now();
      const scoringPromises = templates.map(template =>
        MCPWikiGenerator.scoreCrossReferences(template.name)
      );
      const results = await Promise.all(scoringPromises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / numTemplates;

      expect(results).toHaveLength(numTemplates);
      results.forEach(scores => {
        expect(scores).toBeDefined();
        expect(scores.overallScore).toBeDefined();
      });

      expect(averageTime).toBeLessThan(5000); // Average should be under 5 seconds per template

      console.log(`Batch scoring performance (${numTemplates} templates):`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average per template: ${averageTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Efficiency', () => {
    it('should maintain reasonable memory usage during operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform memory-intensive operations
      const numOperations = 100;
      const promises = Array.from({ length: numOperations }, (_, i) =>
        MCPWikiGenerator.generateWikiContent(testTemplates[i % testTemplates.length].name, {
          format: 'all', // Generate all formats for more memory usage
          workspace: `memory-test-${i}`,
          includeExamples: true,
          context: 'Memory efficiency test content '.repeat(100)
        })
      );

      await Promise.all(promises);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be reasonable (less than 100MB for 100 operations)
      expect(memoryIncreaseMB).toBeLessThan(100);

      console.log(`Memory efficiency test (${numOperations} operations):`);
      console.log(`  Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);
      console.log(`  Memory per operation: ${(memoryIncrease / numOperations / 1024).toFixed(2)} KB`);
    });

    it('should clean up resources properly', async () => {
      const beforeCleanup = process.memoryUsage();

      // Generate content and cache results
      const numOperations = 50;
      for (let i = 0; i < numOperations; i++) {
        const result = await MCPWikiGenerator.generateWikiContent(
          testTemplates[i % testTemplates.length].name,
          { format: 'markdown', workspace: `cleanup-test-${i}` }
        );
        
        await cacheManager.set(`cleanup-${i}`, result);
      }

      const afterOperations = process.memoryUsage();

      // Clear caches
      MCPWikiGenerator.clearCache();
      await cacheManager.clear();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 100)); // Allow cleanup

      const afterCleanup = process.memoryUsage();
      const memoryReclaimed = afterOperations.heapUsed - afterCleanup.heapUsed;
      const memoryReclaimedMB = memoryReclaimed / (1024 * 1024);

      expect(memoryReclaimedMB).toBeGreaterThan(0); // Should reclaim some memory

      console.log(`Memory cleanup test:`);
      console.log(`  Before operations: ${(beforeCleanup.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  After operations: ${(afterOperations.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  After cleanup: ${(afterCleanup.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Memory reclaimed: ${memoryReclaimedMB.toFixed(2)} MB`);
    });
  });

  describe('Stress Tests', () => {
    it('should handle sustained load without degradation', async () => {
      const numRounds = 5;
      const tasksPerRound = 20;
      const performanceMetrics: number[] = [];

      for (let round = 0; round < numRounds; round++) {
        const roundStart = performance.now();
        
        const promises = Array.from({ length: tasksPerRound }, (_, i) => {
          const template = testTemplates[i % testTemplates.length];
          return multiThreadedGenerator.generateWikiContent(template, {
            format: 'markdown',
            workspace: `stress-test-round-${round}-task-${i}`
          });
        });

        const results = await Promise.all(promises);
        const roundEnd = performance.now();
        const roundTime = roundEnd - roundStart;

        const successRate = results.filter(r => r.success).length / results.length;
        expect(successRate).toBeGreaterThan(0.9); // 90% success rate

        performanceMetrics.push(roundTime);
        console.log(`Round ${round + 1}: ${roundTime.toFixed(2)}ms, Success rate: ${(successRate * 100).toFixed(1)}%`);
      }

      // Check for performance degradation
      const avgTime = performanceMetrics.reduce((a, b) => a + b, 0) / performanceMetrics.length;
      const firstHalf = performanceMetrics.slice(0, Math.floor(numRounds / 2));
      const secondHalf = performanceMetrics.slice(Math.floor(numRounds / 2));
      
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const degradationFactor = secondHalfAvg / firstHalfAvg;
      
      // Performance should not degrade significantly (less than 50% slower)
      expect(degradationFactor).toBeLessThan(1.5);

      console.log(`Sustained load test results:`);
      console.log(`  Average round time: ${avgTime.toFixed(2)}ms`);
      console.log(`  First half average: ${firstHalfAvg.toFixed(2)}ms`);
      console.log(`  Second half average: ${secondHalfAvg.toFixed(2)}ms`);
      console.log(`  Degradation factor: ${degradationFactor.toFixed(2)}x`);
    });
  });
});
