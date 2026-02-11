#!/usr/bin/env bun
/**
 * Demo: Bun Test Execution Control
 * 
 * Concurrent execution, randomization, reruns, bail, watch mode
 * https://bun.com/docs/test#execution-control
 */

console.log("⚡ Bun Test Execution Control Demo\n");
console.log("=".repeat(70));

console.log("\n🔄 Concurrent Execution:\n");
console.log("-".repeat(70));

const concurrentExample = `// Run all tests concurrently
bun test --concurrent

// Limit concurrent tests
bun test --concurrent --max-concurrency 4

// Mark specific tests as concurrent
import { test, expect } from "bun:test";

test.concurrent("API call 1", async () => {
  await fetch("/api/1");
  expect(true).toBe(true);
});

test.concurrent("API call 2", async () => {
  await fetch("/api/2");
  expect(true).toBe(true);
});

// Force sequential execution
let sharedState = 0;
test.serial("step 1", () => {
  sharedState = 1;
});
test.serial("step 2", () => {
  expect(sharedState).toBe(1);
});`;

console.log(concurrentExample);

console.log("\n🎲 Randomize & Rerun:\n");
console.log("-".repeat(70));

const randomExample = `// Run tests in random order (detects test interdependencies)
bun test --randomize

// Reproduce specific random order with seed
bun test --seed 12345

// Run each test multiple times (detect flaky tests)
bun test --rerun-each 100`;

console.log(randomExample);

console.log("\n🛑 Bail & Watch:\n");
console.log("-".repeat(70));

const bailExample = `// Stop after first failure
bun test --bail

// Stop after N failures
bun test --bail=10

// Watch mode - re-run on file changes
bun test --watch`;

console.log(bailExample);

console.log("\n📊 CI/CD Integration:\n");
console.log("-".repeat(70));

const ciExample = `// JUnit XML report (GitLab, Jenkins, etc.)
bun test --reporter=junit --reporter-outfile=./bun.xml

// GitHub Actions (auto-detected, no config needed)
// Just run: bun test`;

console.log(ciExample);

console.log("\n✅ Key Points:");
console.log("  • --concurrent: Run tests in parallel (default: sequential)");
console.log("  • --max-concurrency: Limit parallel tests (default: 20)");
console.log("  • --randomize: Detect order-dependent tests");
console.log("  • --seed: Reproduce random test order");
console.log("  • --rerun-each: Detect flaky tests");
console.log("  • --bail: Stop early on failure");
console.log("  • --watch: Auto-re-run on changes");
console.log("  • test.concurrent/test.serial: Control individual tests");
