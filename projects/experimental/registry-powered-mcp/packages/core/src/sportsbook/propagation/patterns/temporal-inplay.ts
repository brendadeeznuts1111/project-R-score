/**
 * Temporal & In-Play Pattern Detector
 * Patterns #75, #77, #83, #86: Time-sensitive in-play patterns
 *
 * Detects:
 * - #75: In-play velocity convexity near scoring events
 * - #77: Regulatory delay arbitrage (UK vs US timing)
 * - #83: Period end/start overlap arbitrage window
 * - #86: Pre-game to in-play transition timing
 *
 * SYSCALL: TEMPORAL_INPLAY_DETECTOR
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
 * Temporal & In-Play Pattern Detector
 * Identifies time-sensitive patterns during live events
 */
export class TemporalInplayDetector implements PatternDetector {
  readonly category = PatternCategory.TEMPORAL_INPLAY;
  readonly patternIds: readonly PatternId[] = [75, 77, 83, 86];

  // Velocity threshold for convexity detection (% change per second)
  private readonly velocityThreshold = 0.5;

  detect(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // #75: In-play velocity convexity
    const pattern75 = this.detectVelocityConvexity(entry, context);
    if (pattern75) patterns.push(pattern75);

    // #77: Regulatory delay arbitrage
    const pattern77 = this.detectRegulatoryDelay(entry, context);
    if (pattern77) patterns.push(pattern77);

    // #83: Period overlap arbitrage
    const pattern83 = this.detectPeriodOverlap(entry, context);
    if (pattern83) patterns.push(pattern83);

    // #86: Pre-game to in-play transition
    const pattern86 = this.detectPregameInplayTransition(entry, context);
    if (pattern86) patterns.push(pattern86);

    return patterns;
  }

  /**
   * #75: In-play velocity convexity near scoring events
   * Odds move faster in certain price ranges (convexity)
   */
  private detectVelocityConvexity(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    // Need multiple recent entries to detect velocity changes
    const tierEntries = context.recentEntries.filter(
      (e) => e.tier === entry.tier && e.bookmaker === entry.bookmaker
    );

    if (tierEntries.length < 5) return null;

    // Calculate velocity over recent entries
    const velocities: number[] = [];
    for (let i = 1; i < tierEntries.length; i++) {
      const timeDiff = tierEntries[i].timestamp - tierEntries[i - 1].timestamp;
      if (timeDiff > 0) {
        const dampingChange = Math.abs(
          tierEntries[i].dampingRatio - tierEntries[i - 1].dampingRatio
        );
        velocities.push((dampingChange / timeDiff) * 1000); // per second
      }
    }

    if (velocities.length < 3) return null;

    // Detect convexity: increasing then decreasing velocity (or vice versa)
    const midIndex = Math.floor(velocities.length / 2);
    const firstHalf = velocities.slice(0, midIndex);
    const secondHalf = velocities.slice(midIndex);

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const convexityRatio = Math.abs(avgFirst - avgSecond) / Math.max(avgFirst, avgSecond, 0.01);

    if (convexityRatio < 0.3) return null;

    const maxVelocity = Math.max(...velocities);
    if (maxVelocity < this.velocityThreshold) return null;

    const confidence = Math.min(0.9, 0.4 + convexityRatio * 0.5);

    return this.createPattern(
      75,
      confidence,
      maxVelocity > this.velocityThreshold * 2 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      Math.floor(convexityRatio * 15),
      {
        convexityRatio,
        maxVelocity,
        velocityProfile: velocities,
      }
    );
  }

