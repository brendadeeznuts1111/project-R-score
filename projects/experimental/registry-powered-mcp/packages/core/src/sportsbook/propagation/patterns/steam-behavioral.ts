/**
 * Steam & Behavioral Pattern Detector
 * Patterns #79, #82, #85, #88, #89: Smart money and behavioral patterns
 *
 * Detects:
 * - #79: Steam direction asymmetry (in vs out)
 * - #82: Cross-event momentum transfer
 * - #85: Exchange liquidity mirage detection
 * - #88: Steam source fingerprinting
 * - #89: Sharp book shadow detection
 *
 * SYSCALL: STEAM_BEHAVIORAL_DETECTOR
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
 * Steam & Behavioral Pattern Detector
 * Identifies smart money flow and behavioral anomalies
 */
export class SteamBehavioralDetector implements PatternDetector {
  readonly category = PatternCategory.STEAM_BEHAVIORAL;
  readonly patternIds: readonly PatternId[] = [79, 82, 85, 88, 89];

  // Sharp bookmakers for shadow detection
  private readonly sharpBooks = ['pinnacle', 'cris', 'circa', 'bookmaker.eu'];

  detect(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // #79: Steam direction asymmetry
    const pattern79 = this.detectSteamAsymmetry(entry, context);
    if (pattern79) patterns.push(pattern79);

    // #82: Cross-event momentum
    const pattern82 = this.detectCrossEventMomentum(entry, context);
    if (pattern82) patterns.push(pattern82);

    // #85: Exchange liquidity mirage
    const pattern85 = this.detectLiquidityMirage(entry, context);
    if (pattern85) patterns.push(pattern85);

    // #88: Steam source fingerprint
    const pattern88 = this.detectSteamFingerprint(entry, context);
    if (pattern88) patterns.push(pattern88);

    // #89: Sharp book shadow
    const pattern89 = this.detectSharpBookShadow(entry, context);
    if (pattern89) patterns.push(pattern89);

    return patterns;
  }

  /**
   * #79: Steam direction asymmetry
   * Lines move faster in one direction than the other
   */
  private detectSteamAsymmetry(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    // Get recent entries for this bookmaker
    const bookmakerEntries = context.recentEntries.filter(
      (e) => e.bookmaker === entry.bookmaker && e.tier === entry.tier
    );

    if (bookmakerEntries.length < 10) return null;

    // Separate by direction (using damping ratio as proxy)
    // High damping = following market (steam in)
    // Low damping = leading market (steam out)
    const steamIn = bookmakerEntries.filter((e) => e.dampingRatio > 0.5);
    const steamOut = bookmakerEntries.filter((e) => e.dampingRatio <= 0.5);

    if (steamIn.length < 3 || steamOut.length < 3) return null;

    // Calculate average delays for each direction
    const avgSteamInDelay =
      steamIn.reduce((sum, e) => sum + e.propagationDelayMs, 0) / steamIn.length;
    const avgSteamOutDelay =
      steamOut.reduce((sum, e) => sum + e.propagationDelayMs, 0) / steamOut.length;

    // Asymmetry ratio
    const asymmetryRatio = Math.abs(avgSteamInDelay - avgSteamOutDelay) /
      Math.max(avgSteamInDelay, avgSteamOutDelay, 100);

    if (asymmetryRatio < 0.3) return null;

    const fastDirection = avgSteamInDelay < avgSteamOutDelay ? 'in' : 'out';
    const confidence = Math.min(0.9, 0.4 + asymmetryRatio * 0.5);

    return this.createPattern(
      79,
      confidence,
      asymmetryRatio > 0.6 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      Math.floor(asymmetryRatio * 20),
      {
        steamInAvgDelay: avgSteamInDelay,
        steamOutAvgDelay: avgSteamOutDelay,
        asymmetryRatio,
        fastDirection,
        sampleCount: bookmakerEntries.length,
      }
    );
  }

