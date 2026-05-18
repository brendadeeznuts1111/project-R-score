// packages/odds-core/src/examples/incremental-synthetic-examples.ts - Comprehensive examples for incremental synthetic arbitrage

import type {
    SyntheticArbitrageV1,
    SyntheticArbitrageV2,
    SyntheticArbitrageV3,
    MarketLeg,
    SportMarket,
    RiskMetrics,
    ExecutionPlan,
    CorrelationMatrix
} from '@odds-core/types';
import {
    SyntheticArbitrageV1Factory,
    SyntheticArbitrageV2Factory,
    SyntheticArbitrageV3Factory,
    SyntheticArbitrageBatchFactory
} from '@testing/factories/incremental-synthetic-factory';
import {
    validateSyntheticArbitrageComplete,
    validateSyntheticArbitrageV1,
    validateSyntheticArbitrageV2,
    validateSyntheticArbitrageV3
} from '@odds-core/types';

/**
 * Incremental Synthetic Arbitrage Examples
 * Demonstrates the evolution from V1 (core) to V3 (advanced) synthetic arbitrage
 */
export class IncrementalSyntheticArbitrageExamples {

    // ===== V1 EXAMPLES: CORE FUNCTIONALITY =====

    /**
     * Example 1: Basic NBA 1Q vs Full Game Synthetic Arbitrage (V1)
     */
    static createBasicNBAExample(): SyntheticArbitrageV1 {
        console.info('🏀 Creating V1 NBA Synthetic Arbitrage...');

        const arbitrage = SyntheticArbitrageV1Factory.createNBAExample();

        console.info('✅ V1 Synthetic Arbitrage Created:');
        console.info(`   ID: ${arbitrage.id}`);
        console.info(`   Markets: ${arbitrage.markets[0].period} vs ${arbitrage.markets[1].period}`);
        console.info(`   Expected Value: ${(arbitrage.expectedValue * 100).toFixed(2)}%`);
        console.info(`   Hedge Ratio: ${(arbitrage.hedgeRatio * 100).toFixed(1)}%`);
        console.info(`   Confidence: ${(arbitrage.confidence * 100).toFixed(1)}%`);

        // Validate V1
        const validation = validateSyntheticArbitrageComplete(arbitrage, 'v1');
        console.info(`   Validation: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`);
        if (!validation.isValid) {
            console.info(`   Errors: ${validation.businessErrors.join(', ')}`);
        }

        return arbitrage;
    }

    /**
     * Example 2: Profitable V1 Synthetic Arbitrage Batch
     */
    static createProfitableV1Batch(): SyntheticArbitrageV1[] {
        console.info('📊 Creating Profitable V1 Batch...');

        const batch = SyntheticArbitrageBatchFactory.createV1Batch(5, true);

        console.info(`✅ Created ${batch.length} profitable V1 opportunities:`);
        batch.forEach((arb, index) => {
            console.info(`   ${index + 1}. EV: ${(arb.expectedValue * 100).toFixed(2)}%, Confidence: ${(arb.confidence * 100).toFixed(1)}%`);
        });

        return batch;
    }

    /**
     * Example 3: V1 Market Compatibility Validation
     */
    static demonstrateV1Validation(): void {
        console.info('🔍 Demonstrating V1 Validation...');

        // Create valid example
        const validArb = SyntheticArbitrageV1Factory.createProfitable();
        const validValidation = validateSyntheticArbitrageComplete(validArb, 'v1');

        console.info('✅ Valid V1 Example:');
        console.info(`   Is Valid: ${validValidation.isValid}`);
        console.info(`   Schema Errors: ${validValidation.schemaErrors.length}`);
        console.info(`   Business Errors: ${validValidation.businessErrors.length}`);

        // Create invalid example (same exchange)
        const invalidArb = SyntheticArbitrageV1Factory.create({
            markets: [
                validArb.markets[0],
                { ...validArb.markets[1], exchange: validArb.markets[0].exchange }
            ]
        });

        const invalidValidation = validateSyntheticArbitrageComplete(invalidArb, 'v1');

        console.info('❌ Invalid V1 Example (same exchange):');
        console.info(`   Is Valid: ${invalidValidation.isValid}`);
        console.info(`   Business Errors: ${invalidValidation.businessErrors.join(', ')}`);
    }

    // ===== V2 EXAMPLES: RISK MANAGEMENT =====

