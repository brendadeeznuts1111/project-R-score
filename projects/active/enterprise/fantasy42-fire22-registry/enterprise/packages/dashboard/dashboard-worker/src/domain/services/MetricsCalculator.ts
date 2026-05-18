/**
 * Metrics Calculator Service
 * Business logic for calculating financial metrics and KPIs
 */

import {
  RevenueMetrics,
  DailyMetric,
  WeeklyMetric,
  MonthlyMetric,
  AgentMetrics,
  MerchantMetrics,
  MetricCalculationParams,
} from '../models';
import { Logger } from './Logger';

export class MetricsCalculator {
  private static logger = Logger.configure('MetricsCalculator');

  /**
   * Calculate comprehensive revenue metrics
   */
  static async calculateRevenue(params?: MetricCalculationParams): Promise<RevenueMetrics> {
    try {
      Logger.info('Calculating revenue metrics', params);

      const dateFrom = params?.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dateTo = params?.dateTo || new Date();

      // Get base metrics
      const totalRevenue = await this.calculateTotalRevenue(dateFrom, dateTo);
      const totalFees = await this.calculateTotalFees(dateFrom, dateTo);
      const netRevenue = totalRevenue - totalFees;

      // Get volume metrics
      const dailyVolume = await this.calculateVolume('daily', dateFrom, dateTo);
      const weeklyVolume = await this.calculateVolume('weekly', dateFrom, dateTo);
      const monthlyVolume = await this.calculateVolume('monthly', dateFrom, dateTo);

      // Get success metrics
      const successRate = await this.calculateSuccessRate(dateFrom, dateTo);
      const averageProcessingTime = await this.calculateAverageProcessingTime(dateFrom, dateTo);

      // Get trend metrics
      const revenueGrowthRate = await this.calculateGrowthRate('revenue', dateFrom, dateTo);
      const volumeGrowthRate = await this.calculateGrowthRate('volume', dateFrom, dateTo);
      const feeGrowthRate = await this.calculateGrowthRate('fees', dateFrom, dateTo);

      // Get agent performance
      const topAgent = await this.getTopAgent(dateFrom, dateTo);
      const averageAgentRevenue = await this.calculateAverageAgentRevenue(dateFrom, dateTo);

      // Get breakdowns
      const dailyBreakdown = await this.getDailyBreakdown(dateFrom, dateTo);
      const weeklyBreakdown = await this.getWeeklyBreakdown(dateFrom, dateTo);
      const monthlyBreakdown = await this.getMonthlyBreakdown(dateFrom, dateTo);

      // Get operational metrics
      const totalTransactions = await this.getTotalTransactions(dateFrom, dateTo);
      const activeMerchants = await this.getActiveMerchants(dateFrom, dateTo);
      const activeAgents = await this.getActiveAgents(dateFrom, dateTo);
      const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      const metrics: RevenueMetrics = {
        totalRevenue,
        netRevenue,
        totalFees,
        successRate,
        averageProcessingTime,
        dailyVolume,
        weeklyVolume,
        monthlyVolume,
        yearlyVolume: monthlyVolume * 12, // Approximation
        revenueGrowthRate,
        volumeGrowthRate,
        feeGrowthRate,
        topAgentRevenue: topAgent?.totalRevenue || 0,
        topAgentId: topAgent?.agentId,
        topAgentName: topAgent?.agentName,
        averageAgentRevenue,
        dailyBreakdown,
        weeklyBreakdown,
        monthlyBreakdown,
        marketShare: undefined, // Would need industry data
        customerRetentionRate: undefined, // Would need customer data
        averageTransactionValue,
        totalTransactions,
        activeMerchants,
        activeAgents,
        period: `${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`,
        calculatedAt: new Date(),
      };

      Logger.info('Revenue metrics calculated successfully', {
        totalRevenue,
        successRate,
        totalTransactions,
      });

      return metrics;
    } catch (error) {
      Logger.error('Error calculating revenue metrics', error);
      throw new Error('Failed to calculate revenue metrics');
    }
  }

