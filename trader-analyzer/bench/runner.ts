// Benchmark runner for trader-analyzer
// Uses mitata for benchmarking (Bun-native, fast)

import { bench, run, group } from "mitata";

const asJSON = !!process.env.BENCHMARK_RUNNER;

export { bench, group };

export async function execute(opts: Record<string, unknown> = {}) {
  if (asJSON) {
    opts.format = "json";
  }
  return run(opts);
}
