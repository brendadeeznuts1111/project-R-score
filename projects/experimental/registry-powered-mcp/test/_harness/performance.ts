/**
 * Performance Testing Utilities
 * Helpers for measuring and asserting performance metrics
 */

export interface PerformanceMetrics {
  mean: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  stdDev: number;
  iterations: number;
}

export interface PerformanceSLA {
  maxMean?: number;
  maxP95?: number;
  maxP99?: number;
  maxStdDev?: number;
  minIterations?: number;
}

/**
 * Measure performance of a function over multiple iterations
 */
export async function measurePerformance(
  fn: () => void | Promise<void>,
  iterations = 1000,
  warmup = 100
): Promise<PerformanceMetrics> {
  const times: number[] = [];

  // Warmup phase
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  // Force GC before measurement
  Bun.gc(true);

  // Measurement phase
  for (let i = 0; i < iterations; i++) {
    const start = Bun.nanoseconds();
    await fn();
    const end = Bun.nanoseconds();
    times.push((end - start) / 1_000_000); // Convert to ms
  }

  // Calculate statistics
  times.sort((a, b) => a - b);

  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const median = times[Math.floor(times.length / 2)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  const min = times[0];
  const max = times[times.length - 1];

  // Calculate standard deviation
  const variance = times.reduce((sum, time) => {
    return sum + Math.pow(time - mean, 2);
  }, 0) / times.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean,
    median,
    p95,
    p99,
    min,
    max,
    stdDev,
    iterations,
  };
}

/**
 * Detect system load and adjust performance expectations
 */
function getSystemLoadMultiplier(): number {
  try {
    // Get system load average (1-minute average)
    const loadAvg = require('os').loadavg()[0];
    const cpuCount = require('os').cpus().length;

    // Normalize load by CPU count
    const normalizedLoad = loadAvg / cpuCount;

    if (normalizedLoad < 0.5) {
      // Light load - use normal thresholds
      return 1.0;
    } else if (normalizedLoad < 1.0) {
      // Moderate load - proportional increase (1.0 to 2.0x)
      return 1.0 + normalizedLoad;
    } else if (normalizedLoad < 2.0) {
      // High load - proportional increase (2.0 to 4.0x)
      return 2.0 + normalizedLoad;
    } else if (normalizedLoad < 5.0) {
      // Very high load - 5x threshold
      return 5.0;
    } else {
      // Extreme load - 8x threshold
      return 8.0;
    }
  } catch {
    // Fallback to conservative multiplier if load detection fails
    return 2.0;
  }
}

/**
 * Assert that performance metrics meet SLA requirements
 * Adjusts thresholds based on system load to prevent flaky test failures
 * Skips tests entirely when system load is extremely high
 */
