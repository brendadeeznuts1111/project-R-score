#!/usr/bin/env bun

/**
 * 🚀 Fire22 Comprehensive Benchmarking Suite
 *
 * High-precision performance testing using Bun's native APIs
 * - Bun.nanoseconds() for nanosecond precision
 * - performance.now() for millisecond measurements
 * - Bun Shell integration for system benchmarks
 */

import { $ } from 'bun';

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: bigint; // nanoseconds
  avgTime: number; // nanoseconds
  minTime: bigint;
  maxTime: bigint;
  opsPerSecond: number;
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  metadata?: Record<string, any>;
}

interface BenchmarkOptions {
  iterations?: number;
  warmup?: number;
  timeout?: number;
  async?: boolean;
}

export class BenchmarkSuite {
  private results: BenchmarkResult[] = [];
  private currentSuite: string = 'default';

  constructor(private suiteName: string = 'Fire22 Benchmarks') {}

  /**
   * Run a benchmark with nanosecond precision
   */
  async benchmark(
    name: string,
    fn: () => void | Promise<void>,
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkResult> {
    const { iterations = 10000, warmup = 100, timeout = 30000, async = false } = options;

    console.info(`\n📊 Benchmarking: ${name}`);
    console.info(`   Iterations: ${iterations.toLocaleString()}`);
    console.info(`   Warmup: ${warmup.toLocaleString()}`);

    // Warmup phase
    if (warmup > 0) {
      process.stdout.write('   Warming up...');
      for (let i = 0; i < warmup; i++) {
        if (async) {
          await fn();
        } else {
          fn();
        }
      }
      console.info(' ✅');
    }

    // Collect timing samples
    const timings: bigint[] = [];
    const startTotal = Bun.nanoseconds();

    process.stdout.write('   Running benchmark...');

    for (let i = 0; i < iterations; i++) {
      const start = Bun.nanoseconds();

      if (async) {
        await fn();
      } else {
        fn();
      }

      const end = Bun.nanoseconds();
      timings.push(end - start);

      // Show progress for long-running benchmarks
      if (i % Math.floor(iterations / 10) === 0) {
        process.stdout.write('.');
      }
    }

    const endTotal = Bun.nanoseconds();
    console.info(' ✅');

    // Calculate statistics
    const totalTime = endTotal - startTotal;
    const sortedTimings = [...timings].sort((a, b) => Number(a - b));

    const result: BenchmarkResult = {
      name,
      iterations,
      totalTime,
      avgTime: Number(totalTime) / iterations,
      minTime: sortedTimings[0],
      maxTime: sortedTimings[sortedTimings.length - 1],
      opsPerSecond: Math.floor(1_000_000_000 / (Number(totalTime) / iterations)),
      percentiles: {
        p50: Number(sortedTimings[Math.floor(iterations * 0.5)]),
        p90: Number(sortedTimings[Math.floor(iterations * 0.9)]),
        p95: Number(sortedTimings[Math.floor(iterations * 0.95)]),
        p99: Number(sortedTimings[Math.floor(iterations * 0.99)]),
      },
    };

    this.results.push(result);
    this.printResult(result);

    return result;
  }

  /**
   * Compare two implementations
   */
  async compare(
    name: string,
    implementations: Record<string, () => void | Promise<void>>,
    options: BenchmarkOptions = {}
  ): Promise<void> {
    console.info(`\n⚔️  Comparison: ${name}`);
    console.info('='.repeat(50));

    const results: BenchmarkResult[] = [];

    for (const [implName, fn] of Object.entries(implementations)) {
      const result = await this.benchmark(`${name} - ${implName}`, fn, options);
      results.push(result);
    }

    // Find the fastest implementation
    const fastest = results.reduce((prev, current) =>
      prev.avgTime < current.avgTime ? prev : current
    );

    console.info('\n📊 Comparison Results:');
    results.forEach(result => {
      const ratio = result.avgTime / fastest.avgTime;
      const status = result === fastest ? '🏆 FASTEST' : `${ratio.toFixed(2)}x slower`;
      console.info(`   ${result.name}: ${status}`);
    });
  }

  /**
   * Benchmark Bun Shell commands
   */
  async benchmarkShell(
    name: string,
    command: string,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    return this.benchmark(
      name,
      async () => {
        await $`${command}`.quiet();
      },
      { iterations, async: true }
    );
  }

  /**
   * Benchmark file operations
   */
  async benchmarkFileOps(): Promise<void> {
    console.info('\n📁 File Operations Benchmarks');
    console.info('='.repeat(50));

    const testFile = '/tmp/benchmark-test.txt';
    const testData = 'A'.repeat(1024 * 10); // 10KB

    await this.compare(
      'File Write',
      {
        'Bun.write': async () => {
          await Bun.write(testFile, testData);
        },
        'Bun.file': async () => {
          const file = Bun.file(testFile);
          await Bun.write(file, testData);
        },
      },
      { iterations: 1000, async: true }
    );

    await this.compare(
      'File Read',
      {
        'Bun.file.text()': async () => {
          await Bun.file(testFile).text();
        },
        'Bun.file.stream()': async () => {
          const stream = Bun.file(testFile).stream();
          for await (const chunk of stream) {
            // Process chunk
          }
        },
      },
      { iterations: 1000, async: true }
    );

    // Cleanup
    await $`rm -f ${testFile}`.quiet();
  }

  /**
   * Benchmark HTTP operations
   */
  async benchmarkHttp(): Promise<void> {
    console.info('\n🌐 HTTP Operations Benchmarks');
    console.info('='.repeat(50));

    // Start a test server
    const server = Bun.serve({
      port: 0,
      fetch() {
        return new Response('Hello, Benchmark!');
      },
    });

    const url = `http://localhost:${server.port}`;

    await this.benchmark(
      'HTTP GET Request',
      async () => {
        await fetch(url);
      },
      { iterations: 1000, async: true }
    );

    await this.benchmark(
      'HTTP POST Request',
      async () => {
        await fetch(url, {
          method: 'POST',
          body: JSON.stringify({ test: 'data' }),
        });
      },
      { iterations: 1000, async: true }
    );

    server.stop();
  }

  /**
   * Benchmark JSON operations
   */
  async benchmarkJson(): Promise<void> {
    console.info('\n📋 JSON Operations Benchmarks');
    console.info('='.repeat(50));

    const smallObject = { id: 1, name: 'test', active: true };
    const largeObject = {
      users: Array(1000)
        .fill(null)
        .map((_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          metadata: { created: Date.now(), tags: ['tag1', 'tag2'] },
        })),
    };

    await this.compare(
      'JSON.stringify',
      {
        'Small Object': () => JSON.stringify(smallObject),
        'Large Object': () => JSON.stringify(largeObject),
      },
      { iterations: 10000 }
    );

    const smallJson = JSON.stringify(smallObject);
    const largeJson = JSON.stringify(largeObject);

    await this.compare(
      'JSON.parse',
      {
        'Small JSON': () => JSON.parse(smallJson),
        'Large JSON': () => JSON.parse(largeJson),
      },
      { iterations: 10000 }
    );
  }

