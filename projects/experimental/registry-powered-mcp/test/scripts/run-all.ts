#!/usr/bin/env bun
/**
 * Test Orchestration Script
 * Runs all test categories in sequence with reporting
 */

import { $ } from "bun";
import { readdirSync } from "node:fs";
import { join } from "node:path";

interface TestResult {
  category: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Check if a directory has any test files
 */
function hasTestFiles(dir: string): boolean {
  try {
    const files = readdirSync(dir, { recursive: true });
    return files.some((f) =>
      typeof f === "string" &&
      (f.endsWith(".test.ts") ||
        f.endsWith(".test.js") ||
        f.endsWith(".spec.ts") ||
        f.endsWith(".spec.js"))
    );
  } catch {
    return false;
  }
}

async function runTestCategory(
  category: string,
  path: string
): Promise<TestResult> {
  console.info(`\n${"=".repeat(60)}`);
  console.info(`Running ${category} tests...`);
  console.info(`${"=".repeat(60)}\n`);

  const start = Date.now();

  // Check if directory has test files
  if (!hasTestFiles(path)) {
    const duration = Date.now() - start;
    console.info(`\n⚠️  ${category} tests skipped - no test files found (${duration}ms)\n`);

    return {
      category,
      passed: true, // Treat empty test directories as passing
      duration,
    };
  }

  try {
    await $`bun test ${path}`;
    const duration = Date.now() - start;

    console.info(`\n✅ ${category} tests passed (${duration}ms)\n`);

    return {
      category,
      passed: true,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`\n❌ ${category} tests failed (${duration}ms)\n`);

    return {
      category,
      passed: false,
      duration,
      error: errorMessage,
    };
  }
}

async function main() {
  console.info("\n🚀 Running complete test suite\n");

  const startTime = Date.now();

  // Run test categories in order
  results.push(await runTestCategory("Unit", "test/unit"));
  results.push(await runTestCategory("Integration", "test/integration"));
  results.push(await runTestCategory("Regression", "test/regression"));
  results.push(await runTestCategory("Performance", "test/performance"));

  const totalDuration = Date.now() - startTime;

  // Print summary
  console.info(`\n${"=".repeat(60)}`);
  console.info("Test Suite Summary");
  console.info(`${"=".repeat(60)}\n`);

  for (const result of results) {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.info(
      `${status} ${result.category.padEnd(15)} ${result.duration.toString().padStart(6)}ms`
    );

    if (result.error) {
      console.info(`    Error: ${result.error}`);
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.info(`\n${"=".repeat(60)}`);
  console.info(
    `Total: ${results.length} categories | Passed: ${passed} | Failed: ${failed}`
  );
  console.info(`Duration: ${totalDuration}ms`);
  console.info(`${"=".repeat(60)}\n`);

  // Exit with appropriate code
  if (failed > 0) {
    console.error(`\n❌ Test suite failed with ${failed} failing categories\n`);
    process.exit(1);
  } else {
    console.info(`\n✅ All test categories passed!\n`);
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("Fatal error running tests:", error);
  process.exit(1);
});
