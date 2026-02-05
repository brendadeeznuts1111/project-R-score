# Statistical Significance Testing for CPU Profiling

**Version**: 6.7.1A.0.0.0.0  
**Module**: `src/utils/cpu-profiling-statistics.ts`

## Overview

The CPU Profiling system includes statistical significance testing to provide robust assertions about performance changes. This enhancement moves beyond simple mean-to-mean comparisons, enabling confident identification of true regressions or improvements in critical components.

## Statistical Methods

### 1. Student's t-test / Welch's t-test

**Purpose**: Determine if the observed difference in means between two profiles is statistically significant.

**Implementation**:
- Automatically selects Student's t-test for equal variances or Welch's t-test for unequal variances
- Uses F-test to check variance equality
- Calculates degrees of freedom (Welch-Satterthwaite for unequal variances)

**Output**:
- `pValue`: Probability of observing such a difference if true means were equal
- `testStatistic`: t-statistic value
- `degreesOfFreedom`: Degrees of freedom for the test
- `isSignificant`: Boolean indicating if p-value < significance level

**Interpretation**:
- `pValue < 0.05`: Statistically significant difference (default alpha = 0.05)
- `pValue >= 0.05`: No statistically significant difference detected

### 2. Confidence Intervals

**Purpose**: Provide a range estimate for the true difference between profile means.

**Implementation**:
- Calculates 95% confidence interval by default (configurable)
- Uses t-distribution for small samples, normal approximation for large samples
- Accounts for unequal variances when using Welch's t-test

**Output**:
- `lower`: Lower bound of confidence interval
- `upper`: Upper bound of confidence interval
- `level`: Confidence level (default: 0.95)

**Interpretation**:
- If interval includes zero: Difference is not statistically significant
- If interval excludes zero: Difference is statistically significant
- Example: `[-5.2ms, -2.1ms]` means the current profile is 2.1-5.2ms slower with 95% confidence

### 3. Cohen's d (Effect Size)

**Purpose**: Quantify the magnitude of the observed difference, independent of sample size.

**Implementation**:
- Uses pooled standard deviation
- Standardizes the mean difference

**Output**:
- `value`: Cohen's d value (can be negative)
- `magnitude`: Classification based on absolute value:
  - `negligible`: |d| < 0.2
  - `small`: 0.2 ≤ |d| < 0.5
  - `medium`: 0.5 ≤ |d| < 0.8
  - `large`: 0.8 ≤ |d| < 1.2
  - `very large`: |d| ≥ 1.2

**Interpretation**:
- Effect size helps distinguish statistical significance from practical significance
- A statistically significant result with small effect size may not be practically important
- Example: `d = 0.8` indicates a large practical difference

### 4. F-test (Variance Comparison)

**Purpose**: Compare variances of two profiles to detect changes in performance stability.

**Implementation**:
- F-statistic = larger variance / smaller variance
- Uses F-distribution for p-value calculation
- Handles small and large sample sizes

**Output**:
- `pValue`: Probability that variances are equal
- `testStatistic`: F-statistic value
- `varianceRatio`: Ratio of variances
- `isSignificant`: Boolean indicating significant variance difference

**Interpretation**:
- Significant variance change may indicate:
  - New sources of non-determinism
  - Different bottleneck patterns
  - Performance instability issues
- Example: `varianceRatio = 2.5` with `pValue < 0.05` means current profile has significantly higher variance

### 5. Kolmogorov-Smirnov Test

**Purpose**: Compare entire cumulative distribution functions, not just means and variances.

**Implementation**:
- Calculates maximum difference between empirical CDFs
- Uses KS distribution for p-value calculation
- Non-parametric test (makes no distribution assumptions)

**Output**:
- `pValue`: Probability that distributions are identical
- `testStatistic`: Maximum CDF difference (D-statistic)
- `maxDifference`: Maximum difference between CDFs
- `isSignificant`: Boolean indicating different distributions

