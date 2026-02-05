// Data validation schemas and utilities

import { z } from 'zod';
import type { OddsTick, ArbitrageOpportunity, Sport, MarketType, Exchange } from './types.js';
import { SPORTS_CONFIG, EXCHANGE_CONFIG } from './constants.js';

// Zod schemas for runtime validation
export const OddsTickSchema = z.object({
  id: z.string().uuid(),
  sport: z.enum(['nba', 'nfl', 'premier-league', 'mlb', 'nhl', 'tennis', 'mma']),
  gameId: z.string().uuid(),
  marketType: z.enum(['main-totals', 'player-totals', 'alternates', 'derivatives', 'moneyline', 'spreads']),
  exchange: z.enum(['draftkings', 'fanduel', 'mgm', 'pointsbet', 'caesars', 'bet365', 'williamhill']),
  line: z.number().min(-1000).max(1000),
  juice: z.number().min(-1000).max(1000),
  timestamp: z.date(),
  volume: z.number().min(0).optional(),
  sharp: z.boolean().optional(),
  period: z.enum(['full-game', 'first-half', 'second-half', 'first-quarter', 'second-quarter', 'third-quarter', 'fourth-quarter', 'overtime']).optional(),
  playerId: z.string().uuid().optional(),
  team: z.string().optional(),
});

export const ArbitrageOpportunitySchema = z.object({
  id: z.string().uuid(),
  exchangeA: z.string(),
  exchangeB: z.string(),
  lineA: z.number(),
  lineB: z.number(),
  juiceA: z.number(),
  juiceB: z.number(),
  edge: z.number().min(0).max(1),
  kellyFraction: z.number().min(0).max(1),
  timestamp: z.date(),
  expiry: z.date(),
  sport: z.string(),
  gameId: z.string().uuid(),
  marketType: z.string(),
});

export const SharpSignalSchema = z.object({
  isSharp: z.boolean(),
  confidence: z.number().min(0).max(1),
  features: z.object({
    reverseLineMovement: z.number(),
    volumeImbalance: z.number(),
    velocity: z.number(),
    anomalyScore: z.number(),
  }),
  triggers: z.array(z.string()),
  timestamp: z.date(),
});

/**
 * Validate an odds tick with detailed error reporting
 */
export function validateOddsTick(data: unknown): { success: true; data: OddsTick } | { success: false; errors: string[] } {
  try {
    const result = OddsTickSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
      };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validate arbitrage opportunity
 */
export function validateArbitrageOpportunity(data: unknown): ArbitrageOpportunity {
  return ArbitrageOpportunitySchema.parse(data);
}

/**
 * Validate sport and exchange compatibility
 */
export function validateSportExchange(sport: Sport, exchange: Exchange): boolean {
  const config = EXCHANGE_CONFIG[exchange];
  return config.supportedSports.includes(sport as any);
}

/**
 * Validate timestamp is within reasonable bounds
 */
export function validateTimestamp(timestamp: Date, maxAgeMs: number = 300000): boolean {
  const now = Date.now();
  const tickTime = timestamp.getTime();
  return tickTime <= now && (now - tickTime) <= maxAgeMs;
}

// Type guards for runtime type checking
export function isOddsTick(data: unknown): data is OddsTick {
  return OddsTickSchema.safeParse(data).success;
}

export function isArbitrageOpportunity(data: unknown): data is ArbitrageOpportunity {
  return ArbitrageOpportunitySchema.safeParse(data).success;
}

export function isSharpSignal(data: unknown): data is ArbitrageOpportunity {
  return SharpSignalSchema.safeParse(data).success;
}
