/**
 * @registry-mcp/benchmarks - Statistical Analysis
 * High-precision performance metrics using Bun.nanoseconds()
 */

import { BENCHMARK_CONFIG } from './constants';

/**
 * Benchmark statistics calculator
 * Uses Bun's nanosecond-precision timing
 */
export class BenchmarkStats {
  private samples: number[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  /**
   * Add a timing sample (in milliseconds)
   */
  addSample(timeMs: number) {
    this.samples.push(timeMs);
  }

  /**
   * Add a sample from nanoseconds
   */
  addSampleNs(timeNs: number) {
    this.samples.push(timeNs / 1_000_000); // Convert to ms
  }

  /**
   * Record start time using Bun.nanoseconds()
   */
  start() {
    this.startTime = Bun.nanoseconds();
  }

  /**
   * Record end time and add sample
   */
  end() {
    this.endTime = Bun.nanoseconds();
    this.addSampleNs(this.endTime - this.startTime);
  }

  /**
   * Get median (50th percentile)
   */
  get p50(): number {
    return this.percentile(50);
  }

  /**
   * Get 95th percentile
   */
  get p95(): number {
    return this.percentile(95);
  }

  /**
   * Get 99th percentile (SLA target)
   */
  get p99(): number {
    return this.percentile(99);
  }

  /**
   * Calculate arbitrary percentile
   */
  percentile(p: number): number {
    if (this.samples.length === 0) return 0;

    const sorted = [...this.samples].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get arithmetic mean
   */
  get mean(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }

  /**
   * Get minimum value
   */
  get min(): number {
    if (this.samples.length === 0) return 0;
    return Math.min(...this.samples);
  }

  /**
   * Get maximum value
   */
  get max(): number {
    if (this.samples.length === 0) return 0;
    return Math.max(...this.samples);
  }

  /**
   * Get standard deviation
   */
  get stdDev(): number {
    if (this.samples.length === 0) return 0;

    const mean = this.mean;
    const variance = this.samples.reduce(
      (sum, x) => sum + Math.pow(x - mean, 2),
      0
    ) / this.samples.length;

    return Math.sqrt(variance);
  }

  /**
   * Get coefficient of variation (CV)
   * Lower is better (more consistent)
   */
  get coefficientOfVariation(): number {
    if (this.mean === 0) return 0;
    return (this.stdDev / this.mean) * 100;
  }

  /**
   * Detect and remove outliers using Z-score
   */
  removeOutliers(): number {
    const mean = this.mean;
    const stdDev = this.stdDev;
    const threshold = BENCHMARK_CONFIG.OUTLIER_THRESHOLD;

    const beforeCount = this.samples.length;

    this.samples = this.samples.filter(sample => {
      const zScore = Math.abs((sample - mean) / stdDev);
      return zScore <= threshold;
    });

    return beforeCount - this.samples.length;
  }

  /**
   * Get sample count
   */
  get count(): number {
    return this.samples.length;
  }

  /**
   * Get all samples
   */
  get allSamples(): number[] {
    return [...this.samples];
  }

  /**
   * Clear all samples
   */
  clear() {
    this.samples = [];
    this.startTime = 0;
    this.endTime = 0;
  }

  /**
   * Get summary statistics
   */
  summary() {
    return {
      count: this.count,
      min: this.min,
      max: this.max,
      mean: this.mean,
      p50: this.p50,
      p95: this.p95,
      p99: this.p99,
      stdDev: this.stdDev,
      cv: this.coefficientOfVariation,
    };
  }

  /**
   * Format time for display
   */
  static formatTime(ms: number): string {
    if (ms < 0.001) return `${(ms * 1000).toFixed(3)}μs`;
    if (ms < 1) return `${ms.toFixed(3)}ms`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

/**
 * Compare two benchmark results
 */
export function compareBenchmarks(
  baseline: BenchmarkStats,
  current: BenchmarkStats
) {
  const improvement = ((baseline.mean - current.mean) / baseline.mean) * 100;

  return {
    baseline: baseline.summary(),
    current: current.summary(),
    improvement: {
      percent: improvement,
      faster: improvement > 0,
      description:
        improvement > 0
          ? `${improvement.toFixed(1)}% faster`
          : `${Math.abs(improvement).toFixed(1)}% slower`,
    },
  };
}
