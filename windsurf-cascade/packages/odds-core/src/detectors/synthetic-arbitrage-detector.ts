// packages/odds-core/src/detectors/synthetic-arbitrage-detector.ts - High-performance synthetic arbitrage detection system

import type {
    SyntheticArbitrageV1,
    SyntheticArbitrageV2,
    SyntheticArbitrageV3,
    SportMarket,
    MarketLeg,
    ExpectedReturn,
    HedgeRatio,
    Probability,
    Correlation,
    Covariance
} from '@odds-core/types';

import {
    CovarianceMatrixCalculator,
    HistoricalDataFactory,
    RotationNumberUtils,
    RotationNumberRegistry
} from '../utils/index';

/**
 * Detection criteria configuration
 */
export interface DetectionCriteria {
    readonly minExpectedReturn: number; // Minimum expected return threshold
    readonly minConfidence: number;     // Minimum confidence level
    readonly minCorrelation: number;    // Minimum correlation for synthetic relationship
    readonly maxHedgeRatio: number;     // Maximum hedge ratio to limit exposure
    readonly minLiquidity: number;      // Minimum market liquidity
    readonly maxTimeDifference: number; // Maximum time difference between markets (seconds)
    readonly allowedPeriodPairs: Array<{ primary: string; secondary: string }>;
    readonly excludedSportsbooks: string[]; // Sportsbooks to exclude
}

/**
 * Detection result with comprehensive metadata
 */
export interface DetectionResult {
    readonly arbitrage: SyntheticArbitrageV1;
    readonly score: number; // 0-1, overall opportunity score
    readonly profitability: {
        readonly expectedReturn: ExpectedReturn;
        readonly riskAdjustedReturn: number;
        readonly sharpeRatio: number;
        readonly maxDrawdown: number;
    };
    readonly execution: {
        readonly difficulty: 'easy' | 'medium' | 'hard';
        readonly estimatedTimeToExecute: number; // milliseconds
        readonly requiredCapital: number;
        readonly liquidityScore: number; // 0-1
    };
    readonly risk: {
        readonly volatility: number;
        readonly correlationRisk: number;
        readonly liquidityRisk: number;
        readonly executionRisk: number;
    };
    readonly metadata: {
        readonly detectionTime: Date;
        readonly processingTime: number; // milliseconds
        readonly dataQuality: number; // 0-1
        readonly modelConfidence: number; // 0-1
    };
}

/**
 * Market opportunity for cross-sport detection
 */
export interface MarketOpportunity {
    readonly market1: SportMarket;
    readonly market2: SportMarket;
    readonly priceDifference: number;
    readonly timeDifference: number;
    readonly liquidityScore: number;
    readonly correlationPotential: number;
}

/**
 * High-performance synthetic arbitrage detector
 */
export class SyntheticArbitrageDetector {
    private readonly covarianceCalculator: CovarianceMatrixCalculator;
    private readonly rotationRegistry: RotationNumberRegistry;
    private readonly detectionCriteria: DetectionCriteria;
    private readonly performanceMetrics = {
        totalDetections: 0,
        successfulDetections: 0,
        averageProcessingTime: 0,
        lastDetectionTime: new Date(),
        cacheHitRate: 0
    };

    constructor(criteria?: Partial<DetectionCriteria>) {
        this.covarianceCalculator = new CovarianceMatrixCalculator();
        this.rotationRegistry = new RotationNumberRegistry();

        // Default detection criteria optimized for high-frequency trading
        this.detectionCriteria = {
            minExpectedReturn: 0.001, // 0.1% minimum return
            minConfidence: 0.7,       // 70% minimum confidence
            minCorrelation: 0.3,      // 30% minimum correlation
            maxHedgeRatio: 0.8,       // 80% maximum hedge ratio
            minLiquidity: 10000,      // $10k minimum liquidity
            maxTimeDifference: 300,   // 5 minutes maximum time difference
            allowedPeriodPairs: [
                { primary: 'first-quarter', secondary: 'full-game' },
                { primary: 'first-half', secondary: 'full-game' },
                { primary: 'second-quarter', secondary: 'full-game' },
                { primary: 'third-quarter', secondary: 'full-game' },
                { primary: 'first-quarter', secondary: 'second-half' },
                { primary: 'live-game', secondary: 'full-game' }
            ],
            excludedSportsbooks: [],
            ...criteria
        };
    }

