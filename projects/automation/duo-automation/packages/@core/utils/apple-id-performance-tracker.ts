#!/usr/bin/env bun

/**
 * Apple ID Performance Tracking and Analytics
 * Tracks real-world performance of grading system recommendations
 */

import { AppleIDGradingSystem, AppleIDConfiguration } from './apple-id-grading-system.js';

export interface PerformanceRecord {
  id: string;
  timestamp: number;
  configuration: AppleIDConfiguration;
  actualResults: {
    accountsCreated: number;
    accountsSuccessful: number;
    successRate: number;
    averageCreationTime: number;
    costPerAccount: number;
    totalCost: number;
    roi: number;
  };
  metadata: {
    operator: string;
    batchId?: string;
    notes?: string;
    environment: 'production' | 'testing' | 'development';
  };
  validation: {
    predictedSuccessRate: number;
    predictedROI: number;
    accuracy: number; // How close prediction was to reality
    recommendations: string[];
  };
}

export interface PerformanceAnalytics {
  overall: {
    totalRecords: number;
    averageAccuracy: number;
    averageROI: number;
    totalAccountsCreated: number;
    totalSuccessfulAccounts: number;
    overallSuccessRate: number;
  };
  byTier: Record<string, {
    count: number;
    averageAccuracy: number;
    averageROI: number;
    successRate: number;
  }>;
  byComponent: {
    phone: Record<string, PerformanceMetrics>;
    identity: Record<string, PerformanceMetrics>;
    warmup: Record<string, PerformanceMetrics>;
    device: Record<string, PerformanceMetrics>;
    sim: Record<string, PerformanceMetrics>;
  };
  trends: {
    accuracyOverTime: Array<{ date: string; accuracy: number }>;
    roiOverTime: Array<{ date: string; roi: number }>;
    successRateOverTime: Array<{ date: string; successRate: number }>;
  };
}

export interface PerformanceMetrics {
  count: number;
  averageAccuracy: number;
  averageROI: number;
  successRate: number;
  averageCost: number;
}

export class AppleIDPerformanceTracker {
  private static readonly STORAGE_KEY = 'apple_id_performance_records';
  private records: PerformanceRecord[] = [];

  constructor() {
    this.loadRecords();
  }

  /**
   * Record a new performance result
   */
  recordPerformance(
    configuration: AppleIDConfiguration,
    accountsCreated: number,
    accountsSuccessful: number,
    averageCreationTime: number,
    metadata: Partial<PerformanceRecord['metadata']> = {}
  ): PerformanceRecord {
    const record: PerformanceRecord = {
      id: this.generateId(),
      timestamp: Date.now(),
      configuration,
      actualResults: {
        accountsCreated,
        accountsSuccessful,
        successRate: accountsSuccessful / accountsCreated,
        averageCreationTime,
        costPerAccount: configuration.totalCost,
        totalCost: configuration.totalCost * accountsCreated,
        roi: ((accountsSuccessful * 50) - (configuration.totalCost * accountsCreated)) / (configuration.totalCost * accountsCreated) * 100
      },
      metadata: {
        operator: metadata.operator || 'unknown',
        batchId: metadata.batchId,
        notes: metadata.notes,
        environment: metadata.environment || 'production'
      },
      validation: {
        predictedSuccessRate: configuration.expectedSuccessRate,
        predictedROI: configuration.roi,
        accuracy: 1 - Math.abs(configuration.expectedSuccessRate - (accountsSuccessful / accountsCreated)),
        recommendations: this.generateRecommendations(configuration, accountsSuccessful / accountsCreated)
      }
    };

    this.records.push(record);
    this.saveRecords();

    return record;
  }

  /**
   * Get comprehensive performance analytics
   */
  getAnalytics(timeRange?: { start: number; end: number }): PerformanceAnalytics {
    let filteredRecords = this.records;

    if (timeRange) {
      filteredRecords = this.records.filter(r =>
        r.timestamp >= timeRange.start && r.timestamp <= timeRange.end
      );
    }

    const byTier = this.groupByTier(filteredRecords);
    const byComponent = this.analyzeByComponent(filteredRecords);
    const trends = this.calculateTrends(filteredRecords);

    const totalRecords = filteredRecords.length;
    const totalAccountsCreated = filteredRecords.reduce((sum, r) => sum + r.actualResults.accountsCreated, 0);
    const totalSuccessfulAccounts = filteredRecords.reduce((sum, r) => sum + r.actualResults.accountsSuccessful, 0);

    return {
      overall: {
        totalRecords,
        averageAccuracy: filteredRecords.reduce((sum, r) => sum + r.validation.accuracy, 0) / totalRecords || 0,
        averageROI: filteredRecords.reduce((sum, r) => sum + r.actualResults.roi, 0) / totalRecords || 0,
        totalAccountsCreated,
        totalSuccessfulAccounts,
        overallSuccessRate: totalSuccessfulAccounts / totalAccountsCreated || 0
      },
      byTier,
      byComponent,
      trends
    };
  }

