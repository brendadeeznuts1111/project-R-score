#!/usr/bin/env bun
/**
 * Demo: Bun Test Timeouts
 * 
 * Per-test timeout configuration for bun:test
 * https://bun.com/docs/test/runtime-behavior#timeouts
 */

console.log("⏱️  Bun Test Timeouts Demo\n");
console.log("=".repeat(70));

console.log("\n📋 Example: Test with timeout parameter\n");

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

console.log(exampleCode);

console.log("\n📊 Timeout Behavior:");
console.log("-".repeat(70));
console.log("Default:        5000ms (5 seconds)");
console.log("Override:       test(name, fn, timeoutMs)");
console.log("Disable:        test(name, fn, 0)");
console.log("Applies to:     Both sync and async tests");

console.log("\n✅ Key Points:");
console.log("  • 3rd argument to test() is timeout in milliseconds");
console.log("  • Default is 5000ms for bun test");
console.log("  • Set to 0 to disable timeout completely");
console.log("  • Works with both sync and async tests");
console.log("  • Test fails with timeout error if exceeded");

console.log("\n🚀 Run with:");
console.log("  bun test my-test.ts");