    /**
     * Detect synthetic arbitrage opportunities from market data
     */
    async detectOpportunities(
        markets: SportMarket[],
        options?: {
            maxOpportunities?: number;
            useCache?: boolean;
            includeRiskMetrics?: boolean;
        }
    ): Promise<DetectionResult[]> {
        const startTime = performance.now();
        const maxOpportunities = options?.maxOpportunities ?? 50;
        const useCache = options?.useCache ?? true;

        this.performanceMetrics.totalDetections++;

        try {
            // Pre-filter markets for efficiency
            const candidatePairs = this.findCandidatePairs(markets);

            // Process candidates in parallel for maximum performance
            const detectionPromises = candidatePairs.slice(0, maxOpportunities).map(pair =>
                this.analyzePair(pair[0], pair[1], useCache)
            );

            const results = await Promise.all(detectionPromises);
            const validResults = results.filter(result => result !== null) as DetectionResult[];

            // Sort by opportunity score
            const sortedResults = validResults.sort((a, b) => b.score - a.score);

            // Update performance metrics
            const processingTime = performance.now() - startTime;
            this.performanceMetrics.averageProcessingTime =
                (this.performanceMetrics.averageProcessingTime + processingTime) / 2;
            this.performanceMetrics.successfulDetections += sortedResults.length;
            this.performanceMetrics.lastDetectionTime = new Date();

            return sortedResults;

        } catch (error) {
            console.error('Error in synthetic arbitrage detection:', error);
            return [];
        }
    }

    /**
     * Detect cross-sport synthetic arbitrage opportunities
     */
    async detectCrossSportOpportunities(
        marketsBySport: Record<string, SportMarket[]>,
        options?: {
            maxOpportunities?: number;
            minCorrelation?: number;
        }
    ): Promise<DetectionResult[]> {
        const startTime = performance.now();
        const minCorrelation = options?.minCorrelation ?? 0.2;

        // Find cross-sport pairs with similar characteristics
        const crossSportPairs: Array<[SportMarket, SportMarket]> = [];

        const sports = Object.keys(marketsBySport);
        for (let i = 0; i < sports.length; i++) {
            for (let j = i + 1; j < sports.length; j++) {
                const sport1Markets = marketsBySport[sports[i]];
                const sport2Markets = marketsBySport[sports[j]];

                // Find markets with similar timing and characteristics
                const pairs = this.findCrossSportPairs(sport1Markets, sport2Markets, minCorrelation);
                crossSportPairs.push(...pairs);
            }
        }

        // Analyze cross-sport pairs
        const detectionPromises = crossSportPairs.map(pair =>
            this.analyzeCrossSportPair(pair[0], pair[1])
        );

        const results = await Promise.all(detectionPromises);
        const validResults = results.filter(result => result !== null) as DetectionResult[];

        return validResults.sort((a, b) => b.score - a.score);
    }

    /**
     * Real-time detection for streaming market data
     */
    async detectRealTimeOpportunity(
        newMarket: SportMarket,
        existingMarkets: SportMarket[]
    ): Promise<DetectionResult | null> {
        const startTime = performance.now();

        // Find compatible existing markets
        const compatibleMarkets = existingMarkets.filter(market =>
            this.areMarketsCompatible(newMarket, market)
        );

        if (compatibleMarkets.length === 0) {
            return null;
        }

        // Analyze each compatible market
        for (const existingMarket of compatibleMarkets) {
            const result = await this.analyzePair(newMarket, existingMarket, true);

            if (result && result.score > 0.8) {
                // High-confidence opportunity found
                const processingTime = performance.now() - startTime;
                result.metadata.processingTime = processingTime;
                return result;
            }
        }

        return null;
    }

