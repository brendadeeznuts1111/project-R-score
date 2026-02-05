// packages/odds-core/src/types/synthetic-validation-v2.ts - Comprehensive Zod validation for incremental synthetic arbitrage

import { z } from 'zod';
import type {
    SyntheticArbitrageV1,
    SyntheticArbitrageV2,
    SyntheticArbitrageV3,
    MarketLeg,
    SportMarket,
    RiskMetrics,
    ExecutionPlan,
    CorrelationMatrix,
    MonitoringMetrics,
    PerformanceTracking,
    Probability,
    ExpectedReturn,
    HedgeRatio,
    Correlation,
    Covariance,
    MarketPeriod,
    ExecutionStatus
} from './synthetic-arbitrage-v1';

// ===== BASE SCHEMAS =====

/**
 * Branded type schemas for mathematical precision
 */
export const ProbabilitySchema = z.number().min(0).max(1).refine(
    (val) => Number.isFinite(val),
    { message: "Probability must be a finite number between 0 and 1" }
);

export const ExpectedReturnSchema = z.number().refine(
    (val) => Number.isFinite(val),
    { message: "Expected return must be a finite number" }
);

export const HedgeRatioSchema = z.number().min(0).max(1).refine(
    (val) => Number.isFinite(val),
    { message: "Hedge ratio must be a finite number between 0 and 1" }
);

export const CorrelationSchema = z.number().min(-1).max(1).refine(
    (val) => Number.isFinite(val),
    { message: "Correlation must be a finite number between -1 and 1" }
);

export const CovarianceSchema = z.number().refine(
    (val) => Number.isFinite(val),
    { message: "Covariance must be a finite number" }
);

export const OddsSchema = z.number().refine(
    (val) => Number.isFinite(val) && Math.abs(val) <= 10000,
    { message: "Odds must be a finite number with absolute value <= 10000" }
);

// ===== MARKET SCHEMAS =====

export const SportPeriodSchema = z.enum([
    'full-game',
    'first-half',
    'second-half',
    'first-quarter',
    'second-quarter',
    'third-quarter',
    'fourth-quarter',
    'overtime'
]);

export const MarketTypeSchema = z.enum(['sport', 'crypto', 'forex', 'equity']);

export const ScoreSchema = z.object({
    home: z.number(),
    away: z.number(),
    period: z.number(),
    timeRemaining: z.number().optional()
});

export const SportMarketSchema = z.object({
    type: z.literal('sport'),
    sport: z.string(),
    gameId: z.string().uuid(),
    rotationId: z.string().regex(/^ROT_[A-Z]+_\d+$/, 'Invalid rotation ID format'),
    event: z.string(),
    period: SportPeriodSchema,
    exchange: z.string(),
    symbol: z.string(),
    timestamp: z.date(),
    isLive: z.boolean(),
    timeRemaining: z.number().optional(),
    currentScore: ScoreSchema.optional()
});

export const MarketLegSchema = z.object({
    ...SportMarketSchema.shape,
    line: z.number(),
    juice: z.number(),
    odds: OddsSchema,
    volume: z.number().optional(),
    sharp: z.boolean()
});

// ===== V1 SCHEMAS =====

export const SyntheticArbitrageV1Schema = z.object({
    id: z.string().uuid(),
    timestamp: z.date(),
    markets: z.tuple([SportMarketSchema, SportMarketSchema]),
    expectedValue: ExpectedReturnSchema,
    hedgeRatio: HedgeRatioSchema,
    confidence: ProbabilitySchema,
    correlation: CorrelationSchema,
    covariance: CovarianceSchema
});

export const SyntheticArbitrageWithOddsSchema = z.object({
    ...SyntheticArbitrageV1Schema.shape,
    markets: z.tuple([MarketLegSchema, MarketLegSchema]),
    kellyFraction: ProbabilitySchema,
    variance: z.number().min(0)
});

// ===== RISK METRICS SCHEMAS =====

export const CoreRiskMetricsSchema = z.object({
    totalExposure: z.number().min(0),
    maxDrawdown: z.number().max(0),
    var95: z.number().min(0),
    var99: z.number().min(0),
    sharpeRatio: z.number(),
    volatility: z.number().min(0),
    beta: z.number(),
    alpha: z.number()
});

export const PositionMetricsSchema = z.object({
    kellyFraction: ProbabilitySchema,
    optimalPositionSize: z.number().min(0),
    maxPositionSize: z.number().min(0),
    riskAdjustedReturn: z.number()
});

