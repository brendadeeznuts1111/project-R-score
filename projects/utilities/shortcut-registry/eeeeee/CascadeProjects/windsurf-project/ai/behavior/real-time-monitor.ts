/**
 * Real-time Behavior Monitor - Advanced Real-time User Behavior Monitoring System
 * Provides continuous monitoring, alerting, and adaptive responses
 */

import { BehaviorTracker } from './behavior-tracker';
import { PatternAnalyzer } from './pattern-analyzer';
import { BehaviorPredictionModel } from './prediction-model';
import { RecommendationEngine } from './recommendation-engine';

export interface MonitoringConfig {
  enabled: boolean;
  updateInterval: number;
  alertThresholds: {
    anomalyScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    responseTime: number;
    errorRate: number;
  };
  adaptiveLearning: boolean;
  realTimeAlerts: boolean;
  performanceMonitoring: boolean;
}

export interface RealTimeMetrics {
  timestamp: number;
  userId: string;
  sessionId: string;
  actionsPerMinute: number;
  errorRate: number;
  responseTime: number;
  engagementScore: number;
  riskScore: number;
  anomalyScore: number;
  activePatterns: number;
  predictionsGenerated: number;
  recommendationsServed: number;
}

export interface AlertCondition {
  id: string;
  name: string;
  condition: (metrics: RealTimeMetrics) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldown: number; // milliseconds
  lastTriggered?: number;
}

export class RealTimeBehaviorMonitor {
  private behaviorTracker: BehaviorTracker;
  private patternAnalyzer: PatternAnalyzer;
  private predictionModel: BehaviorPredictionModel;
  private recommendationEngine: RecommendationEngine;

  private config: MonitoringConfig;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private metricsHistory: RealTimeMetrics[] = [];
  private maxHistorySize: number = 1000;

  private alertConditions: AlertCondition[] = [];
  private activeAlerts: Map<string, any> = new Map();
  private alertCooldowns: Map<string, number> = new Map();

  private performanceMetrics: Map<string, number> = new Map();
  private adaptiveThresholds: Map<string, number> = new Map();

  constructor(
    behaviorTracker: BehaviorTracker,
    patternAnalyzer: PatternAnalyzer,
    predictionModel: BehaviorPredictionModel,
    recommendationEngine: RecommendationEngine,
    config: Partial<MonitoringConfig> = {}
  ) {
    this.behaviorTracker = behaviorTracker;
    this.patternAnalyzer = patternAnalyzer;
    this.predictionModel = predictionModel;
    this.recommendationEngine = recommendationEngine;

    this.config = {
      enabled: true,
      updateInterval: 5000, // 5 seconds
      alertThresholds: {
        anomalyScore: 0.8,
        riskLevel: 'medium',
        responseTime: 5000,
        errorRate: 0.1
      },
      adaptiveLearning: true,
      realTimeAlerts: true,
      performanceMonitoring: true,
      ...config
    };

    this.initializeAlertConditions();
    this.initializeAdaptiveThresholds();
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(userId: string): void {
    if (this.isMonitoring) {
      console.warn('Real-time monitoring is already active');
      return;
    }

    console.log('🚀 Starting real-time behavior monitoring for user:', userId);

    this.isMonitoring = true;

    // Start monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCycle(userId);
    }, this.config.updateInterval);

    // Set up real-time event listeners
    this.setupRealTimeEventListeners(userId);

