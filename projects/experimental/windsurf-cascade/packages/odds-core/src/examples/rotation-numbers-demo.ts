// packages/odds-core/src/examples/rotation-numbers-demo.ts - Comprehensive rotation number system examples

import type {
    RotationNumber,
    RotationMarket,
    RotationArbitrageOpportunity,
    RotationAnalytics,
    Sport,
    Sportsbook,
    MarketType
} from '../types/rotation-numbers';
import { SyntheticArbitrageV1Factory, SyntheticArbitrageV2Factory, SyntheticArbitrageV3Factory } from '../../testing/src/factories/incremental-synthetic-factory';
import { RotationArbitrageDetector, RotationArbitrageDetectorFactory } from '../arbitrage/rotation-arbitrage';
import { RotationAnalyticsEngine, RotationAnalyticsEngineFactory } from '../analytics/rotation-analytics';
import { generateId } from '../utils/index-streamlined';

/**
 * Comprehensive rotation number system demonstrations
 */
export class RotationNumbersDemo {

    /**
     * Example 1: Create rotation numbers for NBA game
     */
    static createNBARotationNumbers(): RotationNumber[] {
        console.info('🏀 Creating NBA Rotation Numbers\n');

        const gameId = 'NBA_2024_01_15_LAL_BOS';
        const eventDate = new Date('2024-01-15T20:00:00Z');

        // Lakers vs Celtics rotation numbers from different sportsbooks
        const rotationNumbers: RotationNumber[] = [
            {
                id: generateId('rotation'),
                sport: 'basketball',
                league: 'NBA',
                eventDate,
                rotation: 123,
                teams: { home: 'Los Angeles Lakers', away: 'Boston Celtics' },
                markets: [
                    {
                        id: generateId('market'),
                        marketType: 'spread',
                        rotation: 123,
                        line: -2.5,
                        odds: -110,
                        juice: -110,
                        isLive: false,
                        volume: 50000,
                        sharp: true,
                        lastUpdated: new Date()
                    },
                    {
                        id: generateId('market'),
                        marketType: 'total',
                        rotation: 124,
                        line: 225.5,
                        odds: -105,
                        juice: -105,
                        isLive: false,
                        volume: 35000,
                        sharp: false,
                        lastUpdated: new Date()
                    }
                ],
                sportsbook: 'draftkings',
                isActive: true,
                lastUpdated: new Date()
            },
            {
                id: generateId('rotation'),
                sport: 'basketball',
                league: 'NBA',
                eventDate,
                rotation: 456,
                teams: { home: 'Los Angeles Lakers', away: 'Boston Celtics' },
                markets: [
                    {
                        id: generateId('market'),
                        marketType: 'spread',
                        rotation: 456,
                        line: -3.0,
                        odds: -108,
                        juice: -108,
                        isLive: false,
                        volume: 45000,
                        sharp: true,
                        lastUpdated: new Date()
                    },
                    {
                        id: generateId('market'),
                        marketType: 'total',
                        rotation: 457,
                        line: 226.0,
                        odds: -110,
                        juice: -110,
                        isLive: false,
                        volume: 32000,
                        sharp: false,
                        lastUpdated: new Date()
                    }
                ],
                sportsbook: 'fanduel',
                isActive: true,
                lastUpdated: new Date()
            },
            {
                id: generateId('rotation'),
                sport: 'basketball',
                league: 'NBA',
                eventDate,
                rotation: 789,
                teams: { home: 'Los Angeles Lakers', away: 'Boston Celtics' },
                markets: [
                    {
                        id: generateId('market'),
                        marketType: 'spread',
                        rotation: 789,
                        line: -2.0,
                        odds: -115,
                        juice: -115,
                        isLive: false,
                        volume: 25000,
                        sharp: false,
                        lastUpdated: new Date()
                    }
                ],
                sportsbook: 'betmgm',
                isActive: true,
                lastUpdated: new Date()
            }
        ];

        console.info(`✅ Created ${rotationNumbers.length} rotation numbers for NBA game`);
        rotationNumbers.forEach(rn => {
            console.info(`   ${rn.sportsbook}: Rotation ${rn.rotation} - ${rn.markets.length} markets`);
        });

        return rotationNumbers;
    }

