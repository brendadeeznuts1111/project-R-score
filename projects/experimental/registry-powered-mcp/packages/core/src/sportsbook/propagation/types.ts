/**
 * Propagation Half-Life Framework Types
 * Monitoring latency arbitrage across derivative markets
 *
 * Pattern IDs: #70-89 (20 patterns across 5 categories)
 * Performance Target: <1ms tracking, <8MB memory
 *
 * SYSCALL: PROPAGATION_HALFLIFE_TYPES
 */

// ============================================================================
// Market Tier Classification
// ============================================================================

/**
 * Market tiers based on propagation half-life targets
 * Tier 1 (Main Line) propagates fastest, Tier 6 (Prop Combos) slowest
 */
export enum MarketTier {
  /** Main line markets (moneyline, spread, total) - 200-400ms */
  MAIN_LINE = 1,
  /** Team totals (first half, period totals) - 400-800ms */
  TEAM_TOTALS = 2,
  /** Quarter/half markets - 500ms-1.5s */
  QUARTER_HALF = 3,
  /** Player props (points, rebounds, etc.) - 800ms-2s */
  PLAYER_PROPS = 4,
  /** Alternative lines (alt spreads, alt totals) - 1-3s */
  ALT_LINES = 5,
  /** Prop combos (SGP, parlays) - 2-5s */
  PROP_COMBOS = 6,
}

/**
 * Half-life target ranges by tier (in milliseconds)
 */
export const TIER_HALFLIFE_TARGETS: Record<MarketTier, { min: number; max: number; name: string }> = {
  [MarketTier.MAIN_LINE]: { min: 200, max: 400, name: 'Main Line' },
  [MarketTier.TEAM_TOTALS]: { min: 400, max: 800, name: 'Team Totals' },
  [MarketTier.QUARTER_HALF]: { min: 500, max: 1500, name: 'Quarter/Half' },
  [MarketTier.PLAYER_PROPS]: { min: 800, max: 2000, name: 'Player Props' },
  [MarketTier.ALT_LINES]: { min: 1000, max: 3000, name: 'Alt Lines' },
  [MarketTier.PROP_COMBOS]: { min: 2000, max: 5000, name: 'Prop Combos' },
} as const;

// ============================================================================
// Pattern IDs (#70-89)
// ============================================================================

/**
 * Pattern categories for the 20 propagation patterns
 */
export enum PatternCategory {
  DERIVATIVE_DELAYS = 'DERIVATIVE_DELAYS',       // #70-73, #87
  CROSS_BOOK_ARBITRAGE = 'CROSS_BOOK_ARBITRAGE', // #74, #76, #81, #84
  TEMPORAL_INPLAY = 'TEMPORAL_INPLAY',           // #75, #77, #83, #86
  PROP_COMBO = 'PROP_COMBO',                     // #78, #80
  STEAM_BEHAVIORAL = 'STEAM_BEHAVIORAL',         // #79, #82, #85, #88, #89
}

/**
 * All pattern IDs with metadata
 */
