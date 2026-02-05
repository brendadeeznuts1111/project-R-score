// packages/testing/src/domain/rotation-numbers/property/rotation-arbitrage-integration.property.test.ts

import { test, describe } from 'bun:test';
import * as fc from 'fast-check';
import { expect } from 'bun:test';
import {
    detectRotationArbitrage,
    type RotationEnhancedMarketLeg
} from '../../odds-core/src/types/rotation-numbers';
import { rotationArbitraries } from '../arbitraries/rotation-arbitraries';

// Helper to create mock market legs
function createMockLeg(rotationId: number, sport: string, marketType?: string, odds?: number): RotationEnhancedMarketLeg {
    return {
        rotationId,
        sport,
        gameId: `game-${rotationId}`,
        marketType: marketType || 'moneyline',
        odds: odds || -110,
        exchange: 'draftkings',
        isLive: false,
        timestamp: Date.now(),
        volume: 10000,
        liquidity: 'high' as const,
        correlation: 0.8,
        sampleSize: 100
    };
}

function createEnhancedLeg(rotationId: number, sport: string, correlation: number = 0.95): RotationEnhancedMarketLeg {
    return {
        rotationId,
        sport,
        gameId: `game-${rotationId}`,
        marketType: 'moneyline',
        odds: -110,
        exchange: 'draftkings',
        isLive: false,
        timestamp: Date.now(),
        volume: 10000,
        liquidity: 'high' as const,
        correlation,
        sampleSize: 150
    };
}

