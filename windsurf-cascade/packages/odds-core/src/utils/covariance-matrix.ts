// packages/odds-core/src/utils/covariance-matrix.ts - Covariance matrix calculation utilities for synthetic arbitrage

import type {
    Covariance,
    Correlation,
    Probability,
    ExpectedReturn,
    SyntheticArbitrageV1,
    MarketLeg
} from '@odds-core/types';

/**
 * Historical data point for covariance calculations
 */
export interface HistoricalDataPoint {
    readonly timestamp: Date;
    readonly market1Outcome: number;
    readonly market2Outcome: number;
    readonly market1Return: number;
    readonly market2Return: number;
    readonly period: string;
    readonly gameId: string;
}

/**
 * Covariance matrix calculation result
 */
export interface CovarianceMatrixResult {
    readonly covariance: Covariance;
    readonly correlation: Correlation;
    readonly variance1: number;
    readonly variance2: number;
    readonly sampleSize: number;
    readonly confidence: Probability;
    readonly standardError: number;
    readonly isSignificant: boolean;
}

/**
 * Hedge ratio calculation result
 */
export interface HedgeRatioResult {
    readonly optimalHedgeRatio: number;
    readonly minVarianceHedgeRatio: number;
    readonly riskReduction: number; // 0-1, percentage of risk reduced
    readonly expectedHedgeReturn: number;
    readonly hedgeEfficiency: number; // 0-1, how efficient the hedge is
    readonly confidence: Probability;
}

/**
 * Performance metrics for covariance calculations
 */
export interface CovariancePerformanceMetrics {
    readonly calculationTime: number; // milliseconds
    readonly memoryUsage: number; // bytes
    readonly dataPointsProcessed: number;
    readonly cacheHitRate: number; // 0-1
    readonly accuracy: number; // 0-1, compared to benchmark
}

/**
 * Comprehensive covariance matrix calculator
 */
export class CovarianceMatrixCalculator {
    private readonly cache = new Map<string, CovarianceMatrixResult>();
    private readonly performanceMetrics: CovariancePerformanceMetrics = {
        calculationTime: 0,
        memoryUsage: 0,
        dataPointsProcessed: 0,
        cacheHitRate: 0,
        accuracy: 0
    };

    /**
     * Calculate covariance matrix from historical data
     */
    calculateCovarianceMatrix(
        historicalData: HistoricalDataPoint[],
        options?: {
            minSampleSize?: number;
            confidenceLevel?: number; // 0-1
            useExponentialWeighting?: boolean;
            decayFactor?: number; // for exponential weighting
        }
    ): CovarianceMatrixResult {
        const startTime = performance.now();

        const minSampleSize = options?.minSampleSize ?? 30;
        const confidenceLevel = options?.confidenceLevel ?? 0.95;
        const useExponentialWeighting = options?.useExponentialWeighting ?? false;
        const decayFactor = options?.decayFactor ?? 0.94;

        if (historicalData.length < minSampleSize) {
            throw new Error(`Insufficient data: need at least ${minSampleSize} points, got ${historicalData.length}`);
        }

        const returns1 = historicalData.map(d => d.market1Return);
        const returns2 = historicalData.map(d => d.market2Return);

        // Calculate means
        const mean1 = this.calculateWeightedMean(returns1, useExponentialWeighting, decayFactor);
        const mean2 = this.calculateWeightedMean(returns2, useExponentialWeighting, decayFactor);

        // Calculate variances and covariance
        const { variance1, variance2, covariance } = this.calculateVarianceAndCovariance(
            returns1,
            returns2,
            mean1,
            mean2,
            useExponentialWeighting,
            decayFactor
        );

        // Calculate correlation
        const correlation = variance1 > 0 && variance2 > 0
            ? covariance / Math.sqrt(variance1 * variance2)
            : 0;

        // Calculate standard error and confidence
        const standardError = this.calculateStandardError(covariance, historicalData.length, variance1, variance2);
        const confidence = this.calculateConfidence(covariance, standardError, confidenceLevel);
        const isSignificant = Math.abs(covariance) > standardError * 1.96; // 95% confidence

        const result: CovarianceMatrixResult = {
            covariance: covariance as Covariance,
            correlation: correlation as Correlation,
            variance1,
            variance2,
            sampleSize: historicalData.length,
            confidence: confidence as Probability,
            standardError,
            isSignificant
        };

        // Update performance metrics
        this.performanceMetrics.calculationTime = performance.now() - startTime;
        this.performanceMetrics.dataPointsProcessed = historicalData.length;
        this.performanceMetrics.memoryUsage = this.estimateMemoryUsage(result);

        return result;
    }

