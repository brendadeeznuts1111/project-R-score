/**
 * Sports Core Types
 * Core types and interfaces for sports betting system
 */

import type {
  SportsEvent,
  SportsBet,
  SportsOdds,
  RiskAssessment,
  VIPProfile,
  SportsRate,
  WinningCalculation,
  BetType,
  SportType,
  LeagueType,
  EventStatus,
  BetStatus,
  RiskLevel,
  VIPTier,
} from '../../../core/types/sports';

// Re-export all sports types for convenience
export type {
  SportsEvent,
  SportsBet,
  SportsOdds,
  RiskAssessment,
  VIPProfile,
  SportsRate,
  WinningCalculation,
  BetType,
  SportType,
  LeagueType,
  EventStatus,
  BetStatus,
  RiskLevel,
  VIPTier,
} from '../../../core/types/sports';

// Additional core types specific to the sports module
export interface SportsConfig {
  supportedSports: SportType[];
  supportedLeagues: LeagueType[];
  defaultRiskLevel: RiskLevel;
  maxBetLimits: Record<VIPTier, number>;
  minBetAmounts: Record<SportType, number>;
  houseEdge: Record<BetType, number>;
  liveBettingDelay: number; // seconds
  oddsUpdateInterval: number; // seconds
  maxParlayLegs: number;
  teaserPoints: Record<SportType, number[]>;
  settlementDelay: number; // hours
}

export interface SportsSystemStats {
  totalEvents: number;
  activeEvents: number;
  totalBets: number;
  pendingBets: number;
  settledBets: number;
  totalVolume: number;
  houseProfit: number;
  winRate: number;
  popularSports: Array<{
    sport: SportType;
    eventCount: number;
    betCount: number;
    volume: number;
  }>;
  topLeagues: Array<{
    league: LeagueType;
    eventCount: number;
    betCount: number;
    volume: number;
  }>;
}

export interface SportsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface SportsCalculationContext {
  bet: SportsBet;
  event: SportsEvent;
  playerVIP?: VIPProfile;
  riskAssessment?: RiskAssessment;
  applicableRates: SportsRate[];
  marketConditions: MarketCondition;
}

export interface MarketCondition {
  volatility: number; // 0-100
  liquidity: number; // 0-100
  confidence: number; // 0-100
  trend: 'bullish' | 'bearish' | 'neutral';
  factors: MarketFactor[];
}

export interface MarketFactor {
  type: 'news' | 'injury' | 'weather' | 'momentum' | 'public_sentiment';
  impact: 'positive' | 'negative' | 'neutral';
  strength: number; // 0-100
  description: string;
  source?: string;
  timestamp: Date;
}

export interface SportsSystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    oddsFeed: ComponentHealth;
    betProcessing: ComponentHealth;
    settlement: ComponentHealth;
    riskEngine: ComponentHealth;
    vipSystem: ComponentHealth;
  };
  lastUpdated: Date;
  issues: string[];
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  details?: Record<string, any>;
}

export interface SportsPerformanceMetrics {
  oddsAccuracy: number; // Percentage of accurate odds predictions
  settlementSpeed: number; // Average time to settle bets (hours)
  customerSatisfaction: number; // Based on feedback/ratings
  systemUptime: number; // Percentage
  betProcessingLatency: number; // Milliseconds
  cacheHitRate: number; // Percentage
  errorRate: number; // Percentage
  revenuePerBet: number; // Average revenue per bet
}

export interface SportsAuditLog {
  id: string;
  timestamp: Date;
  action: string;
  entityType: 'event' | 'bet' | 'odds' | 'settlement' | 'risk' | 'vip';
  entityId: string;
  userId: string;
  changes: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Utility types for internal use
export type EventFilter = {
  sport?: SportType;
  league?: LeagueType;
  status?: EventStatus;
  vipTier?: VIPTier;
  riskLevel?: RiskLevel;
  dateRange?: {
    start: Date;
    end: Date;
  };
};

export type BetFilter = {
  playerId?: string;
  agentId?: string;
  eventId?: string;
  betType?: BetType;
  status?: BetStatus;
  riskLevel?: RiskLevel;
  vipTier?: VIPTier;
  dateRange?: {
    start: Date;
    end: Date;
  };
  amountRange?: {
    min: number;
    max: number;
  };
};

export type SettlementRequest = {
  betId: string;
  result: 'won' | 'lost' | 'void' | 'pushed';
  finalScore?: {
    home: number;
    away: number;
  };
  actualOdds?: number;
  notes?: string;
  reviewedBy: string;
};

export type OddsUpdateRequest = {
  eventId: string;
  odds: Partial<SportsOdds>;
  reason: string;
  source: string;
  confidence?: number;
  force?: boolean; // Override automatic updates
};

// Export default configuration
export const DEFAULT_SPORTS_CONFIG: SportsConfig = {
  supportedSports: [
    'football',
    'basketball',
    'baseball',
    'soccer',
    'tennis',
    'golf',
    'racing',
    'esports',
  ],
  supportedLeagues: [
    'NFL',
    'NBA',
    'MLB',
    'NHL',
    'EPL',
    'La Liga',
    'Serie A',
    'Bundesliga',
    'Champions League',
    'ATP',
    'WTA',
    'PGA',
    'Formula 1',
    'NASCAR',
  ],
  defaultRiskLevel: 'medium',
  maxBetLimits: {
    bronze: 1000,
    silver: 2500,
    gold: 5000,
    platinum: 10000,
    diamond: 25000,
  },
  minBetAmounts: {
    football: 10,
    basketball: 10,
    baseball: 10,
    soccer: 10,
    tennis: 10,
    golf: 25,
    racing: 20,
    esports: 5,
    other: 10,
  },
  houseEdge: {
    moneyline: 0.05,
    spread: 0.1,
    over_under: 0.1,
    parlay: 0.15,
    teaser: 0.12,
    futures: 0.08,
    live_bet: 0.12,
    special: 0.2,
    prop_bet: 0.25,
  },
  liveBettingDelay: 15, // seconds
  oddsUpdateInterval: 30, // seconds
  maxParlayLegs: 10,
  teaserPoints: {
    football: [6, 6.5, 7],
    basketball: [4, 4.5, 5],
    baseball: [1.5, 2],
    soccer: [0.5, 1, 1.5],
    tennis: [3.5, 4, 4.5],
    golf: [2.5, 3, 3.5],
    racing: [1, 1.5, 2],
    esports: [1, 1.5, 2],
    other: [1, 1.5, 2],
  },
  settlementDelay: 24, // hours
};
