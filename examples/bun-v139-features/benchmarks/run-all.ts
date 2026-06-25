#!/usr/bin/env bun
/**
 * Run all Bun v1.3.9 benchmarks
 */

import { join } from "node:path";

const benchmarks = [
  { name: "RegExp JIT", file: "regex-benchmark.ts" },
];

async function runBenchmark(benchmark: typeof benchmarks[0]) {
  console.info("\n" + "=".repeat(70));
  console.info(`📊 ${benchmark.name}`);
  console.info("=".repeat(70));
  
  const proc = Bun.spawn({
    cmd: ["bun", "run", join(import.meta.dir, benchmark.file)],
    stdout: "inherit",
    stderr: "inherit",
  });
  
  await proc.exited;
  
  if (proc.exitCode !== 0) {
    console.info(`\n⚠️  Benchmark exited with code ${proc.exitCode}`);
  }
}

async function main() {
  console.info("\n" + "=".repeat(70));
  console.info("🚀 Bun v1.3.9 - All Benchmarks");
  console.info("=".repeat(70));
  console.info(`Bun version: ${Bun.version}`);
  console.info(`Platform: ${process.platform} ${process.arch}\n`);
  
  for (const benchmark of benchmarks) {
    await runBenchmark(benchmark);
    console.info("\n");
  }
  
  console.info("=".repeat(70));
  console.info("✅ All benchmarks complete!");
  console.info("=".repeat(70));
}

if (import.meta.main) {
  main();
}

export { main };
