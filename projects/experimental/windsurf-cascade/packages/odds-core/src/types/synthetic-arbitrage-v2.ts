// packages/odds-core/src/types/synthetic-arbitrage-v2.ts - Synthetic arbitrage with risk management (V2)

import type {
    SyntheticArbitrageWithOdds,
    MarketLeg,
    Probability,
    ExpectedReturn,
    HedgeRatio,
    Correlation,
    Covariance
} from './synthetic-arbitrage-v1';

// ===== RISK METRICS TYPES =====

/**
 * Core risk metrics for synthetic arbitrage
 */
export interface CoreRiskMetrics {
    readonly totalExposure: number; // Total position size
    readonly maxDrawdown: number; // Maximum expected loss
    readonly var95: number; // Value at Risk 95%
    readonly var99: number; // Value at Risk 99%
    readonly sharpeRatio: number; // Risk-adjusted return
    readonly volatility: number; // Portfolio volatility
    readonly beta: number; // Market beta
    readonly alpha: number; // Risk-adjusted alpha
}

/**
 * Position sizing metrics
 */
export interface PositionMetrics {
    readonly kellyFraction: Probability; // Kelly criterion position size
    readonly optimalPositionSize: number; // Recommended position size
    readonly maxPositionSize: number; // Maximum allowed position
    readonly riskAdjustedReturn: number; // Return per unit of risk
}

/**
 * Execution risk metrics
 */
export interface ExecutionRiskMetrics {
    readonly liquidityRisk: Probability; // Risk of insufficient liquidity
    readonly executionRisk: Probability; // Risk of execution failure
    readonly slippageRisk: Probability; // Risk of price slippage
    readonly timeDecayRisk: Probability; // Risk of opportunity decay
}

/**
 * Comprehensive risk metrics (V2)
 */
export interface RiskMetrics extends CoreRiskMetrics {
    readonly positionMetrics: PositionMetrics;
    readonly executionRisk: ExecutionRiskMetrics;
    readonly confidence: Probability; // Overall confidence in risk assessment
}

// ===== V2 SYNTHETIC ARBITRAGE =====

/**
 * Synthetic arbitrage with comprehensive risk management (V2)
 */
export interface SyntheticArbitrageV2<T = SportMarket> extends SyntheticArbitrageWithOdds<T> {
    readonly riskMetrics: RiskMetrics;
    readonly positionSize: number;
    readonly stopLoss: number;
    readonly targetProfit: number;
    readonly maxLeverage: number;
}

/**
 * Risk limits configuration
 */
export interface RiskLimits {
    readonly maxTotalExposure: number;
    readonly maxSinglePosition: number;
    readonly maxVar95: number;
    readonly maxVar99: number;
    readonly maxDrawdown: number;
    readonly minSharpeRatio: number;
    readonly maxLeverage: number;
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
    readonly isAcceptable: boolean;
    readonly riskScore: Probability; // 0 = low risk, 1 = high risk
    readonly riskFactors: string[];
    readonly recommendations: string[];
    readonly limits: RiskLimits;
}

// ===== V2 FACTORY FUNCTIONS =====

/**
 * Creates core risk metrics
 */
export function createCoreRiskMetrics(
    totalExposure: number,
    maxDrawdown: number,
    var95: number,
    var99: number,
    sharpeRatio: number,
    volatility: number,
    beta: number,
    alpha: number
): CoreRiskMetrics {
    return {
        totalExposure,
        maxDrawdown,
        var95,
        var99,
        sharpeRatio,
        volatility,
        beta,
        alpha
    };
}

/**
 * Creates position metrics
 */
export function createPositionMetrics(
    kellyFraction: number,
    optimalPositionSize: number,
    maxPositionSize: number,
    riskAdjustedReturn: number
): PositionMetrics {
    return {
        kellyFraction: kellyFraction as Probability,
        optimalPositionSize,
        maxPositionSize,
        riskAdjustedReturn
    };
}

/**
 * Creates execution risk metrics
 */
export function createExecutionRiskMetrics(
    liquidityRisk: number,
    executionRisk: number,
    slippageRisk: number,
    timeDecayRisk: number
): ExecutionRiskMetrics {
    return {
        liquidityRisk: liquidityRisk as Probability,
        executionRisk: executionRisk as Probability,
        slippageRisk: slippageRisk as Probability,
        timeDecayRisk: timeDecayRisk as Probability
    };
}

/**
 * Creates comprehensive risk metrics
 */
export function createRiskMetrics(
    core: CoreRiskMetrics,
    position: PositionMetrics,
    execution: ExecutionRiskMetrics,
    confidence: number
): RiskMetrics {
    return {
        ...core,
        positionMetrics: position,
        executionRisk: execution,
        confidence: confidence as Probability
    };
}

/**
 * Creates a synthetic arbitrage with risk management (V2)
 */