**Interpretation**:
- Detects changes in distribution shape, not just location or scale
- Useful for identifying:
  - Skewness changes
  - Outlier patterns
  - Multi-modal distributions
- Example: `maxDifference = 0.3` with `pValue < 0.05` means distributions are significantly different

## Configuration

### Statistical Configuration Options

```typescript
interface StatisticalConfig {
  /** Significance level (alpha) for p-value comparisons */
  significanceLevel: number;  // Default: 0.05
  
  /** Confidence level for confidence intervals */
  confidenceLevel: number;     // Default: 0.95
  
  /** Minimum sample size to perform statistical tests */
  minSampleSize: number;       // Default: 10
}
```

### Usage Example

```typescript
import { CPUProfilingRegistry } from '../src/utils/cpu-profiling-registry';

const registry = new CPUProfilingRegistry({
  statisticalConfig: {
    significanceLevel: 0.01,  // Stricter: 1% significance level
    confidenceLevel: 0.99,    // 99% confidence intervals
    minSampleSize: 15,        // Require at least 15 samples
  },
});

const comparison = await registry.compareProfiles(currentProfile, baselineProfile);

if (comparison.statisticalAnalysis) {
  const stats = comparison.statisticalAnalysis;
  
  // Mean difference test
  console.log(`P-value: ${stats.meanDifference.test.pValue}`);
  console.log(`Significant: ${stats.meanDifference.test.isSignificant}`);
  
  // Confidence interval
  const ci = stats.meanDifference.confidenceInterval;
  console.log(`${ci.level * 100}% CI: [${ci.lower.toFixed(2)}, ${ci.upper.toFixed(2)}]`);
  
  // Effect size
  console.log(`Effect size: ${stats.meanDifference.effectSize.value.toFixed(2)} (${stats.meanDifference.effectSize.magnitude})`);
  
  // Variance comparison
  console.log(`Variance ratio: ${stats.varianceComparison.varianceRatio.toFixed(2)}`);
  console.log(`Variance significant: ${stats.varianceComparison.test.isSignificant}`);
  
  // Distribution comparison
  console.log(`KS test p-value: ${stats.distributionComparison.test.pValue}`);
  console.log(`Distributions different: ${stats.distributionComparison.test.isSignificant}`);
  
  // Sample info
  console.log(`Sample sizes: baseline=${stats.sampleInfo.baselineSize}, current=${stats.sampleInfo.currentSize}`);
  if (stats.sampleInfo.warning) {
    console.warn(`Warning: ${stats.sampleInfo.warning}`);
  }
}
```

## Interpreting Results

### Scenario 1: Statistically Significant Regression

```json
{
  "meanDifference": {
    "test": {
      "pValue": 0.001,
      "isSignificant": true,
      "testStatistic": -4.2
    },
    "meanDiff": -5.3,
    "confidenceInterval": {
      "lower": -7.1,
      "upper": -3.5,
      "level": 0.95
    },
    "effectSize": {
      "value": -1.1,
      "magnitude": "large"
    }
  }
}
```

**Interpretation**:
- **P-value < 0.05**: Difference is statistically significant
- **Confidence interval excludes zero**: Confirms significance
- **Large effect size**: Practical importance confirmed
- **Action**: Investigate and fix the regression

### Scenario 2: Non-Significant Difference

```json
{
  "meanDifference": {
    "test": {
      "pValue": 0.15,
      "isSignificant": false,
      "testStatistic": -1.2
    },
    "meanDiff": -1.2,
    "confidenceInterval": {
      "lower": -2.8,
      "upper": 0.4,
      "level": 0.95
    },
    "effectSize": {
      "value": -0.3,
      "magnitude": "small"
    }
  }
}
```

**Interpretation**:
- **P-value > 0.05**: No statistically significant difference
- **Confidence interval includes zero**: Confirms non-significance
- **Small effect size**: Even if significant, practical impact is small
- **Action**: No action needed, variation is within normal range

