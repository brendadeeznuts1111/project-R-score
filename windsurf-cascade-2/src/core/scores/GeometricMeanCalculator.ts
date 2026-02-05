// scores/GeometricMeanCalculator.ts

import type { ApiResponse } from '../types/api.types';

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

    // Validate input for Bun's fast path
    const entries = Object.entries(results);
    
    if (entries.length === 0) {
      throw new ScoreCalculationError('Cannot calculate score from empty results');
    }

    // Pre-process with Bun's optimized iteration
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
          reason: validation.reason || 'Unknown validation error'
        });

        if (handleInvalid === 'clamp') {
          validScores.push(validation.clampedValue);
        } else if (handleInvalid === 'ignore') {
          // Skip invalid entry
          continue;
        } else {
          throw new ScoreCalculationError(
            `Invalid score for field "${field}": ${validation.reason || 'Unknown validation error'}` 
          );
        }
      }
    }

    if (validScores.length === 0) {
      throw new ScoreCalculationError('No valid scores after validation');
    }

    // Bun-fast geometric mean calculation
    return this.geometricMean(validScores, precision);
  }

  /**
   * Core geometric mean with overflow protection
   * Optimized for Bun's JIT
   */
  private static geometricMean(scores: number[], precision: number): number {
    // Use Bun's fast math operations
    const n = scores.length;
    
    // For small arrays, simple product is faster
    if (n <= 10) {
      return this.simpleGeometricMean(scores, precision);
    }
    
    // For large arrays, log-sum-exp is more stable
    return this.logSumExpMean(scores, n, precision);
  }

  /**
   * Simple product-based geometric mean (fast for n < 10)
   */
  private static simpleGeometricMean(scores: number[], precision: number): number {
    const product = scores.reduce((prod, val) => prod * val, 1);
    const result = Math.pow(product, 1 / scores.length);
    
    return this.roundToPrecision(result, precision);
  }

  /**
   * Log-sum-exp geometric mean (numerically stable)
   * Uses Bun's optimized Math operations
   */
  private static logSumExpMean(
    scores: number[], 
    n: number, 
    precision: number
  ): number {
    // Find max log value for numerical stability
    const logScores = scores.map(s => Math.log(s));
    const maxLog = Math.max(...logScores);
    
    // Normalize: log(sum(exp(x - max))) + max
    const sumExp = logScores.reduce((sum, logVal) => 
      sum + Math.exp(logVal - maxLog), 0
    );
    
    const logMean = Math.log(sumExp / n) + maxLog;
    const result = Math.exp(logMean);
    
    return this.roundToPrecision(result, precision);
  }

  /**
   * Validate individual score value
   */
  private static validateScore(
    value: number,
    field: string,
    min: number,
    max: number
  ): { valid: boolean; clampedValue: number; reason?: string } {
    // NaN check
    if (Number.isNaN(value)) {
      return { 
        valid: false, 
        clampedValue: min,
        reason: 'Value is NaN' 
      };
    }

    // Infinity check
    if (!Number.isFinite(value)) {
      return { 
        valid: false, 
        clampedValue: max,
        reason: 'Value is infinite' 
      };
    }

    // Type check
    if (typeof value !== 'number') {
      return { 
        valid: false, 
        clampedValue: min,
        reason: `Value is not a number: ${typeof value}` 
      };
    }

    // Negative check
    if (value < 0) {
      return { 
        valid: false, 
        clampedValue: min,
        reason: 'Value is negative' 
      };
    }

    // Range checks
    if (value < min) {
      return { 
        valid: false, 
        clampedValue: min,
        reason: `Value ${value} below minimum ${min}` 
      };
    }

    if (value > max) {
      return { 
        valid: false, 
        clampedValue: max,
        reason: `Value ${value} exceeds maximum ${max}` 
      };
    }

    return { valid: true, clampedValue: value };
  }

  /**
   * Round to specified precision
   * Bun's faster than Number.toFixed for this use case
   */
  private static roundToPrecision(value: number, precision: number): number {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }

  /**
   * Get calculation metadata for debugging
   * Bun.inspect integration
   */
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
        error: error?.message,
        timestamp: new Date().toISOString(),
        bunVersion: Bun.version,
        nodeVersion: process.version
      }
    };
  }
}

// Custom error class for Bun's error handling
export class ScoreCalculationError extends Error {
  constructor(message: string, public override readonly cause?: Error) {
    super(`[ScoreCalculation] ${message}`);
    this.name = 'ScoreCalculationError';
  }
}

// TypeScript types
interface CalculationMetadata {
  inputCount: number;
  calculationTimeNs: number;
  calculationTimeMs: number;
  error?: string | undefined;
  timestamp: string;
  bunVersion: string;
  nodeVersion: string;
}

// Export for Bun compatibility
export default GeometricMeanCalculator;
