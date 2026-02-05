#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][SYNTHETIC][META][ARBITRAGE][#REF]synthetic-arb-demo
 * 
 * Synthetic Arbitrage Demonstration
 * Showcases cross-market statistical arbitrage detection and execution
 * 
 * @fileoverview Complete synthetic arbitrage system demonstration
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category demos
 * @tags synthetic-arb,demonstration,covariance,statistical-arbitrage,cross-market
 */

import { CovarianceEngine, SyntheticRelationship } from '../../src/odds-arbitrage/synthetic/covariance-engine.js';
import { SyntheticArbDetector, MarketTick, GameContext } from '../../src/odds-arbitrage/synthetic/synthetic-arb-detector.js';
import { SyntheticArbProcessor, ProcessingConfig } from '../../src/odds-arbitrage/synthetic/synthetic-arb-processor.js';

class SyntheticArbDemo {
    private covarianceEngine = new CovarianceEngine();
    private detector = new SyntheticArbDetector();

    async runCompleteDemo(): Promise<void> {
        console.log('🎯 Synthetic Arbitrage System Demonstration\n');

        // Demo 1: Covariance Engine
        await this.demonstrateCovarianceEngine();

        // Demo 2: Opportunity Detection
        await this.demonstrateOpportunityDetection();

        // Demo 3: Stream Processing
        await this.demonstrateStreamProcessing();

        // Demo 4: Risk Management
        await this.demonstrateRiskManagement();

        console.log('\n✅ Synthetic Arbitrage Demo Complete!');
    }

    private async demonstrateCovarianceEngine(): Promise<void> {
        console.log('📊 1. Covariance Engine Demo');
        console.log('─'.repeat(40));

        // Simulate price data for correlated markets
        const primaryPrices = this.generateCorrelatedPriceSeries(100, 100, 0.82, 0.28);
        const hedgePrices = this.generateCorrelatedPriceSeries(100, 350, 0.82, 1.0);

        try {
            const params = this.covarianceEngine.calculateHedgeRatio(primaryPrices, hedgePrices);

            console.log(`✅ Hedge Ratio Analysis:`);
            console.log(`   Ratio: ${params.ratio.toFixed(4)}`);
            console.log(`   Correlation: ${params.correlation.toFixed(3)}`);
            console.log(`   Confidence: ${(params.confidence * 100).toFixed(1)}%`);
            console.log(`   Residual Std Dev: ${params.residualStdDev.toFixed(4)}`);

            // Update engine with simulated data
            for (let i = 0; i < primaryPrices.length; i++) {
                this.covarianceEngine.updatePrice('NBA-1Q-LAL', primaryPrices[i]);
                this.covarianceEngine.updatePrice('NBA-FULL-LAL', hedgePrices[i]);
            }

            const stats = this.covarianceEngine.getStatistics();
            console.log(`📈 Engine Stats: ${stats.totalRelationships} relationships, ${stats.averageCorrelation.toFixed(3)} avg correlation`);

        } catch (error) {
            console.log(`❌ Covariance calculation failed: ${error.message}`);
        }
    }

    private async demonstrateOpportunityDetection(): Promise<void> {
        console.log('\n🎯 2. Opportunity Detection Demo');
        console.log('─'.repeat(40));

        // Create synthetic relationship
        const relationship: SyntheticRelationship = {
            primaryMarket: 'NBA-1Q-LAL',
            hedgeMarket: 'NBA-FULL-LAL',
            covariance: 0.082,
            correlation: 0.82,
            hedgeRatio: 0.28,
            beta: 0.28,
            halfLife: 300000,
            residualStdDev: 0.15,
            confidence: 0.85,
            lastUpdated: Date.now()
        };

        this.detector.updateRelationships([relationship]);

        // Create market ticks with mispricing
        const primaryTick: MarketTick = {
            gameId: 'LAL-BOS-2024-11-19',
            timestamp: Date.now(),
            exchange: 'draftkings',
            odds: { home: -2.5, away: 2.5 },
            market: 'spread-1q',
            sport: 'nba'
        };

        const hedgeTick: MarketTick = {
            gameId: 'LAL-BOS-2024-11-19',
            timestamp: Date.now() - 10,
            exchange: 'draftkings',
            odds: { home: -8.5, away: 8.5 },
            market: 'spread-full',
            sport: 'nba'
        };

        const gameContext: GameContext = {
            period: 1,
            timeRemaining: 8.5,
            pace: 102,
            runDifferential: 0,
            keyPlayerFouls: 0,
            homeScore: 25,
            awayScore: 22
        };

        const opportunity = this.detector.detect(primaryTick, hedgeTick, gameContext);

        if (opportunity) {
            console.log(`🎉 Opportunity Found!`);
            console.log(`   ID: ${opportunity.id}`);
            console.log(`   Mispricing: ${opportunity.mispricing.toFixed(2)}σ`);
            console.log(`   Expected Value: $${opportunity.expectedValue.toFixed(2)}`);
            console.log(`   Hedge Ratio: ${opportunity.hedgeRatio.toFixed(3)}`);
            console.log(`   Required Hedge: $${opportunity.requiredHedgeSize.toFixed(2)}`);
            console.log(`   Tail Risk: ${opportunity.tailRisk.toFixed(1)}%`);
            console.log(`   Confidence: ${(opportunity.confidence * 100).toFixed(1)}%`);
        } else {
            console.log(`⚠️ No opportunity detected in current market conditions`);
        }
    }

