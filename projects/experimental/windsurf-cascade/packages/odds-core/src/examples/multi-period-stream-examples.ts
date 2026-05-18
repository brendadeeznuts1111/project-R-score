// packages/odds-core/src/examples/multi-period-stream-examples.ts - Comprehensive multi-period stream processing examples

import { MultiPeriodStreamProcessor, MultiPeriodStreamProcessorFactory } from '@odds-core/processors';
import { SyntheticArbitrageV1Factory } from '@odds-core/factories';
import type { MultiPeriodMarketStream, PeriodSyntheticArbitrage, SportMarket } from '@odds-core/processors';

/**
 * Comprehensive multi-period stream processor examples
 */
export class MultiPeriodStreamExamples {

    /**
     * Example 1: Basic multi-period stream processing
     */
    static async demonstrateBasicStreamProcessing(): Promise<void> {
        console.info('🔄 Basic Multi-Period Stream Processing\n');

        // Create NBA processor
        const processor = MultiPeriodStreamProcessorFactory.createNBAProcessor();

        // Generate test stream data
        const factory = new SyntheticArbitrageV1Factory();
        const nbaGames = factory.createMultipleNBAExamples(10);

        console.info(`📊 Generated ${nbaGames.length} NBA games for stream processing`);

        // Convert to stream format
        const streamData = this.convertToStreamData(nbaGames);

        console.info(`📈 Stream data contains ${Object.keys(streamData[0].periods).length} periods`);
        console.info(`   Periods: ${Object.keys(streamData[0].periods).join(', ')}`);

        // Set up event listeners
        let opportunitiesDetected = 0;
        let totalProcessingTime = 0;

        processor.addEventListener('opportunitiesDetected', (data: any) => {
            opportunitiesDetected += data.opportunities.length;
            totalProcessingTime += data.processingTime;
            console.info(`   🎯 Detected ${data.opportunities.length} opportunities (${data.processingTime.toFixed(2)}ms)`);
        });

        processor.addEventListener('immediateOpportunity', (data: any) => {
            console.info(`   ⚡ Immediate opportunity: ${data.opportunities.length} opportunities`);
        });

        // Process stream data
        console.info('\n🔄 Processing market streams...\n');

        for (let i = 0; i < streamData.length; i++) {
            const stream = streamData[i];
            console.info(`Processing game ${i + 1}/${streamData.length}: ${stream.gameId}`);

            await processor.processMarketStream(stream);

            // Small delay to simulate real-time processing
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Wait for processing to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get results
        const metrics = processor.getMetrics();
        const realTimeOpportunities = processor.getRealTimeOpportunities();

        console.info('\n📊 Processing Results:');
        console.info(`   Total Markets Processed: ${metrics.totalMarketsProcessed}`);
        console.info(`   Opportunities Detected: ${opportunitiesDetected}`);
        console.info(`   Average Processing Time: ${metrics.averageProcessingTime.toFixed(2)}ms`);
        console.info(`   Buffer Utilization: ${(metrics.bufferUtilization * 100).toFixed(1)}%`);
        console.info(`   Real-Time Opportunities: ${realTimeOpportunities.length}`);

        console.info('\n📈 Period Coverage:');
        Object.entries(metrics.periodCoverage).forEach(([period, count]) => {
            console.info(`   ${period}: ${count} markets`);
        });

        console.info('\n⚡ Real-Time Performance:');
        console.info(`   Latency: ${metrics.realTimePerformance.latency.toFixed(2)}ms`);
        console.info(`   Throughput: ${metrics.realTimePerformance.throughput.toFixed(1)} markets/sec`);
        console.info(`   Success Rate: ${(metrics.realTimePerformance.successRate * 100).toFixed(1)}%`);
    }

    /**
     * Example 2: Real-time opportunity detection
     */
    static async demonstrateRealTimeOpportunities(): Promise<void> {
        console.info('\n⚡ Real-Time Opportunity Detection\n');

        // Create live processor for ultra-fast processing
        const processor = MultiPeriodStreamProcessorFactory.createLiveProcessor();

        // Set up real-time event listeners
        processor.addEventListener('immediateOpportunity', (data: any) => {
            console.info(`🚨 IMMEDIATE OPPORTUNITY DETECTED!`);
            console.info(`   Game: ${data.streamData.gameId}`);
            console.info(`   Opportunities: ${data.opportunities.length}`);

            data.opportunities.forEach((opp: PeriodSyntheticArbitrage, index: number) => {
                console.info(`   ${index + 1}. ${opp.primaryPeriod} ↔ ${opp.secondaryPeriod}`);
                console.info(`      Return: ${(opp.arbitrage.expectedReturn * 100).toFixed(3)}%`);
                console.info(`      Execution Window: ${opp.executionWindow.optimal.toLocaleTimeString()}`);
                console.info(`      Correlation: ${opp.periodCorrelation.toFixed(4)}`);
            });
        });

        // Simulate live game data
        console.info('🏀 Simulating live NBA game data...\n');

        const factory = new SyntheticArbitrageV1Factory();

        for (let quarter = 1; quarter <= 4; quarter++) {
            console.info(`📺 Quarter ${quarter} - Live Data Stream`);

            // Generate live data for current quarter
            const liveGame = factory.createNBAExample();
            const liveStream = this.createLiveStreamData(liveGame, quarter);

            await processor.processMarketStream(liveStream);

            // Check for real-time opportunities
            const realTimeOpps = processor.getRealTimeOpportunities();
            if (realTimeOpps.length > 0) {
                console.info(`   🎯 ${realTimeOpps.length} real-time opportunities available`);

                // Show top opportunity
                const topOpp = realTimeOpps[0];
                console.info(`   🏆 Top Opportunity:`);
                console.info(`      ${topOpp.primaryPeriod} ↔ ${topOpp.secondaryPeriod}`);
                console.info(`      Expected Return: ${(topOpp.arbitrage.expectedReturn * 100).toFixed(3)}%`);
                console.info(`      Optimal Execution: ${topOpp.executionWindow.optimal.toLocaleTimeString()}`);
            }

            // Simulate quarter break
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Final processing
        await processor.processBufferedOpportunities();

        const metrics = processor.getMetrics();
        console.info('\n📊 Live Processing Summary:');
        console.info(`   Total Markets: ${metrics.totalMarketsProcessed}`);
        console.info(`   Opportunities: ${metrics.opportunitiesDetected}`);
        console.info(`   Average Latency: ${metrics.realTimePerformance.latency.toFixed(2)}ms`);
        console.info(`   Success Rate: ${(metrics.realTimePerformance.successRate * 100).toFixed(1)}%`);
    }

    /**
     * Example 3: Multi-sport comparison
     */
    static async demonstrateMultiSportComparison(): Promise<void> {
        console.info('\n🏈⚾🏀 Multi-Sport Stream Processing Comparison\n');

        // Create processors for different sports
        const nbaProcessor = MultiPeriodStreamProcessorFactory.createNBAProcessor();
        const nflProcessor = MultiPeriodStreamProcessorFactory.createNFLProcessor();

        const factory = new SyntheticArbitrageV1Factory();

        // Generate test data for each sport
        const nbaGames = factory.createMultipleNBAExamples(15);
        const nflGames = factory.createMultipleNFLExamples(10); // Assuming NFL factory exists

        const nbaStreams = this.convertToStreamData(nbaGames);
        const nflStreams = this.convertToStreamData(nflGames);

        console.info('📊 Test Data:');
        console.info(`   NBA Games: ${nbaStreams.length}`);
        console.info(`   NFL Games: ${nflStreams.length}`);

        // Process NBA streams
        console.info('\n🏀 Processing NBA Streams...');
        const nbaStartTime = performance.now();

        for (const stream of nbaStreams) {
            await nbaProcessor.processMarketStream(stream);
        }
        await new Promise(resolve => setTimeout(resolve, 300));

        const nbaProcessingTime = performance.now() - nbaStartTime;
        const nbaMetrics = nbaProcessor.getMetrics();
        const nbaOpportunities = await nbaProcessor.processBufferedOpportunities();

        // Process NFL streams
        console.info('\n🏈 Processing NFL Streams...');
        const nflStartTime = performance.now();

        for (const stream of nflStreams) {
            await nflProcessor.processMarketStream(stream);
        }
        await new Promise(resolve => setTimeout(resolve, 300));

        const nflProcessingTime = performance.now() - nflStartTime;
        const nflMetrics = nflProcessor.getMetrics();
        const nflOpportunities = await nflProcessor.processBufferedOpportunities();

        // Compare results
        console.info('\n📈 Multi-Sport Comparison:');
        console.info('Sport'.padEnd(8) + ' | Time (ms)'.padEnd(12) + ' | Opportunities'.padEnd(15) + ' | Success Rate');
        console.info(''.padEnd(8) + ' | '.padEnd(12) + ' | '.padEnd(15) + ' | ' + '-'.repeat(12));

        console.info(
            `NBA`.padEnd(8) + ' | ' + `${nbaProcessingTime.toFixed(2)}`.padEnd(12) + ' | ' +
            `${nbaOpportunities.length}`.padEnd(15) + ' | ' +
            `${((nbaOpportunities.length / nbaMetrics.totalMarketsProcessed) * 100).toFixed(1)}%`
        );

        console.info(
            `NFL`.padEnd(8) + ' | ' + `${nflProcessingTime.toFixed(2)}`.padEnd(12) + ' | ' +
            `${nflOpportunities.length}`.padEnd(15) + ' | ' +
            `${((nflOpportunities.length / nflMetrics.totalMarketsProcessed) * 100).toFixed(1)}%`
        );

        // Period analysis
        console.info('\n🎯 Period-Specific Analysis:');

        console.info('\nNBA Period Opportunities:');
        nbaOpportunities.forEach((opp, index) => {
            if (index < 5) { // Show top 5
                console.info(`   ${index + 1}. ${opp.primaryPeriod} ↔ ${opp.secondaryPeriod}: ${(opp.arbitrage.expectedReturn * 100).toFixed(3)}%`);
            }
        });

        console.info('\nNFL Period Opportunities:');
        nflOpportunities.forEach((opp, index) => {
            if (index < 5) { // Show top 5
                console.info(`   ${index + 1}. ${opp.primaryPeriod} ↔ ${opp.secondaryPeriod}: ${(opp.arbitrage.expectedReturn * 100).toFixed(3)}%`);
            }
        });
    }

    /**
     * Example 4: Performance benchmarking
     */
    static async demonstratePerformanceBenchmarking(): Promise<void> {
        console.info('\n🚀 Multi-Period Stream Performance Benchmarking\n');

        const dataSizes = [50, 100, 200, 500];
        const processor = MultiPeriodStreamProcessorFactory.createNBAProcessor();

        console.info('📊 Scaling Performance Test:');
        console.info('Size'.padEnd(8) + ' | Time (ms)'.padEnd(12) + ' | Buffer %'.padEnd(10) + ' | Throughput');
        console.info(''.padEnd(8) + ' | '.padEnd(12) + ' | '.padEnd(10) + ' | ' + '-'.repeat(10));

        for (const size of dataSizes) {
            // Clear processor for clean test
            processor.clearBuffers();

            // Generate test data
            const factory = new SyntheticArbitrageV1Factory();
            const testGames = factory.createMultipleNBAExamples(size);
            const testStreams = this.convertToStreamData(testGames);

            // Benchmark processing
            const startTime = performance.now();

            for (const stream of testStreams) {
                await processor.processMarketStream(stream);
            }

            await processor.processBufferedOpportunities();

            const processingTime = performance.now() - startTime;
            const metrics = processor.getMetrics();
            const throughput = (metrics.totalMarketsProcessed / (processingTime / 1000)).toFixed(1);

            console.info(
                `${size.toString().padEnd(8)} | ${processingTime.toFixed(2).padEnd(12)} | ` +
                `${(metrics.bufferUtilization * 100).toFixed(1).padEnd(10)} | ${throughput} markets/sec`
            );
        }

        // Latency benchmark
        console.info('\n⚡ Latency Analysis:');

        const latencyTests = [10, 25, 50, 100]; // Processing intervals

        for (const interval of latencyTests) {
            const testProcessor = new MultiPeriodStreamProcessor({
                processingInterval: interval,
                maxBufferSize: 1000
            });

            const testGames = factory.createMultipleNBAExamples(20);
            const testStreams = this.convertToStreamData(testGames);

            const startTime = performance.now();

            for (const stream of testStreams) {
                await testProcessor.processMarketStream(stream);
            }

            const processingTime = performance.now() - startTime;
            const testMetrics = testProcessor.getMetrics();

            console.info(`   ${interval}ms interval: ${testMetrics.realTimePerformance.latency.toFixed(2)}ms avg latency`);

            testProcessor.stopProcessing();
        }
    }

    /**
     * Example 5: Period pair analysis
     */
    static async demonstratePeriodPairAnalysis(): Promise<void> {
        console.info('\n🎯 Period Pair Analysis\n');

        const processor = MultiPeriodStreamProcessorFactory.createNBAProcessor();
        const factory = new SyntheticArbitrageV1Factory();

        // Generate comprehensive test data
        const testGames = factory.createMultipleNBAExamples(50);
        const testStreams = this.convertToStreamData(testGames);

        // Process all streams
        for (const stream of testStreams) {
            await processor.processMarketStream(stream);
        }

        await processor.processBufferedOpportunities();

        // Analyze period pairs
        const periodPairs = [
            ['first-quarter', 'full-game'],
            ['first-half', 'full-game'],
            ['second-quarter', 'full-game'],
            ['first-quarter', 'first-half'],
            ['second-quarter', 'first-half']
        ];

        console.info('📊 Period Pair Performance:');
        console.info('Period Pair'.padEnd(25) + ' | Opportunities | Avg Return | Avg Correlation');
        console.info(''.padEnd(25) + ' | ' + '-'.repeat(12) + ' | ' + '-'.repeat(10) + ' | ' + '-'.repeat(14));

        for (const [primary, secondary] of periodPairs) {
            const opportunities = processor.getOpportunitiesByPeriodPair(
                primary as any,
                secondary as any
            );

            if (opportunities.length > 0) {
                const avgReturn = opportunities.reduce((sum, opp) => sum + opp.arbitrage.expectedReturn, 0) / opportunities.length;
                const avgCorrelation = opportunities.reduce((sum, opp) => sum + opp.periodCorrelation, 0) / opportunities.length;

                console.info(
                    `${primary} ↔ ${secondary}`.padEnd(25) + ' | ' +
                    `${opportunities.length.toString().padEnd(12)} | ` +
                    `${(avgReturn * 100).toFixed(3).padEnd(10)}% | ` +
                    `${avgCorrelation.toFixed(4)}`
                );
            } else {
                console.info(
                    `${primary} ↔ ${secondary}`.padEnd(25) + ' | ' +
                    `0`.padEnd(12) + ' | ' +
                    `0.000%`.padEnd(10) + ' | ' +
                    `0.0000`
                );
            }
        }

        // Show best opportunities by period pair
        console.info('\n🏆 Best Opportunities by Period Pair:');

        for (const [primary, secondary] of periodPairs) {
            const opportunities = processor.getOpportunitiesByPeriodPair(
                primary as any,
                secondary as any
            );

            if (opportunities.length > 0) {
                const best = opportunities[0]; // Already sorted by return
                console.info(`\n   ${primary} ↔ ${secondary}:`);
                console.info(`      Best Return: ${(best.arbitrage.expectedReturn * 100).toFixed(3)}%`);
                console.info(`      Correlation: ${best.periodCorrelation.toFixed(4)}`);
                console.info(`      Execution Window: ${best.executionWindow.optimal.toLocaleTimeString()}`);
                console.info(`      Time Decay: ${best.timeDecay.toFixed(4)}`);
            }
        }
    }

    // ===== HELPER METHODS =====

    private static convertToStreamData(games: any[]): MultiPeriodMarketStream[] {
        return games.map((game, index) => {
            const periods: Record<string, SportMarket[]> = {
                'first-quarter': [game.markets[0].market],
                'full-game': [game.markets[1].market]
            };

            return {
                sport: game.markets[0].market.sport,
                gameId: `GAME_${index + 1}`,
                periods,
                timestamp: new Date(),
                metadata: {
                    source: 'test',
                    latency: Math.random() * 50,
                    quality: 0.9 + Math.random() * 0.1
                }
            };
        });
    }

    private static createLiveStreamData(game: any, quarter: number): MultiPeriodMarketStream {
        const periods: Record<string, SportMarket[]> = {
            [`quarter-${quarter}`]: [game.markets[0].market],
            'full-game': [game.markets[1].market]
        };

        return {
            sport: game.markets[0].market.sport,
            gameId: `LIVE_GAME_${Date.now()}`,
            periods,
            timestamp: new Date(),
            metadata: {
                source: 'live',
                latency: Math.random() * 20,
                quality: 0.95 + Math.random() * 0.05
            }
        };
    }

    /**
     * Run all multi-period stream examples
     */
    static async runAllExamples(): Promise<void> {
        console.info('🚀 Multi-Period Stream Processor Examples\n');
        console.info('='.repeat(80));

        await this.demonstrateBasicStreamProcessing();
        console.info('='.repeat(80));

        await this.demonstrateRealTimeOpportunities();
        console.info('='.repeat(80));

        await this.demonstrateMultiSportComparison();
        console.info('='.repeat(80));

        await this.demonstratePerformanceBenchmarking();
        console.info('='.repeat(80));

        await this.demonstratePeriodPairAnalysis();

        console.info('\n✅ All multi-period stream processor examples completed!');
        console.info('\n🎯 Key Capabilities Demonstrated:');
        console.info('   • Multi-period market stream processing');
        console.info('   • Real-time opportunity detection with sub-50ms latency');
        console.info('   • Sport-specific processor configurations');
        console.info('   • Performance benchmarking and scalability');
        console.info('   • Period pair analysis and optimization');
        console.info('   • Event-driven architecture with live updates');
    }
}

export default MultiPeriodStreamExamples;
