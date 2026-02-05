/**
 * Risk Management Engine
 * Real-time arbitrage detection, smart money patterns, and exposure management
 *
 * Performance Targets:
 * - <1ms arbitrage detection
 * - O(n) smart money pattern recognition
 * - Continuous overround monitoring
 *
 * SYSCALL: RISK_ASSESSMENT_ENGINE
 */

import {
  type EnhancedOddsEntry,
  type AggregatedMarket,
  type AggregatedSelection,
  type ArbitrageOpportunity,
  type ArbitrageStake,
  type RiskAssessment,
  type RiskFactor,
  type SmartMoneyPattern,
  type VolumeProfile,
  type OddsMovement,
  MarketStatus,
  SPORTSBOOK_PERFORMANCE_TARGETS,
} from './types';

/**
 * Risk management configuration
 */
export interface RiskConfig {
  /** Minimum profit % to flag as arbitrage opportunity */
  readonly arbitrageThreshold: number;
  /** Maximum acceptable risk score (0-1) */
  readonly maxRiskScore: number;
  /** Sharp money volume threshold (ratio) */
  readonly sharpMoneyThreshold: number;
  /** Maximum exposure per market */
  readonly maxExposurePerMarket: number;
  /** Enable threat intelligence callbacks */
  readonly enableThreatIntel: boolean;
  /** Odds movement velocity threshold (per second) */
  readonly velocityThreshold: number;
}

/**
 * Default risk configuration
 */
export const DEFAULT_RISK_CONFIG: RiskConfig = {
  arbitrageThreshold: 0.5,       // 0.5% minimum profit
  maxRiskScore: 0.7,             // Reject above 70% risk
  sharpMoneyThreshold: 0.3,      // 30% sharp volume triggers alert
  maxExposurePerMarket: 100_000, // $100k max exposure
  enableThreatIntel: true,
  velocityThreshold: 0.1,        // 10% per second movement
} as const;

/**
 * Risk Management Engine
 * Provides real-time risk assessment for sportsbook operations
 */
export class RiskManagementEngine {
  private readonly config: RiskConfig;
  private readonly marketCache: Map<string, AggregatedMarket> = new Map();
  private readonly oddsHistory: Map<string, EnhancedOddsEntry[]> = new Map();
  private readonly exposureTracker: Map<string, number> = new Map();
  private threatCallback?: (threat: string, data: unknown) => void;

  // Performance metrics
  private arbitrageDetectionCount = 0;
  private smartMoneyAlertCount = 0;
  private lastProcessingTimeMs = 0;

