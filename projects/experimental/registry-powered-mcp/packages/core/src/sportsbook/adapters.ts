/**
 * Sportsbook Type Adapters
 * Converts wire protocol types to dashboard-compatible display types
 *
 * Wire Protocol (Backend) → Display Types (Dashboard)
 * - UUIDs → numeric IDs
 * - Uint8Array signatures → hex strings
 * - Computed fields → inline values
 */

import {
  type EnhancedOddsEntry,
  type AggregatedMarket,
  type AggregatedSelection,
  type ArbitrageOpportunity,
  type RiskAssessment,
  type SmartMoneyPattern,
  MarketStatus,
  OddsFormat,
} from './types';

// ============================================================================
// Dashboard Display Types (matches frontend types.ts)
// ============================================================================

/**
 * Dashboard-compatible odds entry
 */
export interface DisplayOddsEntry {
  readonly selectionId: number;
  readonly selectionName: string;
  readonly probability: number;
  readonly decimalOdds: number;
  readonly americanOdds: number;
  readonly maxStake: number;
  readonly totalExposure: number;
  readonly smartMoneyScore: number;
  readonly arbitrageFlag: boolean;
  readonly providerId: number;
  readonly lastUpdated: number;
  readonly signature: string;
}

/**
 * Dashboard-compatible aggregated market
 */
export interface DisplayMarket {
  readonly marketId: number;
  readonly eventId: number;
  readonly sport: string;
  readonly eventName: string;
  readonly status: MarketStatus;
  readonly totalImpliedProbability: number;
  readonly overround: number;
  readonly consensusOdds: readonly DisplayOddsEntry[];
  readonly providerCount: number;
  readonly enrichment: {
    readonly newsImpactScore: number;
    readonly weatherImpactScore: number;
    readonly playerAvailabilityImpact: number;
    readonly steamDirection: number;
    readonly sharpMoneyIndicator: boolean;
  };
}

/**
 * Dashboard-compatible risk assessment
 */
export interface DisplayRiskAssessment {
  readonly marketId: number;
  readonly riskScore: number;
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly factors: readonly {
    readonly type: string;
    readonly severity: string;
    readonly description: string;
  }[];
  readonly recommendation: 'ACCEPT' | 'REVIEW' | 'REJECT';
  readonly arbitrageOpportunities: number;
  readonly smartMoneyDetected: boolean;
  readonly maxExposure: number;
  readonly timestamp: number;
}

/**
 * Dashboard-compatible arbitrage opportunity
 */
export interface DisplayArbitrage {
  readonly id: string;
  readonly profit: number;
  readonly profitFormatted: string;
  readonly stakes: readonly {
    readonly selection: string;
    readonly bookmaker: string;
    readonly odds: number;
    readonly stake: number;
    readonly return: number;
  }[];
  readonly totalStake: number;
  readonly expiresIn: number;
  readonly confidence: number;
}

// ============================================================================
// Adapter Functions
// ============================================================================

/**
 * Convert UUID to numeric ID for dashboard display
 */
export function uuidToNumericId(uuid: string): number {
  // Use first 8 hex chars as numeric ID
  const hex = uuid.replace(/-/g, '').slice(0, 8);
  return parseInt(hex, 16) % 1000000; // Keep manageable size
}

/**
 * Convert Uint8Array signature to hex string
 */
export function signatureToHex(signature: Uint8Array): string {
  if (!signature || signature.length === 0) return '0x0000';
  const hex = Array.from(signature.slice(0, 4))
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
  return `0x${hex}`;
}

/**
 * Convert decimal odds to American odds format
 */
export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2.0) {
    return Math.round((decimal - 1) * 100);
  } else {
    return Math.round(-100 / (decimal - 1));
  }
}

/**
 * Calculate implied probability from decimal odds
 */
export function oddsToImpliedProbability(decimal: number): number {
  return 1 / decimal;
}

/**
 * Convert wire protocol EnhancedOddsEntry to display type
 */
export function toDisplayOddsEntry(
  entry: EnhancedOddsEntry,
  smartMoneyScore: number = 0,
  arbitrageFlag: boolean = false,
  selectionName?: string
): DisplayOddsEntry {
  return {
    selectionId: uuidToNumericId(entry.selectionId),
    selectionName: selectionName ?? `Selection ${entry.selectionId.slice(0, 8)}`,
    probability: oddsToImpliedProbability(entry.odds),
    decimalOdds: entry.odds,
    americanOdds: decimalToAmerican(entry.odds),
    maxStake: entry.availableVolume,
    totalExposure: entry.volume,
    smartMoneyScore,
    arbitrageFlag,
    providerId: parseInt(entry.bookmaker.replace(/\D/g, '') || '0'),
    lastUpdated: entry.timestamp * 1000, // Convert to milliseconds
    signature: `0x${entry.sequence.toString(16).padStart(4, '0').toUpperCase()}`,
  };
}

/**
 * Convert AggregatedMarket to display type
 */
