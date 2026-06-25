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
        console.info('📊 Basic Synthetic Position Tracking Workflow\n');

        // Create position tracker
        const tracker = new SyntheticPositionTracker();

        // Generate test arbitrage opportunities
        const factory = new SyntheticArbitrageV1Factory();
        const arbitrage1 = factory.createNBAExample();
        const arbitrage2 = factory.createConservativeExample();
        const arbitrage3 = factory.createAggressiveExample();

        console.info('🎯 Adding synthetic arbitrage positions...\n');

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

        console.info(`✅ Added 3 positions to tracker:`);
        console.info(`   Position 1: ${position1.id} - ${position1.metadata.notes}`);
        console.info(`   Position 2: ${position2.id} - ${position2.metadata.notes}`);
        console.info(`   Position 3: ${position3.id} - ${position3.metadata.notes}`);

        // Get initial portfolio metrics
        const initialMetrics = tracker.getPortfolioMetrics();
        console.info('\n📈 Initial Portfolio Metrics:');
        console.info(`   Total Positions: ${initialMetrics.totalPositions}`);
        console.info(`   Active Positions: ${initialMetrics.activePositions}`);
        console.info(`   Total Exposure: $${initialMetrics.totalExposure.toLocaleString()}`);
        console.info(`   Expected PnL: $${initialMetrics.totalExpectedPnL.toLocaleString()}`);
        console.info(`   Portfolio VaR95: $${initialMetrics.portfolioVar95.toLocaleString()}`);

        // Simulate leg execution
        console.info('\n🔄 Simulating position execution...\n');

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

        console.info(`✅ Position ${position1.id} fully executed`);

        // Get updated metrics
        const updatedMetrics = tracker.getPortfolioMetrics();
        console.info('\n📊 Updated Portfolio Metrics:');
        console.info(`   Active Positions: ${updatedMetrics.activePositions}`);
        console.info(`   Total Exposure: $${updatedMetrics.totalExposure.toLocaleString()}`);
        console.info(`   Expected PnL: $${updatedMetrics.totalExpectedPnL.toLocaleString()}`);

        // Close position with PnL
        const finalPosition = tracker.closePosition(position1.id, 'completed', 150);
        console.info(`\n🏁 Position ${position1.id} closed with PnL: $${finalPosition.execution.realizedPnL?.toLocaleString()}`);

        // Final metrics
        const finalMetrics = tracker.getPortfolioMetrics();
        console.info('\n📊 Final Portfolio Metrics:');
        console.info(`   Completed Positions: ${finalMetrics.completedPositions}`);
        console.info(`   Realized PnL: $${finalMetrics.totalRealizedPnL.toLocaleString()}`);
        console.info(`   Win Rate: ${(finalMetrics.winRate * 100).toFixed(1)}%`);
        console.info(`   Sharpe Ratio: ${finalMetrics.sharpeRatio.toFixed(3)}`);
    }

    /**
     * Example 2: Risk management and alerts
     */
    static demonstrateRiskManagement(): void {
        console.info('\n⚠️ Risk Management and Alert System\n');

        // Create tracker with conservative limits
        const tracker = SyntheticPositionTrackerFactory.createConservativeTracker();

        // Set up event listeners for risk alerts
        tracker.addEventListener('riskAlert', (data: any) => {
            const alert = data.alert;
            console.info(`🚨 RISK ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
            console.info(`   Type: ${alert.type}`);
            console.info(`   Threshold: $${alert.threshold.toLocaleString()}`);
            console.info(`   Current: $${alert.currentValue.toLocaleString()}`);
        });

        tracker.addEventListener('positionAdded', (data: any) => {
            console.info(`📝 Position Added: ${data.position.id}`);
        });

        tracker.addEventListener('positionClosed', (data: any) => {
            console.info(`🏁 Position Closed: ${data.position.id} (${data.reason})`);
        });

        // Generate positions to test risk limits
        const factory = new SyntheticArbitrageV1Factory();

        console.info('🎯 Adding positions to test risk limits...\n');

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

                console.info(`✅ Added position ${positionCount + 1}: ${position.id}`);
                positionCount++;

                // Execute position to activate risk
                tracker.updateLegExecution(position.id, 0, {
                    status: 'filled',
                    fillPrice: -110,
                    fillQuantity: 500
                });

            } catch (error) {
                console.info(`❌ Error adding position: ${error}`);
                break;
            }
        }

        // Check current risk status
        const metrics = tracker.getPortfolioMetrics();
        console.info('\n📊 Current Portfolio Risk Status:');
        console.info(`   Total Positions: ${metrics.totalPositions}`);
        console.info(`   Portfolio Exposure: $${metrics.totalExposure.toLocaleString()}`);
        console.info(`   Portfolio VaR95: $${metrics.portfolioVar95.toLocaleString()}`);
        console.info(`   Portfolio VaR99: $${metrics.portfolioVar99.toLocaleString()}`);

        // Get risk alerts
        const alerts = tracker.getRiskAlerts();
        console.info(`\n🚨 Active Risk Alerts: ${alerts.length}`);

        alerts.forEach((alert, index) => {
            console.info(`   ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.message}`);
            console.info(`      Current: $${alert.currentValue.toLocaleString()} / Limit: $${alert.threshold.toLocaleString()}`);
        });

        // Acknowledge alerts
        console.info('\n✅ Acknowledging risk alerts...');
        alerts.forEach(alert => {
            tracker.acknowledgeAlert(alert.id);
        });

        const acknowledgedAlerts = tracker.getRiskAlerts({ acknowledged: true });
        console.info(`   Acknowledged: ${acknowledgedAlerts.length} alerts`);
    }

    /**
     * Example 3: Portfolio analysis and reporting
     */
    static demonstratePortfolioAnalysis(): void {
        console.info('\n📊 Portfolio Analysis and Reporting\n');

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

        console.info('🎯 Building diversified portfolio...\n');

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

        console.info('📈 Portfolio Performance Metrics:');
        console.info(`   Total Positions: ${metrics.totalPositions}`);
        console.info(`   Active Positions: ${metrics.activePositions}`);
        console.info(`   Completed Positions: ${metrics.completedPositions}`);
        console.info(`   Total Exposure: $${metrics.totalExposure.toLocaleString()}`);
        console.info(`   Expected PnL: $${metrics.totalExpectedPnL.toLocaleString()}`);
        console.info(`   Realized PnL: $${metrics.totalRealizedPnL.toLocaleString()}`);
        console.info(`   Sharpe Ratio: ${metrics.sharpeRatio.toFixed(3)}`);
        console.info(`   Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
        console.info(`   Risk-Adjusted Return: ${(metrics.riskAdjustedReturn * 100).toFixed(3)}%`);

        console.info('\n🎯 Risk Breakdown by Sport:');
        Object.entries(riskBreakdown.bySport).forEach(([sport, data]) => {
            console.info(`   ${sport}:`);
            console.info(`     Positions: ${data.positions}`);
            console.info(`     Exposure: $${data.exposure.toLocaleString()}`);
            console.info(`     VaR95: $${data.var95.toLocaleString()}`);
        });

        console.info('\n📊 Risk Breakdown by Status:');
        Object.entries(riskBreakdown.byStatus).forEach(([status, data]) => {
            console.info(`   ${status}:`);
            console.info(`     Positions: ${data.positions}`);
            console.info(`     Exposure: $${data.exposure.toLocaleString()}`);
        });

        // Position analysis
        console.info('\n📋 Position Analysis:');
        const allPositions = tracker.getPositions();

        allPositions.forEach((position, index) => {
            console.info(`   ${index + 1}. ${position.id}`);
            console.info(`      Status: ${position.status}`);
            console.info(`      Sport: ${position.arbitrage.markets[0].market.sport}`);
            console.info(`      Expected Return: ${(position.arbitrage.expectedReturn * 100).toFixed(3)}%`);
            console.info(`      Current Exposure: $${position.risk.currentExposure.toLocaleString()}`);
            console.info(`      Assigned To: ${position.metadata.assignedTo}`);
            console.info(`      Tags: ${position.metadata.tags?.join(', ')}`);
        });

        // Export portfolio data
        const exportData = tracker.exportPortfolioData();
        console.info(`\n💾 Portfolio Export Summary:`);
        console.info(`   Export Time: ${exportData.exportTime.toISOString()}`);
        console.info(`   Positions Exported: ${exportData.positions.length}`);
        console.info(`   Active Alerts: ${exportData.alerts.length}`);
        console.info(`   Portfolio Value: $${exportData.metrics.totalExposure.toLocaleString()}`);
    }

    /**
     * Example 4: Different tracker strategies comparison
     */
    static demonstrateTrackerStrategies(): void {
        console.info('\n🎭 Tracker Strategy Comparison\n');

        // Create different tracker configurations
        const conservativeTracker = SyntheticPositionTrackerFactory.createConservativeTracker();
        const aggressiveTracker = SyntheticPositionTrackerFactory.createAggressiveTracker();
        const hftTracker = SyntheticPositionTrackerFactory.createHFTTracker();

        const factory = new SyntheticArbitrageV1Factory();
        const testArbitrages = Array(10).fill(null).map(() => factory.createNBAExample());

        console.info('📊 Testing different tracker configurations...\n');

        const trackers = [
            { name: 'Conservative', tracker: conservativeTracker, color: '🟢' },
            { name: 'Aggressive', tracker: aggressiveTracker, color: '🟡' },
            { name: 'High-Frequency', tracker: hftTracker, color: '🔴' }
        ];

        for (const { name, tracker, color } of trackers) {
            console.info(`${color} ${name} Tracker:`);

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

            console.info(`   Positions Added: ${positionsAdded}/${testArbitrages.length}`);
            console.info(`   Errors: ${errors}`);
            console.info(`   Portfolio Exposure: $${metrics.totalExposure.toLocaleString()}`);
            console.info(`   Portfolio VaR95: $${metrics.portfolioVar95.toLocaleString()}`);
            console.info(`   Expected PnL: $${metrics.totalExpectedPnL.toLocaleString()}`);
            console.info(`   Risk Alerts: ${alerts.length}`);

            if (alerts.length > 0) {
                console.info(`   Alert Types: ${alerts.map(a => a.type).join(', ')}`);
            }
            console.info('');
        }

        // Strategy comparison summary
        console.info('📈 Strategy Comparison Summary:');
        console.info('Strategy'.padEnd(15) + ' | Positions | Exposure | VaR95 | Alerts');
        console.info(''.padEnd(15) + ' | ' + '-'.repeat(10) + ' | ' + '-'.repeat(8) + ' | ' + '-'.repeat(5) + ' | ' + '-'.repeat(6));

        trackers.forEach(({ name, tracker }) => {
            const metrics = tracker.getPortfolioMetrics();
            const alerts = tracker.getRiskAlerts();

            console.info(
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
        console.info('\n⚡ Real-Time Position Monitoring\n');

        const tracker = SyntheticPositionTrackerFactory.createHFTTracker();
        const factory = new SyntheticArbitrageV1Factory();

        // Set up real-time monitoring
        tracker.addEventListener('positionAdded', (data: any) => {
            console.info(`📝 [${new Date().toLocaleTimeString()}] Position Added: ${data.position.id}`);
        });

        tracker.addEventListener('riskAlert', (data: any) => {
            console.info(`🚨 [${new Date().toLocaleTimeString()}] Risk Alert: ${data.alert.message}`);
        });

        tracker.addEventListener('positionUpdated', (data: any) => {
            console.info(`🔄 [${new Date().toLocaleTimeString()}] Position Updated: ${data.position.id}`);
        });

        console.info('🔄 Starting real-time position simulation...\n');

        // Simulate real-time position lifecycle
        for (let i = 0; i < 5; i++) {
            console.info(`\n--- Cycle ${i + 1} ---`);

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
            console.info(`📊 Portfolio Status: ${metrics.activePositions} active, $${metrics.totalRealizedPnL.toFixed(0)} realized PnL`);
        }

        // Final summary
        const finalMetrics = tracker.getPortfolioMetrics();
        const alerts = tracker.getRiskAlerts();

        console.info('\n📊 Real-Time Simulation Summary:');
        console.info(`   Total Positions Processed: ${finalMetrics.totalPositions}`);
        console.info(`   Completed Positions: ${finalMetrics.completedPositions}`);
        console.info(`   Total Realized PnL: $${finalMetrics.totalRealizedPnL.toLocaleString()}`);
        console.info(`   Win Rate: ${(finalMetrics.winRate * 100).toFixed(1)}%`);
        console.info(`   Average Holding Period: ${(finalMetrics.averageHoldingPeriod / 1000).toFixed(1)}s`);
        console.info(`   Risk Alerts Generated: ${alerts.length}`);
        console.info(`   Sharpe Ratio: ${finalMetrics.sharpeRatio.toFixed(3)}`);
    }

    /**
     * Run all position tracker examples
     */
    static async runAllExamples(): Promise<void> {
        console.info('🚀 Synthetic Position Tracker Examples\n');
        console.info('='.repeat(80));

        this.demonstrateBasicPositionTracking();
        console.info('='.repeat(80));

        this.demonstrateRiskManagement();
        console.info('='.repeat(80));

        this.demonstratePortfolioAnalysis();
        console.info('='.repeat(80));

        this.demonstrateTrackerStrategies();
        console.info('='.repeat(80));

        await this.demonstrateRealTimeMonitoring();

        console.info('\n✅ All synthetic position tracker examples completed!');
        console.info('\n🎯 Key Capabilities Demonstrated:');
        console.info('   • Comprehensive position lifecycle management');
        console.info('   • Real-time risk monitoring and alerting');
        console.info('   • Portfolio analysis and performance metrics');
        console.info('   • Multiple tracker strategies (Conservative, Aggressive, HFT)');
        console.info('   • Event-driven architecture for real-time updates');
        console.info('   • Institutional-grade risk management (VaR, exposure limits)');
    }
}

export default SyntheticPositionTrackerExamples;