    /**
     * Example 2: Rotation arbitrage detection
     */
    static async demonstrateRotationArbitrage(): Promise<void> {
        console.info('\n🎯 Rotation Arbitrage Detection Demo\n');

        // Create rotation numbers
        const rotationNumbers = this.createNBARotationNumbers();

        // Create arbitrage detector
        const detector = RotationArbitrageDetectorFactory.createConservativeDetector();

        console.info('🔍 Analyzing rotation numbers for arbitrage opportunities...');

        // Find opportunities
        const startTime = performance.now();
        const opportunities = await detector.findOpportunities(rotationNumbers);
        const detectionTime = performance.now() - startTime;

        console.info(`\n🎯 Detection Results:`);
        console.info(`   Processing Time: ${detectionTime.toFixed(2)}ms`);
        console.info(`   Opportunities Found: ${opportunities.length}`);

        if (opportunities.length > 0) {
            console.info('\n🏆 Arbitrage Opportunities:');
            opportunities.forEach((opp, index) => {
                console.info(`   ${index + 1}. ${opp.id}`);
                console.info(`      Expected Return: ${opp.expectedReturn.percent.toFixed(3)}%`);
                console.info(`      Confidence: ${(opp.confidence * 100).toFixed(1)}%`);
                console.info(`      Sportsbooks: ${opp.sportsbooks.join(', ')}`);
                console.info(`      Risk Score: ${opp.riskMetrics.riskScore.toFixed(2)}`);
                console.info(`      Markets: ${opp.markets.length}`);
            });
        } else {
            console.info('   No arbitrage opportunities found with current criteria');
        }

        // Demonstrate validation
        if (opportunities.length > 0) {
            const validation = detector.validateOpportunity(opportunities[0]);
            console.info(`\n📋 Opportunity Validation:`);
            console.info(`   Valid: ${validation.isValid}`);
            if (validation.errors.length > 0) {
                console.info(`   Errors: ${validation.errors.join(', ')}`);
            }
            if (validation.warnings.length > 0) {
                console.info(`   Warnings: ${validation.warnings.join(', ')}`);
            }
        }
    }

    /**
     * Example 3: Rotation analytics engine
     */
    static async demonstrateRotationAnalytics(): Promise<void> {
        console.info('\n📊 Rotation Analytics Engine Demo\n');

        // Create analytics engine
        const analyticsEngine = RotationAnalyticsEngineFactory.createDefaultEngine();

        // Create rotation number
        const rotationNumber = this.createNBARotationNumbers()[0];
        console.info(`📈 Creating analytics for rotation ${rotationNumber.rotation} (${rotationNumber.sportsbook})`);

        // Initialize analytics
        const analytics = analyticsEngine.createAnalytics(rotationNumber);
        console.info('✅ Analytics initialized');

        // Simulate price updates
        console.info('\n📈 Simulating price updates...');
        for (let i = 0; i < 10; i++) {
            const pricePoint = {
                timestamp: new Date(Date.now() - (9 - i) * 60000), // Last 10 minutes
                price: -110 + i * 2, // Price moving from -110 to -92
                sportsbook: rotationNumber.sportsbook,
                marketType: 'spread' as MarketType
            };

            analyticsEngine.addPricePoint(rotationNumber.id, pricePoint);
        }

        // Simulate volume updates
        console.info('📊 Simulating volume updates...');
        for (let i = 0; i < 10; i++) {
            const volumePoint = {
                timestamp: new Date(Date.now() - (9 - i) * 60000),
                volume: 50000 + i * 5000, // Volume increasing
                sportsbook: rotationNumber.sportsbook,
                marketType: 'spread' as MarketType
            };

            analyticsEngine.addVolumePoint(rotationNumber.id, volumePoint);
        }

        // Get current analytics
        const currentAnalytics = analyticsEngine.getAnalytics(rotationNumber.id);
        if (currentAnalytics) {
            console.info('\n📊 Current Analytics:');
            console.info(`   Price History Points: ${currentAnalytics.priceHistory.length}`);
            console.info(`   Volume History Points: ${currentAnalytics.volumeHistory.length}`);
            console.info(`   Sharp Movements: ${currentAnalytics.sharpMovement.length}`);
            console.info(`   Price Efficiency: ${(currentAnalytics.efficiency.priceEfficiency * 100).toFixed(1)}%`);
            console.info(`   Volume Efficiency: ${(currentAnalytics.efficiency.volumeEfficiency * 100).toFixed(1)}%`);
            console.info(`   Arbitrage Frequency: ${currentAnalytics.efficiency.arbitrageFrequency.toFixed(1)} per hour`);
            console.info(`   Market Impact: ${(currentAnalytics.efficiency.marketImpact * 100).toFixed(2)}%`);

            if (currentAnalytics.sharpMovement.length > 0) {
                console.info('\n⚡ Sharp Movements:');
                currentAnalytics.sharpMovement.forEach(movement => {
                    console.info(`   ${movement.timestamp.toISOString()}: ${movement.fromPrice} → ${movement.toPrice} (${movement.sportsbook})`);
                });
            }
        }

        // Get analytics summary
        const summary = analyticsEngine.getAnalyticsSummary([rotationNumber.id]);
        console.info('\n📋 Analytics Summary:');
        console.info(`   Total Rotation Numbers: ${summary.totalRotationNumbers}`);
        console.info(`   Average Price Efficiency: ${(summary.avgPriceEfficiency * 100).toFixed(1)}%`);
        console.info(`   Average Volume Efficiency: ${(summary.avgVolumeEfficiency * 100).toFixed(1)}%`);
        console.info(`   Total Arbitrage Opportunities: ${summary.totalArbitrageOpportunities}`);
        console.info(`   Average Market Impact: ${(summary.avgMarketImpact * 100).toFixed(2)}%`);
    }

