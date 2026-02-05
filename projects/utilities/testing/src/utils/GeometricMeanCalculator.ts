#!/usr/bin/env bun
// GeometricMeanCalculator.ts - Production-ready scoring for Dev HQ

export class ScoreCalculationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(`[ScoreCalculation] ${message}`);
    this.name = 'ScoreCalculationError';
  }
}

interface CalculationMetadata {
  inputCount: number;
  calculationTimeNs: number;
  calculationTimeMs: number;
  error?: string;
  timestamp: string;
  bunVersion: string;
  nodeVersion: string;
}

export class GeometricMeanCalculator {
  private static readonly MIN_SCORE = Number.MIN_VALUE;
  private static readonly MAX_SCORE = Number.MAX_VALUE;

  /**
   * Calculate geometric mean with Bun-optimized safety checks
   * Uses log-sum-exp trick with overflow/underflow protection
   */
  static calculate(
    results: Record<string, number>,
    options?: {
      minValidValue?: number;
      maxValidValue?: number;
      handleInvalid?: 'ignore' | 'clamp' | 'error';
      precision?: number;
    }
  ): number {
    const {
      minValidValue = 0.0001,
      maxValidValue = 1e100,
      handleInvalid = 'error',
      precision = 6
    } = options || {};

    const entries = Object.entries(results);
    
    if (entries.length === 0) {
      throw new ScoreCalculationError('Cannot calculate score from empty results');
    }

    const validScores: number[] = [];
    const invalidFields: Array<{ field: string; value: number; reason: string }> = [];

    for (const [field, value] of entries) {
      const validation = this.validateScore(value, field, minValidValue, maxValidValue);
      
      if (validation.valid) {
        validScores.push(validation.clampedValue);
      } else {
        invalidFields.push({
          field,
          value,
          reason: validation.reason
        });

        if (handleInvalid === 'clamp') {
          validScores.push(validation.clampedValue);
        } else if (handleInvalid === 'ignore') {
          continue;
        } else {
          throw new ScoreCalculationError(
            `Invalid score for field "${field}": ${validation.reason}`
          );
        }
      }
    }

    if (validScores.length === 0) {
      throw new ScoreCalculationError('No valid scores after validation');
    }

    return this.geometricMean(validScores, precision);
  }

  private static geometricMean(scores: number[], precision: number): number {
    const n = scores.length;
    
    if (n <= 10) {
      return this.simpleGeometricMean(scores, precision);
    }
    
    return this.logSumExpMean(scores, n, precision);
  }

  private static simpleGeometricMean(scores: number[], precision: number): number {
    const product = scores.reduce((prod, val) => prod * val, 1);
    const result = Math.pow(product, 1 / scores.length);
    
    return this.roundToPrecision(result, precision);
  }

  private static logSumExpMean(
    scores: number[], 
    n: number, 
    precision: number
  ): number {
    const logScores = scores.map(s => Math.log(s));
    const maxLog = Math.max(...logScores);
    
    const sumExp = logScores.reduce((sum, logVal) => 
      sum + Math.exp(logVal - maxLog), 0
    );
    
    const logMean = Math.log(sumExp / n) + maxLog;
    const result = Math.exp(logMean);
    
    return this.roundToPrecision(result, precision);
  }

  private static validateScore(
    value: number,
    field: string,
    min: number,
    max: number
  ): { valid: boolean; clampedValue: number; reason?: string } {
    if (Number.isNaN(value)) {
      return { valid: false, clampedValue: min, reason: 'Value is NaN' };
    }

    if (!Number.isFinite(value)) {
      return { valid: false, clampedValue: max, reason: 'Value is infinite' };
    }

    if (typeof value !== 'number') {
      return { valid: false, clampedValue: min, reason: `Value is not a number: ${typeof value}` };
    }

    if (value < 0) {
      return { valid: false, clampedValue: min, reason: 'Value is negative' };
    }

    if (value < min) {
      return { valid: false, clampedValue: min, reason: `Value ${value} below minimum ${min}` };
    }

    if (value > max) {
      return { valid: false, clampedValue: max, reason: `Value ${value} exceeds maximum ${max}` };
    }

    return { valid: true, clampedValue: value };
  }

  private static roundToPrecision(value: number, precision: number): number {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }

  static calculateWithMetadata(
    results: Record<string, number>,
    options?: Parameters<typeof GeometricMeanCalculator.calculate>[1]
  ): { score: number; metadata: CalculationMetadata } {
    const start = Bun.nanoseconds();
    
    let error: Error | null = null;
    let score = 0;
    
    try {
      score = this.calculate(results, options);
    } catch (e) {
      error = e as Error;
    }
    
    const durationNs = Bun.nanoseconds() - start;
    
    return {
      score,
      metadata: {
        inputCount: Object.keys(results).length,
        calculationTimeNs: durationNs,
        calculationTimeMs: durationNs / 1_000_000,
        error: error?.message || 'none',
        timestamp: new Date().toISOString(),
        bunVersion: Bun.version,
        nodeVersion: process.version
      }
    };
  }
}

// 🚀 Self-Test / Benchmark if run directly
if (import.meta.main) {
  const testData = {
    performance: 0.95,
    reliability: 0.88,
    security: 0.92,
    scalability: 0.85
  };

  const { score, metadata } = GeometricMeanCalculator.calculateWithMetadata(testData);

  console.log(`\n🏆 SCORE: ${score}`);
  console.log(`📊 METADATA:`);
  console.table(metadata);

  // Benchmarking invalid data handling
  console.log("\n🧪 Testing Zero-Protection (Clamp Mode)...");
  const problematic = { ...testData, crash: 0 };
  const safeScore = GeometricMeanCalculator.calculate(problematic, { handleInvalid: 'clamp' });
  console.log(`Safe Score (with zero clamped): ${safeScore}`);
}
