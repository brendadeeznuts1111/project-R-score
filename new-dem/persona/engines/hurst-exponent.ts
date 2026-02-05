#!/usr/bin/env bun

// Hurst Exponent Calculator - T3-Lattice Component #8 (Table)
// Computes Hurst exponent using R/S Analysis for time series persistence

export interface HurstResult {
  value: number;
  interpretation: string;
  confidence: number;
  computationMs: number;
  timestamp: number;
}

export async function computeHurstExponent(timeSeries: Float64Array): Promise<HurstResult> {
  const start = performance.now();

  if (timeSeries.length < 10) {
    throw new Error("Insufficient data for Hurst exponent computation");
  }

  // R/S Analysis implementation
  const hurst = computeRSAnalysis(timeSeries);
  const interpretation = interpretHurstValue(hurst);
  const confidence = calculateHurstConfidence(hurst, timeSeries);
  const computationMs = performance.now() - start;

  return {
    value: hurst,
    interpretation,
    confidence,
    computationMs,
    timestamp: Date.now()
  };
}

function computeRSAnalysis(data: Float64Array): number {
  const n = data.length;

  // Create different window sizes for analysis
  const windowSizes = generateWindowSizes(n);

  const rsValues: number[] = [];
  const windowSizesUsed: number[] = [];

  for (const windowSize of windowSizes) {
    if (windowSize >= 10 && windowSize <= n) { // Minimum window size
      const rs = computeRSForWindow(data, windowSize);
      if (rs > 0) {
        rsValues.push(rs);
        windowSizesUsed.push(windowSize);
      }
    }
  }

  if (rsValues.length < 3) {
    throw new Error("Insufficient valid R/S values for Hurst calculation");
  }

  // Linear regression on log-log plot: log(R/S) vs log(windowSize)
  const logWindows = windowSizesUsed.map(size => Math.log(size));
  const logRS = rsValues.map(rs => Math.log(rs));

  const hurst = performLinearRegression(logWindows, logRS);

  return Math.max(0, Math.min(1, hurst)); // Clamp to [0,1] range
}

function generateWindowSizes(maxSize: number): number[] {
  const sizes: number[] = [];
  let size = 8; // Start with reasonable minimum

  while (size <= maxSize) {
    sizes.push(size);
    size = Math.floor(size * 1.5); // Geometric progression
  }

  return sizes;
}

function computeRSForWindow(data: Float64Array, windowSize: number): number {
  let rangeSum = 0;
  let stdDevSum = 0;
  let windowCount = 0;

  // Slide window across the data
  for (let start = 0; start <= data.length - windowSize; start += Math.floor(windowSize / 2)) {
    const window = data.slice(start, start + windowSize);

    // Compute R (range of cumulative deviations)
    const mean = window.reduce((a, b) => a + b) / window.length;
    const deviations = window.map(x => x - mean);

    // Cumulative sum
    const cumulative = deviations.reduce((acc, dev, i) => {
      acc.push((acc[i - 1] || 0) + dev);
      return acc;
    }, [] as number[]);

    const range = Math.max(...cumulative) - Math.min(...cumulative);

    // Compute S (standard deviation)
    const stdDev = Math.sqrt(
      deviations.reduce((acc, dev) => acc + dev * dev, 0) / window.length
    );

    if (stdDev > 0) {
      rangeSum += range;
      stdDevSum += stdDev;
      windowCount++;
    }
  }

  return windowCount > 0 ? (rangeSum / windowCount) / (stdDevSum / windowCount) : 0;
}

function performLinearRegression(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
  const sumX2 = x.reduce((acc, val) => acc + val * val, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

function interpretHurstValue(h: number): string {
  if (h > 0.7) return "Strong trending behavior - follow the momentum";
  if (h > 0.6) return "Moderate persistence - slight trend continuation likely";
  if (h > 0.5) return "Weak persistence - limited trend following";
  if (h > 0.4) return "Near random walk - no clear edge";
  if (h > 0.3) return "Weak anti-persistence - possible mean reversion";
  return "Strong anti-persistence - expect reversals";
}

function calculateHurstConfidence(h: number, data: Float64Array): number {
  // Base confidence on data length and statistical significance
  const dataQuality = Math.min(1, data.length / 1000);

  // Check for reasonable Hurst value range
  const validity = (h >= 0 && h <= 1) ? 1 : 0.5;

  // Assess data stationarity (simplified)
  const stationarity = assessStationarity(data);

  return (dataQuality + validity + stationarity) / 3;
}

function assessStationarity(data: Float64Array): number {
  // Simple stationarity check using variance comparison
  const halfPoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, halfPoint);
  const secondHalf = data.slice(halfPoint);

  const mean1 = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
  const mean2 = secondHalf.reduce((a, b) => a + b) / secondHalf.length;

  const var1 = firstHalf.reduce((acc, val) => acc + Math.pow(val - mean1, 2), 0) / firstHalf.length;
  const var2 = secondHalf.reduce((acc, val) => acc + Math.pow(val - mean2, 2), 0) / secondHalf.length;

  // If means and variances are similar, data is more stationary
  const meanDiff = Math.abs(mean1 - mean2) / ((mean1 + mean2) / 2);
  const varRatio = Math.max(var1, var2) / Math.min(var1, var2);

  const stationarityScore = 1 - Math.min(1, (meanDiff + Math.log(varRatio)) / 2);
  return Math.max(0, Math.min(1, stationarityScore));
}

// Performance benchmark for Hurst exponent computation
export async function benchmarkHurstComputation(
  iterations: number = 50
): Promise<{ averageMs: number; p99Ms: number; throughput: number }> {
  const testData = new Float64Array(2000);
  for (let i = 0; i < 2000; i++) {
    // Generate test data with some persistence
    testData[i] = Math.sin(i * 0.01) + Math.random() * 0.5;
  }

  const timings: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await computeHurstExponent(testData);
    const duration = performance.now() - start;
    timings.push(duration);
  }

  timings.sort((a, b) => a - b);

  return {
    averageMs: timings.reduce((a, b) => a + b) / timings.length,
    p99Ms: timings[Math.floor(timings.length * 0.99)],
    throughput: 1000 / (timings.reduce((a, b) => a + b) / timings.length)
  };
}