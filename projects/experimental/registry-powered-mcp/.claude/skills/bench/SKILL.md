---
name: bench
description: Run performance benchmarks for the registry. Use when testing performance, measuring latency, checking throughput, running the benchmark suite, or analyzing routing/memory/dispatch performance.
---

# Benchmark Runner

Run performance benchmarks using Bun's native test runner.

## Usage

```text
/bench              - Run all benchmarks
/bench routing      - Run routing benchmarks
/bench memory       - Run memory benchmarks
/bench dispatch     - Run dispatch benchmarks
/bench cold-start   - Run cold start benchmarks
/bench federation   - Run federation matrix benchmarks
/bench redis        - Run Redis performance benchmarks
/bench --quick      - Quick run with fewer iterations
```

## Performance Targets (SLA)

| Target | Value | Description |
|--------|-------|-------------|
| Dispatch latency | <0.03ms | URLPattern match + param extraction |
| Route test | <0.01ms | URLPattern.test() only |
| P99 latency | 10.8ms | 99th percentile request cycle |
| Bundle size | 9.64KB | Minified standalone binary |
| Heap reduction | -14% | vs Node.js baseline |

## Additional Flags

```text
/bench --json           - Output JSON for CI integration
/bench --compare <file> - Compare against baseline file
/bench --save <file>    - Save results as baseline
/bench integration      - Run integration benchmarks
```

## Examples

```bash
# Run full benchmark suite
bun run bench

# Check routing performance
/bench routing

# Quick validation
/bench --quick

# Save baseline for CI
/bench --save benchmarks/baseline.json

# Compare against baseline
/bench --compare benchmarks/baseline.json
```

## Performance Tiers

| Tier | Threshold | Indicator |
|------|-----------|-----------|
| EXCELLENT | <80% of target | Green |
| GOOD | <100% of target | Blue |
| ACCEPTABLE | <120% of target | Yellow |
| POOR | >120% of target | Red |

## Related Skills

- `/test` - Run test suites
- `/metrics` - View system metrics
- `/dev` - Development server
