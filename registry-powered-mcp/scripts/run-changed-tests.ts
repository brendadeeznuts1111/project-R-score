#!/usr/bin/env bun

/**
 * Run tests for changed files
 * Detects modified files via git and runs related test files
 */

import { $ } from "bun";

async function getChangedFiles(): Promise<string[]> {
  // Get staged + unstaged changes
  const { stdout: diffOutput } = await $`git diff --name-only HEAD`.quiet().nothrow();
  const { stdout: stagedOutput } = await $`git diff --name-only --cached`.quiet().nothrow();

  const files = new Set<string>();

  for (const line of diffOutput.toString().split("\n")) {
    if (line.trim()) files.add(line.trim());
  }
  for (const line of stagedOutput.toString().split("\n")) {
    if (line.trim()) files.add(line.trim());
  }

  return [...files];
}

function findRelatedTests(changedFiles: string[]): string[] {
  const testFiles = new Set<string>();

  for (const file of changedFiles) {
    // Skip non-source files
    if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;

    // If it's already a test file, include it directly
    if (file.includes(".test.") || file.includes(".spec.")) {
      testFiles.add(file);
      continue;
    }

    // Extract base name for pattern matching
    const baseName = file
      .replace(/\.tsx?$/, "")
      .replace(/^.*\//, ""); // Get filename without path

    // Add patterns to find related tests
    testFiles.add(`test/**/*${baseName}*`);
  }

  return [...testFiles];
}

async function main() {
  const changedFiles = await getChangedFiles();

  if (changedFiles.length === 0) {
    console.log("No changed files detected");
    process.exit(0);
  }

  console.log(`📝 Changed files (${changedFiles.length}):`);
  for (const file of changedFiles.slice(0, 10)) {
    console.log(`   ${file}`);
  }
  if (changedFiles.length > 10) {
    console.log(`   ... and ${changedFiles.length - 10} more`);
  }
  console.log();

  const testPatterns = findRelatedTests(changedFiles);

  if (testPatterns.length === 0) {
    console.log("No related test files found");
    process.exit(0);
  }

  console.log(`🧪 Running tests for patterns:`);
  for (const pattern of testPatterns) {
    console.log(`   ${pattern}`);
  }
  console.log();

  // Run bun test with the patterns
  const proc = Bun.spawn(["bun", "test", ...testPatterns], {
    cwd: process.cwd(),
    stdio: ["inherit", "inherit", "inherit"],
  });

  const exitCode = await proc.exited;
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
