// packages/odds-core/src/types/synthetic-arbitrage-v1.ts - Incremental synthetic arbitrage types (V1)

import type { GameRotationNumbers } from './rotation-numbers';

// ===== BRANDED TYPES FOR MATHEMATICAL PRECISION =====

/**
 * Branded type for probability values (0-1)
 */
export type Probability = number & { readonly __brand: 'Probability' };

/**
 * Branded type for odds values
 */
export type Odds = number & { readonly __brand: 'Odds' };

/**
 * Branded type for hedge ratios (0-1)
 */
export type HedgeRatio = number & { readonly __brand: 'HedgeRatio' };

/**
 * Branded type for expected returns
 */
export type ExpectedReturn = number & { readonly __brand: 'ExpectedReturn' };

/**
 * Branded type for correlation coefficients (-1 to 1)
 */
export type Correlation = number & { readonly __brand: 'Correlation' };

/**
 * Branded type for covariance values
 */
export type Covariance = number & { readonly __brand: 'Covariance' };

// ===== TYPE CONSTRUCTION FUNCTIONS =====

/**
 * Creates a validated probability value
 */
export function createProbability(value: number): Probability {
    if (value < 0 || value > 1 || !Number.isFinite(value)) {
        throw new Error(`Invalid probability: ${value}. Must be between 0 and 1.`);
    }
    return value as Probability;
}

/**
 * Creates a validated odds value
 */
export function createOdds(value: number): Odds {
    if (!Number.isFinite(value) || Math.abs(value) > 10000) {
        throw new Error(`Invalid odds: ${value}. Must be a finite number.`);
    }
    return value as Odds;
}

/**
 * Creates a validated hedge ratio
 */
export function createHedgeRatio(value: number): HedgeRatio {
    if (value < 0 || value > 1 || !Number.isFinite(value)) {
        throw new Error(`Invalid hedge ratio: ${value}. Must be between 0 and 1.`);
    }
    return value as HedgeRatio;
}

/**
 * Creates a validated expected return
 */
export function createExpectedReturn(value: number): ExpectedReturn {
    if (!Number.isFinite(value)) {
        throw new Error(`Invalid expected return: ${value}. Must be finite.`);
    }
    return value as ExpectedReturn;
}

/**
 * Creates a validated correlation coefficient
 */
export function createCorrelation(value: number): Correlation {
    if (value < -1 || value > 1 || !Number.isFinite(value)) {
        throw new Error(`Invalid correlation: ${value}. Must be between -1 and 1.`);
    }
    return value as Correlation;
}

/**
 * Creates a validated covariance value
 */
export function createCovariance(value: number): Covariance {
    if (!Number.isFinite(value)) {
        throw new Error(`Invalid covariance: ${value}. Must be finite.`);
    }
    return value as Covariance;
}

// ===== GENERIC MARKET TYPES =====

/**
 * Generic market period type for extensibility
 */
export type MarketPeriod<T = SportMarket> = T extends SportMarket
    ? SportPeriod
    : T extends CryptoMarket
    ? CryptoPeriod
    : T extends ForexMarket
    ? ForexPeriod
    : string;

/**
 * Sport-specific periods
 */
export type SportPeriod =
    | 'full-game'
    | 'first-half'
    | 'second-half'
    | 'first-quarter'
    | 'second-quarter'
    | 'third-quarter'
    | 'fourth-quarter'
    | 'overtime';

/**
 * Crypto-specific periods
 */
export type CryptoPeriod =
    | 'spot'
    | 'perpetual'
    | 'futures-1h'
    | 'futures-4h'
    | 'futures-1d';

/**
 * Forex-specific periods
 */
export type ForexPeriod =
    | 'spot'
    | 'forward-1w'
    | 'forward-1m'
    | 'forward-3m';

/**
 * Market type discriminator for extensibility
 */
export type MarketType = 'sport' | 'crypto' | 'forex' | 'equity';

/**
 * Generic market interface
 */
export interface Market<T = SportMarket> {
    readonly type: MarketType;
    readonly period: MarketPeriod<T>;
    readonly exchange: string;
    readonly symbol: string;
    readonly timestamp: Date;
}

/**
 * Sport market interface with comprehensive rotation number support
 */
export interface SportMarket extends Market<SportMarket> {
    readonly type: 'sport';
    readonly sport: string;
    readonly gameId: string;
    readonly rotationId: string; // Critical for order execution
    readonly rotationNumber: number; // Numeric rotation ID
    readonly gameRotationNumbers: GameRotationNumbers; // Full game rotation data
    readonly specificRotation: {
        readonly rotationId: number;
        readonly marketType: 'moneyline' | 'spread' | 'total' | 'prop';
        readonly side: 'home' | 'away' | 'over' | 'under';
        readonly line?: number;
    };
    readonly event: string;
    readonly isLive: boolean;
    readonly timeRemaining?: number; // seconds
    readonly currentScore?: Score;
}