    /**
     * Calculate optimal hedge ratio using minimum variance approach
     */
    calculateOptimalHedgeRatio(
        covarianceResult: CovarianceMatrixResult,
        options?: {
            riskAversion?: number; // 0-1, higher = more risk averse
            transactionCosts?: number; // 0-1, as percentage of position
            targetRiskReduction?: number; // 0-1, desired risk reduction
        }
    ): HedgeRatioResult {
        const riskAversion = options?.riskAversion ?? 0.5;
        const transactionCosts = options?.transactionCosts ?? 0.001;
        const targetRiskReduction = options?.targetRiskReduction ?? 0.8;

        const { covariance, variance1, variance2, correlation } = covarianceResult;

        // Minimum variance hedge ratio (classic formula)
        const minVarianceHedgeRatio = variance2 > 0 ? covariance / variance2 : 0;

        // Adjust for risk aversion and transaction costs
        let optimalHedgeRatio = minVarianceHedgeRatio;

        if (riskAversion > 0.5) {
            // More conservative hedging for risk-averse traders
            optimalHedgeRatio *= (1 - (riskAversion - 0.5) * 0.5);
        }

        // Account for transaction costs
        if (transactionCosts > 0) {
            const costAdjustedRatio = optimalHedgeRatio * (1 - transactionCosts);
            optimalHedgeRatio = Math.abs(costAdjustedRatio) < 0.01 ? 0 : costAdjustedRatio;
        }

        // Calculate risk reduction
        const portfolioVariance = variance1 + (optimalHedgeRatio ** 2) * variance2 - 2 * optimalHedgeRatio * covariance;
        const originalVariance = variance1;
        const riskReduction = originalVariance > 0 ? 1 - (portfolioVariance / originalVariance) : 0;

        // Calculate expected hedge return
        const expectedHedgeReturn = -optimalHedgeRatio * 0.02; // Assume 2% expected return for hedge leg

        // Calculate hedge efficiency
        const maxPossibleRiskReduction = variance2 > 0 ? (correlation ** 2) : 0;
        const hedgeEfficiency = maxPossibleRiskReduction > 0 ? riskReduction / maxPossibleRiskReduction : 0;

        // Calculate confidence based on sample size and correlation strength
        const confidence = this.calculateHedgeConfidence(
            covarianceResult.sampleSize,
            Math.abs(correlation),
            riskReduction
        );

        return {
            optimalHedgeRatio,
            minVarianceHedgeRatio,
            riskReduction,
            expectedHedgeReturn,
            hedgeEfficiency,
            confidence: confidence as Probability
        };
    }

    /**
     * Calculate rolling covariance for time-series analysis
     */
    calculateRollingCovariance(
        historicalData: HistoricalDataPoint[],
        windowSize: number,
        stepSize: number = 1
    ): Array<{
        timestamp: Date;
        covariance: CovarianceMatrixResult;
        windowStart: Date;
        windowEnd: Date;
    }> {
        const results: Array<{
            timestamp: Date;
            covariance: CovarianceMatrixResult;
            windowStart: Date;
            windowEnd: Date;
        }> = [];

        if (historicalData.length < windowSize) {
            throw new Error(`Insufficient data for rolling calculation: need at least ${windowSize} points`);
        }

        for (let i = 0; i <= historicalData.length - windowSize; i += stepSize) {
            const window = historicalData.slice(i, i + windowSize);
            const covarianceResult = this.calculateCovarianceMatrix(window);

            results.push({
                timestamp: window[window.length - 1].timestamp,
                covariance: covarianceResult,
                windowStart: window[0].timestamp,
                windowEnd: window[window.length - 1].timestamp
            });
        }

        return results;
    }

