#!/usr/bin/env bun
/**
 * Demo: Bun Test Timeouts
 * 
 * Per-test timeout configuration for bun:test
 * https://bun.com/docs/test/runtime-behavior#test-timeouts
 */

console.info("⏱️  Bun Test Timeouts Demo\n");
console.info("=".repeat(70));

console.info("\n📋 Example: Test with timeout parameter\n");

const exampleCode = `import { test, expect } from "bun:test";

// Fast test with 1 second timeout
test("fast test", () => {
  expect(1 + 1).toBe(2);
}, 1000); // ⬅️ 3rd argument = timeout in ms

// Slow test with 10 second timeout
test("slow test", async () => {
  await new Promise(resolve => setTimeout(resolve, 8000));
}, 10000);

// No timeout (unlimited)
test("no timeout", () => {
  // Can run forever
}, 0);`;

console.info(exampleCode);

console.info("\n📊 Timeout Behavior:");
console.info("-".repeat(70));
console.info("Default:        5000ms (5 seconds)");
console.info("Override:       test(name, fn, timeoutMs)");
console.info("Disable:        test(name, fn, 0)");
console.info("Applies to:     Both sync and async tests");

console.info("\n✅ Key Points:");
console.info("  • 3rd argument to test() is timeout in milliseconds");
console.info("  • Default is 5000ms for bun test");
console.info("  • Set to 0 to disable timeout completely");
console.info("  • Works with both sync and async tests");
console.info("  • Test fails with timeout error if exceeded");

console.info("\n🚀 Run with:");
console.info("  bun test my-test.ts");

console.info("\n⚙️  CLI Flags Integration:");
console.info("-".repeat(70));
console.info("bun test --timeout 10000       # Set default timeout to 10s");
console.info("bun test --bail                # Stop on first failure");
console.info("bun test --test-name-pattern   # Run tests matching pattern");
console.info("");
console.info("Example:");
console.info("  bun test --timeout 30000 --bail tests/");
console.info("    (30s timeout, stop on first fail, run all in tests/)");
