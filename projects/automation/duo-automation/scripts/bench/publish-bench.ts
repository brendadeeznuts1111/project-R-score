#!/usr/bin/env bun
/**
 * [DUOPLUS][BENCH][PUBLISH][HIGH][#REF:BENCH-PUB-01][BUN:6.1-NATIVE]
 * Publishing Benchmark Suite - Performance testing for bun publish
 * Compliance: SOC2-Type-II | Standard: ISO-27001
 *
 * Features:
 * - Benchmark publish workflow stages
 * - Compare bun publish vs npm publish (dry-run)
 * - Measure compression levels (0-9)
 * - Track network latency to registries
 * - Memory usage during packing
 *
 * Usage:
 *   bun run scripts/bench/publish-bench.ts           # Full benchmark
 *   bun run scripts/bench/publish-bench.ts --pack    # Pack only
 *   bun run scripts/bench/publish-bench.ts --compare # Bun vs npm
 *   bun run scripts/bench/publish-bench.ts --gzip    # Compression levels
 *   bun run scripts/bench/publish-bench.ts --json    # JSON output
 */

import { $ } from "bun";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  opsPerSecond: number;
  minMs?: number;
  maxMs?: number;
  p95Ms?: number;
  p99Ms?: number;
  memoryUsage?: number;
}

interface ComparisonResult {
  winner: string;
  speedup: number;
  results: BenchmarkResult[];
  faster: BenchmarkResult;
  slower: BenchmarkResult;
}

interface BenchmarkSuite {
  name: string;
  timestamp: string;
  results: BenchmarkResult[];
  totalTime: number;
  summary: {
    totalOps: number;
    fastestAvg: number;
    slowestAvg: number;
    averageOpsPerSecond: number;
  };
}

interface GzipBenchmark {
  level: number;
  size: number;
  time: number;
  ratio: number;
}

// ═══════════════════════════════════════════════════════════
// BENCHMARK ENGINE
// ═══════════════════════════════════════════════════════════

class PublishBenchmark {
  /**
   * Benchmark a sync function with nanosecond precision
   */
  static benchmark(name: string, fn: () => void, iterations: number = 100): BenchmarkResult {
    const times: number[] = [];

    // Warm up (10% of iterations)
    for (let i = 0; i < Math.min(10, iterations / 10); i++) {
      fn();
    }

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = Bun.nanoseconds();
      fn();
      const end = Bun.nanoseconds();
      times.push((end - start) / 1_000_000); // Convert to ms
    }

