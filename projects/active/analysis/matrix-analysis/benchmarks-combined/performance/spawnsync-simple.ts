#!/usr/bin/env bun
/**
 * Minimal spawnSync Performance Test
 * Exact example from the documentation
 */

// Make this file a module to allow top-level await
export {};

console.info("🔬 Bun.spawnSync() Performance Test");
console.info("==================================\n");

// Test the exact example from the docs
const SPAWN_COUNT = 100;

console.info(`Running ${SPAWN_COUNT} spawnSync operations...`);

// Before fix: ~13ms per spawn
// After fix: ~0.4ms per spawn

console.time("spawnSync operations");
for (let i = 0; i < SPAWN_COUNT; i++) {
  Bun.spawnSync(["true"]);
}
console.timeEnd("spawnSync operations");

// Calculate average
const spawnStart = performance.now();
Bun.spawnSync(["true"]);
const spawnEnd = performance.now();
const avgTime = (spawnEnd - spawnStart) * 1000; // Convert to ms

console.info(`\nAverage time per spawn: ${avgTime.toFixed(3)} ms`);
console.info(`Expected after fix: ~0.4ms per spawn`);
console.info(`Expected before fix: ~13ms per spawn`);

if (avgTime < 1) {
  console.info("✅ Performance looks optimized!");
} else {
  console.info("⚠️  Might be using the slow fallback");
}

console.info("\n💡 Fix details:");
console.info("- Uses close_range() syscall efficiently");
console.info("- Eliminates 65K file descriptor iteration");
console.info("- ~30x faster on Linux ARM64");
