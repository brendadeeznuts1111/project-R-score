// packages/testing/src/domain/rotation-numbers/property/rotation-performance.property.test.ts

import { test, describe } from 'bun:test';
import * as fc from 'fast-check';
import { expect } from 'bun:test';
import {
    parseRotationNumber,
    validateRotationNumber,
    getSportFromRotation,
    searchRotationNumbers
} from '../../odds-core/src/types/rotation-numbers';
import { rotationArbitraries } from '../arbitraries/rotation-arbitraries';

// Helper to build large rotation registry for testing
function buildLargeRotationRegistry(size: number) {
    const registry = new Map();
    const sports = ['MLB', 'NBA', 'NFL', 'NHL', 'WNBA', 'MLS', 'CBB', 'CFB'];

    for (let i = 0; i < size; i++) {
        const sport = sports[i % sports.length];
        const rotation = 1000 + (i * 10); // Ensure unique rotation numbers
        registry.set(rotation, {
            rotationId: rotation,
            sport,
            gameId: `game-${i}`,
            teamId: `team-${i}`,
            timestamp: Date.now() - (i * 1000)
        });
    }

    return registry;
}

describe.concurrent("Rotation Number Performance Properties", () => {

    test("parsing 10,000 rotation numbers completes in < 100ms", () => {
        fc.assert(
            fc.property(
                fc.array(rotationArbitraries.validRotationNumber, { minLength: 10000, maxLength: 10000 }),
                (rotations) => {
                    const start = performance.now();

                    rotations.forEach(r => parseRotationNumber(r.rotationId));

                    const duration = performance.now() - start;
                    expect(duration).toBeLessThan(100);

                    return true;
                }
            ),
            { numRuns: 10 } // Only run 10 times to avoid CI overload
        );
    });

    test("batch validation scales linearly", () => {
        fc.assert(
            fc.property(
                fc.array(rotationArbitraries.validRotationNumber, { minLength: 100, maxLength: 5000 }),
                (rotations) => {
                    const start = performance.now();
                    const results = rotations.map(r => validateRotationNumber(r.rotationId));
                    const duration = performance.now() - start;

                    // Linear scaling: duration should be roughly proportional to count
                    const perItem = duration / rotations.length;
                    expect(perItem).toBeLessThan(0.1); // < 0.1ms per validation

                    // All validations should be successful for valid rotations
                    expect(results.every(r => r.isValid)).toBe(true);

                    return true;
                }
            ),
            { numRuns: 50 }
        );
    });

    test("search by criteria uses indexes efficiently", () => {
        const registry = buildLargeRotationRegistry(10000);

        fc.assert(
            fc.property(
                rotationArbitraries.rotationSearchCriteria,
                (criteria) => {
                    const start = performance.now();
                    const results = searchRotationNumbers(registry, criteria);
                    const duration = performance.now() - start;

                    // Should use Map lookups, not full scans
                    expect(duration).toBeLessThan(10);
                    expect(results).toBeInstanceOf(Array);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test("sport extraction is O(1) performance", () => {
        fc.assert(
            fc.property(
                fc.array(rotationArbitraries.validRotationNumber, { minLength: 1000, maxLength: 1000 }),
                (rotations) => {
                    const start = performance.now();

                    const sports = rotations.map(r => getSportFromRotation(r.rotationId));

                    const duration = performance.now() - start;
                    expect(duration).toBeLessThan(5); // Should be very fast

                    // All sports should be valid strings
                    expect(sports.every(s => typeof s === 'string' && s.length > 0)).toBe(true);

                    return true;
                }
            ),
            { numRuns: 20 }
        );
    });

    test("memory usage stays bounded for large datasets", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1000, max: 10000 }),
                (size) => {
                    const initialMemory = process.memoryUsage().heapUsed;

                    const registry = buildLargeRotationRegistry(size);

                    const finalMemory = process.memoryUsage().heapUsed;
                    const memoryIncrease = finalMemory - initialMemory;

                    // Memory increase should be reasonable (less than 10MB for 10k items)
                    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

                    // Cleanup
                    registry.clear();

                    return true;
                }
            ),
            { numRuns: 10 }
        );
    });

    test("concurrent validation maintains performance", async () => {
        fc.assert(
            fc.property(
                fc.array(rotationArbitraries.validRotationNumber, { minLength: 500, maxLength: 500 }),
                (rotations) => {
                    const start = performance.now();

                    // Run validations in parallel
                    const promises = rotations.map(r =>
                        Promise.resolve(validateRotationNumber(r.rotationId))
                    );

                    return Promise.all(promises).then(results => {
                        const duration = performance.now() - start;
                        expect(duration).toBeLessThan(50); // Should still be fast in parallel

                        // All should be valid
                        expect(results.every(r => r.isValid)).toBe(true);

                        return true;
                    });
                }
            ),
            { numRuns: 20 }
        );
    });

    test("search performance doesn't degrade with registry size", () => {
        const sizes = [100, 1000, 5000, 10000];

        fc.assert(
            fc.property(
                fc.constantFrom(...sizes),
                (size) => {
                    const registry = buildLargeRotationRegistry(size);
                    const criteria = { sport: 'NFL' };

                    const start = performance.now();
                    const results = searchRotationNumbers(registry, criteria);
                    const duration = performance.now() - start;

                    // Search should remain fast regardless of registry size
                    expect(duration).toBeLessThan(20);
                    expect(results.length).toBeGreaterThan(0);

                    return true;
                }
            ),
            { numRuns: 5 }
        );
    });
});
