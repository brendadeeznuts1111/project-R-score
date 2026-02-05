#!/usr/bin/env bun
/**
 * Minimal spawnSync Performance Test
 * Exact example from the documentation
 */

// Make this file a module to allow top-level await
export {};

console.log("🔬 Bun.spawnSync() Performance Test");
console.log("==================================\n");

// Test the exact example from the docs
const SPAWN_COUNT = 100;

console.log(`Running ${SPAWN_COUNT} spawnSync operations...`);

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

console.log(`\nAverage time per spawn: ${avgTime.toFixed(3)} ms`);
console.log(`Expected after fix: ~0.4ms per spawn`);
console.log(`Expected before fix: ~13ms per spawn`);

if (avgTime < 1) {
  console.log("✅ Performance looks optimized!");
} else {
  console.log("⚠️  Might be using the slow fallback");
}

console.log("\n💡 Fix details:");
console.log("- Uses close_range() syscall efficiently");
console.log("- Eliminates 65K file descriptor iteration");
console.log("- ~30x faster on Linux ARM64");
