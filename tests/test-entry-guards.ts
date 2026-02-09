#!/usr/bin/env bun
/**
 * Simple Entry Guard Test - Quick verification
 * For comprehensive testing, run: bun test-entry-guards-consolidated.ts
 */

export {}; // Make this a module for top-level await

console.log("🧪 Quick Entry Guard Test\n");

// Test that the shared entry guard utility works
try {
  const { isDirectExecution, ensureDirectExecution } = await import("../lib/shared/tools/entry-guard.ts");
  
  console.log("✅ Entry guard utility imports successfully");
  
  // Test the detection function
  const isMain = isDirectExecution();
  console.log(`✅ Direct execution detection: ${isMain ? "running as main" : "imported as module"}`);
  
  // Test that ensureDirectExecution doesn't exit when we're the main script
  try {
    ensureDirectExecution();
    console.log("✅ ensureDirectExecution() works correctly");
  } catch (err) {
    console.log(`❌ ensureDirectExecution() failed: ${err}`);
  }
  
} catch (err) {
  console.log(`❌ Failed to import entry guard utility: ${err}`);
  process.exit(1);
}

console.log("\n💡 For comprehensive entry guard testing, run:");
console.log("   bun test-entry-guards-consolidated.ts");