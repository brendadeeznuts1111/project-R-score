/**
 * Enhanced Balance Management System
 *
 * Implements:
 * 1. Balance validation with min/max limits
 * 2. Enhanced audit trail for balance changes
 * 3. Balance threshold notifications
 * 4. Balance trend analysis and reporting
 */

import { Bun } from 'bun';

// !== TYPES & INTERFACES !==

export interface BalanceValidationRules {
  minBalance: number;
  maxBalance: number;
  warningThreshold: number;
  criticalThreshold: number;
  dailyChangeLimit: number;
  weeklyChangeLimit: number;
}

export interface BalanceChangeEvent {
  id: string;
  customerId: string;
  agentId: string;
  timestamp: string;
  changeType: 'deposit' | 'withdrawal' | 'wager' | 'settlement' | 'adjustment' | 'system';
  previousBalance: number;
  newBalance: number;
  changeAmount: number;
  reason: string;
  performedBy: string;
  metadata?: Record<string, any>;
  riskScore?: number;
}

export interface BalanceThresholdAlert {
  id: string;
  customerId: string;
  alertType: 'warning' | 'critical' | 'limit_exceeded';
  threshold: number;
  currentBalance: number;
  timestamp: string;
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface BalanceAnalytics {
  customerId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  startingBalance: number;
  endingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalWagers: number;
  totalSettlements: number;
  netChange: number;
  changePercentage: number;
  volatilityScore: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
}

// !== BALANCE VALIDATION !==

export class BalanceValidator {
  private static readonly DEFAULT_RULES: BalanceValidationRules = {
    minBalance: -10000, // Allow negative balance up to $10K
    maxBalance: 1000000, // Max balance $1M
    warningThreshold: 1000, // Warning below $1K
    criticalThreshold: 100, // Critical below $100
    dailyChangeLimit: 50000, // Max daily change $50K
    weeklyChangeLimit: 200000, // Max weekly change $200K
  };

