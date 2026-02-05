// packages/odds-core/src/types/synthetic-arbitrage-v3.ts - Advanced synthetic arbitrage with execution (V3)

import type {
    SyntheticArbitrageV2,
    RiskMetrics,
    MarketLeg,
    Probability,
    ExpectedReturn,
    HedgeRatio,
    Correlation,
    Covariance
} from './synthetic-arbitrage-v2';
import type { SportPeriod } from './synthetic-arbitrage-v1';

// ===== EXECUTION TYPES =====

/**
 * Execution status for synthetic arbitrage
 */
export type ExecutionStatus =
    | 'pending'
    | 'analyzing'
    | 'approved'
    | 'executing'
    | 'partially-filled'
    | 'completed'
    | 'cancelled'
    | 'failed'
    | 'expired';

/**
 * Order execution details
 */
export interface OrderExecution {
    readonly orderId: string;
    readonly market: MarketLeg;
    readonly side: 'buy' | 'sell';
    readonly size: number;
    readonly price: number;
    readonly filledSize: number;
    readonly averagePrice: number;
    readonly status: 'pending' | 'partial' | 'filled' | 'cancelled';
    readonly timestamp: Date;
    readonly fees: number;
    readonly slippage: number;
}

/**
 * Execution plan for synthetic arbitrage
 */
export interface ExecutionPlan {
    readonly id: string;
    readonly status: ExecutionStatus;
    readonly orders: OrderExecution[];
    readonly totalSize: number;
    readonly totalFees: number;
    readonly expectedSlippage: number;
    readonly executionTimeout: number; // milliseconds
    readonly retryPolicy: RetryPolicy;
    readonly contingencyPlans: ContingencyPlan[];
}

/**
 * Retry policy for execution
 */
export interface RetryPolicy {
    readonly maxRetries: number;
    readonly retryDelay: number; // milliseconds
    readonly backoffMultiplier: number;
    readonly retryConditions: ('partial-fill' | 'price-movement' | 'timeout' | 'liquidity-issue')[];
}

/**
 * Contingency plan for execution failures
 */
export interface ContingencyPlan {
    readonly trigger: 'price-movement' | 'correlation-drift' | 'liquidity-drop' | 'timeout';
    readonly action: 'adjust-price' | 'reduce-size' | 'cancel-leg' | 'full-cancel';
    readonly threshold: number;
    readonly parameters: Record<string, number>;
}

// ===== CORRELATION MATRIX TYPES =====

/**
 * Correlation matrix for multi-market analysis
 */
export interface CorrelationMatrix {
    readonly matrix: readonly number[][];
    readonly symbols: readonly string[];
    readonly timestamp: Date;
    readonly sampleSize: number;
    readonly timeFrame: string;
    readonly confidence: Probability;
}

/**
 * Covariance analysis result
 */
export interface CovarianceAnalysis {
    readonly covariance: Covariance;
    readonly correlation: Correlation;
    readonly beta: number;
    readonly rSquared: number;
    readonly pValue: number;
    readonly confidenceInterval: readonly [number, number];
    readonly sampleSize: number;
    readonly timeFrame: string;
}

// ===== MULTI-MARKET TYPES =====

/**
 * Multi-market synthetic arbitrage (3+ markets)
 */
export interface MultiMarketSyntheticArbitrage<T = SportMarket> extends SyntheticArbitrageV2<T> {
    readonly markets: readonly MarketLeg<T>[]; // 3+ markets
    readonly correlationMatrix: CorrelationMatrix;
    readonly optimalWeights: readonly number[];
    readonly efficientFrontier: readonly EfficientFrontierPoint[];
    readonly diversificationRatio: number;
    readonly concentrationRisk: Probability;
}

/**
 * Efficient frontier point for portfolio optimization
 */
export interface EfficientFrontierPoint {
    readonly expectedReturn: ExpectedReturn;
    readonly volatility: number;
    readonly sharpeRatio: number;
    readonly weights: readonly number[];
    readonly portfolioId: string;
}

// ===== MONITORING AND TRACKING =====

/**
 * Real-time monitoring metrics
 */
export interface MonitoringMetrics {
    readonly currentPnL: number;
    readonly unrealizedPnL: number;
    readonly realizedPnL: number;
    readonly totalReturn: number;
    readonly executionProgress: Probability;
    readonly timeElapsed: number;
    readonly timeRemaining: number;
    readonly marketConditions: MarketConditions;
}

