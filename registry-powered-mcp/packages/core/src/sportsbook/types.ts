/**
 * Sportsbook Protocol Types
 * High-frequency odds feed, risk management, and compliance infrastructure
 *
 * Performance Targets:
 * - 15,000 updates/sec odds parsing
 * - 50,000 bets/sec order matching
 * - <1ms arbitrage detection
 * - Quantum-resistant ML-DSA signatures
 */

import type { InfrastructureFeature } from '../types/feature-flags';

// ============================================================================
// Market Status & Odds Format Enums
// ============================================================================

/**
 * Market lifecycle states
 * Binary-encoded for wire protocol efficiency
 */
export enum MarketStatus {
  PRE_OPEN = 0,        // Market not yet open for betting
  OPEN = 1,            // Active and accepting bets
  SUSPENDED = 2,       // Temporarily halted (injury, weather, etc.)
  CLOSED = 3,          // No longer accepting bets
  SETTLED = 4,         // Results finalized, payouts complete
  CANCELLED = 5,       // Market voided, stakes returned
  PENDING_REVIEW = 6,  // Under manual review
}

/**
 * Supported odds display formats
 * All formats stored internally as decimal for calculations
 */
export enum OddsFormat {
  DECIMAL = 0,      // 2.50 (European standard)
  FRACTIONAL = 1,   // 3/2 (UK standard)
  AMERICAN = 2,     // +150 / -200 (US standard)
  HONG_KONG = 3,    // 1.50 (stake excluded)
  MALAY = 4,        // 0.50 / -0.50 (Asian style)
  INDO = 5,         // 1.50 / -1.50 (Indonesian style)
}

/**
 * Bet types for order matching
 */
export enum BetType {
  BACK = 0,    // Bet for outcome to happen
  LAY = 1,     // Bet against outcome
  LIMIT = 2,   // Limit order (price-sensitive)
  MARKET = 3,  // Market order (immediate fill)
}

/**
 * Order status for matching engine
 */
export enum OrderStatus {
  PENDING = 0,
  PARTIALLY_FILLED = 1,
  FILLED = 2,
  CANCELLED = 3,
  EXPIRED = 4,
  REJECTED = 5,
}

/**
 * Regulatory jurisdiction codes
 */
export enum Jurisdiction {
  GDPR = 0,     // EU General Data Protection Regulation
  CCPA = 1,     // California Consumer Privacy Act
  PIPL = 2,     // China Personal Information Protection Law
  UKGC = 3,     // UK Gambling Commission
  MGA = 4,      // Malta Gaming Authority
  CURACAO = 5,  // Curacao eGaming
}

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Enhanced odds entry with full market context
 * Wire format: 64 bytes fixed-width
 */
export interface EnhancedOddsEntry {
  readonly marketId: string;           // Unique market identifier (UUID)
  readonly selectionId: string;        // Selection within market
  readonly odds: number;               // Decimal odds value
  readonly previousOdds: number;       // Previous odds for movement tracking
  readonly volume: number;             // Total matched volume
  readonly availableVolume: number;    // Current liquidity
  readonly timestamp: number;          // Unix timestamp (seconds)
  readonly sequence: number;           // Monotonic sequence number
  readonly status: MarketStatus;       // Current market state
  readonly format: OddsFormat;         // Display format preference
  readonly bookmaker: string;          // Source bookmaker ID
  readonly overround: number;          // Market overround percentage
}

/**
 * Aggregated market view across multiple bookmakers
 */
export interface AggregatedMarket {
  readonly eventId: string;            // Parent event identifier
  readonly marketType: string;         // Market type (e.g., "MATCH_WINNER")
  readonly selections: readonly AggregatedSelection[];
  readonly bestOdds: Record<string, number>;  // Best odds per selection
  readonly arbitrageOpportunity: ArbitrageOpportunity | null;
  readonly lastUpdate: number;         // Last aggregation timestamp
  readonly sourceCount: number;        // Number of contributing sources
  readonly totalVolume: number;        // Combined market volume
}

/**
 * Aggregated selection with multi-source odds
 */
export interface AggregatedSelection {
  readonly selectionId: string;
  readonly name: string;
  readonly odds: readonly SourcedOdds[];
  readonly bestBack: number;           // Best back odds
  readonly bestLay: number;            // Best lay odds
  readonly movement: OddsMovement;     // Price direction
}