  /**
   * Get optimization recommendations based on performance data
   */
  getOptimizationRecommendations(): string[] {
    const analytics = this.getAnalytics();

    const recommendations: string[] = [];

    // Check tier performance
    const bestTier = Object.entries(analytics.byTier)
      .sort(([, a], [, b]) => b.averageAccuracy - a.averageAccuracy)[0];

    if (bestTier) {
      recommendations.push(`Focus on ${bestTier[0]} tier configurations (${(bestTier[1].averageAccuracy * 100).toFixed(1)}% accuracy)`);
    }

    // Check component performance
    const componentRankings = Object.entries(analytics.byComponent)
      .map(([component, data]) => ({
        component,
        bestPerformer: Object.entries(data)
          .sort(([, a], [, b]) => b.averageAccuracy - a.averageAccuracy)[0]
      }))
      .filter(item => item.bestPerformer);

    componentRankings.forEach(({ component, bestPerformer }) => {
      if (bestPerformer[1].count > 2) { // Only recommend if we have enough data
        recommendations.push(`For ${component}: Prefer ${bestPerformer[0]} (${(bestPerformer[1].averageAccuracy * 100).toFixed(1)}% accuracy)`);
      }
    });

    // Check trends
    if (analytics.trends.accuracyOverTime.length > 1) {
      const recent = analytics.trends.accuracyOverTime.slice(-3);
      const older = analytics.trends.accuracyOverTime.slice(-6, -3);

      const recentAvg = recent.reduce((sum, d) => sum + d.accuracy, 0) / recent.length;
      const olderAvg = older.reduce((sum, d) => sum + d.accuracy, 0) / older.length;

      if (recentAvg > olderAvg + 0.05) {
        recommendations.push('Prediction accuracy is improving - continue current optimization strategy');
      } else if (recentAvg < olderAvg - 0.05) {
        recommendations.push('Prediction accuracy is declining - review recent configuration changes');
      }
    }

    return recommendations;
  }

