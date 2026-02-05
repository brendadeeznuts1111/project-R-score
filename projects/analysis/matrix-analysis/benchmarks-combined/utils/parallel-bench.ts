#!/usr/bin/env bun
// Parallel fetch stress test with concurrency control
// Usage: BUN_CONFIG_MAX_HTTP_REQUESTS=2048 bun scripts/bench/parallel-bench.ts
// With preconnect: BUN_CONFIG_MAX_HTTP_REQUESTS=2048 bun --fetch-preconnect https://api.github.com scripts/bench/parallel-bench.ts

import { dns } from "bun";

const CONCURRENCY = parseInt(process.env.BENCH_CONCURRENCY || "50");
const ITERATIONS = parseInt(process.env.BENCH_ITERATIONS || "5");
const TARGET_HOST = process.env.BENCH_HOST || "https://api.github.com";

interface BenchResult {
  iteration: number;
  concurrency: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  errors: number;
}

async function runIteration(iteration: number): Promise<BenchResult> {
  const requests = Array(CONCURRENCY).fill(TARGET_HOST);
  const latencies: number[] = [];
  let errors = 0;

  const start = Bun.nanoseconds();

  await Promise.all(
    requests.map(async (url) => {
      const reqStart = Bun.nanoseconds();
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (!res.ok) errors++;
        latencies.push((Bun.nanoseconds() - reqStart) / 1_000_000);
      } catch {
        errors++;
        latencies.push((Bun.nanoseconds() - reqStart) / 1_000_000);
      }
    })
  );

  const totalMs = (Bun.nanoseconds() - start) / 1_000_000;

  return {
    iteration,
    concurrency: CONCURRENCY,
    totalMs,
    avgMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    minMs: Math.min(...latencies),
    maxMs: Math.max(...latencies),
    errors,
  };
}

console.log(`Parallel Fetch Stress Test`);
console.log(`Target: ${TARGET_HOST}`);
console.log(`Concurrency: ${CONCURRENCY}`);
console.log(`Iterations: ${ITERATIONS}`);
console.log(`Max HTTP Requests: ${process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || "256 (default)"}`);
console.log(`Preconnect: ${process.env.BUN_FETCH_PRECONNECT ? "CLI flag" : "none"}`);
console.log("");

// Warm up DNS
dns.prefetch(new URL(TARGET_HOST).hostname, 443);
await Bun.sleep(100);

const results: BenchResult[] = [];

for (let i = 1; i <= ITERATIONS; i++) {
  const result = await runIteration(i);
  results.push(result);
  console.log(`Iteration ${i}: ${result.totalMs.toFixed(0)}ms total, ${result.avgMs.toFixed(1)}ms avg, ${result.errors} errors`);
  await Bun.sleep(500); // Brief pause between iterations
}

console.log("");
console.log(Bun.inspect.table(results.map(r => ({
  "#": r.iteration,
  "Total (ms)": r.totalMs.toFixed(0),
  "Avg (ms)": r.avgMs.toFixed(1),
  "Min (ms)": r.minMs.toFixed(1),
  "Max (ms)": r.maxMs.toFixed(1),
  Errors: r.errors,
}))));

// Summary
const avgTotal = results.reduce((sum, r) => sum + r.totalMs, 0) / results.length;
const avgLatency = results.reduce((sum, r) => sum + r.avgMs, 0) / results.length;
console.log("");
console.log(`Summary: ${avgTotal.toFixed(0)}ms avg total, ${avgLatency.toFixed(1)}ms avg latency`);
