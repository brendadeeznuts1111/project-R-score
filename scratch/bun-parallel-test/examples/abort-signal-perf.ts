// abort-signal-perf.ts — AbortSignal.abort() optimization benchmark
// Feature #17 — PR #26686 — Enhancement in Bun 1.3.9
//
// AbortSignal.abort() now skips Event creation and dispatch when no
// listeners are attached. Release notes report ~6% improvement:
//   no listener:   271ms → 255ms per 1M calls (~16ms saved)
//   with listener: 368ms → 370ms (same — optimization doesn't apply)
//
// Run: bun run examples/abort-signal-perf.ts

const N = 1_000_000;

function bench(label: string, fn: () => number) {
  // Warmup
  for (let i = 0; i < 100_000; i++) fn();

  let events = 0;
  const start = Bun.nanoseconds();
  for (let i = 0; i < N; i++) events += fn();
  const elapsed = (Bun.nanoseconds() - start) / 1e6;
  console.log(
    `${label.padEnd(44)} ${N.toLocaleString()} ops in ${elapsed.toFixed(1).padStart(7)}ms  events: ${events.toLocaleString()}`
  );
}

// Optimized path — no listeners, skips Event object creation
bench("AbortSignal.abort() (no listeners)", () => {
  AbortSignal.abort();
  return 0;
});

// AbortController, no listener — also benefits from optimization
bench("AbortController (no listener)", () => {
  const c = new AbortController();
  c.abort();
  return 0;
});

// AbortController WITH listener — must create and dispatch Event object
bench("AbortController (with listener)", () => {
  let fired = 0;
  const c = new AbortController();
  c.signal.addEventListener("abort", () => { fired++; });
  c.abort();
  return fired;
});
