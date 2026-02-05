#!/usr/bin/env bun

/**
 * Bun Runtime Detection Demo
 * Checks if running in Bun and displays version/platform info
 * 
 * Run with:
 *   bun --version
 *   bun run bun-version-check.ts
 */

console.log("🔍 Bun Runtime Detection Demo\n");

// Check if running in Bun
if (typeof Bun !== 'undefined') {
  console.log("✅ Running in Bun!");
  console.log("─".repeat(40));
  console.log("Bun version:", Bun.version);
  console.log("Platform:", Bun.platform);
  console.log("Has Bun.file:", typeof Bun.file === 'function');
  console.log("Has Bun.hash:", typeof Bun.hash === 'function');
  console.log("Has Bun.serve:", typeof Bun.serve === 'function');
  console.log("Has Bun.write:", typeof Bun.write === 'function');
  console.log("Has Bun.read:", typeof Bun.read === 'function');
  console.log("Has Bun.peek:", typeof Bun.peek === 'function');
  console.log("Has Bun.color:", typeof Bun.color === 'function');
  console.log("Has Bun.CookieMap:", typeof Bun.CookieMap === 'function');
  console.log("Has Bun.Glob:", typeof Bun.Glob === 'function');
  
  // Additional Bun APIs
  console.log("\n📦 Additional Bun APIs:");
  console.log("Has Bun.env:", typeof Bun.env === 'object');
  console.log("Has Bun.main:", typeof Bun.main === 'string');
  console.log("Has Bun.path:", typeof Bun.path === 'object');
  
  // Test some Bun functions
  console.log("\n🧪 Testing Bun Functions:");
  
  // Test Bun.file
  const testFile = Bun.file("/tmp/bun-test.txt");
  console.log("✅ Bun.file() works:", testFile !== undefined);
  
  // Test Bun.hash
  const hash = Bun.hash("test");
  console.log("✅ Bun.hash() works:", hash !== undefined, "(hash:", hash + ")");
  
  // Test Bun.color (if available)
  if (typeof Bun.color === 'function') {
    const colored = Bun.color("red", "ansi");
    console.log("Bun.color() works:", typeof colored === 'string');
  }
  
  console.log("\n✨ All Bun APIs detected successfully!");
  
} else {
  console.log("❌ Not running in Bun");
  console.log("   This script requires Bun runtime");
  console.log("   Install: npm install -g bun");
  console.log("   Run: bun run bun-version-check.ts");
}
