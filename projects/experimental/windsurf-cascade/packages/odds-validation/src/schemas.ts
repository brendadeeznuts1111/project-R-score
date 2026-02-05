import { z } from 'zod';

// Odds Tick Schema
export const OddsTickSchema = z.object({
  id: z.string().min(1),
  timestamp: z.number().int().positive(),
  symbol: z.string().min(1).max(20),
  price: z.number().positive(),
  size: z.number().positive(),
  exchange: z.string().min(1).max(20),
  side: z.enum(['buy', 'sell']),
  sequence: z.number().int().nonnegative().optional()
});

// Market Data Schema
export const MarketDataSchema = z.object({
  symbol: z.string().min(1),
  bids: z.array(z.tuple([
    z.number().positive(),
    z.number().positive()
  ])).min(1),
  asks: z.array(z.tuple([
    z.number().positive(),
    z.number().positive()
  ])).min(1),
  timestamp: z.number().int().positive(),
  sequence: z.number().int().nonnegative()
});

// Arbitrage Opportunity Schema
export const ArbitrageOpportunitySchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1),
  exchange1: z.string().min(1),
  exchange2: z.string().min(1),
  price1: z.number().positive(),
  price2: z.number().positive(),
  profit: z.number(),
  confidence: z.number().min(0).max(1),
  timestamp: z.number().int().positive()
});

// Sharp Detection Result Schema
export const SharpDetectionResultSchema = z.object({
  symbol: z.string().min(1),
  isSharp: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  timestamp: z.number().int().positive()
});

// WebSocket Message Schema
export const WebSocketMessageSchema = z.object({
  type: z.string().min(1),
  data: z.unknown(),
  timestamp: z.number().int().positive(),
  sequence: z.number().int().nonnegative()
});

// Market Hours Schema
export const MarketHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  timezone: z.string().min(1),
  days: z.array(z.number().min(1).max(7)).min(1)
});

// Portfolio Schema
export const PortfolioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  positions: z.array(z.object({
    symbol: z.string().min(1),
    size: z.number(),
    avgPrice: z.number().positive(),
    currentPrice: z.number().positive(),
    pnl: z.number(),
    timestamp: z.number().int().positive()
  })),
  totalValue: z.number().positive(),
  totalPnL: z.number(),
  timestamp: z.number().int().positive()
});

// Order Schema
export const OrderSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit', 'stop']),
  size: z.number().positive(),
  price: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  timeInForce: z.enum(['IOC', 'FOK', 'GTC', 'DAY']).default('GTC'),
  status: z.enum(['pending', 'filled', 'cancelled', 'rejected']).default('pending'),
  timestamp: z.number().int().positive(),
  filledSize: z.number().nonnegative().default(0),
  avgFillPrice: z.number().positive().optional(),
  fees: z.number().nonnegative().default(0)
});

// Risk Metrics Schema
export const RiskMetricsSchema = z.object({
  portfolioId: z.string().min(1),
  totalExposure: z.number(),
  maxDrawdown: z.number().nonnegative(),
  var95: z.number().nonnegative(), // Value at Risk 95%
  var99: z.number().nonnegative(), // Value at Risk 99%
  sharpeRatio: z.number(),
  sortinoRatio: z.number(),
  beta: z.number(),
  alpha: z.number(),
  volatility: z.number().nonnegative(),
  timestamp: z.number().int().positive()
});

// Strategy Configuration Schema
export const StrategyConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['arbitrage', 'market_making', 'trend_following', 'mean_reversion']),
  enabled: z.boolean().default(true),
  parameters: z.record(z.unknown()),
  riskLimits: z.object({
    maxPositionSize: z.number().positive(),
    maxDailyLoss: z.number().nonnegative(),
    maxDrawdown: z.number().nonnegative()
  }),
  symbols: z.array(z.string().min(1)).min(1),
  exchanges: z.array(z.string().min(1)).min(1),
  timestamp: z.number().int().positive()
});

// Export types
export type OddsTick = z.infer<typeof OddsTickSchema>;
export type MarketData = z.infer<typeof MarketDataSchema>;
export type ArbitrageOpportunity = z.infer<typeof ArbitrageOpportunitySchema>;
export type SharpDetectionResult = z.infer<typeof SharpDetectionResultSchema>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
export type MarketHours = z.infer<typeof MarketHoursSchema>;
export type Portfolio = z.infer<typeof PortfolioSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type RiskMetrics = z.infer<typeof RiskMetricsSchema>;
export type StrategyConfig = z.infer<typeof StrategyConfigSchema>;
