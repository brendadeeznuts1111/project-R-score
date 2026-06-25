// packages/odds-core/src/examples/synthetic-arbitrage-detector-examples.ts - Comprehensive detector demonstrations

import { SyntheticArbitrageDetector, SyntheticArbitrageDetectorFactory } from '@odds-core/detectors';
import { SyntheticArbitrageV1Factory } from '@odds-core/factories';
import type { SportMarket, DetectionResult } from '@odds-core/types';

/**
 * Comprehensive synthetic arbitrage detector examples
 */
export class SyntheticArbitrageDetectorExamples {

    /**
     * Example 1: Basic opportunity detection with NBA markets
     */
    static async demonstrateBasicDetection(): Promise<void> {
        console.info('🏀 Basic Synthetic Arbitrage Detection - NBA Markets\n');

        // Create detector with default criteria
        const detector = new SyntheticArbitrageDetector();

        // Generate test market data
        const factory = new SyntheticArbitrageV1Factory();
        const nbaMarkets = factory.createMultipleNBAExamples(50);

        console.info(`📊 Generated ${nbaMarkets.length} NBA market instances`);
        console.info(`   Time range: ${nbaMarkets[0].timestamp.toISOString()} to ${nbaMarkets[nbaMarkets.length - 1].timestamp.toISOString()}`);

        // Extract individual markets from arbitrage instances
        const allMarkets: SportMarket[] = [];
        nbaMarkets.forEach(arbitrage => {
            arbitrage.markets.forEach(market => {
                allMarkets.push(market.market);
            });
        });

        console.info(`   Total individual markets: ${allMarkets.length}`);

        // Detect opportunities
        const startTime = performance.now();
        const opportunities = await detector.detectOpportunities(allMarkets, {
            maxOpportunities: 20,
            useCache: true,
            includeRiskMetrics: true
        });
        const detectionTime = performance.now() - startTime;

        console.info(`\n🎯 Detection Results:`);
        console.info(`   Processing Time: ${detectionTime.toFixed(2)}ms`);
        console.info(`   Opportunities Found: ${opportunities.length}`);
        console.info(`   Success Rate: ${((opportunities.length / allMarkets.length) * 100).toFixed(1)}%`);

        if (opportunities.length > 0) {
            console.info(`\n📈 Top 5 Opportunities:`);

            opportunities.slice(0, 5).forEach((opp, index) => {
                console.info(`\n   ${index + 1}. ${opp.arbitrage.id}`);
                console.info(`      Expected Return: ${(opp.arbitrage.expectedReturn * 100).toFixed(3)}%`);
                console.info(`      Opportunity Score: ${(opp.score * 100).toFixed(1)}%`);
                console.info(`      Hedge Ratio: ${(opp.arbitrage.hedgeRatio * 100).toFixed(1)}%`);
                console.info(`      Correlation: ${opp.arbitrage.correlation.toFixed(4)}`);
                console.info(`      Confidence: ${(opp.arbitrage.confidence * 100).toFixed(1)}%`);
                console.info(`      Execution: ${opp.execution.difficulty} (${opp.execution.estimatedTimeToExecute}ms)`);
                console.info(`      Sharpe Ratio: ${opp.profitability.sharpeRatio.toFixed(3)}`);
            });
        }

        // Performance metrics
        const metrics = detector.getPerformanceMetrics();
        console.info(`\n⚡ Detector Performance:`);
        console.info(`   Total Detections: ${metrics.totalDetections}`);
        console.info(`   Successful Detections: ${metrics.successfulDetections}`);
        console.info(`   Average Processing Time: ${metrics.averageProcessingTime.toFixed(2)}ms`);
        console.info(`   Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    }

    /**
     * Example 2: Different strategy comparisons
     */
    static async demonstrateStrategyComparison(): Promise<void> {
        console.info('\n🎭 Strategy Comparison - Conservative vs Aggressive vs HFT\n');

        // Create detectors with different strategies
        const conservativeDetector = SyntheticArbitrageDetectorFactory.createConservativeDetector();
        const aggressiveDetector = SyntheticArbitrageDetectorFactory.createAggressiveDetector();
        const hftDetector = SyntheticArbitrageDetectorFactory.createHFTDetector();

        // Generate test data
        const factory = new SyntheticArbitrageV1Factory();
        const testMarkets = factory.createMultipleNBAExamples(100);

        const allMarkets: SportMarket[] = [];
        testMarkets.forEach(arbitrage => {
            arbitrage.markets.forEach(market => {
                allMarkets.push(market.market);
            });
        });

        console.info(`📊 Testing with ${allMarkets.length} markets\n`);

        // Test each strategy
        const strategies = [
            { name: 'Conservative', detector: conservativeDetector },
            { name: 'Aggressive', detector: aggressiveDetector },
            { name: 'High-Frequency', detector: hftDetector }
        ];

        for (const strategy of strategies) {
            console.info(`🔍 ${strategy.name} Strategy:`);

            const startTime = performance.now();
            const opportunities = await strategy.detector.detectOpportunities(allMarkets);
            const processingTime = performance.now() - startTime;

            if (opportunities.length > 0) {
                const avgReturn = opportunities.reduce((sum, opp) => sum + opp.arbitrage.expectedReturn, 0) / opportunities.length;
                const avgScore = opportunities.reduce((sum, opp) => sum + opp.score, 0) / opportunities.length;
                const avgConfidence = opportunities.reduce((sum, opp) => sum + opp.arbitrage.confidence, 0) / opportunities.length;

                console.info(`   Opportunities: ${opportunities.length}`);
                console.info(`   Processing Time: ${processingTime.toFixed(2)}ms`);
                console.info(`   Average Return: ${(avgReturn * 100).toFixed(3)}%`);
                console.info(`   Average Score: ${(avgScore * 100).toFixed(1)}%`);
                console.info(`   Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

                // Show best opportunity
                const best = opportunities[0];
                console.info(`   Best Opportunity: ${(best.arbitrage.expectedReturn * 100).toFixed(3)}% return, ${(best.score * 100).toFixed(1)}% score`);
            } else {
                console.info(`   No opportunities found`);
                console.info(`   Processing Time: ${processingTime.toFixed(2)}ms`);
            }
            console.info('');
        }
    }

    /**
     * Example 3: Real-time detection simulation
     */
    static async demonstrateRealTimeDetection(): Promise<void> {
        console.info('⚡ Real-Time Detection Simulation\n');

        const detector = SyntheticArbitrageDetectorFactory.createHFTDetector();
        const factory = new SyntheticArbitrageV1Factory();

        // Start with some existing markets
        const existingMarkets = factory.createMultipleNBAExamples(20);
        const allExistingMarkets: SportMarket[] = [];
        existingMarkets.forEach(arbitrage => {
            arbitrage.markets.forEach(market => {
                allExistingMarkets.push(market.market);
            });
        });

        console.info(`📊 Starting with ${allExistingMarkets.length} existing markets`);

        // Simulate streaming new markets
        const newMarkets = factory.createMultipleNBAExamples(10);
        let totalDetections = 0;
        let successfulDetections = 0;

        console.info('\n🔄 Simulating real-time market updates...\n');

        for (let i = 0; i < newMarkets.length; i++) {
            const newArbitrage = newMarkets[i];
            const newMarket = newArbitrage.markets[0].market; // Use first market as "new"

            console.info(`📈 Processing new market ${i + 1}: ${newMarket.rotationId}`);

            // Real-time detection
            const startTime = performance.now();
            const opportunity = await detector.detectRealTimeOpportunity(newMarket, allExistingMarkets);
            const processingTime = performance.now() - startTime;

            totalDetections++;

            if (opportunity) {
                successfulDetections++;
                console.info(`   ✅ OPPORTUNITY FOUND!`);
                console.info(`      Return: ${(opportunity.arbitrage.expectedReturn * 100).toFixed(3)}%`);
                console.info(`      Score: ${(opportunity.score * 100).toFixed(1)}%`);
                console.info(`      Processing: ${processingTime.toFixed(2)}ms`);
                console.info(`      Execution: ${opportunity.execution.difficulty}`);
            } else {
                console.info(`   ❌ No opportunity detected (${processingTime.toFixed(2)}ms)`);
            }

            // Add new market to existing markets
            allExistingMarkets.push(newMarket);

            // Small delay to simulate real-time processing
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        console.info(`\n📊 Real-Time Detection Summary:`);
        console.info(`   Total Markets Processed: ${totalDetections}`);
        console.info(`   Opportunities Found: ${successfulDetections}`);
        console.info(`   Hit Rate: ${((successfulDetections / totalDetections) * 100).toFixed(1)}%`);

        const metrics = detector.getPerformanceMetrics();
        console.info(`   Average Processing Time: ${metrics.averageProcessingTime.toFixed(2)}ms`);
    }

    /**
     * Example 4: Performance benchmarking
     */
    static async demonstratePerformanceBenchmarking(): Promise<void> {
        console.info('🚀 Performance Benchmarking\n');

        const dataSizes = [50, 100, 200, 500, 1000];
        const detector = SyntheticArbitrageDetectorFactory.createHFTDetector();

        console.info('📊 Scaling Performance Test:');
        console.info('   Size'.padEnd(8) + ' | Time (ms)'.padEnd(12) + ' | Opportunities'.padEnd(15) + ' | Success Rate');
        console.info('   '.padEnd(8) + ' | '.padEnd(12) + ' | '.padEnd(15) + ' | ' + '-'.repeat(12));

        for (const size of dataSizes) {
            // Generate test data
            const factory = new SyntheticArbitrageV1Factory();
            const testData = factory.createMultipleNBAExamples(size);

            const markets: SportMarket[] = [];
            testData.forEach(arbitrage => {
                arbitrage.markets.forEach(market => {
                    markets.push(market.market);
                });
            });

            // Benchmark detection
            const startTime = performance.now();
            const opportunities = await detector.detectOpportunities(markets);
            const processingTime = performance.now() - startTime;

            const successRate = ((opportunities.length / markets.length) * 100).toFixed(1);

            console.info(
                `${size.toString().padEnd(8)} | ${processingTime.toFixed(2).padEnd(12)} | ${opportunities.length.toString().padEnd(15)} | ${successRate}%`
            );
        }

        // Memory usage test
        console.info('\n📈 Memory Usage Analysis:');

        const memoryTestSizes = [100, 500, 1000];

        for (const size of memoryTestSizes) {
            const factory = new SyntheticArbitrageV1Factory();
            const testData = factory.createMultipleNBAExamples(size);

            const markets: SportMarket[] = [];
            testData.forEach(arbitrage => {
                arbitrage.markets.forEach(market => {
                    markets.push(market.market);
                });
            });

            // Measure memory before
            const memBefore = process.memoryUsage().heapUsed;

            // Run detection
            await detector.detectOpportunities(markets);

            // Measure memory after
            const memAfter = process.memoryUsage().heapUsed;
            const memoryUsed = (memAfter - memBefore) / 1024 / 1024; // MB

            console.info(`   ${size} markets: ${memoryUsed.toFixed(2)}MB memory used`);
        }
    }

    /**
     * Example 5: Risk analysis and filtering
     */
    static async demonstrateRiskAnalysis(): Promise<void> {
        console.info('⚠️ Risk Analysis and Filtering\n');

        const detector = new SyntheticArbitrageDetector();
        const factory = new SyntheticArbitrageV1Factory();

        // Generate opportunities
        const markets = factory.createMultipleNBAExamples(100);
        const allMarkets: SportMarket[] = [];
        markets.forEach(arbitrage => {
            arbitrage.markets.forEach(market => {
                allMarkets.push(market.market);
            });
        });

        const opportunities = await detector.detectOpportunities(allMarkets);

        if (opportunities.length === 0) {
            console.info('No opportunities found for risk analysis');
            return;
        }

        console.info(`📊 Analyzing risk for ${opportunities.length} opportunities\n`);

        // Risk categories
        const lowRisk = opportunities.filter(opp =>
            opp.risk.volatility < 0.02 &&
            opp.risk.correlationRisk < 0.3 &&
            opp.risk.executionRisk < 0.2
        );

        const mediumRisk = opportunities.filter(opp =>
            opp.risk.volatility >= 0.02 && opp.risk.volatility < 0.05 &&
            opp.risk.correlationRisk >= 0.3 && opp.risk.correlationRisk < 0.6 &&
            opp.risk.executionRisk >= 0.2 && opp.risk.executionRisk < 0.5
        );

        const highRisk = opportunities.filter(opp =>
            opp.risk.volatility >= 0.05 ||
            opp.risk.correlationRisk >= 0.6 ||
            opp.risk.executionRisk >= 0.5
        );

        console.info('🎯 Risk Distribution:');
        console.info(`   Low Risk: ${lowRisk.length} opportunities (${((lowRisk.length / opportunities.length) * 100).toFixed(1)}%)`);
        console.info(`   Medium Risk: ${mediumRisk.length} opportunities (${((mediumRisk.length / opportunities.length) * 100).toFixed(1)}%)`);
        console.info(`   High Risk: ${highRisk.length} opportunities (${((highRisk.length / opportunities.length) * 100).toFixed(1)}%)`);

        // Show examples from each category
        if (lowRisk.length > 0) {
            console.info('\n✅ Low Risk Example:');
            const example = lowRisk[0];
            console.info(`   Return: ${(example.arbitrage.expectedReturn * 100).toFixed(3)}%`);
            console.info(`   Volatility: ${(example.risk.volatility * 100).toFixed(2)}%`);
            console.info(`   Correlation Risk: ${(example.risk.correlationRisk * 100).toFixed(1)}%`);
            console.info(`   Execution Risk: ${(example.risk.executionRisk * 100).toFixed(1)}%`);
        }

        if (highRisk.length > 0) {
            console.info('\n⚠️ High Risk Example:');
            const example = highRisk[0];
            console.info(`   Return: ${(example.arbitrage.expectedReturn * 100).toFixed(3)}%`);
            console.info(`   Volatility: ${(example.risk.volatility * 100).toFixed(2)}%`);
            console.info(`   Correlation Risk: ${(example.risk.correlationRisk * 100).toFixed(1)}%`);
            console.info(`   Execution Risk: ${(example.risk.executionRisk * 100).toFixed(1)}%`);
        }

        // Risk vs Return analysis
        console.info('\n📈 Risk vs Return Analysis:');

        const riskReturnData = opportunities.map(opp => ({
            return: opp.arbitrage.expectedReturn,
            risk: opp.risk.volatility + opp.risk.correlationRisk + opp.risk.executionRisk,
            sharpe: opp.profitability.sharpeRatio
        }));

        const avgReturn = riskReturnData.reduce((sum, d) => sum + d.return, 0) / riskReturnData.length;
        const avgRisk = riskReturnData.reduce((sum, d) => sum + d.risk, 0) / riskReturnData.length;
        const avgSharpe = riskReturnData.reduce((sum, d) => sum + d.sharpe, 0) / riskReturnData.length;

        console.info(`   Average Return: ${(avgReturn * 100).toFixed(3)}%`);
        console.info(`   Average Risk: ${(avgRisk * 100).toFixed(1)}%`);
        console.info(`   Average Sharpe Ratio: ${avgSharpe.toFixed(3)}`);

        // Find best risk-adjusted opportunity
        const bestRiskAdjusted = opportunities.reduce((best, current) =>
            current.profitability.sharpeRatio > best.profitability.sharpeRatio ? current : best
        );

        console.info('\n🏆 Best Risk-Adjusted Opportunity:');
        console.info(`   Return: ${(bestRiskAdjusted.arbitrage.expectedReturn * 100).toFixed(3)}%`);
        console.info(`   Sharpe Ratio: ${bestRiskAdjusted.profitability.sharpeRatio.toFixed(3)}`);
        console.info(`   Risk Score: ${((bestRiskAdjusted.risk.volatility + bestRiskAdjusted.risk.correlationRisk + bestRiskAdjusted.risk.executionRisk) * 100).toFixed(1)}%`);
    }

    /**
     * Run all detector examples
     */
    static async runAllExamples(): Promise<void> {
        console.info('🚀 Synthetic Arbitrage Detector Examples\n');
        console.info('='.repeat(80));

        await this.demonstrateBasicDetection();
        console.info('='.repeat(80));

        await this.demonstrateStrategyComparison();
        console.info('='.repeat(80));

        await this.demonstrateRealTimeDetection();
        console.info('='.repeat(80));

        await this.demonstratePerformanceBenchmarking();
        console.info('='.repeat(80));

        await this.demonstrateRiskAnalysis();

        console.info('\n✅ All synthetic arbitrage detector examples completed!');
        console.info('\n🎯 Key Capabilities Demonstrated:');
        console.info('   • High-performance opportunity detection');
        console.info('   • Multiple strategy implementations (Conservative, Aggressive, HFT)');
        console.info('   • Real-time streaming detection');
        console.info('   • Performance benchmarking and scalability');
        console.info('   • Comprehensive risk analysis and filtering');
        console.info('   • Institutional-grade scoring and execution metrics');
    }
}

export default SyntheticArbitrageDetectorExamples;