export function assertPerformanceMetrics(
  metrics: PerformanceMetrics,
  sla: PerformanceSLA
): void {
  // Skip performance tests when system load is extremely high (>10.0 normalized)
  const loadAvg = require('os').loadavg()[0];
  const cpuCount = require('os').cpus().length;
  const normalizedLoad = loadAvg / cpuCount;

  if (normalizedLoad > 8.0) {
    console.warn(`⚠️  Skipping performance test due to high system load (${loadAvg.toFixed(2)} on ${cpuCount} CPUs, normalized: ${normalizedLoad.toFixed(2)})`);
    return; // Skip the test entirely
  }

  const loadMultiplier = getSystemLoadMultiplier();
  const failures: string[] = [];

  // Adjust thresholds based on system load
  const adjustedSLA = {
    maxMean: sla.maxMean ? sla.maxMean * loadMultiplier : undefined,
    maxP95: sla.maxP95 ? sla.maxP95 * loadMultiplier : undefined,
    maxP99: sla.maxP99 ? sla.maxP99 * loadMultiplier : undefined,
    maxStdDev: sla.maxStdDev ? sla.maxStdDev * loadMultiplier : undefined,
    minIterations: sla.minIterations,
  };

  if (adjustedSLA.maxMean !== undefined && metrics.mean > adjustedSLA.maxMean) {
    failures.push(`Mean ${metrics.mean.toFixed(4)}ms exceeds ${adjustedSLA.maxMean.toFixed(4)}ms (load-adjusted from ${sla.maxMean}ms)`);
  }

  if (adjustedSLA.maxP95 !== undefined && metrics.p95 > adjustedSLA.maxP95) {
    failures.push(`P95 ${metrics.p95.toFixed(4)}ms exceeds ${adjustedSLA.maxP95.toFixed(4)}ms (load-adjusted from ${sla.maxP95}ms)`);
  }

  if (adjustedSLA.maxP99 !== undefined && metrics.p99 > adjustedSLA.maxP99) {
    failures.push(`P99 ${metrics.p99.toFixed(4)}ms exceeds ${adjustedSLA.maxP99.toFixed(4)}ms (load-adjusted from ${sla.maxP99}ms)`);
  }

  if (adjustedSLA.maxStdDev !== undefined && metrics.stdDev > adjustedSLA.maxStdDev) {
    failures.push(
      `StdDev ${metrics.stdDev.toFixed(4)}ms exceeds ${adjustedSLA.maxStdDev.toFixed(4)}ms (load-adjusted from ${sla.maxStdDev}ms)`
    );
  }

  if (adjustedSLA.minIterations !== undefined && metrics.iterations < adjustedSLA.minIterations) {
    failures.push(
      `Iterations ${metrics.iterations} below required ${adjustedSLA.minIterations}`
    );
  }

  if (failures.length > 0) {
    // Log system load information for debugging
    const loadAvg = require('os').loadavg()[0];
    const cpuCount = require('os').cpus().length;
    console.warn(`⚠️  Performance test failures detected (System Load: ${loadAvg.toFixed(2)}, CPUs: ${cpuCount}, Multiplier: ${loadMultiplier.toFixed(1)}x)`);

    throw new Error(
      `Performance SLA violations:\n${failures.map(f => `  - ${f}`).join('\n')}`
    );
  }
}

/**
 * Detect performance regression by comparing current metrics to baseline
 */
export function detectPerformanceRegression(
  current: PerformanceMetrics,
  baseline: PerformanceMetrics,
  threshold = 0.1 // 10% regression threshold
): { hasRegression: boolean; details: string[] } {
  const details: string[] = [];

  const meanChange = (current.mean - baseline.mean) / baseline.mean;
  if (meanChange > threshold) {
    details.push(
      `Mean regression: ${(meanChange * 100).toFixed(2)}% ` +
      `(${baseline.mean.toFixed(4)}ms → ${current.mean.toFixed(4)}ms)`
    );
  }

  const p99Change = (current.p99 - baseline.p99) / baseline.p99;
  if (p99Change > threshold) {
    details.push(
      `P99 regression: ${(p99Change * 100).toFixed(2)}% ` +
      `(${baseline.p99.toFixed(4)}ms → ${current.p99.toFixed(4)}ms)`
    );
  }

  return {
    hasRegression: details.length > 0,
    details,
  };
}

/**
 * Measure memory usage of a function
 */
export async function measureMemory(
  fn: () => void | Promise<void>,
  iterations = 100
): Promise<{ heapUsed: number; heapTotal: number; external: number }> {
  // Force GC before measurement
  Bun.gc(true);
  await new Promise(resolve => setTimeout(resolve, 100));

  const before = process.memoryUsage();

  for (let i = 0; i < iterations; i++) {
    await fn();
  }

  // Force GC after measurement
  Bun.gc(true);
  await new Promise(resolve => setTimeout(resolve, 100));

  const after = process.memoryUsage();

  return {
    heapUsed: after.heapUsed - before.heapUsed,
    heapTotal: after.heapTotal - before.heapTotal,
    external: after.external - before.external,
  };
}

/**
 * Format performance metrics for display
 */
export function formatMetrics(metrics: PerformanceMetrics): string {
  return [
    `Mean: ${metrics.mean.toFixed(4)}ms`,
    `Median: ${metrics.median.toFixed(4)}ms`,
    `P95: ${metrics.p95.toFixed(4)}ms`,
    `P99: ${metrics.p99.toFixed(4)}ms`,
    `Min: ${metrics.min.toFixed(4)}ms`,
    `Max: ${metrics.max.toFixed(4)}ms`,
    `StdDev: ${metrics.stdDev.toFixed(4)}ms`,
    `Iterations: ${metrics.iterations}`,
  ].join('\n');
}
