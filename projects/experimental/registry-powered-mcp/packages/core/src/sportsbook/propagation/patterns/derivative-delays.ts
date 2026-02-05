/**
 * Derivative Delays Pattern Detector
 * Patterns #70-73, #87: Derivative market propagation delays
 *
 * Detects:
 * - #70: First-Half → Second-Half propagation delay
 * - #71: Quarter → Half price asymmetry
 * - #72: Alt-line step function delays at key numbers
 * - #73: Team total derived from game total lag
 * - #87: Player prop beta skew from team line moves
 *
 * SYSCALL: DERIVATIVE_DELAYS_DETECTOR
 */

import {
  type DetectedPattern,
  type PropagationEntry,
  type PatternId,
  type PatternSeverity,
  PatternCategory,
  MarketTier,
  TIER_HALFLIFE_TARGETS,
  PATTERN_DEFINITIONS,
} from '../types';

import type { PatternDetector, PatternDetectionContext } from '../half-life-tracker';

/**
 * Derivative Delays Pattern Detector
 * Identifies patterns where derivative markets lag behind their source markets
 */
export class DerivativeDelaysDetector implements PatternDetector {
  readonly category = PatternCategory.DERIVATIVE_DELAYS;
  readonly patternIds: readonly PatternId[] = [70, 71, 72, 73, 87];

  /**
   * Detect derivative delay patterns
   */
  detect(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // #70: First-Half → Second-Half lag
    const pattern70 = this.detectFirstHalfSecondHalfLag(entry, context);
    if (pattern70) patterns.push(pattern70);

    // #71: Quarter → Half asymmetry
    const pattern71 = this.detectQuarterHalfAsymmetry(entry, context);
    if (pattern71) patterns.push(pattern71);

    // #72: Alt-line step function delays
    const pattern72 = this.detectAltLineStepFunction(entry, context);
    if (pattern72) patterns.push(pattern72);

    // #73: Team total derivative lag
    const pattern73 = this.detectTeamTotalDerivative(entry, context);
    if (pattern73) patterns.push(pattern73);

    // #87: Player prop beta skew
    const pattern87 = this.detectPlayerPropBetaSkew(entry, context);
    if (pattern87) patterns.push(pattern87);

    return patterns;
  }

  /**
   * #70: First-Half → Second-Half propagation delay
   * When first-half line moves, second-half should follow with predictable lag
   */
  private detectFirstHalfSecondHalfLag(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    // Only relevant for quarter/half tier
    if (entry.tier !== MarketTier.QUARTER_HALF) return null;

    // Check if delay exceeds expected range
    const expected = TIER_HALFLIFE_TARGETS[MarketTier.QUARTER_HALF];
    if (entry.propagationDelayMs < expected.max * 1.5) return null;

    // Calculate confidence based on delay magnitude
    const delayRatio = entry.propagationDelayMs / expected.max;
    const confidence = Math.min(0.95, 0.5 + (delayRatio - 1.5) * 0.2);

    // Estimate profit in basis points (larger delay = more opportunity)
    const profitBps = Math.floor((delayRatio - 1) * 10);

    return this.createPattern(
      70,
      confidence,
      this.severityFromDelay(delayRatio),
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      profitBps,
      { delayMs: entry.propagationDelayMs, expectedMax: expected.max, delayRatio }
    );
  }

  /**
   * #71: Quarter → Half price asymmetry
   * Quarter markets should sum to half market value
   */
  private detectQuarterHalfAsymmetry(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    if (entry.tier !== MarketTier.QUARTER_HALF) return null;

    // Look for asymmetric damping (damping should be ~0.5 for even split)
    const dampingAsymmetry = Math.abs(entry.dampingRatio - 0.5);
    if (dampingAsymmetry < 0.2) return null;

    const confidence = Math.min(0.9, 0.5 + dampingAsymmetry);
    const profitBps = Math.floor(dampingAsymmetry * 15);

    return this.createPattern(
      71,
      confidence,
      dampingAsymmetry > 0.4 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      profitBps,
      { dampingRatio: entry.dampingRatio, asymmetry: dampingAsymmetry }
    );
  }

  /**
   * #72: Alt-line step function delays
   * Alt lines often update in discrete steps, creating temporary mispricings
   */
  private detectAltLineStepFunction(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    if (entry.tier !== MarketTier.ALT_LINES) return null;

    // Step function detection: low damping with high delay
    if (entry.dampingRatio > 0.3 || entry.propagationDelayMs < 1000) return null;

    const expected = TIER_HALFLIFE_TARGETS[MarketTier.ALT_LINES];
    const delayRatio = entry.propagationDelayMs / expected.max;
    const confidence = Math.min(0.85, 0.4 + (1 - entry.dampingRatio) * 0.3 + delayRatio * 0.2);

    return this.createPattern(
      72,
      confidence,
      'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      Math.floor((1 - entry.dampingRatio) * 20),
      { dampingRatio: entry.dampingRatio, stepDelay: entry.propagationDelayMs }
    );
  }

  /**
   * #73: Team total derived from game total lag
   * Team totals should move in response to game total changes
   */
  private detectTeamTotalDerivative(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    if (entry.tier !== MarketTier.TEAM_TOTALS) return null;

    const expected = TIER_HALFLIFE_TARGETS[MarketTier.TEAM_TOTALS];
    if (entry.propagationDelayMs < expected.max * 1.3) return null;

    const delayRatio = entry.propagationDelayMs / expected.max;
    const confidence = Math.min(0.9, 0.5 + (delayRatio - 1.3) * 0.25);

    return this.createPattern(
      73,
      confidence,
      this.severityFromDelay(delayRatio),
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      Math.floor((delayRatio - 1) * 12),
      { delayMs: entry.propagationDelayMs, expectedMax: expected.max }
    );
  }

  /**
   * #87: Player prop beta skew from team line moves
   * Player props should adjust when team lines move significantly
   */
  private detectPlayerPropBetaSkew(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    if (entry.tier !== MarketTier.PLAYER_PROPS) return null;

    // High damping for player props is suspicious (should track team lines)
    if (entry.dampingRatio < 0.7) return null;

    const expected = TIER_HALFLIFE_TARGETS[MarketTier.PLAYER_PROPS];
    const delayRatio = entry.propagationDelayMs / expected.min;

    // High damping + delay = beta skew opportunity
    const confidence = Math.min(0.85, entry.dampingRatio * 0.5 + (delayRatio > 1 ? 0.3 : 0));

    if (confidence < 0.6) return null;

    return this.createPattern(
      87,
      confidence,
      entry.dampingRatio > 0.85 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      Math.floor(entry.dampingRatio * 25),
      { dampingRatio: entry.dampingRatio, betaSkew: entry.dampingRatio - 0.5 }
    );
  }

  /**
   * Create a pattern detection result
   */
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
      expiresAt: Date.now() + 30000, // 30 second window
      detectedAt: Date.now(),
      context,
    };
  }

  /**
   * Map delay ratio to severity
   */
  private severityFromDelay(delayRatio: number): PatternSeverity {
    if (delayRatio > 3) return 'CRITICAL';
    if (delayRatio > 2) return 'HIGH';
    if (delayRatio > 1.5) return 'MEDIUM';
    return 'LOW';
  }
}