/**
 * Odds from a specific source/bookmaker
 */
export interface SourcedOdds {
  readonly source: string;
  readonly odds: number;
  readonly volume: number;
  readonly timestamp: number;
  readonly suspended: boolean;
}

/**
 * Price movement indicator
 */
export interface OddsMovement {
  readonly direction: 'up' | 'down' | 'stable';
  readonly delta: number;              // Absolute change
  readonly percentage: number;         // Percentage change
  readonly velocity: number;           // Change rate (per second)
}

// ============================================================================
// Arbitrage Detection
// ============================================================================

/**
 * Detected arbitrage opportunity
 */
export interface ArbitrageOpportunity {
  readonly id: string;                 // Unique opportunity ID
  readonly profit: number;             // Guaranteed profit percentage
  readonly stakes: readonly ArbitrageStake[];
  readonly totalStake: number;         // Required capital
  readonly expiresAt: number;          // Opportunity expiry (seconds)
  readonly confidence: number;         // Detection confidence (0-1)
  readonly riskScore: number;          // Risk assessment (0-1)
  readonly detectedAt: number;         // Detection timestamp
}

/**
 * Individual stake in arbitrage opportunity
 */
export interface ArbitrageStake {
  readonly selectionId: string;
  readonly bookmaker: string;
  readonly odds: number;
  readonly stake: number;
  readonly potentialReturn: number;
}

// ============================================================================
// Risk Management
// ============================================================================

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  readonly marketId: string;
  readonly riskScore: number;          // 0-1 risk level
  readonly factors: readonly RiskFactor[];
  readonly recommendation: 'accept' | 'review' | 'reject';
  readonly maxExposure: number;        // Recommended exposure limit
  readonly smartMoneyDetected: boolean;
  readonly arbitrageRisk: boolean;
  readonly timestamp: number;
}

/**
 * Individual risk factor
 */
export interface RiskFactor {
  readonly type: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly weight: number;             // Factor weight in score
}

/**
 * Smart money pattern detection
 */
export interface SmartMoneyPattern {
  readonly patternType: 'steam_move' | 'sharp_action' | 'syndicate' | 'line_freeze';
  readonly confidence: number;
  readonly affectedSelections: readonly string[];
  readonly volumeProfile: VolumeProfile;
  readonly detectedAt: number;
}

/**
 * Volume distribution profile
 */
export interface VolumeProfile {
  readonly totalVolume: number;
  readonly sharpVolume: number;        // Estimated sharp money
  readonly publicVolume: number;       // Estimated public money
  readonly sharpRatio: number;         // Sharp money percentage
}

// ============================================================================
// Order Matching
// ============================================================================

/**
 * Bet order for matching engine
 */
export interface BetOrder {
  readonly orderId: string;
  readonly userId: string;
  readonly marketId: string;
  readonly selectionId: string;
  readonly type: BetType;
  readonly odds: number;               // Requested odds
  readonly stake: number;              // Stake amount
  readonly createdAt: number;          // Order creation time
  readonly expiresAt: number;          // Order expiry time
  readonly signature: Uint8Array;      // ML-DSA quantum-resistant signature
}

/**
 * Matched bet result
 */
export interface MatchedBet {
  readonly matchId: string;
  readonly backOrderId: string;
  readonly layOrderId: string;
  readonly matchedOdds: number;
  readonly matchedStake: number;
  readonly matchedAt: number;
  readonly backUserId: string;
  readonly layUserId: string;
}

/**
 * Order book state
 */
export interface OrderBook {
  readonly marketId: string;
  readonly selectionId: string;
  readonly backOrders: readonly OrderBookLevel[];
  readonly layOrders: readonly OrderBookLevel[];
  readonly lastUpdate: number;
  readonly depth: number;              // Total order count
}

/**
 * Order book price level
 */
export interface OrderBookLevel {
  readonly odds: number;
  readonly volume: number;
  readonly orderCount: number;
}

// ============================================================================
// Regulatory Compliance
// ============================================================================

/**
 * Regulatory report export
 */
