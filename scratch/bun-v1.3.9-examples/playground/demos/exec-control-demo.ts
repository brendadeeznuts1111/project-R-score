#!/usr/bin/env bun
/**
 * Demo: Bun Test Execution Control
 * 
 * Concurrent execution, randomization, reruns, bail, watch mode
 * https://bun.com/docs/test#execution-control
 */

console.info("⚡ Bun Test Execution Control Demo\n");
console.info("=".repeat(70));

console.info("\n🔄 Concurrent Execution:\n");
console.info("-".repeat(70));

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

console.info(concurrentExample);

console.info("\n🎲 Randomize & Rerun:\n");
console.info("-".repeat(70));

const randomExample = `// Run tests in random order (detects test interdependencies)
bun test --randomize

// Reproduce specific random order with seed
bun test --seed 12345

// Run each test multiple times (detect flaky tests)
bun test --rerun-each 100`;

console.info(randomExample);

console.info("\n🛑 Bail & Watch:\n");
console.info("-".repeat(70));

const bailExample = `// Stop after first failure
bun test --bail

// Stop after N failures
bun test --bail=10

// Watch mode - re-run on file changes
bun test --watch`;

console.info(bailExample);

console.info("\n📊 CI/CD Integration:\n");
console.info("-".repeat(70));

const ciExample = `// JUnit XML report (GitLab, Jenkins, etc.)
bun test --reporter=junit --reporter-outfile=./bun.xml

// GitHub Actions (auto-detected, no config needed)
// Just run: bun test`;

console.info(ciExample);

console.info("\n✅ Key Points:");
console.info("  • --concurrent: Run tests in parallel (default: sequential)");
console.info("  • --max-concurrency: Limit parallel tests (default: 20)");
console.info("  • --randomize: Detect order-dependent tests");
console.info("  • --seed: Reproduce random test order");
console.info("  • --rerun-each: Detect flaky tests");
console.info("  • --bail: Stop early on failure");
console.info("  • --watch: Auto-re-run on changes");
console.info("  • test.concurrent/test.serial: Control individual tests");
