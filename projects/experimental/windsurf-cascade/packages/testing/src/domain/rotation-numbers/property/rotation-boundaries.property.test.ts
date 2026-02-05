// packages/testing/src/domain/rotation-numbers/property/rotation-boundaries.property.test.ts

import { test, describe } from 'bun:test';
import * as fc from 'fast-check';
import { expect } from 'bun:test';
import {
    ROTATION_RANGES,
    validateRotationNumber,
    type RotationValidationResult
} from '../../odds-core/src/types/rotation-numbers';
import { rotationArbitraries } from '../arbitraries/rotation-arbitraries';

describe.concurrent("Rotation Number Boundary Properties", () => {

    test("rotation numbers at exact range boundaries are valid", () => {
        fc.assert(
            fc.property(
                rotationArbitraries.sportType,
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
                rotationArbitraries.sportType,
                (sport) => {
                    const [min, max] = ROTATION_RANGES[sport];

                    const belowMin = min - 1;
                    const aboveMax = max + 1;

                    const belowResult = validateRotationNumber(belowMin);
                    const aboveResult = validateRotationNumber(aboveMax);

                    expect(belowResult.isValid).toBe(false);
                    expect(aboveResult.isValid).toBe(false);

                    // Check for error messages about range
                    const hasRangeError = (result: RotationValidationResult) =>
                        result.errors.some(error =>
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

    test("gaps between sport ranges are properly rejected", () => {
        // Identify gaps between ranges
        const ranges = Object.entries(ROTATION_RANGES).sort((a, b) => a[1][0] - b[1][0]);

        fc.assert(
            fc.property(
                fc.constantFrom(...ranges.map(([_, range]) => range)),
                (range) => {
                    const rangeIndex = ranges.findIndex(([_, r]) => r === range);
                    if (rangeIndex === ranges.length - 1) return true; // Last range

                    const nextRange = ranges[rangeIndex + 1][1];
                    const gapStart = range[1] + 1;
                    const gapEnd = nextRange[0] - 1;

                    if (gapStart <= gapEnd) {
                        fc.assert(
                            fc.property(
                                fc.integer({ min: gapStart, max: gapEnd }),
                                (gapRotation) => {
                                    const result = validateRotationNumber(gapRotation);
                                    expect(result.isValid).toBe(false);
                                    return true;
                                }
                            )
                        );
                    }

                    return true;
                }
            ),
            { numRuns: 50 }
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
                    // Ensure it's not an integer
                    fc.pre(!Number.isInteger(fractionalRotation));

                    const result = validateRotationNumber(fractionalRotation);
                    expect(result.isValid).toBe(false);

                    const hasIntegerError = result.errors.some(error =>
                        error.toLowerCase().includes('integer') ||
                        error.toLowerCase().includes('fraction')
                    );
                    expect(hasIntegerError).toBe(true);

                    return true;
                }
            ),
            { numRuns: 500 }
        );
    });

    test("rotation numbers at exact sport boundaries map correctly", () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...Object.entries(ROTATION_RANGES)),
                ([sport, [min, max]]) => {
                    // Test minimum boundary
                    const minResult = validateRotationNumber(min);
                    expect(minResult.isValid).toBe(true);
                    expect(minResult.sport).toBe(sport);

                    // Test maximum boundary  
                    const maxResult = validateRotationNumber(max);
                    expect(maxResult.isValid).toBe(true);
                    expect(maxResult.sport).toBe(sport);

                    // Test one inside boundary
                    const insideResult = validateRotationNumber(min + 1);
                    expect(insideResult.isValid).toBe(true);
                    expect(insideResult.sport).toBe(sport);

                    return true;
                }
            ),
            { numRuns: 100 }
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
});
