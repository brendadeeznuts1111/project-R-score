/**
 * Bun-Native High-Precision Benchmarking Utility
 * 
 * Ultra-fast benchmarking with nanosecond precision using Bun.nanoseconds
 * 
 * @author DuoPlus Automation Suite
 * @version 1.0.0
 */

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  opsPerSecond: number;
  minMs?: number;
  maxMs?: number;
  p95Ms?: number;
  p99Ms?: number;
}

export interface ComparisonResult {
  winner: string;
  speedup: number;
  results: BenchmarkResult[];
  faster: BenchmarkResult;
  slower: BenchmarkResult;
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  totalTime: number;
  summary: {
    totalOps: number;
    fastestAvg: number;
    slowestAvg: number;
    averageOpsPerSecond: number;
  };
}

export class BunPerfBenchmark {
  /**
   * Benchmark function with nanosecond precision
   */
  static benchmark(name: string, fn: () => void, iterations: number = 1000): BenchmarkResult {
    const times: number[] = [];
    
    // Warm up
    for (let i = 0; i < Math.min(100, iterations / 10); i++) {
      fn();
    }
    
    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = Bun.nanoseconds();
      fn();
      const end = Bun.nanoseconds();
      times.push((end - start) / 1_000_000); // Convert to milliseconds
    }
    
    const totalMs = times.reduce((sum, time) => sum + time, 0);
    const avgMs = totalMs / iterations;
    const opsPerSecond = Math.floor(1000 / avgMs);
    
    // Calculate statistics
    times.sort((a, b) => a - b);
    const minMs = times[0];
    const maxMs = times[times.length - 1];
    const p95Ms = times[Math.floor(times.length * 0.95)];
    const p99Ms = times[Math.floor(times.length * 0.99)];
    
