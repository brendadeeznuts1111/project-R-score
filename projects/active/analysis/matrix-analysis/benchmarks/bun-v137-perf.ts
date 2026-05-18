#!/usr/bin/env bun
/**
 * Bun v1.3.7+ Performance Benchmark Suite
 * Tests Buffer.from(Array), JSC upgrades, wrapAnsi, and ARM64 optimizations
 *
 * @usage bun run benchmarks/bun-v137-perf.ts [--json] [--csv]
 */

import { parseArgs } from "util";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface BenchmarkResult {
  name: string;
  opsPerSecond: number;
  timePerOp: number; // microseconds
  iterations: number;
  totalTime: number; // milliseconds
  category: "buffer" | "jsc" | "wrapansi" | "arm64";
}

interface SuiteSummary {
  results: BenchmarkResult[];
  fastest: Record<string, string>;
  slowest: Record<string, string>;
}

// ============================================================================
// Benchmark Utilities
// ============================================================================

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
  return n.toFixed(2);
}

function formatTime(us: number): string {
  if (us < 1) return `${(us * 1000).toFixed(2)}ns`;
  if (us < 1000) return `${us.toFixed(2)}µs`;
  return `${(us / 1000).toFixed(2)}ms`;
}

async function benchmark(
  name: string,
  fn: () => void | Promise<void>,
  iterations: number,
  category: BenchmarkResult["category"]
): Promise<BenchmarkResult> {
  // Warmup
  for (let i = 0; i < Math.min(100, iterations / 10); i++) {
    await fn();
  }

  // Run
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const totalTime = performance.now() - start;
  const timePerOp = (totalTime * 1000) / iterations; // microseconds
  const opsPerSecond = (iterations / totalTime) * 1000;

  return {
    name,
    opsPerSecond,
    timePerOp,
    iterations,
    totalTime,
    category,
  };
}

// ============================================================================
// Benchmark Categories
// ============================================================================

async function runBufferBenchmarks(): Promise<BenchmarkResult[]> {
  console.info(`${COLORS.bold}${COLORS.cyan}▶ Buffer.from(Array) Benchmarks${COLORS.reset}\n`);

  const results: BenchmarkResult[] = [];

  // 8 elements - Session IDs array
  const data8 = [1, 2, 3, 4, 5, 6, 7, 8];
  results.push(await benchmark(
    "Buffer.from(8 elems)",
    () => { Buffer.from(data8); },
    100_000,
    "buffer"
  ));

  // 64 elements - Pool connections buffer
  const data64 = Array(64).fill(42);
  results.push(await benchmark(
    "Buffer.from(64 elems)",
    () => { Buffer.from(data64); },
    100_000,
    "buffer"
  ));

  // 1024 elements - DB blobs
  const data1024 = Array(1024).fill(42);
  results.push(await benchmark(
    "Buffer.from(1024 elems)",
    () => { Buffer.from(data1024); },
    10_000,
    "buffer"
  ));

  return results;
}

async function runJscBenchmarks(): Promise<BenchmarkResult[]> {
  console.info(`\n${COLORS.bold}${COLORS.cyan}▶ JSC Engine Upgrades${COLORS.reset}\n`);

  const results: BenchmarkResult[] = [];

  // async/await - Pool async stats
  async function asyncFn() { await Promise.resolve(1); }
  results.push(await benchmark(
    "async/await",
    async () => { await asyncFn(); },
    100_000,
    "jsc"
  ));

  // Array.from(arguments) - Arg spreads
  function arrayFromFn() { return Array.from(arguments); }
  results.push(await benchmark(
    "Array.from(arguments)",
    () => { arrayFromFn(1, 2, 3); },
    100_000,
    "jsc"
  ));

  // padStart - Log alignment
  const padStr = "hi";
  results.push(await benchmark(
    "String.padStart(10)",
    () => { padStr.padStart(10, "-"); },
    100_000,
    "jsc"
  ));

  // array.flat() - Nested pools
  const flatArray = [[1], [2], [3]];
  results.push(await benchmark(
    "array.flat()",
    () => { flatArray.flat(); },
    100_000,
    "jsc"
  ));

  // padEnd - Alternative alignment
  results.push(await benchmark(
    "String.padEnd(10)",
    () => { padStr.padEnd(10, "-"); },
    100_000,
    "jsc"
  ));

  return results;
}

