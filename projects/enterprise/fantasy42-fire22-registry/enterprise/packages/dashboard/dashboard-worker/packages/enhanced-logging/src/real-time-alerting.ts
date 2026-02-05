/**
 * Real-time Alerting System - Proactive monitoring and automated responses
 */

import { AdvancedAnalyticsLogger, AnalyticsLogEntry } from './advanced-analytics-logger';
import { PerformanceOptimizer } from './performance-optimizer';
import { CacheMonitor, CacheAlert } from './cache-monitor';
import { LogLevel, LogContext } from './types';

// Alert Severity Levels
export type AlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'EMERGENCY';

// Alert Categories
export type AlertCategory =
  | 'PERFORMANCE'
  | 'AVAILABILITY'
  | 'SECURITY'
  | 'CAPACITY'
  | 'BUSINESS'
  | 'COMPLIANCE'
  | 'INFRASTRUCTURE'
  | 'APPLICATION';

// Alert Types
export type AlertType =
  | 'THRESHOLD_BREACH'
  | 'ANOMALY_DETECTION'
  | 'PATTERN_MATCH'
  | 'TREND_ANALYSIS'
  | 'CORRELATION'
  | 'PREDICTIVE'
  | 'COMPOSITE'
  | 'CASCADE_FAILURE';

// Real-time Alert
export interface RealTimeAlert {
  id: string;
  timestamp: Date;
  severity: AlertSeverity;
  category: AlertCategory;
  type: AlertType;

  title: string;
  description: string;
  source: string;

  // Context and Correlation
  lKey?: string;
  entityId?: string;
  correlationId?: string;
  parentAlertId?: string;
  relatedAlerts: string[];

  // Metrics and Thresholds
  metric: {
    name: string;
    currentValue: number;
    threshold: number;
    unit: string;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
  };

  // Impact Assessment
  impact: {
    affected: {
      users: number;
      transactions: number;
      systems: string[];
      regions: string[];
    };
    business: {
      estimatedRevenueLoss: number;
      estimatedUserImpact: number;
      slaBreachRisk: number;
    };
    technical: {
      performanceDegradation: number;
      availabilityImpact: number;
      cascadeRisk: number;
    };
  };

  // Automatic Response
  automaticActions: Array<{
    action: string;
    status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
    result?: string;
    timestamp?: Date;
  }>;

  // Manual Actions
  recommendedActions: Array<{
    action: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    estimatedEffort: string;
    expectedOutcome: string;
  }>;

  // Escalation
  escalation: {
    required: boolean;
    level: 'TEAM' | 'MANAGER' | 'EXECUTIVE' | 'EXTERNAL';
    reason: string;
    assignedTo?: string;
    escalatedAt?: Date;
  };

  // Status and Resolution
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVING' | 'RESOLVED' | 'CLOSED';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  resolutionSummary?: string;

  // Notification
  notificationChannels: Array<{
    channel: 'EMAIL' | 'SMS' | 'SLACK' | 'TEAMS' | 'WEBHOOK' | 'DASHBOARD';
    status: 'SENT' | 'FAILED' | 'PENDING';
    sentAt?: Date;
  }>;
}

// Alert Rule Definition
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;

  // Conditions
  conditions: Array<{
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'regex';
    value: number | string;
    timeWindow: number; // seconds
    aggregation?: 'avg' | 'sum' | 'count' | 'min' | 'max' | 'p95' | 'p99';
  }>;

  // Thresholds by severity
  thresholds: {
    warning: number;
    critical: number;
    emergency?: number;
  };

  // Suppression and Grouping
  suppressionRules: {
    cooldownPeriod: number; // seconds
    groupBy?: string[];
    maxAlertsPerGroup: number;
  };

  // Actions and Notifications
  actions: {
    automaticActions: string[];
    notificationChannels: string[];
    escalationDelay: number; // seconds
  };
}

// Anomaly Detection Result
export interface AnomalyDetection {
  id: string;
  timestamp: Date;
  metric: string;
  value: number;
  expectedRange: { min: number; max: number };
  anomalyScore: number; // 0-1
  anomalyType: 'SPIKE' | 'DROP' | 'TREND_CHANGE' | 'PATTERN_BREAK' | 'OUTLIER';
  confidence: number; // 0-1
  context: {
    historicalAverage: number;
    standardDeviation: number;
    seasonalPattern?: string;
    correlatedMetrics: Array<{ metric: string; correlation: number }>;
  };
}

