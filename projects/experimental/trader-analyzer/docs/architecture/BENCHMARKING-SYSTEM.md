# Benchmarking System Architecture

**Version**: 1.0.0  
**Last Updated**: 2025-01-27

---

## Overview

The modular benchmarking system provides automated performance testing, regression detection, and optimization recommendations for all packages in the NEXUS monorepo.

---

## Architecture

```text
@bench/core          - Core benchmarking utilities
  ├── Property iteration
  ├── Performance measurement
  ├── Regression detection
  └── Registry integration

@bench/layer4        - Layer4-specific benchmarks
  ├── Threshold optimization
  ├── Z-score threshold tuning
  ├── Pattern threshold analysis
  └── Decay rate optimization

@bench/graph         - Graph algorithm benchmarks
@bench/reporting      - Benchmark reporting and analysis
```

---

## Usage

### Running Benchmarks

```bash
# Run all Layer4 property benchmarks
bun run @bench/layer4

# Run specific property
bun run @bench/layer4 --property=threshold --values=0.5,0.6,0.7,0.8

# Run from package directory
cd packages/@bench/layer4
bun run bench
```

### Benchmark Configuration

```typescript
const config: BenchmarkConfig = {
  package: "@graph/layer4",
  version: "1.2.3",
  properties: [
    {
      name: "threshold",
      values: [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9],
      current: 0.75
    }
  ],
  thresholds: {
    performance: 100,  // milliseconds
    memory: 50,       // MB
    regression: 0.05  // 5% threshold
  }
};
```

---

## Benchmark Results

Results are automatically:
1. **Measured**: Performance metrics collected
2. **Analyzed**: Best values identified
3. **Uploaded**: Saved to private registry
4. **Compared**: Checked against baseline
5. **Reported**: Alerts sent on regressions

---

## Regression Detection

The system compares current results against baseline:

```typescript
const regressions = checkRegressions(
  currentResults,
  baselineResults,
  thresholds
);

if (regressions.length > 0) {
  // Alert team leads
  // Block publishing (optional)
  // Create GitHub issue
}
```

---

## CI/CD Integration

Benchmarks run automatically:
- **On PR**: Check for regressions
- **On Merge**: Update baseline
- **Daily**: Full benchmark suite
- **On Release**: Final verification

---

## Best Practices

1. **Consistent Environment**: Run benchmarks in same environment
2. **Baseline Tracking**: Maintain baseline for comparison
3. **Threshold Setting**: Set realistic performance thresholds
4. **Automation**: Automate regression detection
5. **Documentation**: Document performance characteristics

---

## Related Documentation

- [`docs/architecture/TEAM-PACKAGE-ARCHITECTURE.md`](./TEAM-PACKAGE-ARCHITECTURE.md) - Complete architecture
- [`packages/@bench/core/src/index.ts`](../../packages/@bench/core/src/index.ts) - Core utilities
- [`.github/workflows/benchmark.yml`](../../.github/workflows/benchmark.yml) - CI/CD workflow