/**
 * Market conditions for monitoring
 */
export interface MarketConditions {
    readonly volatility: 'extreme' | 'high' | 'medium' | 'low' | 'very-low';
    readonly liquidity: 'high' | 'medium' | 'low' | 'very-low';
    readonly spread: number;
    readonly depth: number;
    readonly momentum: number;
    readonly sentiment: number;
}

/**
 * Performance tracking for synthetic arbitrage
 */
export interface PerformanceTracking {
    readonly totalTrades: number;
    readonly winningTrades: number;
    readonly losingTrades: number;
    readonly winRate: Probability;
    readonly averageWin: number;
    readonly averageLoss: number;
    readonly profitFactor: number;
    readonly maxDrawdown: number;
    readonly currentDrawdown: number;
    readonly totalReturn: number;
    readonly annualizedReturn: number;
    readonly sharpeRatio: number;
    readonly sortinoRatio: number;
}

// ===== V3 SYNTHETIC ARBITRAGE =====

/**
 * Advanced synthetic arbitrage with execution and monitoring (V3)
 */
export interface SyntheticArbitrageV3<T = SportMarket> extends MultiMarketSyntheticArbitrage<T> {
    readonly executionPlan: ExecutionPlan;
    readonly monitoring: MonitoringMetrics;
    readonly performance: PerformanceTracking;
    readonly alerts: Alert[];
    readonly history: ArbitrageHistory[];
}

/**
 * Alert for synthetic arbitrage
 */
export interface Alert {
    readonly id: string;
    readonly type: 'risk' | 'opportunity' | 'execution' | 'market';
    readonly severity: 'low' | 'medium' | 'high' | 'critical';
    readonly message: string;
    readonly timestamp: Date;
    readonly acknowledged: boolean;
    readonly actionRequired: boolean;
}

/**
 * Historical tracking for synthetic arbitrage
 */
export interface ArbitrageHistory {
    readonly timestamp: Date;
    readonly action: 'created' | 'analyzed' | 'approved' | 'executed' | 'completed' | 'cancelled';
    readonly details: Record<string, unknown>;
    readonly metrics: Partial<MonitoringMetrics>;
}

// ===== V3 FACTORY FUNCTIONS =====

/**
 * Creates order execution
 */
export function createOrderExecution(
    orderId: string,
    market: MarketLeg,
    side: 'buy' | 'sell',
    size: number,
    price: number
): OrderExecution {
    return {
        orderId,
        market,
        side,
        size,
        price,
        filledSize: 0,
        averagePrice: 0,
        status: 'pending',
        timestamp: new Date(),
        fees: 0,
        slippage: 0
    };
}

/**
 * Creates execution plan
 */
export function createExecutionPlan(
    id: string,
    orders: OrderExecution[],
    timeout: number = 30000
): ExecutionPlan {
    return {
        id,
        status: 'pending',
        orders,
        totalSize: orders.reduce((sum, order) => sum + order.size, 0),
        totalFees: 0,
        expectedSlippage: 0,
        executionTimeout: timeout,
        retryPolicy: {
            maxRetries: 3,
            retryDelay: 1000,
            backoffMultiplier: 2,
            retryConditions: ['partial-fill', 'price-movement', 'timeout']
        },
        contingencyPlans: [
            {
                trigger: 'price-movement',
                action: 'adjust-price',
                threshold: 0.02,
                parameters: { maxAdjustment: 0.05 }
            },
            {
                trigger: 'liquidity-drop',
                action: 'reduce-size',
                threshold: 0.5,
                parameters: { reductionFactor: 0.5 }
            }
        ]
    };
}

/**
 * Creates correlation matrix
 */
export function createCorrelationMatrix(
    matrix: number[][],
    symbols: string[],
    sampleSize: number,
    timeFrame: string,
    confidence: number
): CorrelationMatrix {
    return {
        matrix: matrix as readonly number[][],
        symbols: symbols as readonly string[],
        timestamp: new Date(),
        sampleSize,
        timeFrame,
        confidence: confidence as Probability
    };
}

/**
 * Creates monitoring metrics
 */