  /**
   * #82: Cross-event momentum transfer
   * Momentum from one event affects related events (same team/player)
   */
  private detectCrossEventMomentum(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    // Look for correlated movements across different source markets
    const differentSourceEntries = context.recentEntries.filter(
      (e) =>
        e.sourceMarketId !== entry.sourceMarketId &&
        e.bookmaker === entry.bookmaker &&
        Math.abs(e.timestamp - entry.timestamp) < 2000
    );

    if (differentSourceEntries.length < 2) return null;

    // Calculate damping correlation
    const thisRatio = entry.dampingRatio;
    const otherRatios = differentSourceEntries.map((e) => e.dampingRatio);
    const avgOtherRatio = otherRatios.reduce((a, b) => a + b, 0) / otherRatios.length;

    // High correlation indicates momentum transfer
    const correlation = 1 - Math.abs(thisRatio - avgOtherRatio);

    if (correlation < 0.7) return null;

    const confidence = Math.min(0.85, correlation * 0.9);

    return this.createPattern(
      82,
      confidence,
      correlation > 0.9 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, ...differentSourceEntries.slice(0, 3).map((e) => e.sourceMarketId)],
      [entry.bookmaker],
      Math.floor((correlation - 0.7) * 30),
      {
        dampingCorrelation: correlation,
        sourceMarkets: differentSourceEntries.length + 1,
        thisRatio,
        avgOtherRatio,
      }
    );
  }

  /**
   * #85: Exchange liquidity mirage
   * Displayed liquidity doesn't reflect real market depth
   */
  private detectLiquidityMirage(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    // Look for exchanges with sudden damping changes
    const exchangeBooks = ['betfair', 'smarkets', 'matchbook'];
    const isExchange = exchangeBooks.some((b) =>
      entry.bookmaker.toLowerCase().includes(b)
    );

    if (!isExchange) return null;

    // Get recent exchange entries
    const exchangeEntries = context.recentEntries.filter(
      (e) =>
        exchangeBooks.some((b) => e.bookmaker.toLowerCase().includes(b)) &&
        e.tier === entry.tier
    );

    if (exchangeEntries.length < 5) return null;

    // Calculate damping variance (high variance = liquidity mirage)
    const dampings = exchangeEntries.map((e) => e.dampingRatio);
    const avgDamping = dampings.reduce((a, b) => a + b, 0) / dampings.length;
    const variance =
      dampings.reduce((sum, d) => sum + Math.pow(d - avgDamping, 2), 0) /
      dampings.length;
    const stdDev = Math.sqrt(variance);

    // High variance in damping indicates unreliable liquidity
    if (stdDev < 0.2) return null;

    const confidence = Math.min(0.85, 0.4 + stdDev);

    return this.createPattern(
      85,
      confidence,
      stdDev > 0.4 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker],
      Math.floor(stdDev * 25),
      {
        dampingStdDev: stdDev,
        avgDamping,
        sampleCount: exchangeEntries.length,
      }
    );
  }

  /**
   * #88: Steam source fingerprinting
   * Different steam sources have characteristic propagation signatures
   */
  private detectSteamFingerprint(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    // Get entries across all bookmakers for this tier
    const tierEntries = context.recentEntries.filter(
      (e) => e.tier === entry.tier && Math.abs(e.timestamp - entry.timestamp) < 3000
    );

    if (tierEntries.length < 5) return null;

    // Group by bookmaker and calculate signature (delay + damping profile)
    const bookmakerProfiles: Map<string, { avgDelay: number; avgDamping: number; count: number }> =
      new Map();

    for (const e of tierEntries) {
      const existing = bookmakerProfiles.get(e.bookmaker);
      if (existing) {
        existing.avgDelay = (existing.avgDelay * existing.count + e.propagationDelayMs) /
          (existing.count + 1);
        existing.avgDamping = (existing.avgDamping * existing.count + e.dampingRatio) /
          (existing.count + 1);
        existing.count++;
      } else {
        bookmakerProfiles.set(e.bookmaker, {
          avgDelay: e.propagationDelayMs,
          avgDamping: e.dampingRatio,
          count: 1,
        });
      }
    }

    if (bookmakerProfiles.size < 2) return null;

    // Find leader (lowest delay, highest damping = first to move)
    let leader = '';
    let leaderScore = -Infinity;

    for (const [book, profile] of bookmakerProfiles) {
      // Score = high damping - normalized delay
      const score = profile.avgDamping - profile.avgDelay / 1000;
      if (score > leaderScore) {
        leaderScore = score;
        leader = book;
      }
    }

    // Check if this entry is following the leader
    if (entry.bookmaker === leader) return null;

    const leaderProfile = bookmakerProfiles.get(leader)!;
    const thisProfile = bookmakerProfiles.get(entry.bookmaker);

    if (!thisProfile) return null;

    // Calculate following confidence
    const delayDiff = thisProfile.avgDelay - leaderProfile.avgDelay;
    const dampingDiff = leaderProfile.avgDamping - thisProfile.avgDamping;

    if (delayDiff < 100 || dampingDiff < 0.1) return null;

    const confidence = Math.min(0.9, 0.5 + dampingDiff * 0.5);

    return this.createPattern(
      88,
      confidence,
      dampingDiff > 0.3 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [leader, entry.bookmaker],
      Math.floor(dampingDiff * 20),
      {
        leaderBook: leader,
        followerBook: entry.bookmaker,
        delayDiff,
        dampingDiff,
        leaderProfile,
        followerProfile: thisProfile,
      }
    );
  }

  /**
   * #89: Sharp book shadow detection
   * Other books following sharp book (Pinnacle/CRIS) movements
   */
  private detectSharpBookShadow(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern | null {
    // Check if this is a non-sharp book
    const isSharp = this.sharpBooks.some((b) =>
      entry.bookmaker.toLowerCase().includes(b)
    );

    if (isSharp) return null;

    // Find recent sharp book entries
    const sharpEntries = context.recentEntries.filter(
      (e) =>
        this.sharpBooks.some((b) => e.bookmaker.toLowerCase().includes(b)) &&
        e.tier === entry.tier &&
        Math.abs(e.timestamp - entry.timestamp) < 5000
    );

    if (sharpEntries.length === 0) return null;

    // Calculate average sharp delay and damping
    const avgSharpDelay =
      sharpEntries.reduce((sum, e) => sum + e.propagationDelayMs, 0) /
      sharpEntries.length;
    const avgSharpDamping =
      sharpEntries.reduce((sum, e) => sum + e.dampingRatio, 0) /
      sharpEntries.length;

    // Check if this book is shadowing (following with lag)
    const shadowLag = entry.propagationDelayMs - avgSharpDelay;
    const dampingGap = avgSharpDamping - entry.dampingRatio;

    // Shadowing signature: positive lag + lower damping
    if (shadowLag < 200 || dampingGap < 0.1) return null;

    const shadowScore = (shadowLag / 1000) * dampingGap;
    const confidence = Math.min(0.9, 0.5 + shadowScore);

    return this.createPattern(
      89,
      confidence,
      shadowScore > 0.3 ? 'HIGH' : 'MEDIUM',
      [entry.sourceMarketId, entry.targetMarketId],
      [entry.bookmaker, ...sharpEntries.slice(0, 2).map((e) => e.bookmaker)],
      Math.floor(shadowScore * 30),
      {
        shadowBook: entry.bookmaker,
        sharpBooks: [...new Set(sharpEntries.map((e) => e.bookmaker))],
        shadowLag,
        dampingGap,
        shadowScore,
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
      affectedBookmakers: [...new Set(affectedBookmakers)],
      profitBps,
      expiresAt: Date.now() + 30000, // 30 second window for behavioral
      detectedAt: Date.now(),
      context,
    };
  }
}