    /**
     * Example 4: Multi-sportsbook arbitrage detection
     */
    static async demonstrateMultiSportsbookArbitrage(): Promise<void> {
        console.info('\n🏪 Multi-Sportsbook Arbitrage Demo\n');

        // Create rotation numbers for multiple sportsbooks
        const rotationNumbers = this.createMultiSportsbookRotationNumbers();

        // Create aggressive detector for more opportunities
        const detector = RotationArbitrageDetectorFactory.createAggressiveDetector();

        console.info(`🔍 Analyzing ${rotationNumbers.length} rotation numbers across ${[...new Set(rotationNumbers.map(rn => rn.sportsbook))].length} sportsbooks...`);

        // Find opportunities
        const opportunities = await detector.findOpportunities(rotationNumbers);

        console.info(`\n🎯 Multi-Sportsbook Results:`);
        console.info(`   Sportsbooks Analyzed: ${[...new Set(rotationNumbers.map(rn => rn.sportsbook))].join(', ')}`);
        console.info(`   Opportunities Found: ${opportunities.length}`);

        if (opportunities.length > 0) {
            console.info('\n🏆 Top Opportunities:');
            opportunities.slice(0, 3).forEach((opp, index) => {
                console.info(`   ${index + 1}. ${opp.id}`);
                console.info(`      Expected Return: ${opp.expectedReturn.percent.toFixed(3)}%`);
                console.info(`      Sportsbooks: ${opp.sportsbooks.join(' vs ')}`);
                console.info(`      Markets: ${opp.markets.map(m => `${m.market.marketType} (${m.price})`).join(', ')}`);
                console.info(`      Confidence: ${(opp.confidence * 100).toFixed(1)}%`);
            });
        }
    }

    /**
     * Example 5: High-frequency rotation analytics
     */
    static async demonstrateHighFrequencyAnalytics(): Promise<void> {
        console.info('\n⚡ High-Frequency Analytics Demo\n');

        // Create HFT analytics engine
        const analyticsEngine = RotationAnalyticsEngineFactory.createHighFrequencyEngine();

        // Create rotation number
        const rotationNumber = this.createNBARotationNumbers()[0];
        const analytics = analyticsEngine.createAnalytics(rotationNumber);

        console.info('⚡ Simulating high-frequency price updates (1 per second)...');

        // Simulate rapid price updates
        const startTime = performance.now();
        for (let i = 0; i < 100; i++) {
            const pricePoint = {
                timestamp: new Date(Date.now() - (99 - i) * 1000), // Last 100 seconds
                price: -110 + Math.sin(i * 0.1) * 10, // Oscillating price
                sportsbook: rotationNumber.sportsbook,
                marketType: 'spread' as MarketType
            };

            analyticsEngine.addPricePoint(rotationNumber.id, pricePoint);
        }
        const processingTime = performance.now() - startTime;

        // Get updated analytics
        const updatedAnalytics = analyticsEngine.getAnalytics(rotationNumber.id);
        if (updatedAnalytics) {
            console.info(`\n⚡ HFT Analytics Results:`);
            console.info(`   Processing Time: ${processingTime.toFixed(2)}ms`);
            console.info(`   Price Points Processed: ${updatedAnalytics.priceHistory.length}`);
            console.info(`   Sharp Movements Detected: ${updatedAnalytics.sharpMovement.length}`);
            console.info(`   Price Efficiency: ${(updatedAnalytics.efficiency.priceEfficiency * 100).toFixed(1)}%`);
            console.info(`   Throughput: ${(100 / (processingTime / 1000)).toFixed(0)} updates/second`);
        }

        // Get top arbitrage rotation numbers
        const topArbitrage = analyticsEngine.getTopArbitrageRotationNumbers(5);
        console.info('\n🏆 Top Arbitrage Rotation Numbers:');
        topArbitrage.forEach((item, index) => {
            console.info(`   ${index + 1}. ${item.rotationNumberId}: ${item.arbitrageFrequency.toFixed(1)} opportunities/hour`);
        });
    }

