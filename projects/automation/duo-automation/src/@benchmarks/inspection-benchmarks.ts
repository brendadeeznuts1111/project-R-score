/**
 * Comprehensive Benchmarks for Enhanced Inspection System
 * 
 * Validates performance, memory usage, and scalability across
 * various filter types, object sizes, and processing modes.
 */

import { EnhancedInspectionSystem } from '../@inspection/enhanced-inspection-system.js';
import { performance } from 'perf_hooks';

interface BenchmarkResult {
  name: string;
  iterations: number;
  average: string;
  min: string;
  max: string;
  stdDev: string;
  p95: string;
  p99: string;
  throughput: string;
  memoryUsage: {
    rss: string;
    heapUsed: string;
    heapTotal: string;
    external: string;
  };
}

interface BenchmarkSuite {
  timestamp: string;
  systemInfo: {
    nodeVersion: string;
    bunVersion: string;
    platform: string;
    arch: string;
    memory: string;
    cpu: string;
  };
  results: BenchmarkResult[];
  summary: {
    totalTests: number;
    fastestTest: string;
    slowestTest: string;
    averageThroughput: string;
    memoryEfficiency: string;
  };
}

class InspectionBenchmarks {
  private inspectSystem: EnhancedInspectionSystem;
  private testObjects: Map<string, any> = new Map();
  
  constructor() {
    this.inspectSystem = new EnhancedInspectionSystem();
    this.generateTestObjects();
  }

  /**
   * 🚀 Run complete benchmark suite
   */
  async runCompleteSuite(): Promise<BenchmarkSuite> {
    console.log('🚀 Running Enhanced Inspection System Benchmarks...\n');
    
    const results: BenchmarkResult[] = [];
    
    // Performance benchmarks
    results.push(await this.benchmarkBaseline());
    results.push(await this.benchmarkKeywordFilter());
    results.push(await this.benchmarkRegexFilter());
    results.push(await this.benchmarkFieldFilter());
    results.push(await this.benchmarkTypeFilter());
    results.push(await this.benchmarkComplexFilter());
    results.push(await this.benchmarkExclusionFilter());
    results.push(await this.benchmarkMaxDepth());
    results.push(await this.benchmarkRedaction());
    results.push(await this.benchmarkPlugins());
    
    // Scalability benchmarks
    results.push(await this.benchmarkSmallObject());
    results.push(await this.benchmarkMediumObject());
    results.push(await this.benchmarkLargeObject());
    results.push(await this.benchmarkHugeObject());
    results.push(await this.benchmarkDeepObject());
    results.push(await this.benchmarkWideObject());
    
    // Processing mode benchmarks
    results.push(await this.benchmarkSyncVsAsync());
    results.push(await this.benchmarkMemoryEfficiency());
    results.push(await this.benchmarkConcurrentRequests());
    
    // Generate summary
    const summary = this.generateSummary(results);
    
    const suite: BenchmarkSuite = {
      timestamp: new Date().toISOString(),
      systemInfo: this.getSystemInfo(),
      results,
      summary
    };
    
    // Save results
    await this.saveResults(suite);
    
    // Display results
    this.displayResults(suite);
    
    return suite;
  }

