// packages/odds-core/src/types/rotation-numbers.ts - Comprehensive rotation number system for sports betting

// ===== CORE ROTATION NUMBER RANGES =====

/**
 * Standard rotation number ranges by sport
 */
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

/**
 * Rotation number ranges constant
 */
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

/**
 * Sport type from rotation ranges
 */
export type SportType = keyof RotationNumberRanges;

// ===== TEAM ROTATION NUMBERS =====

/**
 * Individual team rotation number structure
 */
export interface TeamRotationNumber {
    readonly rotationId: number;
    readonly teamId: string;
    readonly sport: SportType;
    readonly league: string;
    readonly teamName: string;
    readonly teamAbbreviation: string;
    readonly location: string;
    readonly isHome: boolean;
    readonly opponentRotationId?: number;
    readonly gameRotationId?: number;
}

// ===== GAME ROTATION NUMBERS =====

/**
 * Game-level rotation numbers for moneyline, spreads, totals
 */
export interface GameRotationNumbers {
    readonly gameRotationId: number;
    readonly homeTeamRotationId: number;
    readonly awayTeamRotationId: number;

    // Betting market rotation numbers
    readonly moneyline: {
        readonly home: number;
        readonly away: number;
        readonly draw?: number; // For sports with draw possibility
    };

    readonly spread: {
        readonly home: number;
        readonly away: number;
        readonly points: number; // The actual spread points
    };

    readonly total: {
        readonly over: number;
        readonly under: number;
        readonly points: number; // The total points line
    };
}

// ===== PROP BET ROTATION NUMBERS =====

/**
 * Player prop rotation numbers
 */
export interface PlayerPropRotationNumbers {
    readonly playerRotationId: number;
    readonly playerId: string;
    readonly playerName: string;
    readonly teamRotationId: number;

    readonly props: {
        // Common player props
        readonly points: number[];
        readonly rebounds: number[];
        readonly assists: number[];
        readonly yards: number[];
        readonly touchdowns: number[];
        readonly strikeouts: number[];

        // Alternative lines
        readonly altPoints: Map<number, number>; // points line -> rotation number
        readonly altYards: Map<number, number>;  // yards line -> rotation number
    };
}

/**
 * Game prop rotation numbers
 */
export interface GamePropRotationNumbers {
    readonly gameRotationId: number;

    readonly props: {
        readonly firstTeamToScore: {
            readonly home: number;
            readonly away: number;
        };
        readonly firstScoringPlay: {
            readonly touchdown: number;
            readonly fieldGoal: number;
            readonly safety: number;
        };
        readonly halftimeFulltime: Map<string, number>; // "Home/Home" -> rotation number
        readonly marginOfVictory: Map<string, number>;  // "1-6 points" -> rotation number
    };
}

// ===== LIVE BETTING ROTATION NUMBERS =====

/**
 * Live/in-game betting rotation numbers
 */
export interface LiveBettingRotationNumbers {
    readonly baseGameRotationId: number;
    readonly period: number; // Quarter, inning, period

    // Dynamic rotation numbers that change during game
    readonly nextPlay: {
        readonly outcome: Map<string, number>; // "Touchdown", "Field Goal", etc.
        readonly player: Map<string, number>;  // Player-specific next play props
    };

    // Quarter/half specific
    readonly quarterLines: {
        readonly spread: Map<number, GameRotationNumbers>; // quarter -> rotation numbers
        readonly total: Map<number, GameRotationNumbers>;  // quarter -> rotation numbers
    };
}

// ===== SPORTSBOOK MAPPINGS =====

/**
 * Different sportsbooks use different rotation number systems
 */
export interface SportsbookRotationMappings {
    readonly draftkings: Map<number, number>; // Internal -> DraftKings
    readonly fanduel: Map<number, number>;    // Internal -> FanDuel
    readonly betmgm: Map<number, number>;     // Internal -> BetMGM
    readonly caesars: Map<number, number>;    // Internal -> Caesars
    readonly pointsbet: Map<number, number>;  // Internal -> PointsBet
}