  static validateBalanceChange(
    currentBalance: number,
    changeAmount: number,
    rules: Partial<BalanceValidationRules> = {}
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const appliedRules = { ...this.DEFAULT_RULES, ...rules };
    const newBalance = currentBalance + changeAmount;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check minimum balance
    if (newBalance < appliedRules.minBalance) {
      errors.push(`Balance would exceed minimum limit: $${appliedRules.minBalance}`);
    }

    // Check maximum balance
    if (newBalance > appliedRules.maxBalance) {
      errors.push(`Balance would exceed maximum limit: $${appliedRules.maxBalance}`);
    }

    // Check daily change limit
    if (Math.abs(changeAmount) > appliedRules.dailyChangeLimit) {
      errors.push(`Change amount exceeds daily limit: $${appliedRules.dailyChangeLimit}`);
    }

    // Check warning thresholds
    if (
      newBalance < appliedRules.warningThreshold &&
      newBalance >= appliedRules.criticalThreshold
    ) {
      warnings.push(`Balance below warning threshold: $${appliedRules.warningThreshold}`);
    }

    // Check critical threshold
    if (newBalance < appliedRules.criticalThreshold) {
      warnings.push(`Balance below critical threshold: $${appliedRules.criticalThreshold}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static getValidationRulesForVIP(vipLevel: string): BalanceValidationRules {
    const baseRules = { ...this.DEFAULT_RULES };

    switch (vipLevel.toLowerCase()) {
      case 'diamond':
        return {
          ...baseRules,
          minBalance: -50000,
          maxBalance: 5000000,
          dailyChangeLimit: 500000,
          weeklyChangeLimit: 2000000,
        };
      case 'platinum':
        return {
          ...baseRules,
          minBalance: -25000,
          maxBalance: 2500000,
          dailyChangeLimit: 250000,
          weeklyChangeLimit: 1000000,
        };
      case 'gold':
        return {
          ...baseRules,
          minBalance: -15000,
          maxBalance: 1500000,
          dailyChangeLimit: 150000,
          weeklyChangeLimit: 750000,
        };
      case 'silver':
        return {
          ...baseRules,
          minBalance: -10000,
          maxBalance: 1000000,
          dailyChangeLimit: 100000,
          weeklyChangeLimit: 500000,
        };
      default: // bronze
        return baseRules;
    }
  }
}

// !== AUDIT TRAIL !==

export class BalanceAuditTrail {
  private static readonly AUDIT_TABLE = 'balance_audit_trail';
  private static readonly ALERTS_TABLE = 'balance_threshold_alerts';

  static async logBalanceChange(event: BalanceChangeEvent): Promise<void> {
    try {
      // Insert into audit trail
      const auditQuery = `
        INSERT INTO ${this.AUDIT_TABLE} (
          id, customer_id, agent_id, timestamp, change_type, 
          previous_balance, new_balance, change_amount, reason, 
          performed_by, metadata, risk_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await Bun.sqlite
        .query(auditQuery)
        .run(
          event.id,
          event.customerId,
          event.agentId,
          event.timestamp,
          event.changeType,
          event.previousBalance,
          event.newBalance,
          event.changeAmount,
          event.reason,
          event.performedBy,
          JSON.stringify(event.metadata || {}),
          event.riskScore || 0
        );
    } catch (error) {
      console.error('❌ Failed to log balance change:', error);
      throw error;
    }
  }

  static async getBalanceHistory(
    customerId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<BalanceChangeEvent[]> {
    try {
      const query = `
        SELECT * FROM ${this.AUDIT_TABLE} 
        WHERE customer_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
      `;

      const result = await Bun.sqlite.query(query).all(customerId, limit, offset);

      return result.map(row => ({
        id: row.id,
        customerId: row.customer_id,
        agentId: row.agent_id,
        timestamp: row.timestamp,
        changeType: row.change_type,
        previousBalance: row.previous_balance,
        newBalance: row.new_balance,
        changeAmount: row.change_amount,
        reason: row.reason,
        performedBy: row.performed_by,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        riskScore: row.risk_score,
      }));
    } catch (error) {
      console.error('❌ Failed to get balance history:', error);
      throw error;
    }
  }

  static async getRecentBalanceChanges(
    hours: number = 24,
    agentId?: string
  ): Promise<BalanceChangeEvent[]> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      let query = `
        SELECT * FROM ${this.AUDIT_TABLE} 
        WHERE timestamp >= ?
      `;
      const params: any[] = [cutoffTime];

      if (agentId) {
        query += ' AND agent_id = ?';
        params.push(agentId);
      }

      query += ' ORDER BY timestamp DESC';

      const result = await Bun.sqlite.query(query).all(...params);

      return result.map(row => ({
        id: row.id,
        customerId: row.customer_id,
        agentId: row.agent_id,
        timestamp: row.timestamp,
        changeType: row.change_type,
        previousBalance: row.previous_balance,
        newBalance: row.new_balance,
        changeAmount: row.change_amount,
        reason: row.reason,
        performedBy: row.performed_by,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        riskScore: row.risk_score,
      }));
    } catch (error) {
      console.error('❌ Failed to get recent balance changes:', error);
      throw error;
    }
  }
}

// !== NOTIFICATIONS !==

export class BalanceNotificationService {
  private static readonly ALERTS_TABLE = 'balance_threshold_alerts';

  static async checkAndCreateAlerts(
    customerId: string,
    currentBalance: number,
    previousBalance: number,
    rules: BalanceValidationRules
  ): Promise<BalanceThresholdAlert[]> {
    const alerts: BalanceThresholdAlert[] = [];

    // Check warning threshold
    if (currentBalance < rules.warningThreshold && currentBalance >= rules.criticalThreshold) {
      alerts.push({
        id: Bun.crypto.randomUUID(),
        customerId,
        alertType: 'warning',
        threshold: rules.warningThreshold,
        currentBalance,
        timestamp: new Date().toISOString(),
        message: `Balance below warning threshold: $${rules.warningThreshold}`,
        acknowledged: false,
      });
    }

    // Check critical threshold
    if (currentBalance < rules.criticalThreshold) {
      alerts.push({
        id: Bun.crypto.randomUUID(),
        customerId,
        alertType: 'critical',
        threshold: rules.criticalThreshold,
        currentBalance,
        timestamp: new Date().toISOString(),
        message: `Balance below critical threshold: $${rules.criticalThreshold}`,
        acknowledged: false,
      });
    }

    // Check if balance dropped significantly
    const dropPercentage = ((previousBalance - currentBalance) / previousBalance) * 100;
    if (dropPercentage > 50 && currentBalance < 1000) {
      alerts.push({
        id: Bun.crypto.randomUUID(),
        customerId,
        alertType: 'warning',
        threshold: 1000,
        currentBalance,
        timestamp: new Date().toISOString(),
        message: `Significant balance drop detected: ${dropPercentage.toFixed(1)}% decrease`,
        acknowledged: false,
      });
    }

    // Save alerts to database
    for (const alert of alerts) {
      await this.saveAlert(alert);
    }

    return alerts;
  }