export function createSyntheticArbitrageV2<T = SportMarket>(
    baseArbitrage: SyntheticArbitrageWithOdds<T>,
    riskMetrics: RiskMetrics,
    positionSize: number,
    stopLoss: number,
    targetProfit: number,
    maxLeverage: number
): SyntheticArbitrageV2<T> {
    return {
        ...baseArbitrage,
        riskMetrics,
        positionSize,
        stopLoss,
        targetProfit,
        maxLeverage
    };
}

// ===== V2 VALIDATION FUNCTIONS =====

/**
 * Validates core risk metrics
 */
export function validateCoreRiskMetrics(metrics: CoreRiskMetrics): string[] {
    const errors: string[] = [];

    if (metrics.totalExposure <= 0) {
        errors.push('Total exposure must be positive');
    }

    if (metrics.maxDrawdown > 0) {
        errors.push('Max drawdown must be negative or zero');
    }

    if (metrics.var95 <= 0 || metrics.var99 <= 0) {
        errors.push('VaR values must be positive');
    }

    if (metrics.var95 >= metrics.var99) {
        errors.push('VaR95 must be less than VaR99');
    }

    if (metrics.volatility < 0) {
        errors.push('Volatility must be non-negative');
    }

    if (metrics.sharpeRatio < 0) {
        errors.push('Sharpe ratio should be positive for profitable strategies');
    }

    return errors;
}

/**
 * Validates position metrics
 */
export function validatePositionMetrics(metrics: PositionMetrics): string[] {
    const errors: string[] = [];

    if (metrics.kellyFraction < 0 || metrics.kellyFraction > 1) {
        errors.push('Kelly fraction must be between 0 and 1');
    }

    if (metrics.optimalPositionSize <= 0) {
        errors.push('Optimal position size must be positive');
    }

    if (metrics.maxPositionSize <= 0) {
        errors.push('Max position size must be positive');
    }

    if (metrics.optimalPositionSize > metrics.maxPositionSize) {
        errors.push('Optimal position size cannot exceed max position size');
    }

    return errors;
}

/**
 * Validates execution risk metrics
 */
export function validateExecutionRiskMetrics(metrics: ExecutionRiskMetrics): string[] {
    const errors: string[] = [];

    if (metrics.liquidityRisk < 0 || metrics.liquidityRisk > 1) {
        errors.push('Liquidity risk must be between 0 and 1');
    }

    if (metrics.executionRisk < 0 || metrics.executionRisk > 1) {
        errors.push('Execution risk must be between 0 and 1');
    }

    if (metrics.slippageRisk < 0 || metrics.slippageRisk > 1) {
        errors.push('Slippage risk must be between 0 and 1');
    }

    if (metrics.timeDecayRisk < 0 || metrics.timeDecayRisk > 1) {
        errors.push('Time decay risk must be between 0 and 1');
    }

    return errors;
}

/**
 * Validates synthetic arbitrage V2
 */