    return {
      name,
      iterations,
      totalMs,
      avgMs,
      opsPerSecond,
      minMs,
      maxMs,
      p95Ms,
      p99Ms
    };
  }

  /**
   * Benchmark async function
   */
  static async benchmarkAsync(name: string, fn: () => Promise<void>, iterations: number = 100): Promise<BenchmarkResult> {
    const times: number[] = [];
    
    // Warm up
    for (let i = 0; i < Math.min(10, iterations / 10); i++) {
      await fn();
    }
    
    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = Bun.nanoseconds();
      await fn();
      const end = Bun.nanoseconds();
      times.push((end - start) / 1_000_000); // Convert to milliseconds
    }
    
    const totalMs = times.reduce((sum, time) => sum + time, 0);
    const avgMs = totalMs / iterations;
    const opsPerSecond = Math.floor(1000 / avgMs);
    
    // Calculate statistics
    times.sort((a, b) => a - b);
    const minMs = times[0];
    const maxMs = times[times.length - 1];
    const p95Ms = times[Math.floor(times.length * 0.95)];
    const p99Ms = times[Math.floor(times.length * 0.99)];
    
    return {
      name,
      iterations,
      totalMs,
      avgMs,
      opsPerSecond,
      minMs,
      maxMs,
      p95Ms,
      p99Ms
    };
  }

  /**
   * Compare two implementations
   */
  static compare(nameA: string, fnA: () => void, nameB: string, fnB: () => void, iterations: number = 1000): ComparisonResult {
    const resultA = this.benchmark(nameA, fnA, iterations);
    const resultB = this.benchmark(nameB, fnB, iterations);
    
    const faster = resultA.avgMs < resultB.avgMs ? resultA : resultB;
    const slower = resultA.avgMs < resultB.avgMs ? resultB : resultA;
    const speedup = parseFloat((slower.avgMs / faster.avgMs).toFixed(2));
    
    return {
      winner: faster.name,
      speedup,
      results: [resultA, resultB],
      faster,
      slower
    };
  }

  /**
   * Compare async implementations
   */
  static async compareAsync(nameA: string, fnA: () => Promise<void>, nameB: string, fnB: () => Promise<void>, iterations: number = 100): Promise<ComparisonResult> {
    const resultA = await this.benchmarkAsync(nameA, fnA, iterations);
    const resultB = await this.benchmarkAsync(nameB, fnB, iterations);
    
    const faster = resultA.avgMs < resultB.avgMs ? resultA : resultB;
    const slower = resultA.avgMs < resultB.avgMs ? resultB : resultA;
    const speedup = parseFloat((slower.avgMs / faster.avgMs).toFixed(2));
    
    return {
      winner: faster.name,
      speedup,
      results: [resultA, resultB],
      faster,
      slower
    };
  }

  /**
   * Run benchmark suite
   */
  static runSuite(name: string, benchmarks: Array<{ name: string; fn: () => void; iterations?: number }>): BenchmarkSuite {
    const startTime = Bun.nanoseconds();
    const results: BenchmarkResult[] = [];
    
    for (const benchmark of benchmarks) {
      const result = this.benchmark(benchmark.name, benchmark.fn, benchmark.iterations || 1000);
      results.push(result);
    }
    
    const endTime = Bun.nanoseconds();
    const totalTime = (endTime - startTime) / 1_000_000;
    
    const totalOps = results.reduce((sum, r) => sum + r.opsPerSecond, 0);
    const avgOps = results.reduce((sum, r) => sum + r.avgMs, 0) / results.length;
    const fastestAvg = Math.min(...results.map(r => r.avgMs));
    const slowestAvg = Math.max(...results.map(r => r.avgMs));
    const averageOpsPerSecond = Math.floor(totalOps / results.length);
    
    return {
      name,
      results,
      totalTime,
      summary: {
        totalOps,
        fastestAvg,
        slowestAvg,
        averageOpsPerSecond
      }
    };
  }

  /**
   * Run async benchmark suite
   */
  static async runSuiteAsync(name: string, benchmarks: Array<{ name: string; fn: () => Promise<void>; iterations?: number }>): Promise<BenchmarkSuite> {
    const startTime = Bun.nanoseconds();
    const results: BenchmarkResult[] = [];
    
    for (const benchmark of benchmarks) {
      const result = await this.benchmarkAsync(benchmark.name, benchmark.fn, benchmark.iterations || 100);
      results.push(result);
    }
    
    const endTime = Bun.nanoseconds();
    const totalTime = (endTime - startTime) / 1_000_000;
    
    const totalOps = results.reduce((sum, r) => sum + r.opsPerSecond, 0);
    const avgOps = results.reduce((sum, r) => sum + r.avgMs, 0) / results.length;
    const fastestAvg = Math.min(...results.map(r => r.avgMs));
    const slowestAvg = Math.max(...results.map(r => r.avgMs));
    const averageOpsPerSecond = Math.floor(totalOps / results.length);
    
    return {
      name,
      results,
      totalTime,
      summary: {
        totalOps,
        fastestAvg,
        slowestAvg,
        averageOpsPerSecond
      }
    };
  }

  /**
   * Format benchmark result for display
   */
  static formatResult(result: BenchmarkResult): string {
    const lines: string[] = [];
    lines.push(`=== ${result.name} ===`);
    lines.push(`Iterations: ${result.iterations.toLocaleString()}`);
    lines.push(`Total Time: ${result.totalMs.toFixed(2)}ms`);
    lines.push(`Average: ${result.avgMs.toFixed(4)}ms`);
    lines.push(`Ops/sec: ${result.opsPerSecond.toLocaleString()}`);
    
    if (result.minMs !== undefined && result.maxMs !== undefined) {
      lines.push(`Range: ${result.minMs.toFixed(4)}ms - ${result.maxMs.toFixed(4)}ms`);
    }
    if (result.p95Ms !== undefined) {
      lines.push(`P95: ${result.p95Ms.toFixed(4)}ms`);
    }
    if (result.p99Ms !== undefined) {
      lines.push(`P99: ${result.p99Ms.toFixed(4)}ms`);
    }
    
    return lines.join('\n');
  }

  /**
   * Format comparison result for display
   */
  static formatComparison(result: ComparisonResult): string {
    const lines: string[] = [];
    lines.push('=== Benchmark Comparison ===');
    lines.push(`🏆 Winner: ${result.winner} (${result.speedup}x faster)`);
    lines.push('');
    
    for (const benchmarkResult of result.results) {
      lines.push(`${benchmarkResult.name}:`);
      lines.push(`  ${benchmarkResult.opsPerSecond.toLocaleString()} ops/sec`);
      lines.push(`  ${benchmarkResult.avgMs.toFixed(4)}ms avg`);
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Format suite result for display
   */
  static formatSuite(suite: BenchmarkSuite): string {
    const lines: string[] = [];
    lines.push(`=== ${suite.name} Suite ===`);
    lines.push(`Total Suite Time: ${suite.totalTime.toFixed(2)}ms`);
    lines.push(`Average Ops/sec: ${suite.summary.averageOpsPerSecond.toLocaleString()}`);
    lines.push(`Fastest: ${suite.summary.fastestAvg.toFixed(4)}ms avg`);
    lines.push(`Slowest: ${suite.summary.slowestAvg.toFixed(4)}ms avg`);
    lines.push('');
    
    // Sort by ops/sec descending
    const sortedResults = [...suite.results].sort((a, b) => b.opsPerSecond - a.opsPerSecond);
    
    for (const result of sortedResults) {
      lines.push(`${result.name}:`);
      lines.push(`  ${result.opsPerSecond.toLocaleString()} ops/sec`);
      lines.push(`  ${result.avgMs.toFixed(4)}ms avg`);
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Generate benchmark report in JSON format
   */
  static generateReport(suite: BenchmarkSuite): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      suite: suite.name,
      totalTime: suite.totalTime,
      summary: suite.summary,
      results: suite.results
    }, null, 2);
  }

  /**
   * Memory usage benchmark
   */
  static benchmarkMemory(name: string, fn: () => any, iterations: number = 100): BenchmarkResult & { memoryUsage: number } {
    const memBefore = process.memoryUsage().heapUsed;
    const result = this.benchmark(name, fn, iterations);
    const memAfter = process.memoryUsage().heapUsed;
    
    return {
      ...result,
      memoryUsage: memAfter - memBefore
    };
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'compare' && args.length >= 5) {
    // Compare two functions
    const nameA = args[1];
    const nameB = args[3];
    
    // Simple example functions
    const result = BunPerfBenchmark.compare(
      nameA,
      () => Math.random() * 1000,
      nameB,
      () => Math.random() * 1000 + Math.random(),
      parseInt(args[4]) || 1000
    );
    
    console.log(BunPerfBenchmark.formatComparison(result));
  } else if (args[0] === 'sms') {
    // SMS extraction benchmark
    const result = BunPerfBenchmark.benchmark(
      'sms-extract',
      () => Math.random().toString().substring(2, 8),
      parseInt(args[1]) || 10000
    );
    
    console.log(BunPerfBenchmark.formatResult(result));
  } else if (args[0] === 'suite') {
    // Run example suite
    const suite = BunPerfBenchmark.runSuite('Example Suite', [
      { name: 'math-random', fn: () => Math.random() },
      { name: 'date-now', fn: () => Date.now() },
      { name: 'string-concat', fn: () => 'hello' + 'world' },
      { name: 'array-push', fn: () => { const arr = []; arr.push(1); } }
    ]);
    
    console.log(BunPerfBenchmark.formatSuite(suite));
  } else {
    console.log('Usage:');
    console.log('  bun benchmark.ts compare <nameA> <nameB> [iterations]');
    console.log('  bun benchmark.ts sms [iterations]');
    console.log('  bun benchmark.ts suite');
  }
}
