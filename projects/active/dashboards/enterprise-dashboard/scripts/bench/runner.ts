#!/usr/bin/env bun
/**
 * Benchmark Runner
 * Aligned with Bun's official benchmark structure
 * Based on: https://github.com/oven-sh/bun/tree/main/bench
 * 
 * Usage:
 *   bun scripts/bench/runner.ts [benchmark-file]
 *   BENCHMARK_RUNNER=1 bun scripts/bench/runner.ts [benchmark-file]
 */

import * as Mitata from "mitata";
import process from "node:process";
import { resolve } from "path";

const asJSON = !!process?.env?.BENCHMARK_RUNNER;

/** @param {Parameters<typeof Mitata["run"]>["0"]} opts */
export function run(opts = {}) {
  if (asJSON) {
    opts.format = "json";
  }

  return Mitata.run(opts);
}

export const bench = Mitata.bench;
export const group = Mitata.group;
export const summary = Mitata.summary;

// If run directly, execute benchmarks from command line args
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("Usage: bun scripts/bench/runner.ts <benchmark-file>");
    console.error("Example: bun scripts/bench/runner.ts examples/bun-1.3.6-bench-mitata.ts");
    process.exit(1);
  }

  const benchmarkFile = resolve(args[0]);
  
  try {
    // Dynamically import and run the benchmark file
    await import(benchmarkFile);
  } catch (error) {
    console.error(`Failed to run benchmark: ${benchmarkFile}`);
    console.error(error);
    process.exit(1);
  }
}