  /**
   * Benchmark crypto operations
   */
  async benchmarkCrypto(): Promise<void> {
    console.info('\n🔐 Crypto Operations Benchmarks');
    console.info('='.repeat(50));

    const data = 'The quick brown fox jumps over the lazy dog';
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);

    await this.benchmark(
      'SHA-256 Hash',
      async () => {
        const hasher = new Bun.CryptoHasher('sha256');
        hasher.update(data);
        hasher.digest();
      },
      { iterations: 10000, async: false }
    );

    await this.benchmark(
      'Base64 Encode',
      () => {
        Buffer.from(data).toString('base64');
      },
      { iterations: 100000 }
    );

    await this.benchmark(
      'Random UUID',
      () => {
        crypto.randomUUID();
      },
      { iterations: 100000 }
    );
  }

  /**
   * Benchmark array operations
   */
  async benchmarkArrays(): Promise<void> {
    console.info('\n📊 Array Operations Benchmarks');
    console.info('='.repeat(50));

    const smallArray = Array(100)
      .fill(null)
      .map((_, i) => i);
    const largeArray = Array(10000)
      .fill(null)
      .map((_, i) => i);

    await this.compare(
      'Array.map',
      {
        'Small Array (100)': () => smallArray.map(x => x * 2),
        'Large Array (10k)': () => largeArray.map(x => x * 2),
      },
      { iterations: 10000 }
    );

    await this.compare(
      'Array.filter',
      {
        'Small Array (100)': () => smallArray.filter(x => x % 2 === 0),
        'Large Array (10k)': () => largeArray.filter(x => x % 2 === 0),
      },
      { iterations: 10000 }
    );

    await this.compare(
      'Array.reduce',
      {
        'Small Array (100)': () => smallArray.reduce((sum, x) => sum + x, 0),
        'Large Array (10k)': () => largeArray.reduce((sum, x) => sum + x, 0),
      },
      { iterations: 10000 }
    );
  }

  /**
   * Print formatted result
   */
  private printResult(result: BenchmarkResult): void {
    console.info(`\n   ✅ Results for: ${result.name}`);
    console.info(`      Average: ${this.formatNanoseconds(result.avgTime)}`);
    console.info(`      Min: ${this.formatNanoseconds(Number(result.minTime))}`);
    console.info(`      Max: ${this.formatNanoseconds(Number(result.maxTime))}`);
    console.info(`      Ops/sec: ${result.opsPerSecond.toLocaleString()}`);
    console.info(`      Percentiles:`);
    console.info(`        P50: ${this.formatNanoseconds(result.percentiles.p50)}`);
    console.info(`        P90: ${this.formatNanoseconds(result.percentiles.p90)}`);
    console.info(`        P95: ${this.formatNanoseconds(result.percentiles.p95)}`);
    console.info(`        P99: ${this.formatNanoseconds(result.percentiles.p99)}`);
  }

  /**
   * Format nanoseconds to human-readable format
   */
  private formatNanoseconds(ns: number): string {
    if (ns < 1000) return `${ns.toFixed(2)}ns`;
    if (ns < 1_000_000) return `${(ns / 1000).toFixed(2)}μs`;
    if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`;
    return `${(ns / 1_000_000_000).toFixed(2)}s`;
  }

  /**
   * Generate summary report
   */
  generateReport(): string {
    const report: string[] = [
      `# Benchmark Report: ${this.suiteName}`,
      `Generated: ${new Date().toISOString()}`,
      `Platform: ${process.platform} ${process.arch}`,
      `Bun Version: ${process.versions.bun}`,
      '',
      '## Results',
      '',
    ];

    this.results.forEach(result => {
      report.push(`### ${result.name}`);
      report.push(`- **Iterations:** ${result.iterations.toLocaleString()}`);
      report.push(`- **Average:** ${this.formatNanoseconds(result.avgTime)}`);
      report.push(
        `- **Min/Max:** ${this.formatNanoseconds(Number(result.minTime))} / ${this.formatNanoseconds(Number(result.maxTime))}`
      );
      report.push(`- **Ops/sec:** ${result.opsPerSecond.toLocaleString()}`);
      report.push(
        `- **P50/P95/P99:** ${this.formatNanoseconds(result.percentiles.p50)} / ${this.formatNanoseconds(result.percentiles.p95)} / ${this.formatNanoseconds(result.percentiles.p99)}`
      );
      report.push('');
    });

    return report.join('\n');
  }

  /**
   * Export results as JSON
   */
  exportJson(): string {
    return JSON.stringify(
      {
        suite: this.suiteName,
        timestamp: new Date().toISOString(),
        platform: {
          os: process.platform,
          arch: process.arch,
          bun: process.versions.bun,
        },
        results: this.results.map(r => ({
          ...r,
          totalTime: r.totalTime.toString(),
          minTime: r.minTime.toString(),
          maxTime: r.maxTime.toString(),
        })),
      },
      null,
      2
    );
  }

  /**
   * Run all benchmarks
   */
  async runAll(): Promise<void> {
    console.info(`🚀 ${this.suiteName}`);
    console.info('='.repeat(50));
    console.info(`Started at: ${new Date().toISOString()}`);

    await this.benchmarkFileOps();
    await this.benchmarkJson();
    await this.benchmarkCrypto();
    await this.benchmarkArrays();
    await this.benchmarkHttp();

    console.info('\n' + '='.repeat(50));
    console.info('✅ All benchmarks completed!');
    console.info(`Total benchmarks run: ${this.results.length}`);
  }
}

// Run benchmarks if executed directly
if (import.meta.main) {
  const suite = new BenchmarkSuite('Fire22 Performance Suite');

  await suite.runAll();

  // Save report
  const report = suite.generateReport();
  await Bun.write('benchmark-report.md', report);

  const json = suite.exportJson();
  await Bun.write('benchmark-results.json', json);

  console.info('\n📊 Reports saved:');
  console.info('   - benchmark-report.md');
  console.info('   - benchmark-results.json');
}

export default BenchmarkSuite;