export function createMonitoringMetrics(
    currentPnL: number = 0,
    executionProgress: number = 0
): MonitoringMetrics {
    return {
        currentPnL,
        unrealizedPnL: currentPnL,
        realizedPnL: 0,
        totalReturn: 0,
        executionProgress: executionProgress as Probability,
        timeElapsed: 0,
        timeRemaining: 0,
        marketConditions: {
            volatility: 'medium',
            liquidity: 'medium',
            spread: 0,
            depth: 0,
            momentum: 0,
            sentiment: 0
        }
    };
}

/**
 * Creates performance tracking
 */
export function createPerformanceTracking(): PerformanceTracking {
    return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0 as Probability,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        currentDrawdown: 0,
        totalReturn: 0,
        annualizedReturn: 0,
        sharpeRatio: 0,
        sortinoRatio: 0
    };
}

/**
 * Creates advanced synthetic arbitrage (V3)
 */
export function createSyntheticArbitrageV3<T = SportMarket>(
    baseArbitrage: MultiMarketSyntheticArbitrage<T>,
    executionPlan: ExecutionPlan,
    monitoring: MonitoringMetrics = createMonitoringMetrics(),
    performance: PerformanceTracking = createPerformanceTracking()
): SyntheticArbitrageV3<T> {
    return {
        ...baseArbitrage,
        executionPlan,
        monitoring,
        performance,
        alerts: [],
        history: [{
            timestamp: new Date(),
            action: 'created',
            details: { arbitrageId: baseArbitrage.id },
            metrics: {}
        }]
    };
}

// ===== V3 VALIDATION FUNCTIONS =====

/**
 * Validates execution plan
 */
export function validateExecutionPlan(plan: ExecutionPlan): string[] {
    const errors: string[] = [];

    if (plan.orders.length < 2) {
        errors.push('Execution plan must have at least 2 orders');
    }

    if (plan.executionTimeout <= 0) {
        errors.push('Execution timeout must be positive');
    }

    if (plan.retryPolicy.maxRetries < 0 || plan.retryPolicy.maxRetries > 10) {
        errors.push('Max retries must be between 0 and 10');
    }

    if (plan.retryPolicy.retryDelay <= 0) {
        errors.push('Retry delay must be positive');
    }

    // Validate order consistency
    const totalBuySize = plan.orders
        .filter(order => order.side === 'buy')
        .reduce((sum, order) => sum + order.size, 0);

    const totalSellSize = plan.orders
        .filter(order => order.side === 'sell')
        .reduce((sum, order) => sum + order.size, 0);

    if (Math.abs(totalBuySize - totalSellSize) > 0.01) {
        errors.push('Buy and sell sizes must be balanced');
    }

    return errors;
}

/**
 * Validates correlation matrix
 */
export function validateCorrelationMatrix(matrix: CorrelationMatrix): string[] {
    const errors: string[] = [];

    const n = matrix.matrix.length;

    if (n === 0) {
        errors.push('Correlation matrix cannot be empty');
        return errors;
    }

    // Check square matrix
    if (matrix.matrix.some(row => row.length !== n)) {
        errors.push('Correlation matrix must be square');
    }

    // Check diagonal elements are 1
    for (let i = 0; i < n; i++) {
        if (Math.abs(matrix.matrix[i][i] - 1) > 0.001) {
            errors.push(`Diagonal element [${i},${i}] must be 1`);
        }
    }

    // Check symmetry
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (Math.abs(matrix.matrix[i][j] - matrix.matrix[j][i]) > 0.001) {
                errors.push(`Correlation matrix must be symmetric at [${i},${j}]`);
            }
        }
    }

    // Check correlation bounds
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j && (matrix.matrix[i][j] < -1 || matrix.matrix[i][j] > 1)) {
                errors.push(`Correlation at [${i},${j}] must be between -1 and 1`);
            }
        }
    }

    if (matrix.symbols.length !== n) {
        errors.push('Number of symbols must match matrix dimensions');
    }

    return errors;
}

/**
 * Validates synthetic arbitrage V3
 */
