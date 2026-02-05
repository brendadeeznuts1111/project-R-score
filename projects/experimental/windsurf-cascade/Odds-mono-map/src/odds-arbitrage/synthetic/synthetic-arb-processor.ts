#!/usr/bin/env bun
/**
 * [DOMAIN][ARBITRAGE][TYPE][PROCESSOR][SCOPE][SYNTHETIC][META][EXECUTION][#REF]synthetic-arb-processor
 * 
 * Synthetic Arbitrage Stream Processor
 * Main orchestrator for real-time synthetic arbitrage detection and execution
 * 
 * @fileoverview Stream processing pipeline with covariance updates and execution
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category odds-arbitrage
 * @tags synthetic-arb,processor,stream,execution,covariance
 */

import { CovarianceEngine, SyntheticRelationship } from './covariance-engine.js';
import { SyntheticArbDetector, SyntheticArbOpportunity, MarketTick, GameContext } from './synthetic-arb-detector.js';

export interface ProcessingConfig {
    maxLatencyDelta: number;      // Max time gap between markets (ms)
    minConfidence: number;        // Minimum relationship confidence
    minCorrelation: number;       // Minimum correlation threshold
    maxPositionSize: number;      // Maximum position size
    enableExecution: boolean;     // Whether to actually execute trades
}

export interface ProcessingStats {
    opportunitiesDetected: number;
    opportunitiesExecuted: number;
    totalPnL: number;
    averageLatency: number;
    covarianceUpdates: number;
    processingErrors: number;
}

export class MergeIterator implements AsyncIterable<[MarketTick, MarketTick]> {
    private primaryBuffer: MarketTick[] = [];
    private hedgeBuffer: MarketTick[] = [];
    private toleranceMs: number;
    private keyFn: (tick: MarketTick) => string;

    constructor(
        private primary: AsyncIterable<MarketTick>,
        private hedge: AsyncIterable<MarketTick>,
        options: { toleranceMs: number; keyFn: (tick: MarketTick) => string }
    ) {
        this.toleranceMs = options.toleranceMs;
        this.keyFn = options.keyFn;
    }

    async *[Symbol.asyncIterator](): AsyncIterator<[MarketTick, MarketTick]> {
        const primaryIter = this.primary[Symbol.asyncIterator]();
        const hedgeIter = this.hedge[Symbol.asyncIterator]();

        // Start consuming both streams
        const primaryPromise = primaryIter.next();
        const hedgePromise = hedgeIter.next();

        while (true) {
            const [primaryResult, hedgeResult] = await Promise.all([primaryPromise, hedgePromise]);

            if (primaryResult.done || hedgeResult.done) {
                break;
            }

            const primaryTick = primaryResult.value;
            const hedgeTick = hedgeResult.value;

            // Check if ticks are within tolerance
            const timeDiff = Math.abs(primaryTick.timestamp - hedgeTick.timestamp);
            if (timeDiff <= this.toleranceMs) {
                yield [primaryTick, hedgeTick];
            }

            // Continue consuming streams
            // (In a real implementation, you'd need more sophisticated buffering)
        }
    }
}

export class SyntheticRiskManager {
    private readonly maxExposureByCorrelation = new Map([
        [0.9, 50000],
        [0.8, 25000],
        [0.7, 10000]
    ]);

    validate(opportunity: SyntheticArbOpportunity): boolean {
        // Check correlation tier limits
        const absCorrelation = Math.abs(opportunity.correlation);
        let maxExposure = 0;

        for (const [threshold, exposure] of this.maxExposureByCorrelation) {
            if (absCorrelation >= threshold) {
                maxExposure = exposure;
                break;
            }
        }

        if (maxExposure === 0) {
            return false; // Below minimum correlation
        }

        // Check position size
        const totalExposure = opportunity.requiredHedgeSize + 1000; // primary stake
        if (totalExposure > maxExposure) {
            return false;
        }

        // Check tail risk
        if (opportunity.tailRisk > 5.0) {
            return false;
        }

        return true;
    }

