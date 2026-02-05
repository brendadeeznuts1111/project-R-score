// packages/testing/src/factories/bookmaker-registry.ts - Centralized bookmaker registry system

// Define rotation number ranges locally to avoid cross-package dependencies
export interface RotationNumberRanges {
    MLB: [1000, 1999];      // Baseball
    NBA: [2000, 2999];      // Basketball  
    NFL: [3000, 3999];      // Football
    NHL: [4000, 4999];      // Hockey
    NCAAF: [5000, 5999];    // College Football
    NCAAB: [6000, 6999];    // College Basketball
    SOCCER: [7000, 7999];   // Soccer
    TENNIS: [8000, 8999];   // Tennis
    GOLF: [9000, 9999];     // Golf
    MMA: [10000, 10999];    // MMA/UFC
}

export const ROTATION_RANGES: RotationNumberRanges = {
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

export type SportType = keyof RotationNumberRanges;

export interface MarketConvention {
    readonly name: string;
    readonly oddsFormat: 'american' | 'decimal' | 'fractional';
    readonly rotationPrefix?: string;
    readonly rotationSuffix?: string;
    readonly supportsLive: boolean;
    readonly supportedSports: SportType[];
    readonly marketTypes: string[];
}

export interface RotationScheme {
    readonly ranges: Partial<Record<SportType, [number, number]>>;
    readonly prefix: string;
    readonly padding: number;
    readonly separator?: string;
}

export interface BookmakerConfig {
    readonly id: string;
    readonly name: string;
    readonly displayName: string;
    readonly rotationScheme: RotationScheme;
    readonly marketConvention: MarketConvention;
    readonly apiEndpoints?: {
        readonly odds?: string;
        readonly scores?: string;
        readonly settlements?: string;
    };
    readonly rateLimits?: {
        readonly requestsPerSecond: number;
        readonly requestsPerMinute: number;
    };
}

export interface ExchangeMapping {
    readonly exchangeId: string;
    readonly bookmakerId: string;
    readonly mappingType: 'direct' | 'transformed';
    readonly fieldMappings?: Record<string, string>;
}

export class BookmakerRegistry {
    private static instance: BookmakerRegistry;
    private bookmakers = new Map<string, BookmakerConfig>();
    private exchangeMappings = new Map<string, ExchangeMapping>();

    private constructor() {
        this.initializeDefaultBookmakers();
        this.initializeExchangeMappings();
    }

    static getInstance(): BookmakerRegistry {
        if (!BookmakerRegistry.instance) {
            BookmakerRegistry.instance = new BookmakerRegistry();
        }
        return BookmakerRegistry.instance;
    }

    private initializeDefaultBookmakers(): void {
        // DraftKings
        this.bookmakers.set('draftkings', {
            id: 'draftkings',
            name: 'DraftKings',
            displayName: 'DraftKings Sportsbook',
            rotationScheme: {
                ranges: ROTATION_RANGES,
                prefix: 'DK',
                padding: 4
            },
            marketConvention: {
                name: 'draftkings-standard',
                oddsFormat: 'american',
                supportsLive: true,
                supportedSports: ['NBA', 'NFL', 'NHL', 'MLB', 'NCAAB', 'NCAAF'],
                marketTypes: ['moneyline', 'spread', 'total', 'player-props', 'team-props']
            },
            rateLimits: {
                requestsPerSecond: 10,
                requestsPerMinute: 600
            }
        });

        // FanDuel
        this.bookmakers.set('fanduel', {
            id: 'fanduel',
            name: 'FanDuel',
            displayName: 'FanDuel Sportsbook',
            rotationScheme: {
                ranges: ROTATION_RANGES,
                prefix: 'FD',
                padding: 4
            },
            marketConvention: {
                name: 'fanduel-standard',
                oddsFormat: 'american',
                supportsLive: true,
                supportedSports: ['NBA', 'NFL', 'NHL', 'MLB', 'NCAAB', 'NCAAF', 'SOCCER'],
                marketTypes: ['moneyline', 'spread', 'total', 'player-props', 'game-props']
            },
            rateLimits: {
                requestsPerSecond: 15,
                requestsPerMinute: 900
            }
        });

        // BetMGM
        this.bookmakers.set('betmgm', {
            id: 'betmgm',
            name: 'BetMGM',
            displayName: 'BetMGM Sportsbook',
            rotationScheme: {
                ranges: {
                    ...ROTATION_RANGES,
                    NBA: [12000, 12999], // Custom NBA range
                    NFL: [13000, 13999]  // Custom NFL range
                },
                prefix: 'MGM',
                padding: 5
            },
            marketConvention: {
                name: 'betmgm-standard',
                oddsFormat: 'american',
                supportsLive: true,
                supportedSports: ['NBA', 'NFL', 'NHL', 'MLB', 'NCAAB', 'NCAAF', 'TENNIS', 'GOLF'],
                marketTypes: ['moneyline', 'spread', 'total', 'player-props', 'future']
            },
            rateLimits: {
                requestsPerSecond: 8,
                requestsPerMinute: 480
            }
        });

        // PointsBet
        this.bookmakers.set('pointsbet', {
            id: 'pointsbet',
            name: 'PointsBet',
            displayName: 'PointsBet Sportsbook',
            rotationScheme: {
                ranges: ROTATION_RANGES,
                prefix: 'PB',
                padding: 4,
                separator: '-'
            },
            marketConvention: {
                name: 'pointsbet-standard',
                oddsFormat: 'american',
                supportsLive: true,
                supportedSports: ['NBA', 'NFL', 'NHL', 'MLB', 'NCAAB', 'NCAAF'],
                marketTypes: ['moneyline', 'spread', 'total', 'player-props']
            },
            rateLimits: {
                requestsPerSecond: 5,
                requestsPerMinute: 300
            }
        });
    }

    private initializeExchangeMappings(): void {
        // Direct mappings (exchange name matches bookmaker ID)
        const directMappings = ['draftkings', 'fanduel', 'betmgm', 'pointsbet'];
        directMappings.forEach(exchange => {
            this.exchangeMappings.set(exchange, {
                exchangeId: exchange,
                bookmakerId: exchange,
                mappingType: 'direct'
            });
        });

        // Transformed mappings
        this.exchangeMappings.set('mgm', {
            exchangeId: 'mgm',
            bookmakerId: 'betmgm',
            mappingType: 'transformed'
        });
    }

    // Public API methods

    getBookmaker(bookmakerId: string): BookmakerConfig | undefined {
        return this.bookmakers.get(bookmakerId.toLowerCase());
    }

    getBookmakerByExchange(exchangeId: string): BookmakerConfig | undefined {
        const mapping = this.exchangeMappings.get(exchangeId.toLowerCase());
        if (!mapping) return undefined;
        return this.getBookmaker(mapping.bookmakerId);
    }

    getAllBookmakers(): BookmakerConfig[] {
        return Array.from(this.bookmakers.values());
    }

    getBookmakersForSport(sport: SportType): BookmakerConfig[] {
        return Array.from(this.bookmakers.values()).filter(
            bookmaker => bookmaker.marketConvention.supportedSports.includes(sport)
        );
    }

    generateRotationNumber(bookmakerId: string, sport: SportType, sequenceNumber: number): string | null {
        const bookmaker = this.getBookmaker(bookmakerId);
        if (!bookmaker) return null;

        const scheme = bookmaker.rotationScheme;
        const range = scheme.ranges[sport] || ROTATION_RANGES[sport];

        if (!range) return null;

        const [min, max] = range;
        const rotationNumber = Math.min(max, Math.max(min, min + sequenceNumber));

        const paddedNumber = rotationNumber.toString().padStart(scheme.padding, '0');
        const separator = scheme.separator || '';

        return `${scheme.prefix}${separator}${paddedNumber}`;
    }

    validateRotationNumber(bookmakerId: string, rotationNumber: string): boolean {
        const bookmaker = this.getBookmaker(bookmakerId);
        if (!bookmaker) return false;

        const scheme = bookmaker.rotationScheme;
        const prefix = scheme.prefix;
        const separator = scheme.separator || '';

        if (!rotationNumber.startsWith(prefix + separator)) return false;

        const numberPart = rotationNumber.substring((prefix + separator).length);
        if (!/^\d+$/.test(numberPart)) return false;

        const num = parseInt(numberPart, 10);

        // Check if number falls within any sport range
        for (const [sport, range] of Object.entries(scheme.ranges)) {
            if (range) {
                const [min, max] = range;
                if (num >= min && num <= max) return true;
            }
        }

        // Check default ranges if no custom range matched
        for (const [sport, range] of Object.entries(ROTATION_RANGES)) {
            const [min, max] = range;
            if (num >= min && num <= max) return true;
        }

        return false;
    }

    getSportFromRotationNumber(bookmakerId: string, rotationNumber: string): SportType | null {
        const bookmaker = this.getBookmaker(bookmakerId);
        if (!bookmaker) return null;

        const scheme = bookmaker.rotationScheme;
        const separator = scheme.separator || '';
        const prefix = scheme.prefix;

        if (!rotationNumber.startsWith(prefix + separator)) return null;

        const numberPart = rotationNumber.substring((prefix + separator).length);
        const num = parseInt(numberPart, 10);

        // Check custom ranges first
        for (const [sport, range] of Object.entries(scheme.ranges)) {
            if (range) {
                const [min, max] = range;
                if (num >= min && num <= max) return sport as SportType;
            }
        }

        // Check default ranges
        for (const [sport, range] of Object.entries(ROTATION_RANGES)) {
            const [min, max] = range;
            if (num >= min && num <= max) return sport as SportType;
        }

        return null;
    }

    addBookmaker(config: BookmakerConfig): void {
        this.bookmakers.set(config.id.toLowerCase(), config);
    }

    addExchangeMapping(mapping: ExchangeMapping): void {
        this.exchangeMappings.set(mapping.exchangeId.toLowerCase(), mapping);
    }

    // Utility methods

    getSupportedSports(): SportType[] {
        const sports = new Set<SportType>();
        this.bookmakers.forEach(bookmaker => {
            bookmaker.marketConvention.supportedSports.forEach(sport => sports.add(sport));
        });
        return Array.from(sports);
    }

    getExchangesForBookmaker(bookmakerId: string): string[] {
        return Array.from(this.exchangeMappings.entries())
            .filter(([_, mapping]) => mapping.bookmakerId === bookmakerId.toLowerCase())
            .map(([exchangeId, _]) => exchangeId);
    }
}
