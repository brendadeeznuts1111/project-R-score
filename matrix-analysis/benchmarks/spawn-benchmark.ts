#!/usr/bin/env bun
// benchmarks/spawn-benchmark.ts
import { performance } from "perf_hooks";
import { Tier1380SpawnManager } from "../spawn/quantum-spawn";
import { Tier1380HashSystem } from "../hashing/quantum-crc32";

interface BenchResult {
  name: string;
  iterations: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
}

function runTimings(fn: () => void, iterations: number): number[] {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  return times;
}

function summarize(name: string, times: number[]): BenchResult {
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return {
    name,
    iterations: times.length,
    avgTime: avg,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    throughput: times.length / (times.reduce((a, b) => a + b, 0) / 1000),
  };
}

async function main() {
  const ITERATIONS = 100;
  const WARMUP = 10;

  console.log("Bun.spawnSync() + CRC32 Benchmark Suite");
  console.log("=".repeat(50));
  console.log(`Platform: ${process.platform}-${process.arch}`);
  console.log(`Bun: ${Bun.version}`);
  console.log(`Iterations: ${ITERATIONS} (warmup: ${WARMUP})\n`);

  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    Bun.spawnSync(["true"]);
    Bun.hash.crc32(Buffer.alloc(1024));
  }

  const results: BenchResult[] = [];

  // Test 1: Raw Bun.spawnSync
  console.log("1. Raw Bun.spawnSync(['true'])");
  const rawTimes = runTimings(() => Bun.spawnSync(["true"]), ITERATIONS);
  results.push(summarize("Raw spawnSync", rawTimes));
  console.log(`   avg: ${results[0].avgTime.toFixed(3)}ms\n`);

  // Test 2: Tier1380SpawnManager.spawnSync (wrapper overhead)
  console.log("2. Tier1380SpawnManager.spawnSync(['true'])");
  const managerTimes = runTimings(
    () => Tier1380SpawnManager.spawnSync(["true"]),
    ITERATIONS
  );
  results.push(summarize("Manager spawnSync", managerTimes));
  console.log(`   avg: ${results[1].avgTime.toFixed(3)}ms\n`);

  // Test 3: Cached spawn
  console.log("3. Tier1380SpawnManager.spawnSync (cached)");
  // Prime the cache
  Tier1380SpawnManager.spawnSync(["true"], { cache: true, cacheTTL: 10000 });
  const cachedTimes = runTimings(
    () => Tier1380SpawnManager.spawnSync(["true"], { cache: true, cacheTTL: 10000 }),
    ITERATIONS
  );
  results.push(summarize("Cached spawnSync", cachedTimes));
  console.log(`   avg: ${results[2].avgTime.toFixed(3)}ms\n`);

  // Test 4: CRC32 performance at various sizes
  const sizes = [1024, 1024 * 100, 1024 * 1024];
  const sizeNames = ["1KB", "100KB", "1MB"];

  for (let s = 0; s < sizes.length; s++) {
    const buf = Buffer.alloc(sizes[s]);
    for (let i = 0; i < buf.length; i++) buf[i] = i % 256;

    console.log(`4.${s + 1}. CRC32 (${sizeNames[s]})`);
    const crcTimes = runTimings(() => Bun.hash.crc32(buf), ITERATIONS);
    results.push(summarize(`CRC32 ${sizeNames[s]}`, crcTimes));
    console.log(`   avg: ${results[results.length - 1].avgTime.toFixed(4)}ms\n`);
  }

  // Test 5: CRC32 vs SHA-256 comparison
  console.log("5. CRC32 vs SHA-256 (1MB)");
  const hashBench = await Tier1380HashSystem.benchmark(1024 * 1024);
  console.log(`   CRC32:  ${hashBench.crc32.time.toFixed(4)}ms (${hashBench.crc32.speed})`);
  console.log(`   SHA256: ${hashBench.sha256.time.toFixed(4)}ms (${hashBench.sha256.speed})`);
  console.log(`   Speedup: ${hashBench.speedup}x\n`);

  // Test 6: Batch spawn
  console.log("6. Batch spawn (50 commands)");
  const batchStart = performance.now();
  const batchResult = Tier1380SpawnManager.spawnSyncBatch(
    Array(50).fill(null).map(() => ({ command: ["true"] })),
    { concurrency: 10 }
  );
  const batchTime = performance.now() - batchStart;
  console.log(`   total: ${batchTime.toFixed(2)}ms`);
  console.log(`   avg/cmd: ${batchResult.summary.averageTime.toFixed(3)}ms`);
  console.log(`   throughput: ${batchResult.summary.throughput.toFixed(0)} cmds/s\n`);

  // Summary table
  console.log("=".repeat(50));
  console.log("Summary\n");

  if (typeof Bun !== "undefined") {
    Bun.inspect.table(
      results.map(r => ({
        Test: r.name,
        "Avg (ms)": r.avgTime.toFixed(3),
        "Min (ms)": r.minTime.toFixed(3),
        "Max (ms)": r.maxTime.toFixed(3),
        "Ops/s": Math.round(r.throughput),
      }))
    );
  }

  // FD optimization status
  const fdStatus = Tier1380SpawnManager.getFDOptimizationStatus();
  console.log(`\nFD Optimization: ${fdStatus.optimization}`);
  console.log(`Platform: ${fdStatus.platform}`);
  console.log(`Impact: ${fdStatus.performanceImpact}`);

  // Cache stats
  const cacheStats = Tier1380HashSystem.getCacheStats();
  console.log(`\nHash Cache: ${cacheStats.crc32CacheSize} entries, ${cacheStats.hits} hits, ${cacheStats.misses} misses`);
}

main().catch((err) => { console.error(err); process.exit(1); });
