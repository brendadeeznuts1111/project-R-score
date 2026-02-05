// packages/testing/src/benchmarks/rotation-processing.bench.ts

import { bench, describe } from 'bun:test';
import {
    parseRotationNumber,
    validateRotationNumber,
    getSportFromRotation,
    searchRotationNumbers,
    detectRotationArbitrage
} from '../odds-core/src/types/rotation-numbers';

// Helper functions for benchmark data
function buildLargeRotationRegistry(size: number) {
    const registry = new Map();
    const sports = ['MLB', 'NBA', 'NFL', 'NHL', 'WNBA', 'MLS', 'CBB', 'CFB'];

    for (let i = 0; i < size; i++) {
        const sport = sports[i % sports.length];
        const rotation = 1000 + (i * 10);
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

function generateMockMarkets(count: number) {
    const markets = [];
    for (let i = 0; i < count; i++) {
        markets.push({
            rotationId: 3000 + i,
            sport: 'NFL',
            gameId: `game-${i}`,
            marketType: 'moneyline',
            odds: -110 + (i % 20),
            exchange: 'draftkings',
            isLive: false,
            timestamp: Date.now(),
            volume: 10000,
            liquidity: 'high',
            correlation: 0.95,
            sampleSize: 150
        });
    }
    return markets;
}

describe("Rotation Processing Benchmarks", () => {

    const testRotations = Array.from({ length: 10000 }, (_, i) => 1000 + i);
    const registry = buildLargeRotationRegistry(10000);

    bench("parseRotationNumber (single)", () => {
        parseRotationNumber(3500);
    });

    bench("parseRotationNumber (batch 10k)", () => {
        testRotations.forEach(rot => parseRotationNumber(rot));
    });

    bench("validateRotationNumber (valid)", () => {
        validateRotationNumber(4500);
    });

    bench("validateRotationNumber (invalid)", () => {
        validateRotationNumber(15000);
    });

    bench("validateRotationNumber (batch 10k)", () => {
        testRotations.forEach(rot => validateRotationNumber(rot));
    });

    bench("getSportFromRotation (single)", () => {
        getSportFromRotation(3500);
    });

    bench("getSportFromRotation (batch 10k)", () => {
        testRotations.forEach(rot => getSportFromRotation(rot));
    });

    bench("searchRotationNumbers (by sport)", () => {
        searchRotationNumbers(registry, { sport: 'NFL' });
    });

    bench("searchRotationNumbers (by range)", () => {
        searchRotationNumbers(registry, { minRotation: 3000, maxRotation: 3999 });
    });

    bench("searchRotationNumbers (by game ID)", () => {
        searchRotationNumbers(registry, { gameId: 'game-100' });
    });

    bench("searchRotationNumbers (complex criteria)", () => {
        searchRotationNumbers(registry, {
            sport: 'NFL',
            minRotation: 3000,
            maxRotation: 3500
        });
    });

    bench("synthetic arbitrage detection (10 markets)", () => {
        const markets = generateMockMarkets(10);
        detectRotationArbitrage(markets);
    });

    bench("synthetic arbitrage detection (50 markets)", () => {
        const markets = generateMockMarkets(50);
        detectRotationArbitrage(markets);
    });

    bench("synthetic arbitrage detection (100 markets)", () => {
        const markets = generateMockMarkets(100);
        detectRotationArbitrage(markets);
    });

    bench("rotation registry creation (10k items)", () => {
        buildLargeRotationRegistry(10000);
    });

    bench("rotation number validation with edge cases", () => {
        const edgeCases = [-1, 0, 999, 1000, 1999, 2000, 2999, 3000, 3999, 4000, 4999, 5000, 5999, 6000, 6999, 7000, 7999, 8000, 8999, 9000, 9999, 10000, 12345.67, NaN, Infinity];

        edgeCases.forEach(rotation => {
            validateRotationNumber(rotation);
        });
    });

    bench("concurrent validation (1000 items)", async () => {
        const rotations = Array.from({ length: 1000 }, (_, i) => 1000 + i);

        await Promise.all(
            rotations.map(rotation => Promise.resolve(validateRotationNumber(rotation)))
        );
    });

    bench("memory efficiency test (large dataset)", () => {
        const largeRegistry = buildLargeRotationRegistry(50000);

        // Perform various operations
        searchRotationNumbers(largeRegistry, { sport: 'NFL' });
        searchRotationNumbers(largeRegistry, { minRotation: 3000, maxRotation: 3999 });

        // Cleanup
        largeRegistry.clear();
    });
});

// Performance validation helpers
describe("Rotation Processing Performance Validation", () => {

    test("single parse should complete in < 0.01ms", () => {
        const start = performance.now();
        parseRotationNumber(3500);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(0.01);
    });

    test("batch parse (10k) should complete in < 50ms", () => {
        const testRotations = Array.from({ length: 10000 }, (_, i) => 1000 + i);

        const start = performance.now();
        testRotations.forEach(rot => parseRotationNumber(rot));
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(50);
    });

    test("validation should complete in < 0.1ms", () => {
        const start = performance.now();
        validateRotationNumber(4500);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(0.1);
    });

    test("search should complete in < 5ms", () => {
        const registry = buildLargeRotationRegistry(10000);

        const start = performance.now();
        searchRotationNumbers(registry, { sport: 'NFL' });
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(5);
    });

    test("arbitrage detection (100 markets) should complete in < 20ms", () => {
        const markets = generateMockMarkets(100);

        const start = performance.now();
        detectRotationArbitrage(markets);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(20);
    });
});
