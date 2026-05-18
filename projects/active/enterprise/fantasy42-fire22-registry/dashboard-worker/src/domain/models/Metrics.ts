/**
 * Domain Model: Revenue Metrics
 * Comprehensive financial metrics and KPIs for business intelligence
 */
export interface RevenueMetrics {
  // Core revenue figures
  totalRevenue: number;
  netRevenue: number;
  totalFees: number;

  // Success and performance metrics
  successRate: number;
  averageProcessingTime: number;
  customerSatisfactionScore?: number;

  // Volume metrics
  dailyVolume: number;
  weeklyVolume: number;
  monthlyVolume: number;
  yearlyVolume: number;

  // Trend metrics
  revenueGrowthRate: number;
  volumeGrowthRate: number;
  feeGrowthRate: number;

  // Agent performance
  topAgentRevenue: number;
  topAgentId?: string;
  topAgentName?: string;
  averageAgentRevenue: number;

  // Time-based breakdowns
  dailyBreakdown: DailyMetric[];
  weeklyBreakdown: WeeklyMetric[];
  monthlyBreakdown: MonthlyMetric[];

  // Business intelligence
  marketShare?: number;
  customerRetentionRate?: number;
  averageTransactionValue: number;

  // Operational metrics
  totalTransactions: number;
  activeMerchants: number;
  activeAgents: number;

  // Period information
  period: string;
  calculatedAt: Date;
}

/**
 * Daily metric breakdown
 */
export interface DailyMetric {
  date: string; // YYYY-MM-DD
  revenue: number;
  volume: number;
  transactions: number;
  fees: number;
  successRate: number;
  averageProcessingTime: number;
}

/**
 * Weekly metric breakdown
 */
export interface WeeklyMetric {
  week: string; // YYYY-WW
  revenue: number;
  volume: number;
  transactions: number;
  fees: number;
  successRate: number;
  averageProcessingTime: number;
}

/**
 * Monthly metric breakdown
 */
export interface MonthlyMetric {
  month: string; // YYYY-MM
  revenue: number;
  volume: number;
  transactions: number;
  fees: number;
  successRate: number;
  averageProcessingTime: number;
}

/**
 * Agent performance metrics
 */
export interface AgentMetrics {
  agentId: string;
  agentName?: string;
  totalRevenue: number;
  totalVolume: number;
  totalTransactions: number;
  successRate: number;
  averageProcessingTime: number;
  customerSatisfaction?: number;
  commissionEarned: number;
  period: string;
}

/**
 * Merchant performance metrics
 */
export interface MerchantMetrics {
  merchantId: string;
  merchantName?: string;
  totalRevenue: number;
  totalVolume: number;
  totalTransactions: number;
  successRate: number;
  averageProcessingTime: number;
  settlementFrequency: number;
  period: string;
}

/**
 * Metric calculation parameters
 */
export interface MetricCalculationParams {
  dateFrom: Date;
  dateTo: Date;
  includeInactive?: boolean;
  agentFilter?: string[];
  merchantFilter?: string[];
  currency?: string;
}
