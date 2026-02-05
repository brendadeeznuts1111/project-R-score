/**
 * Prop & Combo Pattern Detector
 * Patterns #78, #80: Prop combination and cascade patterns
 *
 * Detects:
 * - #78: Prop combo Fréchet bounds violations
 * - #80: Micro-market cascade prediction from main line
 *
 * SYSCALL: PROP_COMBO_DETECTOR
 */

import {
  type DetectedPattern,
  type PropagationEntry,
  type PatternId,
  type PatternSeverity,
  PatternCategory,
  MarketTier,
  TIER_HALFLIFE_TARGETS,
} from '../types';

import type { PatternDetector, PatternDetectionContext } from '../half-life-tracker';

/**
 * Prop & Combo Pattern Detector
 * Identifies mispricing in prop combinations and market cascades
 */
export class PropComboDetector implements PatternDetector {
  readonly category = PatternCategory.PROP_COMBO;
  readonly patternIds: readonly PatternId[] = [78, 80];

  detect(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // #78: Fréchet bounds violation
    const pattern78 = this.detectFrechetViolation(entry, context);
    if (pattern78) patterns.push(pattern78);

    // #80: Micro-market cascade
    const pattern80 = this.detectMicroMarketCascade(entry, context);
    if (pattern80) patterns.push(pattern80);

    return patterns;
  }

  /**
   * #78: Prop combo Fréchet bounds violations
   * Prop combinations must satisfy mathematical probability bounds
   *
   * Fréchet bounds: max(0, P(A) + P(B) - 1) ≤ P(A∩B) ≤ min(P(A), P(B))
   * Violations indicate arbitrage opportunities
   */
  private detectFrechetViolation(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    // Only relevant for prop combos
    if (entry.tier !== MarketTier.PROP_COMBOS) return null;

    // Get related main line and player prop entries
    const mainLineEntries = context.recentEntries.filter(
      (e) => e.tier === MarketTier.MAIN_LINE
    );
    const propEntries = context.recentEntries.filter(
      (e) => e.tier === MarketTier.PLAYER_PROPS
    );

    if (mainLineEntries.length === 0 || propEntries.length === 0) return null;

    // Calculate implied bounds from individual props
    const avgMainLineDamping =
      mainLineEntries.reduce((sum, e) => sum + e.dampingRatio, 0) /
      mainLineEntries.length;
    const avgPropDamping =
      propEntries.reduce((sum, e) => sum + e.dampingRatio, 0) / propEntries.length;

    // Combo damping should be bounded by individual dampings
    const lowerBound = Math.max(0, avgMainLineDamping + avgPropDamping - 1);
    const upperBound = Math.min(avgMainLineDamping, avgPropDamping);

    // Check for violation
    const violationAmount = Math.max(
      0,
      entry.dampingRatio < lowerBound
        ? lowerBound - entry.dampingRatio
        : entry.dampingRatio > upperBound
        ? entry.dampingRatio - upperBound
        : 0
    );

    if (violationAmount < 0.05) return null;

    const confidence = Math.min(0.95, 0.5 + violationAmount * 2);

    return this.createPattern(
      78,
      confidence,
      violationAmount > 0.2 ? 'CRITICAL' : violationAmount > 0.1 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      Math.floor(violationAmount * 100), // Significant profit potential
      {
        comboDamping: entry.dampingRatio,
        frechetLowerBound: lowerBound,
        frechetUpperBound: upperBound,
        violationAmount,
        mainLineAvg: avgMainLineDamping,
        propAvg: avgPropDamping,
      }
    );
  }

  /**
   * #80: Micro-market cascade prediction
   * Main line moves should cascade to micro-markets predictably
   */
  private detectMicroMarketCascade(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    // Only relevant for prop combos and alt lines
    if (entry.tier !== MarketTier.PROP_COMBOS && entry.tier !== MarketTier.ALT_LINES) {
      return null;
    }

    // Find main line entries for comparison
    const mainLineEntries = context.recentEntries.filter(
      (e) =>
        e.tier === MarketTier.MAIN_LINE &&
        e.bookmaker === entry.bookmaker &&
        Math.abs(e.timestamp - entry.timestamp) < 5000
    );

    if (mainLineEntries.length === 0) return null;

    // Calculate expected cascade timing
    const expected = TIER_HALFLIFE_TARGETS[entry.tier];
    const mainLineExpected = TIER_HALFLIFE_TARGETS[MarketTier.MAIN_LINE];

    // Calculate cascade delay ratio
    const cascadeDelay =
      entry.propagationDelayMs -
      (mainLineEntries.reduce((sum, e) => sum + e.propagationDelayMs, 0) /
        mainLineEntries.length);

    // Expected cascade delay is the difference in tier half-lives
    const expectedCascadeDelay = expected.min - mainLineExpected.min;

    // Look for cascade prediction opportunity (delay not matching expected)
    const cascadeDeviation = Math.abs(cascadeDelay - expectedCascadeDelay);
    const deviationRatio = cascadeDeviation / expectedCascadeDelay;

    if (deviationRatio < 0.3) return null;

    const confidence = Math.min(0.9, 0.4 + deviationRatio * 0.4);

    // Determine if market is ahead or behind cascade
    const cascadeDirection = cascadeDelay < expectedCascadeDelay ? 'ahead' : 'behind';

    return this.createPattern(
      80,
      confidence,
      deviationRatio > 0.7 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      Math.floor(deviationRatio * 15),
      {
        cascadeDelay,
        expectedCascadeDelay,
        deviationRatio,
        cascadeDirection,
        tier: entry.tier,
      }
    );
  }

  private createPattern(
    patternId: PatternId,
    confidence: number,
    severity: PatternSeverity,
    affectedMarkets: string[],
    affectedBookmakers: string[],
    profitBps: number,
    context: Record<string, unknown>
  ): DetectedPattern {
    return {
      patternId,
      confidence,
      severity,
      affectedMarkets,
      affectedBookmakers,
      profitBps,
      expiresAt: Date.now() + 20000, // 20 second window for combos
      detectedAt: Date.now(),
      context,
    };
  }
}