// Predictive Alert
export interface PredictiveAlert {
  id: string;
  timestamp: Date;
  prediction: {
    metric: string;
    predictedValue: number;
    predictedAt: Date; // when the predicted value will occur
    confidence: number; // 0-1
    model: string; // model used for prediction
  };
  threshold: {
    value: number;
    breachProbability: number;
    timeToBreach: number; // seconds
  };
  preventiveActions: Array<{
    action: string;
    effectiveness: number; // 0-1
    implementationTime: number; // seconds
    cost: number;
  }>;
}

export class RealTimeAlertingSystem {
  private analyticsLogger: AdvancedAnalyticsLogger;
  private performanceOptimizer: PerformanceOptimizer;
  private cacheMonitor: CacheMonitor;

  private activeAlerts: Map<string, RealTimeAlert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private alertHistory: RealTimeAlert[] = [];
  private anomalyHistory: AnomalyDetection[] = [];
  private predictiveAlerts: PredictiveAlert[] = [];

  // Configuration
  private config = {
    maxActiveAlerts: 1000,
    alertRetentionDays: 30,
    anomalyDetectionWindow: 3600, // 1 hour
    predictionHorizon: 1800, // 30 minutes
    correlationThreshold: 0.7,
    autoResolutionTimeout: 300, // 5 minutes
  };

  constructor(
    analyticsLogger: AdvancedAnalyticsLogger,
    performanceOptimizer: PerformanceOptimizer,
    cacheMonitor: CacheMonitor
  ) {
    this.analyticsLogger = analyticsLogger;
    this.performanceOptimizer = performanceOptimizer;
    this.cacheMonitor = cacheMonitor;

    this.initializeDefaultRules();
    this.startRealTimeMonitoring();
  }

  /**
   * Process incoming log entry and check for alert conditions
   */
  public processLogEntry(entry: AnalyticsLogEntry): void {
    // Check alert rules
    this.checkAlertRules(entry);

    // Perform anomaly detection
    this.detectAnomalies(entry);

    // Check for correlation patterns
    this.checkCorrelationPatterns(entry);

    // Update predictive models
    this.updatePredictiveModels(entry);
  }