/**
 * Sportsbook-specific rotation number
 */
export interface SportsbookRotationNumber {
    readonly internalRotationId: number;
    readonly sportsbook: keyof SportsbookRotationMappings;
    readonly sportsbookRotationId: number;
    readonly isValid: boolean;
}

// ===== PERFORMANCE TRACKING =====

/**
 * Track performance and handle rotation numbers
 */
export interface RotationNumberPerformance {
    readonly rotationId: number;
    readonly totalBets: number;
    readonly totalHandle: number; // Total money wagered
    readonly betDistribution: {
        readonly moneyline: number;
        readonly spread: number;
        readonly total: number;
        readonly props: number;
    };
    readonly sharpMoney: number; // Professional betting volume
    readonly publicMoney: number; // Public/recreational betting volume
    readonly closingLineValue: number; // Line movement tracking
}

/**
 * Rotation number analytics for trading decisions
 */
export interface RotationAnalytics {
    readonly rotationId: number;
    readonly volatility: number; // How much the line moves
    readonly liquidity: number;  // Betting volume indicator
    readonly sharpConsensus: number; // Which side professionals are on
    readonly lineEfficiency: number; // How efficient the market is for this rotation
}

// ===== SYNTHETIC ARBITRAGE ROTATION INTEGRATION =====

/**
 * Rotation number pair for synthetic arbitrage
 */
export interface SyntheticArbitrageRotationPair {
    readonly primaryRotation: {
        readonly rotationId: number;
        readonly marketType: 'moneyline' | 'spread' | 'total' | 'prop';
        readonly period: string;
        readonly sportsbook: string;
    };

    readonly secondaryRotation: {
        readonly rotationId: number;
        readonly marketType: 'moneyline' | 'spread' | 'total' | 'prop';
        readonly period: string;
        readonly sportsbook: string;
    };

    readonly correlation: number; // Historical correlation between these rotations
    readonly sampleSize: number;   // Number of games in correlation calculation
}

/**
 * Enhanced market leg with comprehensive rotation data
 */
export interface RotationEnhancedMarketLeg {
    readonly baseRotation: GameRotationNumbers;
    readonly specificRotation: number; // The specific rotation for this market
    readonly marketType: 'moneyline' | 'spread' | 'total';
    readonly side: 'home' | 'away' | 'over' | 'under';
    readonly sportsbookRotation: SportsbookRotationNumber;
    readonly performance: RotationNumberPerformance;
    readonly analytics: RotationAnalytics;
}

// ===== ROTATION NUMBER REGISTRY =====

/**
 * Registry for managing rotation numbers
 */
export interface RotationNumberRegistry {
    readonly teamRotations: Map<number, TeamRotationNumber>;
    readonly gameRotations: Map<number, GameRotationNumbers>;
    readonly propRotations: Map<number, PlayerPropRotationNumbers | GamePropRotationNumbers>;
    readonly liveRotations: Map<number, LiveBettingRotationNumbers>;
    readonly sportsbookMappings: SportsbookRotationMappings;
}

// ===== UTILITY TYPES =====

/**
 * Rotation number search criteria
 */
export type RotationSearchCriteria = {
    readonly rotationId?: number;
    readonly teamId?: string;
    readonly playerId?: string;
    readonly gameId?: string;
    readonly marketType?: 'moneyline' | 'spread' | 'total' | 'prop';
    readonly side?: 'home' | 'away' | 'over' | 'under';
    readonly sport?: SportType;
    readonly sportsbook?: keyof SportsbookRotationMappings;
};

/**
 * Rotation number validation result
 */
export interface RotationValidationResult {
    readonly isValid: boolean;
    readonly rotationId: number;
    readonly sport: SportType | null;
    readonly errors: string[];
    readonly warnings: string[];
}