    /**
     * Get detection performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    /**
     * Update detection criteria
     */
    updateCriteria(newCriteria: Partial<DetectionCriteria>): void {
        Object.assign(this.detectionCriteria, newCriteria);
    }

    // ===== PRIVATE METHODS =====

    private findCandidatePairs(markets: SportMarket[]): Array<[SportMarket, SportMarket]> {
        const candidatePairs: Array<[SportMarket, SportMarket]> = [];

        // Group markets by game and sport for efficient pairing
        const marketsByGame = new Map<string, SportMarket[]>();

        for (const market of markets) {
            const key = `${market.gameId}_${market.sport}`;
            if (!marketsByGame.has(key)) {
                marketsByGame.set(key, []);
            }
            marketsByGame.get(key)!.push(market);
        }

        // Find pairs within each game
        for (const [gameKey, gameMarkets] of marketsByGame) {
            for (let i = 0; i < gameMarkets.length; i++) {
                for (let j = i + 1; j < gameMarkets.length; j++) {
                    const market1 = gameMarkets[i];
                    const market2 = gameMarkets[j];

                    if (this.areMarketsCompatible(market1, market2)) {
                        candidatePairs.push([market1, market2]);
                    }
                }
            }
        }

        return candidatePairs;
    }

    private areMarketsCompatible(market1: SportMarket, market2: SportMarket): boolean {
        // Same game and sport
        if (market1.gameId !== market2.gameId || market1.sport !== market2.sport) {
            return false;
        }

        // Different periods
        if (market1.period === market2.period) {
            return false;
        }

        // Check allowed period pairs
        const periodPair = this.detectionCriteria.allowedPeriodPairs.find(pair =>
            (pair.primary === market1.period && pair.secondary === market2.period) ||
            (pair.primary === market2.period && pair.secondary === market1.period)
        );

        if (!periodPair) {
            return false;
        }

        // Time difference check
        const timeDifference = Math.abs(market1.timestamp.getTime() - market2.timestamp.getTime()) / 1000;
        if (timeDifference > this.detectionCriteria.maxTimeDifference) {
            return false;
        }

        // Sportsbook exclusion check
        if (this.detectionCriteria.excludedSportsbooks.includes(market1.exchange) ||
            this.detectionCriteria.excludedSportsbooks.includes(market2.exchange)) {
            return false;
        }

        return true;
    }

    private async analyzePair(
        market1: SportMarket,
        market2: SportMarket,
        useCache: boolean
    ): Promise<DetectionResult | null> {
        const startTime = performance.now();

        try {
            // Get historical data for covariance calculation
            const historicalData = await this.getHistoricalData(market1, market2);

            if (historicalData.length < 30) {
                return null; // Insufficient data
            }

            // Calculate covariance matrix
            const covarianceResult = this.covarianceCalculator.calculateCovarianceMatrix(
                historicalData,
                { minSampleSize: 30, confidenceLevel: 0.95 }
            );

            // Check if correlation meets minimum threshold
            if (Math.abs(covarianceResult.correlation) < this.detectionCriteria.minCorrelation) {
                return null;
            }

            // Calculate optimal hedge ratio
            const hedgeResult = this.covarianceCalculator.calculateOptimalHedgeRatio(
                covarianceResult,
                { riskAversion: 0.5, transactionCosts: 0.001 }
            );

            // Calculate expected return (simplified for demo)
            const expectedReturn = this.calculateExpectedReturn(market1, market2, hedgeResult.optimalHedgeRatio);

            if (expectedReturn < this.detectionCriteria.minExpectedReturn) {
                return null;
            }

            // Create synthetic arbitrage object
            const arbitrage = this.createSyntheticArbitrage(
                market1,
                market2,
                expectedReturn as ExpectedReturn,
                hedgeResult.optimalHedgeRatio as HedgeRatio,
                covarianceResult.correlation as Correlation,
                covarianceResult.covariance as Covariance
            );

            // Calculate comprehensive metrics
            const score = this.calculateOpportunityScore(arbitrage, covarianceResult, hedgeResult);
            const profitability = this.calculateProfitabilityMetrics(arbitrage, covarianceResult);
            const execution = this.calculateExecutionMetrics(arbitrage, market1, market2);
            const risk = this.calculateRiskMetrics(arbitrage, covarianceResult, market1, market2);

            const processingTime = performance.now() - startTime;

            return {
                arbitrage,
                score,
                profitability,
                execution,
                risk,
                metadata: {
                    detectionTime: new Date(),
                    processingTime,
                    dataQuality: this.assessDataQuality(historicalData),
                    modelConfidence: Math.min(covarianceResult.confidence, hedgeResult.confidence)
                }
            };

        } catch (error) {
            console.error('Error analyzing market pair:', error);
            return null;
        }
    }