    calculatePositionSize(
        opportunity: SyntheticArbOpportunity,
        maxBankroll: number = 100000
    ): number {
        // Covariance-adjusted Kelly criterion
        const edge = opportunity.expectedValue / 1000; // Edge per dollar
        const variance = Math.pow(opportunity.tailRisk / 100, 2);
        const correlationPenalty = Math.pow(opportunity.correlation, 2);
        const tailRiskPenalty = 1 - (opportunity.tailRisk / 100);

        const kelly = (edge / variance) * correlationPenalty * tailRiskPenalty;
        const conservativeKelly = Math.min(kelly * 0.5, 0.25); // Half Kelly, max 25%

        return Math.max(0, conservativeKelly * maxBankroll);
    }
}

export class SyntheticArbProcessor {
    private covarianceEngine = new CovarianceEngine();
    private detector = new SyntheticArbDetector();
    private riskManager = new SyntheticRiskManager();
    private stats: ProcessingStats = {
        opportunitiesDetected: 0,
        opportunitiesExecuted: 0,
        totalPnL: 0,
        averageLatency: 0,
        covarianceUpdates: 0,
        processingErrors: 0
    };

    constructor(private config: ProcessingConfig) { }

    /**
     * Process cross-market streams for synthetic arbitrage opportunities
     */
    async processCrossMarketStream(
        primaryStream: AsyncIterable<MarketTick>,
        hedgeStream: AsyncIterable<MarketTick>
    ): Promise<void> {
        console.log('🚀 Starting synthetic arbitrage stream processing...');

        const merged = this.mergeStreams(primaryStream, hedgeStream);
        const latencyMeasurements: number[] = [];

        try {
            for await (const [primary, hedge] of merged) {
                const startTime = Date.now();

                try {
                    // 1. Update covariance matrix in real-time
                    this.covarianceEngine.updatePrice(
                        `${primary.gameId}-${primary.market}`,
                        primary.odds.home,
                        primary.timestamp
                    );
                    this.covarianceEngine.updatePrice(
                        `${hedge.gameId}-${hedge.market}`,
                        hedge.odds.home,
                        hedge.timestamp
                    );
                    this.stats.covarianceUpdates++;

                    // 2. Update detector with latest relationships
                    const relationships = this.covarianceEngine.getHighConfidenceRelationships(
                        this.config.minConfidence
                    );
                    this.detector.updateRelationships(relationships);

                    // 3. Detect mispricing
                    const opportunity = this.detector.detect(primary, hedge);

                    if (opportunity) {
                        this.stats.opportunitiesDetected++;
                        console.log(`🎯 Opportunity detected: ${opportunity.id} (z-score: ${opportunity.mispricing.toFixed(2)})`);

                        // 4. Risk assessment
                        const approved = this.riskManager.validate(opportunity);

                        if (!approved) {
                            console.log(`❌ Opportunity rejected: ${opportunity.id}`);
                            this.logRejected(opportunity);
                            continue;
                        }

                        // 5. Calculate optimal position size
                        const positionSize = this.riskManager.calculatePositionSize(opportunity);

                        // 6. Execute with covariance-adjusted sizing
                        if (this.config.enableExecution) {
                            await this.executeSyntheticArb(opportunity, positionSize);
                        } else {
                            console.log(`📊 Would execute: ${opportunity.id} (size: $${positionSize.toFixed(2)})`);
                        }
                    }

                    // Track latency
                    const processingTime = Date.now() - startTime;
                    latencyMeasurements.push(processingTime);

                } catch (error) {
                    this.stats.processingErrors++;
                    console.error(`❌ Processing error:`, error);
                }
            }
        } finally {
            // Calculate final statistics
            this.stats.averageLatency = latencyMeasurements.length > 0
                ? latencyMeasurements.reduce((sum, lat) => sum + lat, 0) / latencyMeasurements.length
                : 0;

            this.printFinalStats();
        }
    }