  /**
   * #77: Regulatory delay arbitrage
   * UK vs US books have different regulatory timing requirements
   */
  private detectRegulatoryDelay(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    // UK books typically have ~5-8 second in-play delay
    // US books typically have ~1-2 second delay
    const ukBooks = ['bet365', 'william-hill', 'ladbrokes', 'coral', 'paddy-power'];
    const usBooks = ['draftkings', 'fanduel', 'betmgm', 'caesars'];

    const isUK = ukBooks.some((b) =>
      entry.bookmaker.toLowerCase().includes(b.toLowerCase())
    );
    const isUS = usBooks.some((b) =>
      entry.bookmaker.toLowerCase().includes(b.toLowerCase())
    );

    if (!isUK && !isUS) return null;

    // Find entries from the opposite region
    const otherRegionEntries = context.recentEntries.filter((e) => {
      const eIsUK = ukBooks.some((b) =>
        e.bookmaker.toLowerCase().includes(b.toLowerCase())
      );
      const eIsUS = usBooks.some((b) =>
        e.bookmaker.toLowerCase().includes(b.toLowerCase())
      );
      return (isUK && eIsUS) || (isUS && eIsUK);
    });

    if (otherRegionEntries.length === 0) return null;

    // Calculate delay differential
    const avgOtherDelay =
      otherRegionEntries.reduce((sum, e) => sum + e.propagationDelayMs, 0) /
      otherRegionEntries.length;

    const delayDiff = Math.abs(entry.propagationDelayMs - avgOtherDelay);

    // Expected regulatory delay difference is 3-6 seconds
    if (delayDiff < 2000 || delayDiff > 10000) return null;

    const confidence = Math.min(0.85, 0.5 + (delayDiff - 2000) / 8000 * 0.4);

    return this.createPattern(
      77,
      confidence,
      delayDiff > 5000 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker, ...otherRegionEntries.slice(0, 3).map((e) => e.bookmaker)],
      Math.floor(delayDiff / 200),
      {
        thisRegion: isUK ? 'UK' : 'US',
        delayDifferenceMs: delayDiff,
        thisDelay: entry.propagationDelayMs,
        otherRegionAvgDelay: avgOtherDelay,
      }
    );
  }

  /**
   * #83: Period end/start overlap arbitrage
   * Markets for current and next period briefly overlap
   */
  private detectPeriodOverlap(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    // Only relevant for quarter/half tier
    if (entry.tier !== MarketTier.QUARTER_HALF) return null;

    // Look for sudden changes in damping (indicates period transition)
    const sameMarketEntries = context.recentEntries.filter(
      (e) =>
        e.targetMarketId === entry.targetMarketId &&
        e.bookmaker === entry.bookmaker
    );

    if (sameMarketEntries.length < 3) return null;

    // Detect damping spike (period transition signal)
    const dampingValues = sameMarketEntries.map((e) => e.dampingRatio);
    const avgDamping = dampingValues.reduce((a, b) => a + b, 0) / dampingValues.length;
    const dampingSpike = Math.max(...dampingValues.map((d) => Math.abs(d - avgDamping)));

    if (dampingSpike < 0.4) return null;

    const confidence = Math.min(0.85, 0.5 + dampingSpike * 0.5);

    return this.createPattern(
      83,
      confidence,
      dampingSpike > 0.6 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      Math.floor(dampingSpike * 25),
      {
        dampingSpike,
        avgDamping,
        sampleCount: sameMarketEntries.length,
      }
    );
  }

  /**
   * #86: Pre-game to in-play transition
   * Brief window during market state transition
   */
  private detectPregameInplayTransition(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    // Look for sudden delay spikes (indicates transition)
    const expected = TIER_HALFLIFE_TARGETS[entry.tier];

    // Transition typically causes 3-10x normal delay
    if (entry.propagationDelayMs < expected.max * 3) return null;

    // Also check for damping near 0 (no propagation during transition)
    if (entry.dampingRatio > 0.2) return null;

    const transitionScore = entry.propagationDelayMs / expected.max;
    const confidence = Math.min(0.9, 0.4 + transitionScore * 0.1);

    return this.createPattern(
      86,
      confidence,
      transitionScore > 5 ? 'CRITICAL' : 'HIGH',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      Math.floor(transitionScore * 5),
      {
        delayMs: entry.propagationDelayMs,
        expectedMax: expected.max,
        transitionScore,
        dampingRatio: entry.dampingRatio,
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
      expiresAt: Date.now() + 10000, // 10 second window for temporal patterns
      detectedAt: Date.now(),
      context,
    };
  }
}