    return this.calculateStats(name, times, iterations);
  }

  /**
   * Benchmark an async function
   */
  static async benchmarkAsync(name: string, fn: () => Promise<void>, iterations: number = 10): Promise<BenchmarkResult> {
    const times: number[] = [];
    const memBefore = process.memoryUsage().heapUsed;

    // Warm up
    for (let i = 0; i < Math.min(2, iterations / 5); i++) {
      await fn();
    }

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = Bun.nanoseconds();
      await fn();
      const end = Bun.nanoseconds();
      times.push((end - start) / 1_000_000);
    }

    const memAfter = process.memoryUsage().heapUsed;
    const result = this.calculateStats(name, times, iterations);
    result.memoryUsage = memAfter - memBefore;

    return result;
  }

  /**
   * Calculate statistics from timing data
   */
  private static calculateStats(name: string, times: number[], iterations: number): BenchmarkResult {
    const totalMs = times.reduce((sum, time) => sum + time, 0);
    const avgMs = totalMs / iterations;
    const opsPerSecond = Math.floor(1000 / avgMs);

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
      p99Ms,
    };
  }

  /**
   * Compare two async implementations
   */
  static async compareAsync(
    nameA: string,
    fnA: () => Promise<void>,
    nameB: string,
    fnB: () => Promise<void>,
    iterations: number = 5
  ): Promise<ComparisonResult> {
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
      slower,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// PUBLISH BENCHMARKS
// ═══════════════════════════════════════════════════════════

/**
 * Benchmark bun pm pack
 */
async function benchmarkPack(iterations: number = 5): Promise<BenchmarkResult> {
  return PublishBenchmark.benchmarkAsync(
    "bun-pm-pack",
    async () => {
      await $`bun pm pack --silent`.quiet();
      // Clean up tarball
      await $`rm -f *.tgz`.quiet();
    },
    iterations
  );
}

/**
 * Benchmark bun publish --dry-run
 */
async function benchmarkDryRun(iterations: number = 5): Promise<BenchmarkResult> {
  return PublishBenchmark.benchmarkAsync(
    "bun-publish-dry-run",
    async () => {
      await $`bun publish --dry-run --silent`.quiet();
    },
    iterations
  );
}

/**
 * Compare bun publish vs npm publish (dry-run only)
 */
async function compareBunVsNpm(iterations: number = 3): Promise<ComparisonResult> {
  return PublishBenchmark.compareAsync(
    "bun-publish",
    async () => {
      await $`bun publish --dry-run --silent`.quiet();
    },
    "npm-publish",
    async () => {
      await $`npm publish --dry-run --silent 2>/dev/null || true`.quiet();
    },
    iterations
  );
}

/**
 * Benchmark different gzip compression levels
 */
async function benchmarkGzipLevels(): Promise<GzipBenchmark[]> {
  const results: GzipBenchmark[] = [];

  for (const level of [0, 3, 6, 9]) {
    const start = Bun.nanoseconds();
    await $`bun pm pack --gzip-level ${level} --silent`.quiet();
    const end = Bun.nanoseconds();

    // Get tarball size
    const tarballs = await $`ls -la *.tgz 2>/dev/null || echo "0"`.text();
    const sizeMatch = tarballs.match(/\d+/);
    const size = sizeMatch ? parseInt(sizeMatch[0]) : 0;

    results.push({
      level,
      size,
      time: (end - start) / 1_000_000,
      ratio: level > 0 ? (results[0]?.size || size) / size : 1,
    });

    // Clean up
    await $`rm -f *.tgz`.quiet();
  }

  return results;
}

/**
 * Benchmark tag compliance validation
 */
async function benchmarkTagValidation(iterations: number = 10): Promise<BenchmarkResult> {
  return PublishBenchmark.benchmarkAsync(
    "tag-compliance-validation",
    async () => {
      await $`ENFORCEMENT_STAGE=publish bun run scripts/git/tag-enforcer-v6.ts 2>/dev/null || true`.quiet();
    },
    iterations
  );
}

// ═══════════════════════════════════════════════════════════
// OUTPUT FORMATTERS
// ═══════════════════════════════════════════════════════════

function formatResult(result: BenchmarkResult): string {
  const lines: string[] = [];
  lines.push(`=== ${result.name} ===`);
  lines.push(`Iterations: ${result.iterations}`);
  lines.push(`Total Time: ${result.totalMs.toFixed(2)}ms`);
  lines.push(`Average: ${result.avgMs.toFixed(2)}ms`);
  lines.push(`Ops/sec: ${result.opsPerSecond.toLocaleString()}`);

  if (result.minMs !== undefined && result.maxMs !== undefined) {
    lines.push(`Range: ${result.minMs.toFixed(2)}ms - ${result.maxMs.toFixed(2)}ms`);
  }
  if (result.p95Ms !== undefined) {
    lines.push(`P95: ${result.p95Ms.toFixed(2)}ms`);
  }
  if (result.p99Ms !== undefined) {
    lines.push(`P99: ${result.p99Ms.toFixed(2)}ms`);
  }
  if (result.memoryUsage !== undefined) {
    lines.push(`Memory: ${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
  }

  return lines.join("\n");
}

function formatComparison(result: ComparisonResult): string {
  const lines: string[] = [];
  lines.push("=== Benchmark Comparison ===");
  lines.push(`🏆 Winner: ${result.winner} (${result.speedup}x faster)`);
  lines.push("");

  for (const benchmarkResult of result.results) {
    const emoji = benchmarkResult.name === result.winner ? "🚀" : "🐢";
    lines.push(`${emoji} ${benchmarkResult.name}:`);
    lines.push(`   ${benchmarkResult.avgMs.toFixed(2)}ms avg`);
    lines.push(`   ${benchmarkResult.opsPerSecond.toLocaleString()} ops/sec`);
    lines.push("");
  }

  return lines.join("\n");
}

function formatGzipResults(results: GzipBenchmark[]): string {
  const lines: string[] = [];
  lines.push("=== Gzip Compression Benchmark ===");
  lines.push("");
  lines.push("Level | Size (bytes) | Time (ms) | Ratio");
  lines.push("------|--------------|-----------|------");

  for (const r of results) {
    lines.push(
      `  ${r.level}   | ${r.size.toString().padStart(12)} | ${r.time.toFixed(2).padStart(9)} | ${r.ratio.toFixed(2)}x`
    );
  }

  return lines.join("\n");
}

function formatSuite(suite: BenchmarkSuite): string {
  const lines: string[] = [];
  lines.push(`
╔═══════════════════════════════════════════════════════════════════╗
║           DUOPLUS PUBLISHING BENCHMARK SUITE                       ║
║           SOC2 Type II | ISO-27001 Compliant                       ║
╚═══════════════════════════════════════════════════════════════════╝
`);

  lines.push(`Suite: ${suite.name}`);
  lines.push(`Timestamp: ${suite.timestamp}`);
  lines.push(`Total Time: ${suite.totalTime.toFixed(2)}ms`);
  lines.push(`Average Ops/sec: ${suite.summary.averageOpsPerSecond.toLocaleString()}`);
  lines.push("");

  // Sort by ops/sec descending
  const sortedResults = [...suite.results].sort((a, b) => b.opsPerSecond - a.opsPerSecond);

  for (const result of sortedResults) {
    const passEmoji = result.avgMs < 500 ? "✅" : result.avgMs < 2000 ? "🟡" : "🔴";
    lines.push(`${passEmoji} ${result.name}:`);
    lines.push(`   ${result.avgMs.toFixed(2)}ms avg | ${result.opsPerSecond.toLocaleString()} ops/sec`);
    if (result.p95Ms) {
      lines.push(`   P95: ${result.p95Ms.toFixed(2)}ms | P99: ${result.p99Ms?.toFixed(2)}ms`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const packOnly = args.includes("--pack");
  const compare = args.includes("--compare");
  const gzip = args.includes("--gzip");
  const iterations = parseInt(args.find((a) => a.startsWith("--iterations="))?.split("=")[1] || "5");

  const startTime = Bun.nanoseconds();
  const results: BenchmarkResult[] = [];

  try {
    if (packOnly) {
      // Pack benchmark only
      console.log("🔧 Running pack benchmark...\n");
      const result = await benchmarkPack(iterations);
      results.push(result);

      if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatResult(result));
      }
    } else if (compare) {
      // Bun vs npm comparison
      console.log("🔧 Running bun vs npm comparison (dry-run)...\n");
      const result = await compareBunVsNpm(iterations);

      if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatComparison(result));
      }
    } else if (gzip) {
      // Gzip compression benchmark
      console.log("🔧 Running gzip compression benchmark...\n");
      const gzipResults = await benchmarkGzipLevels();

      if (jsonOutput) {
        console.log(JSON.stringify(gzipResults, null, 2));
      } else {
        console.log(formatGzipResults(gzipResults));
      }
    } else {
      // Full benchmark suite
      console.log("🔧 Running full publishing benchmark suite...\n");

      // 1. Pack benchmark
      console.log("📦 Benchmarking bun pm pack...");
      results.push(await benchmarkPack(iterations));

      // 2. Dry-run benchmark
      console.log("🔍 Benchmarking bun publish --dry-run...");
      results.push(await benchmarkDryRun(iterations));

      // 3. Tag validation benchmark
      console.log("🏷️  Benchmarking tag compliance validation...");
      results.push(await benchmarkTagValidation(iterations));

      const endTime = Bun.nanoseconds();
      const totalTime = (endTime - startTime) / 1_000_000;

      const suite: BenchmarkSuite = {
        name: "Publishing Benchmark Suite",
        timestamp: new Date().toISOString(),
        results,
        totalTime,
        summary: {
          totalOps: results.reduce((sum, r) => sum + r.opsPerSecond, 0),
          fastestAvg: Math.min(...results.map((r) => r.avgMs)),
          slowestAvg: Math.max(...results.map((r) => r.avgMs)),
          averageOpsPerSecond: Math.floor(
            results.reduce((sum, r) => sum + r.opsPerSecond, 0) / results.length
          ),
        },
      };

      if (jsonOutput) {
        console.log(JSON.stringify(suite, null, 2));
      } else {
        console.log(formatSuite(suite));
      }
    }
  } catch (error) {
    console.error("Benchmark error:", error);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
