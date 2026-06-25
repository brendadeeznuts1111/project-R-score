#!/usr/bin/env bun
/**
 * Correlation Analyzer for Cross-Pattern Analysis
 * 
 * Analyzes correlations between different patterns, syndicates, and betting behaviors
 * to identify relationships and coordinated activities.
 */

import type { SyndicateBet, SyndicatePattern } from '../types';

// =============================================================================
// CORRELATION TYPES
// =============================================================================

export interface CorrelationResult {
  pattern1: string;
  pattern2: string;
  correlation: number; // -1.0 to 1.0
  strength: 'weak' | 'moderate' | 'strong';
  significance: number; // p-value or confidence
  interpretation: string;
}

export interface CrossSyndicateCorrelation {
  syndicate1: string;
  syndicate2: string;
  correlation: number;
  patterns: string[];
  strength: 'weak' | 'moderate' | 'strong';
}

// =============================================================================
// CORRELATION ANALYZER
// =============================================================================

export class CorrelationAnalyzer {
  /**
   * Calculate Pearson correlation coefficient between two pattern strengths
   */
  calculatePatternCorrelation(
    pattern1Data: number[],
    pattern2Data: number[]
  ): CorrelationResult {
    if (pattern1Data.length !== pattern2Data.length || pattern1Data.length < 2) {
      return {
        pattern1: 'unknown',
        pattern2: 'unknown',
        correlation: 0,
        strength: 'weak',
        significance: 0,
        interpretation: 'Insufficient data for correlation analysis'
      };
    }

    const n = pattern1Data.length;
    const mean1 = pattern1Data.reduce((sum, v) => sum + v, 0) / n;
    const mean2 = pattern2Data.reduce((sum, v) => sum + v, 0) / n;

    const { numerator, sumSq1, sumSq2 } = pattern1Data.reduce(
      (acc, _, i) => {
        const diff1 = pattern1Data[i] - mean1;
        const diff2 = pattern2Data[i] - mean2;
        return {
          numerator: acc.numerator + diff1 * diff2,
          sumSq1: acc.sumSq1 + diff1 * diff1,
          sumSq2: acc.sumSq2 + diff2 * diff2
        };
      },
      { numerator: 0, sumSq1: 0, sumSq2: 0 }
    );

    const denominator = Math.sqrt(sumSq1 * sumSq2);
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    const strength = this.interpretCorrelationStrength(Math.abs(correlation));
    const significance = this.calculateSignificance(correlation, n);

    return {
      pattern1: 'pattern1',
      pattern2: 'pattern2',
      correlation,
      strength,
      significance,
      interpretation: this.interpretCorrelation(correlation, strength)
    };
  }

