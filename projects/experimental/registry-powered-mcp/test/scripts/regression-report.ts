#!/usr/bin/env bun
/**
 * Regression Test Report
 * Scans and reports on regression test coverage
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

async function main() {
  console.info("\n🔍 Regression Test Report\n");

  const regressionDir = join(import.meta.dir, "../regression/issue");

  try {
    const files = readdirSync(regressionDir);
    const testFiles = files.filter((f) => f.endsWith(".test.ts"));

    if (testFiles.length === 0) {
      console.info("📝 No regression tests found yet\n");
      console.info("Regression tests should be added to test/regression/issue/");
      console.info("When fixing a bug:");
      console.info("  1. Create GitHub issue");
      console.info("  2. Create test/regression/issue/NNNN.test.ts");
      console.info("  3. Write failing test");
      console.info("  4. Fix the bug");
      console.info("  5. Verify test passes");
      console.info("  6. Commit both test and fix\n");
    } else {
      console.info(`Found ${testFiles.length} regression test(s):\n`);

      for (const file of testFiles.sort()) {
        const issueNumber = file.replace(".test.ts", "");
        console.info(`  ✓ Issue #${issueNumber} - ${file}`);
      }

      console.info(`\n${testFiles.length} issue(s) protected by regression tests\n`);
    }

    // Run regression tests
    console.info("Running regression tests...\n");

    try {
      await Bun.$`bun test ${regressionDir}`;
      console.info("\n✅ All regression tests passed\n");
      process.exit(0);
    } catch (error) {
      console.error("\n❌ Some regression tests failed\n");
      console.error("This indicates a regression - a previously fixed bug has returned!");
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.info("📝 Regression test directory not found\n");
      console.info("Creating test/regression/issue/ directory...\n");
      process.exit(0);
    }

    console.error("Error reading regression tests:", error);
    process.exit(1);
  }
}

main();
