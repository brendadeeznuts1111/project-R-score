// packages/testing/src/domain/rotation-numbers/property/rotation-validation.property.test.ts

import { test, describe } from 'bun:test';
import * as fc from 'fast-check';
import { expect } from 'bun:test';
import {
    ROTATION_RANGES,
    type SportType,
    type RotationValidationResult
} from '../../../../../odds-core/src/types/rotation-numbers';
import { rotationArbitraries, getSportFromRotation, validateRotationNumber, parseRotationNumber } from '../arbitraries/rotation-arbitraries';

describe.concurrent("Rotation Number Validation Properties", () => {

    test("rotation numbers fall within sport-specific ranges", () => {
        fc.assert(
            fc.property(
                rotationArbitraries.validRotationNumber,
                (rotation) => {
                    const sport = getSportFromRotation(rotation.rotationId);
                    const range = ROTATION_RANGES[sport];

                    expect(rotation.rotationId).toBeGreaterThanOrEqual(range[0]);
                    expect(rotation.rotationId).toBeLessThanOrEqual(range[1]);
                    return true;
                }
            ),
            {
                numRuns: 1000,
                verbose: true
            }
        );
    });

    test("invalid rotation numbers are rejected", () => {
        fc.assert(
            fc.property(
                rotationArbitraries.invalidRotationNumber,
                (invalidRotation) => {
                    const result = validateRotationNumber(invalidRotation);
                    expect(result.isValid).toBe(false);
                    expect(result.errors.length).toBeGreaterThan(0);
                    return true;
                }
            ),
            { numRuns: 500 }
        );
    });

    test("sportsbook mappings preserve rotation number semantics", () => {
        fc.assert(
            fc.property(
                rotationArbitraries.sportsbookRotationPair,
                (pair) => {
                    const internal = parseRotationNumber(pair.internalRotationId);
                    const sportsbook = parseRotationNumber(pair.sportsbookRotationId);

                    // Both rotation numbers should be valid
                    const internalValidation = validateRotationNumber(pair.internalRotationId);
                    const sportsbookValidation = validateRotationNumber(pair.sportsbookRotationId);

                    expect(internalValidation.isValid).toBe(true);
                    expect(sportsbookValidation.isValid).toBe(true);

                    // Both should have the same structure (gameId, sport, teamId)
                    expect(typeof internal.gameId).toBe('string');
                    expect(typeof sportsbook.gameId).toBe('string');
                    expect(typeof internal.sport).toBe('string');
                    expect(typeof sportsbook.sport).toBe('string');

                    return true;
                }
            ),
            { numRuns: 2000 }
        );
    });

    test("rotation number ranges are non-overlapping", () => {
        const ranges = Object.entries(ROTATION_RANGES);
        for (let i = 0; i < ranges.length; i++) {
            const [sport1, [min1, max1]] = ranges[i];
            for (let j = i + 1; j < ranges.length; j++) {
                const [sport2, [min2, max2]] = ranges[j];

                // Ranges should not overlap
                const overlaps = !(max1 < min2 || max2 < min1);
                if (overlaps) {
                    throw new Error(`Overlapping ranges detected: ${sport1} [${min1}, ${max1}] and ${sport2} [${min2}, ${max2}]`);
                }
            }
        }
    });

    test("team rotation numbers maintain consistency", () => {
        fc.assert(
            fc.property(
                rotationArbitraries.teamRotationNumber,
                (teamRotation) => {
                    const sport = getSportFromRotation(teamRotation.rotationId);
                    const range = ROTATION_RANGES[sport];

                    expect(teamRotation.rotationId).toBeGreaterThanOrEqual(range[0]);
                    expect(teamRotation.rotationId).toBeLessThanOrEqual(range[1]);
                    expect(teamRotation.sport).toBe(sport);
                    return true;
                }
            ),
            { numRuns: 500 }
        );
    });

    test("sportsbook rotation numbers maintain validity", () => {
        fc.assert(
            fc.property(
                rotationArbitraries.sportsbookRotationNumber,
                (sportsbookRotation) => {
                    const internalValidation = validateRotationNumber(sportsbookRotation.internalRotationId);
                    const sportsbookValidation = validateRotationNumber(sportsbookRotation.sportsbookRotationId);

                    // Both rotation numbers should be valid
                    expect(internalValidation.isValid).toBe(true);
                    expect(sportsbookValidation.isValid).toBe(true);
                    return true;
                }
            ),
            { numRuns: 300 }
        );
    });
});
