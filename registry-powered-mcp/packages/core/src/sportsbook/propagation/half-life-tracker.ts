/**
 * Half-Life Tracker Engine
 * Main orchestrator for propagation delay tracking and pattern detection
 *
 * Hot Path Design (per update):
 * - O(1) tier lookup
 * - O(k) related markets (k~3 average)
 * - O(1) ring buffer insert
 * - O(1) EMA half-life update
 * - O(20) pattern detection
 * = ~100μs total
 *
 * Performance Target: <1ms per update
 * Memory Target: <8MB total
 *
 * SYSCALL: PROPAGATION_TRACKER_ENGINE
 */

import {
  type PropagationEntry,
  type PropagationConfig,
  type HalfLifeMetrics,
  type DetectedPattern,
  type TrackingResult,
  type PropagationHeatmap,
  type HeatmapCell,
  type PatternId,
  type PatternSeverity,
  MarketTier,
  PatternCategory,
  TIER_HALFLIFE_TARGETS,
  PATTERN_DEFINITIONS,
  DEFAULT_PROPAGATION_CONFIG,
  PROPAGATION_PERFORMANCE_TARGETS,
  isValidMarketTier,
} from './types';

import {
  HalfLifeCalculator,
  DelayRingBuffer,
} from './metrics/half-life-calculator';

import type { EnhancedOddsEntry, OddsMovement } from '../types';

// ============================================================================
// Market Relationship Tracking
// ============================================================================

/**
 * Tracks relationships between markets for propagation analysis
 * Uses efficient Map-based indexing for O(1) lookups
 */
interface MarketRelationship {
  /** Source market (leader) */
  sourceId: string;
  /** Target markets (followers) */
  targetIds: Set<string>;
  /** Market tier */
  tier: MarketTier;
  /** Last seen timestamp */
  lastSeen: number;
}

/**
 * Odds snapshot for propagation comparison
 */
interface OddsSnapshot {
  marketId: string;
  selectionId: string;
  odds: number;
  previousOdds: number;
  bookmaker: string;
  tier: MarketTier;
  timestamp: number;
  movement: OddsMovement;
}

// ============================================================================
// Pattern Detector Interface
// ============================================================================

/**
 * Interface for pattern detectors
 * Each detector is responsible for one or more patterns in a category
 */
export interface PatternDetector {
  /** Category this detector handles */
  readonly category: PatternCategory;
  /** Pattern IDs this detector can identify */
  readonly patternIds: readonly PatternId[];
  /** Detect patterns from current state */
  detect(
    entry: PropagationEntry,
    context: PatternDetectionContext
  ): DetectedPattern[];
}

/**
 * Context provided to pattern detectors
 */
export interface PatternDetectionContext {
  /** Current tier metrics */
  tierMetrics: ReadonlyMap<MarketTier, HalfLifeMetrics>;
  /** Recent propagation entries (last N) */
  recentEntries: readonly PropagationEntry[];
  /** Active patterns */
  activePatterns: ReadonlyMap<string, DetectedPattern>;
  /** Market snapshots for correlation */
  marketSnapshots: ReadonlyMap<string, OddsSnapshot>;
  /** Configuration */
  config: PropagationConfig;
}

// ============================================================================
// Half-Life Tracker
// ============================================================================

/**
 * Half-Life Tracker Engine
 * Core class for tracking propagation delays and detecting patterns
 */
export class HalfLifeTracker {
  private readonly config: PropagationConfig;
  private readonly calculator: HalfLifeCalculator;
  private readonly detectors: PatternDetector[] = [];

  // Market tracking
  private readonly marketSnapshots: Map<string, OddsSnapshot> = new Map();
  private readonly marketRelationships: Map<string, MarketRelationship> = new Map();
  private readonly marketToTier: Map<string, MarketTier> = new Map();

  // Pattern tracking
  private readonly activePatterns: Map<string, DetectedPattern> = new Map();
  private readonly recentEntries: PropagationEntry[] = [];
  private readonly maxRecentEntries = 100;

  // Heatmap state
  private readonly bookmakers: Set<string> = new Set();
  private heatmapCache: PropagationHeatmap | null = null;
  private heatmapDirty = true;

  // Metrics
  private updateCount = 0;
  private totalProcessingTimeUs = 0;
  private lastUpdateTime = 0;
  private messageSequence = 0;