export function validateSyntheticArbitrageV2<T = SportMarket>(
    arb: SyntheticArbitrageV2<T>
): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate risk metrics
    errors.push(...validateCoreRiskMetrics(arb.riskMetrics));
    errors.push(...validatePositionMetrics(arb.riskMetrics.positionMetrics));
    errors.push(...validateExecutionRiskMetrics(arb.riskMetrics.executionRisk));

    // Validate position sizing
    if (arb.positionSize <= 0) {
        errors.push('Position size must be positive');
    }

    if (arb.positionSize > arb.riskMetrics.positionMetrics.maxPositionSize) {
        errors.push('Position size exceeds maximum allowed');
    }

    // Validate stop loss and target profit
    if (arb.stopLoss >= 0) {
        errors.push('Stop loss must be negative');
    }

    if (arb.targetProfit <= 0) {
        errors.push('Target profit must be positive');
    }

    // Risk warnings
    if (arb.riskMetrics.var95 > 0.05) {
        warnings.push('VaR95 is above 5% - consider reducing position size');
    }

    if (arb.riskMetrics.sharpeRatio < 0.5) {
        warnings.push('Sharpe ratio is below 0.5 - consider higher expected value');
    }

    if (arb.riskMetrics.executionRisk.liquidityRisk > 0.3) {
        warnings.push('Liquidity risk is high - execution may be difficult');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Assesses risk against predefined limits
 */
export function assessRisk<T = SportMarket>(
    arb: SyntheticArbitrageV2<T>,
    limits: RiskLimits
): RiskAssessment {
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    // Check exposure limits
    if (arb.riskMetrics.totalExposure > limits.maxTotalExposure) {
        riskFactors.push('Total exposure exceeds limit');
        recommendations.push('Reduce position size');
    }

    if (arb.positionSize > limits.maxSinglePosition) {
        riskFactors.push('Single position exceeds limit');
        recommendations.push('Reduce position size');
    }

    // Check VaR limits
    if (arb.riskMetrics.var95 > limits.maxVar95) {
        riskFactors.push('VaR95 exceeds limit');
        recommendations.push('Reduce leverage or position size');
    }

    if (arb.riskMetrics.var99 > limits.maxVar99) {
        riskFactors.push('VaR99 exceeds limit');
        recommendations.push('Significantly reduce position size');
    }

    // Check drawdown limit
    if (arb.riskMetrics.maxDrawdown < limits.maxDrawdown) {
        riskFactors.push('Max drawdown exceeds limit');
        recommendations.push('Implement tighter stop loss');
    }

    // Check Sharpe ratio
    if (arb.riskMetrics.sharpeRatio < limits.minSharpeRatio) {
        riskFactors.push('Sharpe ratio below minimum');
        recommendations.push('Seek higher expected value opportunities');
    }

    // Calculate risk score (0-1, higher = riskier)
    const riskScore = Math.min(1, Math.max(0,
        (riskFactors.length / 10) + // Factor count component
        (arb.riskMetrics.var95 / limits.maxVar95) * 0.3 + // VaR component
        (arb.riskMetrics.executionRisk.liquidityRisk * 0.2) + // Liquidity component
        (arb.riskMetrics.executionRisk.executionRisk * 0.2) // Execution component
    )) as Probability;

    return {
        isAcceptable: riskFactors.length === 0,
        riskScore,
        riskFactors,
        recommendations,
        limits
    };
}

// ===== V2 UTILITY FUNCTIONS =====

/**
 * Creates default risk limits
 */
export function createDefaultRiskLimits(): RiskLimits {
    return {
        maxTotalExposure: 50000, // $50,000
        maxSinglePosition: 10000, // $10,000
        maxVar95: 0.05, // 5%
        maxVar99: 0.08, // 8%
        maxDrawdown: -1000, // -$1,000
        minSharpeRatio: 0.5,
        maxLeverage: 3.0
    };
}

/**
 * Creates conservative risk limits
 */
export function createConservativeRiskLimits(): RiskLimits {
    return {
        maxTotalExposure: 25000, // $25,000
        maxSinglePosition: 5000, // $5,000
        maxVar95: 0.03, // 3%
        maxVar99: 0.05, // 5%
        maxDrawdown: -500, // -$500
        minSharpeRatio: 0.8,
        maxLeverage: 2.0
    };
}

/**
 * Creates aggressive risk limits
 */
export function createAggressiveRiskLimits(): RiskLimits {
    return {
        maxTotalExposure: 100000, // $100,000
        maxSinglePosition: 25000, // $25,000
        maxVar95: 0.08, // 8%
        maxVar99: 0.12, // 12%
        maxDrawdown: -2000, // -$2,000
        minSharpeRatio: 0.3,
        maxLeverage: 5.0
    };
}

/**
 * Formats synthetic arbitrage V2 for display
 */
export function formatSyntheticArbitrageV2<T = SportMarket>(
    arb: SyntheticArbitrageV2<T>
): string {
    const baseInfo = [
        `Synthetic Arbitrage V2 ${arb.id}`,
        `Expected Value: ${(arb.expectedValue * 100).toFixed(2)}%`,
        `Position Size: $${arb.positionSize.toLocaleString()}`,
        `Target Profit: $${arb.targetProfit.toLocaleString()}`,
        `Stop Loss: $${arb.stopLoss.toLocaleString()}`,
        '',
        'Risk Metrics:',
        `VaR95: ${(arb.riskMetrics.var95 * 100).toFixed(2)}%`,
        `VaR99: ${(arb.riskMetrics.var99 * 100).toFixed(2)}%`,
        `Sharpe Ratio: ${arb.riskMetrics.sharpeRatio.toFixed(2)}`,
        `Max Drawdown: $${arb.riskMetrics.maxDrawdown.toLocaleString()}`,
        '',
        'Execution Risk:',
        `Liquidity Risk: ${(arb.riskMetrics.executionRisk.liquidityRisk * 100).toFixed(1)}%`,
        `Execution Risk: ${(arb.riskMetrics.executionRisk.executionRisk * 100).toFixed(1)}%`,
        `Slippage Risk: ${(arb.riskMetrics.executionRisk.slippageRisk * 100).toFixed(1)}%`
    ];

    return baseInfo.join('\n');
}

/**
 * Calculates risk-adjusted position size
 */
export function calculateRiskAdjustedPositionSize(
    expectedReturn: ExpectedReturn,
    volatility: number,
    riskLimit: number,
    kellyFraction: Probability
): number {
    // Adjust position size based on risk limits and Kelly criterion
    const kellyAdjustedSize = riskLimit * kellyFraction;
    const volatilityAdjustedSize = kellyAdjustedSize / (1 + volatility);

    return Math.min(kellyAdjustedSize, volatilityAdjustedSize);
}
