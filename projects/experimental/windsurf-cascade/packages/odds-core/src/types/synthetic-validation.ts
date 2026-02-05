// packages/odds-core/src/types/synthetic-validation.ts - Validation schemas for synthetic arbitrage

import { z } from 'zod';
import type {
    SyntheticArbitrage,
    MarketLeg,
    SyntheticPosition,
    SyntheticRiskMetrics,
    ExecutionDetails,
    EnhancedOddsTick,
    MarketPeriod,
    ExecutionStatus,
    SignalType,
    VolatilityLevel,
    LiquidityLevel
} from './synthetic-arbitrage';
import type { EnhancedOddsTick as EnhancedTick } from './enhanced-odds';

// Zod schemas for runtime validation
export const MarketPeriodSchema = z.enum([
    'full-game',
    'first-half',
    'second-half',
    'first-quarter',
    'second-quarter',
    'third-quarter',
    'fourth-quarter',
    'overtime'
]);

export const ExecutionStatusSchema = z.enum([
    'pending',
    'executing',
    'partially-filled',
    'completed',
    'cancelled',
    'failed'
]);

export const SignalTypeSchema = z.enum([
    'synthetic-arbitrage',
    'cross-market',
    'period-convergence',
    'live-vs-pre-game',
    'multi-leg-opportunity'
]);

export const VolatilityLevelSchema = z.enum(['extreme', 'high', 'medium', 'low', 'very-low']);
export const LiquidityLevelSchema = z.enum(['high', 'medium', 'low', 'very-low']);

export const ScoreSchema = z.object({
    home: z.number(),
    away: z.number(),
    period: z.number(),
    timeRemaining: z.number().optional()
});

export const MarketLegSchema = z.object({
    id: z.string().uuid(),
    marketType: MarketPeriodSchema,
    exchange: z.string(),
    line: z.number(),
    odds: z.number(),
    juice: z.number(),
    isLive: z.boolean(),
    timeRemaining: z.number().optional(),
    currentScore: ScoreSchema.optional(),
    volume: z.number().optional(),
    sharp: z.boolean()
});

export const SyntheticPositionSchema = z.object({
    expectedContribution: z.number(),
    hedgeRatio: z.number().min(0).max(1),
    kellyFraction: z.number().min(0).max(1),
    expectedValue: z.number(),
    confidence: z.number().min(0).max(1),
    correlation: z.number().min(-1).max(1),
    covariance: z.number(),
    variance: z.number().min(0)
});

export const SyntheticRiskMetricsSchema = z.object({
    totalExposure: z.number().min(0),
    maxDrawdown: z.number().max(0),
    var95: z.number(),
    var99: z.number(),
    sharpeRatio: z.number(),
    profitFactor: z.number().min(0),
    beta: z.number(),
    alpha: z.number(),
    volatility: z.number().min(0),
    liquidityRisk: z.number().min(0).max(1),
    executionRisk: z.number().min(0).max(1)
});

export const ExecutionDetailsSchema = z.object({
    status: ExecutionStatusSchema,
    entryTime: z.date(),
    expiryTime: z.date(),
    targetProfit: z.number(),
    stopLoss: z.number(),
    trailingStop: z.number().optional(),
    partialExitPoints: z.array(z.number()).optional(),
    rebalanceTriggers: z.array(z.object({
        condition: z.enum(['price-movement', 'correlation-drift', 'volatility-spike', 'liquidity-drop', 'time-decay']),
        threshold: z.number(),
        action: z.enum(['adjust-hedge-ratio', 'partial-exit', 'full-exit', 'add-position', 'reverse-position'])
    })).optional()
});

export const SyntheticArbitrageSchema = z.object({
    id: z.string().uuid(),
    gameId: z.string().uuid(),
    sport: z.string(),
    timestamp: z.date(),
    primaryMarket: MarketLegSchema,
    secondaryMarket: MarketLegSchema,
    syntheticPosition: SyntheticPositionSchema,
    riskMetrics: SyntheticRiskMetricsSchema,
    execution: ExecutionDetailsSchema
});

