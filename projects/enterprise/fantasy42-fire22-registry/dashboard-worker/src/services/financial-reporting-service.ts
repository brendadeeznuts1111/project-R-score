/**
 * Fire22 Financial Reporting Service
 * Advanced financial reporting for betting transactions with detailed analytics
 */

import { EventEmitter } from 'events';
import { ExcelExportService } from './excel-export-service';

export interface BettingTransaction {
  id: string;
  timestamp: string;
  agent: string;
  location: string;
  type: 'CLUB' | 'AGENT' | 'DISTRIBUTION' | 'CORPORATE';
  category: 'Distribution' | 'Retail' | 'Online' | 'Mobile';
  betBreakdown: {
    DT?: number; // Daily Tickets
    Inet?: number; // Internet Bets
    Phone?: number; // Phone Bets
    Live?: number; // Live Betting
    PropB?: number; // Proposition Bets
    LD?: number; // Line Draws
    ExtProps?: number; // Extended Props
    Crash?: number; // Crash Games
    Excl?: number; // Exclusive Bets
  };
  totalAmount: number;
  netAmount: number;
  source: 'SYSTEM' | 'MANUAL' | 'API';
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  metadata?: {
    gameType?: string;
    sport?: string;
    league?: string;
    customerId?: string;
    ticketNumber?: string;
  };
}

export interface FinancialReport {
  summary: {
    totalTransactions: number;
    totalVolume: number;
    netProfit: number;
    winRate: number;
    averageBetSize: number;
    period: {
      startDate: string;
      endDate: string;
      days: number;
    };
  };
  breakdown: {
    byAgent: AgentPerformance[];
    byBetType: BetTypePerformance[];
    byTime: TimeSeriesData[];
    byLocation: LocationPerformance[];
  };
  insights: {
    topPerformingAgents: string[];
    worstPerformingAgents: string[];
    trendingBetTypes: string[];
    riskIndicators: RiskIndicator[];
  };
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  totalVolume: number;
  netProfit: number;
  winRate: number;
  transactionCount: number;
  averageBetSize: number;
  topBetTypes: string[];
  trend: 'up' | 'down' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface BetTypePerformance {
  betType: string;
  totalVolume: number;
  netProfit: number;
  winRate: number;
  transactionCount: number;
  averageBetSize: number;
  trend: 'up' | 'down' | 'stable';
  contribution: number; // Percentage of total volume
}

export interface TimeSeriesData {
  date: string;
  volume: number;
  profit: number;
  transactionCount: number;
  winRate: number;
}

export interface LocationPerformance {
  location: string;
  totalVolume: number;
  netProfit: number;
  transactionCount: number;
  agentCount: number;
  performance: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface RiskIndicator {
  type: 'high_loss' | 'volume_spike' | 'win_rate_drop' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedAgents: string[];
  recommendation: string;
  timestamp: string;
}

export interface FinancialFilters {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  agents?: string[];
  locations?: string[];
  betTypes?: string[];
  categories?: string[];
  minAmount?: number;
  maxAmount?: number;
  status?: string[];
}

export class FinancialReportingService extends EventEmitter {
  private static instance: FinancialReportingService;
  private transactions: Map<string, BettingTransaction> = new Map();
  private excelExporter: ExcelExportService;
  private isInitialized = false;

  constructor() {
    super();
    this.excelExporter = ExcelExportService.getInstance();
  }

  public static getInstance(): FinancialReportingService {
    if (!FinancialReportingService.instance) {
      FinancialReportingService.instance = new FinancialReportingService();
    }
    return FinancialReportingService.instance;
  }