  /**
   * Analyze correlations between multiple patterns
   */
  analyzePatternCorrelations(
    patterns: Array<{ type: string; strength: number }>
  ): CorrelationResult[] {
    const results = patterns.flatMap((pattern1, i) =>
      patterns.slice(i + 1).map(pattern2 => {
        // For demonstration, create synthetic time series
        // In production, this would use actual time-series data
        const pattern1Data = this.generateTimeSeries(pattern1.strength, 20);
        const pattern2Data = this.generateTimeSeries(pattern2.strength, 20);

        const correlation = this.calculatePatternCorrelation(pattern1Data, pattern2Data);
        correlation.pattern1 = pattern1.type;
        correlation.pattern2 = pattern2.type;

        return correlation;
      })
    );

    return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Detect correlated trading across syndicates
   */
  detectCorrelatedTrading(
    syndicateBets: Map<string, SyndicateBet[]>,
    timeWindowMs: number = 300000 // 5 minutes
  ): CrossSyndicateCorrelation[] {
    const syndicateIds = Array.from(syndicateBets.keys());

    const correlations = syndicateIds.flatMap((syndicate1, i) =>
      syndicateIds.slice(i + 1)
        .map(syndicate2 => {
          const bets1 = syndicateBets.get(syndicate1) || [];
          const bets2 = syndicateBets.get(syndicate2) || [];
          const correlation = this.calculateBetTimingCorrelation(bets1, bets2, timeWindowMs);

          return Math.abs(correlation.correlation) > 0.5
            ? {
                syndicate1,
                syndicate2,
                correlation: correlation.correlation,
                patterns: correlation.patterns,
                strength: correlation.strength
              }
            : null;
        })
        .filter((corr): corr is CrossSyndicateCorrelation => corr !== null)
    );

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Calculate correlation based on bet timing
   */
  private calculateBetTimingCorrelation(
    bets1: SyndicateBet[],
    bets2: SyndicateBet[],
    timeWindowMs: number
  ): { correlation: number; patterns: string[]; strength: 'weak' | 'moderate' | 'strong' } {
    if (bets1.length === 0 || bets2.length === 0) {
      return { correlation: 0, patterns: [], strength: 'weak' };
    }

    // Create time buckets
    const buckets = new Map<number, { bets1: number; bets2: number }>();
    const bucketSize = timeWindowMs / 10; // 10 buckets per window

    bets1.forEach(bet => {
      const bucket = Math.floor(bet.timestamp / bucketSize);
      const current = buckets.get(bucket) || { bets1: 0, bets2: 0 };
      current.bets1++;
      buckets.set(bucket, current);
    });

    bets2.forEach(bet => {
      const bucket = Math.floor(bet.timestamp / bucketSize);
      const current = buckets.get(bucket) || { bets1: 0, bets2: 0 };
      current.bets2++;
      buckets.set(bucket, current);
    });

    // Calculate correlation on bucket counts
    const bucketsArray = Array.from(buckets.values());
    const bets1Counts = bucketsArray.map(b => b.bets1);
    const bets2Counts = bucketsArray.map(b => b.bets2);

    const correlation = this.calculatePatternCorrelation(bets1Counts, bets2Counts);

    return {
      correlation: correlation.correlation,
      patterns: ['bet_timing'],
      strength: correlation.strength
    };
  }

  /**
   * Analyze game selection correlation
   */
  analyzeGameSelectionCorrelation(
    bets: SyndicateBet[]
  ): Map<string, number> {
    const gamePairs = new Map<string, number>();
    const gameCounts = new Map<string, number>();

    // Count games
    bets.forEach(bet => {
      gameCounts.set(bet.game, (gameCounts.get(bet.game) || 0) + 1);
    });

    // Find games that appear together frequently
    const games = Array.from(gameCounts.keys());
    games.forEach((game1, i) => {
      games.slice(i + 1).forEach(game2 => {
        // Count bets that include both games (within time window)
        const coOccurrences = bets.reduce((count, bet, idx) => {
          if (bet.game === game1) {
            const nearbyBets = bets.slice(Math.max(0, idx - 5), Math.min(bets.length, idx + 5));
            return nearbyBets.some(b => b.game === game2) ? count + 1 : count;
          }
          return count;
        }, 0);

        if (coOccurrences > 0) {
          const pairKey = `${game1}|${game2}`;
          gamePairs.set(pairKey, coOccurrences);
        }
      });
    });

    return gamePairs;
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private interpretCorrelationStrength(absCorrelation: number): 'weak' | 'moderate' | 'strong' {
    if (absCorrelation >= 0.7) return 'strong';
    if (absCorrelation >= 0.4) return 'moderate';
    return 'weak';
  }

  private interpretCorrelation(
    correlation: number,
    strength: 'weak' | 'moderate' | 'strong'
  ): string {
    const direction = correlation > 0 ? 'positive' : 'negative';
    const absCorr = Math.abs(correlation);

    if (strength === 'strong') {
      return `${direction} strong correlation (${absCorr.toFixed(2)}) - patterns move together`;
    }
    if (strength === 'moderate') {
      return `${direction} moderate correlation (${absCorr.toFixed(2)}) - some relationship exists`;
    }
    return `${direction} weak correlation (${absCorr.toFixed(2)}) - minimal relationship`;
  }

  private calculateSignificance(correlation: number, sampleSize: number): number {
    // Simplified significance calculation
    // In production, use proper statistical tests (t-test, etc.)
    const tStat = correlation * Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));
    return Math.min(1.0, Math.abs(tStat) / 10); // Normalized significance
  }

  private generateTimeSeries(baseValue: number, length: number): number[] {
    // Generate synthetic time series with some variation
    return Array.from({ length }, () => {
      const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
      return Math.max(0, Math.min(1, baseValue + variation));
    });
  }
}

// Global correlation analyzer instance
export const correlationAnalyzer = new CorrelationAnalyzer();
