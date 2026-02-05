# Feature Flags Benchmarks

Performance benchmarking suite for the feature-flags system.

## Overview

The benchmarks directory contains performance testing tools to measure the runtime characteristics of feature flag operations. This ensures feature flags have minimal performance overhead throughout the application.

## Running Benchmarks

### Feature Flags Benchmark

Measures the performance of all feature flag operations:

```bash
cd packages/dashboard
bun benchmarks/feature-flags.ts
```

### Expected Results

Based on recent runs, typical performance metrics:

| Operation                         | Iterations | Avg Time   | Ops/sec |
| --------------------------------- | ---------- | ---------- | ------- |
| Direct Compile-Time Access        | 10,000     | 0.000027ms | 36.9M   |
| Direct Runtime Access             | 10,000     | 0.000013ms | 76.7M   |
| isFeatureEnabled() (Compile-Time) | 10,000     | 0.000052ms | 19.2M   |
| isFeatureEnabled() (Runtime)      | 10,000     | 0.000017ms | 60.2M   |
| isTierFeature()                   | 10,000     | 0.000055ms | 18.1M   |
| getCurrentTier()                  | 10,000     | 0.000015ms | 65.6M   |
| validateFeature()                 | 10,000     | 0.000010ms | 95.3M   |
| getEnabledFeatures()              | 1,000      | 0.001320ms | 755K    |
| Multiple Checks (5 features)      | 10,000     | 0.000054ms | 18.6M   |
| isPerformanceProfilingEnabled()   | 10,000     | 0.000045ms | 22.2M   |

**Average operation time: 0.0002ms**

## Key Findings

✅ **Ultra-Fast Operations**: All feature flag checks complete in microseconds or less

✅ **Minimal Overhead**: Average 0.0002ms per operation with 20M+ operations per second

✅ **Safe for Frequent Use**: Overhead is negligible even in hot code paths

✅ **Scalable**: Performance remains consistent regardless of feature count

## Usage in Code

Feature flags are optimized for inline use:

```typescript
import { isFeatureEnabled, RUNTIME_FEATURES } from '../utils/feature-flags';

// Direct access (fastest)
if (RUNTIME_FEATURES.DARK_MODE) {
  // Apply dark mode
}

// Function call (negligible overhead)
if (isFeatureEnabled('DARK_MODE')) {
  // Apply dark mode
}

// Conditional rendering (safe to use frequently)
{feature.type === 'runtime' && <Component />}
```

## Performance Profiles

### Fastest Operations

1. `validateFeature()` - 95.3M ops/sec
2. Direct runtime access - 76.7M ops/sec
3. `getCurrentTier()` - 65.6M ops/sec

### Most Expensive

1. `getEnabledFeatures()` - 755K ops/sec (expected: iterates all features)
2. `isTierFeature()` - 18.1M ops/sec (expected: array searches)

However, even the "slowest" operations are extremely fast and safe for production use.

## Customizing Benchmarks

To modify the benchmark suite, edit `benchmarks/feature-flags.ts`:

```typescript
// Change iterations
const result = benchmark(
  "Test Name",
  () => {
    // test code
  },
  100000
); // iterations

// Add new tests
const customResult = benchmark("Custom Operation", () => {
  // your operation
});
printResult(customResult);
```

## Integration with CI/CD

Consider adding benchmark runs to your CI/CD pipeline to track performance over time:

```bash
# In your CI script
cd packages/dashboard
bun benchmarks/feature-flags.ts > benchmark-results.txt
```

This helps detect performance regressions early.

## Related Documentation

- [Feature Flags System](../src/utils/feature-flags.ts)
- [Feature Management Dashboard](../src/pages/FeaturesPage/index.tsx)
- [Bun Bundle Feature Documentation](https://bun.sh/docs/bundler/features)
