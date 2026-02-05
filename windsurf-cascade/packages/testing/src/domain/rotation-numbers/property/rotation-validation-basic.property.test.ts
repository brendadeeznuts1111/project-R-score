// Basic rotation number validation property tests using available functions

import { test, describe } from 'bun:test';
import * as fc from 'fast-check';
import { expect } from 'bun:test';
import {
    ROTATION_RANGES,
    type RotationNumberRanges
} from '../../../odds-core/src/types/rotation-numbers';

// Simple validation function for testing
function validateRotationNumber(rotation: number): { isValid: boolean; sport?: string; errors: string[] } {
    const errors: string[] = [];

    // Check if it's a number
    if (typeof rotation !== 'number' || isNaN(rotation)) {
        errors.push('must be a valid number');
        return { isValid: false, errors };
    }

    // Check if it's an integer
    if (!Number.isInteger(rotation)) {
        errors.push('must be an integer');
    }

    // Check if negative
    if (rotation < 0) {
        errors.push('negative rotation numbers are invalid');
    }

    // Check sport ranges
    let foundSport: string | undefined;
    for (const [sport, [min, max]] of Object.entries(ROTATION_RANGES)) {
        if (rotation >= min && rotation <= max) {
            foundSport = sport;
            break;
        }
    }

    if (!foundSport && rotation >= 0) {
        errors.push('rotation number outside valid sport ranges');
    }

    return {
        isValid: errors.length === 0 && foundSport !== undefined,
        sport: foundSport,
        errors
    };
}

describe.concurrent("Rotation Number Basic Validation Properties", () => {

    test("rotation numbers at exact range boundaries are valid", () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...Object.keys(ROTATION_RANGES) as (keyof RotationNumberRanges)[]),
                (sport) => {
                    const [min, max] = ROTATION_RANGES[sport];

                    const minResult = validateRotationNumber(min);
                    const maxResult = validateRotationNumber(max);

                    expect(minResult.isValid).toBe(true);
                    expect(maxResult.isValid).toBe(true);
                    expect(minResult.sport).toBe(sport);
                    expect(maxResult.sport).toBe(sport);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test("rotation numbers just outside ranges are invalid", () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...Object.keys(ROTATION_RANGES) as (keyof RotationNumberRanges)[]),
                (sport) => {
                    const [min, max] = ROTATION_RANGES[sport];

                    const belowMin = min - 1;
                    const aboveMax = max + 1;

                    const belowResult = validateRotationNumber(belowMin);
                    const aboveResult = validateRotationNumber(aboveMax);

                    expect(belowResult.isValid).toBe(false);
                    expect(aboveResult.isValid).toBe(false);

                    const hasRangeError = (result: any) =>
                        result.errors.some((error: string) =>
                            error.toLowerCase().includes('range') ||
                            error.toLowerCase().includes('outside')
                        );

                    expect(hasRangeError(belowResult)).toBe(true);
                    expect(hasRangeError(aboveResult)).toBe(true);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test("negative rotation numbers are always invalid", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -10000, max: -1 }),
                (negativeRotation) => {
                    const result = validateRotationNumber(negativeRotation);
                    expect(result.isValid).toBe(false);

                    const hasNegativeError = result.errors.some(error =>
                        error.toLowerCase().includes('negative')
                    );
                    expect(hasNegativeError).toBe(true);

                    return true;
                }
            ),
            { numRuns: 1000 }
        );
    });

    test("rotation numbers with fractional components are invalid", () => {
        fc.assert(
            fc.property(
                fc.float({ min: 1000, max: 10999 }),
                (fractionalRotation) => {
                    fc.pre(!Number.isInteger(fractionalRotation));

                    const result = validateRotationNumber(fractionalRotation);
                    expect(result.isValid).toBe(false);

                    const hasIntegerError = result.errors.some(error =>
                        error.toLowerCase().includes('integer')
                    );
                    expect(hasIntegerError).toBe(true);

                    return true;
                }
            ),
            { numRuns: 500 }
        );
    });

    test("rotation number validation is deterministic", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -1000, max: 12000 }),
                (rotation) => {
                    const result1 = validateRotationNumber(rotation);
                    const result2 = validateRotationNumber(rotation);

                    expect(result1.isValid).toBe(result2.isValid);
                    expect(result1.sport).toBe(result2.sport);
                    expect(result1.errors).toEqual(result2.errors);

                    return true;
                }
            ),
            { numRuns: 500 }
        );
    });

    test("valid rotation numbers map to correct sports", () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...Object.entries(ROTATION_RANGES)),
                ([sport, [min, max]]) => {
                    const testRotation = min + Math.floor(Math.random() * (max - min + 1));
                    const result = validateRotationNumber(testRotation);

                    expect(result.isValid).toBe(true);
                    expect(result.sport).toBe(sport);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test("validation handles edge cases gracefully", () => {
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
