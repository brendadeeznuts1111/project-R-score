/**
 * 🗄️ Fire22 Dashboard - Entity Type Definitions
 * Core database entity interfaces for all business domains
 */

import type { BaseEntity, AuditableEntity } from './base';
import type {
  DatabaseStatus,
  TransactionType,
  WagerStatus,
  BetType,
  CustomerTier,
  RiskLevel,
  AgentLevel,
  SportType,
  EventStatus,
} from '../../constants';

// === CUSTOMER ENTITIES ===
export interface Customer extends AuditableEntity {
  customer_id: string;
  username: string;
  first_name: string;
  last_name: string;
  login: string;
  email?: string;
  phone?: string;
  status: DatabaseStatus;
  agent_id: string;
  parent_agent?: string;
  master_agent: string;

  // Financial information
  balance: number;
  casino_balance: number;
  sports_balance: number;
  freeplay_balance: number;
  credit_limit: number;

  // Activity tracking
  last_login?: string;
  last_activity?: string;
  total_deposits: number;
  total_withdrawals: number;
  lifetime_volume: number;

  // Business rules
  tier: CustomerTier;
  betting_limits: Record<string, number>;
  risk_score: number;
  vip_status: boolean;

  // Metadata
  notes?: string;
  preferences?: Record<string, any>;
  kyc_status: 'pending' | 'approved' | 'rejected';
  kyc_documents?: string[];
}

export interface CustomerProfile {
  customer: Customer;
  statistics: {
    total_bets: number;
    total_wins: number;
    total_losses: number;
    win_rate: number;
    profit_loss: number;
    favorite_sports: string[];
    betting_patterns: BettingPattern[];
  };
  recent_activity: Activity[];
}

export interface BettingPattern {
  sport: string;
  bet_type: string;
  frequency: number;
  average_amount: number;
  win_rate: number;
  profit_loss: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  last_updated: string;
}

// === AGENT ENTITIES ===
export interface Agent extends AuditableEntity {
  agent_id: string;
  agent_login: string;
  agent_name: string;
  agent_type: 'master' | 'agent' | 'player' | 'admin';
  parent_agent?: string;
  master_agent: string;
  level: AgentLevel;

  // Business information
  commission_rate: number;
  status: DatabaseStatus;
  territory?: string;
  specializations: string[];

  // Performance tracking
  total_customers: number;
  active_customers: number;
  total_volume: number;
  total_commission: number;
  performance_score: number;

  // Access and permissions
  permissions: string[];
  access_level: number;
  allowed_sports: string[];
  max_bet_limit: number;

  // Activity
  last_login?: string;
  login_count: number;

  // Metadata
  contact_info?: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

export interface AgentHierarchy {
  agent: Agent;
  parent?: Agent;
  children: Agent[];
  customers: Customer[];
  depth: number;
  path: string[];
}

// === TRANSACTION ENTITIES ===
export interface Transaction extends AuditableEntity {
  customer_id: string;
  agent_id: string;
  amount: number;
  tran_type: TransactionType;
  tran_code: string;
  document_number?: string;
  reference?: string;

  // Description and details
  short_desc: string;
  long_desc?: string;

  // Processing information
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  processed_at?: string;
  processor?: string;
  external_reference?: string;

  // Balance tracking
  balance_before: number;
  balance_after: number;
  freeplay_balance: number;
  freeplay_pending_balance: number;
  freeplay_pending_count: number;

  // Audit information
  entered_by: string;
  approved_by?: string;
  grade_num?: number;
  tran_datetime: string;

  // Related entities
  wager_id?: string;
  parent_transaction_id?: string;

  // Metadata
  metadata?: Record<string, any>;
  fees?: {
    processing_fee: number;
    service_fee: number;
    third_party_fee: number;
  };
}

// === WAGER ENTITIES ===
export interface Wager extends AuditableEntity {
  wager_number: string;
  customer_id: string;
  agent_id: string;

  // Bet details
  amount_wagered: number;
  to_win_amount: number;
  actual_win_amount?: number;
  odds: number;
  original_odds: number;

  // Event information
  event_id?: string;
  sport: SportType;
  league: string;
  teams: string;
  event_datetime: string;

  // Bet specifics
  bet_type: BetType;
  wager_type: string;
  line?: number;
  total?: number;
  selection: string;

  // Status and processing
  status: WagerStatus;
  result?: 'win' | 'loss' | 'push' | 'void';
  graded_at?: string;
  graded_by?: string;
  settlement_datetime?: string;

  // Business rules
  risk_level: RiskLevel;
  max_payout: number;
  commission_rate: number;
  volume_amount: number;

  // Additional information
  ticket_writer: string;
  short_desc: string;
  notes?: string;
  vip: boolean;
  live_bet: boolean;

  // Parlay information (if applicable)
  is_parlay: boolean;
  parlay_legs?: WagerLeg[];
  parlay_odds?: number;

