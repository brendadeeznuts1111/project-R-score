#!/usr/bin/env bun
/**
 * Anomaly Detection for Syndicate Patterns
 * 
 * Statistical anomaly detection for identifying unusual patterns
 * in syndicate betting behavior.
 */

import type { SyndicateBet, SyndicatePattern } from '../types';

// =============================================================================
// ANOMALY DETECTION TYPES
// =============================================================================

export interface AnomalyMetadata {
  [key: string]: string | number | boolean | null | undefined | Record<string, unknown> | unknown[];
}

export interface AnomalyResult {
  isAnomaly: boolean;
  score: number; // 0.0 - 1.0, higher = more anomalous
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: AnomalyMetadata;
}

export interface StatisticalBaseline {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  sampleSize: number;
}

// =============================================================================
// ANOMALY DETECTOR
// =============================================================================

export class AnomalyDetector {
  private zScoreThreshold: number = 3.0; // Standard deviations
  private iqrMultiplier: number = 1.5; // For IQR method

  private getSeverityFromZScore(zScore: number): AnomalyResult['severity'] {
    if (zScore > 4.0) return 'critical';
    if (zScore > 3.5) return 'high';
    if (zScore > 3.0) return 'medium';
    return 'low';
  }

  private getSeverityFromScore(score: number): AnomalyResult['severity'] {
    if (score > 0.8) return 'critical';
    if (score > 0.6) return 'high';
    if (score > 0.4) return 'medium';
    return 'low';
  }

  private getSeverityFromChangePercent(changePercent: number): AnomalyResult['severity'] {
    if (changePercent > 1.0) return 'critical';
    if (changePercent > 0.75) return 'high';
    if (changePercent > 0.5) return 'medium';
    return 'low';
  }

  private getSeverityFromBetsPerMinute(betsPerMinute: number): AnomalyResult['severity'] {
    if (betsPerMinute > 30) return 'critical';
    if (betsPerMinute > 20) return 'high';
    if (betsPerMinute > 10) return 'medium';
    return 'low';
  }

  /**
   * Detect anomalies in betting frequency
   */
  detectFrequencyAnomaly(
    currentFrequency: number,
    historicalFrequencies: number[]
  ): AnomalyResult {
    if (historicalFrequencies.length < 10) {
      return {
        isAnomaly: false,
        score: 0,
        reason: 'Insufficient historical data',
        severity: 'low'
      };
    }

    const baseline = this.calculateBaseline(historicalFrequencies);
    const zScore = Math.abs((currentFrequency - baseline.mean) / baseline.stdDev);

    const isAnomaly = zScore > this.zScoreThreshold;
    const score = Math.min(1.0, zScore / this.zScoreThreshold);
    const severity = this.getSeverityFromZScore(zScore);

    return {
      isAnomaly,
      score,
      reason: `Frequency ${currentFrequency} deviates ${zScore.toFixed(2)} standard deviations from mean ${baseline.mean.toFixed(2)}`,
      severity,
      metadata: {
        currentFrequency,
        baseline,
        zScore
      }
    };
  }

  /**
   * Detect anomalies in bet amounts
   */
  detectAmountAnomaly(
    currentAmount: number,
    historicalAmounts: number[]
  ): AnomalyResult {
    if (historicalAmounts.length < 10) {
      return {
        isAnomaly: false,
        score: 0,
        reason: 'Insufficient historical data',
        severity: 'low'
      };
    }

    const baseline = this.calculateBaseline(historicalAmounts);
    const zScore = Math.abs((currentAmount - baseline.mean) / baseline.stdDev);

    const isAnomaly = zScore > this.zScoreThreshold;
    const score = Math.min(1.0, zScore / this.zScoreThreshold);
    const severity = this.getSeverityFromZScore(zScore);

    return {
      isAnomaly,
      score,
      reason: `Bet amount $${currentAmount} deviates ${zScore.toFixed(2)} standard deviations from mean $${baseline.mean.toFixed(2)}`,
      severity,
      metadata: {
        currentAmount,
        baseline,
        zScore
      }
    };
  }