export function validateSyntheticArbitrageV3<T = SportMarket>(
    arb: SyntheticArbitrageV3<T>
): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate execution plan
    errors.push(...validateExecutionPlan(arb.executionPlan));

    // Validate correlation matrix
    errors.push(...validateCorrelationMatrix(arb.correlationMatrix));

    // Validate multi-market requirements
    if (arb.markets.length < 3) {
        errors.push('V3 synthetic arbitrage must have at least 3 markets');
    }

    // Validate weights
    if (arb.optimalWeights.length !== arb.markets.length) {
        errors.push('Number of weights must match number of markets');
    }

    const weightSum = arb.optimalWeights.reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(weightSum - 1) > 0.01) {
        errors.push('Weights must sum to 1');
    }

    // Validate efficient frontier
    if (arb.efficientFrontier.length === 0) {
        warnings.push('No efficient frontier points calculated');
    }

    // Performance warnings
    if (arb.performance.totalTrades > 0 && arb.performance.winRate < 0.4) {
        warnings.push('Win rate is below 40% - review strategy');
    }

    if (arb.performance.sharpeRatio < 0.5) {
        warnings.push('Sharpe ratio is below 0.5 - consider risk adjustment');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

// ===== V3 UTILITY FUNCTIONS =====

/**
 * Updates monitoring metrics
 */
export function updateMonitoringMetrics(
    current: MonitoringMetrics,
    updates: Partial<MonitoringMetrics>
): MonitoringMetrics {
    return {
        ...current,
        ...updates
    };
}

/**
 * Adds alert to synthetic arbitrage
 */
export function addAlert<T = SportMarket>(
    arb: SyntheticArbitrageV3<T>,
    type: 'risk' | 'opportunity' | 'execution' | 'market',
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string
): SyntheticArbitrageV3<T> {
    const newAlert: Alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        severity,
        message,
        timestamp: new Date(),
        acknowledged: false,
        actionRequired: severity === 'high' || severity === 'critical'
    };

    return {
        ...arb,
        alerts: [...arb.alerts, newAlert]
    };
}

/**
 * Adds history entry
 */
export function addHistoryEntry<T = SportMarket>(
    arb: SyntheticArbitrageV3<T>,
    action: 'created' | 'analyzed' | 'approved' | 'executed' | 'completed' | 'cancelled',
    details: Record<string, unknown>
): SyntheticArbitrageV3<T> {
    const newEntry: ArbitrageHistory = {
        timestamp: new Date(),
        action,
        details,
        metrics: { ...arb.monitoring }
    };

    return {
        ...arb,
        history: [...arb.history, newEntry]
    };
}

/**
 * Formats synthetic arbitrage V3 for display
 */
export function formatSyntheticArbitrageV3<T = SportMarket>(
    arb: SyntheticArbitrageV3<T>
): string {
    const baseInfo = [
        `Synthetic Arbitrage V3 ${arb.id}`,
        `Markets: ${arb.markets.length} markets`,
        `Expected Value: ${(arb.expectedValue * 100).toFixed(2)}%`,
        `Position Size: $${arb.positionSize.toLocaleString()}`,
        '',
        'Execution Plan:',
        `Status: ${arb.executionPlan.status}`,
        `Orders: ${arb.executionPlan.orders.length}`,
        `Timeout: ${arb.executionPlan.executionTimeout}ms`,
        '',
        'Monitoring:',
        `Current P&L: $${arb.monitoring.currentPnL.toLocaleString()}`,
        `Execution Progress: ${(arb.monitoring.executionProgress * 100).toFixed(1)}%`,
        `Active Alerts: ${arb.alerts.length}`,
        '',
        'Performance:',
        `Total Trades: ${arb.performance.totalTrades}`,
        `Win Rate: ${(arb.performance.winRate * 100).toFixed(1)}%`,
        `Sharpe Ratio: ${arb.performance.sharpeRatio.toFixed(2)}`,
        `Total Return: ${(arb.performance.totalReturn * 100).toFixed(2)}%`
    ];

    return baseInfo.join('\n');
}

/**
 * Calculates portfolio metrics for multi-market arbitrage
 */
export function calculatePortfolioMetrics(
    weights: readonly number[],
    expectedReturns: readonly number[],
    covarianceMatrix: readonly number[][]
): { expectedReturn: number; variance: number; sharpeRatio: number } {
    const expectedReturn = weights.reduce((sum, weight, i) => sum + weight * expectedReturns[i], 0);

    let variance = 0;
    for (let i = 0; i < weights.length; i++) {
        for (let j = 0; j < weights.length; j++) {
            variance += weights[i] * weights[j] * covarianceMatrix[i][j];
        }
    }

    const sharpeRatio = variance > 0 ? expectedReturn / Math.sqrt(variance) : 0;

    return { expectedReturn, variance, sharpeRatio };
}
