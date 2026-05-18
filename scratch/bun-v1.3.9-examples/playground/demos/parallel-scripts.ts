#!/usr/bin/env bun
/**
 * Demo: bun run --parallel and --sequential
 * 
 * Showcases script orchestration features
 */

import { join } from "node:path";

console.info("🚀 Bun v1.3.9: Parallel & Sequential Script Execution\n");
console.info("=".repeat(70));

// Create a temporary package.json for demonstration
const demoDir = import.meta.dir;
const packageJson = {
  name: "demo-package",
  version: "1.0.0",
  scripts: {
    "build": "echo '[build] Building...' && sleep 0.5 && echo '[build] Build complete'",
    "test": "echo '[test] Running tests...' && sleep 0.5 && echo '[test] Tests passed'",
    "lint": "echo '[lint] Checking files...' && sleep 0.3 && echo '[lint] Lint complete'",
    "prebuild": "echo '[prebuild] Preparing build...'",
    "postbuild": "echo '[postbuild] Build cleanup...'",
  }
};

// Write package.json (Bun requires it to be named exactly package.json)
const packageJsonPath = join(demoDir, "package.json");
await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.info("\n📦 Example 1: Parallel Execution");
console.info("Command: bun run --parallel build test lint");
console.info("-".repeat(70));

const parallelProc = Bun.spawn({
  cmd: ["bun", "run", "--parallel", "build", "test", "lint"],
  cwd: demoDir,
  env: { ...process.env, PATH: process.env.PATH },
  stdout: "inherit",
  stderr: "inherit",
});

await parallelProc.exited;

console.info("\n📦 Example 2: Sequential Execution");
console.info("Command: bun run --sequential build test lint");
console.info("-".repeat(70));

const sequentialProc = Bun.spawn({
  cmd: ["bun", "run", "--sequential", "build", "test", "lint"],
  cwd: demoDir,
  env: { ...process.env, PATH: process.env.PATH },
  stdout: "inherit",
  stderr: "inherit",
});

await sequentialProc.exited;

console.info("\n📦 Example 3: Pre/Post Script Grouping");
console.info("Command: bun run --parallel build test");
console.info("Notice: prebuild → build → postbuild runs as a group");
console.info("-".repeat(70));

const groupedProc = Bun.spawn({
  cmd: ["bun", "run", "--parallel", "build", "test"],
  cwd: demoDir,
  env: { ...process.env, PATH: process.env.PATH },
  stdout: "inherit",
  stderr: "inherit",
});

await groupedProc.exited;

console.info("\n✅ Demo complete!");
console.info("\nKey Features:");
console.info("  • --parallel: Starts all scripts immediately, interleaved output");
console.info("  • --sequential: Runs scripts one at a time, sequential output");
console.info("  • Pre/post scripts: Automatically grouped with main script");
console.info("  • Output format: 'script-name | output'");

// Cleanup
try {
  const file = Bun.file(packageJsonPath);
  if (await file.exists()) {
    await file.unlink();
  }
} catch {
    console.error('Unhandled error:', error);
  }