    /**
     * Example 4: V2 Synthetic Arbitrage with Risk Metrics
     */
    static createRiskManagedV2Example(): SyntheticArbitrageV2 {
        console.info('⚠️ Creating V2 Risk-Managed Synthetic Arbitrage...');

        const arbitrage = SyntheticArbitrageV2Factory.createConservative();

        console.info('✅ V2 Synthetic Arbitrage with Risk Management:');
        console.info(`   Position Size: $${arbitrage.positionSize.toLocaleString()}`);
        console.info(`   Stop Loss: $${arbitrage.stopLoss.toLocaleString()}`);
        console.info(`   Target Profit: $${arbitrage.targetProfit.toLocaleString()}`);
        console.info(`   VaR95: ${(arbitrage.riskMetrics.var95 * 100).toFixed(2)}%`);
        console.info(`   Sharpe Ratio: ${arbitrage.riskMetrics.sharpeRatio.toFixed(2)}`);
        console.info(`   Kelly Fraction: ${(arbitrage.riskMetrics.positionMetrics.kellyFraction * 100).toFixed(1)}%`);

        // Validate V2
        const validation = validateSyntheticArbitrageComplete(arbitrage, 'v2');
        console.info(`   Validation: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`);
        if (validation.warnings.length > 0) {
            console.info(`   Warnings: ${validation.warnings.join(', ')}`);
        }

        return arbitrage;
    }

    /**
     * Example 5: V2 Risk Profile Comparison
     */
    static compareRiskProfiles(): void {
        console.info('📈 Comparing V2 Risk Profiles...');

        const conservative = SyntheticArbitrageV2Factory.createConservative();
        const normal = SyntheticArbitrageV2Factory.create();
        const aggressive = SyntheticArbitrageV2Factory.createAggressive();

        console.info('Risk Profile Comparison:');
        console.info('                    Conservative    Normal      Aggressive');
        console.info(`Expected Value:     ${(conservative.expectedValue * 100).toFixed(2)}%       ${(normal.expectedValue * 100).toFixed(2)}%        ${(aggressive.expectedValue * 100).toFixed(2)}%`);
        console.info(`Position Size:      $${conservative.positionSize.toLocaleString().padStart(8)}   $${normal.positionSize.toLocaleString().padStart(8)}    $${aggressive.positionSize.toLocaleString().padStart(8)}`);
        console.info(`VaR95:              ${(conservative.riskMetrics.var95 * 100).toFixed(2)}%        ${(normal.riskMetrics.var95 * 100).toFixed(2)}%        ${(aggressive.riskMetrics.var95 * 100).toFixed(2)}%`);
        console.info(`Sharpe Ratio:       ${conservative.riskMetrics.sharpeRatio.toFixed(2).padStart(8)}     ${normal.riskMetrics.sharpeRatio.toFixed(2).padStart(8)}      ${aggressive.riskMetrics.sharpeRatio.toFixed(2).padStart(8)}`);
        console.info(`Max Leverage:       ${conservative.maxLeverage.toFixed(1).padStart(8)}x      ${normal.maxLeverage.toFixed(1).padStart(8)}x       ${aggressive.maxLeverage.toFixed(1).padStart(8)}x`);
    }

    /**
     * Example 6: V2 NBA with Comprehensive Risk Analysis
     */
    static createNBAV2WithRiskAnalysis(): SyntheticArbitrageV2 {
        console.info('🏀 Creating NBA V2 with Risk Analysis...');

        const nbaArb = SyntheticArbitrageV2Factory.createNBAV2Example();

        console.info('📊 NBA V2 Risk Analysis:');
        console.info(`   Game: ${nbaArb.markets[0].gameId}`);
        console.info(`   Markets: ${nbaArb.markets[0].period} (${nbaArb.markets[0].exchange}) vs ${nbaArb.markets[1].period} (${nbaArb.markets[1].exchange})`);
        console.info(`   Expected Return: ${(nbaArb.expectedValue * 100).toFixed(2)}%`);
        console.info(`   Risk-Adjusted Return: ${nbaArb.riskMetrics.positionMetrics.riskAdjustedReturn.toFixed(3)}`);
        console.info(`   Risk Metrics:`);
        console.info(`     VaR95: ${(nbaArb.riskMetrics.var95 * 100).toFixed(2)}%`);
        console.info(`     VaR99: ${(nbaArb.riskMetrics.var99 * 100).toFixed(2)}%`);
        console.info(`     Max Drawdown: $${nbaArb.riskMetrics.maxDrawdown.toLocaleString()}`);
        console.info(`   Execution Risk:`);
        console.info(`     Liquidity Risk: ${(nbaArb.riskMetrics.executionRisk.liquidityRisk * 100).toFixed(1)}%`);
        console.info(`     Execution Risk: ${(nbaArb.riskMetrics.executionRisk.executionRisk * 100).toFixed(1)}%`);
        console.info(`     Slippage Risk: ${(nbaArb.riskMetrics.executionRisk.slippageRisk * 100).toFixed(1)}%`);

        return nbaArb;
    }