    /**
     * Calculate covariance matrix for multiple markets (portfolio analysis)
     */
    calculatePortfolioCovarianceMatrix(
        marketReturns: Array<{ marketId: string; returns: number[] }>,
        options?: {
            minSampleSize?: number;
            useExponentialWeighting?: boolean;
        }
    ): {
        covarianceMatrix: number[][];
        correlationMatrix: number[][];
        marketIds: string[];
        eigenvalues: number[];
        eigenvectors: number[][];
    } {
        const minSampleSize = options?.minSampleSize ?? 30;
        const useExponentialWeighting = options?.useExponentialWeighting ?? false;

        // Validate data
        const sampleSize = marketReturns[0]?.returns.length ?? 0;
        if (sampleSize < minSampleSize) {
            throw new Error(`Insufficient data: need at least ${minSampleSize} points, got ${sampleSize}`);
        }

        for (const market of marketReturns) {
            if (market.returns.length !== sampleSize) {
                throw new Error('All markets must have the same number of returns');
            }
        }

        const numMarkets = marketReturns.length;
        const covarianceMatrix: number[][] = Array(numMarkets).fill(null).map(() => Array(numMarkets).fill(0));
        const correlationMatrix: number[][] = Array(numMarkets).fill(null).map(() => Array(numMarkets).fill(0));

        // Calculate covariance matrix
        for (let i = 0; i < numMarkets; i++) {
            for (let j = 0; j < numMarkets; j++) {
                if (i === j) {
                    // Variance on diagonal
                    const variance = this.calculateVariance(marketReturns[i].returns, useExponentialWeighting);
                    covarianceMatrix[i][j] = variance;
                } else {
                    // Covariance off-diagonal
                    const covariance = this.calculateCovariance(
                        marketReturns[i].returns,
                        marketReturns[j].returns,
                        useExponentialWeighting
                    );
                    covarianceMatrix[i][j] = covariance;
                    covarianceMatrix[j][i] = covariance; // Symmetric matrix
                }
            }
        }

        // Calculate correlation matrix
        for (let i = 0; i < numMarkets; i++) {
            for (let j = 0; j < numMarkets; j++) {
                const variance1 = covarianceMatrix[i][i];
                const variance2 = covarianceMatrix[j][j];

                if (variance1 > 0 && variance2 > 0) {
                    correlationMatrix[i][j] = covarianceMatrix[i][j] / Math.sqrt(variance1 * variance2);
                } else {
                    correlationMatrix[i][j] = 0;
                }
            }
        }

        // Calculate eigenvalues and eigenvectors for PCA
        const { eigenvalues, eigenvectors } = this.calculateEigenDecomposition(covarianceMatrix);

        return {
            covarianceMatrix,
            correlationMatrix,
            marketIds: marketReturns.map(m => m.marketId),
            eigenvalues,
            eigenvectors
        };
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): CovariancePerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    /**
     * Clear cache and reset metrics
     */
    clearCache(): void {
        this.cache.clear();
        this.performanceMetrics.cacheHitRate = 0;
    }

    // ===== PRIVATE HELPER METHODS =====

    private calculateWeightedMean(
        values: number[],
        useExponentialWeighting: boolean,
        decayFactor: number
    ): number {
        if (!useExponentialWeighting) {
            return values.reduce((sum, val) => sum + val, 0) / values.length;
        }

        // Exponential weighting
        let weightedSum = 0;
        let weightSum = 0;
        let weight = 1;

        for (let i = values.length - 1; i >= 0; i--) {
            weightedSum += values[i] * weight;
            weightSum += weight;
            weight *= decayFactor;
        }

        return weightedSum / weightSum;
    }

    private calculateVarianceAndCovariance(
        returns1: number[],
        returns2: number[],
        mean1: number,
        mean2: number,
        useExponentialWeighting: boolean,
        decayFactor: number
    ): { variance1: number; variance2: number; covariance: number } {
        if (!useExponentialWeighting) {
            let variance1 = 0;
            let variance2 = 0;
            let covariance = 0;

            for (let i = 0; i < returns1.length; i++) {
                const diff1 = returns1[i] - mean1;
                const diff2 = returns2[i] - mean2;

                variance1 += diff1 * diff1;
                variance2 += diff2 * diff2;
                covariance += diff1 * diff2;
            }

            const n = returns1.length;
            return {
                variance1: variance1 / (n - 1),
                variance2: variance2 / (n - 1),
                covariance: covariance / (n - 1)
            };
        }

        // Exponential weighting
        let variance1 = 0;
        let variance2 = 0;
        let covariance = 0;
        let weightSum = 0;
        let weight = 1;

        for (let i = returns1.length - 1; i >= 0; i--) {
            const diff1 = returns1[i] - mean1;
            const diff2 = returns2[i] - mean2;

            variance1 += diff1 * diff1 * weight;
            variance2 += diff2 * diff2 * weight;
            covariance += diff1 * diff2 * weight;
            weightSum += weight;
            weight *= decayFactor;
        }

        return {
            variance1: variance1 / weightSum,
            variance2: variance2 / weightSum,
            covariance: covariance / weightSum
        };
    }

    private calculateVariance(values: number[], useExponentialWeighting: boolean): number {
        const mean = this.calculateWeightedMean(values, useExponentialWeighting, 0.94);

        if (!useExponentialWeighting) {
            return values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / (values.length - 1);
        }

        // Exponential weighting
        let weightedVariance = 0;
        let weightSum = 0;
        let weight = 1;

        for (let i = values.length - 1; i >= 0; i--) {
            weightedVariance += (values[i] - mean) ** 2 * weight;
            weightSum += weight;
            weight *= 0.94;
        }

        return weightedVariance / weightSum;
    }

