// FastCheck arbitraries for rotation number testing

import * as fc from 'fast-check';
import {
    ROTATION_RANGES,
    type SportType,
    type RotationNumber,
    type RotationValidationResult,
    type SportsbookRotationNumber,
    type TeamRotationNumber
} from '../../../../../odds-core/src/types/rotation-numbers';

/**
 * Helper function to get sport from rotation number
 */
function getSportFromRotation(rotationId: number): SportType {
    for (const [sport, [min, max]] of Object.entries(ROTATION_RANGES)) {
        if (rotationId >= min && rotationId <= max) {
            return sport as SportType;
        }
    }
    return 'NBA'; // Default fallback
}

/**
 * Helper function to validate rotation number
 */
function validateRotationNumber(rotationId: number): RotationValidationResult {
    const sport = getSportFromRotation(rotationId);
    const range = ROTATION_RANGES[sport];
    const isValid = rotationId >= range[0] && rotationId <= range[1];

    return {
        isValid,
        rotationId,
        sport: isValid ? sport : null,
        errors: isValid ? [] : [`Rotation ${rotationId} is outside valid range for ${sport}`],
        warnings: []
    };
}

/**
 * Helper function to parse rotation number
 */
function parseRotationNumber(rotationId: number): {
    gameId: string;
    sport: SportType;
    teamId?: string;
} {
    const sport = getSportFromRotation(rotationId);
    return {
        gameId: `game-${Math.floor(rotationId / 100)}`,
        sport,
        teamId: `team-${rotationId % 100}`
    };
}

/**
 * FastCheck arbitraries for rotation number testing
 */
export const rotationArbitraries = {
    /**
     * Generates valid rotation numbers within sport-specific ranges
     */
    validRotationNumber: fc.record({
        id: fc.uuid(),
        sport: fc.constantFrom(...Object.keys(ROTATION_RANGES) as SportType[]),
        league: fc.string(),
        eventDate: fc.date(),
        rotation: fc.integer({ min: 1000, max: 10999 }),
        teams: fc.record({
            home: fc.string(),
            away: fc.string()
        }),
        markets: fc.array(fc.record({
            id: fc.uuid(),
            marketType: fc.constantFrom('moneyline', 'spread', 'total', 'prop'),
            rotation: fc.integer({ min: 1000, max: 10999 }),
            line: fc.option(fc.integer(), { nil: undefined }),
            odds: fc.integer({ min: -10000, max: 10000 }),
            juice: fc.option(fc.integer(), { nil: undefined }),
            isLive: fc.boolean(),
            volume: fc.integer({ min: 0, max: 1000000 }),
            sharp: fc.boolean(),
            lastUpdated: fc.date()
        })),
        sportsbook: fc.constantFrom('draftkings', 'fanduel', 'betmgm', 'caesars'),
        isActive: fc.boolean(),
        lastUpdated: fc.date()
    }).map((rotation) => ({
        ...rotation,
        rotationId: rotation.rotation
    })),

    /**
     * Generates sportsbook rotation number pairs
     */
    sportsbookRotationPair: fc.record({
        internalRotationId: fc.integer({ min: 1000, max: 10999 }),
        sportsbookRotationId: fc.integer({ min: 1000, max: 10999 }),
        sportsbook: fc.constantFrom('draftkings', 'fanduel', 'betmgm', 'caesars'),
        isValid: fc.boolean()
    }),

    /**
     * Generates invalid rotation numbers
     */
    invalidRotationNumber: fc.oneof(
        fc.integer({ min: 0, max: 999 }), // Below valid range
        fc.integer({ min: 11000, max: 20000 }) // Above valid range
    ),

    /**
     * Generates team rotation numbers
     */
    teamRotationNumber: fc.record({
        rotationId: fc.integer({ min: 1000, max: 10999 }),
        teamId: fc.uuid(),
        sport: fc.constantFrom(...Object.keys(ROTATION_RANGES) as SportType[]),
        league: fc.string(),
        teamName: fc.string(),
        teamAbbreviation: fc.string(),
        location: fc.string(),
        isHome: fc.boolean(),
        opponentRotationId: fc.option(fc.integer(), { nil: undefined }),
        gameRotationId: fc.option(fc.integer(), { nil: undefined })
    }).map((teamRotation) => {
        // Ensure the rotationId matches the sport
        const sport = getSportFromRotation(teamRotation.rotationId);
        return { ...teamRotation, sport };
    }),

    /**
     * Generates sportsbook rotation numbers
     */
    sportsbookRotationNumber: fc.record({
        internalRotationId: fc.integer({ min: 1000, max: 10999 }),
        sportsbook: fc.constantFrom('draftkings', 'fanduel', 'betmgm', 'caesars'),
        sportsbookRotationId: fc.integer({ min: 1000, max: 10999 }),
        isValid: fc.boolean()
    })
};

// Export helper functions for use in tests
export { getSportFromRotation, validateRotationNumber, parseRotationNumber };
