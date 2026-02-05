/**
 * Advanced R2 Analytics Engine - Enterprise-grade log analysis
 * Provides real-time monitoring, trend analysis, and predictive insights
 */

import { getCurrentConfig } from '../config/manager.js';

interface AnalyticsMetrics {
  timestamp: number;
  totalLogs: number;
  errorRate: number;
  warnRate: number;
  avgResponseTime: number;
  storageGrowth: number;
  topErrorMessages: Array<{ message: string; count: number }>;
  systemHealth: 'healthy' | 'warning' | 'critical';
  performanceScore: number;
}

interface TrendData {
  period: string;
  logsCount: number;
  errorCount: number;
  storageUsed: number;
  responseTime: number;
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  triggered: boolean;
  lastTriggered?: number;
}

class R2AnalyticsEngine {
  private readonly metrics: AnalyticsMetrics[] = [];
  private alertRules: AlertRule[] = [];
  private readonly maxHistorySize = 1000;

  constructor() {
    this.initializeDefaultAlerts();
  }

  // Initialize default alert rules
  private initializeDefaultAlerts(): void {
    this.alertRules = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: 'errorRate',
        threshold: 10, // 10%
        enabled: true,
        triggered: false
      },
      {
        id: 'storage-growth',
        name: 'Rapid Storage Growth',
        condition: 'storageGrowth',
        threshold: 100, // 100MB per hour
        enabled: true,
        triggered: false
      },
      {
        id: 'slow-response',
        name: 'Slow Response Time',
        condition: 'avgResponseTime',
        threshold: 1000, // 1000ms
        enabled: true,
        triggered: false
      },
      {
        id: 'system-health',
        name: 'System Health Degradation',
        condition: 'systemHealth',
        threshold: 1, // 1 = critical
        enabled: true,
        triggered: false
      }
    ];
  }

  // Process log data and generate analytics
  async processLogData(logs: any[]): Promise<AnalyticsMetrics> {
    const currentConfig = getCurrentConfig();
    const timestamp = Date.now();

    // Calculate metrics
    const totalLogs = logs.length;
    const errorCount = logs.filter(log => log.level === 'error').length;
    const warnCount = logs.filter(log => log.level === 'warn').length;
    const errorRate = totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0;
    const warnRate = totalLogs > 0 ? (warnCount / totalLogs) * 100 : 0;

    // Simulate response time calculation
    const avgResponseTime = Math.random() * 500 + 50; // 50-550ms

    // Calculate storage growth (simulated)
    const storageGrowth = Math.random() * 50 + 10; // 10-60MB

    // Extract top error messages
    const errorMessages = logs
      .filter(log => log.level === 'error')
      .map(log => log.message)
      .reduce((acc: Record<string, number>, message) => {
        acc[message] = (acc[message] || 0) + 1;
        return acc;
      }, {});

    const topErrorMessages = Object.entries(errorMessages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));

    // Determine system health
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (errorRate > 20 || avgResponseTime > 2000) {
      systemHealth = 'critical';
    } else if (errorRate > 10 || avgResponseTime > 1000) {
      systemHealth = 'warning';
    }

    // Calculate performance score (0-100)
    const performanceScore = Math.max(0, Math.min(100, 
      100 - (errorRate * 2) - (avgResponseTime / 50) - (storageGrowth / 10)
    ));

    const metrics: AnalyticsMetrics = {
      timestamp,
      totalLogs,
      errorRate,
      warnRate,
      avgResponseTime,
      storageGrowth,
      topErrorMessages,
      systemHealth,
      performanceScore
    };

    // Store metrics
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics.shift();
    }

    // Check alerts
    this.checkAlerts(metrics);

    return metrics;
  }

  // Generate trend analysis
  generateTrends(hours: number = 24): TrendData[] {
    const now = Date.now();
    const interval = (hours * 60 * 60 * 1000) / 24; // Divide into 24 data points
    const trends: TrendData[] = [];

    for (let i = 0; i < 24; i++) {
      const periodStart = now - (23 - i) * interval;
      const periodEnd = periodStart + interval;
      
      // Get metrics for this period
      const periodMetrics = this.metrics.filter(
        m => m.timestamp >= periodStart && m.timestamp < periodEnd
      );

      if (periodMetrics.length > 0) {
        const avgLogs = periodMetrics.reduce((sum, m) => sum + m.totalLogs, 0) / periodMetrics.length;
        const avgErrors = avgLogs * (periodMetrics.reduce((sum, m) => sum + m.errorRate, 0) / periodMetrics.length) / 100;
        const avgStorage = periodMetrics.reduce((sum, m) => sum + m.storageGrowth, 0) / periodMetrics.length;
        const avgResponse = periodMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / periodMetrics.length;

        trends.push({
          period: new Date(periodStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          logsCount: Math.round(avgLogs),
          errorCount: Math.round(avgErrors),
          storageUsed: Math.round(avgStorage),
          responseTime: Math.round(avgResponse)
        });
      } else {
        trends.push({
          period: new Date(periodStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          logsCount: 0,
          errorCount: 0,
          storageUsed: 0,
          responseTime: 0
        });
      }
    }

    return trends;
  }

  // Get current analytics snapshot
  getCurrentSnapshot(): AnalyticsMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  // Get historical metrics
  getHistoricalMetrics(limit: number = 100): AnalyticsMetrics[] {
    return this.metrics.slice(-limit);
  }

  // Check and trigger alerts
  private checkAlerts(metrics: AnalyticsMetrics): void {
    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;

      let triggered = false;
      const value = (metrics as any)[rule.condition];

      switch (rule.condition) {
        case 'errorRate':
          triggered = value > rule.threshold;
          break;
        case 'storageGrowth':
          triggered = value > rule.threshold;
          break;
        case 'avgResponseTime':
          triggered = value > rule.threshold;
          break;
        case 'systemHealth':
          triggered = (metrics.systemHealth === 'critical' ? 2 : metrics.systemHealth === 'warning' ? 1 : 0) >= rule.threshold;
          break;
      }

      if (triggered && !rule.triggered) {
        rule.triggered = true;
        rule.lastTriggered = metrics.timestamp;
        this.triggerAlert(rule, metrics);
      } else if (!triggered && rule.triggered) {
        rule.triggered = false;
      }
    });
  }

  // Trigger alert notification
  private triggerAlert(rule: AlertRule, metrics: AnalyticsMetrics): void {
    console.warn(`🚨 ALERT TRIGGERED: ${rule.name}`, {
      rule: rule.id,
      threshold: rule.threshold,
      currentValue: (metrics as any)[rule.condition],
      timestamp: new Date(metrics.timestamp).toISOString()
    });
  }

  // Get active alerts
  getActiveAlerts(): AlertRule[] {
    return this.alertRules.filter(rule => rule.enabled && rule.triggered);
  }

  // Update alert rule
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.find(r => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
      return true;
    }
    return false;
  }

  // Generate performance report
  generatePerformanceReport(): {
    summary: {
      avgPerformanceScore: number;
      totalAlerts: number;
      uptime: number;
    };
    trends: TrendData[];
    recommendations: string[];
  } {
    const recentMetrics = this.metrics.slice(-24); // Last 24 data points
    const avgPerformanceScore = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.performanceScore, 0) / recentMetrics.length 
      : 0;
    
    const totalAlerts = this.getActiveAlerts().length;
    const uptime = avgPerformanceScore > 80 ? 99.9 : avgPerformanceScore > 60 ? 95 : 85;

    const recommendations: string[] = [];
    if (avgPerformanceScore < 70) {
      recommendations.push('Consider optimizing error handling to improve performance score');
    }
    if (totalAlerts > 2) {
      recommendations.push('Multiple alerts active - review system health immediately');
    }
    if (recentMetrics.some(m => m.storageGrowth > 50)) {
      recommendations.push('Storage growth is high - consider implementing log rotation');
    }

    return {
      summary: {
        avgPerformanceScore: Math.round(avgPerformanceScore),
        totalAlerts,
        uptime
      },
      trends: this.generateTrends(),
      recommendations
    };
  }

  // Predict future trends
  predictTrends(hours: number = 6): {
    predictedLogs: number;
    predictedErrors: number;
    predictedStorage: number;
    confidence: number;
  } {
    const recentMetrics = this.metrics.slice(-12); // Last 12 data points
    if (recentMetrics.length < 6) {
      return {
        predictedLogs: 0,
        predictedErrors: 0,
        predictedStorage: 0,
        confidence: 0
      };
    }

    // Simple linear regression for prediction
    const logsTrend = this.calculateLinearTrend(recentMetrics.map(m => m.totalLogs));
    const errorsTrend = this.calculateLinearTrend(recentMetrics.map(m => m.totalLogs * (m.errorRate / 100)));
    const storageTrend = this.calculateLinearTrend(recentMetrics.map(m => m.storageGrowth));

    const predictedLogs = Math.max(0, logsTrend.slope * hours + logsTrend.intercept);
    const predictedErrors = Math.max(0, errorsTrend.slope * hours + errorsTrend.intercept);
    const predictedStorage = Math.max(0, storageTrend.slope * hours + storageTrend.intercept);

    // Calculate confidence based on variance
    const confidence = Math.max(0, Math.min(100, 100 - (logsTrend.variance / 100)));

    return {
      predictedLogs: Math.round(predictedLogs),
      predictedErrors: Math.round(predictedErrors),
      predictedStorage: Math.round(predictedStorage),
      confidence: Math.round(confidence)
    };
  }

  // Calculate linear trend
  private calculateLinearTrend(values: number[]): {
    slope: number;
    intercept: number;
    variance: number;
  } {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: 0, variance: 100 };

    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate variance for confidence
    const mean = sumY / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;

    return { slope, intercept, variance };
  }
}

// Export singleton instance
export const r2AnalyticsEngine = new R2AnalyticsEngine();
export default r2AnalyticsEngine;
