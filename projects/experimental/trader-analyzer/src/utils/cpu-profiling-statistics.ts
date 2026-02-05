/**
 * @fileoverview CPU Profiling Statistical Analysis
 * @description Statistical significance testing and confidence metrics for performance comparison
 *
 * @module utils/cpu-profiling-statistics
 * @version 6.7.1A.0.0.0.0
 */

/**
 * Statistical analysis configuration
 *
 * Controls the behavior of statistical tests including significance thresholds,
 * confidence levels, and minimum sample size requirements.
 *
 * @interface StatisticalConfig
 * @property {number} significanceLevel - Significance level (alpha) for p-value comparisons (default: 0.05)
 * @property {number} confidenceLevel - Confidence level for confidence intervals (e.g., 0.95 for 95%, default: 0.95)
 * @property {number} minSampleSize - Minimum sample size required to perform statistical tests (default: 10)
 */
export interface StatisticalConfig {
	/** Significance level (alpha) for p-value comparisons */
	significanceLevel: number;
	/** Confidence level for confidence intervals (e.g., 0.95 for 95%) */
	confidenceLevel: number;
	/** Minimum sample size to perform statistical tests */
	minSampleSize: number;
}

/**
 * Default statistical configuration
 *
 * Provides sensible defaults for statistical analysis:
 * - 5% significance level (alpha = 0.05)
 * - 95% confidence intervals
 * - Minimum of 10 samples required for tests
 *
 * @constant {StatisticalConfig} DEFAULT_STATISTICAL_CONFIG
 */
export const DEFAULT_STATISTICAL_CONFIG: StatisticalConfig = {
	significanceLevel: 0.05,
	confidenceLevel: 0.95,
	minSampleSize: 10,
};

/**
 * Statistical test results
 *
 * Contains the results of a statistical hypothesis test including p-value,
 * significance determination, test statistic, and degrees of freedom.
 *
 * @interface StatisticalTestResult
 * @property {number} pValue - P-value from the test (probability of observing such data if null hypothesis is true)
 * @property {boolean} isSignificant - Whether the result is statistically significant (pValue < significanceLevel)
 * @property {number} testStatistic - Test statistic value (e.g., t-statistic, F-statistic, KS statistic)
 * @property {number} [degreesOfFreedom] - Degrees of freedom for the test (if applicable)
 */
export interface StatisticalTestResult {
	/** P-value from the test */
	pValue: number;
	/** Whether the result is statistically significant */
	isSignificant: boolean;
	/** Test statistic value */
	testStatistic: number;
	/** Degrees of freedom (if applicable) */
	degreesOfFreedom?: number;
}

/**
 * Confidence interval for a statistical estimate
 *
 * Represents a range estimate for a population parameter (e.g., mean difference)
 * with a specified confidence level.
 *
 * @interface ConfidenceInterval
 * @property {number} lower - Lower bound of the confidence interval
 * @property {number} upper - Upper bound of the confidence interval
 * @property {number} level - Confidence level (e.g., 0.95 for 95% confidence)
 */
export interface ConfidenceInterval {
	lower: number;
	upper: number;
	level: number;
}

/**
 * Effect size (Cohen's d)
 *
 * Quantifies the magnitude of an observed difference, independent of sample size.
 * Helps distinguish statistical significance from practical significance.
 *
 * @interface EffectSize
 * @property {number} value - Cohen's d value (can be negative, indicating direction)
 * @property {"negligible" | "small" | "medium" | "large" | "very large"} magnitude - Magnitude classification:
 *   - negligible: |d| < 0.2
 *   - small: 0.2 ≤ |d| < 0.5
 *   - medium: 0.5 ≤ |d| < 0.8
 *   - large: 0.8 ≤ |d| < 1.2
 *   - very large: |d| ≥ 1.2
 */
export interface EffectSize {
	value: number;
	magnitude: "negligible" | "small" | "medium" | "large" | "very large";
}