  /**
   * Initialize the financial reporting service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('💰 Initializing Financial Reporting Service...');

    // Load sample data for demonstration
    await this.loadSampleData();

    this.isInitialized = true;
    console.log('✅ Financial Reporting Service initialized');
  }

  /**
   * Load sample betting transaction data
   */
  private async loadSampleData(): Promise<void> {
    const sampleTransactions: BettingTransaction[] = [
      {
        id: 'TXN-2025-001',
        timestamp: '2025-08-11T06:00:00Z',
        agent: 'PALMA',
        location: 'Miami Club',
        type: 'CLUB',
        category: 'Distribution',
        betBreakdown: {
          DT: 17,
          Inet: 0,
          Phone: 0,
          Live: 6,
          PropB: 2,
          LD: 0,
          ExtProps: 0,
          Crash: 0,
          Excl: 0,
        },
        totalAmount: 340,
        netAmount: -340,
        source: 'SYSTEM',
        status: 'completed',
        metadata: {
          gameType: 'Mixed',
          sport: 'Multiple',
          ticketNumber: 'TK-2025-001',
        },
      },
      {
        id: 'TXN-2025-002',
        timestamp: '2025-08-11T07:30:00Z',
        agent: 'BROWARD',
        location: 'Fort Lauderdale Club',
        type: 'CLUB',
        category: 'Retail',
        betBreakdown: {
          DT: 25,
          Inet: 8,
          Phone: 3,
          Live: 12,
          PropB: 5,
          LD: 2,
          ExtProps: 1,
          Crash: 0,
          Excl: 1,
        },
        totalAmount: 850,
        netAmount: 125,
        source: 'SYSTEM',
        status: 'completed',
        metadata: {
          gameType: 'Sports',
          sport: 'NFL',
          ticketNumber: 'TK-2025-002',
        },
      },
      {
        id: 'TXN-2025-003',
        timestamp: '2025-08-11T08:15:00Z',
        agent: 'DADE',
        location: 'Miami Online',
        type: 'AGENT',
        category: 'Online',
        betBreakdown: {
          DT: 0,
          Inet: 45,
          Phone: 0,
          Live: 18,
          PropB: 8,
          LD: 0,
          ExtProps: 3,
          Crash: 2,
          Excl: 0,
        },
        totalAmount: 1200,
        netAmount: -280,
        source: 'API',
        status: 'completed',
        metadata: {
          gameType: 'Online',
          sport: 'Multiple',
          ticketNumber: 'TK-2025-003',
        },
      },
    ];

    // Add sample transactions
    sampleTransactions.forEach(txn => {
      this.transactions.set(txn.id, txn);
    });

    console.log(`📊 Loaded ${sampleTransactions.length} sample transactions`);
  }

  /**
   * Generate comprehensive financial report
   */
  async generateFinancialReport(filters: FinancialFilters): Promise<FinancialReport> {
    await this.initialize();

    const filteredTransactions = this.filterTransactions(filters);

    // Calculate summary statistics
    const summary = this.calculateSummary(filteredTransactions, filters);

    // Calculate breakdowns
    const breakdown = {
      byAgent: this.calculateAgentPerformance(filteredTransactions),
      byBetType: this.calculateBetTypePerformance(filteredTransactions),
      byTime: this.calculateTimeSeriesData(filteredTransactions, filters),
      byLocation: this.calculateLocationPerformance(filteredTransactions),
    };

    // Generate insights
    const insights = this.generateInsights(breakdown);

    const report: FinancialReport = {
      summary,
      breakdown,
      insights,
    };

    this.emit('report-generated', report);
    return report;
  }