async function runWrapAnsiBenchmarks(): Promise<BenchmarkResult[]> {
  console.info(`\n${COLORS.bold}${COLORS.cyan}▶ Bun.wrapAnsi Performance${COLORS.reset}\n`);

  const results: BenchmarkResult[] = [];

  if (typeof Bun.wrapAnsi !== "function") {
    console.info(`${COLORS.yellow}⚠ Bun.wrapAnsi not available in this version${COLORS.reset}\n`);
    return results;
  }

  // Short ANSI text - Col-89 tables
  const shortAnsi = "\x1b[31mShort red text\x1b[0m";
  results.push(await benchmark(
    "wrapAnsi(short, 20)",
    () => { Bun.wrapAnsi!(shortAnsi, 20); },
    100_000,
    "wrapansi"
  ));

  // Medium ANSI text
  const mediumAnsi = "\x1b[32m" + ("text ".repeat(50)) + "\x1b[0m";
  results.push(await benchmark(
    "wrapAnsi(medium, 40)",
    () => { Bun.wrapAnsi!(mediumAnsi, 40, { hard: true }); },
    50_000,
    "wrapansi"
  ));

  // Long ANSI text - Mega tables
  const longAnsi = "\x1b[34m" + ("text ".repeat(400)) + "\x1b[0m";
  results.push(await benchmark(
    "wrapAnsi(long, 80)",
    () => { Bun.wrapAnsi!(longAnsi, 80, { hard: true }); },
    10_000,
    "wrapansi"
  ));

  // Col-89 specific (Tier-1380 standard)
  const col89Text = "\x1b[36m" + ("matrix ".repeat(100)) + "\x1b[0m";
  results.push(await benchmark(
    "wrapAnsi(Col-89)",
    () => { Bun.wrapAnsi!(col89Text, 89, { hard: true }); },
    20_000,
    "wrapansi"
  ));

  return results;
}

async function runArm64Benchmarks(): Promise<BenchmarkResult[]> {
  console.info(`\n${COLORS.bold}${COLORS.cyan}▶ ARM64 ccmp Optimizations${COLORS.reset}\n`);

  const results: BenchmarkResult[] = [];

  // Branchless condition check (ccmp simulation)
  let x = 0, y = 1;
  results.push(await benchmark(
    "ARM64 ccmp cond",
    () => {
      // Simulates: if (x === 0 && y === 1)
      const cond = x === 0 && y === 1;
      return cond;
    },
    1_000_000,
    "arm64"
  ));

  // Pool size check with ENABLE_FFI pattern
  const MATRIX_POOL_SIZE = 1380;
  const ENABLE_FFI = true;
  results.push(await benchmark(
    "Pool + FFI check",
    () => {
      if (MATRIX_POOL_SIZE === 1380 && ENABLE_FFI) {
        return true;
      }
      return false;
    },
    1_000_000,
    "arm64"
  ));

  // Multiple condition chain
  const a = 1, b = 2, c = 3;
  results.push(await benchmark(
    "Multi-cond chain",
    () => {
      if (a === 1 && b === 2 && c === 3) {
        return true;
      }
      return false;
    },
    1_000_000,
    "arm64"
  ));

  return results;
}

// ============================================================================
// Output Formatters
// ============================================================================