export const EnhancedOddsTickSchema = z.object({
    id: z.string().uuid(),
    sport: z.string(),
    gameId: z.string().uuid(),
    event: z.string(),
    timestamp: z.date(),
    marketType: MarketPeriodSchema,
    exchange: z.string(),
    bookmaker: z.string(),
    isLive: z.boolean(),
    line: z.number(),
    juice: z.number(),
    odds: z.object({
        home: z.number(),
        away: z.number(),
        draw: z.number().optional()
    }),
    timeRemaining: z.number().optional(),
    currentScore: ScoreSchema.optional(),
    periodProgress: z.number().min(0).max(1).optional(),
    gameProgress: z.number().min(0).max(1).optional(),
    volume: z.number().optional(),
    liquidity: LiquidityLevelSchema,
    volatility: VolatilityLevelSchema,
    sharp: z.boolean(),
    confidence: z.number().min(0).max(1),
    openingLine: z.number().optional(),
    lineMovement: z.number(),
    priceHistory: z.array(z.object({
        timestamp: z.date(),
        line: z.number(),
        juice: z.number(),
        volume: z.number().optional(),
        sharp: z.boolean()
    })).optional(),
    weatherImpact: z.number().min(-1).max(1).optional(),
    injuryImpact: z.number().min(-1).max(1).optional(),
    sentimentScore: z.number().min(-1).max(1).optional(),
    lastUpdated: z.date(),
    source: z.string(),
    reliability: z.number().min(0).max(1)
});

// Validation functions
export function validateMarketLeg(data: unknown): data is MarketLeg {
    const result = MarketLegSchema.safeParse(data);
    return result.success;
}

export function validateSyntheticArbitrage(data: unknown): data is SyntheticArbitrage {
    const result = SyntheticArbitrageSchema.safeParse(data);
    return result.success;
}

export function validateEnhancedOddsTick(data: unknown): data is EnhancedOddsTick {
    const result = EnhancedOddsTickSchema.safeParse(data);
    return result.success;
}

export function validateMarketPeriod(data: unknown): data is MarketPeriod {
    const result = MarketPeriodSchema.safeParse(data);
    return result.success;
}

export function validateExecutionStatus(data: unknown): data is ExecutionStatus {
    const result = ExecutionStatusSchema.safeParse(data);
    return result.success;
}

// Business logic validation functions
export function isValidSyntheticArbitrageOpportunity(arb: SyntheticArbitrage): boolean {
    return (
        arb.syntheticPosition.expectedValue > 0.01 && // 1% minimum threshold
        arb.syntheticPosition.confidence > 0.7 && // 70% minimum confidence
        arb.riskMetrics.var95 < 0.05 && // 5% maximum VaR
        Math.abs(arb.syntheticPosition.correlation) < 0.95 && // Avoid perfect correlation
        arb.syntheticPosition.hedgeRatio > 0 && arb.syntheticPosition.hedgeRatio <= 1 &&
        arb.syntheticPosition.kellyFraction > 0 && arb.syntheticPosition.kellyFraction <= 0.25 // Max 25% Kelly
    );
}

export function isValidMarketLegPair(primary: MarketLeg, secondary: MarketLeg): boolean {
    return (
        primary.gameId === secondary.gameId &&
        primary.sport === secondary.sport &&
        primary.marketType !== secondary.marketType && // Different periods
        primary.exchange !== secondary.exchange && // Different exchanges
        Math.abs(primary.timestamp.getTime() - secondary.timestamp.getTime()) < 60000 // Within 1 minute
    );
}

export function hasSufficientLiquidity(leg: MarketLeg, minLiquidity: number = 1000): boolean {
    return (leg.volume || 0) >= minLiquidity;
}

export function isWithinRiskLimits(arb: SyntheticArbitrage, limits: {
    maxExposure: number;
    maxVar95: number;
    maxDrawdown: number;
}): boolean {
    return (
        arb.riskMetrics.totalExposure <= limits.maxExposure &&
        arb.riskMetrics.var95 <= limits.maxVar95 &&
        arb.riskMetrics.maxDrawdown >= limits.maxDrawdown
    );
}