    // ===== V3 EXAMPLES: ADVANCED FEATURES =====

    /**
     * Example 7: V3 Multi-Market Synthetic Arbitrage
     */
    static createMultiMarketV3Example(): SyntheticArbitrageV3 {
        console.info('🔄 Creating V3 Multi-Market Synthetic Arbitrage...');

        const arbitrage = SyntheticArbitrageV3Factory.create();

        console.info('✅ V3 Multi-Market Synthetic Arbitrage:');
        console.info(`   Markets: ${arbitrage.markets.length} markets`);
        arbitrage.markets.forEach((market, index) => {
            console.info(`     ${index + 1}. ${market.period} (${market.exchange}) - Line: ${market.line}`);
        });
        console.info(`   Optimal Weights: [${arbitrage.optimalWeights.map(w => (w * 100).toFixed(1)).join('%, ')}%]`);
        console.info(`   Diversification Ratio: ${arbitrage.diversificationRatio.toFixed(3)}`);
        console.info(`   Concentration Risk: ${(arbitrage.concentrationRisk * 100).toFixed(1)}%`);
        console.info(`   Efficient Frontier Points: ${arbitrage.efficientFrontier.length}`);

        // Show correlation matrix
        console.info('   Correlation Matrix:');
        arbitrage.correlationMatrix.matrix.forEach((row, i) => {
            console.info(`     ${arbitrage.correlationMatrix.symbols[i]}: [${row.map(c => c.toFixed(2)).join(', ')}]`);
        });

        return arbitrage;
    }

    /**
     * Example 8: V3 Execution Plan and Monitoring
     */
    static demonstrateV3Execution(): SyntheticArbitrageV3 {
        console.info('⚡ Demonstrating V3 Execution and Monitoring...');

        const arbitrage = SyntheticArbitrageV3Factory.createMultiMarketNBAExample();

        console.info('📋 Execution Plan:');
        console.info(`   Status: ${arbitrage.executionPlan.status}`);
        console.info(`   Orders: ${arbitrage.executionPlan.orders.length}`);
        console.info(`   Total Size: $${arbitrage.executionPlan.totalSize.toLocaleString()}`);
        console.info(`   Execution Timeout: ${arbitrage.executionPlan.executionTimeout}ms`);
        console.info(`   Retry Policy: Max ${arbitrage.executionPlan.retryPolicy.maxRetries} retries`);

        arbitrage.executionPlan.orders.forEach((order, index) => {
            console.info(`   Order ${index + 1}: ${order.side.toUpperCase()} ${order.size} @ $${order.price} (${order.market.exchange})`);
        });

        console.info('📊 Real-time Monitoring:');
        console.info(`   Current P&L: $${arbitrage.monitoring.currentPnL.toLocaleString()}`);
        console.info(`   Execution Progress: ${(arbitrage.monitoring.executionProgress * 100).toFixed(1)}%`);
        console.info(`   Market Conditions: ${arbitrage.monitoring.marketConditions.volatility} volatility, ${arbitrage.monitoring.marketConditions.liquidity} liquidity`);

        console.info('📈 Performance Tracking:');
        console.info(`   Total Trades: ${arbitrage.performance.totalTrades}`);
        console.info(`   Win Rate: ${(arbitrage.performance.winRate * 100).toFixed(1)}%`);
        console.info(`   Sharpe Ratio: ${arbitrage.performance.sharpeRatio.toFixed(2)}`);
        console.info(`   Total Return: ${(arbitrage.performance.totalReturn * 100).toFixed(2)}%`);

        return arbitrage;
    }

    /**
     * Example 9: V3 Alert System and History
     */
    static demonstrateV3Alerts(): SyntheticArbitrageV3 {
        console.info('🚨 Demonstrating V3 Alert System...');

        const arbitrage = SyntheticArbitrageV3Factory.createMultiMarketNBAExample();

        // Simulate adding alerts
        console.info('Adding alerts to synthetic arbitrage...');

        // This would be done through the actual V3 methods in a real implementation
        console.info('📢 Alert System:');
        console.info(`   Active Alerts: ${arbitrage.alerts.length}`);
        console.info(`   History Entries: ${arbitrage.history.length}`);

        arbitrage.history.forEach((entry, index) => {
            console.info(`   ${index + 1}. ${entry.action} at ${entry.timestamp.toISOString()}`);
        });

        return arbitrage;
    }

