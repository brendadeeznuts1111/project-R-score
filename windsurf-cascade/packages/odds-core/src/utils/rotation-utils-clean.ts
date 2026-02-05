// packages/odds-core/src/utils/rotation-utils-clean.ts - Clean version of rotation utilities

import type {
    RotationNumberRanges,
    SportType,
    TeamRotationNumber,
    GameRotationNumbers,
    PlayerPropRotationNumbers,
    SportsbookRotationMappings,
    RotationSearchCriteria,
    RotationValidationResult,
    RotationDescription,
    RotationAnalytics,
    RotationNumberPerformance
} from '@odds-core/types';

/**
 * Comprehensive rotation number utility class
 */
export class RotationNumberUtils {
    private static readonly ROTATION_RANGES: RotationNumberRanges = {
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
    };

    /**
     * Validate rotation number format and range
     */
    static isValidRotationNumber(
        rotationId: number,
        sport?: SportType
    ): boolean {
        if (!Number.isInteger(rotationId) || rotationId < 1000) {
            return false;
        }

        if (sport) {
            const [min, max] = this.ROTATION_RANGES[sport];
            return rotationId >= min && rotationId <= max;
        }

        return rotationId <= 19999; // Reasonable upper bound
    }

    /**
     * Extract sport from rotation number
     */
    static getSportFromRotation(rotationId: number): SportType | null {
        for (const [sport, [min, max]] of Object.entries(this.ROTATION_RANGES)) {
            if (rotationId >= min && rotationId <= max) {
                return sport as SportType;
            }
        }
        return null;
    }

    /**
     * Generate human-readable description from rotation number
     */
    static describeRotationNumber(
        rotationId: number,
        gameData?: {
            homeTeam?: string;
            awayTeam?: string;
            marketType?: string;
            line?: number;
            player?: string;
            propType?: string;
        }
    ): string {
        const sport = this.getSportFromRotation(rotationId);
        if (!sport) return `Unknown rotation: ${rotationId}`;

        // Determine market type from rotation number pattern
        const lastDigit = rotationId % 10;
        const tensDigit = Math.floor((rotationId % 100) / 10);
        const hundredsDigit = Math.floor((rotationId % 1000) / 100);

        let marketType = 'unknown';
        let side = 'unknown';
        let description = `${sport.toUpperCase()}`;

        // Team rotations (end in 0)
        if (lastDigit === 0) {
            if (gameData?.homeTeam) {
                return `${sport.toUpperCase()}: ${gameData.homeTeam} team rotation`;
            }
            return `${sport.toUpperCase()}: Team rotation ${rotationId}`;
        }

        // Moneyline markets (end in 1-3)
        if (lastDigit >= 1 && lastDigit <= 3) {
            marketType = 'moneyline';
            side = lastDigit === 1 ? 'home' : lastDigit === 2 ? 'away' : 'draw';
            description += ` moneyline`;

            if (gameData?.homeTeam && gameData?.awayTeam) {
                const team = side === 'home' ? gameData.homeTeam : side === 'away' ? gameData.awayTeam : 'Draw';
                description += `: ${team}`;
            }
        }

        // Spread markets (end in 4-7)
        else if (lastDigit >= 4 && lastDigit <= 7) {
            marketType = 'spread';
            side = lastDigit <= 5 ? 'home' : 'away';
            description += ` spread`;

            if (gameData?.line !== undefined) {
                const lineStr = side === 'home' ? gameData.line.toString() : `+${Math.abs(gameData.line)}`;
                description += ` ${lineStr}`;
            }

            if (gameData?.homeTeam && gameData?.awayTeam) {
                description += `: ${gameData.homeTeam} vs ${gameData.awayTeam}`;
            }
        }

        // Total markets (end in 8-9)
        else if (lastDigit >= 8 && lastDigit <= 9) {
            marketType = 'total';
            side = lastDigit === 8 ? 'over' : 'under';
            description += ` total`;

            if (gameData?.line !== undefined) {
                description += ` ${gameData.line} ${side}`;
            }

            if (gameData?.homeTeam && gameData?.awayTeam) {
                description += `: ${gameData.homeTeam} vs ${gameData.awayTeam}`;
            }
        }

        // Player props (higher ranges, different patterns)
        else if (rotationId >= 25000 && rotationId <= 29999) {
            marketType = 'player prop';

            if (gameData?.player && gameData?.propType) {
                description += `: ${gameData.player} ${gameData.propType}`;

                if (gameData?.line !== undefined) {
                    const overUnder = lastDigit % 2 === 0 ? 'over' : 'under';
                    description += ` ${overUnder} ${gameData.line}`;
                }
            } else {
                description += ` player prop ${rotationId}`;
            }
        }

        // Game props
        else if (rotationId >= 30000 && rotationId <= 34999) {
            marketType = 'game prop';
            description += ` game prop ${rotationId}`;

            if (gameData?.propType) {
                description += `: ${gameData.propType}`;
            }
        }

        // Live betting (specific ranges)
        else if (hundredsDigit === 5) { // 5xxx range for live betting
            marketType = 'live betting';
            description += ` live ${marketType}`;

            if (gameData?.marketType) {
                description += ` ${gameData.marketType}`;
            }
        }

        // Default fallback
        else {
            description += ` market ${rotationId}`;
        }

        return description;
    }

    /**
     * Get rotation number range for sport
     */
    static getRotationRange(sport: SportType): [number, number] {
        return this.ROTATION_RANGES[sport];
    }

    /**
     * Parse rotation number string format (e.g., "ROT_NBA_815")
     */
    static parseRotationString(rotationString: string): {
        sport: SportType | null;
        rotationId: number | null;
        isValid: boolean;
    } {
        const match = rotationString.match(/^ROT_([A-Z]+)_(\d+)$/);

        if (!match) {
            return { sport: null, rotationId: null, isValid: false };
        }

        const sportCode = match[1] as keyof typeof this.ROTATION_RANGES;
        const rotationId = parseInt(match[2], 10);

        // Map sport codes to SportType
        const sportMapping: Record<string, SportType> = {
            'MLB': 'MLB',
            'NBA': 'NBA',
            'NFL': 'NFL',
            'NHL': 'NHL',
            'NCAAF': 'NCAAF',
            'NCAAB': 'NCAAB',
            'SOCCER': 'SOCCER',
            'TENNIS': 'TENNIS',
            'GOLF': 'GOLF',
            'MMA': 'MMA'
        };

        const sport = sportMapping[sportCode] || null;
        const isValid = sport && this.isValidRotationNumber(rotationId, sport);

        return { sport, rotationId, isValid };
    }

    /**
     * Format rotation number as string
     */
    static formatRotationString(rotationId: number, sport: SportType): string {
        if (!this.isValidRotationNumber(rotationId, sport)) {
            throw new Error(`Invalid rotation number ${rotationId} for sport ${sport}`);
        }

        return `ROT_${sport}_${rotationId}`;
    }
}