  constructor(config: Partial<PropagationConfig> = {}) {
    this.config = { ...DEFAULT_PROPAGATION_CONFIG, ...config };
    this.calculator = new HalfLifeCalculator({
      bufferSize: this.config.maxEntriesPerPair,
      emaAlpha: this.config.emaAlpha,
      anomalyThreshold: this.config.anomalyThreshold,
    });
  }

  /**
   * Register a pattern detector
   */
  registerDetector(detector: PatternDetector): void {
    if (this.config.enabledCategories.includes(detector.category)) {
      this.detectors.push(detector);
    }
  }

  /**
   * Process an odds update and track propagation
   * Main entry point for the tracking engine
   */
  trackUpdate(entry: EnhancedOddsEntry): TrackingResult {
    const startTime = performance.now();

    const entries: PropagationEntry[] = [];
    const newPatterns: DetectedPattern[] = [];
    const expiredPatterns: { patternId: PatternId; reason: string }[] = [];

    // Infer market tier from market ID patterns
    const tier = this.inferMarketTier(entry.marketId);
    this.marketToTier.set(entry.marketId, tier);

    // Track bookmaker for heatmap
    this.bookmakers.add(entry.bookmaker);

    // Calculate movement
    const movement: OddsMovement = {
      direction: entry.odds > entry.previousOdds ? 'up' : entry.odds < entry.previousOdds ? 'down' : 'stable',
      delta: entry.odds - entry.previousOdds,
      percentage: entry.previousOdds > 0 ? ((entry.odds - entry.previousOdds) / entry.previousOdds) * 100 : 0,
      velocity: 0, // Would need time context
    };

    // Create snapshot
    const snapshot: OddsSnapshot = {
      marketId: entry.marketId,
      selectionId: entry.selectionId,
      odds: entry.odds,
      previousOdds: entry.previousOdds,
      bookmaker: entry.bookmaker,
      tier,
      timestamp: entry.timestamp,
      movement,
    };

    // Find related markets that should propagate from this update
    const relatedMarkets = this.findRelatedMarkets(snapshot);

    // Create propagation entries for each related market
    for (const related of relatedMarkets) {
      const delay = this.calculatePropagationDelay(snapshot, related);
      const damping = this.calculateDampingRatio(snapshot, related);

      const propagationEntry: PropagationEntry = {
        sourceMarketId: snapshot.marketId,
        targetMarketId: related.marketId,
        propagationDelayMs: delay,
        dampingRatio: damping,
        tier: related.tier,
        patternId: null, // Will be set by pattern detection
        bookmaker: related.bookmaker,
        timestamp: Date.now(),
      };

      entries.push(propagationEntry);

      // Update calculator
      this.calculator.processEntry(propagationEntry);

      // Add to recent entries
      this.recentEntries.push(propagationEntry);
      if (this.recentEntries.length > this.maxRecentEntries) {
        this.recentEntries.shift();
      }
    }

    // Store snapshot for future correlation
    this.marketSnapshots.set(entry.marketId, snapshot);

    // Expire old patterns
    const now = Date.now();
    for (const [key, pattern] of this.activePatterns) {
      if (pattern.expiresAt !== null && pattern.expiresAt < now) {
        expiredPatterns.push({ patternId: pattern.patternId, reason: 'timeout' });
        this.activePatterns.delete(key);
      }
    }

    // Run pattern detection if enabled
    if (this.config.enablePatternDetection && entries.length > 0) {
      const context = this.createDetectionContext();

      for (const detector of this.detectors) {
        for (const propEntry of entries) {
          const detected = detector.detect(propEntry, context);
          for (const pattern of detected) {
            if (pattern.confidence >= this.config.minPatternConfidence) {
              const patternKey = `${pattern.patternId}:${pattern.affectedMarkets.join(',')}`;
              this.activePatterns.set(patternKey, pattern);
              newPatterns.push(pattern);
            }
          }
        }
      }
    }

    // Mark heatmap as dirty
    this.heatmapDirty = true;

    // Update metrics
    const processingTimeUs = (performance.now() - startTime) * 1000;
    this.updateCount++;
    this.totalProcessingTimeUs += processingTimeUs;
    this.lastUpdateTime = now;

    // Build metrics updates
    const metricsUpdates = new Map<MarketTier, HalfLifeMetrics>();
    for (const tier of Object.values(MarketTier).filter((v) => typeof v === 'number') as MarketTier[]) {
      const metrics = this.calculator.getMetrics(tier);
      if (metrics) {
        metricsUpdates.set(tier, metrics);
      }
    }

    return {
      entries,
      metricsUpdates,
      newPatterns,
      expiredPatterns,
      processingTimeUs,
    };
  }

