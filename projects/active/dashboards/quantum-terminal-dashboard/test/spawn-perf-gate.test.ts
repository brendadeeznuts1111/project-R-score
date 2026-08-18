// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// test/spawn-perf-gate.test.ts
// Performance gate tests for Bun.spawnSync
// Ensures spawn performance stays within acceptable thresholds
//
// Baseline measurements (Apple Silicon M-series):
// - spawnSync(['true']): ~2ms per call
// - spawnSync(['echo', 'hello']): ~1.5ms per call
// - 100 sequential spawns: ~100-200ms total
//
// These gates catch significant regressions (>2x slowdown)

import { test, expect, describe } from "bun:test";

describe("spawnSync Performance Gates", () => {
  // ARM64 tests (Apple Silicon, AWS Graviton, etc.)
  test("[PERF] spawnSync ≤ 5 ms ARM64", () => {
    if (process.arch !== "arm64") return;
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) Bun.spawnSync(["true"]);
    const avgMs = (performance.now() - t0) / 100;
    console.info(`  ARM64 spawnSync avg: ${avgMs.toFixed(2)}ms`);
    expect(avgMs).toBeLessThan(5); // Gate: catch >2x regression
  });

  // x64 tests (Intel/AMD)
  test("[PERF] spawnSync ≤ 5 ms x64", () => {
    if (process.arch !== "x64") return;
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) Bun.spawnSync(["true"]);
    const avgMs = (performance.now() - t0) / 100;
    console.info(`  x64 spawnSync avg: ${avgMs.toFixed(2)}ms`);
    expect(avgMs).toBeLessThan(5);
  });

  test("[PERF] spawnSync with args ≤ 5 ms ARM64", () => {
    if (process.arch !== "arm64") return;
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) Bun.spawnSync(["echo", "hello"]);
    const avgMs = (performance.now() - t0) / 100;
    console.info(`  ARM64 spawnSync+args avg: ${avgMs.toFixed(2)}ms`);
    expect(avgMs).toBeLessThan(5);
  });

  test("[PERF] spawnSync stdout capture ≤ 5 ms ARM64", () => {
    if (process.arch !== "arm64") return;
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) {
      const result = Bun.spawnSync(["echo", "test"]);
      result.stdout;
    }
    const avgMs = (performance.now() - t0) / 100;
    console.info(`  ARM64 spawnSync+stdout avg: ${avgMs.toFixed(2)}ms`);
    expect(avgMs).toBeLessThan(5);
  });

  test("[PERF] 100 sequential spawns < 500 ms ARM64", () => {
    if (process.arch !== "arm64") return;
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) Bun.spawnSync(["true"]);
    const totalMs = performance.now() - t0;
    console.info(`  ARM64 100x spawns total: ${totalMs.toFixed(2)}ms`);
    expect(totalMs).toBeLessThan(500);
  });

  // Comparison test: measure actual performance for documentation
  test("[INFO] spawnSync baseline measurement", () => {
    const iterations = 50;
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) Bun.spawnSync(["true"]);
    const avgMs = (performance.now() - t0) / iterations;

    console.info(`\n  📊 spawnSync Performance Baseline`);
    console.info(`  ─────────────────────────────────`);
    console.info(`  Architecture: ${process.arch}`);
    console.info(`  Iterations: ${iterations}`);
    console.info(`  Avg per spawn: ${avgMs.toFixed(2)}ms`);
    console.info(`  Throughput: ${Math.round(1000 / avgMs)} spawns/sec\n`);

    // This test always passes - it's for info only
    expect(true).toBe(true);
  });
});

