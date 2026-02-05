// packages/odds-core/src/types/enhanced-odds.ts - Enhanced odds types for synthetic arbitrage

import { MarketPeriod, Score } from './synthetic-arbitrage';
import { LiquidityLevel, VolatilityLevel } from './topics';


export interface EnhancedOddsTick {
    // Core odds data
    id: string;
    sport: string;
    gameId: string;
    event: string;
    timestamp: Date;

    // Market details
    marketType: MarketPeriod;
    exchange: string;
    bookmaker: string;
    isLive: boolean;

    // Odds information
    line: number;
    juice: number;
    odds: {
        home: number;
        away: number;
        draw?: number; // For soccer/other sports
    };

    // Enhanced data for synthetic arbitrage
    timeRemaining?: number; // seconds remaining in period/game
    currentScore?: Score;
    periodProgress?: number; // 0-1 progress through current period
    gameProgress?: number; // 0-1 progress through entire game

    // Market quality metrics
    volume?: number;
    liquidity: LiquidityLevel;
    volatility: VolatilityLevel;
    sharp: boolean;
    confidence: number; // 0-1 confidence in odds accuracy

    // Historical context
    openingLine?: number;
    lineMovement: number;
    priceHistory?: PricePoint[];

    // External factors
    weatherImpact?: number; // -1 to 1, negative = bad for favorites
    injuryImpact?: number; // -1 to 1, negative = bad for team
    sentimentScore?: number; // -1 to 1, public sentiment

    // Metadata
    lastUpdated: Date;
    source: string;
    reliability: number; // 0-1 data reliability score
}

export interface PricePoint {
    timestamp: Date;
    line: number;
    juice: number;
    volume?: number;
    sharp: boolean;
}

export interface GameContext {
    gameId: string;
    sport: string;
    status: GameStatus;
    currentPeriod: number;
    timeRemaining: number;
    score: Score;
    possession?: 'home' | 'away';
    momentum?: MomentumData;
    fouls?: FoulsData;
    timeouts?: TimeoutsData;
    weather?: WeatherData;
    injuries?: InjuryData;
}

export interface MomentumData {
    home: number; // -1 to 1, recent performance
    away: number; // -1 to 1, recent performance
    duration: number; // minutes of current momentum
}

export interface FoulsData {
    home: number;
    away: number;
    bonus: {
        home: boolean;
        away: boolean;
    };
}

export interface TimeoutsData {
    home: number;
    away: number;
    max: number;
}

export interface WeatherData {
    condition: string;
    temperature: number; // fahrenheit
    humidity: number; // percentage
    windSpeed: number; // mph
    windDirection: string; // N, S, E, W, NE, etc.
    impact: number; // -1 to 1 on scoring
}

export interface InjuryData {
    players: PlayerInjury[];
    overallImpact: number; // -1 to 1 on team performance
}

export interface PlayerInjury {
    playerId: string;
    playerName: string;
    team: 'home' | 'away';
    importance: number; // 0-1 player importance
    status: 'out' | 'questionable' | 'probable';
    impact: number; // -1 to 1 on team performance
}

export interface MarketDepth {
    bids: [number, number][]; // [price, size]
    asks: [number, number][]; // [price, size]
    timestamp: Date;
    totalVolume: number;
    spread: number;
    midPrice: number;
}

export interface OrderBook {
    symbol: string;
    exchange: string;
    bids: Level[];
    asks: Level[];
    timestamp: Date;
    sequence: number;
}

export interface Level {
    price: number;
    size: number;
    orders: number; // number of orders at this level
}

export interface Trade {
    id: string;
    symbol: string;
    price: number;
    size: number;
    side: 'buy' | 'sell';
    timestamp: Date;
    exchange: string;
    aggressor: 'buyer' | 'seller';
}

export interface MarketStatistics {
    symbol: string;
    period: MarketPeriod;
    volume: number;
    turnover: number;
    priceRange: {
        high: number;
        low: number;
    };
    volatility: number;
    liquidityScore: number;
    sharpRatio: number;
    updateFrequency: number; // updates per second
    lastUpdate: Date;
}

export interface HistoricalOddsData {
    gameId: string;
    marketType: MarketPeriod;
    exchange: string;
    dataPoints: HistoricalDataPoint[];
    statistics: MarketStatistics;
}

export interface HistoricalDataPoint {
    timestamp: Date;
    line: number;
    juice: number;
    volume: number;
    sharp: boolean;
    score?: Score;
    timeRemaining: number;
}

export interface LiveOddsUpdate {
    tick: EnhancedOddsTick;
    previousTick: EnhancedOddsTick;
    changes: OddsChange[];
    significance: number; // 0-1 how significant the change is
    triggers: string[]; // what triggered the update
}

export interface OddsChange {
    field: 'line' | 'juice' | 'volume' | 'sharp' | 'score';
    oldValue: any;
    newValue: any;
    changePercent?: number;
    significance: number;
}