  constructor(config: Partial<RiskConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  /**
   * Set threat intelligence callback
   */
  setThreatCallback(callback: (threat: string, data: unknown) => void): void {
    this.threatCallback = callback;
  }

  /**
   * Process incoming odds update
   * Returns risk assessment for the update
   */
  processOddsUpdate(entry: EnhancedOddsEntry): RiskAssessment {
    const startTime = performance.now();

    // Track odds history for movement analysis
    this.trackOddsHistory(entry);

    // Update aggregated market view
    this.updateMarketAggregation(entry);

    // Perform risk assessment
    const factors: RiskFactor[] = [];
    let riskScore = 0;

    // Check for arbitrage opportunities
    const arbitrage = this.detectArbitrage(entry.marketId);
    if (arbitrage) {
      factors.push({
        type: 'ARBITRAGE_DETECTED',
        severity: 'high',
        description: `Arbitrage opportunity: ${arbitrage.profit.toFixed(2)}% profit`,
        weight: 0.4,
      });
      riskScore += 0.4;
      this.arbitrageDetectionCount++;

      if (this.config.enableThreatIntel && this.threatCallback) {
        this.threatCallback('ARBITRAGE_OPPORTUNITY', arbitrage);
      }
    }

    // Detect smart money patterns
    const smartMoney = this.detectSmartMoney(entry);
    if (smartMoney) {
      factors.push({
        type: 'SMART_MONEY_PATTERN',
        severity: smartMoney.confidence > 0.8 ? 'critical' : 'high',
        description: `${smartMoney.patternType} detected with ${(smartMoney.confidence * 100).toFixed(0)}% confidence`,
        weight: 0.3,
      });
      riskScore += 0.3 * smartMoney.confidence;
      this.smartMoneyAlertCount++;

      if (this.config.enableThreatIntel && this.threatCallback) {
        this.threatCallback('SMART_MONEY_DETECTED', smartMoney);
      }
    }

    // Check overround for market manipulation
    const overroundRisk = this.assessOverround(entry);
    if (overroundRisk > 0) {
      factors.push({
        type: 'OVERROUND_ANOMALY',
        severity: overroundRisk > 0.2 ? 'medium' : 'low',
        description: `Unusual overround: ${(entry.overround * 100).toFixed(2)}%`,
        weight: overroundRisk,
      });
      riskScore += overroundRisk;
    }

    // Check odds movement velocity
    const velocityRisk = this.assessVelocity(entry);
    if (velocityRisk > 0) {
      factors.push({
        type: 'RAPID_MOVEMENT',
        severity: velocityRisk > 0.15 ? 'high' : 'medium',
        description: 'Rapid odds movement detected',
        weight: velocityRisk,
      });
      riskScore += velocityRisk;
    }

    // Cap risk score at 1.0
    riskScore = Math.min(riskScore, 1.0);

    // Determine recommendation
    const recommendation = this.getRecommendation(riskScore);

    // Calculate max exposure
    const maxExposure = this.calculateMaxExposure(entry.marketId, riskScore);

    this.lastProcessingTimeMs = performance.now() - startTime;

    return {
      marketId: entry.marketId,
      riskScore,
      factors,
      recommendation,
      maxExposure,
      smartMoneyDetected: smartMoney !== null,
      arbitrageRisk: arbitrage !== null,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Detect arbitrage opportunities across bookmakers
   * Performance target: <1ms
   */
  detectArbitrage(marketId: string): ArbitrageOpportunity | null {
    const market = this.marketCache.get(marketId);
    if (!market || market.selections.length < 2) {
      return null;
    }

    // Calculate implied probabilities from best odds
    let totalImpliedProb = 0;
    const stakes: ArbitrageStake[] = [];

    for (const selection of market.selections) {
      if (selection.bestBack <= 1) continue;
      const impliedProb = 1 / selection.bestBack;
      totalImpliedProb += impliedProb;

      // Find best bookmaker for this selection
      const bestOddsSource = selection.odds.reduce((best, current) =>
        current.odds > best.odds && !current.suspended ? current : best
      );

      stakes.push({
        selectionId: selection.selectionId,
        bookmaker: bestOddsSource.source,
        odds: bestOddsSource.odds,
        stake: 0, // Calculated below
        potentialReturn: 0,
      });
    }

    // Arbitrage exists if total implied probability < 100%
    if (totalImpliedProb >= 1) {
      return null;
    }

    // Calculate profit percentage
    const profit = ((1 / totalImpliedProb) - 1) * 100;

    // Only flag if above threshold
    if (profit < this.config.arbitrageThreshold) {
      return null;
    }

    // Calculate optimal stakes for $1000 total
    const totalStake = 1000;
    const stakesWithAmounts = stakes.map(stake => ({
      ...stake,
      stake: (totalStake / totalImpliedProb) / stake.odds,
      potentialReturn: totalStake / totalImpliedProb,
    }));

    return {
      id: crypto.randomUUID(),
      profit,
      stakes: stakesWithAmounts,
      totalStake,
      expiresAt: Math.floor(Date.now() / 1000) + 30, // 30 second window
      confidence: Math.min(0.95, 1 - (totalImpliedProb * 0.9)),
      riskScore: 0.1, // Low risk for pure arbitrage
      detectedAt: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Detect smart money patterns
   * Identifies sharp action, steam moves, and syndicate activity
   */
  detectSmartMoney(entry: EnhancedOddsEntry): SmartMoneyPattern | null {
    const history = this.oddsHistory.get(entry.selectionId);
    if (!history || history.length < 3) {
      return null;
    }

    // Analyze recent movement
    const recentEntries = history.slice(-10);
    const movement = this.calculateMovement(recentEntries);

    // Steam move detection: rapid, significant movement in one direction
    if (Math.abs(movement.percentage) > 5 && movement.velocity > this.config.velocityThreshold) {
      const volumeProfile = this.analyzeVolumeProfile(recentEntries);

      if (volumeProfile.sharpRatio > this.config.sharpMoneyThreshold) {
        return {
          patternType: 'steam_move',
          confidence: Math.min(0.95, volumeProfile.sharpRatio + 0.3),
          affectedSelections: [entry.selectionId],
          volumeProfile,
          detectedAt: Math.floor(Date.now() / 1000),
        };
      }
    }

    // Sharp action detection: large volume at specific odds levels
    const volumeProfile = this.analyzeVolumeProfile(recentEntries);
    if (volumeProfile.sharpRatio > 0.5) {
      return {
        patternType: 'sharp_action',
        confidence: volumeProfile.sharpRatio,
        affectedSelections: [entry.selectionId],
        volumeProfile,
        detectedAt: Math.floor(Date.now() / 1000),
      };
    }

    // Line freeze detection: volume but no movement
    if (volumeProfile.totalVolume > 10000 && Math.abs(movement.percentage) < 0.5) {
      return {
        patternType: 'line_freeze',
        confidence: 0.7,
        affectedSelections: [entry.selectionId],
        volumeProfile,
        detectedAt: Math.floor(Date.now() / 1000),
      };
    }

    return null;
  }

  /**
   * Calculate market overround (vig/juice)
   * Normal range: 102-110%
   */
  calculateOverround(selections: readonly AggregatedSelection[]): number {
    let totalImpliedProb = 0;

    for (const selection of selections) {
      if (selection.bestBack > 1) {
        totalImpliedProb += 1 / selection.bestBack;
      }
    }

    return totalImpliedProb * 100;
  }

  /**
   * Get aggregated market view
   */
  getMarket(marketId: string): AggregatedMarket | null {
    return this.marketCache.get(marketId) ?? null;
  }

  /**
   * Get current exposure for a market
   */
  getExposure(marketId: string): number {
    return this.exposureTracker.get(marketId) ?? 0;
  }

  /**
   * Update exposure tracking
   */
  updateExposure(marketId: string, amount: number): void {
    const current = this.exposureTracker.get(marketId) ?? 0;
    this.exposureTracker.set(marketId, current + amount);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    arbitrageDetections: number;
    smartMoneyAlerts: number;
    lastProcessingMs: number;
    cachedMarkets: number;
    trackedExposure: number;
  } {
    let totalExposure = 0;
    for (const exposure of this.exposureTracker.values()) {
      totalExposure += exposure;
    }

    return {
      arbitrageDetections: this.arbitrageDetectionCount,
      smartMoneyAlerts: this.smartMoneyAlertCount,
      lastProcessingMs: this.lastProcessingTimeMs,
      cachedMarkets: this.marketCache.size,
      trackedExposure: totalExposure,
    };
  }

  /**
   * Clear all cached data
   */
  reset(): void {
    this.marketCache.clear();
    this.oddsHistory.clear();
    this.exposureTracker.clear();
    this.arbitrageDetectionCount = 0;
    this.smartMoneyAlertCount = 0;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private trackOddsHistory(entry: EnhancedOddsEntry): void {
    const history = this.oddsHistory.get(entry.selectionId) ?? [];
    history.push(entry);

    // Keep last 100 entries per selection
    if (history.length > 100) {
      history.shift();
    }

    this.oddsHistory.set(entry.selectionId, history);
  }

  private updateMarketAggregation(entry: EnhancedOddsEntry): void {
    let market = this.marketCache.get(entry.marketId);

    if (!market) {
      market = {
        eventId: entry.marketId,
        marketType: this.generateMarketName(entry.marketId),
        selections: [],
        bestOdds: {},
        arbitrageOpportunity: null,
        lastUpdate: entry.timestamp,
        sourceCount: 1,
        totalVolume: entry.volume,
      };
    }

    // Update or add selection
    const existingIndex = market.selections.findIndex(
      s => s.selectionId === entry.selectionId
    );

    const sourcedOdds: typeof market.selections[0]['odds'][0] = {
      source: entry.bookmaker,
      odds: entry.odds,
      volume: entry.availableVolume,
      timestamp: entry.timestamp,
      suspended: entry.status === MarketStatus.SUSPENDED,
    };

    const movement = this.calculateMovementFromEntry(entry);

    if (existingIndex >= 0) {
      const existing = market.selections[existingIndex];
      const updatedOdds = [...existing.odds.filter(o => o.source !== entry.bookmaker), sourcedOdds];

      const updatedSelection: AggregatedSelection = {
        ...existing,
        odds: updatedOdds,
        bestBack: Math.max(...updatedOdds.filter(o => !o.suspended).map(o => o.odds)),
        bestLay: existing.bestLay, // Would need lay odds tracking
        movement,
      };

      const selections = [...market.selections];
      selections[existingIndex] = updatedSelection;

      market = {
        ...market,
        selections,
        lastUpdate: entry.timestamp,
      };
    } else {
      const newSelection: AggregatedSelection = {
        selectionId: entry.selectionId,
        name: this.generateSelectionName(entry.selectionId),
        odds: [sourcedOdds],
        bestBack: entry.odds,
        bestLay: 0,
        movement,
      };

      market = {
        ...market,
        selections: [...market.selections, newSelection],
        lastUpdate: entry.timestamp,
      };
    }

    // Update best odds map
    const bestOdds: Record<string, number> = {};
    for (const selection of market.selections) {
      bestOdds[selection.selectionId] = selection.bestBack;
    }

    market = { ...market, bestOdds };

    this.marketCache.set(entry.marketId, market);
  }

  private calculateMovement(entries: EnhancedOddsEntry[]): OddsMovement {
    if (entries.length < 2) {
      return { direction: 'stable', delta: 0, percentage: 0, velocity: 0 };
    }

    const first = entries[0];
    const last = entries[entries.length - 1];
    const delta = last.odds - first.odds;
    const percentage = (delta / first.odds) * 100;
    const timeDiff = last.timestamp - first.timestamp;
    const velocity = timeDiff > 0 ? Math.abs(percentage) / timeDiff : 0;

    return {
      direction: delta > 0.01 ? 'up' : delta < -0.01 ? 'down' : 'stable',
      delta,
      percentage,
      velocity,
    };
  }

  private calculateMovementFromEntry(entry: EnhancedOddsEntry): OddsMovement {
    const delta = entry.odds - entry.previousOdds;
    const percentage = entry.previousOdds > 0 ? (delta / entry.previousOdds) * 100 : 0;

    return {
      direction: delta > 0.01 ? 'up' : delta < -0.01 ? 'down' : 'stable',
      delta,
      percentage,
      velocity: 0, // Would need time context
    };
  }

  /**
   * Generate a synthetic market name from marketId for display purposes.
   * Uses deterministic hashing to create consistent, readable names.
   */
  private generateMarketName(marketId: string): string {
    const teams = [
      ['Arsenal', 'Chelsea'], ['Lakers', 'Celtics'], ['Yankees', 'Red Sox'],
      ['Man United', 'Liverpool'], ['Warriors', 'Heat'], ['Dodgers', 'Giants'],
      ['Real Madrid', 'Barcelona'], ['Bulls', 'Knicks'], ['Patriots', 'Chiefs'],
    ];

    // Use simple character sum for deterministic but safe hashing
    let hash = 0;
    for (let i = 0; i < Math.min(8, marketId.length); i++) {
      hash += marketId.charCodeAt(i);
    }
    const teamIdx = Math.abs(hash) % teams.length;
    const [team1, team2] = teams[teamIdx];

    return `${team1} vs ${team2}`;
  }

  /**
   * Generate a synthetic selection name from selectionId for display purposes.
   * Uses deterministic hashing to create consistent, readable outcome names.
   */
  private generateSelectionName(selectionId: string): string {
    const outcomes = [
      'Home Win', 'Away Win', 'Draw',
      'Over 2.5', 'Under 2.5',
      'Yes', 'No',
      'Player A', 'Player B', 'Player C',
    ];

    // Use simple character sum for deterministic but safe hashing
    let hash = 0;
    for (let i = 0; i < Math.min(8, selectionId.length); i++) {
      hash += selectionId.charCodeAt(i);
    }
    return outcomes[Math.abs(hash) % outcomes.length];
  }

  private analyzeVolumeProfile(entries: EnhancedOddsEntry[]): VolumeProfile {
    let totalVolume = 0;
    let sharpVolume = 0;

    for (const entry of entries) {
      totalVolume += entry.volume;

      // Sharp volume heuristic: large volume with price movement
      if (entry.volume > 1000 && Math.abs(entry.odds - entry.previousOdds) > 0.02) {
        sharpVolume += entry.volume;
      }
    }

    const sharpRatio = totalVolume > 0 ? sharpVolume / totalVolume : 0;

    return {
      totalVolume,
      sharpVolume,
      publicVolume: totalVolume - sharpVolume,
      sharpRatio,
    };
  }

  private assessOverround(entry: EnhancedOddsEntry): number {
    // Normal overround range: 102-108%
    // Flag if outside this range
    const overround = entry.overround * 100;

    if (overround < 100) {
      // Negative overround = potential arbitrage
      return 0.3;
    } else if (overround > 115) {
      // Very high overround = market manipulation risk
      return 0.2;
    } else if (overround > 110) {
      return 0.1;
    }

    return 0;
  }

  private assessVelocity(entry: EnhancedOddsEntry): number {
    const history = this.oddsHistory.get(entry.selectionId);
    if (!history || history.length < 2) return 0;

    const movement = this.calculateMovement(history.slice(-5));

    if (movement.velocity > this.config.velocityThreshold * 2) {
      return 0.2;
    } else if (movement.velocity > this.config.velocityThreshold) {
      return 0.1;
    }

    return 0;
  }

  private getRecommendation(riskScore: number): 'accept' | 'review' | 'reject' {
    if (riskScore < 0.3) return 'accept';
    if (riskScore < this.config.maxRiskScore) return 'review';
    return 'reject';
  }

  private calculateMaxExposure(marketId: string, riskScore: number): number {
    const baseExposure = this.config.maxExposurePerMarket;
    const currentExposure = this.exposureTracker.get(marketId) ?? 0;

    // Reduce exposure limit based on risk score
    const adjustedLimit = baseExposure * (1 - riskScore);

    return Math.max(0, adjustedLimit - currentExposure);
  }
}