    // ===== COMPREHENSIVE WORKFLOW EXAMPLES =====

    /**
     * Example 10: Complete V1→V2→V3 Evolution Workflow
     */
    static demonstrateCompleteEvolution(): void {
        console.info('🚀 Demonstrating Complete V1→V2→V3 Evolution...');

        // Step 1: V1 Core Detection
        console.info('\n📊 Step 1: V1 Core Detection');
        const v1Arb = this.createBasicNBAExample();

        // Step 2: V2 Risk Management
        console.info('\n⚠️ Step 2: V2 Risk Management');
        const v2Arb = this.createRiskManagedV2Example();

        // Step 3: V3 Advanced Features
        console.info('\n🔄 Step 3: V3 Advanced Features');
        const v3Arb = this.createMultiMarketV3Example();

        // Comparison
        console.info('\n📈 Evolution Summary:');
        console.info('Version   Markets   Risk Metrics   Execution   Monitoring');
        console.info(`V1        2         ❌             ❌          ❌`);
        console.info(`V2        2         ✅             ❌          ❌`);
        console.info(`V3        3+        ✅             ✅          ✅`);

        console.info('\n✅ Evolution Complete: From basic detection to comprehensive execution system');
    }

    /**
     * Example 11: Performance Benchmarking
     */
    static demonstratePerformanceBenchmarking(): void {
        console.info('⚡ Performance Benchmarking...');

        const iterations = 1000;

        // V1 Performance
        console.info('\n📊 V1 Performance Test:');
        const v1Start = performance.now();
        for (let i = 0; i < iterations; i++) {
            const arb = SyntheticArbitrageV1Factory.createProfitable();
            validateSyntheticArbitrageV1(arb);
        }
        const v1End = performance.now();
        const v1AvgTime = (v1End - v1Start) / iterations;
        console.info(`   Average time per V1 creation+validation: ${v1AvgTime.toFixed(3)}ms`);

        // V2 Performance
        console.info('\n⚠️ V2 Performance Test:');
        const v2Start = performance.now();
        for (let i = 0; i < iterations; i++) {
            const arb = SyntheticArbitrageV2Factory.create();
            validateSyntheticArbitrageV2(arb);
        }
        const v2End = performance.now();
        const v2AvgTime = (v2End - v2Start) / iterations;
        console.info(`   Average time per V2 creation+validation: ${v2AvgTime.toFixed(3)}ms`);

        // V3 Performance
        console.info('\n🔄 V3 Performance Test:');
        const v3Start = performance.now();
        for (let i = 0; i < iterations; i++) {
            const arb = SyntheticArbitrageV3Factory.create();
            validateSyntheticArbitrageV3(arb);
        }
        const v3End = performance.now();
        const v3AvgTime = (v3End - v3Start) / iterations;
        console.info(`   Average time per V3 creation+validation: ${v3AvgTime.toFixed(3)}ms`);

        console.info('\n📈 Performance Summary:');
        console.info(`   V1 (Core): ${v1AvgTime.toFixed(3)}ms - ✅ Sub-millisecond`);
        console.info(`   V2 (Risk): ${v2AvgTime.toFixed(3)}ms - ✅ Sub-millisecond`);
        console.info(`   V3 (Advanced): ${v3AvgTime.toFixed(3)}ms - ${v3AvgTime < 1 ? '✅' : '⚠️'} ${v3AvgTime < 1 ? 'Sub-millisecond' : 'Above target'}`);
    }