/**
 * Rotation number description
 */
export interface RotationDescription {
    readonly rotationId: number;
    readonly sport: SportType;
    readonly description: string;
    readonly marketType: string;
    readonly participants: string[];
    readonly line?: number;
}

// ===== ANALYTICS TYPES =====

/**
 * Enhanced rotation number for analytics
 */
export interface RotationNumber {
    readonly id: string;
    readonly sport: SportType;
    readonly league: string;
    readonly eventDate: Date;
    readonly rotation: number;
    readonly teams: { readonly home: string; readonly away: string; };
    readonly markets: RotationMarket[];
    readonly sportsbook: string;
    readonly isActive: boolean;
    readonly lastUpdated: Date;
}

/**
 * Rotation market data
 */
export interface RotationMarket {
    readonly id: string;
    readonly marketType: 'moneyline' | 'spread' | 'total' | 'prop';
    readonly rotation: number;
    readonly line?: number;
    readonly odds: number;
    readonly juice?: number;
    readonly isLive: boolean;
    readonly volume: number;
    readonly sharp: boolean;
    readonly lastUpdated: Date;
}

/**
 * Price point for analytics
 */
export interface PricePoint {
    readonly timestamp: Date;
    readonly price: number;
    readonly sportsbook: string;
    readonly marketType: 'moneyline' | 'spread' | 'total' | 'prop';
}

/**
 * Volume point for analytics
 */
export interface VolumePoint {
    readonly timestamp: Date;
    readonly volume: number;
    readonly sportsbook: string;
    readonly marketType: 'moneyline' | 'spread' | 'total' | 'prop';
}

/**
 * Sharp movement detection
 */
export interface SharpMovement {
    readonly timestamp: Date;
    readonly fromPrice: number;
    readonly toPrice: number;
    readonly sportsbook: string;
    readonly significance: number;
    readonly reason?: string;
}

/**
 * Arbitrage opportunity
 */
export interface ArbitrageOpportunity {
    readonly id: string;
    readonly rotationNumberId: string;
    readonly timestamp: Date;
    readonly markets: Array<{
        readonly market: RotationMarket;
        readonly price: number;
        readonly sportsbook: string;
    }>;
    readonly expectedReturn: {
        readonly percent: number;
        readonly absolute: number;
    };
    readonly confidence: number;
    readonly riskMetrics: {
        readonly riskScore: number;
        readonly maxExposure: number;
        readonly liquidityRisk: number;
    };
    readonly sportsbooks: string[];
}

/**
 * Efficiency metrics
 */
export interface EfficiencyMetrics {
    readonly priceEfficiency: number;
    readonly volumeEfficiency: number;
    readonly arbitrageFrequency: number;
    readonly marketImpact: number;
}

/**
 * Enhanced rotation analytics with history
 */
export interface RotationAnalyticsWithHistory {
    readonly rotationId: number;
    readonly rotationNumber: RotationNumber;
    readonly priceHistory: PricePoint[];
    readonly volumeHistory: VolumePoint[];
    readonly sharpMovement: SharpMovement[];
    readonly arbitrageHistory: ArbitrageOpportunity[];
    efficiency: EfficiencyMetrics; // Made mutable
    readonly volatility: number;
    readonly liquidity: number;
    readonly sharpConsensus: number;
    readonly lineEfficiency: number;
}

/**
 * Analytics configuration
 */
export interface RotationAnalyticsConfig {
    readonly sharpMovementThreshold: number;
    readonly volumeSpikeThreshold: number;
    readonly priceHistoryLimit: number;
    readonly efficiencyCalculationPeriod: number;
    readonly enableRealTimeAlerts: boolean;
}

/**
 * Analytics event
 */
export interface RotationAnalyticsEvent {
    readonly type: 'price_movement' | 'volume_spike' | 'arbitrage_opportunity' | 'efficiency_change';
    readonly timestamp: Date;
    readonly rotationNumberId: string;
    readonly analytics: RotationAnalyticsWithHistory;
    readonly data: any;
}