export interface MarketCorrelation {
    market1: string;
    market2: string;
    correlation: number;
    covariance: number;
    beta: number;
    rSquared: number;
    sampleSize: number;
    timeFrame: string;
    lastUpdated: Date;
    confidence: number;
}

export interface PeriodAnalysis {
    gameId: string;
    sport: string;
    periods: PeriodData[];
    correlations: Map<string, MarketCorrelation>;
    predictivePower: Map<string, number>; // How well each period predicts full game
}

export interface PeriodData {
    period: MarketPeriod;
    averageContribution: number; // Average contribution to final result
    volatility: number;
    correlationWithFullGame: number;
    typicalLineMovement: number;
    sharpFrequency: number;
    liquidityPattern: LiquidityPattern;
}

export interface LiquidityPattern {
    preGame: LiquidityLevel;
    inGame: LiquidityLevel;
    finalMinutes: LiquidityLevel;
    overtime?: LiquidityLevel;
}

export interface PredictiveModel {
    id: string;
    sport: string;
    marketType: MarketPeriod;
    accuracy: number;
    confidence: number;
    sampleSize: number;
    lastTrained: Date;
    features: string[];
    parameters: Map<string, number>;
}

export interface PredictionResult {
    modelId: string;
    gameId: string;
    marketType: MarketPeriod;
    prediction: {
        expectedValue: number;
        confidence: number;
        upperBound: number;
        lowerBound: number;
    };
    timestamp: Date;
    features: Map<string, number>;
}

// Game status enum
export type GameStatus =
    | 'scheduled'
    | 'pre-game'
    | 'in-progress'
    | 'halftime'
    | 'end-of-period'
    | 'final'
    | 'postponed'
    | 'cancelled';

// Helper functions
export function createEnhancedOddsTick(
    id: string,
    sport: string,
    gameId: string,
    event: string,
    marketType: MarketPeriod,
    exchange: string,
    line: number,
    juice: number,
    homeOdds: number,
    awayOdds: number
): EnhancedOddsTick {
    return {
        id,
        sport,
        gameId,
        event,
        timestamp: new Date(),
        marketType,
        exchange,
        bookmaker: exchange,
        isLive: false,
        line,
        juice,
        odds: {
            home: homeOdds,
            away: awayOdds
        },
        liquidity: LiquidityLevel.MEDIUM,
        volatility: VolatilityLevel.MEDIUM,
        sharp: false,
        confidence: 0.5,
        lineMovement: 0,
        lastUpdated: new Date(),
        source: 'manual',
        reliability: 0.8
    };
}


export function isLiveTick(tick: EnhancedOddsTick): boolean {
    return tick.isLive && tick.timeRemaining !== undefined && tick.timeRemaining > 0;
}

export function isPreGameTick(tick: EnhancedOddsTick): boolean {
    return !tick.isLive && tick.marketType === 'full-game';
}

export function getPeriodNumber(marketType: MarketPeriod): number {
    switch (marketType) {
        case 'first-quarter': return 1;
        case 'second-quarter': return 2;
        case 'third-quarter': return 3;
        case 'fourth-quarter': return 4;
        case 'first-half': return 1;
        case 'second-half': return 2;
        case 'overtime': return 5;
        default: return 0;
    }
}

export function calculateGameProgress(tick: EnhancedOddsTick): number {
    if (!tick.timeRemaining || !tick.gameProgress) return 0;

    const totalGameTime = getTotalGameTime(tick.sport);
    const elapsedTime = totalGameTime - tick.timeRemaining;

    return Math.min(1, Math.max(0, elapsedTime / totalGameTime));
}

function getTotalGameTime(sport: string): number {
    // Return total game time in seconds
    switch (sport.toLowerCase()) {
        case 'basketball':
        case 'nba':
            return 48 * 60; // 48 minutes
        case 'football':
        case 'nfl':
            return 60 * 60; // 60 minutes
        case 'baseball':
        case 'mlb':
            return 9 * 20 * 60; // 9 innings, ~20 minutes each
        case 'hockey':
        case 'nhl':
            return 60 * 60; // 60 minutes
        default:
            return 60 * 60; // Default to 60 minutes
    }
}

export function validateEnhancedOddsTick(tick: any): tick is EnhancedOddsTick {
    return tick &&
        typeof tick.id === 'string' &&
        typeof tick.sport === 'string' &&
        typeof tick.gameId === 'string' &&
        typeof tick.event === 'string' &&
        typeof tick.marketType === 'string' &&
        typeof tick.exchange === 'string' &&
        typeof tick.line === 'number' &&
        typeof tick.juice === 'number' &&
        tick.odds &&
        typeof tick.odds.home === 'number' &&
        typeof tick.odds.away === 'number' &&
        Object.values(LiquidityLevel).includes(tick.liquidity) &&
        Object.values(VolatilityLevel).includes(tick.volatility) &&
        typeof tick.sharp === 'boolean' &&
        typeof tick.confidence === 'number' &&
        Number.isFinite(tick.confidence) &&
        tick.confidence >= 0 &&
        tick.confidence <= 1 &&
        tick.timestamp instanceof Date;
}
