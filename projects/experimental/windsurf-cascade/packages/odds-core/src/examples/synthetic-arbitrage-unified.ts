// packages/odds-core/src/examples/synthetic-arbitrage-unified.ts - Unified synthetic arbitrage examples (consolidated)

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
    SyntheticArbitrageDetector,
    SyntheticArbitrageDetectorFactory
} from '@odds-core/detectors';
import {
    MultiPeriodStreamProcessor,
    MultiPeriodStreamProcessorFactory
} from '@odds-core/processors';
import {
    SyntheticPositionTracker,
    SyntheticPositionTrackerFactory
} from '@odds-core/trackers';
import {
    MetadataValidator
} from '@odds-core/utils';
import {
    validateSyntheticArbitrageComplete,
    validateSyntheticArbitrageV1,
    validateSyntheticArbitrageV2,
    validateSyntheticArbitrageV3
} from '@odds-core/types';

/**
 * Unified Synthetic Arbitrage Examples
 * Consolidates all synthetic arbitrage functionality into focused, non-overlapping examples
 */
export class SyntheticArbitrageUnifiedExamples {

    // ===== CORE CREATION EXAMPLES =====

    /**
     * Example 1: Create V1 NBA Synthetic Arbitrage (Core functionality)
     */
    static createV1NBAExample(): SyntheticArbitrageV1 {
        console.info('🏀 Creating V1 NBA Synthetic Arbitrage...');

        const arbitrage = SyntheticArbitrageV1Factory.createNBAExample();

        console.info('✅ V1 Created:');
        console.info(`   ID: ${arbitrage.id}`);
        console.info(`   Markets: ${arbitrage.markets[0].period} vs ${arbitrage.markets[1].period}`);
        console.info(`   Expected Value: ${(arbitrage.expectedValue * 100).toFixed(2)}%`);
        console.info(`   Hedge Ratio: ${(arbitrage.hedgeRatio * 100).toFixed(1)}%`);
        console.info(`   Confidence: ${(arbitrage.confidence * 100).toFixed(1)}%`);

        // Validate
        const validation = validateSyntheticArbitrageComplete(arbitrage, 'v1');
        console.info(`   Validation: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`);

        return arbitrage;
    }

    /**
     * Example 2: Create V2 NFL Synthetic Arbitrage (Enhanced with risk metrics)
     */
    static createV2NFLExample(): SyntheticArbitrageV2 {
        console.info('\n🏈 Creating V2 NFL Synthetic Arbitrage...');

        const arbitrage = SyntheticArbitrageV2Factory.createNFLExample();

        console.info('✅ V2 Created:');
        console.info(`   ID: ${arbitrage.id}`);
        console.info(`   Markets: ${arbitrage.markets.length} markets`);
        console.info(`   Expected Return: ${(arbitrage.expectedReturn.percent * 100).toFixed(2)}%`);
        console.info(`   Risk Score: ${arbitrage.riskMetrics.riskScore.toFixed(2)}`);
        console.info(`   Max Drawdown: ${(arbitrage.riskMetrics.maxDrawdown * 100).toFixed(2)}%`);
        console.info(`   Execution Plan: ${arbitrage.executionPlan.strategy}`);

        // Validate
        const validation = validateSyntheticArbitrageComplete(arbitrage, 'v2');
        console.info(`   Validation: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`);

        return arbitrage;
    }

    /**
     * Example 3: Create V3 MLB Synthetic Arbitrage (Advanced with correlation matrix)
     */
    static createV3MLBExample(): SyntheticArbitrageV3 {
        console.info('\n⚾ Creating V3 MLB Synthetic Arbitrage...');

        const arbitrage = SyntheticArbitrageV3Factory.createMLBExample();

        console.info('✅ V3 Created:');
        console.info(`   ID: ${arbitrage.id}`);
        console.info(`   Markets: ${arbitrage.markets.length} markets`);
        console.info(`   Expected Return: ${(arbitrage.expectedReturn.percent * 100).toFixed(2)}%`);
        console.info(`   Correlation Matrix: ${arbitrage.correlationMatrix.markets.length}x${arbitrage.correlationMatrix.markets.length}`);
        console.info(`   Monitoring Active: ${arbitrage.monitoringMetrics.active}`);

        // Validate
        const validation = validateSyntheticArbitrageComplete(arbitrage, 'v3');
        console.info(`   Validation: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`);

        return arbitrage;
    }

    // ===== DETECTION EXAMPLES =====

