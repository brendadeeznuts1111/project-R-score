/**
 * /bench - Run performance benchmarks using Bun's native APIs
 *
 * Usage:
 *   /bench              - Run all benchmarks (bun run bench)
 *   /bench routing      - Run routing benchmarks
 *   /bench memory       - Run memory benchmarks
 *   /bench dispatch     - Run dispatch benchmarks
 *   /bench cold-start   - Run cold start benchmarks
 *   /bench --quick      - Quick run with fewer iterations
 *
 * @see https://bun.com/docs/test
 */

export default async function bench(args?: string) {
  const parts = args?.trim().split(/\s+/) || [];

  // Check for specific benchmark file
  const benchmarkFiles: Record<string, string> = {
    routing: "test/performance/routing.perf.test.ts",
    memory: "test/performance/memory.perf.test.ts",
    dispatch: "test/performance/dispatch.perf.test.ts",
    "cold-start": "test/performance/cold-start.perf.test.ts",
    federation: "test/performance/federation-matrix.perf.test.ts",
    redis: "test/performance/redis-performance.test.ts",
  };

  let command: string[];
  const target = parts[0]?.toLowerCase();

  if (target && benchmarkFiles[target]) {
    // Run specific benchmark
    command = ["bun", "test", benchmarkFiles[target]];
    console.log(`\n📊 Running ${target} benchmarks...\n`);
  } else if (target === "--quick" || parts.includes("--quick")) {
    // Quick benchmark mode
    command = ["bun", "test", "test/performance/", "--bail"];
    console.log(`\n⚡ Quick benchmark mode...\n`);
  } else {
    // Run full benchmark suite
    command = ["bun", "run", "bench"];
    console.log(`\n📊 Running full benchmark suite...\n`);
  }

  const proc = Bun.spawn(command, {
    cwd: process.cwd(),
    stdout: "inherit",
    stderr: "inherit",
  });

  await proc.exited;
  return proc.exitCode === 0;
}
