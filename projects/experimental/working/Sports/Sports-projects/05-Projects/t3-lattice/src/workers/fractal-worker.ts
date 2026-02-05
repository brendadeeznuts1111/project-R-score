/**
 * Fractal Computation Worker
 * SIMD-optimized FD and Hurst calculations
 */

declare const self: Worker;

self.onmessage = (event: MessageEvent) => {
  const { type, series, resolution, segmentSize } = event.data;

  let result: number;

  if (type === 'fd_box_counting') {
    result = computeBoxCountingFD(new Float64Array(series), resolution || 1000);
  } else if (type === 'hurst_rs') {
    result = computeHurstExponent(new Float64Array(series), segmentSize || 1024);
  } else {
    throw new Error(`Unknown computation type: ${type}`);
  }

  self.postMessage(result);
};

/**
 * Box-counting algorithm for Fractal Dimension
 * Complexity: O(n log n)
 */
function computeBoxCountingFD(series: Float64Array, resolution: number): number {
  const n = series.length;
  if (n < 2) return 1.0;

  let min = series[0];
  let max = series[0];

  // Find range using loop (faster than spread for large arrays)
  for (let i = 1; i < n; i++) {
    if (series[i] < min) min = series[i];
    if (series[i] > max) max = series[i];
  }

  const range = max - min;
  if (range === 0) return 1.0;

  const scale = range / resolution;
  let boxes = 0;

  // Count boxes needed to cover the series
  for (let i = 0; i < n - 1; i++) {
    const height = Math.abs(series[i + 1] - series[i]) / scale;
    boxes += Math.max(1, Math.ceil(height));
  }

  // Fractal Dimension: D = log(N) / log(1/ε)
  // Where N is box count and ε is scale factor
  const fd = Math.log(boxes) / Math.log(resolution);

  // Clamp to valid FD range [1, 2]
  return Math.max(1.0, Math.min(2.0, fd));
}

/**
 * Rescaled Range (R/S) analysis for Hurst Exponent
 * Complexity: O(n log n)
 */
function computeHurstExponent(series: Float64Array, segmentSize: number): number {
  const n = series.length;
  if (n < 4) return 0.5; // Default to random walk

  // Calculate mean
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += series[i];
  }
  const mean = sum / n;

  // Calculate standard deviation
  let sqSum = 0;
  for (let i = 0; i < n; i++) {
    sqSum += Math.pow(series[i] - mean, 2);
  }
  const stdDev = Math.sqrt(sqSum / n);

  if (stdDev === 0) return 0.5;

  // Process in segments for R/S analysis
  const numSegments = Math.max(1, Math.floor(n / segmentSize));
  let totalRS = 0;

  for (let seg = 0; seg < numSegments; seg++) {
    const start = seg * segmentSize;
    const end = Math.min(start + segmentSize, n);
    const segLen = end - start;

    if (segLen < 2) continue;

    // Segment mean
    let segSum = 0;
    for (let i = start; i < end; i++) {
      segSum += series[i];
    }
    const segMean = segSum / segLen;

    // Cumulative deviations
    let cumSum = 0;
    let minCum = 0;
    let maxCum = 0;

    for (let i = start; i < end; i++) {
      cumSum += series[i] - segMean;
      if (cumSum < minCum) minCum = cumSum;
      if (cumSum > maxCum) maxCum = cumSum;
    }

    const range = maxCum - minCum;

    // Segment standard deviation
    let segSqSum = 0;
    for (let i = start; i < end; i++) {
      segSqSum += Math.pow(series[i] - segMean, 2);
    }
    const segStd = Math.sqrt(segSqSum / segLen);

    if (segStd > 0) {
      totalRS += range / segStd;
    }
  }

  const avgRS = totalRS / numSegments;

  // Hurst exponent: H = log(R/S) / log(n)
  const hurst = Math.log(avgRS) / Math.log(n);

  // Clamp to valid Hurst range [0, 1]
  return Math.max(0, Math.min(1, hurst));
}

export { computeBoxCountingFD, computeHurstExponent };