    this.emitEvent('monitoringStarted', { userId, timestamp: Date.now() });
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('⏹️ Stopping real-time behavior monitoring');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.isMonitoring = false;
    this.emitEvent('monitoringStopped', { timestamp: Date.now() });
  }

  /**
   * Perform a complete monitoring cycle
   */
  private async performMonitoringCycle(userId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Collect real-time metrics
      const metrics = await this.collectRealTimeMetrics(userId);

      // Store metrics in history
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }

      // Analyze metrics for anomalies and patterns
      await this.analyzeMetrics(metrics);

      // Generate predictions and recommendations
      await this.generateInsights(userId, metrics);

      // Check alert conditions
      this.checkAlertConditions(metrics);

      // Update adaptive thresholds
      if (this.config.adaptiveLearning) {
        this.updateAdaptiveThresholds(metrics);
      }

      // Performance monitoring
      if (this.config.performanceMonitoring) {
        this.updatePerformanceMetrics(startTime, Date.now());
      }

      // Emit monitoring cycle completed event
      this.emitEvent('monitoringCycleCompleted', {
        userId,
        metrics,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error in monitoring cycle:', error);
      this.emitEvent('monitoringError', {
        userId,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Collect comprehensive real-time metrics
   */
  private async collectRealTimeMetrics(userId: string): Promise<RealTimeMetrics> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const fiveMinutesAgo = now - 300000;

    // Get recent actions
    const recentActions = this.behaviorTracker.getUserActions(userId, fiveMinutesAgo);
    const lastMinuteActions = recentActions.filter(a => a.timestamp > oneMinuteAgo);

    // Calculate metrics
    const actionsPerMinute = lastMinuteActions.length;
    const errorRate = this.calculateErrorRate(lastMinuteActions);
    const responseTime = this.calculateAverageResponseTime(lastMinuteActions);
    const engagementScore = this.calculateEngagementScore(recentActions);
    const riskScore = this.calculateRiskScore(recentActions);
    const anomalyScore = await this.calculateAnomalyScore(userId, recentActions);

    // Get pattern and prediction counts
    const patterns = this.patternAnalyzer.getUserPatterns(userId);
    const activePatterns = patterns.length;

    return {
      timestamp: now,
      userId,
      sessionId: this.getCurrentSessionId(userId),
      actionsPerMinute,
      errorRate,
      responseTime,
      engagementScore,
      riskScore,
      anomalyScore,
      activePatterns,
      predictionsGenerated: 0, // Would be tracked separately
      recommendationsServed: 0  // Would be tracked separately
    };
  }

  /**
   * Analyze metrics for patterns and anomalies
   */
  private async analyzeMetrics(metrics: RealTimeMetrics): Promise<void> {
    // Analyze trends
    const trends = this.analyzeTrends(metrics);

    // Detect anomalies
    const anomalies = await this.detectAnomalies(metrics);

    // Update pattern analysis
    await this.updatePatternAnalysis(metrics);

    // Emit analysis results
    this.emitEvent('metricsAnalyzed', {
      metrics,
      trends,
      anomalies,
      timestamp: Date.now()
    });
  }

  /**
   * Generate real-time insights and predictions
   */
  private async generateInsights(userId: string, metrics: RealTimeMetrics): Promise<void> {
    try {
      // Generate predictions
      const predictions = await this.generatePredictions(userId, metrics);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(userId, metrics);

      // Update metrics with generated counts
      metrics.predictionsGenerated = predictions.length;
      metrics.recommendationsServed = recommendations.length;

      // Emit insights
      this.emitEvent('insightsGenerated', {
        userId,
        metrics,
        predictions,
        recommendations,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error generating insights:', error);
    }
  }

  /**
   * Initialize alert conditions
   */
  private initializeAlertConditions(): void {
    this.alertConditions = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: (metrics) => metrics.errorRate > this.config.alertThresholds.errorRate,
        severity: 'high',
        message: 'Error rate has exceeded threshold',
        cooldown: 300000 // 5 minutes
      },
      {
        id: 'high_response_time',
        name: 'High Response Time',
        condition: (metrics) => metrics.responseTime > this.config.alertThresholds.responseTime,
        severity: 'medium',
        message: 'Response time is above acceptable levels',
        cooldown: 180000 // 3 minutes
      },
      {
        id: 'anomaly_detected',
        name: 'Anomaly Detected',
        condition: (metrics) => metrics.anomalyScore > this.config.alertThresholds.anomalyScore,
        severity: 'high',
        message: 'Unusual behavior pattern detected',
        cooldown: 600000 // 10 minutes
      },
      {
        id: 'low_engagement',
        name: 'Low Engagement',
        condition: (metrics) => metrics.engagementScore < 0.3,
        severity: 'low',
        message: 'User engagement has dropped significantly',
        cooldown: 900000 // 15 minutes
      },
      {
        id: 'high_risk',
        name: 'High Risk Activity',
        condition: (metrics) => metrics.riskScore > 0.7,
        severity: 'critical',
        message: 'High-risk activity detected',
        cooldown: 120000 // 2 minutes
      }
    ];
  }

  /**
   * Check alert conditions and trigger alerts
   */
  private checkAlertConditions(metrics: RealTimeMetrics): void {
    const now = Date.now();

    for (const condition of this.alertConditions) {
      // Check cooldown
      const lastTriggered = this.alertCooldowns.get(condition.id);
      if (lastTriggered && now - lastTriggered < condition.cooldown) {
        continue;
      }

      // Check condition
      if (condition.condition(metrics)) {
        this.triggerAlert(condition, metrics);
        this.alertCooldowns.set(condition.id, now);
      }
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(condition: AlertCondition, metrics: RealTimeMetrics): void {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conditionId: condition.id,
      name: condition.name,
      severity: condition.severity,
      message: condition.message,
      metrics,
      timestamp: Date.now(),
      acknowledged: false
    };

    this.activeAlerts.set(alert.id, alert);

    // Emit alert event
    this.emitEvent('alertTriggered', alert);

    // Auto-acknowledge low severity alerts after 5 minutes
    if (condition.severity === 'low') {
      setTimeout(() => {
        this.acknowledgeAlert(alert.id);
      }, 300000);
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();

      this.emitEvent('alertAcknowledged', alert);
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): any[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.acknowledged);
  }

  /**
   * Initialize adaptive thresholds
   */
  private initializeAdaptiveThresholds(): void {
    // Set initial adaptive thresholds based on typical values
    this.adaptiveThresholds.set('errorRate', 0.05);
    this.adaptiveThresholds.set('responseTime', 2000);
    this.adaptiveThresholds.set('anomalyScore', 0.6);
    this.adaptiveThresholds.set('engagementScore', 0.5);
  }

  /**
   * Update adaptive thresholds based on recent metrics
   */
  private updateAdaptiveThresholds(metrics: RealTimeMetrics): void {
    const recentMetrics = this.metricsHistory.slice(-20); // Last 20 measurements

    if (recentMetrics.length < 10) return; // Need minimum data

    // Update error rate threshold (moving average + 2 standard deviations)
    const errorRates = recentMetrics.map(m => m.errorRate);
    const avgErrorRate = errorRates.reduce((a, b) => a + b, 0) / errorRates.length;
    const stdErrorRate = Math.sqrt(
      errorRates.reduce((sum, rate) => sum + Math.pow(rate - avgErrorRate, 2), 0) / errorRates.length
    );
    this.adaptiveThresholds.set('errorRate', avgErrorRate + 2 * stdErrorRate);

    // Update response time threshold
    const responseTimes = recentMetrics.map(m => m.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    this.adaptiveThresholds.set('responseTime', avgResponseTime * 1.5);

    // Update other thresholds similarly
    this.updateAdaptiveThreshold('anomalyScore', recentMetrics.map(m => m.anomalyScore));
    this.updateAdaptiveThreshold('engagementScore', recentMetrics.map(m => m.engagementScore));
  }

  /**
   * Update a specific adaptive threshold
   */
  private updateAdaptiveThreshold(key: string, values: number[]): void {
    if (values.length < 5) return;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
    );

    // Set threshold at mean + 1.5 standard deviations
    this.adaptiveThresholds.set(key, avg + 1.5 * std);
  }

  /**
   * Set up real-time event listeners
   */
  private setupRealTimeEventListeners(userId: string): void {
    // Listen for behavior tracker events
    this.behaviorTracker.on('actionTracked', (action) => {
      this.handleRealTimeAction(action);
    });

    this.behaviorTracker.on('anomalyDetected', (anomaly) => {
      this.handleRealTimeAnomaly(anomaly);
    });

    // Set up DOM event listeners for immediate feedback
    this.setupDOMEventListeners();
  }

  /**
   * Handle real-time action events
   */
  private handleRealTimeAction(action: any): void {
    // Immediate processing for critical actions
    if (this.isCriticalAction(action)) {
      this.processCriticalAction(action);
    }

    // Update real-time metrics
    this.updateRealTimeMetrics(action);
  }

  /**
   * Handle real-time anomaly events
   */
  private handleRealTimeAnomaly(anomaly: any): void {
    // Immediate alert for high-severity anomalies
    if (anomaly.anomalies.some((a: any) => a.severity === 'high' || a.severity === 'critical')) {
      this.triggerImmediateAlert('High-severity anomaly detected', anomaly);
    }
  }

  /**
   * Set up DOM event listeners for real-time feedback
   */
  private setupDOMEventListeners(): void {
    // Monitor for user activity indicators
    document.addEventListener('click', () => {
      this.recordUserActivity('click');
    });

    document.addEventListener('keydown', () => {
      this.recordUserActivity('keyboard');
    });

    document.addEventListener('scroll', () => {
      this.recordUserActivity('scroll');
    });

    // Monitor page visibility for engagement tracking
    document.addEventListener('visibilitychange', () => {
      this.recordVisibilityChange(document.hidden);
    });
  }

  /**
   * Record user activity for engagement tracking
   */
  private recordUserActivity(type: string): void {
    // Update engagement metrics in real-time
    this.emitEvent('userActivity', {
      type,
      timestamp: Date.now()
    });
  }

  /**
   * Record visibility changes
   */
  private recordVisibilityChange(hidden: boolean): void {
    this.emitEvent('visibilityChange', {
      hidden,
      timestamp: Date.now()
    });
  }

  /**
   * Calculate error rate from actions
   */
  private calculateErrorRate(actions: any[]): number {
    if (actions.length === 0) return 0;

    const errors = actions.filter(action =>
      action.actionType.includes('error') ||
      action.actionType.includes('failed') ||
      action.metadata?.error === true
    ).length;

    return errors / actions.length;
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(actions: any[]): number {
    const responseTimes = actions
      .map(action => action.metadata?.responseTime)
      .filter(time => time !== undefined);

    if (responseTimes.length === 0) return 0;

    return responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(actions: any[]): number {
    if (actions.length === 0) return 0;

    const engagementActions = actions.filter(action =>
      action.actionType.includes('view') ||
      action.actionType.includes('interact') ||
      action.actionType.includes('click') ||
      action.actionType.includes('submit')
    ).length;

    return engagementActions / actions.length;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(actions: any[]): number {
    if (actions.length === 0) return 0;

    const riskIndicators = actions.filter(action =>
      action.actionType.includes('failed') ||
      action.actionType.includes('error') ||
      action.metadata?.suspicious === true ||
      action.metadata?.unusualLocation === true
    ).length;

    return Math.min(1, riskIndicators / actions.length);
  }

  /**
   * Calculate anomaly score
   */
  private async calculateAnomalyScore(userId: string, actions: any[]): Promise<number> {
    // Simple anomaly detection based on deviation from normal patterns
    const recentMetrics = this.metricsHistory.slice(-10);

    if (recentMetrics.length < 5) return 0;

    const avgActionsPerMinute = recentMetrics.reduce((sum, m) => sum + m.actionsPerMinute, 0) / recentMetrics.length;
    const currentActionsPerMinute = actions.length;

    const deviation = Math.abs(currentActionsPerMinute - avgActionsPerMinute) / avgActionsPerMinute;

    return Math.min(1, deviation);
  }

  /**
   * Analyze trends in metrics
   */
  private analyzeTrends(currentMetrics: RealTimeMetrics): any {
    const recentMetrics = this.metricsHistory.slice(-10);

    if (recentMetrics.length < 5) return {};

    const trends = {
      actionsPerMinute: this.calculateTrend(recentMetrics.map(m => m.actionsPerMinute)),
      errorRate: this.calculateTrend(recentMetrics.map(m => m.errorRate)),
      responseTime: this.calculateTrend(recentMetrics.map(m => m.responseTime)),
      engagementScore: this.calculateTrend(recentMetrics.map(m => m.engagementScore)),
      riskScore: this.calculateTrend(recentMetrics.map(m => m.riskScore))
    };

    return trends;
  }

  /**
   * Calculate trend for a series of values
   */
  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 3) return 'stable';

    const recent = values.slice(-3);
    const earlier = values.slice(-6, -3);

    if (earlier.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Detect anomalies in metrics
   */
  private async detectAnomalies(metrics: RealTimeMetrics): Promise<any[]> {
    const anomalies = [];

    // Check each metric against adaptive thresholds
    if (metrics.errorRate > this.adaptiveThresholds.get('errorRate')!) {
      anomalies.push({
        type: 'error_rate',
        severity: 'high',
        value: metrics.errorRate,
        threshold: this.adaptiveThresholds.get('errorRate'),
        message: 'Error rate above adaptive threshold'
      });
    }

    if (metrics.responseTime > this.adaptiveThresholds.get('responseTime')!) {
      anomalies.push({
        type: 'response_time',
        severity: 'medium',
        value: metrics.responseTime,
        threshold: this.adaptiveThresholds.get('responseTime'),
        message: 'Response time above adaptive threshold'
      });
    }

    if (metrics.anomalyScore > this.adaptiveThresholds.get('anomalyScore')!) {
      anomalies.push({
        type: 'behavior_anomaly',
        severity: 'high',
        value: metrics.anomalyScore,
        threshold: this.adaptiveThresholds.get('anomalyScore'),
        message: 'Behavioral anomaly detected'
      });
    }

    return anomalies;
  }

  /**
   * Update pattern analysis with new metrics
   */
  private async updatePatternAnalysis(metrics: RealTimeMetrics): Promise<void> {
    // This would integrate with the pattern analyzer for real-time pattern updates
    // For now, just emit the metrics for pattern analysis
    this.emitEvent('patternAnalysisUpdate', {
      metrics,
      timestamp: Date.now()
    });
  }

  /**
   * Generate predictions based on current metrics
   */
  private async generatePredictions(userId: string, metrics: RealTimeMetrics): Promise<any[]> {
    try {
      const context = {
        userId,
        sessionId: metrics.sessionId,
        currentPage: window.location?.pathname || '/dashboard',
        timeOfDay: new Date().getHours() / 24,
        dayOfWeek: new Date().getDay() / 7,
        recentActions: this.behaviorTracker.getRecentActions(userId, 10),
        userProfile: {
          riskScore: metrics.riskScore,
          engagementScore: metrics.engagementScore,
          preferences: {}
        }
      };

      const predictions = await this.predictionModel.predict(context);
      return predictions;
    } catch (error) {
      console.error('Error generating predictions:', error);
      return [];
    }
  }

  /**
   * Generate recommendations based on current metrics
   */
  private async generateRecommendations(userId: string, metrics: RealTimeMetrics): Promise<any[]> {
    try {
      const context = {
        sessionId: metrics.sessionId,
        currentPage: window.location?.pathname || '/dashboard',
        timeOfDay: new Date().getHours() / 24,
        dayOfWeek: new Date().getDay() / 7,
        sessionDuration: this.getSessionDuration(userId)
      };

      const actions = this.behaviorTracker.getUserActions(userId);
      const recommendations = await this.recommendationEngine.generateRecommendations(
        userId,
        context,
        actions
      );

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(startTime: number, endTime: number): void {
    const duration = endTime - startTime;

    this.performanceMetrics.set('lastCycleDuration', duration);
    this.performanceMetrics.set('averageCycleDuration',
      (this.performanceMetrics.get('averageCycleDuration') || 0 + duration) / 2
    );

    // Track performance trends
    const cycleCount = (this.performanceMetrics.get('cycleCount') || 0) + 1;
    this.performanceMetrics.set('cycleCount', cycleCount);
  }

  /**
   * Check if action is critical
   */
  private isCriticalAction(action: any): boolean {
    return action.actionType.includes('failed') ||
           action.actionType.includes('error') ||
           action.metadata?.critical === true;
  }

  /**
   * Process critical action
   */
  private processCriticalAction(action: any): void {
    // Immediate processing for critical actions
    this.emitEvent('criticalAction', {
      action,
      timestamp: Date.now()
    });
  }

  /**
   * Update real-time metrics with new action
   */
  private updateRealTimeMetrics(action: any): void {
    // Update immediate metrics
    this.emitEvent('realTimeMetricsUpdate', {
      action,
      timestamp: Date.now()
    });
  }

  /**
   * Trigger immediate alert
   */
  private triggerImmediateAlert(message: string, data: any): void {
    const alert = {
      id: `immediate_${Date.now()}`,
      message,
      data,
      timestamp: Date.now(),
      severity: 'high'
    };

    this.emitEvent('immediateAlert', alert);
  }

  /**
   * Get current session ID for user
   */
  private getCurrentSessionId(userId: string): string {
    const sessions = this.behaviorTracker.getActiveSessions();
    const userSession = sessions.find(s => s.userId === userId);
    return userSession?.sessionId || 'unknown';
  }

  /**
   * Get session duration for user
   */
  private getSessionDuration(userId: string): number {
    const sessions = this.behaviorTracker.getActiveSessions();
    const userSession = sessions.find(s => s.userId === userId);
    return userSession ? Date.now() - userSession.startTime : 0;
  }

  /**
   * Emit monitoring event
   */
  private emitEvent(event: string, data: any): void {
    // Create custom event for dashboard integration
    const customEvent = new CustomEvent('aiMonitoringEvent', {
      detail: { event, data }
    });

    document.dispatchEvent(customEvent);

    // Also log to console for debugging
    console.log(`📊 Monitoring Event: ${event}`, data);
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    isMonitoring: boolean;
    metricsHistorySize: number;
    activeAlertsCount: number;
    performanceMetrics: Record<string, number>;
    adaptiveThresholds: Record<string, number>;
  } {
    return {
      isMonitoring: this.isMonitoring,
      metricsHistorySize: this.metricsHistory.length,
      activeAlertsCount: this.activeAlerts.size,
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      adaptiveThresholds: Object.fromEntries(this.adaptiveThresholds)
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 10): RealTimeMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * Export monitoring data
   */
  exportData(): {
    metrics: RealTimeMetrics[];
    alerts: any[];
    performance: Record<string, number>;
    config: MonitoringConfig;
  } {
    return {
      metrics: this.metricsHistory,
      alerts: Array.from(this.activeAlerts.values()),
      performance: Object.fromEntries(this.performanceMetrics),
      config: this.config
    };
  }

  /**
   * Reset monitoring state
   */
  reset(): void {
    this.metricsHistory = [];
    this.activeAlerts.clear();
    this.alertCooldowns.clear();
    this.performanceMetrics.clear();
    this.initializeAdaptiveThresholds();

    this.emitEvent('monitoringReset', { timestamp: Date.now() });
  }
}