  /**
   * Get current half-life metrics for a tier
   */
  getTierMetrics(tier: MarketTier): HalfLifeMetrics | null {
    return this.calculator.getMetrics(tier);
  }

  /**
   * Get metrics for all tiers
   */
  getAllTierMetrics(): Map<MarketTier, HalfLifeMetrics> {
    return this.calculator.getAllTierMetrics();
  }

  /**
   * Get active patterns
   */
  getActivePatterns(): DetectedPattern[] {
    return Array.from(this.activePatterns.values());
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: PatternCategory): DetectedPattern[] {
    return this.getActivePatterns().filter(
      (p) => PATTERN_DEFINITIONS[p.patternId].category === category
    );
  }

  /**
   * Get patterns by severity
   */
  getPatternsBySeverity(minSeverity: PatternSeverity): DetectedPattern[] {
    const severityOrder: PatternSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const minIndex = severityOrder.indexOf(minSeverity);
    return this.getActivePatterns().filter(
      (p) => severityOrder.indexOf(p.severity) >= minIndex
    );
  }

  /**
   * Generate propagation heatmap for dashboard
   */
  getHeatmap(): PropagationHeatmap {
    if (this.heatmapCache && !this.heatmapDirty) {
      return this.heatmapCache;
    }

    const tiers = Object.values(MarketTier).filter((v) => typeof v === 'number') as MarketTier[];
    const bookmakerList = Array.from(this.bookmakers);

    if (bookmakerList.length === 0) {
      bookmakerList.push('default');
    }

    let minHalfLife = Infinity;
    let maxHalfLife = 0;

    // Build cells
    const cells: HeatmapCell[][] = tiers.map((tier, rowIndex) => {
      return bookmakerList.map((bookmaker, colIndex) => {
        const metrics = this.calculator.getMetrics(tier, bookmaker);
        const halfLifeMs = metrics?.halfLifeMs ?? TIER_HALFLIFE_TARGETS[tier].max;

        if (halfLifeMs < minHalfLife) minHalfLife = halfLifeMs;
        if (halfLifeMs > maxHalfLife) maxHalfLife = halfLifeMs;

        // Count patterns affecting this cell
        const patternCount = this.getActivePatterns().filter((p) =>
          p.affectedBookmakers.includes(bookmaker)
        ).length;

        return {
          row: rowIndex,
          col: colIndex,
          tier,
          bookmaker,
          halfLifeMs,
          heat: 0, // Will be normalized below
          patternCount,
          isAnomalous: metrics?.isAnomalous ?? false,
        };
      });
    });

    // Normalize heat values
    const range = maxHalfLife - minHalfLife;
    for (const row of cells) {
      for (const cell of row) {
        (cell as { heat: number }).heat =
          range > 0 ? (cell.halfLifeMs - minHalfLife) / range : 0.5;
      }
    }

    const rowLabels = tiers.map((t) => TIER_HALFLIFE_TARGETS[t].name);

    this.heatmapCache = {
      cells,
      rowLabels,
      columnLabels: bookmakerList,
      minHalfLife,
      maxHalfLife,
      lastUpdate: Date.now(),
    };
    this.heatmapDirty = false;

    return this.heatmapCache;
  }

  /**
   * Get recent propagation entries
   */
  getRecentEntries(limit?: number): PropagationEntry[] {
    const entries = [...this.recentEntries];
    entries.reverse();
    return limit ? entries.slice(0, limit) : entries;
  }

  /**
   * Get next message sequence number
   */
  nextSequence(): number {
    return ++this.messageSequence;
  }

  /**
   * Get tracker statistics
   */
  getStats(): {
    updateCount: number;
    avgProcessingTimeUs: number;
    trackedMarkets: number;
    trackedBookmakers: number;
    activePatterns: number;
    memoryBytes: number;
  } {
    return {
      updateCount: this.updateCount,
      avgProcessingTimeUs:
        this.updateCount > 0 ? this.totalProcessingTimeUs / this.updateCount : 0,
      trackedMarkets: this.marketSnapshots.size,
      trackedBookmakers: this.bookmakers.size,
      activePatterns: this.activePatterns.size,
      memoryBytes: this.estimateMemoryUsage(),
    };
  }