/**
 * Complete statistical analysis result
 *
 * Contains comprehensive statistical test results comparing two performance profiles,
 * including mean difference tests, variance comparisons, distribution shape analysis,
 * and sample size information.
 *
 * @interface StatisticalAnalysis
 * @property {Object} meanDifference - Mean difference analysis (t-test/Welch's t-test)
 * @property {StatisticalTestResult} meanDifference.test - Test results (p-value, significance, t-statistic)
 * @property {number} meanDifference.meanDiff - Observed mean difference (baseline - current)
 * @property {ConfidenceInterval} meanDifference.confidenceInterval - Confidence interval for mean difference
 * @property {EffectSize} meanDifference.effectSize - Effect size (Cohen's d) quantifying magnitude
 * @property {Object} varianceComparison - Variance comparison analysis (F-test)
 * @property {StatisticalTestResult} varianceComparison.test - Test results (p-value, significance, F-statistic)
 * @property {number} varianceComparison.varianceRatio - Ratio of variances (baseline / current)
 * @property {Object} distributionComparison - Distribution shape comparison (Kolmogorov-Smirnov test)
 * @property {StatisticalTestResult} distributionComparison.test - Test results (p-value, significance, KS statistic)
 * @property {number} distributionComparison.maxDifference - Maximum difference between CDFs
 * @property {Object} sampleInfo - Sample size information and warnings
 * @property {number} sampleInfo.baselineSize - Number of samples in baseline profile
 * @property {number} sampleInfo.currentSize - Number of samples in current profile
 * @property {string} [sampleInfo.warning] - Warning message if sample sizes are insufficient
 */
export interface StatisticalAnalysis {
	/** Mean difference test (t-test) */
	meanDifference: {
		test: StatisticalTestResult;
		meanDiff: number;
		confidenceInterval: ConfidenceInterval;
		effectSize: EffectSize;
	};
	/** Variance comparison test */
	varianceComparison: {
		test: StatisticalTestResult;
		varianceRatio: number;
	};
	/** Distribution shape comparison (KS test) */
	distributionComparison: {
		test: StatisticalTestResult;
		maxDifference: number;
	};
	/** Sample size information */
	sampleInfo: {
		baselineSize: number;
		currentSize: number;
		warning?: string;
	};
}

// ═══════════════════════════════════════════════════════════════
// Statistical Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate mean of array
 */
