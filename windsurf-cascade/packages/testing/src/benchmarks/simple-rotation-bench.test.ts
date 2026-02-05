// Simple rotation number benchmarks

import { bench, describe } from 'bun:test';

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

describe("Rotation Number Benchmarks", () => {

    const testRotations = Array.from({ length: 10000 }, (_, i) => 1000 + i);
    const registry = buildLargeRotationRegistry(10000);

    bench("validateRotationNumber (single)", () => {
        validateRotationNumber(3500);
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

    bench("rotation registry creation (10k items)", () => {
        buildLargeRotationRegistry(10000);
    });

    bench("validation with edge cases", () => {
        const edgeCases = [-1, 0, 999, 1000, 1999, 2000, 2999, 3000, 3999, 4000, 4999, 5000, 5999, 6000, 6999, 7000, 7999, 8000, 8999, 9000, 9999, 10000, 12345.67, NaN, Infinity];

        edgeCases.forEach(rotation => {
            validateRotationNumber(rotation);
        });
    });

    bench("concurrent validation simulation (1000 items)", () => {
        const rotations = Array.from({ length: 1000 }, (_, i) => 1000 + i);

        // Simulate concurrent operations
        const promises = rotations.map(rotation =>
            Promise.resolve(validateRotationNumber(rotation))
        );

        // Wait for all to complete (in real scenario)
        promises.forEach(p => p);
    });
});

describe("Performance Validation Tests", () => {

    test("single validation should complete in < 0.01ms", () => {
        const start = performance.now();
        validateRotationNumber(3500);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(0.01);
    });

    test("batch validation (10k) should complete in < 50ms", () => {
        const testRotations = Array.from({ length: 10000 }, (_, i) => 1000 + i);

        const start = performance.now();
        testRotations.forEach(rot => validateRotationNumber(rot));
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(50);
    });

    test("search should complete in < 5ms", () => {
        const registry = buildLargeRotationRegistry(10000);

        const start = performance.now();
        searchRotationNumbers(registry, { sport: 'NFL' });
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(5);
    });
});
