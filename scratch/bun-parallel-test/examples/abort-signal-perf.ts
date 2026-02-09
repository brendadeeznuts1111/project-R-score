// abort-signal-perf.ts — AbortSignal.abort() optimization benchmark
// Feature #17 — PR #26686 — Enhancement in Bun 1.3.9
//
// AbortSignal.abort() now skips Event creation when no listeners are attached,
// reducing overhead for the common "create-and-check" pattern.
//
// Run: bun run examples/abort-signal-perf.ts

const ITERATIONS = 100_000;

// Bench 1: AbortSignal.abort() — the optimized path (no listeners)
{
  const start = Bun.nanoseconds();
  for (let i = 0; i < ITERATIONS; i++) {
    const signal = AbortSignal.abort();
    if (!signal.aborted) throw new Error("should be aborted");
  }
  const elapsed = (Bun.nanoseconds() - start) / 1e6;
  console.log(`AbortSignal.abort() (no listeners)  ${ITERATIONS.toLocaleString()} ops in ${elapsed.toFixed(1)}ms`);
}

// Bench 2: AbortController + abort — the unoptimized path (has controller)
{
  const start = Bun.nanoseconds();
  for (let i = 0; i < ITERATIONS; i++) {
    const controller = new AbortController();
    controller.abort();
    if (!controller.signal.aborted) throw new Error("should be aborted");
  }
  const elapsed = (Bun.nanoseconds() - start) / 1e6;
  console.log(`AbortController.abort() (with ctrl)  ${ITERATIONS.toLocaleString()} ops in ${elapsed.toFixed(1)}ms`);
}

// Bench 3: AbortSignal.timeout — for comparison
{
  const start = Bun.nanoseconds();
  for (let i = 0; i < ITERATIONS; i++) {
    AbortSignal.timeout(1_000_000);
  }
  const elapsed = (Bun.nanoseconds() - start) / 1e6;
  console.log(`AbortSignal.timeout(1s)              ${ITERATIONS.toLocaleString()} ops in ${elapsed.toFixed(1)}ms`);
}