  /**
   * Find optimal configurations based on historical performance
   */
  getOptimalConfigurations(limit: number = 5): AppleIDConfiguration[] {
    const scoredRecords = this.records.map(record => ({
      record,
      score: this.calculateConfigurationScore(record)
    }));

    return scoredRecords
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.record.configuration);
  }

  /**
   * Export performance data for analysis
   */
  exportData(): string {
    const analytics = this.getAnalytics();

    let csv = 'Date,Configuration,Tier,Predicted Success,Actual Success,Accuracy,ROI,Cost,Accounts Created,Accounts Successful,Operator,Environment\n';

    this.records.forEach(record => {
      csv += [
        new Date(record.timestamp).toISOString(),
        `"${record.configuration.grade} (${record.configuration.totalCost})"`,
        record.configuration.grade,
        (record.configuration.expectedSuccessRate * 100).toFixed(2),
        (record.actualResults.successRate * 100).toFixed(2),
        (record.validation.accuracy * 100).toFixed(2),
        record.actualResults.roi.toFixed(2),
        record.actualResults.totalCost.toFixed(2),
        record.actualResults.accountsCreated,
        record.actualResults.accountsSuccessful,
        record.metadata.operator,
        record.metadata.environment
      ].join(',') + '\n';
    });

    return csv;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private calculateConfigurationScore(record: PerformanceRecord): number {
    const accuracy = record.validation.accuracy;
    const roi = Math.max(0, record.actualResults.roi) / 100; // Normalize to 0-1
    const volume = Math.min(record.actualResults.accountsCreated / 100, 1); // Cap at 100 accounts

    // Weighted score: 40% accuracy, 40% ROI, 20% volume
    return (accuracy * 0.4) + (roi * 0.4) + (volume * 0.2);
  }

  private generateRecommendations(
    config: AppleIDConfiguration,
    actualSuccessRate: number
  ): string[] {
    const recommendations: string[] = [];
    const predictedSuccess = config.expectedSuccessRate;

    if (Math.abs(predictedSuccess - actualSuccessRate) > 0.1) {
      if (actualSuccessRate > predictedSuccess) {
        recommendations.push('Configuration performed better than predicted - consider scaling up');
      } else {
        recommendations.push('Configuration underperformed - review component choices');
      }
    }

    if (config.roi > 150) {
      recommendations.push('High ROI configuration - prioritize for production');
    }

    return recommendations;
  }

  private groupByTier(records: PerformanceRecord[]): Record<string, PerformanceMetrics> {
    const tiers: Record<string, PerformanceRecord[]> = {};

    records.forEach(record => {
      const tier = record.configuration.grade;
      if (!tiers[tier]) tiers[tier] = [];
      tiers[tier].push(record);
    });

    const result: Record<string, PerformanceMetrics> = {};

    Object.entries(tiers).forEach(([tier, tierRecords]) => {
      result[tier] = {
        count: tierRecords.length,
        averageAccuracy: tierRecords.reduce((sum, r) => sum + r.validation.accuracy, 0) / tierRecords.length,
        averageROI: tierRecords.reduce((sum, r) => sum + r.actualResults.roi, 0) / tierRecords.length,
        successRate: tierRecords.reduce((sum, r) => sum + r.actualResults.successRate, 0) / tierRecords.length,
        averageCost: tierRecords.reduce((sum, r) => sum + r.actualResults.costPerAccount, 0) / tierRecords.length
      };
    });

    return result;
  }

  private analyzeByComponent(records: PerformanceRecord[]): PerformanceAnalytics['byComponent'] {
    const components = {
      phone: {} as Record<string, PerformanceRecord[]>,
      identity: {} as Record<string, PerformanceRecord[]>,
      warmup: {} as Record<string, PerformanceRecord[]>,
      device: {} as Record<string, PerformanceRecord[]>,
      sim: {} as Record<string, PerformanceRecord[]>
    };

    // Group records by component
    records.forEach(record => {
      const config = record.configuration;
      this.addToComponentGroup(components.phone, config.phone.provider, record);
      this.addToComponentGroup(components.identity, config.identity.type, record);
      this.addToComponentGroup(components.warmup, `${config.warmup.duration} days`, record);
      this.addToComponentGroup(components.device, config.device.type, record);
      this.addToComponentGroup(components.sim, config.sim.type, record);
    });

    // Calculate metrics for each component group
    return {
      phone: this.calculateComponentMetrics(components.phone),
      identity: this.calculateComponentMetrics(components.identity),
      warmup: this.calculateComponentMetrics(components.warmup),
      device: this.calculateComponentMetrics(components.device),
      sim: this.calculateComponentMetrics(components.sim)
    };
  }

  private addToComponentGroup(
    group: Record<string, PerformanceRecord[]>,
    key: string,
    record: PerformanceRecord
  ): void {
    if (!group[key]) group[key] = [];
    group[key].push(record);
  }

  private calculateComponentMetrics(groups: Record<string, PerformanceRecord[]>): Record<string, PerformanceMetrics> {
    const result: Record<string, PerformanceMetrics> = {};

    Object.entries(groups).forEach(([component, records]) => {
      if (records.length > 0) {
        result[component] = {
          count: records.length,
          averageAccuracy: records.reduce((sum, r) => sum + r.validation.accuracy, 0) / records.length,
          averageROI: records.reduce((sum, r) => sum + r.actualResults.roi, 0) / records.length,
          successRate: records.reduce((sum, r) => sum + r.actualResults.successRate, 0) / records.length,
          averageCost: records.reduce((sum, r) => sum + r.configuration.totalCost, 0) / records.length
        };
      }
    });

    return result;
  }

  private calculateTrends(records: PerformanceRecord[]): PerformanceAnalytics['trends'] {
    // Group by week
    const weeklyData: Record<string, PerformanceRecord[]> = {};

    records.forEach(record => {
      const date = new Date(record.timestamp);
      const weekKey = `${date.getFullYear()}-W${Math.ceil((date.getDate() - date.getDay() + 1) / 7)}`;

      if (!weeklyData[weekKey]) weeklyData[weekKey] = [];
      weeklyData[weekKey].push(record);
    });

    const accuracyOverTime: Array<{ date: string; accuracy: number }> = [];
    const roiOverTime: Array<{ date: string; roi: number }> = [];
    const successRateOverTime: Array<{ date: string; successRate: number }> = [];

    Object.entries(weeklyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([week, weekRecords]) => {
        accuracyOverTime.push({
          date: week,
          accuracy: weekRecords.reduce((sum, r) => sum + r.validation.accuracy, 0) / weekRecords.length
        });

        roiOverTime.push({
          date: week,
          roi: weekRecords.reduce((sum, r) => sum + r.actualResults.roi, 0) / weekRecords.length
        });

        successRateOverTime.push({
          date: week,
          successRate: weekRecords.reduce((sum, r) => sum + r.actualResults.successRate, 0) / weekRecords.length
        });
      });

    return {
      accuracyOverTime,
      roiOverTime,
      successRateOverTime
    };
  }

  private loadRecords(): void {
    try {
      // Use file-based storage for server-side persistence
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.join(process.cwd(), 'data');
      const filePath = path.join(dataDir, 'apple-id-performance-records.json');

      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        this.records = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load performance records:', error);
      this.records = [];
    }
  }

  private saveRecords(): void {
    try {
      // Use file-based storage for server-side persistence
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.join(process.cwd(), 'data');

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const filePath = path.join(dataDir, 'apple-id-performance-records.json');
      fs.writeFileSync(filePath, JSON.stringify(this.records, null, 2));
    } catch (error) {
      console.warn('Failed to save performance records:', error);
    }
  }

  /**
   * Clear all performance records
   */
  clearRecords(): void {
    this.records = [];
    this.saveRecords();
  }

  /**
   * Get records count
   */
  getRecordsCount(): number {
    return this.records.length;
  }
}

// Export singleton instance
export const performanceTracker = new AppleIDPerformanceTracker();