    /**
     * Merge two streams with temporal synchronization
     */
    private mergeStreams(
        primary: AsyncIterable<MarketTick>,
        hedge: AsyncIterable<MarketTick>
    ): AsyncIterable<[MarketTick, MarketTick]> {
        return new MergeIterator(primary, hedge, {
            toleranceMs: this.config.maxLatencyDelta,
            keyFn: tick => `${tick.gameId}-${tick.timestamp}`
        });
    }

    /**
     * Execute synthetic arbitrage opportunity
     */
    private async executeSyntheticArb(
        opportunity: SyntheticArbOpportunity,
        positionSize: number
    ): Promise<void> {
        console.log(`⚡ Executing synthetic arb: ${opportunity.id}`);

        try {
            // In a real implementation, this would:
            // 1. Place primary market bet
            // 2. Place hedge market bet with calculated size
            // 3. Monitor execution and slippage
            // 4. Update position tracking

            this.stats.opportunitiesExecuted++;

            // Simulate PnL (would be real in production)
            const simulatedPnL = opportunity.expectedValue * (positionSize / 1000);
            this.stats.totalPnL += simulatedPnL;

            console.log(`✅ Executed: ${opportunity.id} (PnL: $${simulatedPnL.toFixed(2)})`);

        } catch (error) {
            console.error(`❌ Execution failed for ${opportunity.id}:`, error);
            this.stats.processingErrors++;
        }
    }

    /**
     * Log rejected opportunities for analysis
     */
    private logRejected(opportunity: SyntheticArbOpportunity): void {
        // In production, this would go to a monitoring system
        const reasons: string[] = [];

        if (opportunity.confidence < 0.7) reasons.push('low confidence');
        if (Math.abs(opportunity.correlation) < 0.7) reasons.push('low correlation');
        if (opportunity.tailRisk > 5.0) reasons.push('high tail risk');

        console.log(`   Rejection reasons: ${reasons.join(', ')}`);
    }

    /**
     * Print final processing statistics
     */
    private printFinalStats(): void {
        console.log('\n📊 Synthetic Arbitrage Processing Statistics:');
        console.log('='.repeat(50));
        console.log(`Opportunities detected: ${this.stats.opportunitiesDetected}`);
        console.log(`Opportunities executed: ${this.stats.opportunitiesExecuted}`);
        console.log(`Total PnL: $${this.stats.totalPnL.toFixed(2)}`);
        console.log(`Average latency: ${this.stats.averageLatency.toFixed(2)}ms`);
        console.log(`Covariance updates: ${this.stats.covarianceUpdates}`);
        console.log(`Processing errors: ${this.stats.processingErrors}`);

        if (this.stats.opportunitiesDetected > 0) {
            const executionRate = (this.stats.opportunitiesExecuted / this.stats.opportunitiesDetected) * 100;
            console.log(`Execution rate: ${executionRate.toFixed(1)}%`);
        }

        // Covariance engine stats
        const covStats = this.covarianceEngine.getStatistics();
        console.log(`\n🔗 Covariance Engine: ${covStats.totalRelationships} relationships, ${covStats.highConfidenceRelationships} high confidence`);

        // Detector stats
        const detectorStats = this.detector.getStatistics();
        console.log(`🎯 Detector: ${detectorStats.averageCorrelation.toFixed(3)} avg correlation, ${detectorStats.averageConfidence.toFixed(3)} avg confidence`);
    }

    /**
     * Get current processing statistics
     */
    getStatistics(): ProcessingStats {
        return { ...this.stats };
    }

    /**
     * Reset all statistics
     */
    resetStatistics(): void {
        this.stats = {
            opportunitiesDetected: 0,
            opportunitiesExecuted: 0,
            totalPnL: 0,
            averageLatency: 0,
            covarianceUpdates: 0,
            processingErrors: 0
        };
    }
}
