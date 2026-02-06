---
name: bench
description: "Use when user wants to benchmark scripts, measure performance, compare timings, or run performance tests: iterations, warmup, cold/hot cache, stats, comparison"
user-invocable: true
version: 1.0.0
---

# /bench - Performance Benchmark Harness

Run performance benchmarks on scripts with statistical analysis.

## Implementation

Execute the benchmark harness:

```bash
bun ~/.claude/scripts/bench.ts [script] [options]
```

## Quick Reference

- **`/bench`** — Run enterprise benchmark suite (default)
- **`/bench --suite --report`** — Suite with HTML report
- **`/bench --suite --check 10`** — CI: fail if >10% regression
- **`/bench --suite --json`** — JSON output for pipelines
- **`/bench matrix`** — Benchmark single script
- **`/bench matrix -n 10`** — Run 10 iterations
- **`/bench --list`** — List available scripts
- **`/bench matrix --save`** — Save result to JSON
- **`/bench matrix --compare baseline.json`** — Compare to baseline
- **`/bench matrix --histogram`** — Show timing distribution
- **`/bench matrix --history`** — Show historical trends
- **`/bench matrix --check 5`** — CI mode: fail on >5% regression
- **`/bench matrix --watch`** — Live mode: continuous benchmarking
- **`/bench matrix -i`** — Interactive baseline selection

## Options

### Suite Mode (default)

- **`--suite`** — Run all core benchmarks with dashboard
- **`--report`** — Generate HTML report
- **`--check [N]`** — CI mode: exit 1 if any script > N% (default: 10%)
- **`--json`** — Output suite results as JSON
- **`-n, --iterations`** — Iterations per script (default: 3)
- **`-w, --warmup`** — Warmup runs per script (default: 1)

### Single Script Mode

- **`-n, --iterations`** — Number of timed runs (default: 5)
- **`-w, --warmup`** — Number of warmup runs (default: 2)
- **`--save`** — Save result to JSON file
- **`--compare <file>`** — Compare against baseline
- **`--json`** — Output JSON only
- **`--histogram`** — Show timing distribution histogram
- **`--history`** — Show historical benchmark trends
- **`--check [N]`** — CI mode: exit 1 if regression > N% (default: 5%)
- **`--no-record`** — Don't save to history database
- **`--watch [N]`** — Live mode: benchmark every N ms (default: 2000)
- **`-i, --interactive`** — Select baseline from history

## Statistics Reported

- **Min** — Fastest run time
- **Max** — Slowest run time
- **Mean** — Average run time
- **Median** — Middle run time
- **Std Dev** — Timing variability
- **P95** — 95th percentile
- **Cold** — First run (no JIT/cache)

## Memory Profile

- **Peak Heap** — Maximum heap memory used
- **Current Heap** — Heap memory at end of run
- **Freed** — Memory reclaimed during run
- **Heap Total** — Total heap size allocated
- **External** — Memory used by C++ objects
- **RSS (Peak)** — Peak resident set size

## Hotpath & Cache Handling

The harness handles JIT optimization and filesystem caching:

1. **Cold run** - Measured before any warmup (captures startup cost)
2. **Warmup runs** - Prime JIT compiler and filesystem cache (not timed)
3. **Timed runs** - Post-warmup with GC between runs

## Comparison Verdicts

- **:rocket: FASTER** — >5% improvement
- **:turtle: SLOWER** — >5% regression
- **:arrow_right: UNCHANGED** — +/-5%

## Enterprise Dashboard

Running `/bench` without arguments launches the enterprise suite:

```
══════════════════════════════════════════════════════════════════════
  🏢 ENTERPRISE BENCHMARK SUITE
══════════════════════════════════════════════════════════════════════

  📋 Scripts: 5
  🔄 Iterations: 3 (+ 1 warmup)
  🖥️  System: Apple M4
  📦 Bun: v1.3.6

──────────────────────────────────────────────────────────────────────

📊 BENCHMARK DASHBOARD

┌────────┬──────────────┬────────┬────────┬───────┬──────────┐
│ Status │ Script       │ Median │ Change │ Trend │ Health   │
├────────┼──────────────┼────────┼────────┼───────┼──────────┤
│ ✅     │ matrix       │ 1.52s  │ -2.1%  │ ▃▄▅▄▃ │ GOOD     │
│ 🚀     │ quick-wins   │ 180ms  │ -12.5% │ ▅▄▃▂▁ │ EXCELLENT│
│ ➡️     │ quick-wins-2 │ 115ms  │ +0.8%  │ ▄▄▄▄▄ │ STABLE   │
│ ⚠️     │ quick-wins-3 │ 620ms  │ +8.2%  │ ▂▃▄▅▆ │ WARNING  │
│ 🆕     │ quick-wins-4 │ 880ms  │ -      │ -     │ NEW      │
└────────┴──────────────┴────────┴────────┴───────┴──────────┘
```