function mean(values: number[]): number {
	if (values.length === 0) return 0;
	return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate variance of array
 * Handles edge cases: empty arrays, single values, zero variance
 */
function variance(values: number[], sampleMean?: number): number {
	if (values.length === 0) return 0;
	if (values.length === 1) return 0; // Single value has no variance
	const m = sampleMean ?? mean(values);
	const sumSquaredDiffs = values.reduce(
		(sum, val) => sum + Math.pow(val - m, 2),
		0,
	);
	const divisor = values.length - 1;
	if (divisor === 0) return 0; // Prevent division by zero
	return sumSquaredDiffs / divisor; // Sample variance
}

/**
 * Calculate standard deviation
 */
function stdDev(values: number[]): number {
	return Math.sqrt(variance(values));
}

/**
 * Calculate standard error of the mean
 */
function standardError(values: number[]): number {
	if (values.length === 0) return 0;
	return stdDev(values) / Math.sqrt(values.length);
}

/**
 * Student's t-distribution critical values (approximation)
 * For two-tailed test at common alpha levels
 */
function tCritical(df: number, alpha: number): number {
	// Approximation using normal distribution for large df, or lookup table for small df
	if (df >= 30) {
		// Use normal approximation
		const z = alpha === 0.05 ? 1.96 : alpha === 0.01 ? 2.576 : 1.645;
		return z;
	}

	// Simplified lookup for common cases
	const lookup: Record<number, Record<number, number>> = {
		0.05: {
			1: 12.706,
			2: 4.303,
			3: 3.182,
			4: 2.776,
			5: 2.571,
			6: 2.447,
			7: 2.365,
			8: 2.306,
			9: 2.262,
			10: 2.228,
			15: 2.131,
			20: 2.086,
			25: 2.06,
			30: 2.042,
		},
		0.01: {
			1: 63.657,
			2: 9.925,
			3: 5.841,
			4: 4.604,
			5: 4.032,
			6: 3.707,
			7: 3.499,
			8: 3.355,
			9: 3.25,
			10: 3.169,
			15: 2.947,
			20: 2.845,
			25: 2.787,
			30: 2.75,
		},
	};

	const alphaTable = lookup[alpha];
	if (alphaTable) {
		// Find closest df
		const dfs = Object.keys(alphaTable)
			.map(Number)
			.sort((a, b) => a - b);
		for (let i = 0; i < dfs.length; i++) {
			if (df <= dfs[i]) return alphaTable[dfs[i]];
		}
		return alphaTable[dfs[dfs.length - 1]];
	}

	// Default: use normal approximation
	return alpha === 0.05 ? 1.96 : 2.576;
}

/**
 * Student's t-test for comparing two means
 *
 * Performs a two-sample t-test to determine if the observed difference in means
 * between baseline and current profiles is statistically significant. Automatically
 * selects Welch's t-test (unequal variances) if variances differ significantly.
 *
 * @function studentsTTest
 * @param {number[]} baseline - Baseline performance samples (e.g., execution times)
 * @param {number[]} current - Current performance samples to compare against baseline
 * @param {StatisticalConfig} [config=DEFAULT_STATISTICAL_CONFIG] - Statistical configuration (significance level, etc.)
 * @returns {StatisticalTestResult} Test results including p-value, significance, t-statistic, and degrees of freedom
 *
 * @example
 * ```typescript
 * const baseline = [10.2, 10.5, 10.1, 10.3, 10.4];
 * const current = [12.1, 12.3, 12.0, 12.2, 12.4];
 * const result = studentsTTest(baseline, current);
 *
 * if (result.isSignificant) {
 *   console.log(`Statistically significant difference: p = ${result.pValue}`);
 * }
 * ```
 */
export function studentsTTest(
	baseline: number[],
	current: number[],
	config: StatisticalConfig = DEFAULT_STATISTICAL_CONFIG,
): StatisticalTestResult {
	if (
		baseline.length < config.minSampleSize ||
		current.length < config.minSampleSize
	) {
		return {
			pValue: 1.0,
			isSignificant: false,
			testStatistic: 0,
			degreesOfFreedom: undefined,
		};
	}

	const mean1 = mean(baseline);
	const mean2 = mean(current);
	const var1 = variance(baseline, mean1);
	const var2 = variance(current, mean2);
	const n1 = baseline.length;
	const n2 = current.length;

	// Check if variances are equal using F-test
	const fStat = var1 > var2 ? var1 / var2 : var2 / var1;
	const fCritical = 1.5; // Simplified threshold

	// Use Welch's t-test if variances are unequal
	const useWelch = fStat > fCritical;

	let tStat: number;
	let df: number;

	if (useWelch) {
		// Welch's t-test (unequal variances)
		const se1 = Math.sqrt(Math.max(0, var1) / n1);
		const se2 = Math.sqrt(Math.max(0, var2) / n2);
		const seDiff = Math.sqrt(se1 * se1 + se2 * se2);
		if (seDiff === 0) {
			// Zero variance case - return non-significant result
			return {
				pValue: 1.0,
				isSignificant: false,
				testStatistic: 0,
				degreesOfFreedom: undefined,
			};
		}
		tStat = (mean1 - mean2) / seDiff;

		// Welch-Satterthwaite degrees of freedom
		const df1 = n1 - 1;
		const df2 = n2 - 1;
		const numerator = Math.pow(se1 * se1 + se2 * se2, 2);
		const denominator = Math.pow(se1, 4) / df1 + Math.pow(se2, 4) / df2;
		if (denominator === 0) {
			// Fallback to simple df calculation
			df = Math.min(df1, df2);
		} else {
			df = numerator / denominator;
		}
	} else {
		// Standard t-test (equal variances)
		const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
		const seDiff = Math.sqrt(Math.max(0, pooledVar) * (1 / n1 + 1 / n2));
		if (seDiff === 0) {
			// Zero variance case - return non-significant result
			return {
				pValue: 1.0,
				isSignificant: false,
				testStatistic: 0,
				degreesOfFreedom: n1 + n2 - 2,
			};
		}
		tStat = (mean1 - mean2) / seDiff;
		df = n1 + n2 - 2;
	}

	// Calculate p-value (two-tailed test)
	// Simplified p-value calculation using t-distribution approximation
	const tAbs = Math.abs(tStat);
	const tCrit = tCritical(Math.floor(df), config.significanceLevel);

	// Approximate p-value: if |t| > critical, p < alpha
	let pValue: number;
	if (tAbs > tCrit) {
		// Significant result, p-value is less than alpha
		pValue = config.significanceLevel * (tCrit / tAbs);
	} else {
		// Not significant, p-value is greater than alpha
		pValue =
			config.significanceLevel +
			(1 - config.significanceLevel) * (tAbs / tCrit);
	}

	// Ensure p-value is in valid range
	pValue = Math.max(0, Math.min(1, pValue));

	return {
		pValue,
		isSignificant: pValue < config.significanceLevel,
		testStatistic: tStat,
		degreesOfFreedom: df,
	};
}

/**
 * Calculate confidence interval for mean difference
 *
 * Computes a confidence interval (default 95%) for the true difference between
 * baseline and current profile means. Uses t-distribution for small samples,
 * normal approximation for large samples.
 *
 * @function confidenceInterval
 * @param {number[]} baseline - Baseline performance samples
 * @param {number[]} current - Current performance samples
 * @param {StatisticalConfig} [config=DEFAULT_STATISTICAL_CONFIG] - Statistical configuration
 * @returns {ConfidenceInterval} Confidence interval with lower bound, upper bound, and confidence level
 *
 * @example
 * ```typescript
 * const baseline = [10.2, 10.5, 10.1];
 * const current = [12.1, 12.3, 12.0];
 * const ci = confidenceInterval(baseline, current);
 *
 * console.log(`95% CI: [${ci.lower.toFixed(2)}, ${ci.upper.toFixed(2)}]`);
 * // If interval excludes zero, difference is statistically significant
 * ```
 */
export function confidenceInterval(
	baseline: number[],
	current: number[],
	config: StatisticalConfig = DEFAULT_STATISTICAL_CONFIG,
): ConfidenceInterval {
	if (baseline.length === 0 || current.length === 0) {
		return { lower: 0, upper: 0, level: config.confidenceLevel };
	}

	const mean1 = mean(baseline);
	const mean2 = mean(current);
	const meanDiff = mean1 - mean2;

	const se1 = standardError(baseline);
	const se2 = standardError(current);
	const seDiff = Math.sqrt(se1 * se1 + se2 * se2);

	// Use t-distribution for small samples, normal for large
	const n = Math.min(baseline.length, current.length);
	const alpha = 1 - config.confidenceLevel;
	const df = baseline.length + current.length - 2;
	const criticalValue = n < 30 ? tCritical(df, alpha / 2) : 1.96;

	const margin = criticalValue * (seDiff || 0); // Handle zero standard error

	return {
		lower: meanDiff - margin,
		upper: meanDiff + margin,
		level: config.confidenceLevel,
	};
}

/**
 * Calculate Cohen's d (effect size)
 *
 * Quantifies the magnitude of the observed difference between baseline and current
 * profiles, standardized by the pooled standard deviation. Effect size is independent
 * of sample size and helps distinguish statistical significance from practical importance.
 *
 * @function cohensD
 * @param {number[]} baseline - Baseline performance samples
 * @param {number[]} current - Current performance samples
 * @returns {EffectSize} Effect size with value and magnitude classification
 *
 * @example
 * ```typescript
 * const baseline = [10.2, 10.5, 10.1];
 * const current = [15.1, 15.3, 15.0];
 * const effect = cohensD(baseline, current);
 *
 * console.log(`Effect size: ${effect.value.toFixed(2)} (${effect.magnitude})`);
 * // Large effect sizes (>0.8) indicate practically important differences
 * ```
 */
export function cohensD(baseline: number[], current: number[]): EffectSize {
	if (baseline.length === 0 || current.length === 0) {
		return { value: 0, magnitude: "negligible" };
	}

	const mean1 = mean(baseline);
	const mean2 = mean(current);
	const var1 = variance(baseline, mean1);
	const var2 = variance(current, mean2);
	const n1 = baseline.length;
	const n2 = current.length;

	// Pooled standard deviation
	const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
	const pooledStd = Math.sqrt(Math.max(0, pooledVar));

	if (pooledStd === 0 || !isFinite(pooledStd)) {
		return { value: 0, magnitude: "negligible" };
	}

	const d = (mean1 - mean2) / pooledStd;

	// Handle non-finite values
	if (!isFinite(d)) {
		return { value: 0, magnitude: "negligible" };
	}

	// Cohen's d interpretation
	let magnitude: EffectSize["magnitude"];
	const absD = Math.abs(d);
	if (absD < 0.2) {
		magnitude = "negligible";
	} else if (absD < 0.5) {
		magnitude = "small";
	} else if (absD < 0.8) {
		magnitude = "medium";
	} else if (absD < 1.2) {
		magnitude = "large";
	} else {
		magnitude = "very large";
	}

	return { value: d, magnitude };
}

/**
 * F-test for comparing variances
 *
 * Tests whether the variances of baseline and current profiles differ significantly.
 * Significant variance changes may indicate performance instability, non-determinism,
 * or different bottleneck patterns.
 *
 * @function fTest
 * @param {number[]} baseline - Baseline performance samples
 * @param {number[]} current - Current performance samples
 * @param {StatisticalConfig} [config=DEFAULT_STATISTICAL_CONFIG] - Statistical configuration
 * @returns {StatisticalTestResult} Test results including p-value, significance, and F-statistic
 *
 * @example
 * ```typescript
 * const baseline = [10.2, 10.5, 10.1, 10.3];
 * const current = [12.1, 15.3, 8.0, 14.2]; // Higher variance
 * const result = fTest(baseline, current);
 *
 * if (result.isSignificant) {
 *   console.log('Variance has changed significantly - performance may be less stable');
 * }
 * ```
 */
export function fTest(
	baseline: number[],
	current: number[],
	config: StatisticalConfig = DEFAULT_STATISTICAL_CONFIG,
): StatisticalTestResult {
	if (baseline.length < 2 || current.length < 2) {
		return {
			pValue: 1.0,
			isSignificant: false,
			testStatistic: 1,
		};
	}

	const var1 = variance(baseline);
	const var2 = variance(current);

	// Handle zero variance cases
	if (var1 === 0 && var2 === 0) {
		return {
			pValue: 1.0,
			isSignificant: false,
			testStatistic: 1,
		};
	}

	// F-statistic (larger variance / smaller variance)
	const fStat =
		var1 > var2
			? var2 === 0
				? Infinity
				: var1 / var2
			: var1 === 0
				? Infinity
				: var2 / var1;
	const df1 = baseline.length - 1;
	const df2 = current.length - 1;

	// Handle infinite F-statistic
	if (!isFinite(fStat)) {
		return {
			pValue: 0.05, // Conservative: assume significant if one variance is zero
			isSignificant: true,
			testStatistic: fStat,
		};
	}

	// Simplified F-test p-value calculation
	// For large samples, use chi-square approximation
	let pValue: number;
	if (df1 >= 30 && df2 >= 30) {
		// Large sample approximation
		const chi1 = df1 * Math.log(var1);
		const chi2 = df2 * Math.log(var2);
		const chiDiff = Math.abs(chi1 - chi2);
		pValue = chiDiff > 3.84 ? 0.05 : 0.5; // Simplified
	} else {
		// Simplified F-test for small samples
		// Critical F values for common cases
		const criticalF = df1 <= 10 && df2 <= 10 ? 2.5 : 2.0;
		pValue = fStat > criticalF ? 0.05 * (criticalF / fStat) : 0.5;
	}

	pValue = Math.max(0, Math.min(1, pValue));

	return {
		pValue,
		isSignificant: pValue < config.significanceLevel,
		testStatistic: fStat,
		degreesOfFreedom: df1 + df2,
	};
}

/**
 * Kolmogorov-Smirnov test for comparing distributions
 *
 * Compares the entire cumulative distribution functions (CDFs) of baseline and current
 * profiles, not just means and variances. Detects differences in distribution shape,
 * including shifts, spreads, and tail behavior.
 *
 * @function kolmogorovSmirnovTest
 * @param {number[]} baseline - Baseline performance samples
 * @param {number[]} current - Current performance samples
 * @param {StatisticalConfig} [config=DEFAULT_STATISTICAL_CONFIG] - Statistical configuration
 * @returns {StatisticalTestResult} Test results including p-value, significance, and KS statistic
 *
 * @example
 * ```typescript
 * const baseline = [10.2, 10.5, 10.1, 10.3, 10.4];
 * const current = [12.1, 12.3, 12.0, 12.2, 12.4];
 * const result = kolmogorovSmirnovTest(baseline, current);
 *
 * if (result.isSignificant) {
 *   console.log('Distributions differ significantly - entire shape has changed');
 * }
 * ```
 */
export function kolmogorovSmirnovTest(
	baseline: number[],
	current: number[],
	config: StatisticalConfig = DEFAULT_STATISTICAL_CONFIG,
): StatisticalTestResult {
	if (baseline.length === 0 || current.length === 0) {
		return {
			pValue: 1.0,
			isSignificant: false,
			testStatistic: 0,
		};
	}

	// Sort both arrays
	const sorted1 = [...baseline].sort((a, b) => a - b);
	const sorted2 = [...current].sort((a, b) => a - b);

	const n1 = sorted1.length;
	const n2 = sorted2.length;

	// Calculate empirical cumulative distribution functions
	function ecdf(sorted: number[], x: number): number {
		let count = 0;
		for (const val of sorted) {
			if (val <= x) count++;
			else break;
		}
		return count / sorted.length;
	}

	// Find maximum difference between CDFs
	let maxDiff = 0;
	const allValues = [...new Set([...sorted1, ...sorted2])].sort(
		(a, b) => a - b,
	);

	for (const val of allValues) {
		const f1 = ecdf(sorted1, val);
		const f2 = ecdf(sorted2, val);
		const diff = Math.abs(f1 - f2);
		if (diff > maxDiff) {
			maxDiff = diff;
		}
	}

	// KS test statistic
	const ksStat = maxDiff;

	// Handle identical distributions (maxDiff = 0)
	if (ksStat === 0) {
		return {
			pValue: 1.0,
			isSignificant: false,
			testStatistic: 0,
		};
	}

	// Calculate p-value using KS distribution approximation
	const n = (n1 * n2) / (n1 + n2);
	const criticalValue =
		Math.sqrt(-0.5 * Math.log(config.significanceLevel / 2)) / Math.sqrt(n);

	let pValue: number;
	if (ksStat > criticalValue) {
		// Significant result
		pValue = config.significanceLevel * (criticalValue / ksStat);
	} else {
		// Not significant - use KS distribution formula
		// For small D, p-value approaches 1
		const lambda = ksStat * Math.sqrt(n);
		pValue = 1 - 2 * Math.exp(-2 * lambda * lambda);
		// Ensure p-value is reasonable
		if (pValue < 0.5) {
			pValue = 0.5 + (1 - 0.5) * (ksStat / criticalValue);
		}
	}

	pValue = Math.max(0, Math.min(1, pValue));

	return {
		pValue,
		isSignificant: pValue < config.significanceLevel,
		testStatistic: ksStat,
	};
}

/**
 * Perform complete statistical analysis comparing two samples
 *
 * Executes all statistical tests (t-test, F-test, KS test) and calculates
 * confidence intervals and effect sizes. This is the main entry point for
 * comprehensive performance comparison analysis.
 *
 * @function performStatisticalAnalysis
 * @param {number[]} baseline - Baseline performance samples (e.g., execution times from baseline profile)
 * @param {number[]} current - Current performance samples to compare against baseline
 * @param {StatisticalConfig} [config=DEFAULT_STATISTICAL_CONFIG] - Statistical configuration
 * @returns {StatisticalAnalysis} Complete statistical analysis including all tests, confidence intervals, and effect sizes
 *
 * @example
 * ```typescript
 * // Compare execution times from two CPU profiles
 * const baselineSamples = [10.2, 10.5, 10.1, 10.3, 10.4, 10.2];
 * const currentSamples = [12.1, 12.3, 12.0, 12.2, 12.4, 12.1];
 *
 * const analysis = performStatisticalAnalysis(baselineSamples, currentSamples);
 *
 * if (analysis.meanDifference.test.isSignificant) {
 *   const effect = analysis.meanDifference.effectSize;
 *   console.log(`Significant regression detected: ${effect.magnitude} effect (d=${effect.value.toFixed(2)})`);
 * }
 *
 * // Check variance stability
 * if (analysis.varianceComparison.test.isSignificant) {
 *   console.log('Warning: Performance variance has changed significantly');
 * }
 * ```
 */
export function performStatisticalAnalysis(
	baseline: number[],
	current: number[],
	config: StatisticalConfig = DEFAULT_STATISTICAL_CONFIG,
): StatisticalAnalysis {
	const meanDiffTest = studentsTTest(baseline, current, config);
	const confInterval = confidenceInterval(baseline, current, config);
	const effectSize = cohensD(baseline, current);
	const varianceTest = fTest(baseline, current, config);
	const distributionTest = kolmogorovSmirnovTest(baseline, current, config);

	const meanDiff = mean(baseline) - mean(current);
	const varianceRatio = variance(baseline) / variance(current);

	// Sample size warnings
	let warning: string | undefined;
	const minSize = config.minSampleSize;
	if (baseline.length < minSize || current.length < minSize) {
		warning = `Small sample sizes (baseline: ${baseline.length}, current: ${current.length}). Statistical power may be low.`;
	} else if (baseline.length < 30 || current.length < 30) {
		warning = `Moderate sample sizes. Consider collecting more data for robust statistical inference.`;
	}

	return {
		meanDifference: {
			test: meanDiffTest,
			meanDiff,
			confidenceInterval: confInterval,
			effectSize,
		},
		varianceComparison: {
			test: varianceTest,
			varianceRatio,
		},
		distributionComparison: {
			test: distributionTest,
			maxDifference: distributionTest.testStatistic,
		},
		sampleInfo: {
			baselineSize: baseline.length,
			currentSize: current.length,
			warning,
		},
	};
}