  /**
   * 📊 Generate test objects of various sizes
   */
  private generateTestObjects(): void {
    // Small object (1KB)
    this.testObjects.set('small', {
      id: 'test-001',
      name: 'Test Object',
      type: 'benchmark',
      timestamp: new Date().toISOString(),
      metadata: {
        version: '1.0.0',
        environment: 'test',
        features: ['inspection', 'filtering', 'performance']
      },
      metrics: {
        cpu: 45.2,
        memory: 1024,
        disk: 2048
      }
    });

    // Medium object (10KB)
    this.testObjects.set('medium', {
      ...this.testObjects.get('small'),
      items: Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        value: Math.random() * 1000,
        category: ['payment', 'user', 'system', 'security'][i % 4],
        metadata: {
          created: new Date(Date.now() - i * 1000).toISOString(),
          tags: [`tag-${i % 10}`, `category-${i % 5}`],
          priority: i % 3
        }
      })),
      stats: {
        totalItems: 100,
        activeItems: 75,
        processingTime: 123.45,
        errors: 2
      }
    });

    // Large object (100KB)
    this.testObjects.set('large', {
      ...this.testObjects.get('medium'),
      items: Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Large Item ${i}`,
        value: Math.random() * 10000,
        category: ['payment', 'user', 'system', 'security', 'network', 'database'][i % 6],
        metadata: {
          created: new Date(Date.now() - i * 100).toISOString(),
          updated: new Date(Date.now() - i * 50).toISOString(),
          tags: Array.from({ length: 5 }, (_, j) => `tag-${(i + j) % 20}`),
          priority: i % 5,
          status: ['active', 'pending', 'completed', 'failed'][i % 4],
          nested: {
            level1: { data: `nested-${i}`, count: i },
            level2: { items: Array.from({ length: 3 }, (_, j) => ({ id: j, value: j * i })) }
          }
        },
        performance: {
          latency: Math.random() * 100,
          throughput: Math.random() * 1000,
          errorRate: Math.random() * 0.1
        }
      })),
      analytics: {
        totalProcessed: 50000,
        successRate: 0.95,
        averageResponseTime: 145.67,
        peakLoad: 1250
      }
    });

    // Huge object (1MB)
    this.testObjects.set('huge', {
      ...this.testObjects.get('large'),
      items: Array.from({ length: 10000 }, (_, i) => ({
        ...this.testObjects.get('large')?.items[i % 1000],
        id: `huge-item-${i}`,
        batch: Math.floor(i / 100),
        timestamp: new Date(Date.now() - i * 10).toISOString()
      })),
      batches: Array.from({ length: 10 }, (_, i) => ({
        id: `batch-${i}`,
        size: 1000,
        processed: i * 500,
        errors: Math.floor(Math.random() * 10),
        metrics: {
          startTime: new Date(Date.now() - i * 60000).toISOString(),
          endTime: new Date(Date.now() - i * 30000).toISOString(),
          duration: 30000 + i * 1000
        }
      }))
    });

    // Deep object (nested structure)
    this.testObjects.set('deep', this.generateDeepObject(20, 5));

    // Wide object (many properties)
    this.testObjects.set('wide', this.generateWideObject(1000));
  }

  /**
   * 🌳 Generate deeply nested object
   */
  private generateDeepObject(depth: number, width: number): any {
    if (depth === 0) {
      return { value: 'leaf', timestamp: Date.now() };
    }

    const obj: any = {};
    for (let i = 0; i < width; i++) {
      obj[`prop${i}`] = this.generateDeepObject(depth - 1, width);
    }
    
    return obj;
  }

  /**
   * 📊 Generate wide object (many properties)
   */
  private generateWideObject(propertyCount: number): any {
    const obj: any = {};
    
    for (let i = 0; i < propertyCount; i++) {
      obj[`property_${i}`] = {
        id: i,
        value: Math.random() * 1000,
        type: ['string', 'number', 'boolean', 'object'][i % 4],
        category: ['payment', 'user', 'system', 'security', 'network'][i % 5],
        metadata: {
          created: new Date(Date.now() - i * 1000).toISOString(),
          tags: [`tag-${i % 50}`, `category-${i % 10}`]
        }
      };
    }
    
    return obj;
  }

  /**
   * ⚡ Performance Benchmarks
   */

  private async benchmarkBaseline(): Promise<BenchmarkResult> {
    console.log('1. Baseline (no filter)...');
    
    const iterations = 100;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({});
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Baseline', times, memoryBefore, memoryAfter);
  }

  private async benchmarkKeywordFilter(): Promise<BenchmarkResult> {
    console.log('2. Keyword filter...');
    
    const iterations = 100;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ filter: 'payment' });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Keyword Filter', times, memoryBefore, memoryAfter);
  }

  private async benchmarkRegexFilter(): Promise<BenchmarkResult> {
    console.log('3. Regex filter...');
    
    const iterations = 100;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ filter: /payment|venmo|cashapp/i });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Regex Filter', times, memoryBefore, memoryAfter);
  }

  private async benchmarkFieldFilter(): Promise<BenchmarkResult> {
    console.log('4. Field filter...');
    
    const iterations = 100;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ field: 'metadata' });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Field Filter', times, memoryBefore, memoryAfter);
  }

  private async benchmarkTypeFilter(): Promise<BenchmarkResult> {
    console.log('5. Type filter...');
    
    const iterations = 100;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ type: 'string' });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Type Filter', times, memoryBefore, memoryAfter);
  }

  private async benchmarkComplexFilter(): Promise<BenchmarkResult> {
    console.log('6. Complex filter...');
    
    const iterations = 50;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({
        filter: 'payment',
        exclude: 'token',
        maxDepth: 5,
        redactSensitive: true,
        field: 'metadata'
      });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Complex Filter', times, memoryBefore, memoryAfter);
  }

  private async benchmarkExclusionFilter(): Promise<BenchmarkResult> {
    console.log('7. Exclusion filter...');
    
    const iterations = 100;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({
        filter: 'payment',
        exclude: ['token', 'secret', 'password']
      });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Exclusion Filter', times, memoryBefore, memoryAfter);
  }

  private async benchmarkMaxDepth(): Promise<BenchmarkResult> {
    console.log('8. Max depth limit...');
    
    const iterations = 100;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ maxDepth: 3 });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Max Depth', times, memoryBefore, memoryAfter);
  }

  private async benchmarkRedaction(): Promise<BenchmarkResult> {
    console.log('9. Redaction...');
    
    const iterations = 100;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ 
        redactSensitive: true,
        filter: 'email' // Force processing of sensitive data
      });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Redaction', times, memoryBefore, memoryAfter);
  }

  private async benchmarkPlugins(): Promise<BenchmarkResult> {
    console.log('10. Plugin system...');
    
    const iterations = 50;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ 
        pluginFilters: ['payment', 'security', 'performance']
      });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Plugin System', times, memoryBefore, memoryAfter);
  }

  /**
   * 📈 Scalability Benchmarks
   */

  private async benchmarkSmallObject(): Promise<BenchmarkResult> {
    console.log('11. Small object (1KB)...');
    
    const iterations = 200;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ filter: 'test' });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Small Object', times, memoryBefore, memoryAfter);
  }

  private async benchmarkMediumObject(): Promise<BenchmarkResult> {
    console.log('12. Medium object (10KB)...');
    
    const iterations = 100;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ filter: 'item' });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Medium Object', times, memoryBefore, memoryAfter);
  }

  private async benchmarkLargeObject(): Promise<BenchmarkResult> {
    console.log('13. Large object (100KB)...');
    
    const iterations = 50;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ filter: 'payment', maxDepth: 3 });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Large Object', times, memoryBefore, memoryAfter);
  }

  private async benchmarkHugeObject(): Promise<BenchmarkResult> {
    console.log('14. Huge object (1MB)...');
    
    const iterations = 20;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ 
        filter: 'batch',
        maxDepth: 2,
        asyncProcessing: true
      });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Huge Object', times, memoryBefore, memoryAfter);
  }

  private async benchmarkDeepObject(): Promise<BenchmarkResult> {
    console.log('15. Deep object (20 levels)...');
    
    const iterations = 50;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ 
        filter: 'leaf',
        maxDepth: 10
      });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Deep Object', times, memoryBefore, memoryAfter);
  }

  private async benchmarkWideObject(): Promise<BenchmarkResult> {
    console.log('16. Wide object (1000 properties)...');
    
    const iterations = 50;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ 
        filter: 'payment',
        field: 'property'
      });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Wide Object', times, memoryBefore, memoryAfter);
  }

  /**
   * ⚙️ Processing Mode Benchmarks
   */

  private async benchmarkSyncVsAsync(): Promise<BenchmarkResult> {
    console.log('17. Sync vs Async processing...');
    
    const iterations = 50;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    // Test async processing
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await this.inspectSystem.inspect({ 
        filter: 'payment',
        asyncProcessing: true
      });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Async Processing', times, memoryBefore, memoryAfter);
  }

  private async benchmarkMemoryEfficiency(): Promise<BenchmarkResult> {
    console.log('18. Memory efficiency...');
    
    const iterations = 100;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const start = performance.now();
      await this.inspectSystem.inspect({ 
        filter: 'payment',
        maxDepth: 5,
        redactSensitive: true
      });
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Memory Efficient', times, memoryBefore, memoryAfter);
  }

  private async benchmarkConcurrentRequests(): Promise<BenchmarkResult> {
    console.log('19. Concurrent requests...');
    
    const concurrency = 10;
    const iterations = 20;
    const times: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      // Run concurrent requests
      const promises = Array.from({ length: concurrency }, () =>
        this.inspectSystem.inspect({ filter: 'payment' })
      );
      
      await Promise.all(promises);
      times.push(performance.now() - start);
    }
    
    const memoryAfter = process.memoryUsage();
    
    return this.createBenchmarkResult('Concurrent', times, memoryBefore, memoryAfter);
  }

  /**
   * 📊 Calculate benchmark statistics
   */
  private createBenchmarkResult(
    name: string,
    times: number[],
    memoryBefore: NodeJS.MemoryUsage,
    memoryAfter: NodeJS.MemoryUsage
  ): BenchmarkResult {
    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    // Calculate standard deviation
    const variance = times.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate percentiles
    const sorted = [...times].sort((a, b) => a - b);
    const p95 = this.percentile(sorted, 95);
    const p99 = this.percentile(sorted, 99);
    
    // Calculate throughput (operations per second)
    const throughput = 1000 / avg;
    
    // Calculate memory usage
    const memoryUsage = {
      rss: this.formatBytes(memoryAfter.rss - memoryBefore.rss),
      heapUsed: this.formatBytes(memoryAfter.heapUsed - memoryBefore.heapUsed),
      heapTotal: this.formatBytes(memoryAfter.heapTotal - memoryBefore.heapTotal),
      external: this.formatBytes(memoryAfter.external - memoryBefore.external)
    };
    
    return {
      name,
      iterations: times.length,
      average: `${avg.toFixed(2)}ms`,
      min: `${min.toFixed(2)}ms`,
      max: `${max.toFixed(2)}ms`,
      stdDev: `${stdDev.toFixed(2)}ms`,
      p95: `${p95.toFixed(2)}ms`,
      p99: `${p99.toFixed(2)}ms`,
      throughput: `${throughput.toFixed(2)} ops/sec`,
      memoryUsage
    };
  }

  /**
   * 📈 Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const pos = (sorted.length - 1) * p / 100;
    const base = Math.floor(pos);
    const rest = pos - base;
    
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  }

  /**
   * 💾 Format bytes for display
   */
  private formatBytes(bytes: number): string {
    const abs = Math.abs(bytes);
    if (abs === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    const u = Math.floor(Math.log(abs) / Math.log(1024));
    const value = abs / Math.pow(1024, u);
    
    return `${bytes >= 0 ? '' : '-'}${value.toFixed(2)} ${units[u]}`;
  }

  /**
   * 📊 Generate benchmark summary
   */
  private generateSummary(results: BenchmarkResult[]) {
    const totalTests = results.length;
    
    const fastestTest = results.reduce((min, result) => {
      const minTime = parseFloat(min.average);
      const resultTime = parseFloat(result.average);
      return resultTime < minTime ? result : min;
    });
    
    const slowestTest = results.reduce((max, result) => {
      const maxTime = parseFloat(max.average);
      const resultTime = parseFloat(result.average);
      return resultTime > maxTime ? result : max;
    });
    
    const avgThroughput = results.reduce((sum, result) => 
      sum + parseFloat(result.throughput), 0
    ) / results.length;
    
    const memoryEfficiency = results.reduce((sum, result) => {
      const memory = parseFloat(result.memoryUsage.heapUsed);
      return sum + memory;
    }, 0) / results.length;
    
    return {
      totalTests,
      fastestTest: fastestTest.name,
      slowestTest: slowestTest.name,
      averageThroughput: `${avgThroughput.toFixed(2)} ops/sec`,
      memoryEfficiency: this.formatBytes(memoryEfficiency * 1024 * 1024)
    };
  }

  /**
   * 💻 Get system information
   */
  private getSystemInfo() {
    return {
      nodeVersion: process.version,
      bunVersion: Bun.version,
      platform: process.platform,
      arch: process.arch,
      memory: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      cpu: process.arch // Could be enhanced with actual CPU info
    };
  }

  /**
   * 💾 Save benchmark results
   */
  private async saveResults(suite: BenchmarkSuite): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmarks/inspection-benchmark-${timestamp}.json`;
    
    // Ensure directory exists
    await Bun.mkdir('./benchmarks', { recursive: true });
    
    // Save detailed results
    await Bun.write(filename, JSON.stringify(suite, null, 2));
    
    // Save latest results
    await Bun.write('./benchmarks/latest.json', JSON.stringify(suite, null, 2));
    
    // Generate CSV for easy analysis
    const csv = this.generateCSV(suite);
    await Bun.write(`./benchmarks/inspection-benchmark-${timestamp}.csv`, csv);
    
    console.log(`📁 Results saved to ${filename}`);
  }

  /**
   * 📊 Generate CSV format
   */
  private generateCSV(suite: BenchmarkSuite): string {
    const headers = [
      'Test Name',
      'Iterations',
      'Average (ms)',
      'Min (ms)',
      'Max (ms)',
      'Std Dev (ms)',
      'P95 (ms)',
      'P99 (ms)',
      'Throughput (ops/sec)',
      'Memory RSS',
      'Memory Heap Used'
    ];
    
    const rows = suite.results.map(result => [
      result.name,
      result.iterations,
      result.average,
      result.min,
      result.max,
      result.stdDev,
      result.p95,
      result.p99,
      result.throughput,
      result.memoryUsage.rss,
      result.memoryUsage.heapUsed
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * 🖥️ Display benchmark results
   */
  private displayResults(suite: BenchmarkSuite): void {
    console.log('\n📊 BENCHMARK RESULTS');
    console.log('='.repeat(80));
    
    // System info
    console.log('\n🖥️  System Information:');
    console.log(`   Node.js: ${suite.systemInfo.nodeVersion}`);
    console.log(`   Bun: ${suite.systemInfo.bunVersion}`);
    console.log(`   Platform: ${suite.systemInfo.platform} (${suite.systemInfo.arch})`);
    console.log(`   Memory: ${suite.systemInfo.memory}`);
    
    // Results table
    console.log('\n📈 Performance Results:');
    console.table(suite.results);
    
    // Summary
    console.log('\n📋 Summary:');
    console.log(`   Total Tests: ${suite.summary.totalTests}`);
    console.log(`   Fastest: ${suite.summary.fastestTest}`);
    console.log(`   Slowest: ${suite.summary.slowestTest}`);
    console.log(`   Average Throughput: ${suite.summary.averageThroughput}`);
    console.log(`   Memory Efficiency: ${suite.summary.memoryEfficiency}`);
    
    // Performance analysis
    console.log('\n🔍 Performance Analysis:');
    this.analyzePerformance(suite.results);
    
    console.log('\n✅ Benchmarks complete!');
  }

  /**
   * 🔍 Analyze performance patterns
   */
  private analyzePerformance(results: BenchmarkResult[]): void {
    // Find performance patterns
    const filterResults = results.filter(r => 
      r.name.includes('Filter') || r.name.includes('filter')
    );
    
    const scalabilityResults = results.filter(r => 
      r.name.includes('Object') || r.name.includes('object')
    );
    
    if (filterResults.length > 0) {
      const fastestFilter = filterResults.reduce((min, result) => {
        const minTime = parseFloat(min.average);
        const resultTime = parseFloat(result.average);
        return resultTime < minTime ? result : min;
      });
      
      console.log(`   🏆 Fastest Filter: ${fastestFilter.name} (${fastestFilter.average})`);
    }
    
    if (scalabilityResults.length > 0) {
      const memoryEfficient = scalabilityResults.reduce((min, result) => {
        const minMemory = parseFloat(min.memoryUsage.heapUsed);
        const resultMemory = parseFloat(result.memoryUsage.heapUsed);
        return resultMemory < minMemory ? result : min;
      });
      
      console.log(`   💾 Most Memory Efficient: ${memoryEfficient.name} (${memoryEfficient.memoryUsage.heapUsed})`);
    }
    
    // Performance recommendations
    console.log('\n💡 Performance Recommendations:');
    
    const avgProcessingTime = results.reduce((sum, r) => sum + parseFloat(r.average), 0) / results.length;
    
    if (avgProcessingTime < 10) {
      console.log('   ✅ Excellent performance - all operations under 10ms');
    } else if (avgProcessingTime < 50) {
      console.log('   👍 Good performance - most operations under 50ms');
    } else {
      console.log('   ⚠️  Consider optimization for better performance');
    }
    
    const highMemoryUsage = results.filter(r => 
      parseFloat(r.memoryUsage.heapUsed) > 10
    );
    
    if (highMemoryUsage.length > 0) {
      console.log('   🔍 Some operations use significant memory - consider async processing');
    }
  }
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];
  
  switch (command) {
    case 'run':
      const benchmarks = new InspectionBenchmarks();
      await benchmarks.runCompleteSuite();
      break;
    case 'quick':
      const quickBench = new InspectionBenchmarks();
      // Run only key benchmarks
      const results = await Promise.all([
        quickBench.benchmarkBaseline(),
        quickBench.benchmarkKeywordFilter(),
        quickBench.benchmarkRegexFilter(),
        quickBench.benchmarkLargeObject()
      ]);
      
      console.log('\n📊 Quick Benchmark Results:');
      console.table(results);
      break;
    default:
      console.log('Available commands:');
      console.log('  run    - Run complete benchmark suite');
      console.log('  quick  - Run quick benchmark (key tests only)');
      break;
  }
}

export default InspectionBenchmarks;
export type { BenchmarkResult, BenchmarkSuite };
