# /bench - Performance Benchmark Harness

Run performance benchmarks on scripts with statistical analysis.

## Quick Reference

### Commands
| Command | Description |
|---------|-------------|
| `/bench matrix` | Benchmark lockfile matrix scanner |
| `/bench matrix -n 10` | Run 10 iterations |
| `/bench --list` | List available scripts |
| `/bench matrix --save` | Save result to JSON |
| `/bench matrix --compare baseline.json` | Compare to baseline |

### Options
| Flag | Description | Default |
|------|-------------|---------|
| `-n, --iterations` | Number of timed runs | 5 |
| `-w, --warmup` | Number of warmup runs | 2 |
| `--save` | Save result to JSON file | - |
| `--compare <file>` | Compare against baseline | - |
| `--json` | Output JSON only | - |

### Statistics Reported
| Stat | Description |
|------|-------------|
| Min | Fastest run time |
| Max | Slowest run time |
| Mean | Average run time |
| Median | Middle run time |
| Std Dev | Timing variability |
| P95 | 95th percentile |

### Memory Profile
| Metric | Description |
|--------|-------------|
| Peak Heap | Maximum heap memory used |
| Current Heap | Heap memory at end of run |
| Freed | Memory reclaimed during run |
| Heap Total | Total heap size allocated |
| External | Memory used by C++ objects |
| RSS (Peak) | Peak resident set size |

### Comparison Verdicts
| Icon | Verdict | Threshold |
|------|---------|-----------|
| 🚀 | FASTER | >5% improvement |
| 🐢 | SLOWER | >5% regression |
| ➡️ | UNCHANGED | ±5% |

## Implementation

Run the benchmark harness:

```bash
bun ~/.claude/scripts/bench.ts [script] [options]
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `matrix` | Lockfile health matrix scanner |
| `lockfile-matrix` | Alias for matrix |
| `quick-wins` | Quick Wins Round 1 - Matrix column optimizations (#1-4) |
| `quick-wins-1` | Alias for quick-wins |
| `buffer-includes` | Buffer.indexOf/includes SIMD (99,999 runs, 44.5KB) |
| `spawn-sync` | Bun.spawnSync close_range fix (100 spawns, Linux) |
| `tier1380` | Tier-1380 color CLI (init/generate/deploy/metrics); `bun run tier1380:bench` |

### Recent Benchmark Standards (Tier-1380)

| API | Baseline | Standard |
|-----|----------|----------|
| Buffer.indexOf / Buffer.includes | SIMD 2x | 99,999 runs, 44.5KB buffer; .includes true ~22ms, .includes false ~1.4s |
| Bun.spawnSync | close_range 30x | 100× `Bun.spawnSync(["true"])`; Linux ~0.4ms, legacy ~13ms |

## Workflow Examples

### Quick Benchmark
```bash
/bench matrix
/bench buffer-includes    # Buffer SIMD benchmark
/bench spawn-sync         # Bun.spawnSync benchmark
bun run tier1380:bench    # Tier-1380 color palette generation
```

### Full Performance Analysis
```bash
# Run extended benchmark
/bench matrix -n 20 --save

# Later, compare after changes
/bench matrix -n 20 --compare bench-matrix-1706123456789.json
```

### CI/CD Integration
```bash
# Output JSON for pipeline
/bench matrix --json > benchmark-results.json
```

## Sample Output

```
📊 Benchmark Results

┌───┬────────────┬─────────┐
│ # │ Metric     │ Value   │
├───┼────────────┼─────────┤
│ 0 │ Script     │ matrix  │
│ 1 │ Iterations │ 5       │
│ 2 │ Warmup     │ 2       │
└───┴────────────┴─────────┘

⏱️  Timing Statistics

┌───┬─────────┬─────────┬────────────┐
│ # │ Stat    │ Value   │ Raw        │
├───┼─────────┼─────────┼────────────┤
│ 0 │ Min     │ 1.52s   │ 1520.34ms  │
│ 1 │ Max     │ 1.68s   │ 1680.12ms  │
│ 2 │ Mean    │ 1.59s   │ 1592.45ms  │
│ 3 │ Median  │ 1.58s   │ 1581.23ms  │
│ 4 │ Std Dev │ 62ms    │ 62.18ms    │
│ 5 │ P95     │ 1.67s   │ 1670.89ms  │
└───┴─────────┴─────────┴────────────┘
```

## Comparison Output

```
🔄 Comparison Results

┌───┬──────────────────┬─────────────┐
│ # │ Metric           │ Value       │
├───┼──────────────────┼─────────────┤
│ 0 │ Mean (baseline)  │ 4.74s       │
│ 1 │ Mean (current)   │ 1.59s       │
│ 2 │ Mean delta       │ 🚀 -66.4%   │
│ 3 │ Median (baseline)│ 4.71s       │
│ 4 │ Median (current) │ 1.58s       │
│ 5 │ Median delta     │ 🚀 -66.5%   │
└───┴──────────────────┴─────────────┘

🚀 Verdict: FASTER (-66.5%)
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

## mcp-bun-docs benchmarks

Standalone benchmark examples in `mcp-bun-docs` (Tier-1380, Col-89, SIMD):

| Script | Command | Description |
|--------|---------|-------------|
| Buffer indexOf/includes | `cd mcp-bun-docs && bun run example:buffer-includes` | SIMD buffer search (44.5KB) |
| Buffer indexOf demo | `cd mcp-bun-docs && bun run example:buffer-indexof` | indexOf/includes demo |
| SpawnSync | `cd mcp-bun-docs && bun run example:spawn-sync` | Bun.spawnSync close_range benchmark |
| Col-89 enforcer | `cd mcp-bun-docs && bun run example:col89` | Col-89 width + Unicode (stringWidth, GB9c) |

From repo root: `bun mcp-bun-docs/examples/buffer-includes-bench.example.ts` (or use package scripts above).

## Related Commands

- `/matrix` - Run lockfile matrix scanner
- `/diagnose` - Project health diagnostics
- `/analyze` - Code analysis
- `bun run example:buffer-includes` (in mcp-bun-docs) - Buffer SIMD benchmark
- `bun run tier1380:bench` - Tier-1380 color palette generation
