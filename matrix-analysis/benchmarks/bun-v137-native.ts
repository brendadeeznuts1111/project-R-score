#!/usr/bin/env bun
/**
 * Bun.bench() Style Performance Report
 * Simulates native Bun.bench() output format for v1.3.7+ features
 *
 * @usage bun run benchmarks/bun-v137-native.ts
 */

import { writeFile } from "fs/promises";

interface BenchmarkResult {
  name: string;
  mean: number; // microseconds
  stdDev: number;
  min: number;
  max: number;
  p99: number;
  iterations: number;
  throughput: string;
}

const COLORS = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

/** Run benchmark with statistical analysis */
async function bench(
  name: string,
  fn: () => void | Promise<void>,
  iterations: number,
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < Math.min(100, iterations / 10); i++) {
    await fn();
  }

  // Run benchmark
  for (let i = 0; i < iterations; i++) {
    const start = Bun.nanoseconds();
    await fn();
    const elapsed = (Bun.nanoseconds() - start) / 1000; // microseconds
    times.push(elapsed);
  }

  // Statistics
  times.sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const min = times[0];
  const max = times[times.length - 1];
  const p99 = times[Math.floor(times.length * 0.99)];
  const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);

  // Throughput calculation
  const opsPerSecond = 1_000_000 / mean;
  let throughput: string;
  if (opsPerSecond > 1_000_000) {
    throughput = `${(opsPerSecond / 1_000_000).toFixed(2)}M ops/s`;
  } else if (opsPerSecond > 1000) {
    throughput = `${(opsPerSecond / 1000).toFixed(2)}k ops/s`;
  } else {
    throughput = `${opsPerSecond.toFixed(2)} ops/s`;
  }

  return { name, mean, stdDev, min, max, p99, iterations, throughput };
}

/** Format benchmark result in Bun.bench style */
function formatResult(r: BenchmarkResult, baseline?: BenchmarkResult): string {
  const meanStr = r.mean < 1000
    ? `${r.mean.toFixed(2)}μs`
    : `${(r.mean / 1000).toFixed(2)}ms`;

  const stdDevStr = r.stdDev < 1000
    ? `${r.stdDev.toFixed(2)}μs`
    : `${(r.stdDev / 1000).toFixed(2)}ms`;

  const variancePct = ((r.stdDev / r.mean) * 100).toFixed(1);

  let comparison = "";
  if (baseline && r.name !== baseline.name) {
    const speedup = ((baseline.mean / r.mean - 1) * 100).toFixed(0);
    const color = parseFloat(speedup) > 0 ? COLORS.green : COLORS.yellow;
    comparison = ` ${color}[${speedup}% vs baseline]${COLORS.reset}`;
  }

  return `${COLORS.cyan}${r.name.padEnd(30)}${COLORS.reset} → ${COLORS.bold}${meanStr}${COLORS.reset} ±${variancePct}% (${r.iterations.toLocaleString()} runs) σ=${stdDevStr}${comparison}\n` +
    `${" ".repeat(32)}p99:${r.p99.toFixed(2)}μs | min:${r.min.toFixed(2)}μs | max:${r.max.toFixed(2)}μs | ${r.throughput}`;
}

/** Main benchmark suite */
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  Bun.bench() Style Performance Report (Tier-1380)                 ║");
  console.log("║  Buffer • JSC • wrapAnsi • SHA-256 • Memory                       ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");

  console.log(`${COLORS.dim}Runtime: Bun v${Bun.version} on ${process.arch}${COLORS.reset}`);
  console.log(`${COLORS.dim}Date: ${new Date().toISOString()}${COLORS.reset}\n`);

  // Test data
  const bufferData8 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const bufferData64 = new Uint8Array(Array(64).fill(42));
  const bufferData1024 = new Uint8Array(Array(1024).fill(42));
  const ansiText = "\x1b[31m" + "text ".repeat(100) + "\x1b[0m";

  // Run benchmarks
  const results: BenchmarkResult[] = [];

  // Buffer benchmarks
  results.push(await bench("Buffer.from(8)", () => {
    Buffer.from(bufferData8);
  }, 100000));

  results.push(await bench("Buffer.from(64)", () => {
    Buffer.from(bufferData64);
  }, 100000));

  results.push(await bench("Buffer.from(1024)", () => {
    Buffer.from(bufferData1024);
  }, 10000));

  // JSC benchmarks
  results.push(await bench("async/await", async () => {
    await Promise.resolve(1);
  }, 100000));

  results.push(await bench("Array.from(args)", () => {
    (function () { return Array.from(arguments); })(1, 2, 3);
  }, 100000));

  results.push(await bench("String.padStart", () => {
    "hi".padStart(10, "-");
  }, 100000));

  // wrapAnsi benchmarks
  if (typeof Bun.wrapAnsi === "function") {
    results.push(await bench("Bun.wrapAnsi(short)", () => {
      Bun.wrapAnsi!("\x1b[31mShort\x1b[0m", 20);
    }, 100000));

    results.push(await bench("Bun.wrapAnsi(long)", () => {
      Bun.wrapAnsi!(ansiText, 80, { hard: true });
    }, 10000));
  }

  // Bun.hash benchmarks (native hashing)
  results.push(await bench("Bun.hash.wyhash(8)", () => {
    Bun.hash.wyhash(bufferData8);
  }, 100000));

  results.push(await bench("Bun.hash.crc32(1024)", () => {
    Bun.hash.crc32(bufferData1024);
  }, 10000));

  // Web Crypto SHA-256
  results.push(await bench("crypto.subtle.digest(8)", async () => {
    await crypto.subtle.digest("SHA-256", bufferData8);
  }, 10000));

  // Bun.peek benchmark
  results.push(await bench("Bun.peek()", () => {
    Bun.peek(Promise.resolve(42));
  }, 100000));

  // Print results with baseline (first result)
  const baseline = results[0];
  console.log("\n" + "─".repeat(70));
  results.forEach((r, i) => {
    console.log(formatResult(r, i === 0 ? undefined : baseline));
  });
  console.log("─".repeat(70));

  // Summary
  const fastest = results.reduce((a, b) => a.mean < b.mean ? a : b);
  const slowest = results.reduce((a, b) => a.mean > b.mean ? a : b);

  console.log(`\n${COLORS.bold}Summary:${COLORS.reset}`);
  console.log(`  Fastest: ${COLORS.green}${fastest.name}${COLORS.reset} (${fastest.throughput})`);
  console.log(`  Slowest: ${COLORS.yellow}${slowest.name}${COLORS.reset} (${slowest.throughput})`);
  console.log(`  Total benchmarks: ${results.length}`);

  // Peak memory
  if (globalThis.gc) {
    gc();
    const mem = process.memoryUsage();
    console.log(`  Peak memory: ${(mem.heapUsed / 1024).toFixed(2)}KB`);
  }

  console.log(`\n${COLORS.dim}Tier-1380 OMEGA | Bun.bench() Style Report${COLORS.reset}\n`);
}

main().catch(console.error);
