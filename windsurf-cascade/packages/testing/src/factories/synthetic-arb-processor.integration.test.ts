// packages/testing/src/factories/synthetic-arb-processor.integration.test.ts - Integration tests for complete processor

import { test, describe, expect, beforeEach } from 'bun:test';
import { SyntheticArbProcessor } from './synthetic-arb-processor';
import { SyntheticArbitrageFactory } from './synthetic-arbitrage-factory';

describe('SyntheticArbProcessor - Integration Tests', () => {
    let processor: SyntheticArbProcessor;
    let config: any;

    beforeEach(() => {
        config = {
            correlationDrop: {
                threshold: 0.8,
                durationMs: 100,
                cooldownMs: 1000
            },
            residualExplosion: {
                multiplier: 3.0
            },
            executionGap: {
                windowMs: 30000,
                minSuccessRate: 0.7
            },
            adverseMove: {
                sampleSize: 5,
                observationMs: 5000,
                sigmaThreshold: 2.0
            },
            maxDailyLoss: 5000,
            maxConsecutiveRejects: 3,
            minDataQuality: 95.0,
            maxLatencyMs: 100,
            processing: {
                batchSize: 100,
                evaluationIntervalMs: 50
            }
        };

        processor = new SyntheticArbProcessor(config);
    });

    describe('End-to-End Processing Flow', () => {
        test('processes valid opportunities successfully', async () => {
            const primaryStream = [
                { gameId: 'game1', odds: { home: -110, away: -110 }, timestamp: Date.now() },
                { gameId: 'game2', odds: { home: -105, away: -105 }, timestamp: Date.now() }
            ];

            const hedgeStream = [
                { gameId: 'game1', odds: { home: 108, away: -112 }, timestamp: Date.now() },
                { gameId: 'game2', odds: { home: 102, away: -118 }, timestamp: Date.now() }
            ];

            const results = await processor.processCrossMarketStream(
                primaryStream,
                hedgeStream,
                'test-relationship'
            );

            expect(results).toBeInstanceOf(Array);
            expect(results.length).toBeGreaterThan(0);

            const metrics = processor.getMetrics();
            expect(metrics.opportunitiesProcessed).toBeGreaterThan(0);
            expect(metrics.opportunitiesAccepted).toBeGreaterThan(0);
        });

        test('rejects opportunities with low correlation', async () => {
            const primaryStream = [
                { gameId: 'game1', odds: { home: -110, away: -110 }, timestamp: Date.now() }
            ];

            const hedgeStream = [
                { gameId: 'game1', odds: { home: 120, away: -140 }, timestamp: Date.now() } // Low correlation
            ];

            const results = await processor.processCrossMarketStream(
                primaryStream,
                hedgeStream,
                'low-correlation-relationship'
            );

            // Should reject due to low correlation
            expect(results.length).toBe(0);

            const metrics = processor.getMetrics();
            expect(metrics.opportunitiesRejected).toBeGreaterThan(0);
        });

        test('handles extreme mispricing correctly', async () => {
            const primaryStream = [
                { gameId: 'game1', odds: { home: -200, away: -200 }, timestamp: Date.now() }
            ];

            const hedgeStream = [
                { gameId: 'game1', odds: { home: 150, away: -170 }, timestamp: Date.now() }
            ];

            const results = await processor.processCrossMarketStream(
                primaryStream,
                hedgeStream,
                'extreme-mispricing-relationship'
            );

            const metrics = processor.getMetrics();
            expect(metrics.circuitBreakerTrips).toBeGreaterThan(0);
        });
    });

    describe('Daily P&L Integration', () => {
        test('stops processing when daily loss limit is breached', async () => {
            // Simulate existing losses
            processor.onTradeSettlement('existing-trade', -4000);

            const primaryStream = [
                { gameId: 'game1', odds: { home: -110, away: -110 }, timestamp: Date.now() }
            ];

            const hedgeStream = [
                { gameId: 'game1', odds: { home: 108, away: -112 }, timestamp: Date.now() }
            ];

            const results = await processor.processCrossMarketStream(
                primaryStream,
                hedgeStream,
                'test-relationship'
            );

            // Should still process but circuit breaker should be tripped
            const pnlStatus = processor.getPnLStatus();
            expect(pnlStatus.dailyPnL).toBe(-4000);
            expect(pnlStatus.isWithinLimits).toBe(true);

            // Add more loss to breach limit
            processor.onTradeSettlement('new-trade', -2000);

            const results2 = await processor.processCrossMarketStream(
                primaryStream,
                hedgeStream,
                'test-relationship-2'
            );

            const pnlStatus2 = processor.getPnLStatus();
            expect(pnlStatus2.isWithinLimits).toBe(false);
        });

        test('P&L updates affect circuit breaker decisions', async () => {
            const primaryStream = [
                { gameId: 'game1', odds: { home: -110, away: -110 }, timestamp: Date.now() }
            ];

            const hedgeStream = [
                { gameId: 'game1', odds: { home: 108, away: -112 }, timestamp: Date.now() }
            ];

            // Initial processing should work
            const results1 = await processor.processCrossMarketStream(
                primaryStream,
                hedgeStream,
                'test-relationship'
            );

            const cbStatus1 = processor.getCircuitBreakerStatus();
            expect(cbStatus1.some(cb => cb.state.state === 'OPEN')).toBe(false);

            // Breach daily limit
            processor.onTradeSettlement('big-loss', -6000);

            // Next processing should trip circuit breakers
            const results2 = await processor.processCrossMarketStream(
                primaryStream,
                hedgeStream,
                'test-relationship-2'
            );

            const cbStatus2 = processor.getCircuitBreakerStatus();
            expect(cbStatus2.some(cb => cb.state.state === 'OPEN')).toBe(true);
        });
    });

    describe('Adverse Move Integration', () => {
        test('tracks adverse moves after fills', async () => {
            const primaryStream = [
                { gameId: 'game1', odds: { home: -110, away: -110 }, timestamp: Date.now() }
            ];

            const hedgeStream = [
                { gameId: 'game1', odds: { home: 108, away: -112 }, timestamp: Date.now() }
            ];

            // Process opportunities to get fills
            const results = await processor.processCrossMarketStream(
                primaryStream,
                hedgeStream,
                'test-relationship'
            );

            if (results.length > 0) {
                // Send adverse price moves
                const adverseTicks = [
                    { odds: { home: -115, away: -115 } },
                    { odds: { home: -120, away: -120 } },
                    { odds: { home: -125, away: -125 } },
                    { odds: { home: -130, away: -130 } },
                    { odds: { home: -140, away: -140 } } // Large move
                ];

                // Process adverse moves
                for (const tick of adverseTicks) {
                    await processor.processCrossMarketStream([tick], [], 'test-relationship');
                }

                const metrics = processor.getMetrics();
                expect(metrics.adverseMoveTrips).toBeGreaterThan(0);
            }
        });
    });

    describe('Multiple Relationship Management', () => {
        test('manages different circuit breakers for different relationships', async () => {
            const primaryStream = [
                { gameId: 'game1', odds: { home: -110, away: -110 }, timestamp: Date.now() }
            ];

            const hedgeStream1 = [
                { gameId: 'game1', odds: { home: 108, away: -112 }, timestamp: Date.now() }
            ];

            const hedgeStream2 = [
                { gameId: 'game1', odds: { home: 120, away: -140 }, timestamp: Date.now() } // Low correlation
            ];

            // Process good relationship
            const results1 = await processor.processCrossMarketStream(
                primaryStream,
                hedgeStream1,
                'good-relationship'
            );

            // Process bad relationship
            const results2 = await processor.processCrossMarketStream(
                primaryStream,
                hedgeStream2,
                'bad-relationship'
            );

            const cbStatus = processor.getCircuitBreakerStatus();
            expect(cbStatus.length).toBe(2);

            const goodCb = cbStatus.find(cb => cb.relationshipKey === 'good-relationship');
            const badCb = cbStatus.find(cb => cb.relationshipKey === 'bad-relationship');

            expect(goodCb?.state.state).toBe('CLOSED');
            expect(badCb?.state.state).toBe('OPEN');
        });
    });

    describe('Health Check Integration', () => {
        test('provides comprehensive health status', async () => {
            // Process some opportunities
            const primaryStream = [
                { gameId: 'game1', odds: { home: -110, away: -110 }, timestamp: Date.now() }
            ];

            const hedgeStream = [
                { gameId: 'game1', odds: { home: 108, away: -112 }, timestamp: Date.now() }
            ];

            await processor.processCrossMarketStream(
                primaryStream,
                hedgeStream,
                'test-relationship'
            );

            const health = processor.healthCheck();

            expect(health).toHaveProperty('isHealthy');
            expect(health).toHaveProperty('issues');
            expect(health).toHaveProperty('metrics');
            expect(health).toHaveProperty('pnlStatus');
            expect(health).toHaveProperty('circuitBreakerStatus');

            expect(health.metrics.opportunitiesProcessed).toBeGreaterThan(0);
            expect(health.circuitBreakerStatus.length).toBe(1);
        });

        test('detects and reports issues correctly', async () => {
            // Create issues by breaching daily limit
            processor.onTradeSettlement('big-loss', -6000);

            const health = processor.healthCheck();

            expect(health.isHealthy).toBe(false);
            expect(health.issues.length).toBeGreaterThan(0);
            expect(health.issues.some(issue => issue.includes('max_daily_loss'))).toBe(true);
        });
    });

    describe('Performance and Metrics', () => {
        test('tracks processing metrics accurately', async () => {
            const primaryStream = [
                { gameId: 'game1', odds: { home: -110, away: -110 }, timestamp: Date.now() },
                { gameId: 'game2', odds: { home: -105, away: -105 }, timestamp: Date.now() }
            ];

            const hedgeStream = [
                { gameId: 'game1', odds: { home: 108, away: -112 }, timestamp: Date.now() },
                { gameId: 'game2', odds: { home: 102, away: -118 }, timestamp: Date.now() }
            ];

            await processor.processCrossMarketStream(
                primaryStream,
                hedgeStream,
                'test-relationship'
            );

            const metrics = processor.getMetrics();

            expect(metrics.opportunitiesProcessed).toBeGreaterThan(0);
            expect(metrics.averageProcessingTime).toBeGreaterThan(0);
            expect(metrics.averageProcessingTime).toBeLessThan(1000); // Should be fast
        });

        test('handles batch processing efficiently', async () => {
            const largePrimaryStream = Array.from({ length: 50 }, (_, i) => ({
                gameId: `game${i}`,
                odds: { home: -110 + i, away: -(-110 + i) },
                timestamp: Date.now()
            }));

            const largeHedgeStream = Array.from({ length: 50 }, (_, i) => ({
                gameId: `game${i}`,
                odds: { home: 108 + i, away: -(108 + i) },
                timestamp: Date.now()
            }));

            const startTime = Date.now();
            const results = await processor.processCrossMarketStream(
                largePrimaryStream,
                largeHedgeStream,
                'batch-relationship'
            );
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(500); // Should complete quickly

            const metrics = processor.getMetrics();
            expect(metrics.opportunitiesProcessed).toBe(50);
        });
    });

    describe('Manual Operations', () => {
        test('manual circuit breaker reset functionality', async () => {
            // Trip a circuit breaker
            const primaryStream = [
                { gameId: 'game1', odds: { home: -110, away: -110 }, timestamp: Date.now() }
            ];

            const hedgeStream = [
                { gameId: 'game1', odds: { home: 120, away: -140 }, timestamp: Date.now() }
            ];

            await processor.processCrossMarketStream(
                primaryStream,
                hedgeStream,
                'test-relationship'
            );

            // Verify it's tripped
            let cbStatus = processor.getCircuitBreakerStatus();
            const testCb = cbStatus.find(cb => cb.relationshipKey === 'test-relationship');
            expect(testCb?.state.state).toBe('OPEN');

            // Manual reset
            const resetSuccess = processor.resetCircuitBreaker('test-relationship');
            expect(resetSuccess).toBe(true);

            // Verify it's reset
            cbStatus = processor.getCircuitBreakerStatus();
            const resetCb = cbStatus.find(cb => cb.relationshipKey === 'test-relationship');
            expect(resetCb?.state.state).toBe('CLOSED');
        });
    });
});