export interface RegulatoryReport {
  readonly reportId: string;
  readonly jurisdiction: Jurisdiction;
  readonly reportType: string;
  readonly periodStart: number;
  readonly periodEnd: number;
  readonly generatedAt: number;
  readonly data: Uint8Array;           // Encrypted report payload
  readonly signature: Uint8Array;      // ML-DSA signature
  readonly checksum: number;           // Integrity checksum
}

/**
 * Compliance audit trail entry
 */
export interface AuditEntry {
  readonly entryId: string;
  readonly timestamp: number;
  readonly action: string;
  readonly userId: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly changes: Record<string, unknown>;
  readonly ipAddress: string;
  readonly jurisdiction: Jurisdiction;
}

// ============================================================================
// Performance & Telemetry
// ============================================================================

/**
 * Sportsbook performance metrics
 */
export interface SportsbookMetrics {
  readonly updatesPerSecond: number;
  readonly ordersPerSecond: number;
  readonly matchLatencyP99: number;    // P99 matching latency (ms)
  readonly arbitrageDetectionMs: number;
  readonly heapUsage: number;
  readonly activeMarkets: number;
  readonly openOrders: number;
  readonly matchedToday: number;
}

/**
 * Performance targets for SLA enforcement
 */
export const SPORTSBOOK_PERFORMANCE_TARGETS = {
  /** Maximum odds updates per second */
  ODDS_UPDATES_PER_SEC: 15_000,
  /** Maximum orders matched per second */
  ORDERS_PER_SEC: 50_000,
  /** P99 order matching latency (ms) */
  MATCH_LATENCY_P99_MS: 1.0,
  /** Arbitrage detection time (ms) */
  ARBITRAGE_DETECTION_MS: 1.0,
  /** Heap usage limit (MB) */
  MAX_HEAP_MB: 128,
  /** Order book depth limit */
  MAX_ORDER_BOOK_DEPTH: 10_000,
  /** WebSocket reconnection time (ms) */
  WS_RECONNECT_MS: 100,
} as const;

/**
 * Feature flags for sportsbook infrastructure
 */
export const SPORTSBOOK_FEATURES: readonly InfrastructureFeature[] = [
  'BINARY_PROTOCOL',
  'BINARY_STREAMING',
  'WEBSOCKET_TRANSPORT',
  'QUANTUM_READY',
  'THREAT_INTEL',
] as const;

// ============================================================================
// Wire Protocol Types
// ============================================================================

/**
 * Binary message types for wire protocol
 */
export enum MessageType {
  ODDS_UPDATE = 0x01,
  MARKET_STATUS = 0x02,
  ORDER_SUBMIT = 0x03,
  ORDER_CANCEL = 0x04,
  ORDER_MATCHED = 0x05,
  HEARTBEAT = 0x06,
  SUBSCRIBE = 0x07,
  UNSUBSCRIBE = 0x08,
  ERROR = 0xFF,
}

/**
 * Wire protocol header (16 bytes)
 */
export interface WireHeader {
  readonly magic: number;              // Protocol magic (0x53504254 = "SPBT")
  readonly version: number;            // Protocol version
  readonly type: MessageType;          // Message type
  readonly length: number;             // Payload length
  readonly sequence: number;           // Sequence number
  readonly timestamp: number;          // Message timestamp
}

/**
 * Protocol magic number for sportsbook binary protocol
 */
export const SPORTSBOOK_MAGIC = 0x53504254; // "SPBT" in ASCII

/**
 * Current protocol version
 */
export const SPORTSBOOK_PROTOCOL_VERSION = 1;

// ============================================================================
// Type Guards
// ============================================================================

export function isValidMarketStatus(value: number): value is MarketStatus {
  return value >= MarketStatus.PRE_OPEN && value <= MarketStatus.PENDING_REVIEW;
}

export function isValidOddsFormat(value: number): value is OddsFormat {
  return value >= OddsFormat.DECIMAL && value <= OddsFormat.INDO;
}

export function isValidMessageType(value: number): value is MessageType {
  return Object.values(MessageType).includes(value);
}

export function isArbitrageOpportunity(value: unknown): value is ArbitrageOpportunity {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.profit === 'number' &&
    Array.isArray(obj.stakes) &&
    typeof obj.totalStake === 'number'
  );
}
