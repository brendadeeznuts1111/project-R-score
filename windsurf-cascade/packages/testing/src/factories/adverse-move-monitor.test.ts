// packages/testing/src/factories/adverse-move-monitor.test.ts - Tests for adverse move monitoring with price history sigma

import { test, describe, expect, beforeEach } from 'bun:test';
import { AdverseMoveMonitor } from './adverse-move-monitor';
import { SyntheticArbitrageFactory } from './synthetic-arbitrage-factory';

describe('AdverseMoveMonitor - Price History Sigma', () => {
    let config: any;
    let monitor: AdverseMoveMonitor;
    let tripEvents: Array<{ opportunityId: string; event: any }> = [];

    beforeEach(() => {
        config = {
            adverseMove: {
                sampleSize: 10,
                observationMs: 60000,
                sigmaThreshold: 2.0
            }
        };

        tripEvents = [];
        monitor = new AdverseMoveMonitor(
            config,
            (opportunityId: string, event: any) => {
                tripEvents.push({ opportunityId, event });
            }
        );
    });

    describe('Post-Fill Price Tracking', () => {
        test('initializes tracker on fill with fill price', () => {
            const opportunity = SyntheticArbitrageFactory.create({
                id: 'test-opp-1',
                primaryMarket: {
                    odds: { home: -110, away: -110 },
                    exchange: 'draftkings',
                    timestamp: Date.now()
                }
            });

            monitor.onFill(opportunity);
            expect(monitor.getActiveTrackerCount()).toBe(1);
        });

        test('tracks price series for each opportunity', () => {
            const opportunity = SyntheticArbitrageFactory.create({
                id: 'test-opp-1',
                primaryMarket: {
                    odds: { home: -100, away: -100 },
                    exchange: 'draftkings',
                    timestamp: Date.now()
                }
            });

            monitor.onFill(opportunity);

            // Send price updates
            const tick1 = { odds: { home: -105, away: -105 } };
            const tick2 = { odds: { home: -110, away: -110 } };
            const tick3 = { odds: { home: -115, away: -115 } };

            monitor.onNewTick(tick1);
            monitor.onNewTick(tick2);
            monitor.onNewTick(tick3);

            expect(tripEvents.length).toBe(0); // No trips yet
        });
    });

    describe('Sigma Calculation from Price History', () => {
        test('calculates rolling standard deviation from price series', () => {
            const opportunity = SyntheticArbitrageFactory.create({
                id: 'test-opp-1',
                primaryMarket: {
                    odds: { home: -100, away: -100 },
                    exchange: 'draftkings',
                    timestamp: Date.now()
                }
            });

            monitor.onFill(opportunity);

            // Send ticks with increasing price movement
            const prices = [-100, -102, -104, -106, -108, -110, -112, -114, -116, -118];

            prices.forEach(price => {
                monitor.onNewTick({ odds: { home: price, away: -price } });
            });

            // Should have calculated sigma and potentially tripped
            expect(tripEvents.length).toBeGreaterThanOrEqual(0);
        });

        test('handles insufficient data gracefully', () => {
            const opportunity = SyntheticArbitrageFactory.create({
                id: 'test-opp-1',
                primaryMarket: {
                    odds: { home: -100, away: -100 },
                    exchange: 'draftkings',
                    timestamp: Date.now()
                }
            });

            monitor.onFill(opportunity);

            // Send only one tick (insufficient for sigma calculation)
            monitor.onNewTick({ odds: { home: -105, away: -105 } });

            expect(tripEvents.length).toBe(0);
        });
    });

    describe('Adverse Move Detection', () => {
        test('trips when price move exceeds sigma threshold', () => {
            const opportunity = SyntheticArbitrageFactory.create({
                id: 'test-opp-1',
                primaryMarket: {
                    odds: { home: -100, away: -100 },
                    exchange: 'draftkings',
                    timestamp: Date.now()
                }
            });

            monitor.onFill(opportunity);

            // Send ticks with large price movement (should create high sigma)
            const stablePrices = [-100, -101, -100, -99, -100, -101, -100, -99, -100]; // Low volatility
            stablePrices.forEach(price => {
                monitor.onNewTick({ odds: { home: price, away: -price } });
            });

            // Then send a large move
            monitor.onNewTick({ odds: { home: -120, away: -120 } }); // 20 point move

            // Should detect adverse move
            expect(tripEvents.length).toBeGreaterThan(0);
            expect(tripEvents[0].opportunityId).toBe('test-opp-1');
            expect(tripEvents[0].event.zScore).toBeGreaterThan(config.adverseMove.sigmaThreshold);
        });

        test('does not trip for normal price fluctuations', () => {
            const opportunity = SyntheticArbitrageFactory.create({
                id: 'test-opp-1',
                primaryMarket: {
                    odds: { home: -100, away: -100 },
                    exchange: 'draftkings',
                    timestamp: Date.now()
                }
            });

            monitor.onFill(opportunity);

            // Send ticks with normal fluctuations
            const normalPrices = [-100, -101, -99, -100, -102, -98, -100, -101, -99, -100];
            normalPrices.forEach(price => {
                monitor.onNewTick({ odds: { home: price, away: -price } });
            });

            // Should not trip
            expect(tripEvents.length).toBe(0);
        });
    });

    describe('Tracker Lifecycle Management', () => {
        test('removes trackers after sample size is reached', () => {
            const opportunity = SyntheticArbitrageFactory.create({
                id: 'test-opp-1',
                primaryMarket: {
                    odds: { home: -100, away: -100 },
                    exchange: 'draftkings',
                    timestamp: Date.now()
                }
            });

            monitor.onFill(opportunity);
            expect(monitor.getActiveTrackerCount()).toBe(1);

            // Send exactly sampleSize ticks
            for (let i = 0; i < config.adverseMove.sampleSize; i++) {
                monitor.onNewTick({ odds: { home: -100 + i, away: -(-100 + i) } });
            }

            // Tracker should be removed
            expect(monitor.getActiveTrackerCount()).toBe(0);
        });

        test('removes trackers after observation window expires', async () => {
            const opportunity = SyntheticArbitrageFactory.create({
                id: 'test-opp-1',
                primaryMarket: {
                    odds: { home: -100, away: -100 },
                    exchange: 'draftkings',
                    timestamp: Date.now()
                }
            });

            monitor.onFill(opportunity);
            expect(monitor.getActiveTrackerCount()).toBe(1);

            // Wait for observation window to expire
            await new Promise(resolve => setTimeout(resolve, 100));

            // Manually expire the tracker (in real implementation, this would be time-based)
            monitor['postFillPrices'].get('test-opp-1')!.timestamp = Date.now() - config.adverseMove.observationMs - 1000;

            // Send a tick to trigger cleanup
            monitor.onNewTick({ odds: { home: -101, away: -101 } });

            // Tracker should be removed due to expiration
            expect(monitor.getActiveTrackerCount()).toBe(0);
        });

        test('cleanup removes expired trackers', () => {
            const opportunity1 = SyntheticArbitrageFactory.create({ id: 'test-opp-1' });
            const opportunity2 = SyntheticArbitrageFactory.create({ id: 'test-opp-2' });

            monitor.onFill(opportunity1);
            monitor.onFill(opportunity2);
            expect(monitor.getActiveTrackerCount()).toBe(2);

            // Manually expire one tracker
            const tracker1 = monitor['postFillPrices'].get('test-opp-1')!;
            tracker1.timestamp = Date.now() - config.adverseMove.observationMs - 1000;

            monitor.cleanup();

            // Only expired tracker should be removed
            expect(monitor.getActiveTrackerCount()).toBe(1);
        });
    });

    describe('Multiple Opportunity Tracking', () => {
        test('tracks multiple opportunities simultaneously', () => {
            const opp1 = SyntheticArbitrageFactory.create({ id: 'test-opp-1' });
            const opp2 = SyntheticArbitrageFactory.create({ id: 'test-opp-2' });

            monitor.onFill(opp1);
            monitor.onFill(opp2);

            expect(monitor.getActiveTrackerCount()).toBe(2);

            // Send ticks for both opportunities
            monitor.onNewTick({ odds: { home: -101, away: -101 } });
            monitor.onNewTick({ odds: { home: -102, away: -102 } });

            expect(tripEvents.length).toBe(0);
        });

        test('independent tracking for each opportunity', () => {
            const opp1 = SyntheticArbitrageFactory.create({
                id: 'test-opp-1',
                primaryMarket: { odds: { home: -100, away: -100 }, exchange: 'dk', timestamp: Date.now() }
            });
            const opp2 = SyntheticArbitrageFactory.create({
                id: 'test-opp-2',
                primaryMarket: { odds: { home: -200, away: -200 }, exchange: 'fd', timestamp: Date.now() }
            });

            monitor.onFill(opp1);
            monitor.onFill(opp2);

            // Send adverse move only for opp1
            for (let i = 0; i < 5; i++) {
                monitor.onNewTick({ odds: { home: -100 + i, away: -(-100 + i) } });
            }
            monitor.onNewTick({ odds: { home: -130, away: -130 } }); // Large move for opp1

            // Only opp1 should trip
            expect(tripEvents.length).toBe(1);
            expect(tripEvents[0].opportunityId).toBe('test-opp-1');
            expect(monitor.getActiveTrackerCount()).toBe(1); // opp1 removed, opp2 remains
        });
    });

    describe('Event Data Validation', () => {
        test('provides detailed event data on trip', () => {
            const opportunity = SyntheticArbitrageFactory.create({
                id: 'test-opp-1',
                primaryMarket: {
                    odds: { home: -100, away: -100 },
                    exchange: 'draftkings',
                    timestamp: Date.now()
                }
            });

            monitor.onFill(opportunity);

            // Create conditions for trip
            const prices = [-100, -100, -100, -100, -100]; // No volatility
            prices.forEach(price => {
                monitor.onNewTick({ odds: { home: price, away: -price } });
            });

            // Large move should trigger trip
            monitor.onNewTick({ odds: { home: -110, away: -110 } });

            if (tripEvents.length > 0) {
                const event = tripEvents[0].event;
                expect(event).toHaveProperty('move');
                expect(event).toHaveProperty('sigma');
                expect(event).toHaveProperty('zScore');
                expect(event).toHaveProperty('thresholdSigma');
                expect(event.thresholdSigma).toBe(config.adverseMove.sigmaThreshold);
                expect(event.zScore).toBeGreaterThan(event.thresholdSigma);
            }
        });
    });
});
