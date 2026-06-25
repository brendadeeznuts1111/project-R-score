// packages/odds-core/src/examples/covariance-matrix-examples.ts - Comprehensive covariance matrix examples

import { CovarianceMatrixCalculator, HistoricalDataFactory } from '@odds-core/utils';
import type { HistoricalDataPoint, CovarianceMatrixResult, HedgeRatioResult } from '@odds-core/utils';

/**
 * Comprehensive covariance matrix calculation examples
 */
export class CovarianceMatrixExamples {

    /**
     * Example 1: Basic covariance calculation for NBA synthetic arbitrage
     */
    static demonstrateBasicCovariance(): void {
        console.info('🏀 Basic Covariance Calculation - NBA 1Q vs Full Game\n');

        // Generate synthetic NBA data
        const historicalData = HistoricalDataFactory.createNBAData('LAL_BOS_2024', 250);

        console.info(`📊 Generated ${historicalData.length} historical data points`);
        console.info(`   Date range: ${historicalData[0].timestamp.toISOString().split('T')[0]} to ${historicalData[historicalData.length - 1].timestamp.toISOString().split('T')[0]}`);

        // Calculate covariance matrix
        const calculator = new CovarianceMatrixCalculator();
        const covarianceResult = calculator.calculateCovarianceMatrix(historicalData);

        console.info('\n📈 Covariance Matrix Results:');
        console.info(`   Covariance: ${covarianceResult.covariance.toFixed(6)}`);
        console.info(`   Correlation: ${covarianceResult.correlation.toFixed(4)} (${(covarianceResult.correlation * 100).toFixed(1)}%)`);
        console.info(`   Variance 1 (1Q): ${covarianceResult.variance1.toFixed(6)}`);
        console.info(`   Variance 2 (Full): ${covarianceResult.variance2.toFixed(6)}`);
        console.info(`   Sample Size: ${covarianceResult.sampleSize}`);
        console.info(`   Confidence: ${(covarianceResult.confidence * 100).toFixed(1)}%`);
        console.info(`   Standard Error: ${covarianceResult.standardError.toFixed(6)}`);
        console.info(`   Is Significant: ${covarianceResult.isSignificant ? '✅ Yes' : '❌ No'}`);

        // Calculate optimal hedge ratio
        const hedgeResult = calculator.calculateOptimalHedgeRatio(covarianceResult);

        console.info('\n🎯 Hedge Ratio Analysis:');
        console.info(`   Optimal Hedge Ratio: ${hedgeResult.optimalHedgeRatio.toFixed(4)} (${(hedgeResult.optimalHedgeRatio * 100).toFixed(1)}%)`);
        console.info(`   Min Variance Ratio: ${hedgeResult.minVarianceHedgeRatio.toFixed(4)} (${(hedgeResult.minVarianceHedgeRatio * 100).toFixed(1)}%)`);
        console.info(`   Risk Reduction: ${(hedgeResult.riskReduction * 100).toFixed(1)}%`);
        console.info(`   Expected Hedge Return: ${(hedgeResult.expectedHedgeReturn * 100).toFixed(2)}%`);
        console.info(`   Hedge Efficiency: ${(hedgeResult.hedgeEfficiency * 100).toFixed(1)}%`);
        console.info(`   Confidence: ${(hedgeResult.confidence * 100).toFixed(1)}%`);

        // Performance metrics
        const metrics = calculator.getPerformanceMetrics();
        console.info('\n⚡ Performance Metrics:');
        console.info(`   Calculation Time: ${metrics.calculationTime.toFixed(2)}ms`);
        console.info(`   Memory Usage: ${(metrics.memoryUsage / 1024).toFixed(2)}KB`);
        console.info(`   Data Points Processed: ${metrics.dataPointsProcessed}`);
    }