export const PATTERN_DEFINITIONS = {
  // Derivative Market Delays (#70-73, #87)
  70: { id: 70, name: 'FIRST_HALF_SECOND_HALF_LAG', category: PatternCategory.DERIVATIVE_DELAYS, description: 'First-Half → Second-Half propagation delay' },
  71: { id: 71, name: 'QUARTER_HALF_ASYMMETRY', category: PatternCategory.DERIVATIVE_DELAYS, description: 'Quarter → Half price asymmetry' },
  72: { id: 72, name: 'ALT_LINE_STEP_FUNCTION', category: PatternCategory.DERIVATIVE_DELAYS, description: 'Alt-line step function delays at key numbers' },
  73: { id: 73, name: 'TEAM_TOTAL_DERIVATIVE', category: PatternCategory.DERIVATIVE_DELAYS, description: 'Team total derived from game total lag' },
  87: { id: 87, name: 'PLAYER_PROP_BETA_SKEW', category: PatternCategory.DERIVATIVE_DELAYS, description: 'Player prop beta skew from team line moves' },

  // Cross-Book & Provider (#74, #76, #81, #84)
  74: { id: 74, name: 'PROVIDER_SYNC_FAILURE', category: PatternCategory.CROSS_BOOK_ARBITRAGE, description: 'Sportradar/Genius provider sync failures' },
  76: { id: 76, name: 'EXCHANGE_SPREAD_COMPRESSION', category: PatternCategory.CROSS_BOOK_ARBITRAGE, description: 'Exchange spread compression lag vs fixed-odds' },
  81: { id: 81, name: 'PROVIDER_AB_DIVERGENCE', category: PatternCategory.CROSS_BOOK_ARBITRAGE, description: 'Provider A/B feed divergence window' },
  84: { id: 84, name: 'OFFSHORE_DOMESTIC_LAG', category: PatternCategory.CROSS_BOOK_ARBITRAGE, description: 'Offshore vs domestic book update lag' },

  // Temporal & In-Play (#75, #77, #83, #86)
  75: { id: 75, name: 'INPLAY_VELOCITY_CONVEXITY', category: PatternCategory.TEMPORAL_INPLAY, description: 'In-play velocity convexity near scoring events' },
  77: { id: 77, name: 'REGULATORY_DELAY_ARB', category: PatternCategory.TEMPORAL_INPLAY, description: 'Regulatory-mandated delay arbitrage (UK vs US)' },
  83: { id: 83, name: 'PERIOD_OVERLAP_ARB', category: PatternCategory.TEMPORAL_INPLAY, description: 'Period end/start overlap arbitrage window' },
  86: { id: 86, name: 'PREGAME_INPLAY_TRANSITION', category: PatternCategory.TEMPORAL_INPLAY, description: 'Pre-game to in-play transition timing window' },

  // Prop & Combo (#78, #80)
  78: { id: 78, name: 'FRECHET_BOUNDS_VIOLATION', category: PatternCategory.PROP_COMBO, description: 'Prop combo Fréchet bounds violations' },
  80: { id: 80, name: 'MICRO_MARKET_CASCADE', category: PatternCategory.PROP_COMBO, description: 'Micro-market cascade prediction from main line' },

  // Steam & Behavioral (#79, #82, #85, #88, #89)
  79: { id: 79, name: 'STEAM_DIRECTION_ASYMMETRY', category: PatternCategory.STEAM_BEHAVIORAL, description: 'Steam direction asymmetry (in vs out)' },
  82: { id: 82, name: 'CROSS_EVENT_MOMENTUM', category: PatternCategory.STEAM_BEHAVIORAL, description: 'Cross-event momentum transfer (same team/player)' },
  85: { id: 85, name: 'EXCHANGE_LIQUIDITY_MIRAGE', category: PatternCategory.STEAM_BEHAVIORAL, description: 'Exchange liquidity mirage detection' },
  88: { id: 88, name: 'STEAM_SOURCE_FINGERPRINT', category: PatternCategory.STEAM_BEHAVIORAL, description: 'Steam source fingerprinting by propagation signature' },
  89: { id: 89, name: 'SHARP_BOOK_SHADOW', category: PatternCategory.STEAM_BEHAVIORAL, description: 'Sharp book shadow detection (Pinnacle/CRIS following)' },
} as const;

export type PatternId = keyof typeof PATTERN_DEFINITIONS;
export type PatternDefinition = typeof PATTERN_DEFINITIONS[PatternId];

// ============================================================================
// Core Propagation Types
// ============================================================================

/**
 * Single propagation observation between source and target markets
 */
export interface PropagationEntry {
  /** Source market ID (the "leader") */
  readonly sourceMarketId: string;
  /** Target market ID (the "follower") */
  readonly targetMarketId: string;
  /** Propagation delay in milliseconds */
  readonly propagationDelayMs: number;
  /** Damping ratio: target move / source move (0-1, <1 means dampened) */
  readonly dampingRatio: number;
  /** Market tier of target */
  readonly tier: MarketTier;
  /** Detected pattern if any */
  readonly patternId: PatternId | null;
  /** Bookmaker/source of target market */
  readonly bookmaker: string;
  /** Timestamp of observation */
  readonly timestamp: number;
}

/**
 * Half-life metrics for a market pair or tier
 */
