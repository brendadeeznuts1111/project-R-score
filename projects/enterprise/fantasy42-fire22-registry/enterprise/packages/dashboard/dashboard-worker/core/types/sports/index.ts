/**
 * Sports Betting Types
 * Consolidated types for all sports betting functionality
 */

import type { BaseEntity, RiskLevel, VIPTier, Status } from '../shared/common';

export type SportType =
  | 'football'
  | 'basketball'
  | 'baseball'
  | 'soccer'
  | 'tennis'
  | 'golf'
  | 'racing'
  | 'esports'
  | 'other';

export type LeagueType =
  | 'NFL'
  | 'NBA'
  | 'MLB'
  | 'NHL'
  | 'EPL'
  | 'La Liga'
  | 'Serie A'
  | 'Bundesliga'
  | 'Champions League'
  | 'ATP'
  | 'WTA'
  | 'PGA'
  | 'Formula 1'
  | 'NASCAR'
  | 'other';

export type EventStatus =
  | 'scheduled'
  | 'live'
  | 'completed'
  | 'cancelled'
  | 'postponed'
  | 'suspended';

export type BetType =
  | 'moneyline'
  | 'spread'
  | 'over_under'
  | 'parlay'
  | 'teaser'
  | 'futures'
  | 'live_bet'
  | 'special'
  | 'prop_bet';

export type BetStatus = 'pending' | 'active' | 'won' | 'lost' | 'cancelled' | 'void' | 'pushed';

export interface SportsEvent extends BaseEntity {
  name: string;
  sport: SportType;
  league: LeagueType;
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  endTime?: Date;
  status: EventStatus;
  odds: SportsOdds;
  riskLevel: RiskLevel;
  vipAccess: VIPTier[];
  liveData?: LiveEventData;
  weather?: WeatherData;
  venue?: VenueData;
  officials?: string[];
  attendance?: number;
  score?: EventScore;
}

export interface SportsOdds {
  id: string;
  eventId: string;
  moneyline: MoneylineOdds;
  spread?: SpreadOdds;
  overUnder?: OverUnderOdds;
  specialBets: SpecialBet[];
  lastUpdated: Date;
  source: string;
  confidence: number; // 0-100
  movement: OddsMovement[];
}

export interface MoneylineOdds {
  homeWin: number;
  awayWin: number;
  draw?: number; // For sports that allow draws
}

export interface SpreadOdds {
  homeSpread: number;
  homeOdds: number;
  awaySpread: number;
  awayOdds: number;
}

export interface OverUnderOdds {
  total: number;
  overOdds: number;
  underOdds: number;
}

export interface SpecialBet {
  id: string;
  name: string;
  description: string;
  category: string; // player_props, team_props, game_props
  odds: number;
  riskLevel: RiskLevel;
  maxBet: number;
  minBet: number;
  isLive: boolean;
  conditions?: string[];
}

export interface OddsMovement {
  timestamp: Date;
  moneyline?: MoneylineOdds;
  spread?: SpreadOdds;
  overUnder?: OverUnderOdds;
  volume: number;
  reason?: string;
}

export interface LiveEventData {
  currentQuarter?: number;
  currentPeriod?: string;
  timeRemaining?: string;
  possession?: 'home' | 'away' | 'neutral';
  down?: number; // Football specific
  yardsToGo?: number; // Football specific
  lastPlay?: string;
  nextPlay?: string;
}

export interface WeatherData {
  temperature: number; // Fahrenheit
  humidity: number; // Percentage
  windSpeed: number; // MPH
  windDirection: string;
  precipitation: number; // Inches
  conditions: string;
  impact: 'none' | 'minor' | 'moderate' | 'major';
}

export interface VenueData {
  name: string;
  city: string;
  state?: string;
  country: string;
  capacity: number;
  surface: string;
  roof: 'open' | 'closed' | 'retractable';
  timezone: string;
}

export interface EventScore {
  homeScore: number;
  awayScore: number;
  homePeriods: number[];
  awayPeriods: number[];
  isFinal: boolean;
  overtime?: boolean;
  winner?: 'home' | 'away' | 'tie';
}

export interface SportsBet extends BaseEntity {
  eventId: string;
  playerId: string;
  agentId: string;
  betType: BetType;
  selection: string;
  odds: number;
  stake: number;
  potentialWin: number;
  actualWin?: number;
  riskLevel: RiskLevel;
  vipTier: VIPTier;
  status: BetStatus;
  placedAt: Date;
  settledAt?: Date;
  settledBy?: string;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  parlayBets?: ParlayLeg[];
  teaserBets?: TeaserLeg[];
  specialConditions?: string[];
}

export interface ParlayLeg {
  eventId: string;
  selection: string;
  odds: number;
  status: 'pending' | 'won' | 'lost';
}

export interface TeaserLeg {
  eventId: string;
  selection: string;
  adjustedLine: number;
  originalLine: number;
  points: number;
}