  /**
   * Reset all tracking state
   */
  reset(): void {
    this.calculator.resetAll();
    this.marketSnapshots.clear();
    this.marketRelationships.clear();
    this.marketToTier.clear();
    this.activePatterns.clear();
    this.recentEntries.length = 0;
    this.bookmakers.clear();
    this.heatmapCache = null;
    this.heatmapDirty = true;
    this.updateCount = 0;
    this.totalProcessingTimeUs = 0;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Infer market tier from market ID patterns
   * Uses heuristics based on common market naming conventions
   */
  private inferMarketTier(marketId: string): MarketTier {
    const id = marketId.toLowerCase();

    // Main line patterns
    if (id.includes('moneyline') || id.includes('spread') || id.includes('total') || id.includes('ml') || id.includes('main')) {
      return MarketTier.MAIN_LINE;
    }

    // Team totals
    if (id.includes('team_total') || id.includes('team-total')) {
      return MarketTier.TEAM_TOTALS;
    }

    // Quarter/Half
    if (id.includes('quarter') || id.includes('half') || id.includes('1h') || id.includes('2h') || id.includes('q1') || id.includes('q2')) {
      return MarketTier.QUARTER_HALF;
    }

    // Player props
    if (id.includes('player') || id.includes('prop') || id.includes('points') || id.includes('rebounds') || id.includes('assists')) {
      return MarketTier.PLAYER_PROPS;
    }

    // Alt lines
    if (id.includes('alt') || id.includes('alternative')) {
      return MarketTier.ALT_LINES;
    }

    // Prop combos
    if (id.includes('combo') || id.includes('sgp') || id.includes('parlay') || id.includes('multi')) {
      return MarketTier.PROP_COMBOS;
    }

    // Default to main line if unknown
    return MarketTier.MAIN_LINE;
  }

  /**
   * Find related markets that should track propagation from this update
   */
  private findRelatedMarkets(snapshot: OddsSnapshot): OddsSnapshot[] {
    const related: OddsSnapshot[] = [];

    // Find markets in higher tiers (slower propagation)
    for (const [marketId, otherSnapshot] of this.marketSnapshots) {
      if (marketId === snapshot.marketId) continue;

      // Only track propagation to higher tiers (slower markets)
      if (otherSnapshot.tier > snapshot.tier) {
        related.push(otherSnapshot);
      }

      // Also track same-tier different-bookmaker propagation
      if (
        otherSnapshot.tier === snapshot.tier &&
        otherSnapshot.bookmaker !== snapshot.bookmaker &&
        otherSnapshot.selectionId === snapshot.selectionId
      ) {
        related.push(otherSnapshot);
      }
    }

    return related;
  }

  /**
   * Calculate propagation delay between source and target
   */
  private calculatePropagationDelay(
    source: OddsSnapshot,
    target: OddsSnapshot
  ): number {
    // Time difference in milliseconds
    const timeDiff = Math.abs(target.timestamp - source.timestamp) * 1000;

    // Add tier-based expected delay
    const tierDelay = TIER_HALFLIFE_TARGETS[target.tier].min;

    // Combine with actual observed delay
    return Math.max(timeDiff, tierDelay * 0.5);
  }

  /**
   * Calculate damping ratio (how much the move is dampened)
   */
  private calculateDampingRatio(
    source: OddsSnapshot,
    target: OddsSnapshot
  ): number {
    const sourceDelta = Math.abs(source.odds - source.previousOdds);
    const targetDelta = Math.abs(target.odds - target.previousOdds);

    if (sourceDelta === 0) return 0;

    // Damping = target move / source move
    // Values < 1 mean the target dampens the source signal
    return Math.min(1, targetDelta / sourceDelta);
  }

  /**
   * Create context for pattern detection
   */
  private createDetectionContext(): PatternDetectionContext {
    return {
      tierMetrics: this.calculator.getAllTierMetrics(),
      recentEntries: this.recentEntries,
      activePatterns: this.activePatterns,
      marketSnapshots: this.marketSnapshots,
      config: this.config,
    };
  }

  /**
   * Estimate total memory usage
   */
  private estimateMemoryUsage(): number {
    let total = 0;

    // Calculator memory
    total += this.calculator.memoryBytes();

    // Market snapshots (~200 bytes each)
    total += this.marketSnapshots.size * 200;

    // Recent entries (~150 bytes each)
    total += this.recentEntries.length * 150;

    // Active patterns (~300 bytes each)
    total += this.activePatterns.size * 300;

    // Heatmap cache
    if (this.heatmapCache) {
      total += this.heatmapCache.cells.flat().length * 100;
    }

    return total;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a configured HalfLifeTracker instance
 */
export function createHalfLifeTracker(
  config?: Partial<PropagationConfig>
): HalfLifeTracker {
  return new HalfLifeTracker(config);
}
