#!/usr/bin/env bun
/**
 * MCP arrayBuffer() Benchmark
 * Bun.bench native style with zero-copy peek optimization
 *
 * @usage bun run benchmarks/mcp-arraybuffer-bench.ts
 */

interface BenchmarkResult {
  name: string;
  mean: number; // microseconds
  stdDev: number;
  p99: number;
  runs: number;
  throughput: string;
  memoryPeak: string;
  vsBaseline?: string;
}

const COLORS = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

/** Simulate MCP artifact with arrayBuffer() */
class MCPArtifact {
  private data: ArrayBuffer;

  constructor(size: number) {
    this.data = new ArrayBuffer(size);
    const view = new Uint8Array(this.data);
    for (let i = 0; i < size; i++) {
      view[i] = i % 256;
    }
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(this.data);
  }
}

/** Run benchmark with full metrics */
async function runBenchmark(
  name: string,
  fn: () => void | Promise<void>,
  runs: number,
): Promise<BenchmarkResult> {
  const times: number[] = [];
  const memStart = process.memoryUsage().heapUsed;
  let memPeak = memStart;

  // Warmup
  for (let i = 0; i < Math.min(100, runs / 10); i++) {
    await fn();
  }

  // Benchmark
  for (let i = 0; i < runs; i++) {
    const start = Bun.nanoseconds();
    await fn();
    const elapsed = (Bun.nanoseconds() - start) / 1000; // microseconds
    times.push(elapsed);

    // Sample memory every 100 iterations
    if (i % 100 === 0) {
      const mem = process.memoryUsage().heapUsed;
      if (mem > memPeak) memPeak = mem;
    }
  }

  // Statistics
  times.sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const p99 = times[Math.floor(times.length * 0.99)];
  const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);

  // Format throughput
  const opsPerSecond = 1_000_000 / mean;
  const throughput = opsPerSecond > 1_000_000
    ? `${(opsPerSecond / 1_000_000).toFixed(1)}M ops/s`
    : `${(opsPerSecond / 1000).toFixed(1)}k ops/s`;

  // Format memory
  const memUsed = (memPeak - memStart) / 1024;
  const memoryPeak = memUsed < 1024
    ? `${memUsed.toFixed(2)}KB`
    : `${(memUsed / 1024).toFixed(2)}MB`;

  return {
    name,
    mean,
    stdDev,
    p99,
    runs,
    throughput,
    memoryPeak,
  };
}

/** Format result in Bun.bench style */
function formatResult(r: BenchmarkResult, baseline?: BenchmarkResult): string {
  const meanStr = r.mean < 1000
    ? `${r.mean.toFixed(1)}μs`
    : `${(r.mean / 1000).toFixed(2)}ms`;

  const stdDevStr = r.stdDev < 1000
    ? `${r.stdDev.toFixed(2)}μs`
    : `${(r.stdDev / 1000).toFixed(2)}ms`;

  const variancePct = ((r.stdDev / r.mean) * 100).toFixed(1);

  let comparison = "";
  if (baseline && r.name !== baseline.name) {
    const speedup = ((baseline.mean / r.mean - 1) * 100);
    const color = speedup > 0 ? COLORS.green : COLORS.yellow;
    const sign = speedup > 0 ? "+" : "";
    comparison = `\nvs baseline=${baseline.name} → ${color}${sign}${speedup.toFixed(0)}% faster${COLORS.reset}`;
  }

  return `${COLORS.cyan}${r.name}${COLORS.reset} → ${COLORS.bold}${meanStr}${COLORS.reset} ±${variancePct}% (${r.runs.toLocaleString()} runs) [σ=${stdDevStr}]${comparison}\n` +
    `${COLORS.dim}Memory: ${r.memoryPeak} peak | Throughput: ${r.throughput}${COLORS.reset}`;
}

/** Main benchmark */
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  MCP arrayBuffer() Benchmark (Tier-1380)                          ║");
  console.log("║  Bun.peek() Zero-Copy • wyhash • Baseline Comparison              ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");

  console.log(`${COLORS.dim}Runtime: Bun v${Bun.version} on ${process.arch}${COLORS.reset}`);
  console.log(`${COLORS.dim}Date: ${new Date().toISOString()}${COLORS.reset}\n`);

  // Create artifact (simulating MCP response)
  const artifact = new MCPArtifact(4096); // 4KB artifact

  // Benchmark: Baseline (esbuild style - standard await)
  const baselineResult = await runBenchmark(
    "esbuild",
    async () => {
      const buf = await artifact.arrayBuffer();
      return Bun.hash.wyhash(new Uint8Array(buf));
    },
    10000,
  );

  // Benchmark: Bun v1.3.8 with zero-copy peek
  const bunResult = await runBenchmark(
    "Bun v1.3.8",
    () => {
      const promise = artifact.arrayBuffer();
      const buf = Bun.peek(promise);
      return Bun.hash.wyhash(new Uint8Array(buf));
    },
    10000,
  );

  // Print results
  console.log("─".repeat(70));
  console.log(formatResult(baselineResult));
  console.log();
  console.log(formatResult(bunResult, baselineResult));
  console.log("─".repeat(70));

  // Summary
  const improvement = ((baselineResult.mean / bunResult.mean - 1) * 100);
  console.log(`\n${COLORS.bold}Summary:${COLORS.reset}`);
  console.log(`  Zero-copy peek improvement: ${COLORS.green}${improvement.toFixed(0)}%${COLORS.reset}`);
  console.log(`  p99 latency: ${COLORS.cyan}${bunResult.p99.toFixed(2)}μs${COLORS.reset}`);
  console.log(`  Memory efficiency: ${COLORS.green}${bunResult.memoryPeak}${COLORS.reset}`);

  // Additional context
  console.log(`\n${COLORS.dim}Techniques used:${COLORS.reset}`);
  console.log(`  • Bun.peek() - Zero-copy promise inspection`);
  console.log(`  • Bun.hash.wyhash() - Fast non-cryptographic hash`);
  console.log(`  • Uint8Array view - No buffer copy`);

  console.log(`\n${COLORS.dim}Tier-1380 OMEGA | MCP Optimization Benchmark${COLORS.reset}\n`);
}

main().catch(console.error);