    private async analyzeCrossSportPair(
        market1: SportMarket,
        market2: SportMarket
    ): Promise<DetectionResult | null> {
        // Similar to analyzePair but with cross-sport considerations
        // Implementation would use cross-sport correlation models
        return null; // Placeholder for cross-sport analysis
    }

    private findCrossSportPairs(
        markets1: SportMarket[],
        markets2: SportMarket[],
        minCorrelation: number
    ): Array<[SportMarket, SportMarket]> {
        // Implementation for finding cross-sport pairs
        // Would use historical cross-sport correlation data
        return [];
    }

    private async getHistoricalData(
        market1: SportMarket,
        market2: SportMarket
    ): Promise<any[]> {
        // In real implementation, this would query historical data
        // For now, generate synthetic data
        return HistoricalDataFactory.createNBAData(market1.gameId, 100);
    }

    private calculateExpectedReturn(
        market1: SportMarket,
        market2: SportMarket,
        hedgeRatio: number
    ): number {
        // Simplified expected return calculation
        // In real implementation, would use actual odds and probabilities
        const spread1 = (market1 as any).line || 0;
        const spread2 = (market2 as any).line || 0;

        // Synthetic arbitrage return based on spread differences
        const syntheticReturn = Math.abs(spread1 - spread2) * 0.1; // Simplified
        const hedgedReturn = syntheticReturn * (1 - Math.abs(hedgeRatio));

        return hedgedReturn;
    }