    /**
     * Example 4: Basic opportunity detection
     */
    static async demonstrateDetection(): Promise<void> {
        console.info('\n🎯 Opportunity Detection Demo\n');

        // Create detector
        const detector = SyntheticArbitrageDetectorFactory.createConservativeDetector();

        // Generate test markets
        const factory = new SyntheticArbitrageBatchFactory();
        const markets = factory.createMixedSportMarkets(100);

        console.info(`📊 Generated ${markets.length} markets across multiple sports`);

        // Detect opportunities
        const startTime = performance.now();
        const opportunities = await detector.detectOpportunities(markets, {
            maxOpportunities: 20,
            useCache: true,
            includeRiskMetrics: true
        });
        const detectionTime = performance.now() - startTime;

        console.info(`\n🎯 Detection Results:`);
        console.info(`   Processing Time: ${detectionTime.toFixed(2)}ms`);
        console.info(`   Opportunities Found: ${opportunities.length}`);
        console.info(`   Success Rate: ${((opportunities.length / markets.length) * 100).toFixed(1)}%`);

        // Show top opportunities
        if (opportunities.length > 0) {
            console.info('\n🏆 Top Opportunities:');
            opportunities.slice(0, 3).forEach((opp, index) => {
                console.info(`   ${index + 1}. ${opp.id}: ${(opp.confidence * 100).toFixed(1)}% confidence, ${(opp.expectedReturn?.percent * 100 || 0).toFixed(2)}% return`);
            });
        }
    }

    /**
     * Example 5: High-frequency detection
     */
    static async demonstrateHFTDetection(): Promise<void> {
        console.info('\n⚡ High-Frequency Detection Demo\n');

        // Create HFT detector
        const detector = SyntheticArbitrageDetectorFactory.createHFTDetector();

        // Generate high-volume market data
        const factory = new SyntheticArbitrageBatchFactory();
        const markets = factory.createHighVolumeMarkets(1000);

        console.info(`📊 Generated ${markets.length} high-volume markets`);

        // Measure detection performance
        const startTime = performance.now();
        const opportunities = await detector.detectOpportunities(markets, {
            maxOpportunities: 100,
            useCache: true,
            includeRiskMetrics: true,
            processingMode: 'hft'
        });
        const detectionTime = performance.now() - startTime;

        const throughput = markets.length / (detectionTime / 1000);

        console.info(`\n⚡ HFT Performance:`);
        console.info(`   Processing Time: ${detectionTime.toFixed(2)}ms`);
        console.info(`   Throughput: ${throughput.toFixed(0)} markets/second`);
        console.info(`   Opportunities Found: ${opportunities.length}`);
        console.info(`   Detection Rate: ${(opportunities.length / (detectionTime / 1000)).toFixed(1)} opportunities/second`);
    }

    // ===== MULTI-PERIOD PROCESSING EXAMPLES =====

    /**
     * Example 6: Multi-period stream processing
     */
    static async demonstrateMultiPeriodProcessing(): Promise<void> {
        console.info('\n📊 Multi-Period Stream Processing Demo\n');

        // Create stream processor
        const processor = MultiPeriodStreamProcessorFactory.createLiveProcessor();

        // Generate market stream data
        const factory = new SyntheticArbitrageBatchFactory();
        const marketStream = factory.createMarketStream(50);

        console.info(`📈 Processing ${marketStream.length} market updates`);

        // Process stream
        const startTime = performance.now();
        const results = await processor.processMarketStream(marketStream, {
            enableImmediateDetection: true,
            bufferSize: 100,
            processingInterval: 10
        });
        const processingTime = performance.now() - startTime;

        console.info(`\n📊 Stream Processing Results:`);
        console.info(`   Processing Time: ${processingTime.toFixed(2)}ms`);
        console.info(`   Markets Processed: ${results.marketsProcessed}`);
        console.info(`   Opportunities Detected: ${results.opportunitiesDetected}`);
        console.info(`   Immediate Alerts: ${results.immediateAlerts}`);
        console.info(`   Average Latency: ${results.averageLatency.toFixed(2)}ms`);
    }

    // ===== POSITION TRACKING EXAMPLES =====