  /**
   * Filter transactions based on criteria
   */
  private filterTransactions(filters: FinancialFilters): BettingTransaction[] {
    return Array.from(this.transactions.values()).filter(txn => {
      // Date range filter
      const txnDate = new Date(txn.timestamp);
      const startDate = new Date(filters.dateRange.startDate);
      const endDate = new Date(filters.dateRange.endDate);

      if (txnDate < startDate || txnDate > endDate) {
        return false;
      }

      // Agent filter
      if (filters.agents && filters.agents.length > 0 && !filters.agents.includes(txn.agent)) {
        return false;
      }

      // Location filter
      if (
        filters.locations &&
        filters.locations.length > 0 &&
        !filters.locations.includes(txn.location)
      ) {
        return false;
      }

      // Amount filters
      if (filters.minAmount && Math.abs(txn.netAmount) < filters.minAmount) {
        return false;
      }

      if (filters.maxAmount && Math.abs(txn.netAmount) > filters.maxAmount) {
        return false;
      }

      // Status filter
      if (filters.status && filters.status.length > 0 && !filters.status.includes(txn.status)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    transactions: BettingTransaction[],
    filters: FinancialFilters
  ): FinancialReport['summary'] {
    const totalTransactions = transactions.length;
    const totalVolume = transactions.reduce((sum, txn) => sum + txn.totalAmount, 0);
    const netProfit = transactions.reduce((sum, txn) => sum + txn.netAmount, 0);

    const winningTransactions = transactions.filter(txn => txn.netAmount > 0).length;
    const winRate = totalTransactions > 0 ? (winningTransactions / totalTransactions) * 100 : 0;

    const averageBetSize = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

    const startDate = new Date(filters.dateRange.startDate);
    const endDate = new Date(filters.dateRange.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      totalTransactions,
      totalVolume,
      netProfit,
      winRate,
      averageBetSize,
      period: {
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
        days,
      },
    };
  }

  /**
   * Calculate agent performance
   */
  private calculateAgentPerformance(transactions: BettingTransaction[]): AgentPerformance[] {
    const agentMap = new Map<string, BettingTransaction[]>();

    // Group transactions by agent
    transactions.forEach(txn => {
      if (!agentMap.has(txn.agent)) {
        agentMap.set(txn.agent, []);
      }
      agentMap.get(txn.agent)!.push(txn);
    });

    // Calculate performance for each agent
    return Array.from(agentMap.entries()).map(([agentId, agentTransactions]) => {
      const totalVolume = agentTransactions.reduce((sum, txn) => sum + txn.totalAmount, 0);
      const netProfit = agentTransactions.reduce((sum, txn) => sum + txn.netAmount, 0);
      const transactionCount = agentTransactions.length;

      const winningTransactions = agentTransactions.filter(txn => txn.netAmount > 0).length;
      const winRate = transactionCount > 0 ? (winningTransactions / transactionCount) * 100 : 0;

      const averageBetSize = transactionCount > 0 ? totalVolume / transactionCount : 0;

      // Calculate top bet types
      const betTypeCounts = new Map<string, number>();
      agentTransactions.forEach(txn => {
        Object.entries(txn.betBreakdown).forEach(([betType, amount]) => {
          if (amount && amount > 0) {
            betTypeCounts.set(betType, (betTypeCounts.get(betType) || 0) + amount);
          }
        });
      });

      const topBetTypes = Array.from(betTypeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([betType]) => betType);

      // Determine trend (simplified)
      const trend: 'up' | 'down' | 'stable' =
        netProfit > 0 ? 'up' : netProfit < 0 ? 'down' : 'stable';

      // Determine risk level
      const riskLevel: 'low' | 'medium' | 'high' =
        Math.abs(netProfit) > totalVolume * 0.1
          ? 'high'
          : Math.abs(netProfit) > totalVolume * 0.05
            ? 'medium'
            : 'low';

      return {
        agentId,
        agentName: agentId, // Could map to actual names
        totalVolume,
        netProfit,
        winRate,
        transactionCount,
        averageBetSize,
        topBetTypes,
        trend,
        riskLevel,
      };
    });
  }

  /**
   * Calculate bet type performance
   */
  private calculateBetTypePerformance(transactions: BettingTransaction[]): BetTypePerformance[] {
    const betTypeMap = new Map<
      string,
      { volume: number; profit: number; count: number; wins: number }
    >();

    // Aggregate data by bet type
    transactions.forEach(txn => {
      Object.entries(txn.betBreakdown).forEach(([betType, amount]) => {
        if (amount && amount > 0) {
          const existing = betTypeMap.get(betType) || { volume: 0, profit: 0, count: 0, wins: 0 };
          existing.volume += amount;
          existing.profit += txn.netAmount; // Simplified - should calculate per bet type
          existing.count += 1;
          if (txn.netAmount > 0) existing.wins += 1;
          betTypeMap.set(betType, existing);
        }
      });
    });

    // Calculate performance metrics
    return Array.from(betTypeMap.entries()).map(([betType, data]) => {
      const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
      const averageBetSize = data.count > 0 ? data.volume / data.count : 0;
      const trend: 'up' | 'down' | 'stable' =
        data.profit > 0 ? 'up' : data.profit < 0 ? 'down' : 'stable';

      return {
        betType,
        totalVolume: data.volume,
        netProfit: data.profit,
        winRate,
        transactionCount: data.count,
        averageBetSize,
        trend,
        contribution: 0, // Would calculate as percentage of total volume
      };
    });
  }

  /**
   * Calculate time series data
   */
  private calculateTimeSeriesData(
    transactions: BettingTransaction[],
    filters: FinancialFilters
  ): TimeSeriesData[] {
    const dailyMap = new Map<
      string,
      { volume: number; profit: number; count: number; wins: number }
    >();

    // Group by date
    transactions.forEach(txn => {
      const date = new Date(txn.timestamp).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { volume: 0, profit: 0, count: 0, wins: 0 };

      existing.volume += txn.totalAmount;
      existing.profit += txn.netAmount;
      existing.count += 1;
      if (txn.netAmount > 0) existing.wins += 1;

      dailyMap.set(date, existing);
    });

    // Convert to time series
    return Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        volume: data.volume,
        profit: data.profit,
        transactionCount: data.count,
        winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      }));
  }

