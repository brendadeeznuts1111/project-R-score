/**
 * Fractal Computation Engine
 * O(n log n) FD/Hurst computation using Bun workers
 */

import type { OddsTick, FDResult, HurstResult, LatticeConfig, DEFAULT_CONFIG } from '../types';

// Inline computation for when workers aren't available
function computeBoxCountingFD(series: Float64Array, resolution: number): number {
  const n = series.length;
  if (n < 2) return 1.0;

  let min = series[0];
  let max = series[0];

  for (let i = 1; i < n; i++) {
    if (series[i] < min) min = series[i];
    if (series[i] > max) max = series[i];
  }

  const range = max - min;
  if (range === 0) return 1.0;

  const scale = range / resolution;
  let boxes = 0;

  for (let i = 0; i < n - 1; i++) {
    const height = Math.abs(series[i + 1] - series[i]) / scale;
    boxes += Math.max(1, Math.ceil(height));
  }

  const fd = Math.log(boxes) / Math.log(resolution);
  return Math.max(1.0, Math.min(2.0, fd));
}

function computeHurstExponent(series: Float64Array, segmentSize: number): number {
  const n = series.length;
  if (n < 4) return 0.5;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += series[i];
  }
  const mean = sum / n;

  let sqSum = 0;
  for (let i = 0; i < n; i++) {
    sqSum += Math.pow(series[i] - mean, 2);
  }
  const stdDev = Math.sqrt(sqSum / n);

  if (stdDev === 0) return 0.5;

  const numSegments = Math.max(1, Math.floor(n / segmentSize));
  let totalRS = 0;

  for (let seg = 0; seg < numSegments; seg++) {
    const start = seg * segmentSize;
    const end = Math.min(start + segmentSize, n);
    const segLen = end - start;

    if (segLen < 2) continue;

    let segSum = 0;
    for (let i = start; i < end; i++) {
      segSum += series[i];
    }
    const segMean = segSum / segLen;

    let cumSum = 0;
    let minCum = 0;
    let maxCum = 0;

    for (let i = start; i < end; i++) {
      cumSum += series[i] - segMean;
      if (cumSum < minCum) minCum = cumSum;
      if (cumSum > maxCum) maxCum = cumSum;
    }

    const range = maxCum - minCum;

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
  const hurst = Math.log(avgRS) / Math.log(n);

  return Math.max(0, Math.min(1, hurst));
}

export class FractalEngine {
  private slaLatencyMs: number;
  private slaViolations: number = 0;

  constructor(config: Partial<LatticeConfig> = {}) {
    this.slaLatencyMs = config.slaLatencyMs || 50;
  }

  /**
   * Compute Fractal Dimension using box-counting method
   */
  async computeFD(ticks: OddsTick[], resolution = 1000): Promise<FDResult> {
    const spreadSeries = new Float64Array(ticks.map(t => t.spread));

    const start = Bun.nanoseconds();
    const fd = computeBoxCountingFD(spreadSeries, resolution);
    const duration = (Bun.nanoseconds() - start) / 1_000_000;

    // SLA enforcement
    if (duration > this.slaLatencyMs) {
      this.slaViolations++;
      console.warn(`[FD] SLA violation: ${duration.toFixed(2)}ms > ${this.slaLatencyMs}ms`);
    }

    return {
      fd,
      computationTime: duration,
      method: 'box_counting',
    };
  }

  /**
   * Compute Hurst Exponent using R/S analysis
   */
  async computeHurst(ticks: OddsTick[], segmentSize = 1024): Promise<HurstResult> {
    const series = new Float64Array(ticks.map(t => t.spread));

    const start = Bun.nanoseconds();
    const hurst = computeHurstExponent(series, segmentSize);
    const duration = (Bun.nanoseconds() - start) / 1_000_000;

    return {
      hurst,
      computationTime: duration,
    };
  }

  /**
   * Combined FD + Hurst analysis
   */
  async analyze(ticks: OddsTick[]): Promise<{ fd: FDResult; hurst: HurstResult }> {
    const [fd, hurst] = await Promise.all([
      this.computeFD(ticks),
      this.computeHurst(ticks),
    ]);

    return { fd, hurst };
  }

  /**
   * Get SLA compliance stats
   */
  getStats(): { violations: number } {
    return { violations: this.slaViolations };
  }
}

export { computeBoxCountingFD, computeHurstExponent };