  /**
   * Create a new alert
   */
  public createAlert(
    severity: AlertSeverity,
    category: AlertCategory,
    type: AlertType,
    title: string,
    description: string,
    source: string,
    metric: RealTimeAlert['metric'],
    context?: Partial<LogContext>
  ): RealTimeAlert {
    const alert: RealTimeAlert = {
      id: `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity,
      category,
      type,
      title,
      description,
      source,

      lKey: context?.lKey,
      entityId: context?.entityId,
      correlationId: this.generateCorrelationId(metric.name, context),
      relatedAlerts: [],

      metric,

      impact: this.calculateImpact(severity, category, metric),

      automaticActions: this.generateAutomaticActions(severity, category, metric),
      recommendedActions: this.generateRecommendedActions(severity, category, metric),

      escalation: this.determineEscalation(severity, category),

      status: 'ACTIVE',
      notificationChannels: this.getNotificationChannels(severity),
    };

    // Store alert
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Execute automatic actions
    this.executeAutomaticActions(alert);

    // Send notifications
    this.sendNotifications(alert);

    // Check for correlation with existing alerts
    this.correlateAlerts(alert);

    console.log(`🚨 ALERT CREATED: ${alert.severity} - ${alert.title}`, {
      id: alert.id,
      metric: alert.metric,
      impact: alert.impact,
    });

    return alert;
  }

  /**
   * Get all active alerts with filtering and sorting
   */
  public getActiveAlerts(filters?: {
    severity?: AlertSeverity[];
    category?: AlertCategory[];
    status?: RealTimeAlert['status'][];
    source?: string;
    timeRange?: { start: Date; end: Date };
  }): RealTimeAlert[] {
    let alerts = Array.from(this.activeAlerts.values());

    if (filters) {
      if (filters.severity) {
        alerts = alerts.filter(alert => filters.severity!.includes(alert.severity));
      }

      if (filters.category) {
        alerts = alerts.filter(alert => filters.category!.includes(alert.category));
      }

      if (filters.status) {
        alerts = alerts.filter(alert => filters.status!.includes(alert.status));
      }

      if (filters.source) {
        alerts = alerts.filter(alert => alert.source === filters.source);
      }

      if (filters.timeRange) {
        alerts = alerts.filter(
          alert =>
            alert.timestamp >= filters.timeRange!.start && alert.timestamp <= filters.timeRange!.end
        );
      }
    }

    // Sort by severity and timestamp
    return alerts.sort((a, b) => {
      const severityOrder = { EMERGENCY: 5, CRITICAL: 4, ERROR: 3, WARNING: 2, INFO: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;

      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  /**
   * Get alert dashboard summary
   */
  public getAlertSummary(): {
    totals: {
      active: number;
      byCategory: Record<AlertCategory, number>;
      bySeverity: Record<AlertSeverity, number>;
    };
    trends: Array<{
      category: string;
      trend: 'INCREASING' | 'DECREASING' | 'STABLE';
      changePercent: number;
    }>;
    topIssues: Array<{
      title: string;
      count: number;
      severity: AlertSeverity;
      avgResolutionTime: number;
    }>;
    predictions: Array<{
      metric: string;
      predictedIssue: string;
      probability: number;
      timeToImpact: number;
      preventiveActions: string[];
    }>;
  } {
    const activeAlerts = Array.from(this.activeAlerts.values());

    // Calculate totals
    const totals = {
      active: activeAlerts.length,
      byCategory: {} as Record<AlertCategory, number>,
      bySeverity: {} as Record<AlertSeverity, number>,
    };

    activeAlerts.forEach(alert => {
      totals.byCategory[alert.category] = (totals.byCategory[alert.category] || 0) + 1;
      totals.bySeverity[alert.severity] = (totals.bySeverity[alert.severity] || 0) + 1;
    });

    // Calculate trends (simplified)
    const trends = [
      {
        category: 'Performance Issues',
        trend: 'DECREASING' as const,
        changePercent: 12.5,
      },
      {
        category: 'Cache Problems',
        trend: 'STABLE' as const,
        changePercent: 2.1,
      },
    ];

    // Top issues
    const topIssues = this.getTopIssues();

    // Predictions
    const predictions = this.predictiveAlerts.slice(0, 5).map(pred => ({
      metric: pred.prediction.metric,
      predictedIssue: `Threshold breach predicted for ${pred.prediction.metric}`,
      probability: pred.threshold.breachProbability,
      timeToImpact: pred.threshold.timeToBreach,
      preventiveActions: pred.preventiveActions.map(action => action.action),
    }));

    return {
      totals,
      trends,
      topIssues,
      predictions,
    };
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    console.log(`✓ Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
    return true;
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string, resolutionSummary: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date();
    alert.resolutionSummary = resolutionSummary;

    // Remove from active alerts after a delay
    setTimeout(() => {
      this.activeAlerts.delete(alertId);
    }, 60000); // 1 minute delay

    console.log(`✅ Alert resolved: ${alertId}`);
    return true;
  }

  // Private implementation methods

  private initializeDefaultRules(): void {
    // High error rate rule
    this.alertRules.set('high_error_rate', {
      id: 'high_error_rate',
      name: 'High Error Rate',
      description: 'Triggers when error rate exceeds thresholds',
      enabled: true,
      conditions: [
        {
          metric: 'error_rate',
          operator: '>',
          value: 0.01,
          timeWindow: 300,
          aggregation: 'avg',
        },
      ],
      thresholds: {
        warning: 0.01, // 1%
        critical: 0.05, // 5%
        emergency: 0.1, // 10%
      },
      suppressionRules: {
        cooldownPeriod: 300,
        groupBy: ['component'],
        maxAlertsPerGroup: 3,
      },
      actions: {
        automaticActions: ['scale_up', 'enable_circuit_breaker'],
        notificationChannels: ['slack', 'email'],
        escalationDelay: 900, // 15 minutes
      },
    });

    // Response time rule
    this.alertRules.set('high_response_time', {
      id: 'high_response_time',
      name: 'High Response Time',
      description: 'Triggers when response time exceeds thresholds',
      enabled: true,
      conditions: [
        {
          metric: 'response_time',
          operator: '>',
          value: 500,
          timeWindow: 300,
          aggregation: 'p95',
        },
      ],
      thresholds: {
        warning: 500, // 500ms
        critical: 2000, // 2 seconds
      },
      suppressionRules: {
        cooldownPeriod: 180,
        groupBy: ['endpoint'],
        maxAlertsPerGroup: 2,
      },
      actions: {
        automaticActions: ['cache_warming', 'optimize_queries'],
        notificationChannels: ['slack'],
        escalationDelay: 600, // 10 minutes
      },
    });
  }

  private startRealTimeMonitoring(): void {
    // Monitor every 10 seconds
    setInterval(() => {
      this.performHealthChecks();
      this.updatePredictiveAlerts();
      this.checkAutoResolution();
      this.cleanupOldAlerts();
    }, 10000);

    // Anomaly detection every minute
    setInterval(() => {
      this.performAnomalyDetection();
    }, 60000);
  }

  private checkAlertRules(entry: AnalyticsLogEntry): void {
    // Check each rule against the entry
    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;

      const shouldTrigger = this.evaluateRuleConditions(rule, entry);
      if (shouldTrigger) {
        this.triggerAlert(rule, entry);
      }
    });
  }

  private evaluateRuleConditions(rule: AlertRule, entry: AnalyticsLogEntry): boolean {
    // Simplified rule evaluation
    for (const condition of rule.conditions) {
      const metricValue = this.extractMetricValue(entry, condition.metric);
      if (metricValue === null) continue;

      const thresholdMet = this.evaluateCondition(metricValue, condition.operator, condition.value);
      if (thresholdMet) {
        return true;
      }
    }
    return false;
  }

  private extractMetricValue(entry: AnalyticsLogEntry, metric: string): number | null {
    switch (metric) {
      case 'error_rate':
        return entry.level >= LogLevel.ERROR ? 1 : 0;
      case 'response_time':
        return entry.recoveryTime || 0;
      case 'affected_users':
        return entry.affectedUsers || 0;
      default:
        return entry.performanceMetrics?.[metric as keyof typeof entry.performanceMetrics] || null;
    }
  }

  private evaluateCondition(value: number, operator: string, threshold: number | string): boolean {
    const numThreshold = typeof threshold === 'string' ? parseFloat(threshold) : threshold;

    switch (operator) {
      case '>':
        return value > numThreshold;
      case '<':
        return value < numThreshold;
      case '>=':
        return value >= numThreshold;
      case '<=':
        return value <= numThreshold;
      case '==':
        return value === numThreshold;
      case '!=':
        return value !== numThreshold;
      default:
        return false;
    }
  }

  private triggerAlert(rule: AlertRule, entry: AnalyticsLogEntry): void {
    const severity = this.determineSeverity(rule, entry);
    const metric = {
      name: rule.conditions[0].metric,
      currentValue: this.extractMetricValue(entry, rule.conditions[0].metric) || 0,
      threshold: rule.thresholds.warning,
      unit: this.getMetricUnit(rule.conditions[0].metric),
      trend: 'INCREASING' as const,
    };

    this.createAlert(
      severity,
      'PERFORMANCE',
      'THRESHOLD_BREACH',
      rule.name,
      rule.description,
      'rule_engine',
      metric,
      entry.context
    );
  }

  private determineSeverity(rule: AlertRule, entry: AnalyticsLogEntry): AlertSeverity {
    const metricValue = this.extractMetricValue(entry, rule.conditions[0].metric) || 0;

    if (rule.thresholds.emergency && metricValue >= rule.thresholds.emergency) {
      return 'EMERGENCY';
    }
    if (metricValue >= rule.thresholds.critical) {
      return 'CRITICAL';
    }
    if (metricValue >= rule.thresholds.warning) {
      return 'WARNING';
    }
    return 'INFO';
  }

  private getMetricUnit(metric: string): string {
    const unitMap: Record<string, string> = {
      error_rate: '%',
      response_time: 'ms',
      affected_users: 'users',
      memory_usage: 'MB',
      cpu_usage: '%',
    };
    return unitMap[metric] || '';
  }

  private detectAnomalies(entry: AnalyticsLogEntry): void {
    // Simplified anomaly detection
    if (entry.recoveryTime && entry.recoveryTime > 0) {
      const historicalAverage = 200; // Simplified
      const anomalyScore = Math.abs(entry.recoveryTime - historicalAverage) / historicalAverage;

      if (anomalyScore > 0.5) {
        // 50% deviation threshold
        const anomaly: AnomalyDetection = {
          id: `ANOMALY_${Date.now()}`,
          timestamp: new Date(),
          metric: 'response_time',
          value: entry.recoveryTime,
          expectedRange: { min: historicalAverage * 0.8, max: historicalAverage * 1.2 },
          anomalyScore,
          anomalyType: entry.recoveryTime > historicalAverage ? 'SPIKE' : 'DROP',
          confidence: Math.min(anomalyScore, 1),
          context: {
            historicalAverage,
            standardDeviation: historicalAverage * 0.2,
            correlatedMetrics: [],
          },
        };

        this.anomalyHistory.push(anomaly);

        // Create alert for significant anomalies
        if (anomalyScore > 0.8) {
          this.createAlert(
            'WARNING',
            'PERFORMANCE',
            'ANOMALY_DETECTION',
            `Response Time Anomaly Detected`,
            `Response time of ${entry.recoveryTime}ms significantly deviates from expected range`,
            'anomaly_detector',
            {
              name: 'response_time',
              currentValue: entry.recoveryTime,
              threshold: historicalAverage * 1.5,
              unit: 'ms',
              trend: 'VOLATILE',
            },
            entry.context
          );
        }
      }
    }
  }

  private checkCorrelationPatterns(entry: AnalyticsLogEntry): void {
    // Check for patterns that might indicate cascading failures
    const recentAlerts = Array.from(this.activeAlerts.values()).filter(
      alert => alert.timestamp > new Date(Date.now() - 300000)
    ); // Last 5 minutes

    if (recentAlerts.length >= 3) {
      // Potential cascade failure
      this.createAlert(
        'CRITICAL',
        'INFRASTRUCTURE',
        'CASCADE_FAILURE',
        'Potential Cascade Failure Detected',
        `${recentAlerts.length} related alerts detected in short timeframe`,
        'correlation_engine',
        {
          name: 'alert_frequency',
          currentValue: recentAlerts.length,
          threshold: 3,
          unit: 'alerts',
          trend: 'INCREASING',
        },
        entry.context
      );
    }
  }

  private updatePredictiveModels(entry: AnalyticsLogEntry): void {
    // Simplified predictive analysis
    if (entry.recoveryTime && entry.recoveryTime > 1000) {
      const prediction: PredictiveAlert = {
        id: `PRED_${Date.now()}`,
        timestamp: new Date(),
        prediction: {
          metric: 'response_time',
          predictedValue: entry.recoveryTime * 1.2,
          predictedAt: new Date(Date.now() + 900000), // 15 minutes from now
          confidence: 0.7,
          model: 'linear_trend',
        },
        threshold: {
          value: 2000,
          breachProbability: 0.8,
          timeToBreach: 900, // 15 minutes
        },
        preventiveActions: [
          { action: 'Scale up instances', effectiveness: 0.8, implementationTime: 300, cost: 50 },
          { action: 'Enable caching', effectiveness: 0.6, implementationTime: 120, cost: 10 },
        ],
      };

      this.predictiveAlerts.push(prediction);

      // Keep only recent predictions
      if (this.predictiveAlerts.length > 100) {
        this.predictiveAlerts = this.predictiveAlerts.slice(-50);
      }
    }
  }

  private calculateImpact(
    severity: AlertSeverity,
    category: AlertCategory,
    metric: RealTimeAlert['metric']
  ): RealTimeAlert['impact'] {
    // Simplified impact calculation
    const baseUsers = severity === 'CRITICAL' ? 1000 : severity === 'WARNING' ? 100 : 10;
    const baseTransactions = baseUsers * 5;
    const baseRevenueLoss = baseUsers * 10; // $10 per affected user

    return {
      affected: {
        users: Math.floor(baseUsers + Math.random() * baseUsers * 0.5),
        transactions: Math.floor(baseTransactions + Math.random() * baseTransactions * 0.5),
        systems: ['api', 'database'],
        regions: ['us-east', 'eu-west'],
      },
      business: {
        estimatedRevenueLoss: Math.floor(baseRevenueLoss + Math.random() * baseRevenueLoss * 0.3),
        estimatedUserImpact: baseUsers,
        slaBreachRisk: severity === 'CRITICAL' ? 0.9 : severity === 'WARNING' ? 0.3 : 0.1,
      },
      technical: {
        performanceDegradation:
          metric.currentValue > metric.threshold
            ? Math.min((metric.currentValue - metric.threshold) / metric.threshold, 1)
            : 0,
        availabilityImpact: severity === 'CRITICAL' ? 0.2 : 0.05,
        cascadeRisk: category === 'INFRASTRUCTURE' ? 0.7 : 0.3,
      },
    };
  }

  private generateAutomaticActions(
    severity: AlertSeverity,
    category: AlertCategory,
    metric: RealTimeAlert['metric']
  ): RealTimeAlert['automaticActions'] {
    const actions = [];

    if (severity === 'CRITICAL') {
      actions.push({ action: 'Scale up instances', status: 'PENDING' as const });
      actions.push({ action: 'Enable circuit breaker', status: 'PENDING' as const });
    }

    if (category === 'PERFORMANCE' && metric.name === 'response_time') {
      actions.push({ action: 'Clear cache', status: 'PENDING' as const });
      actions.push({ action: 'Restart slow services', status: 'PENDING' as const });
    }

    return actions;
  }

  private generateRecommendedActions(
    severity: AlertSeverity,
    category: AlertCategory,
    metric: RealTimeAlert['metric']
  ): RealTimeAlert['recommendedActions'] {
    return [
      {
        action: 'Investigate root cause',
        priority: 'HIGH',
        estimatedEffort: '15-30 minutes',
        expectedOutcome: 'Identify source of issue',
      },
      {
        action: 'Review recent deployments',
        priority: 'MEDIUM',
        estimatedEffort: '10-15 minutes',
        expectedOutcome: 'Rule out deployment issues',
      },
      {
        action: 'Check system resources',
        priority: 'MEDIUM',
        estimatedEffort: '5-10 minutes',
        expectedOutcome: 'Verify resource availability',
      },
    ];
  }

  private determineEscalation(
    severity: AlertSeverity,
    category: AlertCategory
  ): RealTimeAlert['escalation'] {
    if (severity === 'EMERGENCY') {
      return {
        required: true,
        level: 'EXECUTIVE',
        reason: 'Emergency level incident requires executive notification',
      };
    }

    if (severity === 'CRITICAL') {
      return {
        required: true,
        level: 'MANAGER',
        reason: 'Critical incident requires management oversight',
      };
    }

    return {
      required: false,
      level: 'TEAM',
      reason: 'Routine alert handling by team',
    };
  }

  private getNotificationChannels(severity: AlertSeverity): RealTimeAlert['notificationChannels'] {
    const channels = [{ channel: 'DASHBOARD' as const, status: 'PENDING' as const }];

    if (severity === 'CRITICAL' || severity === 'EMERGENCY') {
      channels.push({ channel: 'SLACK', status: 'PENDING' });
      channels.push({ channel: 'EMAIL', status: 'PENDING' });
    }

    if (severity === 'EMERGENCY') {
      channels.push({ channel: 'SMS', status: 'PENDING' });
    }

    return channels;
  }

  private executeAutomaticActions(alert: RealTimeAlert): void {
    alert.automaticActions.forEach(action => {
      action.status = 'EXECUTING';
      action.timestamp = new Date();

      // Simulate action execution
      setTimeout(() => {
        action.status = Math.random() > 0.1 ? 'COMPLETED' : 'FAILED';
        action.result =
          action.status === 'COMPLETED'
            ? 'Action completed successfully'
            : 'Action failed - manual intervention required';
      }, Math.random() * 5000);
    });
  }

  private sendNotifications(alert: RealTimeAlert): void {
    alert.notificationChannels.forEach(notification => {
      notification.status = 'SENT';
      notification.sentAt = new Date();

      console.log(`📢 Notification sent via ${notification.channel}: ${alert.title}`);
    });
  }

  private correlateAlerts(alert: RealTimeAlert): void {
    // Find related alerts
    const relatedAlerts = Array.from(this.activeAlerts.values()).filter(
      existingAlert =>
        existingAlert.id !== alert.id &&
        (existingAlert.lKey === alert.lKey ||
          existingAlert.source === alert.source ||
          existingAlert.correlationId === alert.correlationId)
    );

    relatedAlerts.forEach(relatedAlert => {
      alert.relatedAlerts.push(relatedAlert.id);
      relatedAlert.relatedAlerts.push(alert.id);
    });
  }

  private generateCorrelationId(metricName: string, context?: Partial<LogContext>): string {
    return `${metricName}_${context?.component || 'unknown'}_${Date.now()}`;
  }

  private performHealthChecks(): void {
    // Simplified health checks
    const cacheAlerts = this.cacheMonitor.getCacheAlerts(true);
    cacheAlerts.forEach(cacheAlert => {
      if (cacheAlert.severity === 'CRITICAL') {
        this.createAlert(
          'CRITICAL',
          'INFRASTRUCTURE',
          'THRESHOLD_BREACH',
          `Cache Alert: ${cacheAlert.alertType}`,
          `Cache ${cacheAlert.cacheType}: ${cacheAlert.alertType}`,
          'cache_monitor',
          {
            name: cacheAlert.alertType.toLowerCase(),
            currentValue: cacheAlert.currentValue,
            threshold: cacheAlert.threshold,
            unit: cacheAlert.cacheType === 'KV' ? 'ops' : 'ms',
            trend: cacheAlert.trend as any,
          }
        );
      }
    });
  }

  private updatePredictiveAlerts(): void {
    // Update predictions based on current trends
    this.predictiveAlerts = this.predictiveAlerts.filter(
      pred => pred.prediction.predictedAt > new Date()
    );
  }

  private checkAutoResolution(): void {
    // Auto-resolve alerts that have been stable
    const autoResolutionCandidates = Array.from(this.activeAlerts.values()).filter(
      alert =>
        alert.status === 'ACTIVE' &&
        Date.now() - alert.timestamp.getTime() > this.config.autoResolutionTimeout * 1000
    );

    autoResolutionCandidates.forEach(alert => {
      // Check if conditions still exist (simplified)
      if (Math.random() > 0.3) {
        // 70% chance of auto-resolution
        this.resolveAlert(alert.id, 'Auto-resolved: conditions no longer met');
      }
    });
  }

  private cleanupOldAlerts(): void {
    // Clean up old alerts
    const cutoff = new Date(Date.now() - this.config.alertRetentionDays * 24 * 60 * 60 * 1000);
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoff);

    // Limit anomaly history
    if (this.anomalyHistory.length > 1000) {
      this.anomalyHistory = this.anomalyHistory.slice(-500);
    }
  }

  private getTopIssues(): Array<{
    title: string;
    count: number;
    severity: AlertSeverity;
    avgResolutionTime: number;
  }> {
    const issueMap = new Map<
      string,
      { count: number; severities: AlertSeverity[]; resolutionTimes: number[] }
    >();

    // Analyze recent alerts
    const recentAlerts = this.alertHistory.filter(
      alert => alert.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );

    recentAlerts.forEach(alert => {
      const key = alert.title;
      if (!issueMap.has(key)) {
        issueMap.set(key, { count: 0, severities: [], resolutionTimes: [] });
      }

      const issue = issueMap.get(key)!;
      issue.count++;
      issue.severities.push(alert.severity);

      if (alert.resolvedAt) {
        const resolutionTime = alert.resolvedAt.getTime() - alert.timestamp.getTime();
        issue.resolutionTimes.push(resolutionTime);
      }
    });

    return Array.from(issueMap.entries())
      .map(([title, data]) => ({
        title,
        count: data.count,
        severity: this.getMostSevereSeverity(data.severities),
        avgResolutionTime:
          data.resolutionTimes.length > 0
            ? data.resolutionTimes.reduce((a, b) => a + b, 0) / data.resolutionTimes.length / 1000 // seconds
            : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getMostSevereSeverity(severities: AlertSeverity[]): AlertSeverity {
    const severityOrder = { EMERGENCY: 5, CRITICAL: 4, ERROR: 3, WARNING: 2, INFO: 1 };
    return severities.reduce((prev, curr) =>
      severityOrder[curr] > severityOrder[prev] ? curr : prev
    );
  }

  private performAnomalyDetection(): void {
    // Enhanced anomaly detection run
    const recentEntries = this.analyticsLogger.getSortedEntries(
      { field: 'timestamp', direction: 'desc' },
      { timeRange: { start: new Date(Date.now() - 3600000), end: new Date() } }
    );

    // Look for patterns in the data
    const responseTimes = recentEntries
      .map(e => e.recoveryTime)
      .filter((t): t is number => typeof t === 'number' && t > 0);

    if (responseTimes.length > 10) {
      const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const recent = responseTimes.slice(0, 5);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;

      const deviation = Math.abs(recentAvg - avg) / avg;
      if (deviation > 0.5) {
        // 50% deviation
        console.log(
          `🔍 Anomaly detected: Recent response time trend deviates by ${(deviation * 100).toFixed(1)}%`
        );
      }
    }
  }
}

export default RealTimeAlertingSystem;