  private static async saveAlert(alert: BalanceThresholdAlert): Promise<void> {
    try {
      const query = `
        INSERT INTO ${this.ALERTS_TABLE} (
          id, customer_id, alert_type, threshold, current_balance,
          timestamp, message, acknowledged
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await Bun.sqlite
        .query(query)
        .run(
          alert.id,
          alert.customerId,
          alert.alertType,
          alert.threshold,
          alert.currentBalance,
          alert.timestamp,
          alert.message,
          alert.acknowledged ? 1 : 0
        );
    } catch (error) {
      console.error('❌ Failed to save alert:', error);
      throw error;
    }
  }

  static async getActiveAlerts(
    customerId?: string,
    alertType?: string
  ): Promise<BalanceThresholdAlert[]> {
    try {
      let query = `SELECT * FROM ${this.ALERTS_TABLE} WHERE acknowledged = 0`;
      const params: any[] = [];

      if (customerId) {
        query += ' AND customer_id = ?';
        params.push(customerId);
      }

      if (alertType) {
        query += ' AND alert_type = ?';
        params.push(alertType);
      }

      query += ' ORDER BY timestamp DESC';

      const result = await Bun.sqlite.query(query).all(...params);

      return result.map(row => ({
        id: row.id,
        customerId: row.customer_id,
        alertType: row.alert_type,
        threshold: row.threshold,
        currentBalance: row.current_balance,
        timestamp: row.timestamp,
        message: row.message,
        acknowledged: row.acknowledged === 1,
        acknowledgedBy: row.acknowledged_by,
        acknowledgedAt: row.acknowledged_at,
      }));
    } catch (error) {
      console.error('❌ Failed to get active alerts:', error);
      throw error;
    }
  }

  static async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    try {
      const query = `
        UPDATE ${this.ALERTS_TABLE} 
        SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ? 
        WHERE id = ?
      `;

      await Bun.sqlite.query(query).run(acknowledgedBy, new Date().toISOString(), alertId);
    } catch (error) {
      console.error('❌ Failed to acknowledge alert:', error);
      throw error;
    }
  }
}

// !== ANALYTICS !==

export class BalanceAnalyticsService {
  static async generateCustomerAnalytics(
    customerId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  ): Promise<BalanceAnalytics> {
    try {
      const endDate = new Date();
      const startDate = this.getStartDate(endDate, period);

      // Get balance history for the period
      const history = await BalanceAuditTrail.getBalanceHistory(customerId, 1000, 0);
      const periodHistory = history.filter(
        event => new Date(event.timestamp) >= startDate && new Date(event.timestamp) <= endDate
      );

      // Calculate analytics
      const startingBalance = this.getBalanceAtTime(history, startDate);
      const endingBalance = this.getBalanceAtTime(history, endDate);

      const totalDeposits = periodHistory
        .filter(event => event.changeType === 'deposit')
        .reduce((sum, event) => sum + Math.max(0, event.changeAmount), 0);

      const totalWithdrawals = periodHistory
        .filter(event => event.changeType === 'withdrawal')
        .reduce((sum, event) => sum + Math.abs(Math.min(0, event.changeAmount)), 0);

      const totalWagers = periodHistory
        .filter(event => event.changeType === 'wager')
        .reduce((sum, event) => sum + Math.abs(event.changeAmount), 0);

      const totalSettlements = periodHistory
        .filter(event => event.changeType === 'settlement')
        .reduce((sum, event) => sum + event.changeAmount, 0);

      const netChange = endingBalance - startingBalance;
      const changePercentage = startingBalance !== 0 ? (netChange / startingBalance) * 100 : 0;

      const volatilityScore = this.calculateVolatilityScore(periodHistory);
      const trendDirection = this.determineTrendDirection(periodHistory);
      const riskLevel = this.calculateRiskLevel(volatilityScore, changePercentage);

      return {
        customerId,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        startingBalance,
        endingBalance,
        totalDeposits,
        totalWithdrawals,
        totalWagers,
        totalSettlements,
        netChange,
        changePercentage,
        volatilityScore,
        trendDirection,
        riskLevel,
      };
    } catch (error) {
      console.error('❌ Failed to generate customer analytics:', error);
      throw error;
    }
  }

  private static getStartDate(endDate: Date, period: string): Date {
    const startDate = new Date(endDate);

    switch (period) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 1);
    }

    return startDate;
  }

  private static getBalanceAtTime(history: BalanceChangeEvent[], targetTime: Date): number {
    // Find the most recent balance before the target time
    const relevantEvents = history
      .filter(event => new Date(event.timestamp) <= targetTime)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (relevantEvents.length === 0) return 0;

    return relevantEvents[0].newBalance;
  }

  private static calculateVolatilityScore(history: BalanceChangeEvent[]): number {
    if (history.length < 2) return 0;

    const changes = history.map(event => Math.abs(event.changeAmount));
    const mean = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const variance =
      changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / changes.length;

    return Math.sqrt(variance);
  }

  private static determineTrendDirection(
    history: BalanceChangeEvent[]
  ): 'increasing' | 'decreasing' | 'stable' {
    if (history.length < 2) return 'stable';

    const sortedHistory = history.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const firstBalance = sortedHistory[0].newBalance;
    const lastBalance = sortedHistory[sortedHistory.length - 1].newBalance;
    const change = lastBalance - firstBalance;

    if (change > 100) return 'increasing';
    if (change < -100) return 'decreasing';
    return 'stable';
  }

  private static calculateRiskLevel(
    volatilityScore: number,
    changePercentage: number
  ): 'low' | 'medium' | 'high' {
    if (volatilityScore > 10000 || Math.abs(changePercentage) > 50) return 'high';
    if (volatilityScore > 5000 || Math.abs(changePercentage) > 25) return 'medium';
    return 'low';
  }

  static async generateSystemAnalytics(
    agentId?: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<{
    totalCustomers: number;
    totalBalance: number;
    averageBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalWagers: number;
    totalSettlements: number;
    riskDistribution: Record<string, number>;
    topCustomers: Array<{ customerId: string; balance: number; change: number }>;
  }> {
    try {
      // This would integrate with your existing database queries
      // For now, returning mock data structure
      return {
        totalCustomers: 0,
        totalBalance: 0,
        averageBalance: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalWagers: 0,
        totalSettlements: 0,
        riskDistribution: { low: 0, medium: 0, high: 0 },
        topCustomers: [],
      };
    } catch (error) {
      console.error('❌ Failed to generate system analytics:', error);
      throw error;
    }
  }
}

// !== MAIN BALANCE MANAGER !==

export class BalanceManager {
  static async updateBalance(
    customerId: string,
    agentId: string,
    changeAmount: number,
    changeType: BalanceChangeEvent['changeType'],
    reason: string,
    performedBy: string,
    vipLevel: string = 'bronze',
    metadata?: Record<string, any>
  ): Promise<{
    success: boolean;
    newBalance: number;
    validation: { isValid: boolean; errors: string[]; warnings: string[] };
    alerts: BalanceThresholdAlert[];
    event: BalanceChangeEvent;
  }> {
    try {
      // Get current balance (this would integrate with your existing system)
      const currentBalance = await this.getCurrentBalance(customerId);
      const previousBalance = currentBalance;

      // Get validation rules for VIP level
      const rules = BalanceValidator.getValidationRulesForVIP(vipLevel);

      // Validate the balance change
      const validation = BalanceValidator.validateBalanceChange(
        currentBalance,
        changeAmount,
        rules
      );

      if (!validation.isValid) {
        throw new Error(`Balance validation failed: ${validation.errors.join(', ')}`);
      }

      // Calculate new balance
      const newBalance = currentBalance + changeAmount;

      // Create balance change event
      const event: BalanceChangeEvent = {
        id: Bun.crypto.randomUUID(),
        customerId,
        agentId,
        timestamp: new Date().toISOString(),
        changeType,
        previousBalance,
        newBalance,
        changeAmount,
        reason,
        performedBy,
        metadata,
        riskScore: this.calculateRiskScore(changeAmount, currentBalance, vipLevel),
      };

      // Log the balance change
      await BalanceAuditTrail.logBalanceChange(event);

      // Check for alerts
      const alerts = await BalanceNotificationService.checkAndCreateAlerts(
        customerId,
        newBalance,
        previousBalance,
        rules
      );

      // Update the actual balance in your system
      await this.setCurrentBalance(customerId, newBalance);

      return {
        success: true,
        newBalance,
        validation,
        alerts,
        event,
      };
    } catch (error) {
      console.error('❌ Balance update failed:', error);
      throw error;
    }
  }

  private static async getCurrentBalance(customerId: string): Promise<number> {
    // This would integrate with your existing balance retrieval logic
    // For now, returning a mock value
    return 1000;
  }

  private static async setCurrentBalance(customerId: string, balance: number): Promise<void> {
    // This would integrate with your existing balance update logic
  }

  private static calculateRiskScore(
    changeAmount: number,
    currentBalance: number,
    vipLevel: string
  ): number {
    let riskScore = 0;

    // Large changes relative to current balance
    if (Math.abs(changeAmount) > currentBalance * 0.5) riskScore += 20;
    if (Math.abs(changeAmount) > currentBalance * 0.8) riskScore += 30;

    // VIP level adjustments
    if (vipLevel === 'diamond') riskScore -= 10;
    if (vipLevel === 'bronze') riskScore += 10;

    // Negative balance risk
    if (currentBalance < 0) riskScore += 25;

    return Math.max(0, Math.min(100, riskScore));
  }

  static async getCustomerBalanceReport(
    customerId: string,
    includeHistory: boolean = true,
    includeAlerts: boolean = true
  ): Promise<{
    currentBalance: number;
    history?: BalanceChangeEvent[];
    alerts?: BalanceThresholdAlert[];
    analytics?: BalanceAnalytics;
  }> {
    try {
      const currentBalance = await this.getCurrentBalance(customerId);
      const result: any = { currentBalance };

      if (includeHistory) {
        result.history = await BalanceAuditTrail.getBalanceHistory(customerId, 50);
      }

      if (includeAlerts) {
        result.alerts = await BalanceNotificationService.getActiveAlerts(customerId);
      }

      // Generate analytics for the last 30 days
      result.analytics = await BalanceAnalyticsService.generateCustomerAnalytics(
        customerId,
        'monthly'
      );

      return result;
    } catch (error) {
      console.error('❌ Failed to get customer balance report:', error);
      throw error;
    }
  }
}

// !== DATABASE MIGRATION !==

export async function initializeBalanceTables(): Promise<void> {
  try {
    // Create balance audit trail table
    await Bun.sqlite
      .query(
        `
      CREATE TABLE IF NOT EXISTS balance_audit_trail (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        change_type TEXT NOT NULL,
        previous_balance REAL NOT NULL,
        new_balance REAL NOT NULL,
        change_amount REAL NOT NULL,
        reason TEXT NOT NULL,
        performed_by TEXT NOT NULL,
        metadata TEXT,
        risk_score INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `
      )
      .run();

    // Create balance threshold alerts table
    await Bun.sqlite
      .query(
        `
      CREATE TABLE IF NOT EXISTS balance_threshold_alerts (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        threshold REAL NOT NULL,
        current_balance REAL NOT NULL,
        timestamp TEXT NOT NULL,
        message TEXT NOT NULL,
        acknowledged INTEGER DEFAULT 0,
        acknowledged_by TEXT,
        acknowledged_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `
      )
      .run();

    // Create indexes for performance
    await Bun.sqlite
      .query(
        `
      CREATE INDEX IF NOT EXISTS idx_balance_audit_customer 
      ON balance_audit_trail(customer_id, timestamp)
    `
      )
      .run();

    await Bun.sqlite
      .query(
        `
      CREATE INDEX IF NOT EXISTS idx_balance_alerts_customer 
      ON balance_threshold_alerts(customer_id, acknowledged)
    `
      )
      .run();
  } catch (error) {
    console.error('❌ Failed to initialize balance tables:', error);
    throw error;
  }
}

// Export all classes and functions
export {
  BalanceValidator,
  BalanceAuditTrail,
  BalanceNotificationService,
  BalanceAnalyticsService,
  BalanceManager,
  initializeBalanceTables,
};