    private createSyntheticArbitrage(
        market1: SportMarket,
        market2: SportMarket,
        expectedReturn: ExpectedReturn,
        hedgeRatio: HedgeRatio,
        correlation: Correlation,
        covariance: Covariance
    ): SyntheticArbitrageV1 {
        // Create market legs
        const leg1: MarketLeg = {
            market: market1,
            line: (market1 as any).line || 0,
            odds: -110, // Simplified
            juice: -110,
            side: 'home' as const,
            timestamp: market1.timestamp
        };

        const leg2: MarketLeg = {
            market: market2,
            line: (market2 as any).line || 0,
            odds: -110, // Simplified
            juice: -110,
            side: 'away' as const,
            timestamp: market2.timestamp
        };

        return {
            id: `synthetic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            markets: [leg1, leg2] as const,
            expectedReturn,
            hedgeRatio,
            confidence: 0.8 as Probability, // Simplified
            correlation,
            covariance
        };
    }

    private calculateOpportunityScore(
        arbitrage: SyntheticArbitrageV1,
        covarianceResult: any,
        hedgeResult: any
    ): number {
        // Comprehensive scoring algorithm
        const returnScore = Math.min(arbitrage.expectedReturn * 100, 1); // Normalize to 0-1
        const confidenceScore = arbitrage.confidence;
        const correlationScore = Math.abs(arbitrage.correlation);
        const hedgeScore = hedgeResult.hedgeEfficiency;
        const riskScore = 1 - Math.abs(hedgeResult.expectedHedgeReturn); // Lower risk = higher score

        // Weighted average
        return (returnScore * 0.3 + confidenceScore * 0.2 + correlationScore * 0.2 +
            hedgeScore * 0.15 + riskScore * 0.15);
    }

    private calculateProfitabilityMetrics(
        arbitrage: SyntheticArbitrageV1,
        covarianceResult: any
    ) {
        const expectedReturn = arbitrage.expectedReturn;
        const volatility = Math.sqrt(covarianceResult.variance1);

        return {
            expectedReturn,
            riskAdjustedReturn: expectedReturn / volatility,
            sharpeRatio: expectedReturn / volatility,
            maxDrawdown: volatility * 2 // Simplified
        };
    }

    private calculateExecutionMetrics(
        arbitrage: SyntheticArbitrageV1,
        market1: SportMarket,
        market2: SportMarket
    ) {
        const timeDifference = Math.abs(market1.timestamp.getTime() - market2.timestamp.getTime()) / 1000;

        let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
        if (timeDifference > 60) difficulty = 'medium';
        if (timeDifference > 180) difficulty = 'hard';

        return {
            difficulty,
            estimatedTimeToExecute: difficulty === 'easy' ? 100 : difficulty === 'medium' ? 500 : 2000,
            requiredCapital: 10000, // Simplified
            liquidityScore: 0.8 // Simplified
        };
    }

    private calculateRiskMetrics(
        arbitrage: SyntheticArbitrageV1,
        covarianceResult: any,
        market1: SportMarket,
        market2: SportMarket
    ) {
        return {
            volatility: Math.sqrt(covarianceResult.variance1),
            correlationRisk: 1 - Math.abs(arbitrage.correlation),
            liquidityRisk: 0.2, // Simplified
            executionRisk: 0.1  // Simplified
        };
    }

    private assessDataQuality(historicalData: any[]): number {
        // Simplified data quality assessment
        if (historicalData.length > 200) return 0.9;
        if (historicalData.length > 100) return 0.8;
        if (historicalData.length > 50) return 0.7;
        return 0.6;
    }
}

/**
 * Factory for creating detector instances with different strategies
 */
export class SyntheticArbitrageDetectorFactory {
    /**
     * Create detector for conservative strategy
     */
    static createConservativeDetector(): SyntheticArbitrageDetector {
        return new SyntheticArbitrageDetector({
            minExpectedReturn: 0.002,  // 0.2% minimum
            minConfidence: 0.8,        // 80% confidence
            minCorrelation: 0.5,       // 50% correlation
            maxHedgeRatio: 0.6,        // 60% maximum
            minLiquidity: 50000        // $50k minimum
        });
    }

    /**
     * Create detector for aggressive strategy
     */
    static createAggressiveDetector(): SyntheticArbitrageDetector {
        return new SyntheticArbitrageDetector({
            minExpectedReturn: 0.0005, // 0.05% minimum
            minConfidence: 0.6,        // 60% confidence
            minCorrelation: 0.2,       // 20% correlation
            maxHedgeRatio: 0.9,        // 90% maximum
            minLiquidity: 5000         // $5k minimum
        });
    }

    /**
     * Create detector for high-frequency trading
     */
    static createHFTDetector(): SyntheticArbitrageDetector {
        return new SyntheticArbitrageDetector({
            minExpectedReturn: 0.0003, // 0.03% minimum
            minConfidence: 0.5,        // 50% confidence
            minCorrelation: 0.15,      // 15% correlation
            maxHedgeRatio: 0.95,       // 95% maximum
            minLiquidity: 1000,        // $1k minimum
            maxTimeDifference: 30      // 30 seconds maximum
        });
    }

    /**
     * Create detector for cross-sport strategies
     */
    static createCrossSportDetector(): SyntheticArbitrageDetector {
        return new SyntheticArbitrageDetector({
            minExpectedReturn: 0.001,  // 0.1% minimum
            minConfidence: 0.7,        // 70% confidence
            minCorrelation: 0.1,       // 10% correlation (lower for cross-sport)
            maxHedgeRatio: 0.7,        // 70% maximum
            minLiquidity: 25000        // $25k minimum
        });
    }
}

export default SyntheticArbitrageDetector;
