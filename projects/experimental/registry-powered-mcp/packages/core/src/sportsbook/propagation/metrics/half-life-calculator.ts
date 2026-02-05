/**
 * Half-Life Calculator
 * Exponential decay curve fitting for propagation delay analysis
 *
 * Uses Exponential Moving Average (EMA) for real-time O(1) updates
 * Formula: halfLife = ln(2) / decayConstant
 *
 * Performance Target: <50μs per update
 *
 * SYSCALL: HALFLIFE_DECAY_CALCULATOR
 */

import {
  type HalfLifeMetrics,
  type PropagationEntry,
  type MarketTier,
  PROPAGATION_PERFORMANCE_TARGETS,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

/** Natural log of 2, used in half-life calculation */
const LN2 = Math.LN2; // 0.693147...

/** Default EMA alpha for smoothing (10% weight on new samples) */
const DEFAULT_EMA_ALPHA = 0.1;

/** Default z-score threshold for anomaly detection */
const DEFAULT_ANOMALY_THRESHOLD = 3.0;

/** Minimum samples before metrics are considered reliable */
const MIN_SAMPLES_FOR_RELIABILITY = 10;

// ============================================================================
// Ring Buffer for Delay Samples
// ============================================================================

/**
 * Fixed-size ring buffer for O(1) insertion and O(n) percentile calculation
 * Optimized for memory efficiency with Float64Array backing
 */
export class DelayRingBuffer {
  private readonly buffer: Float64Array;
  private readonly size: number;
  private head = 0;
  private count = 0;

  constructor(size: number) {
    this.size = size;
    this.buffer = new Float64Array(size);
  }

  /**
   * Push a new delay sample (O(1))
   */
  push(delayMs: number): void {
    this.buffer[this.head] = delayMs;
    this.head = (this.head + 1) % this.size;
    if (this.count < this.size) {
      this.count++;
    }
  }

  /**
   * Get current sample count
   */
  get length(): number {
    return this.count;
  }

  /**
   * Get all samples (unordered)
   */
  getSamples(): Float64Array {
    if (this.count < this.size) {
      return this.buffer.subarray(0, this.count);
    }
    return this.buffer;
  }

  /**
   * Calculate percentile (requires sorting, O(n log n))
   */
  percentile(p: number): number {
    if (this.count === 0) return 0;

    const samples = Array.from(this.getSamples()).sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * samples.length) - 1;
    return samples[Math.max(0, index)];
  }

  /**
   * Calculate mean (O(n))
   */
  mean(): number {
    if (this.count === 0) return 0;

    let sum = 0;
    const samples = this.getSamples();
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i];
    }
    return sum / samples.length;
  }

  /**
   * Calculate standard deviation (O(n))
   */
  stdDev(): number {
    if (this.count < 2) return 0;

    const avg = this.mean();
    let sumSq = 0;
    const samples = this.getSamples();
    for (let i = 0; i < samples.length; i++) {
      const diff = samples[i] - avg;
      sumSq += diff * diff;
    }
    return Math.sqrt(sumSq / samples.length);
  }

  /**
   * Get min and max (O(n))
   */
  minMax(): { min: number; max: number } {
    if (this.count === 0) return { min: 0, max: 0 };

    let min = Infinity;
    let max = -Infinity;
    const samples = this.getSamples();
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] < min) min = samples[i];
      if (samples[i] > max) max = samples[i];
    }
    return { min, max };
  }

  /**
   * Clear all samples
   */
  clear(): void {
    this.head = 0;
    this.count = 0;
    this.buffer.fill(0);
  }

  /**
   * Get memory usage in bytes
   */
  memoryBytes(): number {
    return this.buffer.byteLength;
  }
}

// ============================================================================
// EMA Calculator
// ============================================================================

/**
 * Exponential Moving Average calculator for real-time half-life estimation
 * O(1) time and space complexity per update
 */
export class EMACalculator {
  private value: number = 0;
  private initialized = false;
  private readonly alpha: number;

