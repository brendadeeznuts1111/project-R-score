// packages/odds-core/src/examples/rotation-analytics-demo.ts - Standalone rotation analytics demonstration

import type {
    RotationNumber,
    RotationMarket,
    RotationAnalytics,
    PricePoint,
    VolumePoint,
    SharpMovement,
    EfficiencyMetrics
} from '../types/rotation-numbers';
import { RotationAnalyticsEngine, RotationAnalyticsEngineFactory } from '../analytics/rotation-analytics';
import { generateId } from '../utils/index-streamlined';

/**
 * Standalone rotation analytics demonstration
 * Focuses specifically on the analytics capabilities you were viewing
 */
export class RotationAnalyticsDemo {

    /**
     * Create sample rotation number for NBA game
     */
    static createSampleRotationNumber(): RotationNumber {
        return {
            id: generateId('rotation'),
            sport: 'basketball',
            league: 'NBA',
            eventDate: new Date('2024-01-15T20:00:00Z'),
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
                }
            ],
            sportsbook: 'draftkings',
            isActive: true,
            lastUpdated: new Date()
        };
    }

    /**
     * Demonstrate sharp movement detection (the section you were viewing)
     */
    static demonstrateSharpMovementDetection(): void {
        console.log('⚡ Sharp Movement Detection Demo\n');

        // Create analytics engine
        const analyticsEngine = RotationAnalyticsEngineFactory.createDefaultEngine();

        // Create rotation number
        const rotationNumber = this.createSampleRotationNumber();
        console.log(`📈 Creating analytics for rotation ${rotationNumber.rotation} (${rotationNumber.sportsbook})`);

        // Initialize analytics
        const analytics = analyticsEngine.createAnalytics(rotationNumber);
        console.log('✅ Analytics initialized');

        // Simulate price updates with sharp movements
        console.log('\n📈 Simulating price updates with sharp movements...');

        const priceUpdates = [
            { price: -110, timestamp: new Date(Date.now() - 60000) },  // 1 minute ago
            { price: -108, timestamp: new Date(Date.now() - 50000) },  // 50 seconds ago
            { price: -105, timestamp: new Date(Date.now() - 40000) },  // 40 seconds ago (3% change - sharp!)
            { price: -102, timestamp: new Date(Date.now() - 30000) },  // 30 seconds ago (2.9% change - sharp!)
            { price: -100, timestamp: new Date(Date.now() - 20000) },  // 20 seconds ago
            { price: -98, timestamp: new Date(Date.now() - 10000) },  // 10 seconds ago
            { price: -95, timestamp: new Date() }                    // Now (3.1% change - sharp!)
        ];

        priceUpdates.forEach((update, index) => {
            const pricePoint: PricePoint = {
                timestamp: update.timestamp,
                price: update.price,
                sportsbook: rotationNumber.sportsbook,
                marketType: 'spread'
            };

            analyticsEngine.addPricePoint(rotationNumber.id, pricePoint);
            console.log(`   ${index + 1}. Price: ${update.price} at ${update.timestamp.toLocaleTimeString()}`);
        });

        // Get current analytics
        const currentAnalytics = analyticsEngine.getAnalytics(rotationNumber.id);
        if (currentAnalytics) {
            console.log('\n📊 Current Analytics:');
            console.log(`   Price History Points: ${currentAnalytics.priceHistory.length}`);
            console.log(`   Volume History Points: ${currentAnalytics.volumeHistory.length}`);
            console.log(`   Sharp Movements: ${currentAnalytics.sharpMovement.length}`);
            console.log(`   Price Efficiency: ${(currentAnalytics.efficiency.priceEfficiency * 100).toFixed(1)}%`);
            console.log(`   Volume Efficiency: ${(currentAnalytics.efficiency.volumeEfficiency * 100).toFixed(1)}%`);
            console.log(`   Arbitrage Frequency: ${currentAnalytics.efficiency.arbitrageFrequency.toFixed(1)} per hour`);
            console.log(`   Market Impact: ${(currentAnalytics.efficiency.marketImpact * 100).toFixed(2)}%`);

            // This is the exact section you were viewing:
            if (currentAnalytics.sharpMovement.length > 0) {
                console.log('\n⚡ Sharp Movements:');
                currentAnalytics.sharpMovement.forEach((movement, index) => {
                    const priceChange = Math.abs(movement.toPrice - movement.fromPrice);
                    const percentChange = (priceChange / Math.abs(movement.fromPrice)) * 100;
                    console.log(`   ${index + 1}. ${movement.timestamp.toLocaleTimeString()}: ${movement.fromPrice} → ${movement.toPrice} (${movement.sportsbook}) - ${percentChange.toFixed(1)}% change`);
                    console.log(`      Significance: ${(movement.significance * 100).toFixed(1)}% | Reason: ${movement.reason}`);
                });
            } else {
                console.log('\n⚡ No sharp movements detected (threshold: 2%)');
            }
        }

        // Get analytics summary
        const summary = analyticsEngine.getAnalyticsSummary([rotationNumber.id]);
        console.log('\n📋 Analytics Summary:');
        console.log(`   Total Rotation Numbers: ${summary.totalRotationNumbers}`);
        console.log(`   Average Price Efficiency: ${(summary.avgPriceEfficiency * 100).toFixed(1)}%`);
        console.log(`   Average Volume Efficiency: ${(summary.avgVolumeEfficiency * 100).toFixed(1)}%`);
        console.log(`   Total Arbitrage Opportunities: ${summary.totalArbitrageOpportunities}`);
        console.log(`   Average Market Impact: ${(summary.avgMarketImpact * 100).toFixed(2)}%`);
    }

    /**
     * Demonstrate volume spike detection
     */
    static demonstrateVolumeSpikeDetection(): void {
        console.log('\n📊 Volume Spike Detection Demo\n');

        const analyticsEngine = RotationAnalyticsEngineFactory.createHighFrequencyEngine();
        const rotationNumber = this.createSampleRotationNumber();
        const analytics = analyticsEngine.createAnalytics(rotationNumber);

        console.log('📊 Simulating volume updates with spikes...');

        // Normal volume followed by spikes
        const volumeUpdates = [
            { volume: 50000, timestamp: new Date(Date.now() - 60000) },
            { volume: 52000, timestamp: new Date(Date.now() - 50000) },
            { volume: 48000, timestamp: new Date(Date.now() - 40000) },
            { volume: 150000, timestamp: new Date(Date.now() - 30000) }, // 3x spike!
            { volume: 55000, timestamp: new Date(Date.now() - 20000) },
            { volume: 200000, timestamp: new Date(Date.now() - 10000) }, // 4x spike!
            { volume: 60000, timestamp: new Date() }
        ];

        volumeUpdates.forEach((update, index) => {
            const volumePoint: VolumePoint = {
                timestamp: update.timestamp,
                volume: update.volume,
                sportsbook: rotationNumber.sportsbook,
                marketType: 'spread'
            };

            analyticsEngine.addVolumePoint(rotationNumber.id, volumePoint);
            const recentAvg = volumeUpdates.slice(0, index + 1).slice(-10).reduce((sum, v) => sum + v.volume, 0) / Math.min(index + 1, 10);
            const spikeRatio = update.volume / recentAvg;

            if (spikeRatio >= 3.0) {
                console.log(`   ${index + 1}. Volume: ${update.volume.toLocaleString()} at ${update.timestamp.toLocaleTimeString()} 🚨 SPIKE: ${spikeRatio.toFixed(1)}x average`);
            } else {
                console.log(`   ${index + 1}. Volume: ${update.volume.toLocaleString()} at ${update.timestamp.toLocaleTimeString()}`);
            }
        });

        const updatedAnalytics = analyticsEngine.getAnalytics(rotationNumber.id);
        if (updatedAnalytics) {
            console.log('\n📊 Volume Analytics Results:');
            console.log(`   Volume History Points: ${updatedAnalytics.volumeHistory.length}`);
            console.log(`   Volume Efficiency: ${(updatedAnalytics.efficiency.volumeEfficiency * 100).toFixed(1)}%`);
            console.log(`   Market Impact: ${(updatedAnalytics.efficiency.marketImpact * 100).toFixed(2)}%`);
        }
    }

    /**
     * Demonstrate efficiency metrics calculation
     */
    static demonstrateEfficiencyMetrics(): void {
        console.log('\n📈 Efficiency Metrics Calculation Demo\n');

        const analyticsEngine = RotationAnalyticsEngineFactory.createDefaultEngine();
        const rotationNumber = this.createSampleRotationNumber();
        const analytics = analyticsEngine.createAnalytics(rotationNumber);

        console.log('📈 Simulating market data for efficiency calculation...');

        // Simulate stable market (high efficiency)
        console.log('\n--- Scenario 1: Stable Market (High Efficiency) ---');
        for (let i = 0; i < 20; i++) {
            const pricePoint: PricePoint = {
                timestamp: new Date(Date.now() - (19 - i) * 30000),
                price: -110 + (Math.random() - 0.5) * 4, // Small variations
                sportsbook: rotationNumber.sportsbook,
                marketType: 'spread'
            };
            analyticsEngine.addPricePoint(rotationNumber.id, pricePoint);

            const volumePoint: VolumePoint = {
                timestamp: pricePoint.timestamp,
                volume: 50000 + (Math.random() - 0.5) * 10000, // Stable volume
                sportsbook: rotationNumber.sportsbook,
                marketType: 'spread'
            };
            analyticsEngine.addVolumePoint(rotationNumber.id, volumePoint);
        }

        const stableMetrics = analyticsEngine.getEfficiencyMetrics(rotationNumber.id);
        if (stableMetrics) {
            console.log(`   Price Efficiency: ${(stableMetrics.priceEfficiency * 100).toFixed(1)}%`);
            console.log(`   Volume Efficiency: ${(stableMetrics.volumeEfficiency * 100).toFixed(1)}%`);
            console.log(`   Market Impact: ${(stableMetrics.marketImpact * 100).toFixed(2)}%`);
        }

        // Simulate volatile market (low efficiency)
        console.log('\n--- Scenario 2: Volatile Market (Low Efficiency) ---');
        for (let i = 0; i < 20; i++) {
            const pricePoint: PricePoint = {
                timestamp: new Date(Date.now() - (19 - i) * 30000),
                price: -110 + (Math.random() - 0.5) * 20, // Large variations
                sportsbook: rotationNumber.sportsbook,
                marketType: 'spread'
            };
            analyticsEngine.addPricePoint(rotationNumber.id, pricePoint);

            const volumePoint: VolumePoint = {
                timestamp: pricePoint.timestamp,
                volume: 50000 + (Math.random() - 0.5) * 40000, // Volatile volume
                sportsbook: rotationNumber.sportsbook,
                marketType: 'spread'
            };
            analyticsEngine.addVolumePoint(rotationNumber.id, volumePoint);
        }

        const volatileMetrics = analyticsEngine.getEfficiencyMetrics(rotationNumber.id);
        if (volatileMetrics) {
            console.log(`   Price Efficiency: ${(volatileMetrics.priceEfficiency * 100).toFixed(1)}%`);
            console.log(`   Volume Efficiency: ${(volatileMetrics.volumeEfficiency * 100).toFixed(1)}%`);
            console.log(`   Market Impact: ${(volatileMetrics.marketImpact * 100).toFixed(2)}%`);
        }

        console.log('\n📊 Efficiency Analysis:');
        if (stableMetrics && volatileMetrics) {
            console.log(`   Stable market is ${(stableMetrics.priceEfficiency / volatileMetrics.priceEfficiency).toFixed(1)}x more price efficient`);
            console.log(`   Stable market has ${(volatileMetrics.marketImpact / stableMetrics.marketImpact).toFixed(1)}x lower market impact`);
        }
    }

    /**
     * Run the specific analytics demonstration you were viewing
     */
    static runAnalyticsDemo(): void {
        console.log('🚀 Rotation Analytics Engine Demonstration\n');
        console.log('This demo focuses on the sharp movement detection you were viewing.\n');
        console.log('='.repeat(80));

        // Sharp movement detection (the section you were viewing)
        this.demonstrateSharpMovementDetection();

        console.log('='.repeat(80));

        // Volume spike detection
        this.demonstrateVolumeSpikeDetection();

        console.log('='.repeat(80));

        // Efficiency metrics
        this.demonstrateEfficiencyMetrics();

        console.log('\n✅ Rotation analytics demonstration completed!');
        console.log('\n🎯 Key Analytics Capabilities Demonstrated:');
        console.log('   • Sharp movement detection with configurable thresholds');
        console.log('   • Volume spike identification and alerting');
        console.log('   • Real-time efficiency metrics calculation');
        console.log('   • Market impact analysis');
        console.log('   • Event-driven analytics architecture');
        console.log('   • High-frequency data processing');
        console.log('   • Comprehensive performance monitoring');
    }
}

// Run the demonstration if this file is executed directly
if (import.meta.main) {
    RotationAnalyticsDemo.runAnalyticsDemo();
}

export default RotationAnalyticsDemo;