    /**
     * Example 2: Rolling covariance analysis
     */
    static demonstrateRollingCovariance(): void {
        console.info('\n🔄 Rolling Covariance Analysis - Time Series Trends\n');

        // Generate longer time series
        const historicalData = HistoricalDataFactory.createNBAData('GSW_CLE_2024', 365);

        const calculator = new CovarianceMatrixCalculator();
        const windowSize = 60; // 60-day rolling window
        const stepSize = 7;    // Weekly analysis

        console.info(`📊 Analyzing ${historicalData.length} days with ${windowSize}-day rolling window`);

        const rollingResults = calculator.calculateRollingCovariance(
            historicalData,
            windowSize,
            stepSize
        );

        console.info(`\n📈 Rolling Analysis Results (${rollingResults.length} windows):`);

        // Show first, middle, and last results
        const indicesToShow = [0, Math.floor(rollingResults.length / 2), rollingResults.length - 1];

        indicesToShow.forEach((index, i) => {
            const result = rollingResults[index];
            console.info(`\n   Window ${i + 1} (${result.windowStart.toISOString().split('T')[0]} - ${result.windowEnd.toISOString().split('T')[0]}):`);
            console.info(`     Correlation: ${result.covariance.correlation.toFixed(4)}`);
            console.info(`     Covariance: ${result.covariance.covariance.toFixed(6)}`);
            console.info(`     Sample Size: ${result.covariance.sampleSize}`);
        });

        // Calculate trend statistics
        const correlations = rollingResults.map(r => r.covariance.correlation);
        const avgCorrelation = correlations.reduce((sum, c) => sum + c, 0) / correlations.length;
        const minCorrelation = Math.min(...correlations);
        const maxCorrelation = Math.max(...correlations);

        console.info('\n📊 Correlation Trends:');
        console.info(`   Average Correlation: ${avgCorrelation.toFixed(4)}`);
        console.info(`   Min Correlation: ${minCorrelation.toFixed(4)}`);
        console.info(`   Max Correlation: ${maxCorrelation.toFixed(4)}`);
        console.info(`   Correlation Range: ${(maxCorrelation - minCorrelation).toFixed(4)}`);

        // Detect significant changes
        const significantChanges = rollingResults.filter((r, i) => {
            if (i === 0) return false;
            const prevCorr = rollingResults[i - 1].covariance.correlation;
            return Math.abs(r.covariance.correlation - prevCorr) > 0.1;
        });

        console.info(`\n🚨 Significant Correlation Changes: ${significantChanges.length}`);
        significantChanges.forEach((change, i) => {
            console.info(`   ${i + 1}. ${change.timestamp.toISOString().split('T')[0]}: ${change.covariance.correlation.toFixed(4)}`);
        });
    }

