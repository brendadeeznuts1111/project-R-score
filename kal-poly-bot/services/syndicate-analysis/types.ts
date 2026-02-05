/**
 * Type Definitions for Syndicate Analysis System
 * 
 * Centralized type definitions and mappings for syndicate group analysis
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export type PatternType = 
  | 'betting_frequency'
  | 'game_selection'
  | 'bet_type_preference'
  | 'real_time_frequency'
  | 'real_time_game_selection'
  | 'team_loyalty'
  | 'late_night_betting'
  | 'large_volume_trader'
  | 'market_hours_trading'
  | 'correlated_trading'
  | 'high_risk_betting'
  | 'rapid_betting'
  | 'consistent_losing'
  | 'aggressive_betting'
  | 'high_risk_tolerance'
  | 'consistent_risk_profile';

export type PatternGrading = 'Critical' | 'High' | 'Medium' | 'Low';

export type PatternPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type PatternCategory = 'Analytical' | 'Real-Time' | 'Financial' | 'Fraud' | 'Competitive';

export type ContentType = 'Structured Data' | 'Time-series Data' | 'Streaming Data';

export type ProtocolType = 'N/A (Internal Logic)' | 'DB' | 'WebSocket' | 'HTTP' | 'File I/O';

export type BetResult = 'win' | 'loss' | 'push' | 'pending';

export type Platform = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'web' | 'unknown';

export type OS = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown';

export type BetType = 
  | 'moneyline'
  | 'spread'
  | 'total'
  | 'parlay'
  | 'teaser'
  | 'prop'
  | 'live'
  | 'futures';

// =============================================================================
// ENTITY TYPES
// =============================================================================

export interface SyndicateGroupMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

export interface SyndicateGroup {
  id: string;
  name: string;
  members: string[];
  membersCount: number;
  totalFunds: number;
  createdAt: number;
  updatedAt: number;
  metadata?: SyndicateGroupMetadata;
}

export interface SyndicateMember {
  id: string;
  syndicateId: string;
  memberId: string;
  memberName?: string;
  joinedAt: number;
  role: 'admin' | 'member' | 'viewer';
}

export interface SyndicateBet {
  id: string;
  syndicateId: string;
  game: string;
  betType: BetType;
  amount: number;
  odds: number;
  timestamp: number;
  result?: BetResult;
  platform?: Platform;
  os?: OS;
  userAgent?: string;
  ipAddress?: string;
}

export interface SyndicatePattern {
  id: number;
  syndicateId: string;
  patternType: PatternType;
  patternData: PatternData;
  strength: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
  lastSeen: number;
  createdAt: number;
  // Enhanced metadata
  grading?: PatternGrading;
  priority?: PatternPriority;
  category?: PatternCategory;
  contentType?: ContentType;
  protocolType?: ProtocolType;
}

export interface PatternData {
  // Betting Frequency Pattern
  frequency?: number; // bets per hour
  betsPerHour?: number;
  
  // Game Selection Pattern
  favoriteGame?: string;
  gameFrequency?: number; // 0.0 - 1.0
  gameCounts?: Record<string, number>;
  
  // Bet Type Preference Pattern
  preferredType?: BetType;
  typeFrequency?: number; // 0.0 - 1.0
  typeCounts?: Record<BetType, number>;
  
  // Real-time Patterns
  recentBets?: number;
  timeWindow?: number; // milliseconds
  
  // Additional metadata - use specific types instead of any
  [key: string]: string | number | boolean | null | undefined | Record<string, unknown> | unknown[];
}

export interface PlatformActivity {
  syndicateId: string;
  platform: Platform;
  os?: OS;
  activities: ActivityRecord[];
  totalBets: number;
  totalAmount: number;
  firstSeen: number;
  lastSeen: number;
}

export interface ActivityRecord {
  timestamp: number;
  amount: number;
  game: string;
  betType: BetType;
}

export interface EmergingPattern {
  patternKey: string;
  patternType: PatternType;
  data: PatternData;
  syndicates: Set<string>;
  syndicateCount: number;
  strength: number;
  confidence: number;
  lastSeen: number;
  firstSeen: number;
}

// =============================================================================
// ANALYSIS RESULT TYPES
// =============================================================================

export interface SyndicateStats {
  totalBets: number;
  totalAmount: number;
  winRate: number;
  averageBetSize: number;
  favoriteGame: string | null;
  preferredBetType: BetType | null;
  platformDistribution: Record<Platform, number>;
  osDistribution: Record<OS, number>;
}

export interface PatternAnalysis {
  patternType: PatternType;
  detected: boolean;
  strength: number;
  confidence: number;
  data: PatternData;
  recommendations?: string[];
  // Enhanced metadata
  grading?: PatternGrading;
  priority?: PatternPriority;
  category?: PatternCategory;
  contentType?: ContentType;
  protocolType?: ProtocolType;
}

export interface PatternMetadata {
  patternType: PatternType;
  domain: string;
  detectionMethod: string;
  typicalUseCase: string;
  confidenceRange: { min: number; max: number };
  grading: PatternGrading;
  priority: PatternPriority;
  category: PatternCategory;
  contentType: ContentType;
  protocolType: ProtocolType;
  description?: string;
  implementationNotes?: string;
}

export interface EdgeOpportunity {
  type: 'counter_syndicate' | 'value_opportunity' | 'platform_difference' | 'pattern_reversal';
  syndicateId: string;
  description: string;
  confidence: number;
  potentialValue: number;
  timestamp: number;
}

// =============================================================================
// DATABASE ROW TYPES (for mapping)
// =============================================================================

export interface SyndicateGroupRow {
  id: string;
  name: string;
  members_count: number;
  total_funds: number;
  created_at: number;
  updated_at: number;
  metadata?: string;
}

export interface SyndicateBetRow {
  id: string;
  syndicate_id: string;
  game: string;
  bet_type: string;
  amount: number;
  odds: number;
  timestamp: number;
  result?: string;
  platform?: string;
  os?: string;
  user_agent?: string;
  ip_address?: string;
}

export interface SyndicatePatternRow {
  id: number;
  syndicate_id: string;
  pattern_type: string;
  pattern_data: string; // JSON string
  strength: number;
  confidence: number;
  last_seen: number;
  created_at: number;
}

export interface PlatformActivityRow {
  id: number;
  syndicate_id: string;
  platform: string;
  os?: string;
  total_bets: number;
  total_amount: number;
  first_seen: number;
  last_seen: number;
}

export interface EmergingPatternRow {
  id: number;
  pattern_key: string;
  pattern_type: string;
  pattern_data: string; // JSON string
  syndicate_count: number;
  strength: number;
  confidence: number;
  first_seen: number;
  last_seen: number;
  is_active: number; // SQLite boolean (0 or 1)
}

// =============================================================================
// MAPPING FUNCTIONS
// =============================================================================

export const Mappers = {
  /**
   * Map database row to SyndicateGroup
   */
  toSyndicateGroup(row: SyndicateGroupRow, members: string[]): SyndicateGroup {
    return {
      id: row.id,
      name: row.name,
      members,
      membersCount: row.members_count,
      totalFunds: row.total_funds,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  },

  /**
   * Map SyndicateGroup to database parameters
   */
  fromSyndicateGroup(group: SyndicateGroup): [string, string, number, number, number, number] {
    return [
      group.id,
      group.name,
      group.membersCount,
      group.totalFunds,
      group.createdAt,
      group.updatedAt
    ];
  },

  /**
   * Map database row to SyndicateBet
   */
  toSyndicateBet(row: SyndicateBetRow): SyndicateBet {
    return {
      id: row.id,
      syndicateId: row.syndicate_id,
      game: row.game,
      betType: row.bet_type as BetType,
      amount: row.amount,
      odds: row.odds,
      timestamp: row.timestamp,
      result: row.result as BetResult | undefined,
      platform: row.platform as Platform | undefined,
      os: row.os as OS | undefined,
      userAgent: row.user_agent,
      ipAddress: row.ip_address
    };
  },

  /**
   * Map SyndicateBet to database parameters
   */
  fromSyndicateBet(bet: SyndicateBet): [string, string, string, string, number, number, number, string | null, string | null, string | null, string | null] {
    return [
      bet.id,
      bet.syndicateId,
      bet.game,
      bet.betType,
      bet.amount,
      bet.odds,
      bet.timestamp,
      bet.result || null,
      bet.platform || null,
      bet.os || null,
      bet.userAgent || null,
      bet.ipAddress || null
    ];
  },

  /**
   * Map database row to SyndicatePattern
   */
  toSyndicatePattern(row: SyndicatePatternRow): SyndicatePattern {
    return {
      id: row.id,
      syndicateId: row.syndicate_id,
      patternType: row.pattern_type as PatternType,
      patternData: JSON.parse(row.pattern_data) as PatternData,
      strength: row.strength,
      confidence: row.confidence,
      lastSeen: row.last_seen,
      createdAt: row.created_at
    };
  },

  /**
   * Map SyndicatePattern to database parameters
   */
  fromSyndicatePattern(pattern: Omit<SyndicatePattern, 'id'>): [string, string, string, number, number, number, number] {
    return [
      pattern.syndicateId,
      pattern.patternType,
      JSON.stringify(pattern.patternData),
      pattern.strength,
      pattern.confidence,
      pattern.lastSeen,
      pattern.createdAt
    ];
  },

  /**
   * Map database row to PlatformActivity
   */
  toPlatformActivity(row: PlatformActivityRow, activities: ActivityRecord[]): PlatformActivity {
    return {
      syndicateId: row.syndicate_id,
      platform: row.platform as Platform,
      os: row.os as OS | undefined,
      activities,
      totalBets: row.total_bets,
      totalAmount: row.total_amount,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen
    };
  },

  /**
   * Map PlatformActivity to database parameters
   */
  fromPlatformActivity(activity: PlatformActivity): [string, string, string | null, number, number, number, number] {
    return [
      activity.syndicateId,
      activity.platform,
      activity.os || null,
      activity.totalBets,
      activity.totalAmount,
      activity.firstSeen,
      activity.lastSeen
    ];
  },

  /**
   * Map database row to EmergingPattern
   */
  toEmergingPattern(row: EmergingPatternRow, syndicateIds: string[]): EmergingPattern {
    return {
      patternKey: row.pattern_key,
      patternType: row.pattern_type as PatternType,
      data: JSON.parse(row.pattern_data) as PatternData,
      syndicates: new Set(syndicateIds),
      syndicateCount: row.syndicate_count,
      strength: row.strength,
      confidence: row.confidence,
      lastSeen: row.last_seen,
      firstSeen: row.first_seen
    };
  },

  /**
   * Map EmergingPattern to database parameters
   */
  fromEmergingPattern(pattern: EmergingPattern): [string, string, string, number, number, number, number, number] {
    return [
      pattern.patternKey,
      pattern.patternType,
      JSON.stringify(pattern.data),
      pattern.syndicateCount,
      pattern.strength,
      pattern.confidence,
      pattern.firstSeen,
      pattern.lastSeen
    ];
  }
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export const Validators = {
  isValidPatternType(type: string): type is PatternType {
    return [
      'betting_frequency',
      'game_selection',
      'bet_type_preference',
      'real_time_frequency',
      'real_time_game_selection'
    ].includes(type);
  },

  isValidBetResult(result: string): result is BetResult {
    return ['win', 'loss', 'push', 'pending'].includes(result);
  },

  isValidPlatform(platform: string): platform is Platform {
    return ['windows', 'macos', 'linux', 'ios', 'android', 'web', 'unknown'].includes(platform);
  },

  isValidBetType(type: string): type is BetType {
    return [
      'moneyline',
      'spread',
      'total',
      'parlay',
      'teaser',
      'prop',
      'live',
      'futures'
    ].includes(type);
  },

  isValidStrength(value: number): boolean {
    return value >= 0 && value <= 1;
  },

  isValidConfidence(value: number): boolean {
    return value >= 0 && value <= 1;
  }
};