/**
 * Rotation number constants
 */
export const ROTATION_NUMBER_CONSTANTS = {
    SHARP_MOVEMENT_THRESHOLD: 0.02,
    VOLUME_SPIKE_THRESHOLD: 3.0,
    PRICE_HISTORY_LIMIT: 1000,
    EFFICIENCY_CALCULATION_PERIOD: 3600000, // 1 hour
    MIN_EXPECTED_RETURN: 0.001, // 0.1% minimum expected return
    MAX_RISK_SCORE: 0.8, // Maximum acceptable risk score
    DEFAULT_CONFIG: {
        sharpMovementThreshold: 0.02,
        volumeSpikeThreshold: 3.0,
        priceHistoryLimit: 1000,
        efficiencyCalculationPeriod: 3600000,
        enableRealTimeAlerts: true
    } as RotationAnalyticsConfig
} as const;

// ===== ROTATION ARBITRAGE TYPES =====

/**
 * Sportsbook type
 */
export type Sportsbook = 'draftkings' | 'fanduel' | 'betmgm' | 'caesars' | 'pointsbet' | 'bet365' | 'williamhill' | 'barstool';

/**
 * Market type for rotation arbitrage
 */
export type MarketType = 'moneyline' | 'spread' | 'total' | 'prop' | 'player_prop' | 'game_prop';

/**
 * Rotation arbitrage configuration
 */
export interface RotationArbitrageConfig {
    readonly minExpectedReturn: number;
    readonly maxRiskScore: number;
    readonly maxMarketsPerOpportunity: number;
    readonly enableLiveArbitrage: boolean;
    readonly enableCrossSportsbook: boolean;
}

/**
 * Arbitrage rotation market with enhanced data
 */
export interface ArbitrageRotationMarket {
    readonly rotationNumber: RotationNumber;
    readonly market: RotationMarket;
    readonly sportsbook: Sportsbook;
    readonly price: number;
    readonly side: 'back' | 'lay';
}

/**
 * Rotation arbitrage opportunity
 */
export interface RotationArbitrageOpportunity {
    readonly id: string;
    readonly rotationNumbers: RotationNumber[];
    readonly markets: ArbitrageRotationMarket[];
    readonly expectedReturn: {
        readonly percent: number;
        readonly absolute: number;
        readonly confidence: number;
    };
    readonly riskMetrics: {
        readonly riskScore: number;
        readonly maxDrawdown: number;
        readonly volatility: number;
    };
    readonly timestamp: Date;
    readonly confidence: number;
    readonly sportsbooks: Sportsbook[];
}

/**
 * Rotation arbitrage validation result
 */
export interface RotationArbitrageValidation {
    readonly isValid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
    readonly opportunity: RotationArbitrageOpportunity;
}

/**
 * Rotation arbitrage event
 */
export interface RotationArbitrageEvent {
    readonly type: 'opportunity_found' | 'opportunity_expired' | 'opportunity_executed' | 'opportunity_validated';
    readonly timestamp: Date;
    readonly opportunity?: RotationArbitrageOpportunity;
    readonly data?: any;
}

/**
 * Rotation number filter criteria
 */
export interface RotationNumberFilter {
    readonly sport?: SportType;
    readonly league?: string;
    readonly sportsbook?: Sportsbook;
    readonly marketType?: MarketType;
    readonly minOdds?: number;
    readonly maxOdds?: number;
    readonly minVolume?: number;
    readonly isLive?: boolean;
}

/**
 * Rotation arbitrage filter criteria
 */
export interface RotationArbitrageFilter {
    readonly minExpectedReturn?: number;
    readonly maxRiskScore?: number;
    readonly sportsbooks?: Sportsbook[];
    readonly marketTypes?: MarketType[];
    readonly enableLiveArbitrage?: boolean;
    readonly minConfidence?: number;
}