export function isProfitableSyntheticArbitrage(arb: SyntheticArbitrage): boolean {
    return (
        arb.syntheticPosition.expectedValue > 0 &&
        arb.syntheticPosition.kellyFraction > 0 &&
        arb.riskMetrics.sharpeRatio > 0.5 // Minimum Sharpe ratio
    );
}

export function isValidHedgeRatio(hedgeRatio: number): boolean {
    return hedgeRatio >= 0 && hedgeRatio <= 1;
}

export function isValidKellyFraction(kellyFraction: number): boolean {
    return kellyFraction >= 0 && kellyFraction <= 0.25; // Conservative Kelly limit
}

export function isValidCorrelation(correlation: number): boolean {
    return correlation >= -1 && correlation <= 1;
}

export function hasValidTimeWindow(arb: SyntheticArbitrage, minTimeWindow: number = 300): boolean {
    const timeToExpiry = arb.execution.expiryTime.getTime() - Date.now();
    return timeToExpiry >= minTimeWindow * 1000; // Convert to milliseconds
}

export function isLiveMarketCompatible(leg1: MarketLeg, leg2: MarketLeg): boolean {
    // One should be live, one should be pre-game for optimal arbitrage
    return (leg1.isLive && !leg2.isLive) || (!leg1.isLive && leg2.isLive);
}

export function hasValidPriceHistory(tick: EnhancedOddsTick, minHistoryPoints: number = 10): boolean {
    return tick.priceHistory !== undefined && tick.priceHistory.length >= minHistoryPoints;
}

export function isReliableData(tick: EnhancedOddsTick, minReliability: number = 0.8): boolean {
    return tick.reliability >= minReliability;
}

// Error types for validation failures
export class ValidationError extends Error {
    constructor(
        message: string,
        public field: string,
        public value: unknown,
        public expectedType: string
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class BusinessLogicError extends Error {
    constructor(
        message: string,
        public rule: string,
        public data: unknown
    ) {
        super(message);
        this.name = 'BusinessLogicError';
    }
}

// Validation result type
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: string[];
}

export function validateSyntheticArbitrageComplete(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Schema validation
    const schemaResult = SyntheticArbitrageSchema.safeParse(data);
    if (!schemaResult.success) {
        schemaResult.error.issues.forEach(issue => {
            errors.push(new ValidationError(
                `Schema validation failed: ${issue.message}`,
                issue.path.join('.'),
                issue.received,
                issue.expected || 'unknown'
            ));
        });
        return { isValid: false, errors, warnings };
    }

    const arb = schemaResult.data as SyntheticArbitrage;

    // Business logic validation
    if (!isValidSyntheticArbitrageOpportunity(arb)) {
        errors.push(new BusinessLogicError(
            'Synthetic arbitrage does not meet opportunity criteria',
            'opportunity-validation',
            arb
        ));
    }

    if (!isValidMarketLegPair(arb.primaryMarket, arb.secondaryMarket)) {
        errors.push(new BusinessLogicError(
            'Market legs are not compatible for arbitrage',
            'leg-compatibility',
            { primary: arb.primaryMarket, secondary: arb.secondaryMarket }
        ));
    }

    if (!hasSufficientLiquidity(arb.primaryMarket) || !hasSufficientLiquidity(arb.secondaryMarket)) {
        warnings.push('One or both markets have insufficient liquidity');
    }

    if (!hasValidTimeWindow(arb)) {
        warnings.push('Limited time window for execution');
    }

    if (!isLiveMarketCompatible(arb.primaryMarket, arb.secondaryMarket)) {
        warnings.push('Both markets are live or both are pre-game - may reduce arbitrage opportunity');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

// Type guards with validation
export function isSyntheticArbitrage(data: unknown): data is SyntheticArbitrage {
    return validateSyntheticArbitrageComplete(data).isValid;
}

export function isMarketLeg(data: unknown): data is MarketLeg {
    return validateMarketLeg(data);
}

export function isEnhancedOddsTickWithValidation(data: unknown): data is EnhancedOddsTick {
    return validateEnhancedOddsTick(data);
}