### Scenario 3: Significant Variance Change

```json
{
  "varianceComparison": {
    "test": {
      "pValue": 0.02,
      "isSignificant": true,
      "testStatistic": 2.8
    },
    "varianceRatio": 2.8
  }
}
```

**Interpretation**:
- **Variance ratio > 1**: Current profile has higher variance
- **Significant p-value**: Variance change is real, not random
- **Action**: Investigate sources of non-determinism or instability

## Edge Cases and Warnings

### Small Sample Sizes

When sample sizes are below the minimum threshold:
- Statistical tests return `pValue = 1.0` and `isSignificant = false`
- A warning is included in `sampleInfo.warning`
- Basic threshold-based comparison still works

### Insufficient Data

- **N < 2**: Tests return sentinel values, no crashes
- **Zero variance**: Effect size returns `0` with `negligible` magnitude
- **Empty arrays**: All tests handle gracefully

### Performance Overhead

Statistical analysis adds minimal overhead:
- Typically < 5% additional time to comparison
- Only runs when raw samples are available
- Can be disabled by not providing raw samples

## Best Practices

1. **Collect Sufficient Samples**: Aim for at least 20-30 samples per profile for robust statistical inference

2. **Interpret P-values Correctly**:
   - P-value is NOT the probability that the null hypothesis is true
   - P-value IS the probability of observing such data if null hypothesis were true
   - Low p-value suggests the observed difference is unlikely due to chance

3. **Consider Effect Size**: A statistically significant result with small effect size may not be practically important

4. **Check Variance**: Significant variance changes may indicate instability even if mean performance is similar

5. **Use Confidence Intervals**: They provide more information than p-values alone (magnitude + uncertainty)

6. **Multiple Comparisons**: If comparing many profiles, consider adjusting significance level (Bonferroni correction)

## Integration with Hyper-Bun Workflows

### Performance Regression Detection

```typescript
// In CI/CD pipeline
const comparison = await registry.compareProfiles(currentProfile, baselineProfile);

if (comparison.statisticalAnalysis?.meanDifference.test.isSignificant) {
  const effectSize = comparison.statisticalAnalysis.meanDifference.effectSize;
  
  if (effectSize.magnitude === "large" && comparison.severity === "CRITICAL") {
    // Block merge - statistically significant large regression
    throw new Error("Critical performance regression detected");
  }
}
```

### Monitoring Critical Functions

```typescript
// For deepProbeMarketOfferings, monitorHiddenSteam, etc.
const comparison = await registry.compareProfiles(currentProfile, baselineProfile);

if (comparison.statisticalAnalysis) {
  const stats = comparison.statisticalAnalysis;
  
  // Alert on significant changes with medium+ effect size
  if (
    stats.meanDifference.test.isSignificant &&
    ["medium", "large", "very large"].includes(stats.meanDifference.effectSize.magnitude)
  ) {
    sendAlert({
      function: "deepProbeMarketOfferings",
      severity: comparison.severity,
      statisticalEvidence: stats,
    });
  }
}
```

## References

- Student's t-test: [Wikipedia](https://en.wikipedia.org/wiki/Student%27s_t-test)
- Welch's t-test: [Wikipedia](https://en.wikipedia.org/wiki/Welch%27s_t-test)
- Cohen's d: [Wikipedia](https://en.wikipedia.org/wiki/Effect_size#Cohen's_d)
- F-test: [Wikipedia](https://en.wikipedia.org/wiki/F-test)
- Kolmogorov-Smirnov test: [Wikipedia](https://en.wikipedia.org/wiki/Kolmogorov%E2%80%93Smirnov_test)

## Implementation Notes

- All statistical functions are implemented in pure TypeScript
- No external dependencies required
- Optimized for performance analysis workloads
- Handles edge cases gracefully without crashing
- Suitable for Bun runtime environment
