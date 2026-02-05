/**
 * Redis Benchmark Suite
 * Comprehensive performance benchmarking for Redis operations
 */

import { RedisClient } from 'bun';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Benchmark configuration
const BENCHMARK_CONFIG = {
  WARMUP_ITERATIONS: 100,
  MEASUREMENT_ITERATIONS: 1000,
  OUTLIER_THRESHOLD: 3, // Z-score threshold for outlier removal
  CONFIDENCE_LEVEL: 0.95
};

// Statistical analysis utilities
class BenchmarkStats {
  private values: number[] = [];

  add(value: number) {
    this.values.push(value);
  }

  get summary() {
    if (this.values.length === 0) return { count: 0, mean: 0, median: 0, p95: 0, p99: 0, stdDev: 0, min: 0, max: 0 };

    const sorted = [...this.values].sort((a, b) => a - b);
    const mean = this.values.reduce((a, b) => a + b, 0) / this.values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    const variance = this.values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / this.values.length;
    const stdDev = Math.sqrt(variance);

    return {
      count: this.values.length,
      mean,
      median,
      p95,
      p99,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }

  // Remove outliers using Z-score method
  removeOutliers() {
    if (this.values.length < 3) return;

    const mean = this.values.reduce((a, b) => a + b, 0) / this.values.length;
    const stdDev = Math.sqrt(
      this.values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / this.values.length
    );

    this.values = this.values.filter(val => {
      const zScore = Math.abs((val - mean) / stdDev);
      return zScore <= BENCHMARK_CONFIG.OUTLIER_THRESHOLD;
    });
  }
}

// Performance tier classification
enum PerformanceTier {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  ACCEPTABLE = 'ACCEPTABLE',
  POOR = 'POOR'
}

interface BenchmarkResult {
  name: string;
  stats: {
    count: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
    stdDev: number;
    min: number;
    max: number;
  };
  tier: PerformanceTier;
  target: number;
  achieved: boolean;
}

// Redis benchmark suite
export class RedisBenchmarkSuite {
  private client: RedisClient;
  private connected = false;

  constructor(url: string = REDIS_URL) {
    this.client = new RedisClient(url, {
      enableAutoPipelining: true,
      maxRetries: 3,
      connectionTimeout: 5000
    });
  }

  async connect() {
    try {
      await this.client.connect();
      this.connected = true;
      console.log('✅ Connected to Redis for benchmarking');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connected) {
      this.client.close();
      this.connected = false;
      console.log('✅ Disconnected from Redis');
    }
  }

  private async cleanupTestKeys() {
    try {
      const keys = await this.client.send('KEYS', ['bench:*']);
      if (keys && keys.length > 0) {
        await this.client.send('DEL', keys);
      }
    } catch (error) {
      console.warn('⚠️  Failed to cleanup benchmark keys:', error);
    }
  }

  private classifyPerformance(actual: number, target: number): PerformanceTier {
    const ratio = actual / target;
    if (ratio <= 0.8) return PerformanceTier.EXCELLENT;
    if (ratio <= 1.0) return PerformanceTier.GOOD;
    if (ratio <= 1.2) return PerformanceTier.ACCEPTABLE;
    return PerformanceTier.POOR;
  }

  private async runBenchmark(
    name: string,
    target: number,
    operation: () => Promise<void>
  ): Promise<BenchmarkResult> {
    const stats = new BenchmarkStats();

    // Warmup phase
    console.log(`🔥 Warming up: ${name}`);
    for (let i = 0; i < BENCHMARK_CONFIG.WARMUP_ITERATIONS; i++) {
      await operation();
    }

    // Force GC between phases (if available)
    if (typeof Bun !== 'undefined' && Bun.gc) {
      Bun.gc(true);
    }

    // Measurement phase
    console.log(`📊 Measuring: ${name}`);
    for (let i = 0; i < BENCHMARK_CONFIG.MEASUREMENT_ITERATIONS; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      stats.add(end - start);
    }

    // Remove outliers
    stats.removeOutliers();

    const summary = stats.summary;
    const tier = this.classifyPerformance(summary.mean, target);
    const achieved = tier !== PerformanceTier.POOR;

    return {
      name,
      stats: summary,
      tier,
      target,
      achieved
    };
  }

  async runStringBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // SET benchmark
    const setResult = await this.runBenchmark(
      'Redis SET',
      0.1, // 100μs target
      async () => {
        const key = `bench:string:set:${Math.random()}`;
        await this.client.set(key, 'benchmark-value');
      }
    );
    results.push(setResult);

    // GET benchmark
    const getResult = await this.runBenchmark(
      'Redis GET',
      0.1, // 100μs target
      async () => {
        const key = `bench:string:get:${Math.random()}`;
        await this.client.set(key, 'benchmark-value');
        await this.client.get(key);
      }
    );
    results.push(getResult);

