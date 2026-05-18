/**
 * 🎯 Fantasy42 Betting Engine - Core Types
 * Comprehensive type definitions for sports betting operations
 */

import { z } from 'zod';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum SportType {
  NFL = 'NFL',
  NBA = 'NBA',
  MLB = 'MLB',
  NHL = 'NHL',
  SOCCER = 'SOCCER',
  TENNIS = 'TENNIS',
  GOLF = 'GOLF',
  BOXING = 'BOXING',
  MMA = 'MMA',
}

export enum BetType {
  MONEYLINE = 'MONEYLINE', // Win/Loss
  SPREAD = 'SPREAD', // Point spread
  TOTAL = 'TOTAL', // Over/Under
  PARLAY = 'PARLAY', // Multiple bets combined
  TEASER = 'TEASER', // Adjusted spread
  FUTURES = 'FUTURES', // Future outcomes
  PROP = 'PROP', // Proposition bets
}

export enum BetOutcome {
  WIN = 'WIN',
  LOSS = 'LOSS',
  PUSH = 'PUSH', // Tie/No action
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
}

export enum OddsFormat {
  AMERICAN = 'AMERICAN', // +150, -200
  DECIMAL = 'DECIMAL', // 2.50, 1.80
  FRACTIONAL = 'FRACTIONAL', // 3/2, 4/5
}

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface Player {
  id: string;
  name: string;
  team: string;
  position?: string;
  jerseyNumber?: number;
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  conference?: string;
  division?: string;
  colors?: {
    primary: string;
    secondary: string;
  };
}

export interface Game {
  id: string;
  sport: SportType;
  homeTeam: Team;
  awayTeam: Team;
  scheduledTime: Date;
  venue?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';
  score?: {
    home: number;
    away: number;
    period?: string;
  };
  odds?: GameOdds;
}

export interface Odds {
  american: number;
  decimal: number;
  fractional: string;
  impliedProbability: number;
}

export interface GameOdds {
  moneyline: {
    home: Odds;
    away: Odds;
  };
  spread: {
    home: Odds;
    away: Odds;
    points: number;
  };
  total: {
    over: Odds;
    under: Odds;
    points: number;
  };
  lastUpdated: Date;
  sportsbook: string;
}

export interface Bet {
  id: string;
  userId: string;
  gameId: string;
  type: BetType;
  amount: number;
  odds: Odds;
  selection: string; // e.g., "home", "away", "over", "under"
  potentialPayout: number;
  status: BetOutcome;
  placedAt: Date;
  settledAt?: Date;
  metadata?: Record<string, any>;
}

export interface ParlayBet extends Bet {
  legs: BetLeg[];
  parlayOdds: Odds;
}

export interface BetLeg {
  gameId: string;
  selection: string;
  odds: Odds;
}

export interface WagerValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskScore: number;
}

export interface BettingLimits {
  maxBetAmount: number;
  minBetAmount: number;
  maxPayoutAmount: number;
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
}

// ============================================================================
// SPORTS-SPECIFIC TYPES
// ============================================================================

export interface NFLGame extends Game {
  sport: SportType.NFL;
  quarter?: number;
  timeRemaining?: string;
  possession?: string;
}

export interface NBAGame extends Game {
  sport: SportType.NBA;
  quarter?: number;
  timeRemaining?: string;
}

export interface MLBGame extends Game {
  sport: SportType.MLB;
  inning?: number;
  outs?: number;
  balls?: number;
  strikes?: number;
}

export interface NHLGame extends Game {
  sport: SportType.NHL;
  period?: number;
  timeRemaining?: string;
}

export interface SoccerGame extends Game {
  sport: SportType.SOCCER;
  minute?: number;
  period?: 'FIRST_HALF' | 'SECOND_HALF' | 'EXTRA_TIME' | 'PENALTIES';
}

// ============================================================================
// VALIDATION SCHEMAS (ZOD)
// ============================================================================

export const OddsSchema = z.object({
  american: z.number(),
  decimal: z.number().positive(),
  fractional: z.string(),
  impliedProbability: z.number().min(0).max(1),
});

export const BetSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  gameId: z.string().uuid(),
  type: z.nativeEnum(BetType),
  amount: z.number().positive(),
  odds: OddsSchema,
  selection: z.string(),
  potentialPayout: z.number().positive(),
  status: z.nativeEnum(BetOutcome),
  placedAt: z.date(),
  settledAt: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

export const WagerValidationSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  riskScore: z.number().min(0).max(100),
});

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type OddsFormatType = keyof typeof OddsFormat;
export type SportTypeKeys = keyof typeof SportType;
export type BetTypeKeys = keyof typeof BetType;
export type BetOutcomeKeys = keyof typeof BetOutcome;

// Type guards
export const isNFLGame = (game: Game): game is NFLGame => game.sport === SportType.NFL;
export const isNBAGame = (game: Game): game is NBAGame => game.sport === SportType.NBA;
export const isMLBGame = (game: Game): game is MLBGame => game.sport === SportType.MLB;
export const isNHLGame = (game: Game): game is NHLGame => game.sport === SportType.NHL;
export const isSoccerGame = (game: Game): game is SoccerGame => game.sport === SportType.SOCCER;

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface BettingEngineConfig {
  defaultOddsFormat: OddsFormat;
  supportedSports: SportType[];
  maxParlayLegs: number;
  minBetAmount: number;
  maxBetAmount: number;
  vigPercentage: number; // House edge
  timezone: string;
  enableRiskManagement: boolean;
  enableFraudDetection: boolean;
  complianceLevel: 'basic' | 'standard' | 'enterprise';
}

export interface SportsbookConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  supportedSports: SportType[];
  rateLimit: {
    requests: number;
    period: number; // in seconds
  };
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface BettingEvent {
  type: 'bet_placed' | 'bet_settled' | 'odds_updated' | 'game_started' | 'game_completed';
  timestamp: Date;
  data: Record<string, any>;
}

export interface OddsUpdateEvent extends BettingEvent {
  type: 'odds_updated';
  data: {
    gameId: string;
    sportsbook: string;
    oldOdds: GameOdds;
    newOdds: GameOdds;
  };
}

export interface BetSettlementEvent extends BettingEvent {
  type: 'bet_settled';
  data: {
    betId: string;
    userId: string;
    outcome: BetOutcome;
    payout: number;
    reason?: string;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class BettingEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'BettingEngineError';
  }
}

export class OddsValidationError extends BettingEngineError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'ODDS_VALIDATION_ERROR', details);
    this.name = 'OddsValidationError';
  }
}

export class BetValidationError extends BettingEngineError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'BET_VALIDATION_ERROR', details);
    this.name = 'BetValidationError';
  }
}

export class ComplianceError extends BettingEngineError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'COMPLIANCE_ERROR', details);
    this.name = 'ComplianceError';
  }
}
