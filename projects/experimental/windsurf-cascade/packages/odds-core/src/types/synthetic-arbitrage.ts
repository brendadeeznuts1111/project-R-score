// packages/odds-core/src/types/synthetic-arbitrage.ts - Synthetic arbitrage type definitions

export interface SyntheticArbitrage {
    id: string;
    gameId: string;
    sport: string;
    timestamp: Date;

    // Component markets
    primaryMarket: MarketLeg;
    secondaryMarket: MarketLeg;

    // Calculated synthetic position
    syntheticPosition: SyntheticPosition;

    // Risk metrics
    riskMetrics: SyntheticRiskMetrics;

    // Execution details
    execution: ExecutionDetails;
}

export interface MarketLeg {
    id: string;
    marketType: MarketPeriod;
    exchange: string;
    line: number;
    odds: number;
    juice: number;
    isLive: boolean;
    timeRemaining?: number; // seconds
    currentScore?: Score;
    volume?: number;
    sharp: boolean;
}

export interface SyntheticPosition {
    expectedContribution: number; // How much primary market contributes to secondary
    hedgeRatio: number; // Optimal hedge ratio based on covariance
    kellyFraction: number; // Position sizing recommendation
    expectedValue: number; // Expected return
    confidence: number; // Confidence in the arbitrage (0-1)
    correlation: number; // Historical correlation between markets
    covariance: number; // Covariance between markets
    variance: number; // Portfolio variance
}

export interface SyntheticRiskMetrics {
    totalExposure: number;
    maxDrawdown: number;
    var95: number; // Value at Risk 95%
    var99: number; // Value at Risk 99%
    sharpeRatio: number;
    profitFactor: number;
    beta: number; // Market beta
    alpha: number; // Risk-adjusted alpha
    volatility: number;
    liquidityRisk: number;
    executionRisk: number;
}

export interface ExecutionDetails {
    status: ExecutionStatus;
    entryTime: Date;
    expiryTime: Date;
    targetProfit: number;
    stopLoss: number;
    trailingStop?: number;
    partialExitPoints?: number[];
    rebalanceTriggers?: RebalanceTrigger[];
}

export interface RebalanceTrigger {
    condition: RebalanceCondition;
    threshold: number;
    action: RebalanceAction;
}

export interface Score {
    home: number;
    away: number;
    period: number;
    timeRemaining?: number;
}

export interface CorrelationMatrix {
    matrix: number[][];
    symbols: string[];
    timestamp: Date;
    sampleSize: number;
    timeFrame: string;
}

export interface CovarianceAnalysis {
    covariance: number;
    correlation: number;
    beta: number;
    rSquared: number;
    pValue: number;
    confidenceInterval: [number, number];
    sampleSize: number;
    timeFrame: string;
}

export interface SyntheticArbitrageOpportunity {
    id: string;
    gameId: string;
    sport: string;
    primaryMarket: MarketLeg;
    secondaryMarket: MarketLeg;
    expectedValue: number;
    confidence: number;
    riskAdjustedReturn: number;
    maxPositionSize: number;
    minProfitThreshold: number;
    timeWindow: number; // seconds until opportunity expires
}

export interface MultiLegSyntheticArbitrage extends SyntheticArbitrage {
    legs: MarketLeg[]; // More than 2 markets
    correlationMatrix: CorrelationMatrix;
    optimalWeights: number[]; // Optimal allocation across all legs
    efficientFrontier: EfficientFrontierPoint[];
}

export interface EfficientFrontierPoint {
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
    weights: number[];
    portfolioId: string;
}

export interface SyntheticArbitrageConfig {
    minExpectedValue: number;
    minConfidence: number;
    maxPositionSize: number;
    maxCorrelation: number;
    minLiquidity: number;
    riskLimits: RiskLimits;
    executionParams: ExecutionParams;
}

export interface RiskLimits {
    maxTotalExposure: number;
    maxSingleSportExposure: number;
    maxDrawdownThreshold: number;
    var95Limit: number;
    var99Limit: number;
    maxLeverage: number;
}

export interface ExecutionParams {
    maxSlippage: number;
    minFillRatio: number;
    executionTimeout: number;
    partialExitEnabled: boolean;
    rebalanceEnabled: boolean;
    trailingStopEnabled: boolean;
}

export interface SyntheticArbitrageResult {
    id: string;
    success: boolean;
    entryPrice: number;
    exitPrice?: number;
    realizedPnL?: number;
    unrealizedPnL: number;
    executionTime: number;
    fees: number;
    slippage: number;
    exitReason?: ExitReason;
    performanceMetrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
}

export interface HistoricalSyntheticData {
    gameId: string;
    sport: string;
    timestamp: Date;
    primaryMarket: MarketLeg;
    secondaryMarket: MarketLeg;
    actualOutcome: ActualOutcome;
    predictedOutcome: PredictedOutcome;
    accuracy: number;
}

export interface ActualOutcome {
    primaryResult: number;
    secondaryResult: number;
    correlationActual: number;
    profit: number;
    duration: number;
}

export interface PredictedOutcome {
    expectedValue: number;
    predictedCorrelation: number;
    confidence: number;
    hedgeRatio: number;
}

export interface SyntheticArbitrageSignal {
    id: string;
    type: SignalType;
    gameId: string;
    sport: string;
    strength: number; // 0-1
    confidence: number; // 0-1
    expectedValue: number;
    riskReward: number;
    timeToExpiry: number;
    marketConditions: MarketConditions;
    triggers: string[];
}

