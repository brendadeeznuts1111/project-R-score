#!/usr/bin/env bun
/**
 * Bun.spawnSync() Performance Benchmark
 * 
 * Demonstrates the 30x performance improvement on Linux ARM64
 * after fixing the close_range() syscall issue
 */

import { performance } from "perf_hooks";

console.info("🚀 Bun.spawnSync() Performance Benchmark");
console.info("======================================\n");

// Check if we're on Linux
const isLinux = process.platform === "linux";
const isARM64 = process.arch === "arm64";

console.info(`Platform: ${process.platform}`);
console.info(`Architecture: ${process.arch}`);
console.info(`Linux ARM64: ${isLinux && isARM64 ? "✅ Yes" : "❌ No"}`);

if (isLinux) {
  console.info("\n📊 Current file descriptor limits:");
  try {
    const { execSync } = await import("child_process");
    const softLimit = execSync("ulimit -Sn", { encoding: "utf8" }).trim();
    const hardLimit = execSync("ulimit -Hn", { encoding: "utf8" }).trim();
    console.info(`Soft limit: ${softLimit}`);
    console.info(`Hard limit: ${hardLimit}`);
  } catch (e) {
    console.info("Could not retrieve ulimit values");
  }
}

// Benchmark configuration
const SPAWN_COUNT = 100;
const WARMUP_COUNT = 10;

// Warm up
console.info("\n🔥 Warming up...");
for (let i = 0; i < WARMUP_COUNT; i++) {
  Bun.spawnSync(["true"]);
}
console.info("✓ Warmup complete");

// Benchmark spawnSync performance
console.info(`\n⚡ Benchmarking ${SPAWN_COUNT} spawnSync operations...`);

const results = {
  times: [] as number[],
  successes: 0,
  failures: 0
};

console.time("spawnSync Benchmark");
for (let i = 0; i < SPAWN_COUNT; i++) {
  const start = performance.now();
  
  try {
    const result = Bun.spawnSync(["true"]);
    if (result.success) {
      results.successes++;
    } else {
      results.failures++;
    }
  } catch (error) {
    results.failures++;
  }
  
  const end = performance.now();
  results.times.push(end - start);
}
console.timeEnd("spawnSync Benchmark");

// Calculate statistics
const avgTime = results.times.reduce((sum, time) => sum + time, 0) / results.times.length;
const minTime = Math.min(...results.times);
const maxTime = Math.max(...results.times);
const totalTime = results.times.reduce((sum, time) => sum + time, 0);

console.info("\n📈 Performance Results:");
console.info(`========================`);
console.info(`Total spawns: ${SPAWN_COUNT}`);
console.info(`Successful: ${results.successes}`);
console.info(`Failed: ${results.failures}`);
console.info(`Average time per spawn: ${(avgTime * 1000).toFixed(3)} ms`);
console.info(`Min time: ${(minTime * 1000).toFixed(3)} ms`);
console.info(`Max time: ${(maxTime * 1000).toFixed(3)} ms`);
console.info(`Total time: ${totalTime.toFixed(3)} ms`);

// Performance comparison
console.info("\n🔄 Performance Comparison:");
console.info("==========================");

const beforeFixTime = 13; // ms per spawn (before fix)
const afterFixTime = avgTime; // ms per spawn (after fix)
const improvement = beforeFixTime / afterFixTime;

console.info(`Before fix (estimated): ${beforeFixTime} ms per spawn`);
console.info(`After fix (measured): ${afterFixTime.toFixed(3)} ms per spawn`);
console.info(`Improvement: ${improvement.toFixed(1)}x faster`);

// Check if we're getting the expected performance
if (isLinux && isARM64) {
  if (avgTime < 1) {
    console.info("✅ Performance looks good! (~0.4ms per spawn as expected)");
  } else {
    console.info("⚠️  Performance might not be optimal (expected ~0.4ms per spawn)");
  }
} else {
  console.info("ℹ️  Performance improvement is most significant on Linux ARM64");
}

// Additional test with different commands
console.info("\n🧪 Testing with different commands:");
console.info("=====================================");

const commands = [
  { name: "true", args: ["true"] },
  { name: "echo", args: ["echo", "test"] },
  { name: "pwd", args: ["pwd"] }
];

for (const cmd of commands) {
  const start = performance.now();
  const result = Bun.spawnSync(cmd.args);
  const end = performance.now();
  
  console.info(`${cmd.name}: ${(end - start).toFixed(3)} ms (success: ${result.success})`);
}

// Explanation of the fix
console.info("\n💡 Technical Details:");
console.info("=====================");
console.info("The performance issue was caused by:");
console.info("1. Missing close_range() syscall number on older glibc");
console.info("2. Fallback to iterating through all file descriptors");
console.info("3. Up to 65K file descriptors checked individually");
console.info("");
console.info("The fix:");
console.info("1. Properly defines close_range() syscall at compile time");
console.info("2. Uses efficient close_range() when available");
console.info("3. Eliminates the slow fallback path");
console.info("");
console.info("Result: ~30x faster spawnSync() on Linux ARM64! 🚀");