    /**
     * Example 6: Event-driven analytics
     */
    static async demonstrateEventDrivenAnalytics(): Promise<void> {
        console.info('\n📡 Event-Driven Analytics Demo\n');

        // Create analytics engine
        const analyticsEngine = RotationAnalyticsEngineFactory.createDefaultEngine();

        // Set up event listeners
        let eventCount = 0;
        analyticsEngine.addEventListener('price_movement', (event: any) => {
            eventCount++;
            console.info(`📡 Price Movement Event ${eventCount}: ${event.analytics.rotationNumber.sportsbook}`);
        });

        analyticsEngine.addEventListener('volume_spike', (event: any) => {
            console.info(`📊 Volume Spike Event: ${event.analytics.rotationNumber.sportsbook}`);
        });

        // Create rotation number
        const rotationNumber = this.createNBARotationNumbers()[0];
        const analytics = analyticsEngine.createAnalytics(rotationNumber);

        console.info('📡 Simulating events with listeners...');

        // Simulate events that will trigger listeners
        for (let i = 0; i < 5; i++) {
            const pricePoint = {
                timestamp: new Date(),
                price: -110 + i * 5, // Significant price changes
                sportsbook: rotationNumber.sportsbook,
                marketType: 'spread' as MarketType
            };

            analyticsEngine.addPricePoint(rotationNumber.id, pricePoint);
        }

        console.info(`\n✅ Event-driven demo completed with ${eventCount} events triggered`);
    }

    /**
     * Helper: Create rotation numbers for multiple sportsbooks
     */
    private static createMultiSportsbookRotationNumbers(): RotationNumber[] {
        const eventDate = new Date('2024-01-15T20:00:00Z');
        const sportsbooks: Sportsbook[] = ['draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet'];

        return sportsbooks.map((sportsbook, index) => ({
            id: generateId('rotation'),
            sport: 'basketball',
            league: 'NBA',
            eventDate,
            rotation: 100 + index * 100,
            teams: { home: 'Los Angeles Lakers', away: 'Boston Celtics' },
            markets: [
                {
                    id: generateId('market'),
                    marketType: 'spread',
                    rotation: 100 + index * 100,
                    line: -2.5 + index * 0.5, // Different lines
                    odds: -110 + index * 2, // Different odds
                    juice: -110 + index * 2,
                    isLive: false,
                    volume: 50000 - index * 5000, // Different volumes
                    sharp: index < 2, // First two are sharp
                    lastUpdated: new Date()
                }
            ],
            sportsbook,
            isActive: true,
            lastUpdated: new Date()
        }));
    }

    /**
     * Run all rotation number examples
     */
    static async runAllExamples(): Promise<void> {
        console.info('🚀 Rotation Numbers System Examples\n');
        console.info('='.repeat(80));

        // Basic rotation numbers
        this.createNBARotationNumbers();

        console.info('='.repeat(80));

        // Arbitrage detection
        await this.demonstrateRotationArbitrage();

        console.info('='.repeat(80));

        // Analytics engine
        await this.demonstrateRotationAnalytics();

        console.info('='.repeat(80));

        // Multi-sportsbook arbitrage
        await this.demonstrateMultiSportsbookArbitrage();

        console.info('='.repeat(80));

        // High-frequency analytics
        await this.demonstrateHighFrequencyAnalytics();

        console.info('='.repeat(80));

        // Event-driven analytics
        await this.demonstrateEventDrivenAnalytics();

        console.info('\n✅ All rotation number examples completed!');
        console.info('\n🎯 Key Capabilities Demonstrated:');
        console.info('   • Rotation number creation and management');
        console.info('   • Cross-sportsbook arbitrage detection');
        console.info('   • Real-time price and volume analytics');
        console.info('   • Sharp movement detection and alerts');
        console.info('   • Efficiency metrics calculation');
        console.info('   • High-frequency data processing');
        console.info('   • Event-driven analytics architecture');
        console.info('   • Multi-sportsbook opportunity analysis');
        console.info('   • Risk assessment and validation');
        console.info('   • Performance monitoring and optimization');
    }
}

export default RotationNumbersDemo;