    return results;
  }

  async runHashBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // HSET benchmark
    const hsetResult = await this.runBenchmark(
      'Redis HSET',
      0.2, // 200μs target
      async () => {
        const key = `bench:hash:hset:${Math.random()}`;
        await this.client.hset(key, 'field', 'value');
      }
    );
    results.push(hsetResult);

    // HGET benchmark
    const hgetResult = await this.runBenchmark(
      'Redis HGET',
      0.1, // 100μs target
      async () => {
        const key = `bench:hash:hget:${Math.random()}`;
        await this.client.hset(key, 'field', 'value');
        await this.client.hget(key, 'field');
      }
    );
    results.push(hgetResult);

    return results;
  }

  async runListBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // LPUSH benchmark
    const lpushResult = await this.runBenchmark(
      'Redis LPUSH',
      0.2, // 200μs target
      async () => {
        const key = `bench:list:lpush:${Math.random()}`;
        await this.client.lpush(key, 'item');
      }
    );
    results.push(lpushResult);

    return results;
  }

  async runRawCommandBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Raw SET benchmark
    const rawSetResult = await this.runBenchmark(
      'Redis Raw SET',
      0.1, // 100μs target
      async () => {
        const key = `bench:raw:set:${Math.random()}`;
        await this.client.send('SET', [key, 'value']);
      }
    );
    results.push(rawSetResult);

    return results;
  }

  async runPipeliningBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Pipelined operations benchmark
    const pipelineResult = await this.runBenchmark(
      'Redis Pipelined (10 ops)',
      1.0, // 1ms target for 10 operations
      async () => {
        const baseKey = `bench:pipeline:${Math.random()}`;

        for (let i = 0; i < 10; i++) {
          await this.client.set(`${baseKey}:${i}`, `value${i}`);
        }
      }
    );
    results.push(pipelineResult);

    return results;
  }

  async runAllBenchmarks(): Promise<BenchmarkResult[]> {
    console.log('🚀 Starting Redis Benchmark Suite');
    console.log('=' .repeat(50));

    const allResults: BenchmarkResult[] = [];

    try {
      // Connect and cleanup
      await this.connect();
      await this.cleanupTestKeys();

      // Run all benchmark categories
      console.log('\n📝 String Operations:');
      allResults.push(...await this.runStringBenchmarks());

      console.log('\n📝 Hash Operations:');
      allResults.push(...await this.runHashBenchmarks());

      console.log('\n📝 List Operations:');
      allResults.push(...await this.runListBenchmarks());

      console.log('\n📝 Raw Commands:');
      allResults.push(...await this.runRawCommandBenchmarks());

      console.log('\n📝 Pipelining:');
      allResults.push(...await this.runPipeliningBenchmarks());

      // Generate report
      this.printReport(allResults);

    } finally {
      await this.cleanupTestKeys();
      await this.disconnect();
    }

    return allResults;
  }

  private printReport(results: BenchmarkResult[]) {
    console.log('\n📊 REDIS BENCHMARK RESULTS');
    console.log('='.repeat(80));

    const passed = results.filter(r => r.achieved).length;
    const total = results.length;
    const successRate = ((passed / total) * 100).toFixed(1);

    console.log(`Overall: ${passed}/${total} benchmarks passed (${successRate}%)`);
    console.log('');

    results.forEach(result => {
      const status = result.achieved ? '✅' : '❌';
      const tier = result.tier;
      const mean = result.stats.mean.toFixed(3);
      const target = result.target.toFixed(3);
      const p95 = result.stats.p95.toFixed(3);

      console.log(`${status} ${result.name}`);
      console.log(`   Mean: ${mean}ms (Target: ${target}ms, P95: ${p95}ms) [${tier}]`);
      console.log(`   Samples: ${result.stats.count}, StdDev: ${result.stats.stdDev.toFixed(3)}ms`);
      console.log('');
    });

    // Performance tier summary
    const tiers = results.reduce((acc, r) => {
      acc[r.tier] = (acc[r.tier] || 0) + 1;
      return acc;
    }, {} as Record<PerformanceTier, number>);

    console.log('🎯 Performance Tier Summary:');
    Object.entries(tiers).forEach(([tier, count]) => {
      console.log(`   ${tier}: ${count} benchmarks`);
    });

    console.log('\n📈 Benchmark completed successfully!');
  }
}

// Export for use in benchmark runner
export async function runRedisBenchmarks() {
  const suite = new RedisBenchmarkSuite();
  return await suite.runAllBenchmarks();
}

// CLI runner
if (import.meta.main) {
  runRedisBenchmarks().catch(console.error);
}