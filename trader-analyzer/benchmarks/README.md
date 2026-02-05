# Performance Benchmarks

This directory contains curated performance benchmarks and profiling data for tracking performance over time and detecting regressions.

## Directory Structure

```
benchmarks/
├── cpu-profiles/      # CPU profiling data (.cpuprofile files)
├── heap-snapshots/    # Memory heap snapshots (.heapsnapshot files)
├── analysis/          # Analysis reports (JSON summaries)
└── metadata/          # Benchmark metadata and schemas
```

## Purpose

- **Track performance over time**: Compare benchmarks across commits/versions
- **Detect regressions**: Identify performance degradation early
- **Document optimizations**: Record before/after profiles for optimizations
- **Share insights**: Enable team collaboration on performance analysis

## Usage

### Adding a New Benchmark

1. **Generate a profile** (using Bun's profiling tools):
   ```bash
   bun --cpu-prof script.ts
   ```

2. **Create metadata** for the benchmark:
   ```bash
   bun run scripts/benchmarks/create-benchmark.ts \
     --profile=profiles/my-profile.cpuprofile \
     --name="feature-x-baseline" \
     --description="Baseline performance for feature X" \
     --commit=$(git rev-parse HEAD)
   ```

3. **Move to benchmarks/**:
   - The script will copy the profile to `benchmarks/cpu-profiles/`
   - Generate analysis in `benchmarks/analysis/`
   - Create metadata in `benchmarks/metadata/`

### Benchmark Naming Convention

Use descriptive names with context:
- `{feature}-{scenario}-{version}.cpuprofile`
- Examples:
  - `market-analysis-production-v1.2.0.cpuprofile`
  - `arbitrage-detection-baseline.cpuprofile`
  - `layer4-correlation-baseline.cpuprofile`
  - `optimization-memoization-after.cpuprofile`

### Layer4 Correlation Detection Benchmarks

The Layer4 correlation detection system has dedicated benchmarks:

**Baseline Benchmark:**
- ID: `layer4-correlation-baseline`
- Path: `benchmarks/metadata/layer4-correlation-baseline.json`
- Created by: `bun run scripts/benchmarks/create-layer4-baseline.ts`

**Performance Tests:**
- Test file: `test/profiling/correlation-detection.bench.ts`
- Runs with 50 repeats for statistical significance
- Generates CPU profiles for analysis

**Usage:**
```bash
# Create baseline
bun run scripts/benchmarks/create-layer4-baseline.ts

# Run benchmarks
bun test --repeats=50 test/profiling/correlation-detection.bench.ts --profile=cpu

# Compare against baseline
bun run scripts/benchmarks/compare.ts \
  --baseline=layer4-correlation-baseline \
  --current=layer4-correlation-pr-123 \
  --threshold=5
```

See [Layer4 Correlation Test Guide](../docs/LAYER4-CORRELATION-TEST-GUIDE.md) for detailed documentation.

### Metadata Schema

Each benchmark should have a corresponding metadata file in `benchmarks/metadata/`:

```json
{
  "id": "unique-benchmark-id",
  "name": "Human-readable name",
  "description": "What this benchmark measures",
  "createdAt": "2025-01-15T10:30:00Z",
  "gitCommit": "abc123def456...",
  "gitBranch": "main",
  "system": {
    "os": "darwin",
    "arch": "arm64",
    "nodeVersion": "bun/1.0.0",
    "cpu": "Apple M1",
    "memory": "16GB"
  },
  "profile": {
    "type": "cpu",
    "file": "cpu-profiles/market-analysis-production-v1.2.0.cpuprofile",
    "durationMs": 42183.5,
    "sampleCount": 32
  },
  "analysis": {
    "file": "analysis/market-analysis-production-v1.2.0_analysis.json",
    "hotspots": ["function1", "function2"],
    "recommendations": ["optimize X", "consider Y"]
  },
  "tags": ["production", "market-analysis", "v1.2.0"],
  "relatedBenchmarks": ["baseline-id", "optimized-id"]
}
```

### Comparing Benchmarks

Use the analysis tools to compare benchmarks:

```bash
# Compare two benchmarks
bun run scripts/benchmarks/compare.ts \
  --baseline=benchmarks/metadata/baseline.json \
  --current=benchmarks/metadata/current.json

# Generate comparison report
bun run scripts/benchmarks/report.ts \
  --since=2025-01-01 \
  --feature=market-analysis
```

## Best Practices

1. **Commit benchmarks** for significant changes:
   - Major feature releases
   - Performance optimizations (before/after)
   - Baseline measurements

2. **Keep benchmarks small**: Only commit representative profiles, not every run

3. **Document context**: Always include metadata explaining:
   - What was being tested
   - System configuration
   - Git commit/branch
   - Any special conditions

4. **Regular cleanup**: Periodically review and archive old benchmarks

5. **Use tags**: Tag benchmarks for easy filtering:
   - `production`, `development`, `staging`
   - Feature names: `market-analysis`, `arbitrage`
   - Version tags: `v1.2.0`, `v1.3.0`

## Temporary vs. Tracked Profiles

- **`profiles/`** (ignored): Temporary profiling data during development
- **`benchmarks/`** (tracked): Curated benchmarks for performance tracking

Only move profiles to `benchmarks/` when they represent:
- Baseline measurements
- Before/after optimization comparisons
- Production performance snapshots
- Significant milestones

## Tools

- **Create benchmark**: `scripts/benchmarks/create-benchmark.ts`
- **Compare benchmarks**: `scripts/benchmarks/compare.ts`
- **Generate report**: `scripts/benchmarks/report.ts`
- **List benchmarks**: `scripts/benchmarks/list.ts`

## Benchmark-Driven Development Workflow

### Daily Development Cycle

```bash
# 1. Write feature
bun run dev:layer4

# 2. Run benchmark before changes
bun run bench:layer4 --save=baseline

# 3. Implement optimization
# ... code changes ...

# 4. Run benchmark after changes
bun run bench:layer4 --save=optimized

# 5. Compare benchmarks
bun run scripts/benchmarks/compare.ts \
  --baseline=baseline \
  --current=optimized \
  --threshold=5%

# If improvement >5%, commit with benchmark results
git add benchmarks/analysis/layer4-optimized_analysis.json
git commit -m "perf: optimize Layer 4 correlation by 8%"
```

### Comparing Benchmarks

Use the comparison tool to detect regressions:

```bash
# Compare two benchmarks
bun run scripts/benchmarks/compare.ts \
  --baseline=market-analysis-baseline \
  --current=market-analysis-optimized \
  --threshold=5

# Fail CI on regression
bun run scripts/benchmarks/compare.ts \
  --baseline=main \
  --current=pr \
  --threshold=2 \
  --fail-on-regression
```

### Stress Testing

Create stress tests for large-scale performance validation:

```typescript
import { stressTest1MNodes, runStressTest } from './stress-test-template';

// Run with CPU profiling
bun --cpu-prof run-stress-test.ts

// Or use the template directly
const result = await runStressTest(stressTest1MNodes, {
  profile: true,
  profileType: 'both' // cpu, heap, or both
});
```

## Baseline Metrics

See `metadata/baseline-metrics.ts` for:
- **Performance targets** for each layer
- **Optimization goals** with expected improvements
- **Regression thresholds** for CI/CD

Key metrics tracked:
- **Layer 4** (Cross-Sport): Target <50ms avg, <100ms p99
- **Layer 3** (Cross-Event): Target <25ms avg, <45ms p99
- **Layer 2** (Cross-Market): Target <15ms avg, <20ms p99
- **Layer 1** (Direct): Target <5ms avg, <10ms p99
- **Full Assembly**: Target <1000ms, <600MB memory

## CI/CD Integration

Benchmarks run automatically on pull requests. See `.github/workflows/benchmark.yml` for configuration.

The CI will:
1. Run benchmarks for changed components
2. Compare against main branch baseline
3. Fail if regression >2% detected
4. Post results as PR comment

## Related Documentation

- [CPU Profiling Guide](../../docs/BUN-CPU-PROFILING.md)
- [Performance Optimization](../../docs/PERFORMANCE.md)
- [Bun v1.51 Impact Analysis](../../docs/BUN-V1.51-IMPACT-ANALYSIS.md)
