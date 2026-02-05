#!/usr/bin/env bun
/**
 * [DOMAIN][ARBITRAGE][TYPE][ENGINE][SCOPE][SYNTHETIC][META][COVARIANCE][#REF]covariance-engine
 * 
 * Covariance Engine for Synthetic Arbitrage
 * Calculates dynamic hedge ratios and correlation matrices
 * 
 * @fileoverview Real-time covariance calculation with exponential decay
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category odds-arbitrage
 * @tags covariance,hedge-ratio,correlation,exponential-decay,synthetic-arb
 */

export interface HedgeParameters {
    ratio: number;
    correlation: number;
    confidence: number;
    variance: number;
    residualStdDev: number;
}

export interface SyntheticRelationship {
    primaryMarket: string;
    hedgeMarket: string;
    covariance: number;
    correlation: number;
    hedgeRatio: number;
    beta: number;
    halfLife: number;
    residualStdDev: number;
    confidence: number;
    lastUpdated: number;
}

export interface PricePoint {
    timestamp: number;
    price: number;
}

export class RingBuffer<T> {
    private buffer: T[];
    private size: number;
    private index: number;
    private count: number;

    constructor(size: number) {
        this.buffer = new Array(size);
        this.size = size;
        this.index = 0;
        this.count = 0;
    }

    push(item: T): void {
        this.buffer[this.index] = item;
        this.index = (this.index + 1) % this.size;
        this.count = Math.min(this.count + 1, this.size);
    }

    toArray(): T[] {
        const result: T[] = [];
        for (let i = 0; i < this.count; i++) {
            const idx = (this.index - this.count + i + this.size) % this.size;
            result.push(this.buffer[idx]);
        }
        return result;
    }

    get length(): number {
        return this.count;
    }
}

export class CovarianceEngine {
    private priceHistory = new Map<string, RingBuffer<number>>();
    private relationshipMatrix = new Map<string, SyntheticRelationship>();
    private readonly halfLifeMs = 300000; // 5-minute half-life
    private readonly maxHistorySize = 1000;
    private readonly minSamples = 50;

    /**
     * Calculate hedge ratio using exponentially weighted moving covariance
     */
    calculateHedgeRatio(
        primaryPrices: number[],
        hedgePrices: number[]
    ): HedgeParameters {
        if (primaryPrices.length < this.minSamples || hedgePrices.length < this.minSamples) {
            throw new Error(`Insufficient data: need at least ${this.minSamples} samples`);
        }

        if (primaryPrices.length !== hedgePrices.length) {
            throw new Error('Price arrays must have equal length');
        }

        // Exponentially weighted moving covariance
        const lambda = Math.exp(-Math.log(2) / this.halfLifeMs);
        let cov = 0, varPrimary = 0, varHedge = 0;
        let sumWeights = 0;

        for (let i = 1; i < primaryPrices.length; i++) {
            const timeWeight = Math.pow(lambda, primaryPrices.length - i);
            const primaryReturn = primaryPrices[i] - primaryPrices[i - 1];
            const hedgeReturn = hedgePrices[i] - hedgePrices[i - 1];

            cov += timeWeight * primaryReturn * hedgeReturn;
            varPrimary += timeWeight * primaryReturn * primaryReturn;
            varHedge += timeWeight * hedgeReturn * hedgeReturn;
            sumWeights += timeWeight;
        }

        // Normalize by sum of weights
        cov /= sumWeights;
        varPrimary /= sumWeights;
        varHedge /= sumWeights;

        const hedgeRatio = varHedge > 0 ? cov / varHedge : 0;
        const correlation = (varPrimary > 0 && varHedge > 0)
            ? cov / Math.sqrt(varPrimary * varHedge)
            : 0;

        // Calculate residual standard deviation
        const residuals: number[] = [];
        for (let i = 0; i < primaryPrices.length; i++) {
            const predicted = hedgePrices[i] * hedgeRatio;
            residuals.push(primaryPrices[i] - predicted);
        }

        const residualVariance = this.calculateVariance(residuals);
        const residualStdDev = Math.sqrt(residualVariance);

        return {
            ratio: hedgeRatio,
            correlation: Math.max(-1, Math.min(1, correlation)),
            confidence: this.calculateConfidence(correlation, primaryPrices.length),
            variance: varPrimary,
            residualStdDev
        };
    }