    /**
     * Example 7: Position tracking and risk management
     */
    static async demonstratePositionTracking(): Promise<void> {
        console.info('\n🛡️ Position Tracking & Risk Management Demo\n');

        // Create position tracker
        const tracker = SyntheticPositionTrackerFactory.createConservativeTracker();

        // Create test arbitrage opportunities
        const v1Factory = new SyntheticArbitrageV1Factory();
        const v2Factory = new SyntheticArbitrageV2Factory();
        const v3Factory = new SyntheticArbitrageV3Factory();

        const opportunities = [
            v1Factory.createNBAExample(),
            v2Factory.createNFLExample(),
            v3Factory.createMLBExample()
        ];

        console.info(`📈 Adding ${opportunities.length} positions to tracker`);

        // Add positions
        opportunities.forEach((opportunity, index) => {
            const position = tracker.addPosition(opportunity);
            console.info(`   ${index + 1}. Added position: ${position.id} (${position.status})`);
        });

        // Get portfolio metrics
        const metrics = tracker.getPortfolioMetrics();
        console.info(`\n📊 Portfolio Metrics:`);
        console.info(`   Active Positions: ${metrics.activePositions}`);
        console.info(`   Total Exposure: $${metrics.totalExposure.toFixed(2)}`);
        console.info(`   Portfolio VaR (95%): $${metrics.valueAtRisk95.toFixed(2)}`);
        console.info(`   Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}`);

        // Check for risk alerts
        const alerts = tracker.getRiskAlerts();
        if (alerts.length > 0) {
            console.info(`\n⚠️ Risk Alerts:`);
            alerts.forEach(alert => {
                console.info(`   • ${alert.type}: ${alert.message}`);
            });
        } else {
            console.info(`\n✅ No risk alerts - Portfolio within limits`);
        }
    }

    // ===== VALIDATION EXAMPLES =====

    /**
     * Example 8: Enhanced metadata validation
     */
    static demonstrateEnhancedValidation(): void {
        console.info('\n🔍 Enhanced Metadata Validation Demo\n');

        // Create validator
        const validator = new MetadataValidator();

        // Create custom validation rules
        const arbitrageRule = validator.createRule(
            'arbitrage-return-threshold',
            'Ensures arbitrage return meets minimum threshold',
            (metadata) => {
                const minReturn = 0.001; // 0.1% minimum
                if (metadata.expectedReturn && metadata.expectedReturn.percent < minReturn) {
                    return {
                        valid: false,
                        message: `Expected return ${(metadata.expectedReturn.percent * 100).toFixed(2)}% below threshold ${(minReturn * 100).toFixed(2)}%`,
                        severity: 'warning'
                    };
                }
                return { valid: true, message: '' };
            },
            'warning'
        );

        const riskRule = validator.createRule(
            'risk-score-limit',
            'Warns about high risk scores',
            (metadata) => {
                const maxRisk = 0.7;
                if (metadata.riskMetrics && metadata.riskMetrics.riskScore > maxRisk) {
                    return {
                        valid: false,
                        message: `Risk score ${metadata.riskMetrics.riskScore.toFixed(2)} exceeds limit ${maxRisk}`,
                        severity: 'error'
                    };
                }
                return { valid: true, message: '' };
            },
            'error'
        );

        // Create validation schema
        const arbitrageSchema = validator.createSchema(
            'synthetic-arbitrage-strict',
            '1.0.0',
            [arbitrageRule, riskRule],
            ['id', 'markets', 'expectedReturn', 'riskMetrics'],
            ['correlationMatrix', 'monitoringMetrics']
        );

        // Register schema
        validator.registerSchema(arbitrageSchema);

        // Test validation
        const factory = new SyntheticArbitrageV3Factory();
        const testArbitrage = factory.createMLBExample();

        // Validate with custom schema
        const validationResult = validator.validateWithSchema(
            testArbitrage,
            'synthetic-arbitrage-strict',
            { includeWarnings: true }
        );

        console.info('📋 Validation Results:');
        console.info(`   Valid: ${validationResult.valid}`);
        console.info(`   Errors: ${validationResult.errors.length}`);
        console.info(`   Warnings: ${validationResult.warnings.length}`);

        if (validationResult.errors.length > 0) {
            console.info('\n❌ Errors:');
            validationResult.errors.forEach(error => console.info(`   • ${error}`));
        }

        if (validationResult.warnings.length > 0) {
            console.info('\n⚠️ Warnings:');
            validationResult.warnings.forEach(warning => console.info(`   • ${warning}`));
        }
    }

    // ===== INTEGRATION EXAMPLES =====