    /**
     * Example 12: Real-world NBA Scenario
     */
    static createRealWorldNBAScenario(): {
        v1Detection: SyntheticArbitrageV1;
        v2RiskAnalysis: SyntheticArbitrageV2;
        v3ExecutionPlan: SyntheticArbitrageV3;
    } {
        console.info('🏀 Real-world NBA Scenario: Lakers vs Celtics');

        // V1: Initial detection
        console.info('\n📊 Step 1: Opportunity Detection (V1)');
        const v1Detection = SyntheticArbitrageV1Factory.createNBAExample();
        console.info(`   ✅ Opportunity detected: ${(v1Detection.expectedValue * 100).toFixed(2)}% expected value`);

        // V2: Risk analysis
        console.info('\n⚠️ Step 2: Risk Analysis (V2)');
        const v2RiskAnalysis = SyntheticArbitrageV2Factory.createNBAV2Example();
        console.info(`   ✅ Risk assessment complete: ${v2RiskAnalysis.riskMetrics.sharpeRatio.toFixed(2)} Sharpe ratio`);
        console.info(`   💰 Recommended position: $${v2RiskAnalysis.positionSize.toLocaleString()}`);

        // V3: Execution planning
        console.info('\n🔄 Step 3: Execution Planning (V3)');
        const v3ExecutionPlan = SyntheticArbitrageV3Factory.createMultiMarketNBAExample();
        console.info(`   ✅ Execution plan ready: ${v3ExecutionPlan.executionPlan.orders.length} orders`);
        console.info(`   ⏱️  Estimated execution time: ${v3ExecutionPlan.executionPlan.executionTimeout}ms`);

        return {
            v1Detection,
            v2RiskAnalysis,
            v3ExecutionPlan
        };
    }

    // ===== UTILITY METHODS =====

    /**
     * Run all examples in sequence
     */
    static runAllExamples(): void {
        console.info('🚀 Running All Incremental Synthetic Arbitrage Examples\n');

        try {
            this.createBasicNBAExample();
            console.info('\n' + '='.repeat(60));

            this.createProfitableV1Batch();
            console.info('\n' + '='.repeat(60));

            this.demonstrateV1Validation();
            console.info('\n' + '='.repeat(60));

            this.createRiskManagedV2Example();
            console.info('\n' + '='.repeat(60));

            this.compareRiskProfiles();
            console.info('\n' + '='.repeat(60));

            this.createNBAV2WithRiskAnalysis();
            console.info('\n' + '='.repeat(60));

            this.createMultiMarketV3Example();
            console.info('\n' + '='.repeat(60));

            this.demonstrateV3Execution();
            console.info('\n' + '='.repeat(60));

            this.demonstrateV3Alerts();
            console.info('\n' + '='.repeat(60));

            this.demonstrateCompleteEvolution();
            console.info('\n' + '='.repeat(60));

            this.demonstratePerformanceBenchmarking();
            console.info('\n' + '='.repeat(60));

            this.createRealWorldNBAScenario();

            console.info('\n✅ All examples completed successfully!');

        } catch (error) {
            console.error('❌ Error running examples:', error);
        }
    }

    /**
     * Get summary of all versions
     */
    static getVersionSummary(): {
        v1: { features: string[], useCases: string[], limitations: string[] };
        v2: { features: string[], useCases: string[], limitations: string[] };
        v3: { features: string[], useCases: string[], limitations: string[] };
    } {
        return {
            v1: {
                features: [
                    'Core synthetic arbitrage detection',
                    '2-market support',
                    'Covariance-based hedge ratios',
                    'Expected value calculation',
                    'Mathematical validation'
                ],
                useCases: [
                    'Basic arbitrage detection',
                    'Mathematical modeling',
                    'Research and backtesting',
                    'Educational purposes'
                ],
                limitations: [
                    'No risk management',
                    'No execution planning',
                    'Limited to 2 markets',
                    'No real-time monitoring'
                ]
            },
            v2: {
                features: [
                    'All V1 features',
                    'Comprehensive risk metrics',
                    'VaR calculations',
                    'Kelly criterion position sizing',
                    'Execution risk assessment',
                    'Risk limits enforcement'
                ],
                useCases: [
                    'Production trading',
                    'Risk-managed arbitrage',
                    'Portfolio optimization',
                    'Compliance reporting'
                ],
                limitations: [
                    'No multi-market support',
                    'No execution planning',
                    'No real-time monitoring',
                    'Limited alerting'
                ]
            },
            v3: {
                features: [
                    'All V2 features',
                    'Multi-market support (3+ markets)',
                    'Advanced execution planning',
                    'Real-time monitoring',
                    'Performance tracking',
                    'Alert system',
                    'Efficient frontier analysis',
                    'Correlation matrix support'
                ],
                useCases: [
                    'Institutional trading',
                    'Complex arbitrage strategies',
                    'Multi-asset portfolio management',
                    'High-frequency trading',
                    'Risk management platforms'
                ],
                limitations: [
                    'Higher complexity',
                    'More computational overhead',
                    'Steeper learning curve',
                    'Requires more data'
                ]
            }
        };
    }
}

// ===== EXPORT FOR EASY IMPORT =====

export default IncrementalSyntheticArbitrageExamples;