    /**
     * Example 3: Portfolio covariance matrix for multiple markets
     */
    static demonstratePortfolioCovariance(): void {
        console.info('\n📊 Portfolio Covariance Matrix - Multi-Market Analysis\n');

        // Create data for multiple related markets
        const markets = [
            {
                marketId: 'NBA_1Q_SPREAD',
                returns: HistoricalDataFactory.createSyntheticData(
                    { mean: 0.001, stdDev: 0.02 },
                    { mean: 0.001, stdDev: 0.02 },
                    1.0, 100
                ).map(d => d.market1Return)
            },
            {
                marketId: 'NBA_1Q_TOTAL',
                returns: HistoricalDataFactory.createSyntheticData(
                    { mean: 0.0005, stdDev: 0.015 },
                    { mean: 0.0005, stdDev: 0.015 },
                    1.0, 100
                ).map(d => d.market1Return)
            },
            {
                marketId: 'NBA_FULL_SPREAD',
                returns: HistoricalDataFactory.createSyntheticData(
                    { mean: 0.002, stdDev: 0.018 },
                    { mean: 0.002, stdDev: 0.018 },
                    1.0, 100
                ).map(d => d.market1Return)
            },
            {
                marketId: 'NBA_FULL_TOTAL',
                returns: HistoricalDataFactory.createSyntheticData(
                    { mean: 0.001, stdDev: 0.012 },
                    { mean: 0.001, stdDev: 0.012 },
                    1.0, 100
                ).map(d => d.market1Return)
            }
        ];

        const calculator = new CovarianceMatrixCalculator();
        const portfolioResult = calculator.calculatePortfolioCovariance(markets);

        console.info(`📈 Portfolio Analysis for ${markets.length} markets:`);
        console.info('   Market IDs:', portfolioResult.marketIds.join(', '));

        console.info('\n📊 Covariance Matrix:');
        portfolioResult.covarianceMatrix.forEach((row, i) => {
            const rowStr = row.map(val => val.toFixed(6).padStart(10)).join(' ');
            console.info(`   ${portfolioResult.marketIds[i].padEnd(16)} | ${rowStr}`);
        });

        console.info('\n🔗 Correlation Matrix:');
        portfolioResult.correlationMatrix.forEach((row, i) => {
            const rowStr = row.map(val => val.toFixed(4).padStart(8)).join(' ');
            console.info(`   ${portfolioResult.marketIds[i].padEnd(16)} | ${rowStr}`);
        });

        console.info('\n📊 Eigenvalues (Principal Components):');
        portfolioResult.eigenvalues.forEach((eigenval, i) => {
            const explainedVariance = (eigenval / portfolioResult.eigenvalues.reduce((sum, val) => sum + val, 0)) * 100;
            console.info(`   PC${i + 1}: ${eigenval.toFixed(6)} (${explainedVariance.toFixed(1)}% variance explained)`);
        });

        // Find most correlated pair
        let maxCorrelation = 0;
        let mostCorrelatedPair = ['', ''];

        for (let i = 0; i < portfolioResult.correlationMatrix.length; i++) {
            for (let j = i + 1; j < portfolioResult.correlationMatrix[i].length; j++) {
                const corr = Math.abs(portfolioResult.correlationMatrix[i][j]);
                if (corr > maxCorrelation) {
                    maxCorrelation = corr;
                    mostCorrelatedPair = [portfolioResult.marketIds[i], portfolioResult.marketIds[j]];
                }
            }
        }

        console.info(`\n🎯 Most Correlated Pair:`);
        console.info(`   ${mostCorrelatedPair[0]} ↔ ${mostCorrelatedPair[1]}: ${maxCorrelation.toFixed(4)}`);
    }

    /**
     * Example 4: Advanced hedge ratio optimization
     */
    static demonstrateAdvancedHedgeOptimization(): void {
        console.info('\n⚙️ Advanced Hedge Ratio Optimization\n');

        // Create data with different correlation scenarios
        const scenarios = [
            { correlation: 0.9, name: 'High Correlation' },
            { correlation: 0.6, name: 'Medium Correlation' },
            { correlation: 0.3, name: 'Low Correlation' },
            { correlation: -0.2, name: 'Negative Correlation' }
        ];

        const calculator = new CovarianceMatrixCalculator();

        scenarios.forEach(scenario => {
            console.info(`\n📊 ${scenario.name} (ρ = ${scenario.correlation}):`);

            // Generate data for this correlation level
            const data = HistoricalDataFactory.createSyntheticData(
                { mean: 0.001, stdDev: 0.02 },
                { mean: 0.002, stdDev: 0.015 },
                scenario.correlation,
                200
            );

            const covarianceResult = calculator.calculateCovarianceMatrix(data);

            // Test different risk aversion levels
            const riskAversionLevels = [0.2, 0.5, 0.8]; // Low, Medium, High

            riskAversionLevels.forEach(riskAversion => {
                const hedgeResult = calculator.calculateOptimalHedgeRatio(covarianceResult, {
                    riskAversion,
                    transactionCosts: 0.001,
                    targetRiskReduction: 0.8
                });

                const riskAversionLabel = riskAversion === 0.2 ? 'Low' : riskAversion === 0.5 ? 'Medium' : 'High';
                console.info(`   ${riskAversionLabel.padEnd(6)} Risk Aversion:`);
                console.info(`     Hedge Ratio: ${hedgeResult.optimalHedgeRatio.toFixed(4)} (${(hedgeResult.optimalHedgeRatio * 100).toFixed(1)}%)`);
                console.info(`     Risk Reduction: ${(hedgeResult.riskReduction * 100).toFixed(1)}%`);
                console.info(`     Hedge Efficiency: ${(hedgeResult.hedgeEfficiency * 100).toFixed(1)}%`);
            });
        });
    }