    /**
     * Update price history for a market
     */
    updatePrice(marketId: string, price: number, timestamp: number = Date.now()): void {
        if (!this.priceHistory.has(marketId)) {
            this.priceHistory.set(marketId, new RingBuffer<number>(this.maxHistorySize));
        }

        const buffer = this.priceHistory.get(marketId)!;
        buffer.push(price);

        // Update relationships involving this market
        this.updateRelationships(marketId);
    }

    /**
     * Get relationship between two markets
     */
    getRelationship(primaryMarket: string, hedgeMarket: string): SyntheticRelationship | null {
        const key = `${primaryMarket}-${hedgeMarket}`;
        return this.relationshipMatrix.get(key) || null;
    }

    /**
     * Calculate confidence interval for correlation
     */
    private calculateConfidence(correlation: number, samples: number): number {
        if (samples < 3) return 0;

        // Fisher z-transformation for correlation significance
        const absCorr = Math.abs(correlation);
        if (absCorr >= 1) return 0.99;

        const z = 0.5 * Math.log((1 + absCorr) / (1 - absCorr));
        const se = 1 / Math.sqrt(samples - 3);

        // 95% confidence interval
        const zLower = z - 1.96 * se;
        const zUpper = z + 1.96 * se;

        // Convert back to correlation space
        const rLower = Math.tanh(zLower);
        const rUpper = Math.tanh(zUpper);

        // Confidence that correlation is significantly different from zero
        const confidence = 1 - (Math.abs(rUpper - rLower) / 2);

        return Math.max(0, Math.min(0.99, confidence));
    }

    /**
     * Calculate variance of an array
     */
    private calculateVariance(values: number[]): number {
        if (values.length === 0) return 0;

        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    }

    /**
     * Update all relationships involving a market
     */
    private updateRelationships(marketId: string): void {
        const primaryPrices = this.priceHistory.get(marketId)?.toArray() || [];

        if (primaryPrices.length < this.minSamples) return;

        // Check against all other markets
        for (const [otherMarketId] of this.priceHistory) {
            if (otherMarketId === marketId) continue;

            const hedgePrices = this.priceHistory.get(otherMarketId)?.toArray() || [];

            if (hedgePrices.length < this.minSamples) continue;

            try {
                const params = this.calculateHedgeRatio(primaryPrices, hedgePrices);

                const relationship: SyntheticRelationship = {
                    primaryMarket: marketId,
                    hedgeMarket: otherMarketId,
                    covariance: params.ratio * params.variance,
                    correlation: params.correlation,
                    hedgeRatio: params.ratio,
                    beta: params.ratio,
                    halfLife: this.halfLifeMs,
                    residualStdDev: params.residualStdDev,
                    confidence: params.confidence,
                    lastUpdated: Date.now()
                };

                this.relationshipMatrix.set(`${marketId}-${otherMarketId}`, relationship);
            } catch (error) {
                // Skip invalid calculations
                continue;
            }
        }
    }

    /**
     * Get all high-confidence relationships
     */
    getHighConfidenceRelationships(minConfidence: number = 0.7): SyntheticRelationship[] {
        return Array.from(this.relationshipMatrix.values())
            .filter(rel => rel.confidence >= minConfidence && Math.abs(rel.correlation) >= 0.7);
    }

    /**
     * Clear all history and relationships
     */
    reset(): void {
        this.priceHistory.clear();
        this.relationshipMatrix.clear();
    }

    /**
     * Get statistics for monitoring
     */
    getStatistics() {
        const relationships = Array.from(this.relationshipMatrix.values());

        return {
            totalMarkets: this.priceHistory.size,
            totalRelationships: relationships.length,
            highConfidenceRelationships: relationships.filter(r => r.confidence >= 0.7).length,
            averageCorrelation: relationships.length > 0
                ? relationships.reduce((sum, r) => sum + Math.abs(r.correlation), 0) / relationships.length
                : 0,
            averageConfidence: relationships.length > 0
                ? relationships.reduce((sum, r) => sum + r.confidence, 0) / relationships.length
                : 0
        };
    }
}