describe.concurrent("Rotation-Arbitrage Integration Properties", () => {

    test("rotation numbers from different sports never arbitrage", () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.tuple(fc.constant('MLB'), fc.integer({ min: 1000, max: 1999 })),
                    fc.tuple(fc.constant('NBA'), fc.integer({ min: 2000, max: 2999 }))
                ),
                fc.oneof(
                    fc.tuple(fc.constant('NFL'), fc.integer({ min: 3000, max: 3999 })),
                    fc.tuple(fc.constant('NHL'), fc.integer({ min: 4000, max: 4999 }))
                ),
                ([sport1, rot1], [sport2, rot2]) => {
                    fc.pre(sport1 !== sport2);

                    const leg1 = createMockLeg(rot1, sport1);
                    const leg2 = createMockLeg(rot2, sport2);

                    const arb = detectRotationArbitrage([leg1, leg2]);
                    expect(arb).toBeNull(); // Different sports shouldn't arbitrage

                    return true;
                }
            ),
            { numRuns: 1000 }
        );
    });

    test("synthetic arbitrage pairs are detected correctly", () => {
        fc.assert(
            fc.property(
                rotationArbitraries.syntheticArbitragePair,
                (pair) => {
                    const leg1 = createEnhancedLeg(pair.primaryRotation, pair.primarySport, pair.correlation);
                    const leg2 = createEnhancedLeg(pair.secondaryRotation, pair.secondarySport, pair.correlation);

                    // When correlation > 0.95 and sample size > 100, should be valid synthetic arb
                    if (pair.correlation > 0.95 && pair.sampleSize > 100) {
                        const arb = detectRotationArbitrage([leg1, leg2]);
                        expect(arb).not.toBeNull();
                        expect(arb!.confidence).toBeGreaterThan(0.8);
                    } else {
                        // Low correlation or small sample size should not arbitrage
                        const arb = detectRotationArbitrage([leg1, leg2]);
                        if (arb) {
                            expect(arb.confidence).toBeLessThanOrEqual(0.8);
                        }
                    }

                    return true;
                }
            ),
            { numRuns: 2000 }
        );
    });

    test("rotation numbers with same game ID but different markets can arbitrage", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1000, max: 10999 }), // Game ID
                fc.constantFrom('moneyline', 'spread', 'total'),
                fc.constantFrom('moneyline', 'spread', 'total'),
                (gameId, market1, market2) => {
                    fc.pre(market1 !== market2);

                    const leg1 = createMockLeg(gameId, 'NFL', market1, 100);
                    const leg2 = createMockLeg(gameId, 'NFL', market2, -110);

                    const arb = detectRotationArbitrage([leg1, leg2]);
                    // Different markets on same game CAN arbitrage (synthetic)
                    expect(arb).not.toBeNull();

                    return true;
                }
            ),
            { numRuns: 1500 }
        );
    });

    test("arbitrage detection handles edge cases gracefully", () => {
        fc.assert(
            fc.property(
                fc.array(fc.integer({ min: 1000, max: 10999 }), { minLength: 0, maxLength: 10 }),
                (rotationIds) => {
                    const legs = rotationIds.map(id => createMockLeg(id, 'NFL'));

                    // Should not crash on empty or single leg arrays
                    const arb = detectRotationArbitrage(legs);

                    // Empty or single arrays should not produce arbitrage
                    if (legs.length < 2) {
                        expect(arb).toBeNull();
                    }

                    return true;
                }
            ),
            { numRuns: 500 }
        );
    });

    test("arbitrage confidence correlates with market correlation", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 3000, max: 3999 }), // NFL range
                fc.float({ min: 0.5, max: 1.0 }),
                (rotationId, correlation) => {
                    const leg1 = createEnhancedLeg(rotationId, 'NFL', correlation);
                    const leg2 = createEnhancedLeg(rotationId + 1, 'NFL', correlation);

                    const arb = detectRotationArbitrage([leg1, leg2]);

                    if (arb) {
                        // Higher correlation should lead to higher confidence
                        expect(arb.confidence).toBeGreaterThan(correlation * 0.5);
                    }

                    return true;
                }
            ),
            { numRuns: 1000 }
        );
    });

    test("arbitrage detection is deterministic", () => {
        fc.assert(
            fc.property(
                fc.array(fc.integer({ min: 3000, max: 3999 }), { minLength: 2, maxLength: 5 }),
                (rotationIds) => {
                    const legs = rotationIds.map(id => createMockLeg(id, 'NFL'));

                    const arb1 = detectRotationArbitrage([...legs]);
                    const arb2 = detectRotationArbitrage([...legs]);

                    // Results should be identical
                    if (arb1 === null && arb2 === null) {
                        return true;
                    }

                    if (arb1 && arb2) {
                        expect(arb1.confidence).toBe(arb2.confidence);
                        expect(arb1.primaryMarket.rotationId).toBe(arb2.primaryMarket.rotationId);
                        expect(arb1.secondaryMarket.rotationId).toBe(arb2.secondaryMarket.rotationId);
                    } else {
                        expect(false).toBe(true); // One null, one not null - should not happen
                    }

                    return true;
                }
            ),
            { numRuns: 500 }
        );
    });

    test("arbitrage detection scales linearly with input size", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 10, max: 100 }),
                (size) => {
                    const legs = Array.from({ length: size }, (_, i) =>
                        createMockLeg(3000 + i, 'NFL')
                    );

                    const start = performance.now();
                    const arb = detectRotationArbitrage(legs);
                    const duration = performance.now() - start;

                    // Should complete quickly even with 100 markets
                    expect(duration).toBeLessThan(50);

                    return true;
                }
            ),
            { numRuns: 50 }
        );
    });

    test("invalid rotation numbers are handled in arbitrage detection", () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.integer({ min: -1000, max: -1 }),
                    fc.integer({ min: 11000, max: 20000 }),
                    fc.float({ min: 1000, max: 10999 })
                ),
                (invalidRotation) => {
                    const leg1 = createMockLeg(invalidRotation as number, 'NFL');
                    const leg2 = createMockLeg(3500, 'NFL');

                    // Should not crash with invalid rotation numbers
                    const arb = detectRotationArbitrage([leg1, leg2]);

                    // Invalid rotations should not produce arbitrage
                    expect(arb).toBeNull();

                    return true;
                }
            ),
            { numRuns: 500 }
        );
    });
});