export interface SportsRate extends BaseEntity {
  agentId: string;
  sport: SportType;
  betType: BetType;
  baseRate: number;
  adjustedRate: number;
  adjustmentFactor: number;
  riskMultiplier: number;
  vipMultiplier: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  conditions?: string[];
  overrides?: RateOverride[];
}

export interface RateOverride {
  condition: string;
  adjustment: number;
  priority: number;
}

export interface RiskAssessment extends BaseEntity {
  playerId: string;
  agentId: string;
  overallRisk: RiskLevel;
  riskScore: number; // 0-100
  factors: RiskFactor[];
  recommendations: string[];
  lastUpdated: Date;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface RiskFactor {
  category: 'betting_history' | 'financial' | 'behavioral' | 'external';
  factor: string;
  weight: number; // 0-1
  score: number; // 0-100
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  data?: Record<string, any>;
}

export interface VIPProfile extends BaseEntity {
  playerId: string;
  agentId: string;
  currentTier: VIPTier;
  points: number;
  lifetimeVolume: number;
  monthlyVolume: number;
  joinDate: Date;
  lastActivity: Date;
  benefits: VIPBenefits;
  requirements: VIPRequirements;
  achievements: VIPAchievement[];
  preferences: VIPPreferences;
}

export interface VIPRequirements {
  minVolume: number;
  minPoints: number;
  minGames: number;
  tenureDays: number;
  winRate?: number;
  additionalCriteria?: string[];
}

export interface VIPBenefits {
  maxBetLimit: number;
  bonusPercentage: number;
  freeBets: number;
  prioritySupport: boolean;
  exclusiveEvents: boolean;
  customOdds: boolean;
  monthlyBonus: number;
  specialFeatures: string[];
}

export interface VIPAchievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: Date;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface VIPPreferences {
  notifications: {
    promotions: boolean;
    results: boolean;
    achievements: boolean;
    tierUpgrades: boolean;
  };
  communication: {
    email: boolean;
    sms: boolean;
    push: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
  };
  betting: {
    autoAccept: boolean;
    maxAutoBet: number;
    preferredSports: SportType[];
    riskTolerance: RiskLevel;
  };
}

export interface WinningCalculation extends BaseEntity {
  betId: string;
  playerId: string;
  eventId: string;
  stake: number;
  odds: number;
  potentialWin: number;
  actualWin: number;
  calculationMethod: string;
  factors: CalculationFactor[];
  taxAmount?: number;
  netWin: number;
  payoutDate?: Date;
  payoutMethod?: string;
  status: 'calculated' | 'pending' | 'paid' | 'cancelled';
}

export interface CalculationFactor {
  type: 'stake' | 'odds' | 'parlay_bonus' | 'vip_bonus' | 'house_edge' | 'tax' | 'adjustment';
  value: number;
  description: string;
  applied: boolean;
}

export interface BettingLimits {
  id: string;
  playerId: string;
  agentId: string;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  maxBetAmount: number;
  maxParlayLegs: number;
  restrictedBetTypes: BetType[];
  restrictedSports: SportType[];
  timeRestrictions: TimeRestriction[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeRestriction {
  dayOfWeek: number; // 0-6, Sunday = 0
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  restrictionType: 'no_betting' | 'reduced_limits' | 'vip_only';
}

export interface BettingStats {
  playerId: string;
  totalBets: number;
  totalVolume: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  averageBet: number;
  biggestWin: number;
  biggestLoss: number;
  currentStreak: number;
  bestStreak: number;
  favoriteSport: SportType;
  favoriteBetType: BetType;
  monthlyStats: MonthlyStats[];
}

export interface MonthlyStats {
  year: number;
  month: number;
  bets: number;
  volume: number;
  wins: number;
  losses: number;
  winRate: number;
  profit: number;
}

export interface LiveBettingSession {
  id: string;
  playerId: string;
  eventId: string;
  startTime: Date;
  endTime?: Date;
  totalBets: number;
  totalVolume: number;
  totalWins: number;
  totalLosses: number;
  netResult: number;
  isActive: boolean;
  betHistory: LiveBet[];
}

export interface LiveBet {
  id: string;
  timestamp: Date;
  betType: BetType;
  selection: string;
  stake: number;
  odds: number;
  result: 'won' | 'lost' | 'pending';
  winAmount?: number;
}

// Export types for TypeScript modules
export type SportsEventCreate = Omit<SportsEvent, keyof BaseEntity>;
export type SportsEventUpdate = Partial<SportsEventCreate>;
export type SportsBetCreate = Omit<SportsBet, keyof BaseEntity>;
export type SportsBetUpdate = Partial<SportsBetCreate>;
export type RiskAssessmentCreate = Omit<RiskAssessment, keyof BaseEntity>;
export type RiskAssessmentUpdate = Partial<RiskAssessmentCreate>;
export type VIPProfileCreate = Omit<VIPProfile, keyof BaseEntity>;
export type VIPProfileUpdate = Partial<VIPProfileCreate>;