export const ExecutionRiskMetricsSchema = z.object({
    liquidityRisk: ProbabilitySchema,
    executionRisk: ProbabilitySchema,
    slippageRisk: ProbabilitySchema,
    timeDecayRisk: ProbabilitySchema
});

export const RiskMetricsSchema = z.object({
    ...CoreRiskMetricsSchema.shape,
    positionMetrics: PositionMetricsSchema,
    executionRisk: ExecutionRiskMetricsSchema,
    confidence: ProbabilitySchema
});

export const RiskLimitsSchema = z.object({
    maxTotalExposure: z.number().min(0),
    maxSinglePosition: z.number().min(0),
    maxVar95: z.number().min(0),
    maxVar99: z.number().min(0),
    maxDrawdown: z.number().max(0),
    minSharpeRatio: z.number(),
    maxLeverage: z.number().min(1)
});

// ===== V2 SCHEMAS =====

export const SyntheticArbitrageV2Schema = z.object({
    ...SyntheticArbitrageWithOddsSchema.shape,
    riskMetrics: RiskMetricsSchema,
    positionSize: z.number().min(0),
    stopLoss: z.number().max(0),
    targetProfit: z.number().min(0),
    maxLeverage: z.number().min(1)
});

// ===== EXECUTION SCHEMAS =====

export const ExecutionStatusSchema = z.enum([
    'pending',
    'analyzing',
    'approved',
    'executing',
    'partially-filled',
    'completed',
    'cancelled',
    'failed',
    'expired'
]);

export const OrderExecutionSchema = z.object({
    orderId: z.string().uuid(),
    market: MarketLegSchema,
    side: z.enum(['buy', 'sell']),
    size: z.number().min(0),
    price: z.number(),
    filledSize: z.number().min(0),
    averagePrice: z.number(),
    status: z.enum(['pending', 'partial', 'filled', 'cancelled']),
    timestamp: z.date(),
    fees: z.number().min(0),
    slippage: z.number()
});

export const RetryPolicySchema = z.object({
    maxRetries: z.number().min(0).max(10),
    retryDelay: z.number().min(0),
    backoffMultiplier: z.number().min(1),
    retryConditions: z.array(z.enum(['partial-fill', 'price-movement', 'timeout', 'liquidity-issue']))
});

export const ContingencyPlanSchema = z.object({
    trigger: z.enum(['price-movement', 'correlation-drift', 'liquidity-drop', 'timeout']),
    action: z.enum(['adjust-price', 'reduce-size', 'cancel-leg', 'full-cancel']),
    threshold: z.number(),
    parameters: z.record(z.number())
});

export const ExecutionPlanSchema = z.object({
    id: z.string().uuid(),
    status: ExecutionStatusSchema,
    orders: z.array(OrderExecutionSchema).min(2),
    totalSize: z.number().min(0),
    totalFees: z.number().min(0),
    expectedSlippage: z.number().min(0),
    executionTimeout: z.number().min(0),
    retryPolicy: RetryPolicySchema,
    contingencyPlans: z.array(ContingencyPlanSchema)
});

// ===== CORRELATION MATRIX SCHEMAS =====

export const CorrelationMatrixSchema = z.object({
    matrix: z.array(z.array(z.number().min(-1).max(1))).refine(
        (matrix) => {
            const n = matrix.length;
            if (n === 0) return false;

            // Check square matrix
            if (!matrix.every(row => row.length === n)) return false;

            // Check diagonal is 1
            for (let i = 0; i < n; i++) {
                if (Math.abs(matrix[i][i] - 1) > 0.001) return false;
            }

            // Check symmetry
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (Math.abs(matrix[i][j] - matrix[j][i]) > 0.001) return false;
                }
            }

            return true;
        },
        { message: "Invalid correlation matrix: must be square, symmetric, with diagonal elements = 1" }
    ),
    symbols: z.array(z.string()),
    timestamp: z.date(),
    sampleSize: z.number().min(1),
    timeFrame: z.string(),
    confidence: ProbabilitySchema
});

// ===== MONITORING SCHEMAS =====

export const MarketConditionsSchema = z.object({
    volatility: z.enum(['extreme', 'high', 'medium', 'low', 'very-low']),
    liquidity: z.enum(['high', 'medium', 'low', 'very-low']),
    spread: z.number().min(0),
    depth: z.number().min(0),
    momentum: z.number(),
    sentiment: z.number().min(-1).max(1)
});