  /**
   * Calculate location performance
   */
  private calculateLocationPerformance(transactions: BettingTransaction[]): LocationPerformance[] {
    const locationMap = new Map<
      string,
      { volume: number; profit: number; count: number; agents: Set<string> }
    >();

    // Group by location
    transactions.forEach(txn => {
      const existing = locationMap.get(txn.location) || {
        volume: 0,
        profit: 0,
        count: 0,
        agents: new Set(),
      };

      existing.volume += txn.totalAmount;
      existing.profit += txn.netAmount;
      existing.count += 1;
      existing.agents.add(txn.agent);

      locationMap.set(txn.location, existing);
    });

    // Calculate performance
    return Array.from(locationMap.entries()).map(([location, data]) => {
      const performance: 'excellent' | 'good' | 'fair' | 'poor' =
        data.profit > data.volume * 0.05
          ? 'excellent'
          : data.profit > 0
            ? 'good'
            : data.profit > data.volume * -0.05
              ? 'fair'
              : 'poor';

      return {
        location,
        totalVolume: data.volume,
        netProfit: data.profit,
        transactionCount: data.count,
        agentCount: data.agents.size,
        performance,
      };
    });
  }

  /**
   * Generate insights from data
   */
  private generateInsights(breakdown: FinancialReport['breakdown']): FinancialReport['insights'] {
    // Top performing agents
    const topPerformingAgents = breakdown.byAgent
      .sort((a, b) => b.netProfit - a.netProfit)
      .slice(0, 5)
      .map(agent => agent.agentId);

    // Worst performing agents
    const worstPerformingAgents = breakdown.byAgent
      .sort((a, b) => a.netProfit - b.netProfit)
      .slice(0, 5)
      .map(agent => agent.agentId);

    // Trending bet types
    const trendingBetTypes = breakdown.byBetType
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 3)
      .map(bt => bt.betType);

    // Risk indicators
    const riskIndicators: RiskIndicator[] = [];

