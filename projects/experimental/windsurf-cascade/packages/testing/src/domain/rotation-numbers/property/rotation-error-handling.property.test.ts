// packages/testing/src/domain/rotation-numbers/property/rotation-error-handling.property.test.ts

import { test, describe } from 'bun:test';
import * as fc from 'fast-check';
import { expect } from 'bun:test';
import {
    validateRotationNumber,
    type RotationValidationResult
} from '../../odds-core/src/types/rotation-numbers';

describe.concurrent("Rotation Error Handling Properties", () => {

    test("validation errors are descriptive and actionable", () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.integer({ min: -1000, max: 0 }),
                    fc.float({ min: 1000, max: 10999 }),
                    fc.integer({ min: 11000, max: 20000 })
                ),
                (invalidRotation) => {
                    const result = validateRotationNumber(invalidRotation);
                    expect(result.isValid).toBe(false);
                    expect(result.errors.length).toBeGreaterThan(0);

                    // Errors should be human-readable
                    result.errors.forEach(error => {
                        expect(error).toMatch(/rotation|number|range|sport|format/i);
                        expect(error.length).toBeGreaterThan(10);
                        expect(error.length).toBeLessThan(200);

                        // Should contain actionable information
                        expect(error).not.toMatch(/error|failed|invalid$/i); // Should be more specific
                    });

                    return true;
                }
            ),
            { numRuns: 500 }
        );
    });

    test("validation accumulates multiple errors", () => {
        // Test case: rotation number that's negative AND fractional AND out of range
        const invalidRotation = -1234.56;
        const result = validateRotationNumber(invalidRotation);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(2);

        // Should detect both negative and non-integer issues
        const hasNegativeError = result.errors.some(error =>
            error.toLowerCase().includes('negative')
        );
        const hasIntegerError = result.errors.some(error =>
            error.toLowerCase().includes('integer') ||
            error.toLowerCase().includes('fraction')
        );

        expect(hasNegativeError).toBe(true);
        expect(hasIntegerError).toBe(true);
    });

    test("rotation validation is idempotent", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -1000, max: 20000 }),
                (rotation) => {
                    const result1 = validateRotationNumber(rotation);
                    const result2 = validateRotationNumber(rotation);

                    expect(result1.isValid).toBe(result2.isValid);
                    expect(result1.errors).toEqual(result2.errors);
                    expect(result1.sport).toBe(result2.sport);

                    return true;
                }
            ),
            { numRuns: 1000 }
        );
    });

    test("validation handles extreme values gracefully", () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.integer({ min: Number.MIN_SAFE_INTEGER, max: -1000000 }),
                    fc.integer({ min: 100000000, max: Number.MAX_SAFE_INTEGER }),
                    fc.float({ min: Number.MIN_VALUE, max: Number.MAX_VALUE })
                ),
                (extremeValue) => {
                    // Should not crash or throw exceptions
                    const result = validateRotationNumber(extremeValue);

                    expect(result).toBeDefined();
                    expect(typeof result.isValid).toBe('boolean');
                    expect(Array.isArray(result.errors)).toBe(true);

                    // Extreme values should always be invalid
                    expect(result.isValid).toBe(false);
                    expect(result.errors.length).toBeGreaterThan(0);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test("validation error messages are consistent", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -1000, max: -1 }),
                (negativeRotation) => {
                    const result1 = validateRotationNumber(negativeRotation);
                    const result2 = validateRotationNumber(negativeRotation);

                    // Same error should produce same message
                    expect(result1.errors).toEqual(result2.errors);

                    // Should contain negative-related error
                    expect(result1.errors.some(e => e.toLowerCase().includes('negative'))).toBe(true);

                    return true;
                }
            ),
            { numRuns: 200 }
        );
    });

    test("validation handles special numeric values", () => {
        const specialValues = [
            NaN,
            Infinity,
            -Infinity,
            Number.POSITIVE_INFINITY,
            Number.NEGATIVE_INFINITY
        ];

        specialValues.forEach(value => {
            const result = validateRotationNumber(value);

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);

            // Should handle gracefully without throwing
            expect(result.errors.some(error =>
                error.toLowerCase().includes('number') ||
                error.toLowerCase().includes('invalid')
            )).toBe(true);
        });
    });

    test("validation preserves input type information in errors", () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.string(),
                    fc.boolean(),
                    fc.object(),
                    fc.null(),
                    fc.undefined(),
                    fc.array(fc.integer())
                ),
                (invalidType) => {
                    const result = validateRotationNumber(invalidType as any);

                    expect(result.isValid).toBe(false);
                    expect(result.errors.length).toBeGreaterThan(0);

                    // Should indicate type-related error
                    expect(result.errors.some(error =>
                        error.toLowerCase().includes('type') ||
                        error.toLowerCase().includes('number') ||
                        error.toLowerCase().includes('expected')
                    )).toBe(true);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    test("validation results are serializable", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -1000, max: 20000 }),
                (rotation) => {
                    const result = validateRotationNumber(rotation);

                    // Should be JSON serializable
                    expect(() => JSON.stringify(result)).not.toThrow();
                    expect(() => JSON.parse(JSON.stringify(result))).not.toThrow();

                    // Serialized and deserialized should be equal
                    const serialized = JSON.parse(JSON.stringify(result));
                    expect(serialized.isValid).toBe(result.isValid);
                    expect(serialized.errors).toEqual(result.errors);
                    expect(serialized.sport).toBe(result.sport);

                    return true;
                }
            ),
            { numRuns: 200 }
        );
    });

    test("validation handles boundary conditions without errors", () => {
        const boundaryValues = [
            999,   // Just below MLB range
            1000,  // MLB start
            1999,  // MLB end
            2000,  // NBA start
            2999,  // NBA end
            3000,  // NFL start
            3999,  // NFL end
            4000,  // NHL start
            4999,  // NHL end
            5000,  // WNBA start
            5999,  // WNBA end
            6000,  // MLS start
            6999,  // MLS end
            7000,  // CBB start
            7999,  // CBB end
            8000,  // CFB start
            8999,  // CFB end
            9000,  // Just above CFB range
        ];

        boundaryValues.forEach(value => {
            expect(() => validateRotationNumber(value)).not.toThrow();

            const result = validateRotationNumber(value);
            expect(result).toBeDefined();
            expect(typeof result.isValid).toBe('boolean');
            expect(Array.isArray(result.errors)).toBe(true);
        });
    });
});