### Health Statuses

- **🚀 EXCELLENT** — >10% faster
- **✅ GOOD** — 5-10% faster
- **➡️ STABLE** — +/-5%
- **⚠️ WARNING** — 5-15% slower
- **🔴 CRITICAL** — >15% slower
- **🆕 NEW** — No baseline

### CI/CD Integration

```bash
# GitHub Actions / CI pipelines
bun bench.ts --suite --check 10    # Fail if >10% regression
bun bench.ts --suite --json        # JSON for artifacts
bun bench.ts --suite --report      # HTML report
```

## Available Scripts

- **`matrix`** — Lockfile health matrix scanner
- **`lockfile-matrix`** — Alias for matrix
- **`quick-wins`** — Quick Wins Round 1 - Matrix column optimizations (#1-4)
- **`quick-wins-1`** — Alias for quick-wins
- **`buffer-includes`** — Buffer.indexOf/includes SIMD (99,999 runs, 44.5KB)
- **`spawn-sync`** — Bun.spawnSync close_range fix (100 spawns, Linux)

## Recent Benchmark Standards (Tier-1380)

| API | Baseline | Standard |
|-----|----------|----------|
| Buffer.indexOf / Buffer.includes | SIMD 2x | 99,999 runs, 44.5KB buffer; .includes true ~22ms, .includes false ~1.4s |
| Bun.spawnSync | close_range 30x | 100× `Bun.spawnSync(["true"])`; Linux ~0.4ms, legacy ~13ms |

## CPU/Heap Profiling (Bun 1.3.7+)

Generate detailed profiling reports with markdown output for LLM analysis:

```bash
# CPU profile only (markdown format)
bun --cpu-prof-md script.ts

# CPU profile (both JSON + markdown)
bun --cpu-prof --cpu-prof-md script.ts

# Full profiling (CPU + heap)
bun --cpu-prof --cpu-prof-md --heap-prof --heap-prof-md script.ts

# Custom output location
bun --cpu-prof --cpu-prof-md --cpu-prof-dir=./profiles --cpu-prof-name=my-profile script.ts

# Using the profile helper
bun ~/.claude/benchmarks/scripts/profile-md.ts <script> [name]
```

### Profile Output Format

The markdown profile includes:
- **Top 10 hot functions** with self-time percentages
- **Call tree** with hierarchical execution flow
- **Function details** with caller/callee relationships
- **File breakdown** showing time spent per source file

### Profile Flags Reference

- **`--cpu-prof`** — Generate Chrome DevTools JSON profile
- **`--cpu-prof-md`** — Generate markdown CPU profile (LLM-friendly)
- **`--cpu-prof-name=<name>`** — Custom profile filename
- **`--cpu-prof-dir=<dir>`** — Output directory
- **`--heap-prof`** — Generate V8 heap snapshot
- **`--heap-prof-md`** — Generate markdown heap profile

### Grep Patterns for Profile Analysis

```bash
# CPU Profile (markdown)
grep '| .* | `' profile.md              # All function entries
grep -E '\| [5-9][0-9]\.[0-9]%' profile.md  # Functions using >50% time
grep 'Self:.*Total:' profile.md         # Function details section

# Heap Profile (markdown)
grep 'type=Function' profile.md         # Find all Function objects
grep 'size=[0-9]\{5,\}' profile.md      # Find objects >= 10KB
grep 'gcroot=1' profile.md              # Find all GC roots
grep 'type=Array' profile.md            # Find all arrays
grep 'retainers=' profile.md            # Objects with retention info
```

## Adding New Scripts

Edit `~/.claude/scripts/bench.ts` and add to `BENCHMARKABLE_SCRIPTS`:

```typescript
const BENCHMARKABLE_SCRIPTS = {
  "my-script": {
    file: "my-script.ts",
    args: ["--quiet"],
    description: "Description of script",
  },
};
```