    private async demonstrateStreamProcessing(): Promise<void> {
        console.log('\n🔄 3. Stream Processing Demo');
        console.log('─'.repeat(40));

        const config: ProcessingConfig = {
            maxLatencyDelta: 50,
            minConfidence: 0.7,
            minCorrelation: 0.7,
            maxPositionSize: 25000,
            enableExecution: false // Demo mode - no real execution
        };

        const processor = new SyntheticArbProcessor(config);

        // Simulate market streams
        const primaryStream = this.createMockMarketStream('NBA-1Q-LAL', -2.5);
        const hedgeStream = this.createMockMarketStream('NBA-FULL-LAL', -8.5);

        console.log('🚀 Starting stream processing (10 ticks)...');

        // Process a few ticks for demo
        let tickCount = 0;
        const mergedStream = this.createMergedStream(primaryStream, hedgeStream);

        for await (const [primary, hedge] of mergedStream) {
            if (tickCount >= 10) break;

            console.log(`📈 Tick ${tickCount + 1}: Primary ${primary.odds.home}, Hedge ${hedge.odds.home}`);
            tickCount++;
        }

        const stats = processor.getStatistics();
        console.log(`📊 Processing Stats: ${stats.covarianceUpdates} covariance updates`);
    }

    private async demonstrateRiskManagement(): Promise<void> {
        console.log('\n🛡️ 4. Risk Management Demo');
        console.log('─'.repeat(40));

        // Test different correlation tiers
        const correlationTests = [
            { correlation: 0.95, expected: 'Pass' },
            { correlation: 0.85, expected: 'Pass' },
            { correlation: 0.75, expected: 'Pass' },
            { correlation: 0.65, expected: 'Reject' },
            { correlation: 0.55, expected: 'Reject' }
        ];

        console.log('🔍 Testing correlation tier validation:');

        correlationTests.forEach(test => {
            const opportunity = this.createMockOpportunity(test.correlation);
            const isValid = this.detector.validateOpportunity(opportunity);
            const status = isValid === (test.expected === 'Pass') ? '✅' : '❌';
            console.log(`   ${status} ρ=${test.correlation}: ${test.expected} (${isValid ? 'Valid' : 'Invalid'})`);
        });

        // Position sizing demo
        console.log('\n💰 Position sizing with Kelly criterion:');
        const edgeTests = [
            { edge: 0.01, correlation: 0.9, expectedSize: 'Conservative' },
            { edge: 0.03, correlation: 0.9, expectedSize: 'Moderate' },
            { edge: 0.05, correlation: 0.9, expectedSize: 'Aggressive' }
        ];

        edgeTests.forEach(test => {
            // Simplified Kelly calculation for demo
            const kellyFraction = Math.min((test.edge / 0.25) * Math.pow(test.correlation, 2) * 0.5, 0.25);
            const positionSize = kellyFraction * 100000;
            console.log(`   Edge ${(test.edge * 100).toFixed(1)}%, ρ=${test.correlation}: $${positionSize.toFixed(0)} (${test.expectedSize})`);
        });
    }

    private generateCorrelatedPriceSeries(
        length: number,
        basePrice: number,
        correlation: number,
        volatility: number
    ): number[] {
        const prices: number[] = [basePrice];

        for (let i = 1; i < length; i++) {
            const randomShock = (Math.random() - 0.5) * volatility;
            const trend = Math.sin(i / 20) * 0.1; // Add some trend
            const change = randomShock + trend;
            prices.push(Math.max(prices[i - 1] + change, 0.1));
        }

        return prices;
    }

    private createMockMarketStream(market: string, baseOdds: number): AsyncIterable<MarketTick> {
        const ticks: MarketTick[] = [];
        const gameId = 'DEMO-GAME-001';

        for (let i = 0; i < 20; i++) {
            ticks.push({
                gameId,
                timestamp: Date.now() + i * 1000,
                exchange: 'demo-exchange',
                odds: { home: baseOdds + (Math.random() - 0.5) * 0.5, away: -baseOdds },
                market,
                sport: 'nba'
            });
        }

        return (async function* () {
            for (const tick of ticks) {
                yield tick;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        })();
    }

    private async* createMergedStream(
        primary: AsyncIterable<MarketTick>,
        hedge: AsyncIterable<MarketTick>
    ): AsyncIterable<[MarketTick, MarketTick]> {
        const primaryIter = primary[Symbol.asyncIterator]();
        const hedgeIter = hedge[Symbol.asyncIterator]();

        while (true) {
            const primaryResult = await primaryIter.next();
            const hedgeResult = await hedgeIter.next();

            if (primaryResult.done || hedgeResult.done) break;

            yield [primaryResult.value, hedgeResult.value];
        }
    }

    private createMockOpportunity(correlation: number): any {
        return {
            id: 'demo-opportunity',
            confidence: 0.8,
            correlation,
            mispricing: 3.0,
            expectedValue: 50,
            tailRisk: 3.0
        };
    }
}

// Main execution
async function main() {
    const demo = new SyntheticArbDemo();
    await demo.runCompleteDemo();
}

if (import.meta.main) {
    main().catch(console.error);
}