  /**
   * Get agent performance metrics
   */
  static async getAgentPerformance(
    agentId?: string,
    params?: MetricCalculationParams
  ): Promise<AgentMetrics[]> {
    try {
      Logger.info(`Getting performance metrics for agent: ${agentId || 'all'}`, params);

      const dateFrom = params?.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dateTo = params?.dateTo || new Date();

      if (agentId) {
        // Get specific agent metrics
        const metrics = await this.calculateAgentMetrics(agentId, dateFrom, dateTo);
        return [metrics];
      } else {
        // Get all agents' metrics
        const agentIds = await this.getAllAgentIds();
        const allMetrics = await Promise.all(
          agentIds.map(id => this.calculateAgentMetrics(id, dateFrom, dateTo))
        );
        return allMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue);
      }
    } catch (error) {
      Logger.error('Error getting agent performance', error);
      throw new Error('Failed to retrieve agent performance metrics');
    }
  }

  /**
   * Get daily breakdown for specified period
   */
  static async getDailyBreakdown(dateFrom: Date, dateTo: Date): Promise<DailyMetric[]> {
    try {
      Logger.info('Getting daily breakdown', { dateFrom, dateTo });

      const days = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
      const breakdown: DailyMetric[] = [];

      for (let i = 0; i < Math.min(days, 30); i++) {
        const date = new Date(dateFrom);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        // Mock data - in real implementation, this would query the database
        const revenue = Math.random() * 5000 + 1000;
        const transactions = Math.floor(Math.random() * 20 + 5);
        const volume = revenue;
        const fees = revenue * 0.029 + transactions * 0.3;

        breakdown.push({
          date: dateStr,
          revenue: Math.round(revenue * 100) / 100,
          volume: Math.round(volume * 100) / 100,
          transactions,
          fees: Math.round(fees * 100) / 100,
          successRate: 95 + Math.random() * 5,
          averageProcessingTime: 1.5 + Math.random() * 1,
        });
      }

      return breakdown;
    } catch (error) {
      Logger.error('Error getting daily breakdown', error);
      throw new Error('Failed to retrieve daily breakdown');
    }
  }

  // Private helper methods for calculations

  private static async calculateTotalRevenue(dateFrom: Date, dateTo: Date): Promise<number> {
    // Mock calculation - in real implementation, this would query the database
    const days = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
    const averageDailyRevenue = 8500;
    return Math.round(days * averageDailyRevenue * 100) / 100;
  }

  private static async calculateTotalFees(dateFrom: Date, dateTo: Date): Promise<number> {
    const revenue = await this.calculateTotalRevenue(dateFrom, dateTo);
    return Math.round(revenue * 0.029 * 100) / 100; // 2.9% fee
  }

  private static async calculateVolume(
    period: 'daily' | 'weekly' | 'monthly',
    dateFrom: Date,
    dateTo: Date
  ): Promise<number> {
    const totalRevenue = await this.calculateTotalRevenue(dateFrom, dateTo);
    const periods = period === 'daily' ? 30 : period === 'weekly' ? 4 : 1;
    return Math.round((totalRevenue / periods) * 100) / 100;
  }

  private static async calculateSuccessRate(dateFrom: Date, dateTo: Date): Promise<number> {
    // Mock success rate between 95-99%
    return Math.round((95 + Math.random() * 4) * 100) / 100;
  }

  private static async calculateAverageProcessingTime(
    dateFrom: Date,
    dateTo: Date
  ): Promise<number> {
    // Mock processing time between 1.5-3.5 hours
    return Math.round((1.5 + Math.random() * 2) * 100) / 100;
  }

  private static async calculateGrowthRate(
    metric: 'revenue' | 'volume' | 'fees',
    dateFrom: Date,
    dateTo: Date
  ): Promise<number> {
    // Mock growth rate between -5% to +15%
    return Math.round((Math.random() * 20 - 5) * 100) / 100;
  }

  private static async getTopAgent(dateFrom: Date, dateTo: Date): Promise<AgentMetrics | null> {
    const agents = await this.getAgentPerformance(undefined, { dateFrom, dateTo });
    return agents.length > 0 ? agents[0] : null;
  }

  private static async calculateAverageAgentRevenue(dateFrom: Date, dateTo: Date): Promise<number> {
    const agents = await this.getAgentPerformance(undefined, { dateFrom, dateTo });
    if (agents.length === 0) return 0;

    const totalRevenue = agents.reduce((sum, agent) => sum + agent.totalRevenue, 0);
    return Math.round((totalRevenue / agents.length) * 100) / 100;
  }

  private static async calculateAgentMetrics(
    agentId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<AgentMetrics> {
    // Mock agent metrics - in real implementation, this would query the database
    const totalRevenue = Math.random() * 10000 + 5000;
    const totalTransactions = Math.floor(Math.random() * 50 + 10);
    const successRate = 92 + Math.random() * 8;

    return {
      agentId,
      agentName: `Agent ${agentId.split('_')[1]}`,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalVolume: Math.round(totalRevenue * 100) / 100,
      totalTransactions,
      successRate: Math.round(successRate * 100) / 100,
      averageProcessingTime: 2 + Math.random(),
      commissionEarned: Math.round(totalRevenue * 0.05 * 100) / 100, // 5% commission
      period: `${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`,
    };
  }

  private static async getAllAgentIds(): Promise<string[]> {
    // Mock agent IDs - in real implementation, this would query the database
    return ['agent_123', 'agent_456', 'agent_789', 'agent_101', 'agent_202'];
  }

  private static async getWeeklyBreakdown(dateFrom: Date, dateTo: Date): Promise<WeeklyMetric[]> {
    // Simplified implementation - in real implementation, this would aggregate daily data
    const weeks = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const breakdown: WeeklyMetric[] = [];

    for (let i = 0; i < Math.min(weeks, 4); i++) {
      const weekStart = new Date(dateFrom);
      weekStart.setDate(weekStart.getDate() + i * 7);

      breakdown.push({
        week: `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getDate() - weekStart.getDay() + 1) / 7)}`,
        revenue: Math.round((Math.random() * 30000 + 10000) * 100) / 100,
        volume: Math.round((Math.random() * 30000 + 10000) * 100) / 100,
        transactions: Math.floor(Math.random() * 150 + 50),
        fees: Math.round((Math.random() * 900 + 300) * 100) / 100,
        successRate: 95 + Math.random() * 5,
        averageProcessingTime: 1.5 + Math.random() * 1,
      });
    }

    return breakdown;
  }

  private static async getMonthlyBreakdown(dateFrom: Date, dateTo: Date): Promise<MonthlyMetric[]> {
    // Simplified implementation - in real implementation, this would aggregate weekly data
    const months = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const breakdown: MonthlyMetric[] = [];

    for (let i = 0; i < Math.min(months, 12); i++) {
      const monthStart = new Date(dateFrom);
      monthStart.setMonth(monthStart.getMonth() + i);

      breakdown.push({
        month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
        revenue: Math.round((Math.random() * 120000 + 40000) * 100) / 100,
        volume: Math.round((Math.random() * 120000 + 40000) * 100) / 100,
        transactions: Math.floor(Math.random() * 600 + 200),
        fees: Math.round((Math.random() * 3600 + 1200) * 100) / 100,
        successRate: 95 + Math.random() * 5,
        averageProcessingTime: 1.5 + Math.random() * 1,
      });
    }

    return breakdown;
  }

  private static async getTotalTransactions(dateFrom: Date, dateTo: Date): Promise<number> {
    const days = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
    const averageDailyTransactions = 18;
    return Math.floor(days * averageDailyTransactions);
  }

  private static async getActiveMerchants(dateFrom: Date, dateTo: Date): Promise<number> {
    // Mock active merchants count
    return Math.floor(Math.random() * 50 + 20);
  }

  private static async getActiveAgents(dateFrom: Date, dateTo: Date): Promise<number> {
    // Mock active agents count
    return Math.floor(Math.random() * 20 + 5);
  }
}