    /**
     * Example 9: Complete synthetic arbitrage workflow
     */
    static async demonstrateCompleteWorkflow(): Promise<void> {
        console.info('\n🔄 Complete Synthetic Arbitrage Workflow Demo\n');

        // 1. Initialize components
        const detector = SyntheticArbitrageDetectorFactory.createHFTDetector();
        const processor = MultiPeriodStreamProcessorFactory.createLiveProcessor();
        const tracker = SyntheticPositionTrackerFactory.createHFTTracker();
        const validator = new MetadataValidator();

        console.info('✅ Components initialized');

        // 2. Generate market data
        const factory = new SyntheticArbitrageBatchFactory();
        const markets = factory.createHighVolumeMarkets(500);

        console.info(`📊 Generated ${markets.length} markets`);

        // 3. Detect opportunities
        const opportunities = await detector.detectOpportunities(markets, {
            maxOpportunities: 25,
            includeRiskMetrics: true
        });

        console.info(`🎯 Detected ${opportunities.length} opportunities`);

        // 4. Validate top opportunities
        const validOpportunities = opportunities.filter(opp => {
            const validation = validator.validateWithContext(opp, {
                strictMode: true,
                includeWarnings: false
            });
            return validation.valid;
        });

        console.info(`✅ Validated ${validOpportunities.length} opportunities`);

        // 5. Add positions to tracker
        validOpportunities.slice(0, 10).forEach((opp, index) => {
            const position = tracker.addPosition(opp);
            console.info(`   ${index + 1}. Position added: ${position.id}`);
        });

        // 6. Get final portfolio status
        const finalMetrics = tracker.getPortfolioMetrics();
        console.info(`\n📊 Final Portfolio Status:`);
        console.info(`   Active Positions: ${finalMetrics.activePositions}`);
        console.info(`   Total Exposure: $${finalMetrics.totalExposure.toFixed(2)}`);
        console.info(`   Expected Return: ${(finalMetrics.expectedReturn * 100).toFixed(2)}%`);
        console.info(`   Portfolio VaR (95%): $${finalMetrics.valueAtRisk95.toFixed(2)}`);
        console.info(`   Sharpe Ratio: ${finalMetrics.sharpeRatio.toFixed(2)}`);
    }

    // ===== PERFORMANCE BENCHMARKS =====

    /**
     * Example 10: Performance benchmarks
     */
    static async demonstratePerformanceBenchmarks(): Promise<void> {
        console.info('\n⚡ Performance Benchmarks Demo\n');

        const testSizes = [100, 500, 1000, 2000];
        const detector = SyntheticArbitrageDetectorFactory.createHFTDetector();

        console.info('📊 Performance Test Results:');
        console.info('Markets\tTime(ms)\tThroughput/sec\tOpportunities\tDetection Rate/sec');
        console.info('-------\t-------\t-----------\t------------\t----------------');

        for (const size of testSizes) {
            // Generate test data
            const factory = new SyntheticArbitrageBatchFactory();
            const markets = factory.createHighVolumeMarkets(size);

            // Measure detection performance
            const startTime = performance.now();
            const opportunities = await detector.detectOpportunities(markets, {
                maxOpportunities: 50,
                useCache: true,
                processingMode: 'hft'
            });
            const detectionTime = performance.now() - startTime;

            const throughput = size / (detectionTime / 1000);
            const detectionRate = opportunities.length / (detectionTime / 1000);

            console.info(`${size}\t${detectionTime.toFixed(1)}\t${throughput.toFixed(0)}\t\t${opportunities.length}\t\t${detectionRate.toFixed(1)}`);
        }
    }

    /**
     * Run all unified synthetic arbitrage examples
     */
    static async runAllExamples(): Promise<void> {
        console.info('🚀 Unified Synthetic Arbitrage Examples\n');
        console.info('='.repeat(80));

        // Core creation examples
        this.createV1NBAExample();
        this.createV2NFLExample();
        this.createV3MLBExample();

        console.info('='.repeat(80));

        // Detection examples
        await this.demonstrateDetection();
        await this.demonstrateHFTDetection();

        console.info('='.repeat(80));

        // Processing examples
        await this.demonstrateMultiPeriodProcessing();

        console.info('='.repeat(80));

        // Position tracking examples
        await this.demonstratePositionTracking();

        console.info('='.repeat(80));

        // Validation examples
        this.demonstrateEnhancedValidation();

        console.info('='.repeat(80));

        // Integration examples
        await this.demonstrateCompleteWorkflow();

        console.info('='.repeat(80));

        // Performance benchmarks
        await this.demonstratePerformanceBenchmarks();

        console.info('\n✅ All unified synthetic arbitrage examples completed!');
        console.info('\n🎯 Key Capabilities Demonstrated:');
        console.info('   • V1/V2/V3 synthetic arbitrage creation and validation');
        console.info('   • High-performance opportunity detection (HFT capable)');
        console.info('   • Multi-period stream processing with real-time alerts');
        console.info('   • Institutional-grade position tracking and risk management');
        console.info('   • Enhanced metadata validation with custom rules and schemas');
        console.info('   • Complete workflow integration across all components');
        console.info('   • Performance benchmarks and scalability testing');
        console.info('   • Production-ready synthetic arbitrage platform');
    }
}

export default SyntheticArbitrageUnifiedExamples;
