#!/usr/bin/env bun

/**
 * Bun Runtime Detection Demo
 * Checks if running in Bun and displays version/platform info
 * 
 * Run with:
 *   bun --version
 *   bun run bun-version-check.ts
 */

console.info("🔍 Bun Runtime Detection Demo\n");

// Check if running in Bun
if (typeof Bun !== 'undefined') {
  console.info("✅ Running in Bun!");
  console.info("─".repeat(40));
  console.info("Bun version:", Bun.version);
  console.info("Platform:", Bun.platform);
  console.info("Has Bun.file:", typeof Bun.file === 'function');
  console.info("Has Bun.hash:", typeof Bun.hash === 'function');
  console.info("Has Bun.serve:", typeof Bun.serve === 'function');
  console.info("Has Bun.write:", typeof Bun.write === 'function');
  console.info("Has Bun.read:", typeof Bun.read === 'function');
  console.info("Has Bun.peek:", typeof Bun.peek === 'function');
  console.info("Has Bun.color:", typeof Bun.color === 'function');
  console.info("Has Bun.CookieMap:", typeof Bun.CookieMap === 'function');
  console.info("Has Bun.Glob:", typeof Bun.Glob === 'function');
  
  // Additional Bun APIs
  console.info("\n📦 Additional Bun APIs:");
  console.info("Has Bun.env:", typeof Bun.env === 'object');
  console.info("Has Bun.main:", typeof Bun.main === 'string');
  console.info("Has Bun.path:", typeof Bun.path === 'object');
  
  // Test some Bun functions
  console.info("\n🧪 Testing Bun Functions:");
  
  // Test Bun.file
  const testFile = Bun.file("/tmp/bun-test.txt");
  console.info("✅ Bun.file() works:", testFile !== undefined);
  
  // Test Bun.hash
  const hash = Bun.hash("test");
  console.info("✅ Bun.hash() works:", hash !== undefined, "(hash:", hash + ")");
  
  // Test Bun.color (if available)
  if (typeof Bun.color === 'function') {
    const colored = Bun.color("red", "ansi");
    console.info("Bun.color() works:", typeof colored === 'string');
  }
  
  console.info("\n✨ All Bun APIs detected successfully!");
  
} else {
  console.info("❌ Not running in Bun");
  console.info("   This script requires Bun runtime");
  console.info("   Install: npm install -g bun");
  console.info("   Run: bun run bun-version-check.ts");
}