/**
 * Score interface for live sports data
 */
export interface Score {
    readonly home: number;
    readonly away: number;
    readonly period: number;
    readonly timeRemaining?: number;
}

/**
 * Crypto market interface (for future expansion)
 */
export interface CryptoMarket extends Market<CryptoMarket> {
    readonly type: 'crypto';
    readonly baseAsset: string;
    readonly quoteAsset: string;
    readonly contractType: 'spot' | 'perpetual' | 'futures';
}

/**
 * Forex market interface (for future expansion)
 */
export interface ForexMarket extends Market<ForexMarket> {
    readonly type: 'forex';
    readonly baseCurrency: string;
    readonly quoteCurrency: string;
    readonly settlementDate?: Date;
}

// ===== V1: CORE SYNTHETIC ARBITRAGE =====

/**
 * Core synthetic arbitrage interface (V1)
 * Focused on essential functionality for MVP
 */
export interface SyntheticArbitrageV1<T = SportMarket> {
    readonly id: string;
    readonly timestamp: Date;
    readonly markets: readonly [Market<T>, Market<T>]; // Exactly 2 markets
    readonly expectedValue: ExpectedReturn;
    readonly hedgeRatio: HedgeRatio;
    readonly confidence: Probability;
    readonly correlation: Correlation;
    readonly covariance: Covariance;
}

/**
 * Market leg with odds data
 */
export interface MarketLeg<T = SportMarket> extends Market<T> {
    readonly line: number;
    readonly juice: number;
    readonly odds: Odds;
    readonly volume?: number;
    readonly sharp: boolean;
}

/**
 * Enhanced synthetic arbitrage with odds data
 */
export interface SyntheticArbitrageWithOdds<T = SportMarket> extends SyntheticArbitrageV1<T> {
    readonly markets: readonly [MarketLeg<T>, MarketLeg<T>];
    readonly kellyFraction: Probability; // Position sizing
    readonly variance: number; // Portfolio variance
}

// ===== V1 FACTORY FUNCTIONS =====

/**
 * Creates a synthetic arbitrage opportunity (V1)
 */
export function createSyntheticArbitrageV1<T = SportMarket>(
    id: string,
    market1: Market<T>,
    market2: Market<T>,
    expectedValue: number,
    hedgeRatio: number,
    confidence: number,
    correlation: number,
    covariance: number
): SyntheticArbitrageV1<T> {
    return {
        id,
        timestamp: new Date(),
        markets: [market1, market2] as const,
        expectedValue: createExpectedReturn(expectedValue),
        hedgeRatio: createHedgeRatio(hedgeRatio),
        confidence: createProbability(confidence),
        correlation: createCorrelation(correlation),
        covariance: createCovariance(covariance)
    };
}

/**
 * Creates a sport market
 */
export function createSportMarket(
    sport: string,
    gameId: string,
    rotationId: string,
    event: string,
    period: SportPeriod,
    exchange: string,
    symbol: string,
    isLive: boolean = false
): SportMarket {
    return {
        type: 'sport',
        period,
        exchange,
        symbol,
        timestamp: new Date(),
        sport,
        gameId,
        rotationId,
        event,
        isLive
    };
}

/**
 * Creates a market leg with odds
 */
export function createMarketLeg<T = SportMarket>(
    market: Market<T>,
    line: number,
    juice: number,
    odds: number,
    volume?: number,
    sharp: boolean = false
): MarketLeg<T> {
    return {
        ...market,
        line,
        juice,
        odds: createOdds(odds),
        volume,
        sharp
    };
}

/**
 * Creates a synthetic arbitrage with odds data
 */
export function createSyntheticArbitrageWithOdds<T = SportMarket>(
    id: string,
    market1: MarketLeg<T>,
    market2: MarketLeg<T>,
    expectedValue: number,
    hedgeRatio: number,
    confidence: number,
    correlation: number,
    covariance: number,
    kellyFraction: number,
    variance: number
): SyntheticArbitrageWithOdds<T> {
    return {
        id,
        timestamp: new Date(),
        markets: [market1, market2] as const,
        expectedValue: createExpectedReturn(expectedValue),
        hedgeRatio: createHedgeRatio(hedgeRatio),
        confidence: createProbability(confidence),
        correlation: createCorrelation(correlation),
        covariance: createCovariance(covariance),
        kellyFraction: createProbability(kellyFraction),
        variance
    };
}

// ===== V1 TYPE GUARDS =====

/**
 * Type guard for synthetic arbitrage V1
 */