    private calculateCovariance(
        returns1: number[],
        returns2: number[],
        useExponentialWeighting: boolean
    ): number {
        const mean1 = this.calculateWeightedMean(returns1, useExponentialWeighting, 0.94);
        const mean2 = this.calculateWeightedMean(returns2, useExponentialWeighting, 0.94);

        const { covariance } = this.calculateVarianceAndCovariance(
            returns1, returns2, mean1, mean2, useExponentialWeighting, 0.94
        );

        return covariance;
    }

    private calculateStandardError(
        covariance: number,
        sampleSize: number,
        variance1: number,
        variance2: number
    ): number {
        // Standard error of covariance estimate
        return Math.sqrt((variance1 * variance2) / (sampleSize - 1));
    }

    private calculateConfidence(
        covariance: number,
        standardError: number,
        confidenceLevel: number
    ): number {
        // Simple confidence calculation based on t-statistic
        const tStat = Math.abs(covariance) / standardError;
        const confidence = Math.min(0.99, tStat / 2); // Rough approximation
        return Math.max(0.01, confidence);
    }

    private calculateHedgeConfidence(
        sampleSize: number,
        correlationStrength: number,
        riskReduction: number
    ): number {
        // Confidence based on sample size, correlation, and risk reduction
        const sampleConfidence = Math.min(1, sampleSize / 100); // More data = more confidence
        const correlationConfidence = correlationStrength; // Stronger correlation = more confidence
        const riskConfidence = riskReduction; // Better risk reduction = more confidence

        return (sampleConfidence + correlationConfidence + riskConfidence) / 3;
    }

    private estimateMemoryUsage(result: CovarianceMatrixResult): number {
        // Rough estimate of memory usage in bytes
        return JSON.stringify(result).length * 2; // Assume 2 bytes per character
    }

    private calculateEigenDecomposition(matrix: number[][]): {
        eigenvalues: number[];
        eigenvectors: number[][];
    } {
        // Simplified eigenvalue calculation (power iteration for largest eigenvalue)
        // In production, use a proper linear algebra library

        const n = matrix.length;
        const eigenvalues: number[] = [];
        const eigenvectors: number[][] = [];

        // For now, return simplified results
        // Real implementation would use QR algorithm or similar
        for (let i = 0; i < n; i++) {
            eigenvalues.push(matrix[i][i]); // Use diagonal elements as approximation
            eigenvectors.push(Array(n).fill(0).map((_, j) => i === j ? 1 : 0)); // Standard basis
        }

        return { eigenvalues, eigenvectors };
    }
}

/**
 * Factory for creating historical data points
 */
export class HistoricalDataFactory {
    /**
     * Create synthetic historical data for testing
     */
    static createSyntheticData(
        market1Params: { mean: number; stdDev: number; trend?: number },
        market2Params: { mean: number; stdDev: number; trend?: number },
        correlation: number,
        sampleSize: number,
        startDate: Date = new Date()
    ): HistoricalDataPoint[] {
        const data: HistoricalDataPoint[] = [];

        // Generate correlated random variables using Cholesky decomposition
        const correlationMatrix = [
            [1, correlation],
            [correlation, 1]
        ];

        for (let i = 0; i < sampleSize; i++) {
            const timestamp = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000); // Daily data

            // Generate correlated returns (simplified)
            const random1 = (Math.random() - 0.5) * 2;
            const random2 = correlation * random1 + Math.sqrt(1 - correlation * correlation) * (Math.random() - 0.5) * 2;

            const market1Return = market1Params.mean + random1 * market1Params.stdDev + (market1Params.trend ?? 0) * i;
            const market2Return = market2Params.mean + random2 * market2Params.stdDev + (market2Params.trend ?? 0) * i;

            // Convert returns to outcomes (simplified)
            const market1Outcome = Math.exp(market1Return);
            const market2Outcome = Math.exp(market2Return);

            data.push({
                timestamp,
                market1Outcome,
                market2Outcome,
                market1Return,
                market2Return,
                period: 'full-game',
                gameId: `TEST_GAME_${i}`
            });
        }

        return data;
    }

    /**
     * Create realistic NBA data
     */
    static createNBAData(
        gameId: string,
        days: number = 100
    ): HistoricalDataPoint[] {
        return this.createSyntheticData(
            { mean: 0.001, stdDev: 0.02, trend: 0.0001 }, // First quarter returns
            { mean: 0.002, stdDev: 0.015, trend: 0.00005 }, // Full game returns
            0.65, // Typical correlation between 1Q and full game
            days,
            new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        ).map(point => ({
            ...point,
            gameId,
            period: point.market1Return > point.market2Return ? 'first-quarter' : 'full-game'
        }));
    }
}

export default CovarianceMatrixCalculator;
