// Rotation number performance tests using regular test functions

import { test, describe } from 'bun:test';
import { expect } from 'bun:test';

// Define rotation ranges locally
const ROTATION_RANGES = {
    MLB: [1000, 1999],
    NBA: [2000, 2999],
    NFL: [3000, 3999],
    NHL: [4000, 4999],
    NCAAF: [5000, 5999],
    NCAAB: [6000, 6999],
    SOCCER: [7000, 7999],
    TENNIS: [8000, 8999],
    GOLF: [9000, 9999],
    MMA: [10000, 10999]
} as const;

function validateRotationNumber(rotation: number): { isValid: boolean; sport?: string; errors: string[] } {
    const errors: string[] = [];

    if (typeof rotation !== 'number' || isNaN(rotation)) {
        errors.push('must be a valid number');
        return { isValid: false, errors };
    }

    if (!Number.isInteger(rotation)) {
        errors.push('must be an integer');
    }

    if (rotation < 0) {
        errors.push('negative rotation numbers are invalid');
    }

    let foundSport: string | undefined;
    for (const [sport, [min, max]] of Object.entries(ROTATION_RANGES)) {
        if (rotation >= min && rotation <= max) {
            foundSport = sport;
            break;
        }
    }

    if (!foundSport && rotation >= 0 && errors.length === 0) {
        errors.push('rotation number outside valid sport ranges');
    }

    return {
        isValid: errors.length === 0 && foundSport !== undefined,
        sport: foundSport,
        errors
    };
}

function getSportFromRotation(rotation: number): string | null {
    for (const [sport, [min, max]] of Object.entries(ROTATION_RANGES)) {
        if (rotation >= min && rotation <= max) {
            return sport;
        }
    }
    return null;
}

function buildLargeRotationRegistry(size: number) {
    const registry = new Map();
    const sports = Object.keys(ROTATION_RANGES);

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

function searchRotationNumbers(registry: Map<any, any>, criteria: any) {
    const results = Array.from(registry.values());

    if (criteria.sport) {
        return results.filter(r => r.sport === criteria.sport);
    }

    if (criteria.minRotation && criteria.maxRotation) {
        return results.filter(r =>
            r.rotationId >= criteria.minRotation &&
            r.rotationId <= criteria.maxRotation
        );
    }

    return results;
}

describe("Rotation Number Performance Tests", () => {

    test("single validation performance target: < 0.01ms", () => {
        const iterations = 1000;
        const testRotation = 3500;

        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            validateRotationNumber(testRotation);
        }
        const duration = performance.now() - start;

        const avgDuration = duration / iterations;
        console.log(`Average validation time: ${avgDuration.toFixed(4)}ms`);

        expect(avgDuration).toBeLessThan(0.01);
    });

    test("batch validation (10k) performance target: < 50ms", () => {
        const testRotations = Array.from({ length: 10000 }, (_, i) => 1000 + i);

        const start = performance.now();
        testRotations.forEach(rot => validateRotationNumber(rot));
        const duration = performance.now() - start;

        console.log(`Batch validation time (10k): ${duration.toFixed(2)}ms`);

        expect(duration).toBeLessThan(50);
    });

    test("sport extraction performance target: < 0.005ms", () => {
        const iterations = 1000;
        const testRotation = 3500;

        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            getSportFromRotation(testRotation);
        }
        const duration = performance.now() - start;

        const avgDuration = duration / iterations;
        console.log(`Average sport extraction time: ${avgDuration.toFixed(4)}ms`);

        expect(avgDuration).toBeLessThan(0.005);
    });

    test("search by sport performance target: < 5ms", () => {
        const registry = buildLargeRotationRegistry(10000);

        const start = performance.now();
        const results = searchRotationNumbers(registry, { sport: 'NFL' });
        const duration = performance.now() - start;

        console.log(`Search by sport time: ${duration.toFixed(2)}ms, results: ${results.length}`);

        expect(duration).toBeLessThan(5);
        expect(results.length).toBeGreaterThan(0);
    });

    test("search by range performance target: < 5ms", () => {
        const registry = buildLargeRotationRegistry(10000);

        const start = performance.now();
        const results = searchRotationNumbers(registry, { minRotation: 3000, maxRotation: 3999 });
        const duration = performance.now() - start;

        console.log(`Search by range time: ${duration.toFixed(2)}ms, results: ${results.length}`);

        expect(duration).toBeLessThan(5);
        expect(results.length).toBeGreaterThan(0);
    });

    test("registry creation performance target: < 100ms for 10k items", () => {
        const start = performance.now();
        const registry = buildLargeRotationRegistry(10000);
        const duration = performance.now() - start;

        console.log(`Registry creation time (10k): ${duration.toFixed(2)}ms, size: ${registry.size}`);

        expect(duration).toBeLessThan(100);
        expect(registry.size).toBe(10000);
    });

    test("edge case validation performance target: < 1ms", () => {
        const edgeCases = [-1, 0, 999, 1000, 1999, 2000, 2999, 3000, 3999, 4000, 4999, 5000, 5999, 6000, 6999, 7000, 7999, 8000, 8999, 9000, 9999, 10000, 12345.67, NaN, Infinity];

        const start = performance.now();
        edgeCases.forEach(rotation => {
            validateRotationNumber(rotation);
        });
        const duration = performance.now() - start;

        console.log(`Edge case validation time: ${duration.toFixed(2)}ms`);

        expect(duration).toBeLessThan(1);
    });

    test("concurrent validation simulation performance target: < 20ms", () => {
        const rotations = Array.from({ length: 1000 }, (_, i) => 1000 + i);

        const start = performance.now();

        // Simulate concurrent operations
        const promises = rotations.map(rotation =>
            Promise.resolve(validateRotationNumber(rotation))
        );

        // Wait for all to complete
        Promise.all(promises).then(() => {
            const duration = performance.now() - start;
            console.log(`Concurrent validation simulation time: ${duration.toFixed(2)}ms`);
            expect(duration).toBeLessThan(20);
        });
    });

    test("memory efficiency test: < 10MB for 10k items", () => {
        const initialMemory = process.memoryUsage().heapUsed;

        const registry = buildLargeRotationRegistry(10000);

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;

        console.log(`Memory increase for 10k items: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // < 10MB

        // Cleanup
        registry.clear();
    });
});