    // High loss indicator
    const highLossAgents = breakdown.byAgent.filter(agent => agent.netProfit < -1000);
    if (highLossAgents.length > 0) {
      riskIndicators.push({
        type: 'high_loss',
        severity: 'high',
        description: `${highLossAgents.length} agents showing significant losses`,
        affectedAgents: highLossAgents.map(a => a.agentId),
        recommendation: 'Review agent performance and implement risk controls',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      topPerformingAgents,
      worstPerformingAgents,
      trendingBetTypes,
      riskIndicators,
    };
  }

  /**
   * Export financial report to Excel
   */
  async exportFinancialReport(report: FinancialReport): Promise<void> {
    const timestamp = new Date().toISOString().slice(0, 10);

    // Create summary sheet
    const summarySheet = {
      name: 'Summary',
      data: [
        { Metric: 'Total Transactions', Value: report.summary.totalTransactions },
        { Metric: 'Total Volume', Value: `$${report.summary.totalVolume.toLocaleString()}` },
        { Metric: 'Net Profit', Value: `$${report.summary.netProfit.toLocaleString()}` },
        { Metric: 'Win Rate', Value: `${report.summary.winRate.toFixed(2)}%` },
        { Metric: 'Average Bet Size', Value: `$${report.summary.averageBetSize.toFixed(2)}` },
        { Metric: 'Period Start', Value: report.summary.period.startDate },
        { Metric: 'Period End', Value: report.summary.period.endDate },
        { Metric: 'Days in Period', Value: report.summary.period.days },
      ],
      columns: [
        { key: 'Metric', header: 'Metric', width: 20 },
        { key: 'Value', header: 'Value', width: 15 },
      ],
    };

    // Create agent performance sheet
    const agentSheet = {
      name: 'Agent Performance',
      data: report.breakdown.byAgent.map(agent => ({
        'Agent ID': agent.agentId,
        'Agent Name': agent.agentName,
        'Total Volume': agent.totalVolume,
        'Net Profit': agent.netProfit,
        'Win Rate': `${agent.winRate.toFixed(2)}%`,
        'Transaction Count': agent.transactionCount,
        'Average Bet Size': agent.averageBetSize,
        'Top Bet Types': agent.topBetTypes.join(', '),
        Trend: agent.trend,
        'Risk Level': agent.riskLevel,
      })),
      columns: [
        { key: 'Agent ID', header: 'Agent ID', width: 15 },
        { key: 'Agent Name', header: 'Agent Name', width: 20 },
        { key: 'Total Volume', header: 'Volume', width: 12, type: 'currency' },
        { key: 'Net Profit', header: 'Profit', width: 12, type: 'currency' },
        { key: 'Win Rate', header: 'Win Rate', width: 10 },
        { key: 'Transaction Count', header: 'Transactions', width: 12, type: 'number' },
        { key: 'Average Bet Size', header: 'Avg Bet', width: 10, type: 'currency' },
        { key: 'Top Bet Types', header: 'Top Types', width: 15 },
        { key: 'Trend', header: 'Trend', width: 8 },
        { key: 'Risk Level', header: 'Risk', width: 8 },
      ],
    };

    // Create bet type performance sheet
    const betTypeSheet = {
      name: 'Bet Type Performance',
      data: report.breakdown.byBetType.map(bt => ({
        'Bet Type': bt.betType,
        'Total Volume': bt.totalVolume,
        'Net Profit': bt.netProfit,
        'Win Rate': `${bt.winRate.toFixed(2)}%`,
        'Transaction Count': bt.transactionCount,
        'Average Bet Size': bt.averageBetSize,
        Trend: bt.trend,
        Contribution: `${bt.contribution.toFixed(2)}%`,
      })),
      columns: [
        { key: 'Bet Type', header: 'Bet Type', width: 15 },
        { key: 'Total Volume', header: 'Volume', width: 12, type: 'currency' },
        { key: 'Net Profit', header: 'Profit', width: 12, type: 'currency' },
        { key: 'Win Rate', header: 'Win Rate', width: 10 },
        { key: 'Transaction Count', header: 'Transactions', width: 12, type: 'number' },
        { key: 'Average Bet Size', header: 'Avg Bet', width: 10, type: 'currency' },
        { key: 'Trend', header: 'Trend', width: 8 },
        { key: 'Contribution', header: 'Contribution', width: 10 },
      ],
    };

    // Export to Excel
    await this.excelExporter.exportToExcel({
      filename: `fire22-financial-report-${timestamp}.xlsx`,
      sheets: [summarySheet, agentSheet, betTypeSheet],
      metadata: {
        title: 'Fire22 Financial Report',
        author: 'Fire22 Financial System',
        created: new Date().toISOString(),
        description: `Financial performance report for ${report.summary.period.startDate} to ${report.summary.period.endDate}`,
      },
    });

    console.log('✅ Financial report exported successfully');
  }

  /**
   * Add new transaction
   */
  addTransaction(transaction: BettingTransaction): void {
    this.transactions.set(transaction.id, transaction);
    this.emit('transaction-added', transaction);
  }

  /**
   * Get transactions with filters
   */
  getTransactions(filters?: Partial<FinancialFilters>): BettingTransaction[] {
    let transactions = Array.from(this.transactions.values());

    if (filters) {
      transactions = this.filterTransactions(filters as FinancialFilters);
    }

    return transactions;
  }

  /**
   * Get transaction by ID
   */
  getTransaction(id: string): BettingTransaction | undefined {
    return this.transactions.get(id);
  }

  /**
   * Update transaction
   */
  updateTransaction(id: string, updates: Partial<BettingTransaction>): void {
    const transaction = this.transactions.get(id);
    if (transaction) {
      Object.assign(transaction, updates);
      this.emit('transaction-updated', transaction);
    }
  }

  /**
   * Delete transaction
   */
  deleteTransaction(id: string): void {
    const transaction = this.transactions.get(id);
    if (transaction) {
      this.transactions.delete(id);
      this.emit('transaction-deleted', transaction);
    }
  }

  /**
   * Get real-time statistics
   */
  getRealtimeStats(): {
    activeTransactions: number;
    totalVolume: number;
    netProfit: number;
    winRate: number;
  } {
    const transactions = Array.from(this.transactions.values());

    return {
      activeTransactions: transactions.length,
      totalVolume: transactions.reduce((sum, txn) => sum + txn.totalAmount, 0),
      netProfit: transactions.reduce((sum, txn) => sum + txn.netAmount, 0),
      winRate:
        transactions.length > 0
          ? (transactions.filter(t => t.netAmount > 0).length / transactions.length) * 100
          : 0,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.transactions.clear();
    this.removeAllListeners();
    console.log('🧹 Financial Reporting Service cleaned up');
  }
}

// Global functions for easy access
export async function generateFinancialReport(filters: FinancialFilters): Promise<FinancialReport> {
  const service = FinancialReportingService.getInstance();
  return await service.generateFinancialReport(filters);
}

export async function exportFinancialReport(report: FinancialReport): Promise<void> {
  const service = FinancialReportingService.getInstance();
  return await service.exportFinancialReport(report);
}

export { FinancialReportingService };