export interface HalfLifeMetrics {
  /** Computed half-life in milliseconds */
  readonly halfLifeMs: number;
  /** Decay constant: lambda = ln(2) / halfLife */
  readonly decayConstant: number;
  /** 50th percentile delay */
  readonly p50DelayMs: number;
  /** 99th percentile delay */
  readonly p99DelayMs: number;
  /** Anomaly score (0-1, higher = more anomalous) */
  readonly anomalyScore: number;
  /** Whether current metrics are anomalous vs historical baseline */
  readonly isAnomalous: boolean;
  /** Sample count used for calculation */
  readonly sampleCount: number;
  /** Last update timestamp */
  readonly lastUpdate: number;
}

/**
 * Severity levels for detected patterns
 */
export type PatternSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Detected pattern instance
 */
export interface DetectedPattern {
  /** Pattern ID from PATTERN_DEFINITIONS */
  readonly patternId: PatternId;
  /** Detection confidence (0-1) */
  readonly confidence: number;
  /** Severity based on profit potential and reliability */
  readonly severity: PatternSeverity;
  /** List of affected market IDs */
  readonly affectedMarkets: readonly string[];
  /** Bookmakers involved */
  readonly affectedBookmakers: readonly string[];
  /** Estimated profit potential (basis points) */
  readonly profitBps: number;
  /** Pattern expiry timestamp (null = indefinite) */
  readonly expiresAt: number | null;
  /** Detection timestamp */
  readonly detectedAt: number;
  /** Additional context data */
  readonly context: Readonly<Record<string, unknown>>;
}

// ============================================================================
// Heatmap Types (Terminal Dashboard)
// ============================================================================

/**
 * Heatmap cell for propagation visualization
 * Represents a single tier-bookmaker combination
 */
export interface HeatmapCell {
  /** Row index (tier) */
  readonly row: number;
  /** Column index (bookmaker) */
  readonly col: number;
  /** Market tier */
  readonly tier: MarketTier;
  /** Bookmaker identifier */
  readonly bookmaker: string;
  /** Current half-life in ms */
  readonly halfLifeMs: number;
  /** Heat value (0-1, normalized for color mapping) */
  readonly heat: number;
  /** Number of active patterns in this cell */
  readonly patternCount: number;
  /** Whether cell is anomalous */
  readonly isAnomalous: boolean;
}

/**
 * Full heatmap state for dashboard rendering
 */
