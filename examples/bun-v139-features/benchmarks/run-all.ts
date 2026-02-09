#!/usr/bin/env bun
/**
 * Run all Bun v1.3.9 benchmarks
 */

import { join } from "node:path";

const benchmarks = [
  { name: "RegExp JIT", file: "regex-benchmark.ts" },
];

async function runBenchmark(benchmark: typeof benchmarks[0]) {
  console.log("\n" + "=".repeat(70));
  console.log(`📊 ${benchmark.name}`);
  console.log("=".repeat(70));
  
  const proc = Bun.spawn({
    cmd: ["bun", "run", join(import.meta.dir, benchmark.file)],
    stdout: "inherit",
    stderr: "inherit",
  });
  
  await proc.exited;
  
  if (proc.exitCode !== 0) {
    console.log(`\n⚠️  Benchmark exited with code ${proc.exitCode}`);
  }
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 Bun v1.3.9 - All Benchmarks");
  console.log("=".repeat(70));
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}\n`);
  
  for (const benchmark of benchmarks) {
    await runBenchmark(benchmark);
    console.log("\n");
  }
  
  console.log("=".repeat(70));
  console.log("✅ All benchmarks complete!");
  console.log("=".repeat(70));
}

if (import.meta.main) {
  main();
}

export { main };
