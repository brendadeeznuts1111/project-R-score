/**
 * 🏈 Fire22 Platform - Comprehensive Entity Type Definitions
 * Complete Fire22 sportsbook platform entity interfaces with business logic
 */

import type { BaseEntity, AuditableEntity } from '../database/base';

// !== CORE FIRE22 CUSTOMER ENTITIES !==

export type CustomerTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'vip';
export type CustomerStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'banned' | 'closed';
export type KYCStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'not_required';

export interface Fire22Customer extends AuditableEntity {
  // Core identifiers
  fire22_customer_id: string;
  agent_id: string;
  parent_agent?: string;
  master_agent?: string;
  login: string;

  // Customer classification
  tier: CustomerTier;
  status: CustomerStatus;
  vip_status: boolean;

  // Financial information
  balance: number;
  casino_balance: number;
  sports_balance: number;
  freeplay_balance: number;
  freeplay_pending_balance: number;
  freeplay_pending_count: number;
  credit_limit: number;

  // Lifetime statistics
  total_deposits: number;
  total_withdrawals: number;
  lifetime_volume: number;
  net_loss: number;
  total_bets_placed: number;
  total_bets_won: number;

  // Activity tracking
  last_activity: string;
  last_login: string;
  login_count: number;
  session_count: number;

  // Risk and compliance
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  kyc_status: KYCStatus;
  kyc_documents: string; // JSON array of document types
  aml_status: 'clear' | 'flagged' | 'under_review';

  // Betting preferences and limits
  betting_limits: string; // JSON object with sport-specific limits
  favorite_sports: string; // JSON array of preferred sports
  betting_patterns: string; // JSON object with betting behavior analysis

  // Personal information
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  country?: string;
  state?: string;
  city?: string;
  postal_code?: string;

  // Preferences and settings
  preferences: string; // JSON object for UI preferences
  notifications_enabled: boolean;
  marketing_opt_in: boolean;
  language_preference: string;
  timezone: string;

  // System tracking
  fire22_synced_at: string;
  sync_version: number;
  notes?: string;
}

// !== FIRE22 AGENT ENTITIES !==

export type AgentType = 'agent' | 'sub_agent' | 'master_agent' | 'super_agent';
export type AgentStatus = 'active' | 'inactive' | 'suspended' | 'terminated';

export interface Fire22Agent extends AuditableEntity {
  // Core identifiers
  agent_id: string;
  agent_login: string;
  agent_name: string;
  agent_type: AgentType;

  // Hierarchy
  parent_agent?: string;
  master_agent?: string;
  level: number;
  territory?: string;

  // Performance metrics
  commission_rate: number;
  total_customers: number;
  active_customers: number;
  total_volume: number;
  total_commission: number;
  performance_score: number;

  // Permissions and access
  permissions: string; // JSON object with permission flags
  access_level: number;
  allowed_sports: string; // JSON array of accessible sports
  max_bet_limit: number;
  max_payout_limit: number;

  // Contact information
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  emergency_contact?: string;

  // Specializations
  specializations: string; // JSON array of specialization areas
  languages_spoken: string; // JSON array of languages

  // Activity tracking
  last_login?: string;
  login_count: number;
  session_count: number;

  // Financial
  commission_balance: number;
  pending_commission: number;
  total_paid_commission: number;

  // Status
  status: AgentStatus;
  termination_reason?: string;
  termination_date?: string;
}

// !== FIRE22 TRANSACTION ENTITIES !==

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'bet_placement'
  | 'bet_settlement'
  | 'adjustment'
  | 'bonus'
  | 'freeplay'
  | 'commission'
  | 'transfer'
  | 'refund'
  | 'void';
export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'voided';
export type PaymentMethod =
  | 'credit_card'
  | 'bank_transfer'
  | 'crypto'
  | 'ewallet'
  | 'check'
  | 'cash';

export interface Fire22Transaction extends AuditableEntity {
  // Core identifiers
  transaction_id: string;
  fire22_customer_id: string;
  agent_id: string;

  // Transaction details
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;

  // Financial codes
  tran_code?: string;
  document_number?: string;
  reference_number?: string;

  // Processing information
  entered_by?: string;
  approved_by?: string;
  processed_by?: string;

  // Payment details
  payment_method?: PaymentMethod;
  payment_processor?: string;
  external_transaction_id?: string;

