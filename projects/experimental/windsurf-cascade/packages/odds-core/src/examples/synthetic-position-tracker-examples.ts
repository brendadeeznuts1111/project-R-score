// packages/odds-core/src/examples/synthetic-position-tracker-examples.ts - Comprehensive position tracking and risk management examples

import { SyntheticPositionTracker, SyntheticPositionTrackerFactory } from '@odds-core/trackers';
import { SyntheticArbitrageV1Factory } from '@odds-core/factories';
import type { SyntheticPosition, PortfolioMetrics, RiskAlert } from '@odds-core/trackers';

/**
 * Comprehensive synthetic position tracker examples
 */
export class SyntheticPositionTrackerExamples {

    /**
     * Example 1: Basic position tracking workflow
     */
    static demonstrateBasicPositionTracking(): void {
        console.log('📊 Basic Synthetic Position Tracking Workflow\n');

        // Create position tracker
        const tracker = new SyntheticPositionTracker();

        // Generate test arbitrage opportunities
        const factory = new SyntheticArbitrageV1Factory();
        const arbitrage1 = factory.createNBAExample();
        const arbitrage2 = factory.createConservativeExample();
        const arbitrage3 = factory.createAggressiveExample();

        console.log('🎯 Adding synthetic arbitrage positions...\n');

        // Add positions to tracker
        const position1 = tracker.addPosition(arbitrage1, {
            notes: 'Lakers vs Celtics - Q1 vs Full Game',
            tags: ['NBA', 'quarter-arbitrage'],
            assignedTo: 'trader-1'
        });

        const position2 = tracker.addPosition(arbitrage2, {
            notes: 'Conservative NFL position',
            tags: ['NFL', 'low-risk'],
            assignedTo: 'trader-2'
        });

        const position3 = tracker.addPosition(arbitrage3, {
            notes: 'Aggressive MLB position',
            tags: ['MLB', 'high-risk'],
            assignedTo: 'trader-1'
        });

        console.log(`✅ Added 3 positions to tracker:`);
        console.log(`   Position 1: ${position1.id} - ${position1.metadata.notes}`);
        console.log(`   Position 2: ${position2.id} - ${position2.metadata.notes}`);
        console.log(`   Position 3: ${position3.id} - ${position3.metadata.notes}`);

        // Get initial portfolio metrics
        const initialMetrics = tracker.getPortfolioMetrics();
        console.log('\n📈 Initial Portfolio Metrics:');
        console.log(`   Total Positions: ${initialMetrics.totalPositions}`);
        console.log(`   Active Positions: ${initialMetrics.activePositions}`);
        console.log(`   Total Exposure: $${initialMetrics.totalExposure.toLocaleString()}`);
        console.log(`   Expected PnL: $${initialMetrics.totalExpectedPnL.toLocaleString()}`);
        console.log(`   Portfolio VaR95: $${initialMetrics.portfolioVar95.toLocaleString()}`);

        // Simulate leg execution
        console.log('\n🔄 Simulating position execution...\n');

        // Execute first position
        tracker.updateLegExecution(position1.id, 0, {
            status: 'filled',
            fillPrice: -110,
            fillQuantity: 1000,
            commission: 10
        });

        tracker.updateLegExecution(position1.id, 1, {
            status: 'filled',
            fillPrice: -108,
            fillQuantity: 340, // Hedge ratio
            commission: 8
        });

        console.log(`✅ Position ${position1.id} fully executed`);

        // Get updated metrics
        const updatedMetrics = tracker.getPortfolioMetrics();
        console.log('\n📊 Updated Portfolio Metrics:');
        console.log(`   Active Positions: ${updatedMetrics.activePositions}`);
        console.log(`   Total Exposure: $${updatedMetrics.totalExposure.toLocaleString()}`);
        console.log(`   Expected PnL: $${updatedMetrics.totalExpectedPnL.toLocaleString()}`);

        // Close position with PnL
        const finalPosition = tracker.closePosition(position1.id, 'completed', 150);
        console.log(`\n🏁 Position ${position1.id} closed with PnL: $${finalPosition.execution.realizedPnL?.toLocaleString()}`);

        // Final metrics
        const finalMetrics = tracker.getPortfolioMetrics();
        console.log('\n📊 Final Portfolio Metrics:');
        console.log(`   Completed Positions: ${finalMetrics.completedPositions}`);
        console.log(`   Realized PnL: $${finalMetrics.totalRealizedPnL.toLocaleString()}`);
        console.log(`   Win Rate: ${(finalMetrics.winRate * 100).toFixed(1)}%`);
        console.log(`   Sharpe Ratio: ${finalMetrics.sharpeRatio.toFixed(3)}`);
    }

