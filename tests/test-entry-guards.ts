#!/usr/bin/env bun
/**
 * Simple Entry Guard Test - Quick verification
 * For comprehensive testing, run: bun test-entry-guards-consolidated.ts
 */

export {}; // Make this a module for top-level await

console.info("🧪 Quick Entry Guard Test\n");

// Test that the shared entry guard utility works
try {
  const { isDirectExecution, ensureDirectExecution } = await import("../lib/shared/tools/entry-guard.ts");
  
  console.info("✅ Entry guard utility imports successfully");
  
  // Test the detection function
  const isMain = isDirectExecution();
  console.info(`✅ Direct execution detection: ${isMain ? "running as main" : "imported as module"}`);
  
  // Test that ensureDirectExecution doesn't exit when we're the main script
  try {
    ensureDirectExecution();
    console.info("✅ ensureDirectExecution() works correctly");
  } catch (err) {
    console.info(`❌ ensureDirectExecution() failed: ${err}`);
  }
  
} catch (err) {
  console.info(`❌ Failed to import entry guard utility: ${err}`);
  process.exit(1);
}

console.info("\n💡 For comprehensive entry guard testing, run:");
console.info("   bun test-entry-guards-consolidated.ts");