/**
 * 🏢 Fire22 Dashboard - Business Logic Type Definitions
 * Types for business rules, calculations, and domain logic
 */

// Sportsbook business types
export interface SportsbookConfig {
  maxBetAmount: number;
  minBetAmount: number;
  maxPayout: number;
  defaultOdds: number;
  commissionRate: number;
  maxParlay: number;
  cutoffTime: number; // minutes before event
  autoGrading: boolean;
  liveWagering: boolean;
}

export interface BettingLimits {
  sport: string;
  league?: string;
  betType: string;
  minAmount: number;
  maxAmount: number;
  maxPayout: number;
  customerTier?: string;
  agentOverride?: boolean;
}

export interface OddsCalculation {
  americanOdds: number;
  decimalOdds: number;
  fractionalOdds: string;
  impliedProbability: number;
  margin: number;
  payout: number;
  profit: number;
}

export interface RiskManagement {
  totalExposure: number;
  maxExposure: number;
  exposureByTeam: Record<string, number>;
  exposureBySport: Record<string, number>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

// Customer business types
export interface CustomerTier {
  name: string;
  minVolume: number;
  maxVolume: number;
  commissionRate: number;
  bettingLimits: BettingLimits[];
  features: string[];
  restrictions: string[];
}

export interface CustomerProfile {
  customerId: string;
  tier: CustomerTier;
  lifetimeVolume: number;
  lifetimeProfit: number;
  averageBet: number;
  favoritesSports: string[];
  bettingPatterns: BettingPattern[];
  riskScore: number;
  creditLimit: number;
  status: 'active' | 'inactive' | 'suspended' | 'restricted';
}

export interface BettingPattern {
  sport: string;
  betType: string;
  frequency: number;
  averageAmount: number;
  winRate: number;
  profitLoss: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// Financial business types
export interface FinancialSummary {
  totalBalance: number;
  availableBalance: number;
  pendingBalance: number;
  creditLimit: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalWagers: number;
  totalWins: number;
  totalLosses: number;
  netProfit: number;
  lifetimeValue: number;
}

export interface TransactionRule {
  type: 'deposit' | 'withdrawal' | 'wager' | 'win' | 'loss';
  minAmount?: number;
  maxAmount?: number;
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
  requiresApproval?: boolean;
  autoProcess?: boolean;
  verificationRequired?: boolean;
}

export interface CommissionStructure {
  agentId: string;
  baseRate: number;
  volumeBonuses: VolumeBonus[];
  performanceBonuses: PerformanceBonus[];
  overrides: CommissionOverride[];
  paymentSchedule: 'weekly' | 'biweekly' | 'monthly';
}

export interface VolumeBonus {
  minVolume: number;
  maxVolume?: number;
  bonusRate: number;
  description: string;
}

export interface PerformanceBonus {
  metric: 'profit' | 'customers' | 'retention' | 'volume';
  threshold: number;
  bonusAmount: number;
  bonusType: 'fixed' | 'percentage';
  description: string;
}

export interface CommissionOverride {
  sport?: string;
  betType?: string;
  customerId?: string;
  rate: number;
  reason: string;
  expiresAt?: string;
}

// Agent business types
export interface AgentHierarchy {
  agentId: string;
  parentId?: string;
  level: number;
  children: AgentHierarchy[];
  customers: string[];
  permissions: AgentPermission[];
  territory?: string;
  specializations: string[];
}

export interface AgentPermission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
  conditions?: Record<string, any>;
  inherited?: boolean;
}

export interface AgentQuota {
  agentId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  targets: {
    newCustomers: number;
    totalVolume: number;
    profit: number;
    retention: number;
  };
  actual: {
    newCustomers: number;
    totalVolume: number;
    profit: number;
    retention: number;
  };
  performance: {
    newCustomersRate: number;
    volumeRate: number;
    profitRate: number;
    retentionRate: number;
    overallScore: number;
  };
}

// Event and game types
export interface SportEvent {
  eventId: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  eventDate: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'postponed';
  score?: {
    home: number;
    away: number;
    period?: string;
    timeRemaining?: string;
  };
  markets: BettingMarket[];
}

export interface BettingMarket {
  marketId: string;
  name: string;
  type: 'moneyline' | 'spread' | 'total' | 'prop';
  status: 'open' | 'closed' | 'suspended';
  lines: BettingLine[];
  limits: BettingLimits;
}

export interface BettingLine {
  lineId: string;
  selection: string;
  odds: number;
  line?: number; // for spreads and totals
  status: 'open' | 'closed' | 'suspended';
  lastUpdated: string;
}

// Reporting and analytics types
export interface ReportConfig {
  reportId: string;
  name: string;
  description: string;
  type: 'financial' | 'customer' | 'agent' | 'risk' | 'operational';
  schedule?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  parameters: Record<string, any>;
  format: 'pdf' | 'excel' | 'csv' | 'json';
}

export interface AnalyticsMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  changePercent: number;
  period: string;
  benchmark?: number;
  target?: number;
}

export interface Dashboard {
  dashboardId: string;
  name: string;
  userId: string;
  widgets: DashboardWidget[];
  layout: WidgetLayout[];
  refreshInterval: number;
  isPublic: boolean;
  permissions: string[];
}

export interface DashboardWidget {
  widgetId: string;
  type: 'chart' | 'table' | 'metric' | 'alert' | 'text';
  title: string;
  dataSource: string;
  config: Record<string, any>;
  refreshInterval: number;
}

export interface WidgetLayout {
  widgetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
}

// Audit and compliance types
export interface AuditLog {
  logId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  timestamp: string;
  ip: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

export interface ComplianceRule {
  ruleId: string;
  name: string;
  description: string;
  type: 'kyc' | 'aml' | 'responsible_gaming' | 'regulatory';
  conditions: Record<string, any>;
  actions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

// Export all business types
export type {
  SportsbookConfig,
  BettingLimits,
  OddsCalculation,
  RiskManagement,
  CustomerTier,
  CustomerProfile,
  BettingPattern,
  FinancialSummary,
  TransactionRule,
  CommissionStructure,
  VolumeBonus,
  PerformanceBonus,
  CommissionOverride,
  AgentHierarchy,
  AgentPermission,
  AgentQuota,
  SportEvent,
  BettingMarket,
  BettingLine,
  ReportConfig,
  AnalyticsMetric,
  Dashboard,
  DashboardWidget,
  WidgetLayout,
  AuditLog,
  ComplianceRule,
};
