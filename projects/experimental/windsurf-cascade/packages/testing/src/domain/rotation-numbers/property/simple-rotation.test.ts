// Simple rotation number test without external dependencies

import { test, describe } from 'bun:test';
import { expect } from 'bun:test';

// Define rotation ranges locally for testing
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

type SportType = keyof typeof ROTATION_RANGES;

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
            break; // Important: break after finding first match
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

describe("Simple Rotation Number Tests", () => {

    test("MLB rotation numbers are valid", () => {
        const [min, max] = ROTATION_RANGES.MLB;

        expect(validateRotationNumber(min).isValid).toBe(true);
        expect(validateRotationNumber(max).isValid).toBe(true);
        expect(validateRotationNumber(1500).isValid).toBe(true);

        // Test boundaries - below min should be invalid
        expect(validateRotationNumber(min - 1).isValid).toBe(false);

        // Test that max + 1 belongs to the next sport (NBA)
        const nextSportResult = validateRotationNumber(max + 1);
        expect(nextSportResult.isValid).toBe(true);
        expect(nextSportResult.sport).toBe('NBA');
    });

    test("NFL rotation numbers are valid", () => {
        const [min, max] = ROTATION_RANGES.NFL;

        expect(validateRotationNumber(min).isValid).toBe(true);
        expect(validateRotationNumber(max).isValid).toBe(true);
        expect(validateRotationNumber(3500).isValid).toBe(true);

        // Test that min - 1 belongs to previous sport (NBA)
        const prevSportResult = validateRotationNumber(min - 1);
        expect(prevSportResult.isValid).toBe(true);
        expect(prevSportResult.sport).toBe('NBA');

        // Test that max + 1 belongs to next sport (NHL)
        const nextSportResult = validateRotationNumber(max + 1);
        expect(nextSportResult.isValid).toBe(true);
        expect(nextSportResult.sport).toBe('NHL');
    });

    test("negative rotation numbers are invalid", () => {
        expect(validateRotationNumber(-1).isValid).toBe(false);
        expect(validateRotationNumber(-100).isValid).toBe(false);
        expect(validateRotationNumber(-999).isValid).toBe(false);
    });

    test("fractional rotation numbers are invalid", () => {
        expect(validateRotationNumber(1500.5).isValid).toBe(false);
        expect(validateRotationNumber(3000.25).isValid).toBe(false);
        expect(validateRotationNumber(4500.75).isValid).toBe(false);
    });

    test("rotation numbers map to correct sports", () => {
        expect(validateRotationNumber(1500).sport).toBe('MLB');
        expect(validateRotationNumber(2500).sport).toBe('NBA');
        expect(validateRotationNumber(3500).sport).toBe('NFL');
        expect(validateRotationNumber(4500).sport).toBe('NHL');
        expect(validateRotationNumber(5500).sport).toBe('NCAAF');
        expect(validateRotationNumber(6500).sport).toBe('NCAAB');
        expect(validateRotationNumber(7500).sport).toBe('SOCCER');
        expect(validateRotationNumber(8500).sport).toBe('TENNIS');
        expect(validateRotationNumber(9500).sport).toBe('GOLF');
        expect(validateRotationNumber(10500).sport).toBe('MMA');
    });

    test("boundary conditions work correctly", () => {
        // Test all sport boundaries
        Object.entries(ROTATION_RANGES).forEach(([sport, [min, max]]) => {
            const minResult = validateRotationNumber(min);
            const maxResult = validateRotationNumber(max);

            expect(minResult.isValid).toBe(true);
            expect(maxResult.isValid).toBe(true);
            expect(minResult.sport).toBe(sport);
            expect(maxResult.sport).toBe(sport);
        });
    });

    test("performance test - 1000 validations", () => {
        const start = performance.now();

        for (let i = 0; i < 1000; i++) {
            validateRotationNumber(3000 + (i % 1000));
        }

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(50); // Should complete in < 50ms
    });

    test("edge cases are handled gracefully", () => {
        const edgeCases = [
            NaN,
            Infinity,
            -Infinity,
            null,
            undefined,
            'string' as any,
            {} as any,
            [] as any
        ];

        edgeCases.forEach(value => {
            const result = validateRotationNumber(value as number);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
});
