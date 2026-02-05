/**
 * ML Model Base Class
 * Abstract stub implementation for all ML models
 *
 * SYSCALL: ML_MODEL_BASE
 */

import {
  type MLModel,
  type MLModelInput,
  type MLModelOutput,
  type MLModelStats,
  type SLAMetadata,
  MLModelId,
  MLProcessingTier,
  MLSignal,
  ML_MODEL_DEFINITIONS,
  ML_TIER_CONFIG,
} from './types';

/**
 * Ring buffer for latency tracking
 */
class LatencyBuffer {
  private readonly buffer: Float64Array;
  private head = 0;
  private count = 0;

  constructor(private readonly size: number = 100) {
    this.buffer = new Float64Array(size);
  }

  push(latencyUs: number): void {
    this.buffer[this.head] = latencyUs;
    this.head = (this.head + 1) % this.size;
    if (this.count < this.size) this.count++;
  }

  average(): number {
    if (this.count === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.count; i++) {
      sum += this.buffer[i];
    }
    return sum / this.count;
  }

  percentile(p: number): number {
    if (this.count === 0) return 0;
    const samples = Array.from(this.buffer.subarray(0, this.count)).sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * samples.length) - 1;
    return samples[Math.max(0, index)];
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
    this.buffer.fill(0);
  }
}

/**
 * Abstract base class for ML model stubs
 */
export abstract class MLModelBase implements MLModel {
  readonly id: MLModelId;
  readonly name: string;
  readonly tier: MLProcessingTier;
  readonly targetSlaMs: number;

  protected evaluations = 0;
  protected slaViolations = 0;
  protected lastEvaluation = 0;
  protected signalCounts: Record<MLSignal, number> = {
    [MLSignal.HOLD]: 0,
    [MLSignal.ADJUST_UP]: 0,
    [MLSignal.ADJUST_DOWN]: 0,
    [MLSignal.REVIEW]: 0,
    [MLSignal.SUSPEND]: 0,
    [MLSignal.SYNC]: 0,
  };
  protected latencyBuffer = new LatencyBuffer(100);
  protected ready = true;

  constructor(modelId: MLModelId) {
    const def = ML_MODEL_DEFINITIONS[modelId];
    this.id = modelId;
    this.name = def.name;
    this.tier = def.tier;
    this.targetSlaMs = def.targetSlaMs;
  }

  /**
   * Evaluate model - calls abstract implementation
   */
  evaluate(input: MLModelInput): MLModelOutput {
    const startNs = Bun.nanoseconds();

    // Call model-specific implementation
    const { signal, confidence, payload } = this.evaluateImpl(input);

    const endNs = Bun.nanoseconds();
    const latencyUs = Number(endNs - startNs) / 1000;
    const latencyMs = latencyUs / 1000;

    // Track metrics
    this.evaluations++;
    this.lastEvaluation = Date.now();
    this.latencyBuffer.push(latencyUs);
    this.signalCounts[signal]++;

    const slaMet = latencyMs <= this.targetSlaMs;
    if (!slaMet) {
      this.slaViolations++;
    }

    const slaMetadata: SLAMetadata = {
      targetMs: this.targetSlaMs,
      actualMs: latencyMs,
      met: slaMet,
      tier: this.tier,
    };

    return {
      modelId: this.id,
      confidence,
      signal,
      latencyUs,
      slaMetadata,
      payload,
    };
  }

  /**
   * Model-specific evaluation logic (stub)
   */
  protected abstract evaluateImpl(input: MLModelInput): {
    signal: MLSignal;
    confidence: number;
    payload: Record<string, unknown>;
  };

  isReady(): boolean {
    return this.ready;
  }

  getStats(): MLModelStats {
    return {
      evaluations: this.evaluations,
      slaViolations: this.slaViolations,
      avgLatencyUs: this.latencyBuffer.average(),
      p99LatencyUs: this.latencyBuffer.percentile(99),
      lastEvaluation: this.lastEvaluation,
      signalDistribution: { ...this.signalCounts },
    };
  }

  reset(): void {
    this.evaluations = 0;
    this.slaViolations = 0;
    this.lastEvaluation = 0;
    this.latencyBuffer.clear();
    this.signalCounts = {
      [MLSignal.HOLD]: 0,
      [MLSignal.ADJUST_UP]: 0,
      [MLSignal.ADJUST_DOWN]: 0,
      [MLSignal.REVIEW]: 0,
      [MLSignal.SUSPEND]: 0,
      [MLSignal.SYNC]: 0,
    };
  }

  /**
   * Get tier configuration
   */
  getTierConfig() {
    return ML_TIER_CONFIG[this.tier];
  }

  /**
   * Get model definition
   */
  getDefinition() {
    return ML_MODEL_DEFINITIONS[this.id];
  }
}