  // Balances after transaction
  balance_after: number;
  casino_balance_after: number;
  sports_balance_after: number;
  freeplay_balance_after: number;

  // Metadata
  grade_num?: number;
  short_desc?: string;
  long_desc?: string;
  transaction_notes?: string;

  // Timing
  transaction_datetime: string;
  processed_datetime?: string;
  settlement_datetime?: string;

  // Related entities
  related_bet_id?: string;
  related_bonus_id?: string;
  parent_transaction_id?: string;

  // Risk and compliance
  risk_score?: number;
  flagged_for_review: boolean;
  compliance_notes?: string;
}

// !== FIRE22 BET ENTITIES !==

export type BetType = 'straight' | 'parlay' | 'teaser' | 'round_robin' | 'prop' | 'live' | 'future';
export type BetStatus = 'pending' | 'won' | 'lost' | 'push' | 'voided' | 'cancelled' | 'graded';
export type SportType =
  | 'football'
  | 'basketball'
  | 'baseball'
  | 'hockey'
  | 'soccer'
  | 'tennis'
  | 'golf'
  | 'boxing'
  | 'mma'
  | 'horse_racing'
  | 'auto_racing'
  | 'esports'
  | 'other';

export interface Fire22Bet extends AuditableEntity {
  // Core identifiers
  bet_id: string;
  ticket_number: string;
  fire22_customer_id: string;
  agent_id: string;

  // Bet details
  type: BetType;
  status: BetStatus;
  sport: SportType;

  // Financial
  amount: number;
  potential_payout: number;
  actual_payout?: number;
  odds: number;
  odds_format: 'american' | 'decimal' | 'fractional';

  // Game information
  teams: string; // JSON object with team names
  game_date: string;
  game_time?: string;
  venue?: string;
  league?: string;

  // Bet specifics
  bet_line?: string;
  point_spread?: number;
  total_points?: number;
  moneyline?: number;

  // Results
  outcome?: string;
  final_score?: string;
  winning_team?: string;

  // Timing
  placed_datetime: string;
  graded_datetime?: string;
  settlement_datetime?: string;

  // Related entities
  transaction_id?: string;
  related_bets?: string; // JSON array for parlay components

  // Risk management
  risk_amount: number;
  liability: number;
  max_win_amount: number;

  // Live betting
  is_live_bet: boolean;
  live_odds_changes?: string; // JSON array of odds changes

  // System tracking
  grade_num?: number;
  void_reason?: string;
  notes?: string;
}

// !== FIRE22 BONUS ENTITIES !==

export type BonusType =
  | 'welcome'
  | 'deposit_match'
  | 'free_play'
  | 'cashback'
  | 'loyalty'
  | 'promotional';
export type BonusStatus = 'active' | 'expired' | 'used' | 'cancelled' | 'pending_activation';

export interface Fire22Bonus extends AuditableEntity {
  // Core identifiers
  bonus_id: string;
  fire22_customer_id: string;
  agent_id?: string;

  // Bonus details
  type: BonusType;
  status: BonusStatus;
  name: string;
  description: string;

  // Financial
  bonus_amount: number;
  wagering_requirement: number;
  wagered_amount: number;
  remaining_wagering: number;

  // Validity
  issue_date: string;
  activation_date?: string;
  expiry_date: string;

  // Terms and conditions
  min_deposit_required?: number;
  max_bonus_amount?: number;
  eligible_games?: string; // JSON array of eligible games/sports

  // Usage tracking
  times_used: number;
  max_usage?: number;

  // System
  promo_code?: string;
  campaign_id?: string;
  notes?: string;
}

// !== FIRE22 GAME/EVENT ENTITIES !==

export interface Fire22Game extends BaseEntity {
  // Core identifiers
  game_id: string;
  external_game_id?: string;

  // Game details
  sport: SportType;
  league: string;
  home_team: string;
  away_team: string;

  // Scheduling
  game_date: string;
  game_time: string;
  timezone: string;
  venue?: string;

  // Status
  game_status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled';
  period?: string;
  time_remaining?: string;

  // Scores
  home_score: number;
  away_score: number;
  period_scores?: string; // JSON object with period breakdowns

  // Betting information
  betting_status: 'open' | 'suspended' | 'closed';
  total_handle: number;
  total_bets: number;

  // Lines and odds
  current_lines?: string; // JSON object with current betting lines
  opening_lines?: string; // JSON object with opening lines

  // System
  data_source: string;
  last_updated: string;
  notes?: string;
}