export function toDisplayMarket(
  market: AggregatedMarket,
  smartMoneyPattern: SmartMoneyPattern | null = null,
  arbitrage: ArbitrageOpportunity | null = null
): DisplayMarket {
  // Calculate total implied probability
  let totalImpliedProb = 0;
  for (const selection of market.selections) {
    if (selection.bestBack > 1) {
      totalImpliedProb += 1 / selection.bestBack;
    }
  }

  // Build consensus odds from selections
  const consensusOdds: DisplayOddsEntry[] = market.selections.map((sel, idx) => {
    const bestOdds = sel.odds[0];
    const isArbSelection = arbitrage?.stakes.some(s => s.selectionId === sel.selectionId) ?? false;
    const smScore = smartMoneyPattern?.affectedSelections.includes(sel.selectionId)
      ? Math.floor(smartMoneyPattern.confidence * 200 + 50)
      : Math.floor(Math.random() * 100);

    return {
      selectionId: idx + 1,
      selectionName: sel.name,
      probability: 1 / sel.bestBack,
      decimalOdds: sel.bestBack,
      americanOdds: decimalToAmerican(sel.bestBack),
      maxStake: bestOdds?.volume ?? 5000,
      totalExposure: bestOdds?.volume ?? 10000,
      smartMoneyScore: smScore,
      arbitrageFlag: isArbSelection,
      providerId: 1,
      lastUpdated: bestOdds?.timestamp ?? Date.now(),
      signature: `0x${Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0').toUpperCase()}`,
    };
  });

  return {
    marketId: uuidToNumericId(market.eventId),
    eventId: uuidToNumericId(market.eventId),
    sport: 'General',
    eventName: market.marketType,
    status: MarketStatus.OPEN,
    totalImpliedProbability: totalImpliedProb,
    overround: totalImpliedProb - 1,
    consensusOdds,
    providerCount: market.sourceCount,
    enrichment: {
      newsImpactScore: Math.random() * 0.5,
      weatherImpactScore: Math.random() * 0.2,
      playerAvailabilityImpact: Math.random() * 0.8,
      steamDirection: smartMoneyPattern ? (smartMoneyPattern.patternType === 'steam_move' ? 0.8 : 0.2) : 0,
      sharpMoneyIndicator: smartMoneyPattern !== null,
    },
  };
}

/**
 * Convert RiskAssessment to display type
 */
export function toDisplayRiskAssessment(
  assessment: RiskAssessment,
  arbitrageCount: number = 0
): DisplayRiskAssessment {
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  if (assessment.riskScore < 0.25) riskLevel = 'LOW';
  else if (assessment.riskScore < 0.5) riskLevel = 'MEDIUM';
  else if (assessment.riskScore < 0.75) riskLevel = 'HIGH';
  else riskLevel = 'CRITICAL';

  return {
    marketId: uuidToNumericId(assessment.marketId),
    riskScore: assessment.riskScore,
    riskLevel,
    factors: assessment.factors.map(f => ({
      type: f.type,
      severity: f.severity.toUpperCase(),
      description: f.description,
    })),
    recommendation: assessment.recommendation.toUpperCase() as 'ACCEPT' | 'REVIEW' | 'REJECT',
    arbitrageOpportunities: arbitrageCount,
    smartMoneyDetected: assessment.smartMoneyDetected,
    maxExposure: assessment.maxExposure,
    timestamp: assessment.timestamp * 1000,
  };
}

/**
 * Convert ArbitrageOpportunity to display type
 */
export function toDisplayArbitrage(arb: ArbitrageOpportunity): DisplayArbitrage {
  const now = Math.floor(Date.now() / 1000);

  return {
    id: arb.id,
    profit: arb.profit,
    profitFormatted: `${arb.profit.toFixed(2)}%`,
    stakes: arb.stakes.map(s => ({
      selection: s.selectionId,
      bookmaker: s.bookmaker,
      odds: s.odds,
      stake: Math.round(s.stake * 100) / 100,
      return: Math.round(s.potentialReturn * 100) / 100,
    })),
    totalStake: arb.totalStake,
    expiresIn: Math.max(0, arb.expiresAt - now),
    confidence: arb.confidence,
  };
}

// ============================================================================
// Batch Adapters for Streaming
// ============================================================================

/**
 * Batch convert odds entries for WebSocket broadcast
 */
export function batchToDisplayEntries(
  entries: readonly EnhancedOddsEntry[],
  smartMoneyScores: Map<string, number> = new Map(),
  arbitrageSelections: Set<string> = new Set()
): DisplayOddsEntry[] {
  return entries.map(entry => toDisplayOddsEntry(
    entry,
    smartMoneyScores.get(entry.selectionId) ?? Math.floor(Math.random() * 100),
    arbitrageSelections.has(entry.selectionId)
  ));
}

/**
 * Create WebSocket message payload
 */
export interface WsMessage<T> {
  readonly type: 'ODDS_UPDATE' | 'MARKET_STATUS' | 'RISK_ALERT' | 'ARBITRAGE' | 'HEARTBEAT';
  readonly timestamp: number;
  readonly sequence: number;
  readonly payload: T;
}

let wsSequence = 0;

export function createWsMessage<T>(
  type: WsMessage<T>['type'],
  payload: T
): WsMessage<T> {
  return {
    type,
    timestamp: Date.now(),
    sequence: ++wsSequence,
    payload,
  };
}

/**
 * Create odds update WebSocket message
 */
export function createOddsUpdateMessage(entries: DisplayOddsEntry[]): WsMessage<DisplayOddsEntry[]> {
  return createWsMessage('ODDS_UPDATE', entries);
}

/**
 * Create risk alert WebSocket message
 */
export function createRiskAlertMessage(assessment: DisplayRiskAssessment): WsMessage<DisplayRiskAssessment> {
  return createWsMessage('RISK_ALERT', assessment);
}

/**
 * Create arbitrage alert WebSocket message
 */
export function createArbitrageMessage(arb: DisplayArbitrage): WsMessage<DisplayArbitrage> {
  return createWsMessage('ARBITRAGE', arb);
}

/**
 * Create heartbeat message
 */
export function createHeartbeatMessage(metrics: {
  throughput: number;
  p99Latency: number;
  activeMarkets: number;
}): WsMessage<typeof metrics> {
  return createWsMessage('HEARTBEAT', metrics);
}
