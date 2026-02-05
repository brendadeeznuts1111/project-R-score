/**
 * Cross-Book Arbitrage Pattern Detector
 * Patterns #74, #76, #81, #84: Cross-book and provider sync patterns
 *
 * Detects:
 * - #74: Provider sync failures (Sportradar/Genius)
 * - #76: Exchange spread compression lag vs fixed-odds
 * - #81: Provider A/B feed divergence window
 * - #84: Offshore vs domestic book update lag
 *
 * SYSCALL: CROSS_BOOK_ARBITRAGE_DETECTOR
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
 * Cross-Book Arbitrage Pattern Detector
 * Identifies opportunities from cross-bookmaker inefficiencies
 */
export class CrossBookArbitrageDetector implements PatternDetector {
  readonly category = PatternCategory.CROSS_BOOK_ARBITRAGE;
  readonly patternIds: readonly PatternId[] = [74, 76, 81, 84];

  // Known provider groupings for divergence detection
  private readonly providerGroups: Record<string, string> = {
    'betfair': 'exchange',
    'smarkets': 'exchange',
    'matchbook': 'exchange',
    'pinnacle': 'sharp',
    'cris': 'sharp',
    'draftkings': 'us_domestic',
    'fanduel': 'us_domestic',
    'betmgm': 'us_domestic',
    'bet365': 'offshore',
    'bovada': 'offshore',
  };

  detect(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // #74: Provider sync failure
    const pattern74 = this.detectProviderSyncFailure(entry, context);
    if (pattern74) patterns.push(pattern74);

    // #76: Exchange spread compression lag
    const pattern76 = this.detectExchangeSpreadLag(entry, context);
    if (pattern76) patterns.push(pattern76);

    // #81: Provider A/B divergence
    const pattern81 = this.detectProviderDivergence(entry, context);
    if (pattern81) patterns.push(pattern81);

    // #84: Offshore vs domestic lag
    const pattern84 = this.detectOffshoreDomesticLag(entry, context);
    if (pattern84) patterns.push(pattern84);

    return patterns;
  }

  /**
   * #74: Provider sync failure detection
   * When one provider's feed stalls while others continue updating
   */
  private detectProviderSyncFailure(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    // Check for unusually high delay with very low damping
    // This indicates the target market isn't responding to source moves
    if (entry.dampingRatio > 0.1) return null;

    const expected = TIER_HALFLIFE_TARGETS[entry.tier];
    if (entry.propagationDelayMs < expected.max * 2) return null;

    // Very low damping + high delay = potential sync failure
    const syncFailureScore = (1 - entry.dampingRatio) * (entry.propagationDelayMs / expected.max);
    if (syncFailureScore < 2) return null;

    const confidence = Math.min(0.95, 0.5 + syncFailureScore * 0.15);

    return this.createPattern(
      74,
      confidence,
      syncFailureScore > 4 ? 'CRITICAL' : 'HIGH',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      Math.floor(syncFailureScore * 10),
      {
        dampingRatio: entry.dampingRatio,
        delayMs: entry.propagationDelayMs,
        syncFailureScore,
      }
    );
  }

  /**
   * #76: Exchange spread compression lag
   * Exchange spreads narrow faster than fixed-odds books can react
   */
  private detectExchangeSpreadLag(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    const bookmakerGroup = this.providerGroups[entry.bookmaker.toLowerCase()];

    // Only relevant when comparing exchange to fixed-odds
    if (bookmakerGroup === 'exchange') return null;

    // Look for recent entries from exchange sources
    const recentExchangeEntries = context.recentEntries.filter(
      (e) => this.providerGroups[e.bookmaker.toLowerCase()] === 'exchange'
    );

    if (recentExchangeEntries.length === 0) return null;

    // Calculate average exchange delay vs this bookmaker's delay
    const avgExchangeDelay =
      recentExchangeEntries.reduce((sum, e) => sum + e.propagationDelayMs, 0) /
      recentExchangeEntries.length;

    const lagRatio = entry.propagationDelayMs / Math.max(avgExchangeDelay, 100);

    if (lagRatio < 1.5) return null;

    const confidence = Math.min(0.9, 0.4 + (lagRatio - 1.5) * 0.25);

    return this.createPattern(
      76,
      confidence,
      lagRatio > 3 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      Math.floor((lagRatio - 1) * 8),
      {
        exchangeAvgDelay: avgExchangeDelay,
        bookmakerDelay: entry.propagationDelayMs,
        lagRatio,
      }
    );
  }

  /**
   * #81: Provider A/B feed divergence
   * Different data providers showing different prices for same market
   */
  private detectProviderDivergence(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    const thisGroup = this.providerGroups[entry.bookmaker.toLowerCase()];
    if (!thisGroup) return null;

    // Find entries from different provider groups for same tier
    const divergentEntries = context.recentEntries.filter((e) => {
      const otherGroup = this.providerGroups[e.bookmaker.toLowerCase()];
      return (
        otherGroup &&
        otherGroup !== thisGroup &&
        e.tier === entry.tier &&
        Math.abs(e.timestamp - entry.timestamp) < 5000 // Within 5 seconds
      );
    });

    if (divergentEntries.length === 0) return null;

    // Calculate damping divergence (should be similar across providers)
    const dampingDivergence = divergentEntries.reduce(
      (maxDiv, e) => Math.max(maxDiv, Math.abs(e.dampingRatio - entry.dampingRatio)),
      0
    );

    if (dampingDivergence < 0.3) return null;

    const confidence = Math.min(0.85, 0.4 + dampingDivergence);

    const affectedBookmakers = [
      entry.bookmaker,
      ...divergentEntries.map((e) => e.bookmaker),
    ];

    return this.createPattern(
      81,
      confidence,
      dampingDivergence > 0.5 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [...new Set(affectedBookmakers)],
      Math.floor(dampingDivergence * 20),
      {
        dampingDivergence,
        providerGroup: thisGroup,
        comparedTo: divergentEntries.map((e) =>
          this.providerGroups[e.bookmaker.toLowerCase()]
        ),
      }
    );
  }

  /**
   * #84: Offshore vs domestic book update lag
   * Offshore books may update slower due to regulatory/technical constraints
   */
  private detectOffshoreDomesticLag(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    const thisGroup = this.providerGroups[entry.bookmaker.toLowerCase()];

    // Only detect when this is offshore
    if (thisGroup !== 'offshore') return null;

    // Find domestic entries for comparison
    const domesticEntries = context.recentEntries.filter((e) => {
      const group = this.providerGroups[e.bookmaker.toLowerCase()];
      return (
        group === 'us_domestic' &&
        e.tier === entry.tier &&
        Math.abs(e.timestamp - entry.timestamp) < 3000
      );
    });

    if (domesticEntries.length === 0) return null;

    // Calculate lag difference
    const avgDomesticDelay =
      domesticEntries.reduce((sum, e) => sum + e.propagationDelayMs, 0) /
      domesticEntries.length;

    const lagDiff = entry.propagationDelayMs - avgDomesticDelay;

    if (lagDiff < 200) return null; // At least 200ms lag difference

    const confidence = Math.min(0.9, 0.5 + lagDiff / 1000);

    return this.createPattern(
      84,
      confidence,
      lagDiff > 1000 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker, ...domesticEntries.map((e) => e.bookmaker)],
      Math.floor(lagDiff / 50),
      {
        offshoreDelay: entry.propagationDelayMs,
        domesticAvgDelay: avgDomesticDelay,
        lagDifferenceMs: lagDiff,
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
      expiresAt: Date.now() + 15000, // 15 second window for cross-book
      detectedAt: Date.now(),
      context,
    };
  }
}