    /**
     * Example 2: Risk management and alerts
     */
    static demonstrateRiskManagement(): void {
        console.log('\n⚠️ Risk Management and Alert System\n');

        // Create tracker with conservative limits
        const tracker = SyntheticPositionTrackerFactory.createConservativeTracker();

        // Set up event listeners for risk alerts
        tracker.addEventListener('riskAlert', (data: any) => {
            const alert = data.alert;
            console.log(`🚨 RISK ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
            console.log(`   Type: ${alert.type}`);
            console.log(`   Threshold: $${alert.threshold.toLocaleString()}`);
            console.log(`   Current: $${alert.currentValue.toLocaleString()}`);
        });

        tracker.addEventListener('positionAdded', (data: any) => {
            console.log(`📝 Position Added: ${data.position.id}`);
        });

        tracker.addEventListener('positionClosed', (data: any) => {
            console.log(`🏁 Position Closed: ${data.position.id} (${data.reason})`);
        });

        // Generate positions to test risk limits
        const factory = new SyntheticArbitrageV1Factory();

        console.log('🎯 Adding positions to test risk limits...\n');

        // Add positions until we hit risk limits
        let positionCount = 0;
        const maxPositions = 15;

        while (positionCount < maxPositions) {
            try {
                const arbitrage = factory.createNBAExample();
                const position = tracker.addPosition(arbitrage, {
                    notes: `Test position ${positionCount + 1}`,
                    tags: ['risk-test'],
                    assignedTo: 'risk-tester'
                });

                console.log(`✅ Added position ${positionCount + 1}: ${position.id}`);
                positionCount++;

                // Execute position to activate risk
                tracker.updateLegExecution(position.id, 0, {
                    status: 'filled',
                    fillPrice: -110,
                    fillQuantity: 500
                });

            } catch (error) {
                console.log(`❌ Error adding position: ${error}`);
                break;
            }
        }

        // Check current risk status
        const metrics = tracker.getPortfolioMetrics();
        console.log('\n📊 Current Portfolio Risk Status:');
        console.log(`   Total Positions: ${metrics.totalPositions}`);
        console.log(`   Portfolio Exposure: $${metrics.totalExposure.toLocaleString()}`);
        console.log(`   Portfolio VaR95: $${metrics.portfolioVar95.toLocaleString()}`);
        console.log(`   Portfolio VaR99: $${metrics.portfolioVar99.toLocaleString()}`);

        // Get risk alerts
        const alerts = tracker.getRiskAlerts();
        console.log(`\n🚨 Active Risk Alerts: ${alerts.length}`);

        alerts.forEach((alert, index) => {
            console.log(`   ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.message}`);
            console.log(`      Current: $${alert.currentValue.toLocaleString()} / Limit: $${alert.threshold.toLocaleString()}`);
        });

        // Acknowledge alerts
        console.log('\n✅ Acknowledging risk alerts...');
        alerts.forEach(alert => {
            tracker.acknowledgeAlert(alert.id);
        });

        const acknowledgedAlerts = tracker.getRiskAlerts({ acknowledged: true });
        console.log(`   Acknowledged: ${acknowledgedAlerts.length} alerts`);
    }

    /**
     * Example 3: Portfolio analysis and reporting
     */
    static demonstratePortfolioAnalysis(): void {
        console.log('\n📊 Portfolio Analysis and Reporting\n');

        // Create tracker and add diverse positions
        const tracker = new SyntheticPositionTracker();
        const factory = new SyntheticArbitrageV1Factory();

        // Add different types of positions
        const positions = [
            { arbitrage: factory.createNBAExample(), sport: 'NBA', risk: 'medium' },
            { arbitrage: factory.createConservativeExample(), sport: 'NFL', risk: 'low' },
            { arbitrage: factory.createAggressiveExample(), sport: 'MLB', risk: 'high' },
            { arbitrage: factory.createNBAExample(), sport: 'NBA', risk: 'medium' },
            { arbitrage: factory.createConservativeExample(), sport: 'NFL', risk: 'low' }
        ];

        console.log('🎯 Building diversified portfolio...\n');

        const addedPositions: SyntheticPosition[] = [];

        positions.forEach((pos, index) => {
            const position = tracker.addPosition(pos.arbitrage, {
                notes: `${pos.sport} ${pos.risk} risk position`,
                tags: [pos.sport, pos.risk],
                assignedTo: `trader-${(index % 3) + 1}`
            });

            addedPositions.push(position);

            // Simulate partial execution
            if (index < 3) {
                tracker.updateLegExecution(position.id, 0, {
                    status: 'filled',
                    fillPrice: -110,
                    fillQuantity: 1000
                });
            }
        });

        // Get comprehensive portfolio analysis
        const metrics = tracker.getPortfolioMetrics();
        const riskBreakdown = tracker.getPositionRiskBreakdown();

        console.log('📈 Portfolio Performance Metrics:');
        console.log(`   Total Positions: ${metrics.totalPositions}`);
        console.log(`   Active Positions: ${metrics.activePositions}`);
        console.log(`   Completed Positions: ${metrics.completedPositions}`);
        console.log(`   Total Exposure: $${metrics.totalExposure.toLocaleString()}`);
        console.log(`   Expected PnL: $${metrics.totalExpectedPnL.toLocaleString()}`);
        console.log(`   Realized PnL: $${metrics.totalRealizedPnL.toLocaleString()}`);
        console.log(`   Sharpe Ratio: ${metrics.sharpeRatio.toFixed(3)}`);
        console.log(`   Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
        console.log(`   Risk-Adjusted Return: ${(metrics.riskAdjustedReturn * 100).toFixed(3)}%`);

        console.log('\n🎯 Risk Breakdown by Sport:');
        Object.entries(riskBreakdown.bySport).forEach(([sport, data]) => {
            console.log(`   ${sport}:`);
            console.log(`     Positions: ${data.positions}`);
            console.log(`     Exposure: $${data.exposure.toLocaleString()}`);
            console.log(`     VaR95: $${data.var95.toLocaleString()}`);
        });

        console.log('\n📊 Risk Breakdown by Status:');
        Object.entries(riskBreakdown.byStatus).forEach(([status, data]) => {
            console.log(`   ${status}:`);
            console.log(`     Positions: ${data.positions}`);
            console.log(`     Exposure: $${data.exposure.toLocaleString()}`);
        });

        // Position analysis
        console.log('\n📋 Position Analysis:');
        const allPositions = tracker.getPositions();

        allPositions.forEach((position, index) => {
            console.log(`   ${index + 1}. ${position.id}`);
            console.log(`      Status: ${position.status}`);
            console.log(`      Sport: ${position.arbitrage.markets[0].market.sport}`);
            console.log(`      Expected Return: ${(position.arbitrage.expectedReturn * 100).toFixed(3)}%`);
            console.log(`      Current Exposure: $${position.risk.currentExposure.toLocaleString()}`);
            console.log(`      Assigned To: ${position.metadata.assignedTo}`);
            console.log(`      Tags: ${position.metadata.tags?.join(', ')}`);
        });

        // Export portfolio data
        const exportData = tracker.exportPortfolioData();
        console.log(`\n💾 Portfolio Export Summary:`);
        console.log(`   Export Time: ${exportData.exportTime.toISOString()}`);
        console.log(`   Positions Exported: ${exportData.positions.length}`);
        console.log(`   Active Alerts: ${exportData.alerts.length}`);
        console.log(`   Portfolio Value: $${exportData.metrics.totalExposure.toLocaleString()}`);
    }

    /**
     * Example 4: Different tracker strategies comparison
     */
    static demonstrateTrackerStrategies(): void {
        console.log('\n🎭 Tracker Strategy Comparison\n');

        // Create different tracker configurations
        const conservativeTracker = SyntheticPositionTrackerFactory.createConservativeTracker();
        const aggressiveTracker = SyntheticPositionTrackerFactory.createAggressiveTracker();
        const hftTracker = SyntheticPositionTrackerFactory.createHFTTracker();

        const factory = new SyntheticArbitrageV1Factory();
        const testArbitrages = Array(10).fill(null).map(() => factory.createNBAExample());

        console.log('📊 Testing different tracker configurations...\n');

        const trackers = [
            { name: 'Conservative', tracker: conservativeTracker, color: '🟢' },
            { name: 'Aggressive', tracker: aggressiveTracker, color: '🟡' },
            { name: 'High-Frequency', tracker: hftTracker, color: '🔴' }
        ];

        for (const { name, tracker, color } of trackers) {
            console.log(`${color} ${name} Tracker:`);

            let positionsAdded = 0;
            let errors = 0;

            for (const arbitrage of testArbitrages) {
                try {
                    const position = tracker.addPosition(arbitrage, {
                        notes: `${name.toLowerCase()} test position`,
                        tags: [name.toLowerCase()],
                        assignedTo: 'test-trader'
                    });
                    positionsAdded++;

                    // Simulate execution
                    tracker.updateLegExecution(position.id, 0, {
                        status: 'filled',
                        fillPrice: -110,
                        fillQuantity: 500
                    });

                } catch (error) {
                    errors++;
                }
            }

            const metrics = tracker.getPortfolioMetrics();
            const alerts = tracker.getRiskAlerts();

            console.log(`   Positions Added: ${positionsAdded}/${testArbitrages.length}`);
            console.log(`   Errors: ${errors}`);
            console.log(`   Portfolio Exposure: $${metrics.totalExposure.toLocaleString()}`);
            console.log(`   Portfolio VaR95: $${metrics.portfolioVar95.toLocaleString()}`);
            console.log(`   Expected PnL: $${metrics.totalExpectedPnL.toLocaleString()}`);
            console.log(`   Risk Alerts: ${alerts.length}`);

            if (alerts.length > 0) {
                console.log(`   Alert Types: ${alerts.map(a => a.type).join(', ')}`);
            }
            console.log('');
        }

        // Strategy comparison summary
        console.log('📈 Strategy Comparison Summary:');
        console.log('Strategy'.padEnd(15) + ' | Positions | Exposure | VaR95 | Alerts');
        console.log(''.padEnd(15) + ' | ' + '-'.repeat(10) + ' | ' + '-'.repeat(8) + ' | ' + '-'.repeat(5) + ' | ' + '-'.repeat(6));

        trackers.forEach(({ name, tracker }) => {
            const metrics = tracker.getPortfolioMetrics();
            const alerts = tracker.getRiskAlerts();

            console.log(
                name.padEnd(15) + ' | ' +
                `${metrics.totalPositions}`.padEnd(10) + ' | ' +
                `$${(metrics.totalExposure / 1000).toFixed(0)}k`.padEnd(8) + ' | ' +
                `$${(metrics.portfolioVar95 / 1000).toFixed(0)}k`.padEnd(5) + ' | ' +
                alerts.length
            );
        });
    }

    /**
     * Example 5: Real-time position monitoring
     */
    static async demonstrateRealTimeMonitoring(): Promise<void> {
        console.log('\n⚡ Real-Time Position Monitoring\n');

        const tracker = SyntheticPositionTrackerFactory.createHFTTracker();
        const factory = new SyntheticArbitrageV1Factory();

        // Set up real-time monitoring
        tracker.addEventListener('positionAdded', (data: any) => {
            console.log(`📝 [${new Date().toLocaleTimeString()}] Position Added: ${data.position.id}`);
        });

        tracker.addEventListener('riskAlert', (data: any) => {
            console.log(`🚨 [${new Date().toLocaleTimeString()}] Risk Alert: ${data.alert.message}`);
        });

        tracker.addEventListener('positionUpdated', (data: any) => {
            console.log(`🔄 [${new Date().toLocaleTimeString()}] Position Updated: ${data.position.id}`);
        });

        console.log('🔄 Starting real-time position simulation...\n');

        // Simulate real-time position lifecycle
        for (let i = 0; i < 5; i++) {
            console.log(`\n--- Cycle ${i + 1} ---`);

            // Add new position
            const arbitrage = factory.createNBAExample();
            const position = tracker.addPosition(arbitrage, {
                notes: `Real-time position ${i + 1}`,
                tags: ['real-time', 'simulation'],
                assignedTo: 'auto-trader'
            });

            // Simulate execution delay
            await new Promise(resolve => setTimeout(resolve, 100));

            // Execute first leg
            tracker.updateLegExecution(position.id, 0, {
                status: 'filled',
                fillPrice: -110,
                fillQuantity: 1000,
                commission: 15
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            // Execute second leg
            tracker.updateLegExecution(position.id, 1, {
                status: 'filled',
                fillPrice: -108,
                fillQuantity: 340,
                commission: 10
            });

            // Monitor for a bit
            await new Promise(resolve => setTimeout(resolve, 200));

            // Close position
            const pnl = 50 + Math.random() * 200; // Random PnL between $50-250
            tracker.closePosition(position.id, 'completed', pnl);

            // Show current metrics
            const metrics = tracker.getPortfolioMetrics();
            console.log(`📊 Portfolio Status: ${metrics.activePositions} active, $${metrics.totalRealizedPnL.toFixed(0)} realized PnL`);
        }

        // Final summary
        const finalMetrics = tracker.getPortfolioMetrics();
        const alerts = tracker.getRiskAlerts();

        console.log('\n📊 Real-Time Simulation Summary:');
        console.log(`   Total Positions Processed: ${finalMetrics.totalPositions}`);
        console.log(`   Completed Positions: ${finalMetrics.completedPositions}`);
        console.log(`   Total Realized PnL: $${finalMetrics.totalRealizedPnL.toLocaleString()}`);
        console.log(`   Win Rate: ${(finalMetrics.winRate * 100).toFixed(1)}%`);
        console.log(`   Average Holding Period: ${(finalMetrics.averageHoldingPeriod / 1000).toFixed(1)}s`);
        console.log(`   Risk Alerts Generated: ${alerts.length}`);
        console.log(`   Sharpe Ratio: ${finalMetrics.sharpeRatio.toFixed(3)}`);
    }

    /**
     * Run all position tracker examples
     */
    static async runAllExamples(): Promise<void> {
        console.log('🚀 Synthetic Position Tracker Examples\n');
        console.log('='.repeat(80));

        this.demonstrateBasicPositionTracking();
        console.log('='.repeat(80));

        this.demonstrateRiskManagement();
        console.log('='.repeat(80));

        this.demonstratePortfolioAnalysis();
        console.log('='.repeat(80));

        this.demonstrateTrackerStrategies();
        console.log('='.repeat(80));

        await this.demonstrateRealTimeMonitoring();

        console.log('\n✅ All synthetic position tracker examples completed!');
        console.log('\n🎯 Key Capabilities Demonstrated:');
        console.log('   • Comprehensive position lifecycle management');
        console.log('   • Real-time risk monitoring and alerting');
        console.log('   • Portfolio analysis and performance metrics');
        console.log('   • Multiple tracker strategies (Conservative, Aggressive, HFT)');
        console.log('   • Event-driven architecture for real-time updates');
        console.log('   • Institutional-grade risk management (VaR, exposure limits)');
    }
}

export default SyntheticPositionTrackerExamples;