    /**
     * Example 5: Performance benchmarking
     */
    static demonstratePerformanceBenchmarking(): void {
        console.info('\n⚡ Performance Benchmarking\n');

        const calculator = new CovarianceMatrixCalculator();
        const dataSizes = [100, 500, 1000, 5000, 10000];

        console.info('📊 Performance vs Data Size:');
        console.info('   Size'.padEnd(8) + ' | Time (ms)'.padEnd(12) + ' | Memory (KB)'.padEnd(13) + ' | Confidence');
        console.info('   '.padEnd(8) + ' | '.padEnd(12) + ' | '.padEnd(13) + ' | ' + '-'.repeat(10));

        dataSizes.forEach(size => {
            const data = HistoricalDataFactory.createSyntheticData(
                { mean: 0.001, stdDev: 0.02 },
                { mean: 0.002, stdDev: 0.015 },
                0.65,
                size
            );

            const startTime = performance.now();
            const result = calculator.calculateCovarianceMatrix(data);
            const endTime = performance.now();

            const metrics = calculator.getPerformanceMetrics();

            console.info(
                `${size.toString().padEnd(8)} | ${(endTime - startTime).toFixed(2).padEnd(12)} | ${(metrics.memoryUsage / 1024).toFixed(2).padEnd(13)} | ${(result.confidence * 100).toFixed(1)}%`
            );
        });

        // Test different calculation options
        console.info('\n📊 Performance vs Calculation Options:');

        const testData = HistoricalDataFactory.createNBAData('PERF_TEST', 1000);

        const options = [
            { name: 'Basic', options: {} },
            { name: 'Exponential', options: { useExponentialWeighting: true } },
            { name: 'High Confidence', options: { confidenceLevel: 0.99 } },
            { name: 'Large Sample', options: { minSampleSize: 100 } }
        ];

        options.forEach(option => {
            const startTime = performance.now();
            const result = calculator.calculateCovarianceMatrix(testData, option.options);
            const endTime = performance.now();

            console.info(`   ${option.name.padEnd(16)}: ${(endTime - startTime).toFixed(2)}ms | Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        });
    }

    /**
     * Example 6: Real-world synthetic arbitrage scenario
     */
    static demonstrateRealWorldScenario(): void {
        console.info('\n🏀 Real-World NBA Synthetic Arbitrage Scenario\n');

        // Simulate a real NBA season scenario
        const calculator = new CovarianceMatrixCalculator();

        // Lakers vs Celtics - historical data
        const lalBosData = HistoricalDataFactory.createNBAData('LAL_BOS_2024', 82);
        const lalBosResult = calculator.calculateCovarianceMatrix(lalBosData);
        const lalBosHedge = calculator.calculateOptimalHedgeRatio(lalBosResult);

        console.info('📊 Lakers vs Celtics Analysis:');
        console.info(`   Games Analyzed: ${lalBosResult.sampleSize}`);
        console.info(`   Correlation (1Q ↔ Full): ${lalBosResult.correlation.toFixed(4)}`);
        console.info(`   Optimal Hedge Ratio: ${lalBosHedge.optimalHedgeRatio.toFixed(4)} (${(lalBosHedge.optimalHedgeRatio * 100).toFixed(1)}%)`);
        console.info(`   Expected Risk Reduction: ${(lalBosHedge.riskReduction * 100).toFixed(1)}%`);

        // Warriors vs Cavaliers - different correlation profile
        const gswCleData = HistoricalDataFactory.createSyntheticData(
            { mean: 0.0015, stdDev: 0.022 },
            { mean: 0.0018, stdDev: 0.016 },
            0.72, // Higher correlation
            82
        );
        const gswCleResult = calculator.calculateCovarianceMatrix(gswCleData);
        const gswCleHedge = calculator.calculateOptimalHedgeRatio(gswCleResult);

        console.info('\n📊 Warriors vs Cavaliers Analysis:');
        console.info(`   Games Analyzed: ${gswCleResult.sampleSize}`);
        console.info(`   Correlation (1Q ↔ Full): ${gswCleResult.correlation.toFixed(4)}`);
        console.info(`   Optimal Hedge Ratio: ${gswCleHedge.optimalHedgeRatio.toFixed(4)} (${(gswCleHedge.optimalHedgeRatio * 100).toFixed(1)}%)`);
        console.info(`   Expected Risk Reduction: ${(gswCleHedge.riskReduction * 100).toFixed(1)}%`);

        // Compare scenarios
        console.info('\n🎯 Scenario Comparison:');
        console.info(`   Lakers vs Celtics:  ${(lalBosHedge.riskReduction * 100).toFixed(1)}% risk reduction`);
        console.info(`   Warriors vs Cavaliers: ${(gswCleHedge.riskReduction * 100).toFixed(1)}% risk reduction`);

        const betterScenario = lalBosHedge.riskReduction > gswCleHedge.riskReduction ? 'Lakers vs Celtics' : 'Warriors vs Cavaliers';
        console.info(`   Better Opportunity: ${betterScenario}`);

        // Trading recommendation
        console.info('\n💡 Trading Recommendations:');
        if (lalBosResult.isSignificant && lalBosHedge.confidence > 0.7) {
            console.info('   ✅ Lakers vs Celtics: Consider synthetic arbitrage position');
            console.info(`      Recommended hedge: ${(lalBosHedge.optimalHedgeRatio * 100).toFixed(1)}%`);
        } else {
            console.info('   ❌ Lakers vs Celtics: Insufficient confidence for trading');
        }

        if (gswCleResult.isSignificant && gswCleHedge.confidence > 0.7) {
            console.info('   ✅ Warriors vs Cavaliers: Consider synthetic arbitrage position');
            console.info(`      Recommended hedge: ${(gswCleHedge.optimalHedgeRatio * 100).toFixed(1)}%`);
        } else {
            console.info('   ❌ Warriors vs Cavaliers: Insufficient confidence for trading');
        }
    }

    /**
     * Run all covariance matrix examples
     */
    static runAllExamples(): void {
        console.info('🚀 Covariance Matrix Calculation Examples\n');
        console.info('='.repeat(80));

        this.demonstrateBasicCovariance();
        console.info('='.repeat(80));

        this.demonstrateRollingCovariance();
        console.info('='.repeat(80));

        this.demonstratePortfolioCovariance();
        console.info('='.repeat(80));

        this.demonstrateAdvancedHedgeOptimization();
        console.info('='.repeat(80));

        this.demonstratePerformanceBenchmarking();
        console.info('='.repeat(80));

        this.demonstrateRealWorldScenario();

        console.info('\n✅ All covariance matrix examples completed!');
        console.info('\n🎯 Key Capabilities Demonstrated:');
        console.info('   • Basic covariance and correlation calculations');
        console.info('   • Rolling time-series analysis');
        console.info('   • Multi-market portfolio covariance matrices');
        console.info('   • Advanced hedge ratio optimization');
        console.info('   • Performance benchmarking and optimization');
        console.info('   • Real-world trading scenario analysis');
    }
}

export default CovarianceMatrixExamples;