export function isSyntheticArbitrageV1<T = SportMarket>(
    obj: unknown
): obj is SyntheticArbitrageV1<T> {
    return typeof obj === 'object' && obj !== null &&
        'id' in obj && typeof obj.id === 'string' &&
        'markets' in obj && Array.isArray(obj.markets) && obj.markets.length === 2 &&
        'expectedValue' in obj && typeof obj.expectedValue === 'number' &&
        'hedgeRatio' in obj && typeof obj.hedgeRatio === 'number' &&
        'confidence' in obj && typeof obj.confidence === 'number' &&
        'correlation' in obj && typeof obj.correlation === 'number' &&
        'covariance' in obj && typeof obj.covariance === 'number' &&
        'timestamp' in obj && obj.timestamp instanceof Date;
}

/**
 * Type guard for sport market
 */
export function isSportMarket(obj: unknown): obj is SportMarket {
    return typeof obj === 'object' && obj !== null &&
        'type' in obj && obj.type === 'sport' &&
        'sport' in obj && typeof obj.sport === 'string' &&
        'gameId' in obj && typeof obj.gameId === 'string' &&
        'rotationId' in obj && typeof obj.rotationId === 'string' &&
        'period' in obj && typeof obj.period === 'string' &&
        'exchange' in obj && typeof obj.exchange === 'string';
}

/**
 * Type guard for market leg
 */
export function isMarketLeg<T = SportMarket>(obj: unknown): obj is MarketLeg<T> {
    return typeof obj === 'object' && obj !== null &&
        'line' in obj && typeof obj.line === 'number' &&
        'juice' in obj && typeof obj.juice === 'number' &&
        'odds' in obj && typeof obj.odds === 'number' &&
        'sharp' in obj && typeof obj.sharp === 'boolean' &&
        isSportMarket(obj); // For V1, we focus on sport markets
}

// ===== V1 VALIDATION FUNCTIONS =====

/**
 * Validates a synthetic arbitrage opportunity meets minimum criteria
 */
export function validateSyntheticArbitrageV1<T = SportMarket>(
    arb: SyntheticArbitrageV1<T>
): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (arb.expectedValue <= 0) {
        errors.push('Expected value must be positive');
    }

    if (arb.confidence < 0.5) {
        errors.push('Confidence must be at least 50%');
    }

    if (Math.abs(arb.correlation) > 0.95) {
        errors.push('Correlation too high - markets may be identical');
    }

    if (arb.hedgeRatio <= 0 || arb.hedgeRatio > 1) {
        errors.push('Hedge ratio must be between 0 and 1');
    }

    // Market compatibility
    if (arb.markets[0].timestamp.getTime() - arb.markets[1].timestamp.getTime() > 60000) {
        errors.push('Market timestamps must be within 1 minute');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validates market compatibility for synthetic arbitrage
 */
export function validateMarketCompatibility<T = SportMarket>(
    market1: Market<T>,
    market2: Market<T>
): { isCompatible: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Same symbol/game required for synthetic arbitrage
    if (market1.symbol !== market2.symbol) {
        reasons.push('Markets must have same symbol');
    }

    // Different exchanges required for arbitrage
    if (market1.exchange === market2.exchange) {
        reasons.push('Markets must be from different exchanges');
    }

    // Different periods required for synthetic arbitrage
    if (market1.period === market2.period) {
        reasons.push('Markets must have different periods');
    }

    // Time compatibility
    const timeDiff = Math.abs(market1.timestamp.getTime() - market2.timestamp.getTime());
    if (timeDiff > 60000) { // 1 minute
        reasons.push('Markets must be within 1 minute of each other');
    }

    return {
        isCompatible: reasons.length === 0,
        reasons
    };
}

// ===== V1 UTILITY FUNCTIONS =====

/**
 * Gets the market type from a market object
 */
export function getMarketType<T = SportMarket>(market: Market<T>): MarketType {
    return market.type;
}

/**
 * Checks if a market is live
 */
export function isLiveMarket<T = SportMarket>(market: Market<T>): boolean {
    return market.type === 'sport' && (market as SportMarket).isLive;
}

/**
 * Gets the time remaining for a sport market
 */
export function getTimeRemaining<T = SportMarket>(market: Market<T>): number | undefined {
    return market.type === 'sport' ? (market as SportMarket).timeRemaining : undefined;
}

/**
 * Formats a synthetic arbitrage for display
 */
export function formatSyntheticArbitrageV1<T = SportMarket>(
    arb: SyntheticArbitrageV1<T>
): string {
    return [
        `Synthetic Arbitrage ${arb.id}`,
        `Markets: ${arb.markets[0].symbol} (${arb.markets[0].period}) vs ${arb.markets[1].symbol} (${arb.markets[1].period})`,
        `Expected Value: ${(arb.expectedValue * 100).toFixed(2)}%`,
        `Hedge Ratio: ${(arb.hedgeRatio * 100).toFixed(1)}%`,
        `Confidence: ${(arb.confidence * 100).toFixed(1)}%`,
        `Correlation: ${arb.correlation.toFixed(3)}`
    ].join('\n');
}