  /**
   * Detect anomalies using IQR (Interquartile Range) method
   */
  detectIQRAnomaly(values: number[]): AnomalyResult[] {
    if (values.length < 4) {
      return [];
    }

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.percentile(sorted, 25);
    const q3 = this.percentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - this.iqrMultiplier * iqr;
    const upperBound = q3 + this.iqrMultiplier * iqr;

    return values.map((value, index) => {
      const isAnomaly = value < lowerBound || value > upperBound;
      const distance = value < lowerBound 
        ? lowerBound - value 
        : value - upperBound;
      const score = isAnomaly ? Math.min(1.0, distance / iqr) : 0;
      const severity = this.getSeverityFromScore(score);

      return {
        isAnomaly,
        score,
        reason: isAnomaly 
          ? `Value ${value} outside IQR bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`
          : 'Value within normal range',
        severity,
        metadata: {
          value,
          q1,
          q3,
          iqr,
          lowerBound,
          upperBound
        }
      };
    });
  }

  /**
   * Detect pattern strength anomalies
   */
  detectPatternStrengthAnomaly(
    currentStrength: number,
    historicalStrengths: number[]
  ): AnomalyResult {
    if (historicalStrengths.length < 5) {
      return {
        isAnomaly: false,
        score: 0,
        reason: 'Insufficient historical data',
        severity: 'low'
      };
    }

    // Pattern strength should be relatively stable
    // Large changes indicate potential issues
    const baseline = this.calculateBaseline(historicalStrengths);
    const change = Math.abs(currentStrength - baseline.mean);
    const changePercent = change / baseline.mean;

    const isAnomaly = changePercent > 0.5; // 50% change
    const score = Math.min(1.0, changePercent);
    const severity = this.getSeverityFromChangePercent(changePercent);

    return {
      isAnomaly,
      score,
      reason: `Pattern strength changed by ${(changePercent * 100).toFixed(1)}%`,
      severity,
      metadata: {
        currentStrength,
        baseline,
        changePercent
      }
    };
  }

  /**
   * Detect rapid betting anomalies
   */
  detectRapidBettingAnomaly(
    bets: Array<{ timestamp: number }>,
    timeWindowMs: number = 60000 // 1 minute
  ): AnomalyResult {
    if (bets.length < 2) {
      return {
        isAnomaly: false,
        score: 0,
        reason: 'Insufficient bets',
        severity: 'low'
      };
    }

    const recentBets = bets.filter(b => 
      Date.now() - b.timestamp < timeWindowMs
    );

    const betsPerMinute = recentBets.length / (timeWindowMs / 60000);
    const threshold = 10; // More than 10 bets per minute is anomalous

    const isAnomaly = betsPerMinute > threshold;
    const score = Math.min(1.0, betsPerMinute / threshold);
    const severity = this.getSeverityFromBetsPerMinute(betsPerMinute);

    return {
      isAnomaly,
      score,
      reason: `Rapid betting detected: ${betsPerMinute.toFixed(1)} bets/minute`,
      severity,
      metadata: {
        betsPerMinute,
        recentBetsCount: recentBets.length,
        timeWindowMs
      }
    };
  }

  // =============================================================================
  // STATISTICAL HELPERS
  // =============================================================================

  private calculateBaseline(values: number[]): StatisticalBaseline {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      mean,
      stdDev: stdDev || 0.0001, // Avoid division by zero
      min,
      max,
      sampleSize: values.length
    };
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Set Z-score threshold for anomaly detection
   */
  setZScoreThreshold(threshold: number): void {
    this.zScoreThreshold = threshold;
  }

  /**
   * Set IQR multiplier for outlier detection
   */
  setIQRMultiplier(multiplier: number): void {
    this.iqrMultiplier = multiplier;
  }
}

// Global anomaly detector instance
export const anomalyDetector = new AnomalyDetector();
