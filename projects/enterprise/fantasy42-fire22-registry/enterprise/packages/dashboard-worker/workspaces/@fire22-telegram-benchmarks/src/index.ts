#!/usr/bin/env bun

/**
 * 🎯 Fire22 Telegram System Benchmarks
 *
 * Comprehensive performance testing for all Telegram integration components
 */

import { Bun } from 'bun';

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 📊 BENCHMARK RUNNER
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export interface BenchmarkResult {
  name: string;
  category: string;
  iterations: number;
  totalTime: number; // nanoseconds
  averageTime: number; // nanoseconds
  minTime: number;
  maxTime: number;
  throughput: number; // operations per second
  memoryUsed?: number; // bytes
}

export class BenchmarkRunner {
  private results: BenchmarkResult[] = [];
  private warmupIterations = 100;
  private testIterations = 10000;

  constructor(
    private config: {
      warmupIterations?: number;
      testIterations?: number;
      verbose?: boolean;
    } = {}
  ) {
    if (config.warmupIterations) this.warmupIterations = config.warmupIterations;
    if (config.testIterations) this.testIterations = config.testIterations;
  }

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 🎯 BENCHMARK EXECUTION
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  async benchmark(
    name: string,
    category: string,
    fn: () => void | Promise<void>,
    iterations?: number
  ): Promise<BenchmarkResult> {
    const testRuns = iterations || this.testIterations;

    // Warmup
    if (this.config.verbose) {
      console.log(`⏳ Warming up ${name}...`);
    }

    for (let i = 0; i < this.warmupIterations; i++) {
      await fn();
    }

    // Actual benchmark
    if (this.config.verbose) {
      console.log(`🎯 Benchmarking ${name} (${testRuns} iterations)...`);
    }

    const times: number[] = [];
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = Bun.nanoseconds();

    for (let i = 0; i < testRuns; i++) {
      const iterStart = Bun.nanoseconds();
      await fn();
      const iterTime = Bun.nanoseconds() - iterStart;
      times.push(iterTime);
    }

    const totalTime = Bun.nanoseconds() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = endMemory - startMemory;

    // Calculate statistics
    const averageTime = totalTime / testRuns;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = 1_000_000_000 / averageTime; // ops per second

    const result: BenchmarkResult = {
      name,
      category,
      iterations: testRuns,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      throughput,
      memoryUsed: memoryUsed > 0 ? memoryUsed : undefined,
    };

    this.results.push(result);
    return result;
  }

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 📊 REPORTING
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  formatResult(result: BenchmarkResult): string {
    const avgMs = result.averageTime / 1_000_000;
    const minMs = result.minTime / 1_000_000;
    const maxMs = result.maxTime / 1_000_000;
    const memoryMB = result.memoryUsed ? result.memoryUsed / 1_048_576 : 0;

    return `
📊 ${result.name} (${result.category})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Iterations:  ${result.iterations.toLocaleString()}
  Average:     ${avgMs.toFixed(3)} ms
  Min:         ${minMs.toFixed(3)} ms
  Max:         ${maxMs.toFixed(3)} ms
  Throughput:  ${Math.round(result.throughput).toLocaleString()} ops/sec
  Memory:      ${memoryMB > 0 ? memoryMB.toFixed(2) + ' MB' : 'N/A'}
`;
  }

  printResults(): void {
    console.log('\n🎯 BENCHMARK RESULTS\n' + '═'.repeat(50));

    // Group by category
    const categories = new Set(this.results.map(r => r.category));

    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      console.log(`\n📁 ${category.toUpperCase()}`);

      for (const result of categoryResults) {
        console.log(this.formatResult(result));
      }
    }

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n📈 SUMMARY\n' + '═'.repeat(50));

    // Find best and worst performers
    const sorted = [...this.results].sort((a, b) => a.averageTime - b.averageTime);

    if (sorted.length > 0) {
      console.log('\n🏆 Fastest:', sorted[0].name);
      console.log(`   ${(sorted[0].averageTime / 1_000_000).toFixed(3)} ms average`);

      if (sorted.length > 1) {
        const slowest = sorted[sorted.length - 1];
        console.log('\n🐌 Slowest:', slowest.name);
        console.log(`   ${(slowest.averageTime / 1_000_000).toFixed(3)} ms average`);
      }
    }

    // Total stats
    const totalTime = this.results.reduce((sum, r) => sum + r.totalTime, 0);
    const totalIterations = this.results.reduce((sum, r) => sum + r.iterations, 0);

    console.log('\n📊 Total Statistics:');
    console.log(`   Tests Run: ${this.results.length}`);
    console.log(`   Total Iterations: ${totalIterations.toLocaleString()}`);
    console.log(`   Total Time: ${(totalTime / 1_000_000_000).toFixed(2)} seconds`);
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  exportJSON(filename: string): void {
    const data = {
      timestamp: new Date().toISOString(),
      environment: {
        platform: process.platform,
        arch: process.arch,
        bunVersion: Bun.version,
        nodeVersion: process.versions.node,
      },
      config: {
        warmupIterations: this.warmupIterations,
        testIterations: this.testIterations,
      },
      results: this.results,
    };

    Bun.write(filename, JSON.stringify(data, null, 2));
    console.log(`\n💾 Results exported to ${filename}`);
  }
}

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🚀 MAIN BENCHMARK SUITE
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

if (import.meta.main) {
  const runner = new BenchmarkRunner({ verbose: true });

  console.log(`
🔥📊 Fire22 Telegram System Benchmark Suite
════════════════════════════════════════════
Platform: ${process.platform}
Arch: ${process.arch}
Bun Version: ${Bun.version}
Date: ${new Date().toISOString()}
════════════════════════════════════════════
`);

  // Import and run all benchmarks
  const benchmarks = [
    './telegram-performance',
    './queue-matching-performance',
    './language-translation-performance',
    './workflow-orchestration-performance',
    './dashboard-sse-performance',
  ];

  for (const benchmark of benchmarks) {
    try {
      const module = await import(benchmark);
      if (module.runBenchmarks) {
        await module.runBenchmarks(runner);
      }
    } catch (error) {
      console.error(`❌ Failed to run ${benchmark}:`, error);
    }
  }

  // Print results
  runner.printResults();

  // Export results
  runner.exportJSON('benchmark-results.json');
}

export default BenchmarkRunner;