function printResults(results: BenchmarkResult[]) {
  console.info(`\n${COLORS.bold}${COLORS.magenta}📊 Results Summary${COLORS.reset}\n`);

  // Group by category
  const byCategory = results.reduce((acc, r) => {
    acc[r.category] = acc[r.category] || [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, BenchmarkResult[]>);

  for (const [category, items] of Object.entries(byCategory)) {
    const catColor = {
      buffer: COLORS.cyan,
      jsc: COLORS.green,
      wrapansi: COLORS.yellow,
      arm64: COLORS.blue,
    }[category] || COLORS.reset;

    console.info(`${catColor}${category.toUpperCase()}${COLORS.reset}`);
    console.info("─".repeat(70));

    for (const r of items) {
      const opsStr = formatNumber(r.opsPerSecond).padStart(8);
      const timeStr = formatTime(r.timePerOp).padStart(10);
      console.info(
        `  ${r.name.padEnd(25)} ${COLORS.bold}${opsStr}${COLORS.reset} ops/s  ` +
        `${COLORS.dim}${timeStr}${COLORS.reset}/op`
      );
    }
    console.info();
  }
}

function printJson(results: BenchmarkResult[]) {
  console.info(JSON.stringify(results, null, 2));
}

function printCsv(results: BenchmarkResult[]) {
  console.info("name,category,opsPerSecond,timePerOpUs,iterations,totalTimeMs");
  for (const r of results) {
    console.info(`${r.name},${r.category},${r.opsPerSecond},${r.timePerOp},${r.iterations},${r.totalTime}`);
  }
}

function printSpeedup(results: BenchmarkResult[]) {
  console.info(`\n${COLORS.bold}${COLORS.magenta}🚀 Tier-1380 Omega Speedup Analysis${COLORS.reset}\n`);

  // Estimated Node.js baseline comparisons
  const baselines: Record<string, number> = {
    "Buffer.from(8 elems)": 24,      // 24µs in Node
    "Buffer.from(64 elems)": 77,      // 77µs in Node
    "Buffer.from(1024 elems)": 1200,  // 1.2µs in Node
    "async/await": 2400,              // 2.4µs in Node
    "Array.from(arguments)": 56,      // 56ns in Node
    "String.padStart(10)": 15,        // 15ns in Node
    "array.flat()": 25,               // 25ns in Node
    "wrapAnsi(short, 20)": 25000,     // 25µs npm wrap-ansi
    "wrapAnsi(medium, 40)": 100000,   // 100µs npm wrap-ansi
    "wrapAnsi(long, 80)": 7660000,    // 7.66ms npm wrap-ansi
    "wrapAnsi(Col-89)": 500000,       // 500µs npm wrap-ansi
  };

  console.info("─".repeat(80));
  console.info(`${"Benchmark".padEnd(25)} ${"Bun v1.3.8".padEnd(12)} ${"Node/npm".padEnd(12)} ${"Speedup".padEnd(10)}`);
  console.info("─".repeat(80));

  for (const r of results) {
    const baseline = baselines[r.name];
    if (baseline) {
      const speedup = baseline / r.timePerOp;
      const speedupStr = speedup >= 10
        ? `${COLORS.green}${speedup.toFixed(1)}x${COLORS.reset}`
        : speedup >= 2
          ? `${COLORS.yellow}${speedup.toFixed(1)}x${COLORS.reset}`
          : `${speedup.toFixed(1)}x`;

      console.info(
        `${r.name.padEnd(25)} ` +
        `${formatTime(r.timePerOp).padEnd(12)} ` +
        `${formatTime(baseline).padEnd(12)} ` +
        `${speedupStr}`
      );
    }
  }
  console.info("─".repeat(80));
}

// ============================================================================
// Omega Pools Integration Demo
// ============================================================================

function printIntegrationDemo() {
  console.info(`\n${COLORS.bold}${COLORS.magenta}🔧 Omega Pools Integration${COLORS.reset}\n`);

  const MATRIX_POOL_SIZE = 1380;
  const ENABLE_FFI = true;

  // Demonstrate faster Buffer.from for session IDs
  console.info(`${COLORS.cyan}Buffer.from() for Session IDs:${COLORS.reset}`);
  const sessionIds = Array(5).fill(0).map((_, i) =>
    Buffer.from([i, i + 1, i + 2, i + 3])
  );
  console.info(`  Generated ${sessionIds.length} session buffers: ${sessionIds.map(b => b.toString("hex")).join(", ")}`);

  // Demonstrate faster array.flat() for pool data
  console.info(`\n${COLORS.green}array.flat() for Nested Pools:${COLORS.reset}`);
  const nestedPools = [[{ id: 1, tier: 1380 }], [{ id: 2, tier: 1380 }]];
  const flatPools = nestedPools.flat();
  console.info(`  Flattened ${nestedPools.length} nested arrays → ${flatPools.length} items`);

  // Demonstrate faster padStart for hex formatting
  console.info(`\n${COLORS.yellow}String.padStart() for Hex IDs:${COLORS.reset}`);
  const hexIds = sessionIds.map(b => b.toString("hex").padStart(16, "0"));
  console.info(`  Formatted ${hexIds.length} IDs to 16-char hex`);

  // Demonstrate ARM64 ccmp branchless conditions
  console.info(`\n${COLORS.blue}ARM64 ccmp Branchless Conditions:${COLORS.reset}`);
  if (sessionIds.length === 5 && ENABLE_FFI) {
    console.info(`  ✓ Pool size check (5 === 5 && ENABLE_FFI) passed`);
  }

  // Demonstrate wrapAnsi for Col-89 tables
  if (typeof Bun.wrapAnsi === "function") {
    console.info(`\n${COLORS.magenta}Bun.wrapAnsi() for Col-89 Tables:${COLORS.reset}`);
    const longLine = hexIds.join("  ");
    const wrapped = Bun.wrapAnsi!(longLine, 50, { hard: true });
    console.info(`  Wrapped ${Bun.stringWidth!(longLine)} chars to Col-50:`);
    for (const line of wrapped.split("\n")) {
      console.info(`    ${line}`);
    }
  }

  console.info();
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const { values: args } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      json: { type: "boolean", short: "j" },
      csv: { type: "boolean", short: "c" },
      help: { type: "boolean", short: "h" },
    },
    strict: false,
  });

  if (args.help) {
    console.info(`
${COLORS.bold}Bun v1.3.7+ Performance Benchmark Suite${COLORS.reset}

Usage: bun run benchmarks/bun-v137-perf.ts [options]

Options:
  -j, --json     Output results as JSON
  -c, --csv      Output results as CSV
  -h, --help     Show this help message

Benchmarks:
  • Buffer.from(Array) - 50% faster bulk copy
  • JSC Upgrades - async/await 2x, pad/flat 30%
  • Bun.wrapAnsi - 33-88x faster than npm wrap-ansi
  • ARM64 ccmp - Branchless condition optimizations
`);
    process.exit(0);
  }

  console.info(`${COLORS.bold}${COLORS.cyan}
╔══════════════════════════════════════════════════════════════════╗
║     Bun v1.3.7+ Performance Benchmark Suite (Tier-1380)          ║
║     Buffer • JSC • wrapAnsi • ARM64 ccmp                          ║
╚══════════════════════════════════════════════════════════════════╝
${COLORS.reset}`);

  console.info(`${COLORS.dim}Runtime: Bun ${Bun.version} on ${process.arch}${COLORS.reset}\n`);

  const allResults: BenchmarkResult[] = [];

  allResults.push(...await runBufferBenchmarks());
  allResults.push(...await runJscBenchmarks());
  allResults.push(...await runWrapAnsiBenchmarks());
  allResults.push(...await runArm64Benchmarks());

  if (args.json) {
    printJson(allResults);
  } else if (args.csv) {
    printCsv(allResults);
  } else {
    printResults(allResults);
    printSpeedup(allResults);
    printIntegrationDemo();

    // System info footer
    console.info(`${COLORS.dim}─────────────────────────────────────────────────────────────────${COLORS.reset}`);
    console.info(`${COLORS.dim}Benchmark complete. Run with --json for machine-readable output.${COLORS.reset}`);
    console.info(`${COLORS.dim}Tier-1380 OMEGA | Bun v${Bun.version} | ${new Date().toISOString()}${COLORS.reset}\n`);
  }
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