  constructor(alpha: number = DEFAULT_EMA_ALPHA) {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   * Update EMA with new sample (O(1))
   */
  update(sample: number): number {
    if (!this.initialized) {
      this.value = sample;
      this.initialized = true;
    } else {
      // EMA formula: new = alpha * sample + (1 - alpha) * old
      this.value = this.alpha * sample + (1 - this.alpha) * this.value;
    }
    return this.value;
  }

  /**
   * Get current EMA value
   */
  get(): number {
    return this.value;
  }

  /**
   * Check if calculator has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset calculator state
   */
  reset(): void {
    this.value = 0;
    this.initialized = false;
  }
}

// ============================================================================
// Half-Life Calculator
// ============================================================================

/**
 * State for a single market pair or tier being tracked
 */
export interface CalculatorState {
  /** Ring buffer for delay samples */
  readonly delayBuffer: DelayRingBuffer;
  /** EMA calculator for half-life */
  readonly halfLifeEMA: EMACalculator;
  /** EMA calculator for damping ratio */
  readonly dampingEMA: EMACalculator;
  /** Historical baseline mean (for anomaly detection) */
  baselineMean: number;
  /** Historical baseline stddev */
  baselineStdDev: number;
  /** Total sample count (including cleared) */
  totalSamples: number;
  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Half-Life Calculator
 * Computes propagation half-life metrics using exponential decay fitting
 */
export class HalfLifeCalculator {
  private readonly states: Map<string, CalculatorState> = new Map();
  private readonly bufferSize: number;
  private readonly emaAlpha: number;
  private readonly anomalyThreshold: number;

  constructor(options: {
    bufferSize?: number;
    emaAlpha?: number;
    anomalyThreshold?: number;
  } = {}) {
    this.bufferSize = options.bufferSize ?? 100;
    this.emaAlpha = options.emaAlpha ?? DEFAULT_EMA_ALPHA;
    this.anomalyThreshold = options.anomalyThreshold ?? DEFAULT_ANOMALY_THRESHOLD;
  }

  /**
   * Generate key for market pair or tier tracking
   */
  private getKey(tier: MarketTier, bookmaker?: string): string {
    return bookmaker ? `${tier}:${bookmaker}` : `tier:${tier}`;
  }

  /**
   * Get or create state for a key
   */
  private getState(key: string): CalculatorState {
    let state = this.states.get(key);
    if (!state) {
      state = {
        delayBuffer: new DelayRingBuffer(this.bufferSize),
        halfLifeEMA: new EMACalculator(this.emaAlpha),
        dampingEMA: new EMACalculator(this.emaAlpha),
        baselineMean: 0,
        baselineStdDev: 0,
        totalSamples: 0,
        lastUpdate: 0,
      };
      this.states.set(key, state);
    }
    return state;
  }

  /**
   * Process a propagation entry and update metrics
   * Performance: O(1) for EMA update, O(n) periodic for stats
   */
  processEntry(entry: PropagationEntry): HalfLifeMetrics {
    const key = this.getKey(entry.tier, entry.bookmaker);
    const state = this.getState(key);

    // Push delay to ring buffer
    state.delayBuffer.push(entry.propagationDelayMs);
    state.totalSamples++;
    state.lastUpdate = entry.timestamp;

    // Update half-life EMA
    // Half-life = delay / (1 - dampingRatio) for exponential decay
    const effectiveDelay = entry.dampingRatio > 0
      ? entry.propagationDelayMs / (1 - Math.min(entry.dampingRatio, 0.99))
      : entry.propagationDelayMs;
    const halfLife = state.halfLifeEMA.update(effectiveDelay);

    // Update damping EMA
    state.dampingEMA.update(entry.dampingRatio);

    // Compute metrics
    return this.computeMetrics(state, halfLife);
  }