  // Metadata
  external_bet_id?: string;
  source: 'web' | 'mobile' | 'agent' | 'api';
  device_info?: Record<string, any>;
}

export interface WagerLeg {
  id: string;
  event_id: string;
  sport: SportType;
  teams: string;
  bet_type: BetType;
  selection: string;
  odds: number;
  line?: number;
  result?: 'win' | 'loss' | 'push' | 'void';
  status: WagerStatus;
}

// === SPORTS ENTITIES ===
export interface SportEvent extends BaseEntity {
  event_id: string;
  external_id?: string;

  // Basic information
  name: string;
  sport: SportType;
  league: string;
  season?: string;
  week?: number;

  // Teams
  home_team: string;
  away_team: string;
  home_team_id?: string;
  away_team_id?: string;

  // Timing
  event_date: string;
  start_time: string;
  end_time?: string;
  timezone: string;

  // Status
  status: EventStatus;
  live: boolean;
  in_play: boolean;

  // Scores
  home_score?: number;
  away_score?: number;
  period?: string;
  time_remaining?: string;

  // Betting
  markets: BettingMarket[];
  total_handle: number;
  total_bets: number;

  // Risk management
  risk_level: RiskLevel;
  max_exposure: number;
  auto_grade: boolean;

  // Metadata
  venue?: string;
  weather?: Record<string, any>;
  injuries?: string[];
  notes?: string;
}

export interface BettingMarket extends BaseEntity {
  market_id: string;
  event_id: string;

  // Market details
  name: string;
  type: BetType;
  category: string;

  // Status
  status: 'open' | 'closed' | 'suspended';
  enabled: boolean;

  // Lines and odds
  lines: BettingLine[];

  // Limits
  min_bet: number;
  max_bet: number;
  max_payout: number;

  // Business rules
  commission_rate: number;
  risk_limit: number;

  // Metadata
  display_order: number;
  description?: string;
  rules?: string;
}

export interface BettingLine extends BaseEntity {
  line_id: string;
  market_id: string;

  // Line details
  selection: string;
  odds: number;
  american_odds: number;
  decimal_odds: number;
  line_value?: number; // for spreads, totals

  // Status
  status: 'open' | 'closed' | 'suspended';
  enabled: boolean;

  // Movement tracking
  opening_odds: number;
  previous_odds: number;
  move_count: number;
  last_moved: string;

  // Volume
  bet_count: number;
  total_handle: number;

  // Risk
  liability: number;
  max_liability: number;
}

// === ACTIVITY ENTITIES ===
export interface Activity extends BaseEntity {
  user_id: string;
  user_type: 'customer' | 'agent' | 'admin';

  // Activity details
  type:
    | 'login'
    | 'logout'
    | 'bet_placed'
    | 'bet_settled'
    | 'deposit'
    | 'withdrawal'
    | 'profile_update';
  action: string;
  description: string;

  // Context
  amount?: number;
  entity_type?: string;
  entity_id?: string;

  // Technical details
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  location?: string;

  // Metadata
  metadata?: Record<string, any>;
  success: boolean;
  error_message?: string;
  duration?: number;
}

// === SYSTEM ENTITIES ===
export interface SystemConfig extends BaseEntity {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  editable: boolean;
  sensitive: boolean;
}

export interface AuditLog extends BaseEntity {
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_fields: string[];
  user_id?: string;
  user_type?: string;
  ip_address?: string;
  user_agent?: string;
}

// === NOTIFICATION ENTITIES ===
export interface Notification extends BaseEntity {
  recipient_id: string;
  recipient_type: 'customer' | 'agent' | 'admin';

  // Content
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'normal' | 'high' | 'urgent';

  // Status
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sent_at?: string;
  read_at?: string;

  // Delivery
  channels: ('email' | 'sms' | 'push' | 'in_app')[];
  delivery_attempts: number;
  max_attempts: number;

  // Metadata
  metadata?: Record<string, any>;
  template_id?: string;
  variables?: Record<string, any>;
}

// === REPORT ENTITIES ===
export interface Report extends BaseEntity {
  name: string;
  description?: string;
  type: 'financial' | 'customer' | 'agent' | 'risk' | 'operational';

  // Configuration
  query: string;
  parameters: Record<string, any>;
  schedule?: string; // cron expression

  // Access
  created_by: string;
  visibility: 'private' | 'team' | 'organization';
  allowed_users: string[];
  allowed_roles: string[];

  // Status
  status: 'active' | 'inactive' | 'draft';
  last_run?: string;
  next_run?: string;

  // Output
  format: 'json' | 'csv' | 'pdf' | 'excel';
  email_recipients?: string[];

  // Metadata
  tags: string[];
  category: string;
}

// Export all entity types
export type {
  Customer,
  CustomerProfile,
  BettingPattern,
  Agent,
  AgentHierarchy,
  Transaction,
  Wager,
  WagerLeg,
  SportEvent,
  BettingMarket,
  BettingLine,
  Activity,
  SystemConfig,
  AuditLog,
  Notification,
  Report,
};