export interface PropagationHeatmap {
  /** 2D matrix of cells [tier][bookmaker] */
  readonly cells: readonly (readonly HeatmapCell[])[];
  /** Row labels (tier names) */
  readonly rowLabels: readonly string[];
  /** Column labels (bookmaker names) */
  readonly columnLabels: readonly string[];
  /** Global min half-life for color scaling */
  readonly minHalfLife: number;
  /** Global max half-life for color scaling */
  readonly maxHalfLife: number;
  /** Last update timestamp */
  readonly lastUpdate: number;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * REST API query parameters for /mcp/propagation/half-life
 */
export interface HalfLifeQuery {
  source?: string;
  target?: string;
  tier?: MarketTier;
  bookmaker?: string;
  limit?: number;
}

/**
 * REST API query parameters for /mcp/propagation/patterns
 */
export interface PatternQuery {
  patternId?: PatternId;
  category?: PatternCategory;
  severity?: PatternSeverity;
  minConfidence?: number;
  limit?: number;
}

/**
 * REST API response for half-life endpoint
 */
export interface HalfLifeResponse {
  readonly success: boolean;
  readonly data: {
    readonly metrics: HalfLifeMetrics;
    readonly entries: readonly PropagationEntry[];
  };
}

/**
 * REST API response for patterns endpoint
 */
export interface PatternResponse {
  readonly success: boolean;
  readonly data: {
    readonly patterns: readonly DetectedPattern[];
    readonly count: number;
  };
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

/**
 * WebSocket message types for propagation updates
 */
export type PropagationMessageType =
  | 'HALF_LIFE_UPDATE'
  | 'PATTERN_DETECTED'
  | 'PATTERN_EXPIRED'
  | 'HEATMAP_UPDATE';

/**
 * Base WebSocket message structure
 */
export interface PropagationMessage<T = unknown> {
  readonly type: PropagationMessageType;
  readonly timestamp: number;
  readonly sequence: number;
  readonly payload: T;
}

/**
 * Half-life update message payload
 */
export interface HalfLifeUpdatePayload {
  readonly tier: MarketTier;
  readonly bookmaker: string;
  readonly metrics: HalfLifeMetrics;
  readonly previousMetrics: HalfLifeMetrics | null;
}

/**
 * Pattern detected message payload
 */
export interface PatternDetectedPayload {
  readonly pattern: DetectedPattern;
}

/**
 * Pattern expired message payload
 */
export interface PatternExpiredPayload {
  readonly patternId: PatternId;
  readonly affectedMarkets: readonly string[];
  readonly reason: 'timeout' | 'resolved' | 'invalidated';
}

/**
 * Heatmap update message payload (delta)
 */
export interface HeatmapUpdatePayload {
  /** Only changed cells */
  readonly changedCells: readonly HeatmapCell[];
  /** Timestamp of update */
  readonly timestamp: number;
}

// ============================================================================
// Tracker Result Types
// ============================================================================

/**
 * Result from processing an odds update
 */
export interface TrackingResult {
  /** New propagation entries created */
  readonly entries: readonly PropagationEntry[];
  /** Updated half-life metrics by tier */
  readonly metricsUpdates: ReadonlyMap<MarketTier, HalfLifeMetrics>;
  /** Newly detected patterns */
  readonly newPatterns: readonly DetectedPattern[];
  /** Expired patterns */
  readonly expiredPatterns: readonly { patternId: PatternId; reason: string }[];
  /** Processing time in microseconds */
  readonly processingTimeUs: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Propagation tracker configuration
 */
export interface PropagationConfig {
  /** Maximum entries to keep per market pair (ring buffer size) */
  readonly maxEntriesPerPair: number;
  /** EMA alpha for half-life smoothing (0-1) */
  readonly emaAlpha: number;
  /** Anomaly threshold (z-score) */
  readonly anomalyThreshold: number;
  /** Pattern expiry default (ms) */
  readonly patternExpiryMs: number;
  /** Enable pattern detection */
  readonly enablePatternDetection: boolean;
  /** Enabled pattern categories */
  readonly enabledCategories: readonly PatternCategory[];
  /** Minimum confidence to report pattern */
  readonly minPatternConfidence: number;
}

/**
 * Default configuration
 */
export const DEFAULT_PROPAGATION_CONFIG: PropagationConfig = {
  maxEntriesPerPair: 100,
  emaAlpha: 0.1,
  anomalyThreshold: 3.0,
  patternExpiryMs: 30_000,
  enablePatternDetection: true,
  enabledCategories: Object.values(PatternCategory),
  minPatternConfidence: 0.6,
} as const;

// ============================================================================
// Performance Targets
// ============================================================================

/**
 * Performance SLA for propagation tracking
 */
export const PROPAGATION_PERFORMANCE_TARGETS = {
  /** Maximum processing time per update (microseconds) */
  UPDATE_PROCESSING_US: 1000,
  /** Maximum memory for ring buffers + caches (bytes) */
  MAX_MEMORY_BYTES: 8 * 1024 * 1024, // 8MB
  /** Dashboard refresh rate (ms) */
  DASHBOARD_REFRESH_MS: 100,
  /** Pattern detection budget per detector (microseconds) */
  PATTERN_DETECTION_US: 50,
} as const;

// ============================================================================
// Type Guards
// ============================================================================

export function isValidMarketTier(value: number): value is MarketTier {
  return value >= MarketTier.MAIN_LINE && value <= MarketTier.PROP_COMBOS;
}

export function isValidPatternId(value: number): value is PatternId {
  return value in PATTERN_DEFINITIONS;
}

export function isValidPatternCategory(value: string): value is PatternCategory {
  return Object.values(PatternCategory).includes(value as PatternCategory);
}

export function isValidPatternSeverity(value: string): value is PatternSeverity {
  return ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(value);
}

export function isDetectedPattern(value: unknown): value is DetectedPattern {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.patternId === 'number' &&
    isValidPatternId(obj.patternId) &&
    typeof obj.confidence === 'number' &&
    typeof obj.severity === 'string' &&
    Array.isArray(obj.affectedMarkets)
  );
}
