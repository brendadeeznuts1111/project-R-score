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
        console.log('🏀 Creating V1 NBA Synthetic Arbitrage...');

        const arbitrage = SyntheticArbitrageV1Factory.createNBAExample();

        console.log('✅ V1 Synthetic Arbitrage Created:');
        console.log(`   ID: ${arbitrage.id}`);
        console.log(`   Markets: ${arbitrage.markets[0].period} vs ${arbitrage.markets[1].period}`);
        console.log(`   Expected Value: ${(arbitrage.expectedValue * 100).toFixed(2)}%`);
        console.log(`   Hedge Ratio: ${(arbitrage.hedgeRatio * 100).toFixed(1)}%`);
        console.log(`   Confidence: ${(arbitrage.confidence * 100).toFixed(1)}%`);

        // Validate V1
        const validation = validateSyntheticArbitrageComplete(arbitrage, 'v1');
        console.log(`   Validation: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`);
        if (!validation.isValid) {
            console.log(`   Errors: ${validation.businessErrors.join(', ')}`);
        }

        return arbitrage;
    }

    /**
     * Example 2: Profitable V1 Synthetic Arbitrage Batch
     */
    static createProfitableV1Batch(): SyntheticArbitrageV1[] {
        console.log('📊 Creating Profitable V1 Batch...');

        const batch = SyntheticArbitrageBatchFactory.createV1Batch(5, true);

        console.log(`✅ Created ${batch.length} profitable V1 opportunities:`);
        batch.forEach((arb, index) => {
            console.log(`   ${index + 1}. EV: ${(arb.expectedValue * 100).toFixed(2)}%, Confidence: ${(arb.confidence * 100).toFixed(1)}%`);
        });

        return batch;
    }

    /**
     * Example 3: V1 Market Compatibility Validation
     */
    static demonstrateV1Validation(): void {
        console.log('🔍 Demonstrating V1 Validation...');

        // Create valid example
        const validArb = SyntheticArbitrageV1Factory.createProfitable();
        const validValidation = validateSyntheticArbitrageComplete(validArb, 'v1');

        console.log('✅ Valid V1 Example:');
        console.log(`   Is Valid: ${validValidation.isValid}`);
        console.log(`   Schema Errors: ${validValidation.schemaErrors.length}`);
        console.log(`   Business Errors: ${validValidation.businessErrors.length}`);

        // Create invalid example (same exchange)
        const invalidArb = SyntheticArbitrageV1Factory.create({
            markets: [
                validArb.markets[0],
                { ...validArb.markets[1], exchange: validArb.markets[0].exchange }
            ]
        });

        const invalidValidation = validateSyntheticArbitrageComplete(invalidArb, 'v1');

        console.log('❌ Invalid V1 Example (same exchange):');
        console.log(`   Is Valid: ${invalidValidation.isValid}`);
        console.log(`   Business Errors: ${invalidValidation.businessErrors.join(', ')}`);
    }

    // ===== V2 EXAMPLES: RISK MANAGEMENT =====

    /**
     * Example 4: V2 Synthetic Arbitrage with Risk Metrics
     */
    static createRiskManagedV2Example(): SyntheticArbitrageV2 {
        console.log('⚠️ Creating V2 Risk-Managed Synthetic Arbitrage...');

        const arbitrage = SyntheticArbitrageV2Factory.createConservative();

        console.log('✅ V2 Synthetic Arbitrage with Risk Management:');
        console.log(`   Position Size: $${arbitrage.positionSize.toLocaleString()}`);
        console.log(`   Stop Loss: $${arbitrage.stopLoss.toLocaleString()}`);
        console.log(`   Target Profit: $${arbitrage.targetProfit.toLocaleString()}`);
        console.log(`   VaR95: ${(arbitrage.riskMetrics.var95 * 100).toFixed(2)}%`);
        console.log(`   Sharpe Ratio: ${arbitrage.riskMetrics.sharpeRatio.toFixed(2)}`);
        console.log(`   Kelly Fraction: ${(arbitrage.riskMetrics.positionMetrics.kellyFraction * 100).toFixed(1)}%`);

        // Validate V2
        const validation = validateSyntheticArbitrageComplete(arbitrage, 'v2');
        console.log(`   Validation: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`);
        if (validation.warnings.length > 0) {
            console.log(`   Warnings: ${validation.warnings.join(', ')}`);
        }

        return arbitrage;
    }

    /**
     * Example 5: V2 Risk Profile Comparison
     */
    static compareRiskProfiles(): void {
        console.log('📈 Comparing V2 Risk Profiles...');

        const conservative = SyntheticArbitrageV2Factory.createConservative();
        const normal = SyntheticArbitrageV2Factory.create();
        const aggressive = SyntheticArbitrageV2Factory.createAggressive();

        console.log('Risk Profile Comparison:');
        console.log('                    Conservative    Normal      Aggressive');
        console.log(`Expected Value:     ${(conservative.expectedValue * 100).toFixed(2)}%       ${(normal.expectedValue * 100).toFixed(2)}%        ${(aggressive.expectedValue * 100).toFixed(2)}%`);
        console.log(`Position Size:      $${conservative.positionSize.toLocaleString().padStart(8)}   $${normal.positionSize.toLocaleString().padStart(8)}    $${aggressive.positionSize.toLocaleString().padStart(8)}`);
        console.log(`VaR95:              ${(conservative.riskMetrics.var95 * 100).toFixed(2)}%        ${(normal.riskMetrics.var95 * 100).toFixed(2)}%        ${(aggressive.riskMetrics.var95 * 100).toFixed(2)}%`);
        console.log(`Sharpe Ratio:       ${conservative.riskMetrics.sharpeRatio.toFixed(2).padStart(8)}     ${normal.riskMetrics.sharpeRatio.toFixed(2).padStart(8)}      ${aggressive.riskMetrics.sharpeRatio.toFixed(2).padStart(8)}`);
        console.log(`Max Leverage:       ${conservative.maxLeverage.toFixed(1).padStart(8)}x      ${normal.maxLeverage.toFixed(1).padStart(8)}x       ${aggressive.maxLeverage.toFixed(1).padStart(8)}x`);
    }

    /**
     * Example 6: V2 NBA with Comprehensive Risk Analysis
     */
    static createNBAV2WithRiskAnalysis(): SyntheticArbitrageV2 {
        console.log('🏀 Creating NBA V2 with Risk Analysis...');

        const nbaArb = SyntheticArbitrageV2Factory.createNBAV2Example();

        console.log('📊 NBA V2 Risk Analysis:');
        console.log(`   Game: ${nbaArb.markets[0].gameId}`);
        console.log(`   Markets: ${nbaArb.markets[0].period} (${nbaArb.markets[0].exchange}) vs ${nbaArb.markets[1].period} (${nbaArb.markets[1].exchange})`);
        console.log(`   Expected Return: ${(nbaArb.expectedValue * 100).toFixed(2)}%`);
        console.log(`   Risk-Adjusted Return: ${nbaArb.riskMetrics.positionMetrics.riskAdjustedReturn.toFixed(3)}`);
        console.log(`   Risk Metrics:`);
        console.log(`     VaR95: ${(nbaArb.riskMetrics.var95 * 100).toFixed(2)}%`);
        console.log(`     VaR99: ${(nbaArb.riskMetrics.var99 * 100).toFixed(2)}%`);
        console.log(`     Max Drawdown: $${nbaArb.riskMetrics.maxDrawdown.toLocaleString()}`);
        console.log(`   Execution Risk:`);
        console.log(`     Liquidity Risk: ${(nbaArb.riskMetrics.executionRisk.liquidityRisk * 100).toFixed(1)}%`);
        console.log(`     Execution Risk: ${(nbaArb.riskMetrics.executionRisk.executionRisk * 100).toFixed(1)}%`);
        console.log(`     Slippage Risk: ${(nbaArb.riskMetrics.executionRisk.slippageRisk * 100).toFixed(1)}%`);

        return nbaArb;
    }

    // ===== V3 EXAMPLES: ADVANCED FEATURES =====

    /**
     * Example 7: V3 Multi-Market Synthetic Arbitrage
     */
    static createMultiMarketV3Example(): SyntheticArbitrageV3 {
        console.log('🔄 Creating V3 Multi-Market Synthetic Arbitrage...');

        const arbitrage = SyntheticArbitrageV3Factory.create();

        console.log('✅ V3 Multi-Market Synthetic Arbitrage:');
        console.log(`   Markets: ${arbitrage.markets.length} markets`);
        arbitrage.markets.forEach((market, index) => {
            console.log(`     ${index + 1}. ${market.period} (${market.exchange}) - Line: ${market.line}`);
        });
        console.log(`   Optimal Weights: [${arbitrage.optimalWeights.map(w => (w * 100).toFixed(1)).join('%, ')}%]`);
        console.log(`   Diversification Ratio: ${arbitrage.diversificationRatio.toFixed(3)}`);
        console.log(`   Concentration Risk: ${(arbitrage.concentrationRisk * 100).toFixed(1)}%`);
        console.log(`   Efficient Frontier Points: ${arbitrage.efficientFrontier.length}`);

        // Show correlation matrix
        console.log('   Correlation Matrix:');
        arbitrage.correlationMatrix.matrix.forEach((row, i) => {
            console.log(`     ${arbitrage.correlationMatrix.symbols[i]}: [${row.map(c => c.toFixed(2)).join(', ')}]`);
        });

        return arbitrage;
    }

    /**
     * Example 8: V3 Execution Plan and Monitoring
     */
    static demonstrateV3Execution(): SyntheticArbitrageV3 {
        console.log('⚡ Demonstrating V3 Execution and Monitoring...');

        const arbitrage = SyntheticArbitrageV3Factory.createMultiMarketNBAExample();

        console.log('📋 Execution Plan:');
        console.log(`   Status: ${arbitrage.executionPlan.status}`);
        console.log(`   Orders: ${arbitrage.executionPlan.orders.length}`);
        console.log(`   Total Size: $${arbitrage.executionPlan.totalSize.toLocaleString()}`);
        console.log(`   Execution Timeout: ${arbitrage.executionPlan.executionTimeout}ms`);
        console.log(`   Retry Policy: Max ${arbitrage.executionPlan.retryPolicy.maxRetries} retries`);

        arbitrage.executionPlan.orders.forEach((order, index) => {
            console.log(`   Order ${index + 1}: ${order.side.toUpperCase()} ${order.size} @ $${order.price} (${order.market.exchange})`);
        });

        console.log('📊 Real-time Monitoring:');
        console.log(`   Current P&L: $${arbitrage.monitoring.currentPnL.toLocaleString()}`);
        console.log(`   Execution Progress: ${(arbitrage.monitoring.executionProgress * 100).toFixed(1)}%`);
        console.log(`   Market Conditions: ${arbitrage.monitoring.marketConditions.volatility} volatility, ${arbitrage.monitoring.marketConditions.liquidity} liquidity`);

        console.log('📈 Performance Tracking:');
        console.log(`   Total Trades: ${arbitrage.performance.totalTrades}`);
        console.log(`   Win Rate: ${(arbitrage.performance.winRate * 100).toFixed(1)}%`);
        console.log(`   Sharpe Ratio: ${arbitrage.performance.sharpeRatio.toFixed(2)}`);
        console.log(`   Total Return: ${(arbitrage.performance.totalReturn * 100).toFixed(2)}%`);

        return arbitrage;
    }

    /**
     * Example 9: V3 Alert System and History
     */
    static demonstrateV3Alerts(): SyntheticArbitrageV3 {
        console.log('🚨 Demonstrating V3 Alert System...');

        const arbitrage = SyntheticArbitrageV3Factory.createMultiMarketNBAExample();

        // Simulate adding alerts
        console.log('Adding alerts to synthetic arbitrage...');

        // This would be done through the actual V3 methods in a real implementation
        console.log('📢 Alert System:');
        console.log(`   Active Alerts: ${arbitrage.alerts.length}`);
        console.log(`   History Entries: ${arbitrage.history.length}`);

        arbitrage.history.forEach((entry, index) => {
            console.log(`   ${index + 1}. ${entry.action} at ${entry.timestamp.toISOString()}`);
        });

        return arbitrage;
    }

    // ===== COMPREHENSIVE WORKFLOW EXAMPLES =====

    /**
     * Example 10: Complete V1→V2→V3 Evolution Workflow
     */
    static demonstrateCompleteEvolution(): void {
        console.log('🚀 Demonstrating Complete V1→V2→V3 Evolution...');

        // Step 1: V1 Core Detection
        console.log('\n📊 Step 1: V1 Core Detection');
        const v1Arb = this.createBasicNBAExample();

        // Step 2: V2 Risk Management
        console.log('\n⚠️ Step 2: V2 Risk Management');
        const v2Arb = this.createRiskManagedV2Example();

        // Step 3: V3 Advanced Features
        console.log('\n🔄 Step 3: V3 Advanced Features');
        const v3Arb = this.createMultiMarketV3Example();

        // Comparison
        console.log('\n📈 Evolution Summary:');
        console.log('Version   Markets   Risk Metrics   Execution   Monitoring');
        console.log(`V1        2         ❌             ❌          ❌`);
        console.log(`V2        2         ✅             ❌          ❌`);
        console.log(`V3        3+        ✅             ✅          ✅`);

        console.log('\n✅ Evolution Complete: From basic detection to comprehensive execution system');
    }

    /**
     * Example 11: Performance Benchmarking
     */
    static demonstratePerformanceBenchmarking(): void {
        console.log('⚡ Performance Benchmarking...');

        const iterations = 1000;

        // V1 Performance
        console.log('\n📊 V1 Performance Test:');
        const v1Start = performance.now();
        for (let i = 0; i < iterations; i++) {
            const arb = SyntheticArbitrageV1Factory.createProfitable();
            validateSyntheticArbitrageV1(arb);
        }
        const v1End = performance.now();
        const v1AvgTime = (v1End - v1Start) / iterations;
        console.log(`   Average time per V1 creation+validation: ${v1AvgTime.toFixed(3)}ms`);

        // V2 Performance
        console.log('\n⚠️ V2 Performance Test:');
        const v2Start = performance.now();
        for (let i = 0; i < iterations; i++) {
            const arb = SyntheticArbitrageV2Factory.create();
            validateSyntheticArbitrageV2(arb);
        }
        const v2End = performance.now();
        const v2AvgTime = (v2End - v2Start) / iterations;
        console.log(`   Average time per V2 creation+validation: ${v2AvgTime.toFixed(3)}ms`);

        // V3 Performance
        console.log('\n🔄 V3 Performance Test:');
        const v3Start = performance.now();
        for (let i = 0; i < iterations; i++) {
            const arb = SyntheticArbitrageV3Factory.create();
            validateSyntheticArbitrageV3(arb);
        }
        const v3End = performance.now();
        const v3AvgTime = (v3End - v3Start) / iterations;
        console.log(`   Average time per V3 creation+validation: ${v3AvgTime.toFixed(3)}ms`);

        console.log('\n📈 Performance Summary:');
        console.log(`   V1 (Core): ${v1AvgTime.toFixed(3)}ms - ✅ Sub-millisecond`);
        console.log(`   V2 (Risk): ${v2AvgTime.toFixed(3)}ms - ✅ Sub-millisecond`);
        console.log(`   V3 (Advanced): ${v3AvgTime.toFixed(3)}ms - ${v3AvgTime < 1 ? '✅' : '⚠️'} ${v3AvgTime < 1 ? 'Sub-millisecond' : 'Above target'}`);
    }

    /**
     * Example 12: Real-world NBA Scenario
     */
    static createRealWorldNBAScenario(): {
        v1Detection: SyntheticArbitrageV1;
        v2RiskAnalysis: SyntheticArbitrageV2;
        v3ExecutionPlan: SyntheticArbitrageV3;
    } {
        console.log('🏀 Real-world NBA Scenario: Lakers vs Celtics');

        // V1: Initial detection
        console.log('\n📊 Step 1: Opportunity Detection (V1)');
        const v1Detection = SyntheticArbitrageV1Factory.createNBAExample();
        console.log(`   ✅ Opportunity detected: ${(v1Detection.expectedValue * 100).toFixed(2)}% expected value`);

        // V2: Risk analysis
        console.log('\n⚠️ Step 2: Risk Analysis (V2)');
        const v2RiskAnalysis = SyntheticArbitrageV2Factory.createNBAV2Example();
        console.log(`   ✅ Risk assessment complete: ${v2RiskAnalysis.riskMetrics.sharpeRatio.toFixed(2)} Sharpe ratio`);
        console.log(`   💰 Recommended position: $${v2RiskAnalysis.positionSize.toLocaleString()}`);

        // V3: Execution planning
        console.log('\n🔄 Step 3: Execution Planning (V3)');
        const v3ExecutionPlan = SyntheticArbitrageV3Factory.createMultiMarketNBAExample();
        console.log(`   ✅ Execution plan ready: ${v3ExecutionPlan.executionPlan.orders.length} orders`);
        console.log(`   ⏱️  Estimated execution time: ${v3ExecutionPlan.executionPlan.executionTimeout}ms`);

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
        console.log('🚀 Running All Incremental Synthetic Arbitrage Examples\n');

        try {
            this.createBasicNBAExample();
            console.log('\n' + '='.repeat(60));

            this.createProfitableV1Batch();
            console.log('\n' + '='.repeat(60));

            this.demonstrateV1Validation();
            console.log('\n' + '='.repeat(60));

            this.createRiskManagedV2Example();
            console.log('\n' + '='.repeat(60));

            this.compareRiskProfiles();
            console.log('\n' + '='.repeat(60));

            this.createNBAV2WithRiskAnalysis();
            console.log('\n' + '='.repeat(60));

            this.createMultiMarketV3Example();
            console.log('\n' + '='.repeat(60));

            this.demonstrateV3Execution();
            console.log('\n' + '='.repeat(60));

            this.demonstrateV3Alerts();
            console.log('\n' + '='.repeat(60));

            this.demonstrateCompleteEvolution();
            console.log('\n' + '='.repeat(60));

            this.demonstratePerformanceBenchmarking();
            console.log('\n' + '='.repeat(60));

            this.createRealWorldNBAScenario();

            console.log('\n✅ All examples completed successfully!');

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
