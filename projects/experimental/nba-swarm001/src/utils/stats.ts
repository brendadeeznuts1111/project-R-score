/**
 * Statistical significance testing utilities
 */

import { StatsError } from "../types/errors.js";
import { DEFAULT_SIGNIFICANCE_LEVEL, MIN_SAMPLE_SIZE } from "../constants.js";

/**
 * Calculate p-value for correlation using t-test
 */
export function correlationPValue(
  correlation: number,
  sampleSize: number
): number {
  if (sampleSize < MIN_SAMPLE_SIZE) {
    throw new StatsError(
      `Sample size must be at least ${MIN_SAMPLE_SIZE}`,
      sampleSize
    );
  }

  if (Math.abs(correlation) >= 1) {
    return 0; // Perfect correlation
  }

  // T-statistic for correlation
  const tStat = correlation * Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));

  // Degrees of freedom
  const df = sampleSize - 2;

  // Approximate p-value using t-distribution
  // Using simplified approximation for df > 30
  if (df > 30) {
    const z = Math.abs(tStat);
    // Two-tailed test
    return 2 * (1 - normalCDF(z));
  }

  // For smaller samples, use t-distribution approximation
  return tTestPValue(tStat, df);
}

/**
 * Normal CDF approximation
 */
function normalCDF(z: number): number {
  // Approximation using error function
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/**
 * Error function approximation
 */
function erf(x: number): number {
  // Abramowitz and Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

/**
 * T-test p-value approximation
 */
function tTestPValue(tStat: number, df: number): number {
  // Simplified approximation for two-tailed test
  const absT = Math.abs(tStat);

  // For df > 1, use normal approximation scaled by df
  if (df > 1) {
    const z = absT / Math.sqrt(df);
    return 2 * (1 - normalCDF(z));
  }

  // For very small df, return conservative estimate
  return 0.1;
}

/**
 * Check if correlation is statistically significant
 */
export function isSignificant(
  correlation: number,
  sampleSize: number,
  alpha: number = DEFAULT_SIGNIFICANCE_LEVEL
): boolean {
  const pValue = correlationPValue(correlation, sampleSize);
  return pValue < alpha;
}

/**
 * Calculate confidence interval for correlation
 */
export function correlationConfidenceInterval(
  correlation: number,
  sampleSize: number,
  confidence: number = 0.95
): [number, number] {
  if (sampleSize < MIN_SAMPLE_SIZE) {
    throw new StatsError(
      `Sample size must be at least ${MIN_SAMPLE_SIZE}`,
      sampleSize
    );
  }

  // Fisher transformation
  const z = 0.5 * Math.log((1 + correlation) / (1 - correlation));

  // Standard error
  const se = 1 / Math.sqrt(sampleSize - 3);

  // Z-score for confidence level
  const zScore = normalQuantile((1 + confidence) / 2);

  // Confidence interval in z-space
  const lowerZ = z - zScore * se;
  const upperZ = z + zScore * se;

  // Transform back to correlation space
  const lower = (Math.exp(2 * lowerZ) - 1) / (Math.exp(2 * lowerZ) + 1);
  const upper = (Math.exp(2 * upperZ) - 1) / (Math.exp(2 * upperZ) + 1);

  return [lower, upper];
}

/**
 * Normal quantile (inverse CDF) approximation
 */
function normalQuantile(p: number): number {
  // Approximation using Beasley-Springer-Moro algorithm
  if (p < 0.5) {
    return -normalQuantile(1 - p);
  }

  const a = [0, -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [0, -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [0, -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0, 7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  let q = p - 0.5;
  let r: number;

  if (Math.abs(q) <= 0.425) {
    r = 0.180625 - q * q;
    return q * (((((a[6] * r + a[5]) * r + a[4]) * r + a[3]) * r + a[2]) * r + a[1]) / (((((b[5] * r + b[4]) * r + b[3]) * r + b[2]) * r + b[1]) * r + 1);
  }

  r = q < 0 ? p : 1 - p;
  r = Math.sqrt(-Math.log(r));

  let s: number;
  if (r <= 5) {
    r = r - 1.6;
    s = (((((c[6] * r + c[5]) * r + c[4]) * r + c[3]) * r + c[2]) * r + c[1]) / ((((d[4] * r + d[3]) * r + d[2]) * r + d[1]) * r + 1);
  } else {
    r = r - 5;
    s = (((((c[6] * r + c[5]) * r + c[4]) * r + c[3]) * r + c[2]) * r + c[1]) / ((((d[4] * r + d[3]) * r + d[2]) * r + d[1]) * r + 1);
  }

  return q < 0 ? -s : s;
}

/**
 * Estimate false positive rate
 */
export function estimateFalsePositiveRate(
  threshold: number,
  sampleSize: number,
  alpha: number = DEFAULT_SIGNIFICANCE_LEVEL
): number {
  // Simplified estimation based on multiple testing
  // For independent tests, false positive rate ≈ alpha
  // For correlated tests, need to account for multiple comparisons
  return alpha;
}