export interface MarketConditions {
    volatility: VolatilityLevel;
    liquidity: LiquidityLevel;
    marketSession: MarketSession;
    weatherImpact?: number;
    injuryImpact?: number;
    sentimentScore?: number;
}

export interface PortfolioOptimization {
    portfolioId: string;
    opportunities: SyntheticArbitrageOpportunity[];
    optimalWeights: number[];
    expectedPortfolioReturn: number;
    portfolioVolatility: number;
    portfolioSharpeRatio: number;
    constraints: OptimizationConstraints;
}

export interface OptimizationConstraints {
    maxWeights: number[];
    minWeights: number[];
    maxPositions: number;
    minDiversification: number;
    sectorLimits: Map<string, number>;
    correlationLimits: CorrelationLimits;
}

export interface CorrelationLimits {
    maxAverageCorrelation: number;
    maxPairwiseCorrelation: number;
    minDiversificationBenefit: number;
}

// Enums and unions
export type MarketPeriod =
    | 'full-game'
    | 'first-half'
    | 'second-half'
    | 'first-quarter'
    | 'second-quarter'
    | 'third-quarter'
    | 'fourth-quarter'
    | 'overtime';

export type ExecutionStatus =
    | 'pending'
    | 'executing'
    | 'partially-filled'
    | 'completed'
    | 'cancelled'
    | 'failed';

export type ExitReason =
    | 'profit-target'
    | 'stop-loss'
    | 'time-expiry'
    | 'manual'
    | 'market-closed'
    | 'liquidity-exhausted'
    | 'correlation-drift';

export type SignalType =
    | 'synthetic-arbitrage'
    | 'cross-market'
    | 'period-convergence'
    | 'live-vs-pre-game'
    | 'multi-leg-opportunity';

export type VolatilityLevel = 'extreme' | 'high' | 'medium' | 'low' | 'very-low';
export type LiquidityLevel = 'high' | 'medium' | 'low' | 'very-low';
export type MarketSession = 'pre-market' | 'regular' | 'after-hours' | 'closed' | 'weekend' | 'holiday';

export type RebalanceCondition =
    | 'price-movement'
    | 'correlation-drift'
    | 'volatility-spike'
    | 'liquidity-drop'
    | 'time-decay';

export type RebalanceAction =
    | 'adjust-hedge-ratio'
    | 'partial-exit'
    | 'full-exit'
    | 'add-position'
    | 'reverse-position';

// Helper types for calculations
export interface CovarianceMatrixInput {
    returns: number[][];
    symbols: string[];
    timeFrame: string;
}

export interface HedgeCalculationInput {
    primaryReturns: number[];
    secondaryReturns: number[];
    primaryVolatility: number;
    secondaryVolatility: number;
    riskFreeRate: number;
}

export interface KellyCalculationInput {
    expectedReturn: number;
    variance: number;
    riskFreeRate: number;
    maxLeverage: number;
}

export interface CorrelationAnalysisInput {
    series1: number[];
    series2: number[];
    timeFrame: string;
    confidenceLevel: number;
}

// Type guards and validators
export function isValidSyntheticArbitrage(arb: any): arb is SyntheticArbitrage {
    return arb &&
        typeof arb.id === 'string' &&
        typeof arb.gameId === 'string' &&
        typeof arb.sport === 'string' &&
        arb.primaryMarket &&
        arb.secondaryMarket &&
        arb.syntheticPosition &&
        arb.riskMetrics &&
        arb.execution;
}

export function isValidMarketLeg(leg: any): leg is MarketLeg {
    return leg &&
        typeof leg.id === 'string' &&
        typeof leg.marketType === 'string' &&
        typeof leg.exchange === 'string' &&
        typeof leg.line === 'number' &&
        typeof leg.odds === 'number' &&
        typeof leg.juice === 'number' &&
        typeof leg.isLive === 'boolean';
}

export function isProfitableSyntheticArbitrage(arb: SyntheticArbitrage): boolean {
    return arb.syntheticPosition.expectedValue > 0.01 && // 1% minimum threshold
        arb.syntheticPosition.confidence > 0.7 && // 70% minimum confidence
        arb.riskMetrics.var95 < 0.05; // 5% maximum VaR
}

// Factory functions for creating instances
export function createSyntheticArbitrage(
    gameId: string,
    sport: string,
    primaryMarket: MarketLeg,
    secondaryMarket: MarketLeg
): SyntheticArbitrage {
    return {
        id: `synthetic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        gameId,
        sport,
        timestamp: new Date(),
        primaryMarket,
        secondaryMarket,
        syntheticPosition: {
            expectedContribution: 0,
            hedgeRatio: 0,
            kellyFraction: 0,
            expectedValue: 0,
            confidence: 0,
            correlation: 0,
            covariance: 0,
            variance: 0
        },
        riskMetrics: {
            totalExposure: 0,
            maxDrawdown: 0,
            var95: 0,
            var99: 0,
            sharpeRatio: 0,
            profitFactor: 0,
            beta: 0,
            alpha: 0,
            volatility: 0,
            liquidityRisk: 0,
            executionRisk: 0
        },
        execution: {
            status: 'pending',
            entryTime: new Date(),
            expiryTime: new Date(Date.now() + 3600000), // 1 hour expiry
            targetProfit: 0,
            stopLoss: 0
        }
    };
}

export function createMarketLeg(
    id: string,
    marketType: MarketPeriod,
    exchange: string,
    line: number,
    odds: number,
    juice: number,
    isLive: boolean = false
): MarketLeg {
    return {
        id,
        marketType,
        exchange,
        line,
        odds,
        juice,
        isLive,
        sharp: false
    };
}