export const MonitoringMetricsSchema = z.object({
    currentPnL: z.number(),
    unrealizedPnL: z.number(),
    realizedPnL: z.number(),
    totalReturn: z.number(),
    executionProgress: ProbabilitySchema,
    timeElapsed: z.number().min(0),
    timeRemaining: z.number().min(0),
    marketConditions: MarketConditionsSchema
});

export const PerformanceTrackingSchema = z.object({
    totalTrades: z.number().min(0),
    winningTrades: z.number().min(0),
    losingTrades: z.number().min(0),
    winRate: ProbabilitySchema,
    averageWin: z.number(),
    averageLoss: z.number().max(0),
    profitFactor: z.number().min(0),
    maxDrawdown: z.number().max(0),
    currentDrawdown: z.number().max(0),
    totalReturn: z.number(),
    annualizedReturn: z.number(),
    sharpeRatio: z.number(),
    sortinoRatio: z.number()
});

// ===== V3 SCHEMAS =====

export const AlertSchema = z.object({
    id: z.string().uuid(),
    type: z.enum(['risk', 'opportunity', 'execution', 'market']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    message: z.string(),
    timestamp: z.date(),
    acknowledged: z.boolean(),
    actionRequired: z.boolean()
});

export const ArbitrageHistorySchema = z.object({
    timestamp: z.date(),
    action: z.enum(['created', 'analyzed', 'approved', 'executed', 'completed', 'cancelled']),
    details: z.record(z.unknown()),
    metrics: z.record(z.unknown())
});

export const MultiMarketSyntheticArbitrageSchema = z.object({
    ...SyntheticArbitrageV2Schema.shape,
    markets: z.array(MarketLegSchema).min(3),
    correlationMatrix: CorrelationMatrixSchema,
    optimalWeights: z.array(z.number()).refine(
        (weights) => {
            const sum = weights.reduce((a, b) => a + b, 0);
            return Math.abs(sum - 1) < 0.01;
        },
        { message: "Weights must sum to 1" }
    ),
    efficientFrontier: z.array(z.object({
        expectedReturn: ExpectedReturnSchema,
        volatility: z.number().min(0),
        sharpeRatio: z.number(),
        weights: z.array(z.number()),
        portfolioId: z.string().uuid()
    })),
    diversificationRatio: z.number().min(0),
    concentrationRisk: ProbabilitySchema
});

export const SyntheticArbitrageV3Schema = z.object({
    ...MultiMarketSyntheticArbitrageSchema.shape,
    executionPlan: ExecutionPlanSchema,
    monitoring: MonitoringMetricsSchema,
    performance: PerformanceTrackingSchema,
    alerts: z.array(AlertSchema),
    history: z.array(ArbitrageHistorySchema)
});

// ===== VALIDATION FUNCTIONS =====

/**
 * Validates synthetic arbitrage V1
 */
export function validateSyntheticArbitrageV1(data: unknown): data is SyntheticArbitrageV1 {
    const result = SyntheticArbitrageV1Schema.safeParse(data);
    return result.success;
}

/**
 * Validates synthetic arbitrage V2
 */
export function validateSyntheticArbitrageV2(data: unknown): data is SyntheticArbitrageV2 {
    const result = SyntheticArbitrageV2Schema.safeParse(data);
    return result.success;
}

/**
 * Validates synthetic arbitrage V3
 */
export function validateSyntheticArbitrageV3(data: unknown): data is SyntheticArbitrageV3 {
    const result = SyntheticArbitrageV3Schema.safeParse(data);
    return result.success;
}

/**
 * Validates market leg
 */
export function validateMarketLeg(data: unknown): data is MarketLeg {
    const result = MarketLegSchema.safeParse(data);
    return result.success;
}

/**
 * Validates sport market
 */
export function validateSportMarket(data: unknown): data is SportMarket {
    const result = SportMarketSchema.safeParse(data);
    return result.success;
}

/**
 * Validates risk metrics
 */
export function validateRiskMetrics(data: unknown): data is RiskMetrics {
    const result = RiskMetricsSchema.safeParse(data);
    return result.success;
}

/**
 * Validates execution plan
 */
export function validateExecutionPlan(data: unknown): data is ExecutionPlan {
    const result = ExecutionPlanSchema.safeParse(data);
    return result.success;
}

/**
 * Validates correlation matrix
 */
export function validateCorrelationMatrix(data: unknown): data is CorrelationMatrix {
    const result = CorrelationMatrixSchema.safeParse(data);
    return result.success;
}

// ===== BUSINESS LOGIC VALIDATION =====

/**
 * Comprehensive validation with business rules
 */
export function validateSyntheticArbitrageComplete(
    data: unknown,
    version: 'v1' | 'v2' | 'v3' = 'v3'
): {
    isValid: boolean;
    version: string;
    schemaErrors: string[];
    businessErrors: string[];
    warnings: string[];
} {
    const schemaErrors: string[] = [];
    const businessErrors: string[] = [];
    const warnings: string[] = [];

    // Schema validation
    let schemaResult: any;
    switch (version) {
        case 'v1':
            schemaResult = SyntheticArbitrageV1Schema.safeParse(data);
            break;
        case 'v2':
            schemaResult = SyntheticArbitrageV2Schema.safeParse(data);
            break;
        case 'v3':
            schemaResult = SyntheticArbitrageV3Schema.safeParse(data);
            break;
    }

    if (!schemaResult.success) {
        schemaErrors.push(...schemaResult.error.issues.map(issue => issue.message));
        return {
            isValid: false,
            version,
            schemaErrors,
            businessErrors,
            warnings
        };
    }

    const arb = schemaResult.data;

    // Business logic validation
    if (arb.expectedValue <= 0.01) {
        businessErrors.push('Expected value must be greater than 1% for profitable arbitrage');
    }

    if (arb.confidence < 0.7) {
        businessErrors.push('Confidence must be at least 70% for reliable execution');
    }

    if (Math.abs(arb.correlation) > 0.95) {
        businessErrors.push('Correlation too high - markets may be duplicates');
    }

    if (arb.hedgeRatio <= 0 || arb.hedgeRatio > 0.8) {
        businessErrors.push('Hedge ratio must be between 0 and 80%');
    }

    // Market compatibility checks
    const markets = arb.markets;
    if (markets[0].symbol !== markets[1].symbol) {
        businessErrors.push('Markets must have the same symbol for synthetic arbitrage');
    }

    if (markets[0].exchange === markets[1].exchange) {
        businessErrors.push('Markets must be from different exchanges for arbitrage');
    }

    if (markets[0].period === markets[1].period) {
        businessErrors.push('Markets must have different periods for synthetic arbitrage');
    }

    // Time compatibility
    const timeDiff = Math.abs(
        markets[0].timestamp.getTime() - markets[1].timestamp.getTime()
    );
    if (timeDiff > 60000) {
        businessErrors.push('Market timestamps must be within 1 minute');
    }

    // Version-specific validation
    if (version === 'v2' || version === 'v3') {
        const v2Arb = arb as SyntheticArbitrageV2;

        if (v2Arb.riskMetrics.var95 > 0.05) {
            warnings.push('VaR95 is above 5% - consider reducing position size');
        }

        if (v2Arb.riskMetrics.sharpeRatio < 0.5) {
            warnings.push('Sharpe ratio is below 0.5 - seek higher expected value');
        }

        if (v2Arb.positionSize > v2Arb.riskMetrics.positionMetrics.maxPositionSize) {
            businessErrors.push('Position size exceeds maximum allowed');
        }
    }

    if (version === 'v3') {
        const v3Arb = arb as SyntheticArbitrageV3;

        if (v3Arb.markets.length < 3) {
            businessErrors.push('V3 arbitrage must have at least 3 markets');
        }

        if (v3Arb.executionPlan.orders.length < 2) {
            businessErrors.push('Execution plan must have at least 2 orders');
        }

        if (v3Arb.alerts.filter(alert => alert.severity === 'critical').length > 0) {
            businessErrors.push('Critical alerts must be resolved before execution');
        }
    }

    return {
        isValid: schemaErrors.length === 0 && businessErrors.length === 0,
        version,
        schemaErrors,
        businessErrors,
        warnings
    };
}

// ===== TYPE GUARDS WITH VALIDATION =====

/**
 * Type guard with validation for V1
 */
export function isSyntheticArbitrageV1WithValidation(data: unknown): data is SyntheticArbitrageV1 {
    return validateSyntheticArbitrageV1(data);
}

/**
 * Type guard with validation for V2
 */
export function isSyntheticArbitrageV2WithValidation(data: unknown): data is SyntheticArbitrageV2 {
    return validateSyntheticArbitrageV2(data);
}

/**
 * Type guard with validation for V3
 */
export function isSyntheticArbitrageV3WithValidation(data: unknown): data is SyntheticArbitrageV3 {
    return validateSyntheticArbitrageV3(data);
}

// ===== ERROR TYPES =====

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

// ===== SCHEMAS ALREADY EXPORTED AT DEFINITION =====