  /**
   * Compute full metrics from state
   */
  private computeMetrics(state: CalculatorState, halfLifeMs: number): HalfLifeMetrics {
    const buffer = state.delayBuffer;

    // Calculate decay constant: lambda = ln(2) / halfLife
    const decayConstant = halfLifeMs > 0 ? LN2 / halfLifeMs : 0;

    // Calculate percentiles
    const p50DelayMs = buffer.percentile(50);
    const p99DelayMs = buffer.percentile(99);

    // Update baseline if we have enough samples
    if (state.totalSamples === MIN_SAMPLES_FOR_RELIABILITY) {
      state.baselineMean = buffer.mean();
      state.baselineStdDev = buffer.stdDev();
    }

    // Calculate anomaly score using z-score
    let anomalyScore = 0;
    let isAnomalous = false;

    if (state.baselineStdDev > 0 && state.totalSamples >= MIN_SAMPLES_FOR_RELIABILITY) {
      const currentMean = buffer.mean();
      const zScore = Math.abs(currentMean - state.baselineMean) / state.baselineStdDev;
      anomalyScore = Math.min(1, zScore / (this.anomalyThreshold * 2));
      isAnomalous = zScore > this.anomalyThreshold;
    }

    return {
      halfLifeMs,
      decayConstant,
      p50DelayMs,
      p99DelayMs,
      anomalyScore,
      isAnomalous,
      sampleCount: buffer.length,
      lastUpdate: state.lastUpdate,
    };
  }

  /**
   * Get current metrics for a tier/bookmaker combination
   */
  getMetrics(tier: MarketTier, bookmaker?: string): HalfLifeMetrics | null {
    const key = this.getKey(tier, bookmaker);
    const state = this.states.get(key);

    if (!state || !state.halfLifeEMA.isInitialized()) {
      return null;
    }

    return this.computeMetrics(state, state.halfLifeEMA.get());
  }

  /**
   * Get all tracked tier/bookmaker combinations
   */
  getTrackedKeys(): string[] {
    return Array.from(this.states.keys());
  }

  /**
   * Get metrics for all tiers (aggregated by tier, ignoring bookmaker)
   */
  getAllTierMetrics(): Map<MarketTier, HalfLifeMetrics> {
    const result = new Map<MarketTier, HalfLifeMetrics>();

    for (const [key, state] of this.states) {
      if (key.startsWith('tier:')) {
        const tier = parseInt(key.split(':')[1]) as MarketTier;
        if (state.halfLifeEMA.isInitialized()) {
          result.set(tier, this.computeMetrics(state, state.halfLifeEMA.get()));
        }
      }
    }

    return result;
  }

  /**
   * Reset tracking for a specific tier/bookmaker
   */
  reset(tier: MarketTier, bookmaker?: string): void {
    const key = this.getKey(tier, bookmaker);
    this.states.delete(key);
  }

  /**
   * Reset all tracking
   */
  resetAll(): void {
    this.states.clear();
  }

  /**
   * Get memory usage in bytes
   */
  memoryBytes(): number {
    let total = 0;
    for (const state of this.states.values()) {
      total += state.delayBuffer.memoryBytes();
      total += 64; // Approximate for EMA calculators and metadata
    }
    return total;
  }

  /**
   * Get statistics about current state
   */
  getStats(): {
    trackedPairs: number;
    totalSamples: number;
    memoryBytes: number;
  } {
    let totalSamples = 0;
    for (const state of this.states.values()) {
      totalSamples += state.totalSamples;
    }

    return {
      trackedPairs: this.states.size,
      totalSamples,
      memoryBytes: this.memoryBytes(),
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate theoretical half-life for a market tier
 * Based on expected propagation delay and damping
 */
export function calculateTheoreticalHalfLife(
  avgDelayMs: number,
  avgDamping: number
): number {
  if (avgDamping >= 1) return Infinity;
  if (avgDamping <= 0) return avgDelayMs;

  // Half-life formula for exponential decay with damping
  // The time for signal to decay to 50% of original
  return avgDelayMs / (1 - avgDamping) * LN2;
}

/**
 * Calculate decay at a given time
 * Returns the fraction of signal remaining (0-1)
 */
export function calculateDecay(
  halfLifeMs: number,
  elapsedMs: number
): number {
  if (halfLifeMs <= 0) return 0;
  const decayConstant = LN2 / halfLifeMs;
  return Math.exp(-decayConstant * elapsedMs);
}

/**
 * Estimate time to reach a target decay level
 * Returns milliseconds to reach targetDecay (0-1)
 */
export function calculateTimeToDecay(
  halfLifeMs: number,
  targetDecay: number
): number {
  if (halfLifeMs <= 0 || targetDecay <= 0 || targetDecay >= 1) return 0;

  // Solve: targetDecay = e^(-lambda * t)
  // t = -ln(targetDecay) / lambda
  const decayConstant = LN2 / halfLifeMs;
  return -Math.log(targetDecay) / decayConstant;
}