// !== FIRE22 ODDS ENTITIES !==

export type OddsType = 'moneyline' | 'spread' | 'total' | 'prop';

export interface Fire22Odds extends BaseEntity {
  // Core identifiers
  odds_id: string;
  game_id: string;

  // Odds details
  type: OddsType;
  line_description: string;

  // Values
  home_odds: number;
  away_odds: number;
  over_odds?: number;
  under_odds?: number;

  // Line details
  point_spread?: number;
  total_points?: number;

  // Status
  active: boolean;
  suspended: boolean;

  // Limits
  min_bet: number;
  max_bet: number;
  max_payout: number;

  // System
  odds_provider: string;
  last_updated: string;
  sequence_number: number;
}

// !== FIRE22 SYSTEM ENTITIES !==

export interface Fire22Session extends BaseEntity {
  // Core identifiers
  session_id: string;
  fire22_customer_id?: string;
  agent_id?: string;

  // Session details
  session_start: string;
  session_end?: string;
  duration?: number;

  // Technical
  ip_address: string;
  user_agent: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  platform: string;

  // Activity
  pages_visited: number;
  bets_placed: number;
  total_wagered: number;

  // Geolocation
  country?: string;
  state?: string;
  city?: string;

  // System
  session_status: 'active' | 'expired' | 'logged_out' | 'terminated';
  termination_reason?: string;
}

export interface Fire22AuditLog extends BaseEntity {
  // Core identifiers
  log_id: string;
  user_id?: string;
  session_id?: string;

  // Action details
  action_type: string;
  entity_type: string;
  entity_id: string;

  // Changes
  old_values?: string; // JSON object
  new_values?: string; // JSON object

  // Context
  ip_address: string;
  user_agent: string;

  // System
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  stack_trace?: string;
}

// !== FIRE22 ANALYTICS ENTITIES !==

export interface Fire22CustomerMetrics extends BaseEntity {
  // Core identifiers
  metrics_id: string;
  fire22_customer_id: string;
  date: string;

  // Daily metrics
  sessions_count: number;
  total_time_spent: number;
  bets_placed: number;
  total_wagered: number;
  total_won: number;
  net_loss: number;

  // Behavior patterns
  favorite_sport?: SportType;
  average_bet_size: number;
  max_bet_size: number;
  win_rate: number;

  // Calculated metrics
  customer_value_score: number;
  churn_risk_score: number;
  lifetime_value: number;
}

// !== TYPE UNIONS AND UTILITIES !==

export type Fire22Entity =
  | Fire22Customer
  | Fire22Agent
  | Fire22Transaction
  | Fire22Bet
  | Fire22Bonus
  | Fire22Game
  | Fire22Odds
  | Fire22Session
  | Fire22AuditLog
  | Fire22CustomerMetrics;

export type Fire22EntityType =
  | 'customer'
  | 'agent'
  | 'transaction'
  | 'bet'
  | 'bonus'
  | 'game'
  | 'odds'
  | 'session'
  | 'audit_log'
  | 'customer_metrics';

// Validation constraints
export const FIRE22_CONSTRAINTS = {
  CUSTOMER_ID_LENGTH: { min: 4, max: 20 },
  AGENT_ID_LENGTH: { min: 4, max: 20 },
  LOGIN_LENGTH: { min: 3, max: 50 },
  BET_AMOUNT: { min: 1, max: 100000 },
  COMMISSION_RATE: { min: 0, max: 1 },
  RISK_SCORE: { min: 0, max: 100 },
  PERFORMANCE_SCORE: { min: 0, max: 100 },
} as const;

// Business rule constants
export const FIRE22_BUSINESS_RULES = {
  VIP_TIER_THRESHOLD: {
    bronze: 0,
    silver: 10000,
    gold: 50000,
    platinum: 100000,
    diamond: 500000,
    vip: 1000000,
  },
  RISK_LEVEL_THRESHOLDS: {
    low: 25,
    medium: 50,
    high: 75,
    critical: 90,
  },
  DEFAULT_BETTING_LIMITS: {
    bronze: { min: 1, max: 1000 },
    silver: { min: 1, max: 2500 },
    gold: { min: 1, max: 5000 },
    platinum: { min: 1, max: 10000 },
    diamond: { min: 1, max: 25000 },
    vip: { min: 1, max: 100000 },
  },
} as const;

export default Fire22Customer;
