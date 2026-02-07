// lib/ai/anomaly-detector.ts — Anomaly detection system

import { EventEmitter } from 'events';
import { logger } from '../core/structured-logger';
import { auditLogger } from '../security/secret-audit-logger';

export interface Anomaly {
  id: string;
  type: 'security' | 'performance' | 'operational' | 'behavioral';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  confidence: number; // 0-1
  timestamp: number;
  source: string;
  metrics: Record<string, number>;
  baseline: Record<string, number>;
  deviation: number; // Standard deviations from baseline
  recommendations: string[];
  relatedEvents: string[];
  autoResponse?: {
    action: string;
    executed: boolean;
    result?: string;
  };
}

export interface MetricData {
  timestamp: number;
  source: string;
  metrics: Record<string, number>;
  tags?: Record<string, string>;
}

export interface BaselineProfile {
  source: string;
  metrics: Record<
    string,
    {
      mean: number;
      stdDev: number;
      min: number;
      max: number;
      trend: number;
      seasonality?: number;
    }
  >;
  lastUpdated: number;
  sampleSize: number;
}

export interface DetectionRule {
  id: string;
  name: string;
  type: Anomaly['type'];
  conditions: {
    metric: string;
    operator: '>' | '<' | '=' | '!=' | 'in' | 'not_in';
    threshold: number;
    deviationThreshold?: number;
  }[];
  severity: Anomaly['severity'];
  enabled: boolean;
  autoResponse?: {
    action: string;
    conditions: string[];
  };
}

export class AnomalyDetector extends EventEmitter {
  private static instance: AnomalyDetector;
  private baselines: Map<string, BaselineProfile> = new Map();
  private recentData: MetricData[] = [];
  private anomalies: Anomaly[] = [];
  private rules: Map<string, DetectionRule> = new Map();
  private learningEnabled = true;
  private detectionInterval = 30000; // 30 seconds
  private maxDataPoints = 10000;
  private maxAnomalies = 1000;
  private maxRules = 100;
  private detectionTimer?: ReturnType<typeof setInterval>;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  private constructor() {
    super();
    this.initializeDefaultRules();
    this.startDetection();
  }

  static getInstance(): AnomalyDetector {
    if (!AnomalyDetector.instance) {
      AnomalyDetector.instance = new AnomalyDetector();
    }
    return AnomalyDetector.instance;
  }

  /**
   * Submit metric data for analysis
   */
  async submitMetrics(data: MetricData): Promise<void> {
    this.recentData.push(data);

    // Keep only recent data
    if (this.recentData.length > this.maxDataPoints) {
      this.recentData = this.recentData.slice(-this.maxDataPoints);
    }

    // Update baselines
    if (this.learningEnabled) {
      await this.updateBaseline(data.source);
    }

    // Immediate anomaly check for critical metrics
    await this.checkImmediateAnomalies(data);
  }

  /**
   * Get current anomalies
   */
  getAnomalies(filter?: {
    type?: Anomaly['type'];
    severity?: Anomaly['severity'];
    minConfidence?: number;
    timeRange?: { start: number; end: number };
  }): Anomaly[] {
    let filtered = [...this.anomalies];

    if (filter?.type) {
      filtered = filtered.filter(a => a.type === filter.type);
    }

    if (filter?.severity) {
      filtered = filtered.filter(a => a.severity === filter.severity);
    }

    if (filter?.minConfidence) {
      filtered = filtered.filter(a => a.confidence >= filter.minConfidence);
    }

    if (filter?.timeRange) {
      filtered = filtered.filter(
        a => a.timestamp >= filter.timeRange!.start && a.timestamp <= filter.timeRange!.end
      );
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get baseline profiles
   */
  getBaselines(): Map<string, BaselineProfile> {
    return new Map(this.baselines);
  }

  /**
   * Add custom detection rule
   */
  addRule(rule: DetectionRule): void {
    this.rules.set(rule.id, rule);
    logger.info(
      'Anomaly detection rule added',
      {
        ruleId: rule.id,
        name: rule.name,
        type: rule.type,
      },
      ['anomaly', 'rule']
    );
  }

  /**
   * Remove detection rule
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      logger.info('Anomaly detection rule removed', { ruleId }, ['anomaly', 'rule']);
    }
    return removed;
  }

  /**
   * Force anomaly detection run
   */
  async runDetection(): Promise<Anomaly[]> {
    const newAnomalies: Anomaly[] = [];

    for (const baseline of this.baselines.values()) {
      const recentDataForSource = this.recentData
        .filter(d => d.source === baseline.source)
        .slice(-100); // Last 100 data points

      for (const data of recentDataForSource) {
        const detectedAnomalies = await this.detectAnomalies(data, baseline);
        newAnomalies.push(...detectedAnomalies);
      }
    }

    // Add new anomalies to the list
    for (const anomaly of newAnomalies) {
      if (!this.anomalies.some(a => a.id === anomaly.id)) {
        this.anomalies.push(anomaly);
        await this.handleAnomaly(anomaly);
      }
    }

    // Keep only recent anomalies (last 1000)
    if (this.anomalies.length > this.maxAnomalies) {
      this.anomalies = this.anomalies.slice(-this.maxAnomalies);
    }

    return newAnomalies;
  }

  /**
   * Get anomaly detection statistics
   */
  getStatistics(): {
    totalAnomalies: number;
    anomaliesByType: Record<Anomaly['type'], number>;
    anomaliesBySeverity: Record<Anomaly['severity'], number>;
    baselinesActive: number;
    rulesActive: number;
    detectionAccuracy: number;
    falsePositiveRate: number;
  } {
    const anomaliesByType = {
      security: 0,
      performance: 0,
      operational: 0,
      behavioral: 0,
    };

    const anomaliesBySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const anomaly of this.anomalies) {
      anomaliesByType[anomaly.type]++;
      anomaliesBySeverity[anomaly.severity]++;
    }

    return {
      totalAnomalies: this.anomalies.length,
      anomaliesByType,
      anomaliesBySeverity,
      baselinesActive: this.baselines.size,
      rulesActive: Array.from(this.rules.values()).filter(r => r.enabled).length,
      detectionAccuracy: this.calculateAccuracy(),
      falsePositiveRate: this.calculateFalsePositiveRate(),
    };
  }

  /**
   * Initialize default detection rules
   */
  private initializeDefaultRules(): void {
    // Security rules
    this.addRule({
      id: 'sec-001',
      name: 'Multiple Failed Login Attempts',
      type: 'security',
      conditions: [{ metric: 'failed_login_count', operator: '>', threshold: 5 }],
      severity: 'high',
      enabled: true,
      autoResponse: {
        action: 'lock_account_temporarily',
        conditions: ['failed_login_count > 10'],
      },
    });

    this.addRule({
      id: 'sec-002',
      name: 'Unusual Access Pattern',
      type: 'security',
      conditions: [{ metric: 'access_pattern_deviation', operator: '>', threshold: 2.0 }],
      severity: 'medium',
      enabled: true,
    });

    // Performance rules
    this.addRule({
      id: 'perf-001',
      name: 'High Response Time',
      type: 'performance',
      conditions: [{ metric: 'response_time_ms', operator: '>', threshold: 1000 }],
      severity: 'medium',
      enabled: true,
    });

    this.addRule({
      id: 'perf-002',
      name: 'High Error Rate',
      type: 'performance',
      conditions: [{ metric: 'error_rate_percent', operator: '>', threshold: 5 }],
      severity: 'high',
      enabled: true,
    });

    // Operational rules
    this.addRule({
      id: 'ops-001',
      name: 'High Memory Usage',
      type: 'operational',
      conditions: [{ metric: 'memory_usage_percent', operator: '>', threshold: 85 }],
      severity: 'medium',
      enabled: true,
    });

    this.addRule({
      id: 'ops-002',
      name: 'High CPU Usage',
      type: 'operational',
      conditions: [{ metric: 'cpu_usage_percent', operator: '>', threshold: 90 }],
      severity: 'high',
      enabled: true,
    });
  }

  /**
   * Start continuous detection
   */
  private startDetection(): void {
    this.detectionTimer = setInterval(async () => {
      try {
        await this.runDetection();
      } catch (error) {
        logger.error(
          'Anomaly detection error',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }, this.detectionInterval);
  }

  /**
   * Update baseline for a source
   */
  private async updateBaseline(source: string): Promise<void> {
    const sourceData = this.recentData.filter(d => d.source === source);
    if (sourceData.length < 10) return; // Need minimum data points

    const metrics: Record<string, number[]> = {};

    // Collect metric values
    for (const data of sourceData) {
      for (const [metricName, value] of Object.entries(data.metrics)) {
        if (!metrics[metricName]) {
          metrics[metricName] = [];
        }
        metrics[metricName].push(value);
      }
    }

    // Calculate statistics
    const baselineMetrics: Record<string, any> = {};
    for (const [metricName, values] of Object.entries(metrics)) {
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance =
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      baselineMetrics[metricName] = {
        mean,
        stdDev,
        min: Math.min(...values),
        max: Math.max(...values),
        trend: this.calculateTrend(values),
      };
    }

    const baseline: BaselineProfile = {
      source,
      metrics: baselineMetrics,
      lastUpdated: Date.now(),
      sampleSize: sourceData.length,
    };

    this.baselines.set(source, baseline);
  }

  /**
   * Detect anomalies in data compared to baseline
   */
  private async detectAnomalies(data: MetricData, baseline: BaselineProfile): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    for (const [metricName, value] of Object.entries(data.metrics)) {
      const baselineMetric = baseline.metrics[metricName];
      if (!baselineMetric) continue;

      // Calculate z-score
      const zScore = Math.abs((value - baselineMetric.mean) / baselineMetric.stdDev);

      if (zScore > 2.0) {
        // 2 standard deviations
        const anomaly = await this.createAnomaly(data, baseline, metricName, value, zScore);
        anomalies.push(anomaly);
      }
    }

    // Check custom rules
    for (const rule of Array.from(this.rules.values()).filter(r => r.enabled)) {
      if (await this.evaluateRule(data, rule)) {
        const anomaly = await this.createRuleBasedAnomaly(data, rule);
        anomalies.push(anomaly);
      }
    }

    return anomalies;
  }

  /**
   * Create anomaly from metric deviation
   */
  private async createAnomaly(
    data: MetricData,
    baseline: BaselineProfile,
    metricName: string,
    value: number,
    deviation: number
  ): Promise<Anomaly> {
    const severity = this.calculateSeverity(deviation);
    const type = this.determineAnomalyType(metricName);

    return {
      id: `anomaly-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type,
      severity,
      title: `${metricName} Anomaly Detected`,
      description: `Metric ${metricName} deviated ${deviation.toFixed(2)} standard deviations from baseline`,
      confidence: Math.min(0.95, deviation / 3),
      timestamp: data.timestamp,
      source: data.source,
      metrics: { [metricName]: value },
      baseline: { [metricName]: baseline.metrics[metricName].mean },
      deviation,
      recommendations: this.generateRecommendations(
        metricName,
        value,
        baseline.metrics[metricName]
      ),
      relatedEvents: await this.findRelatedEvents(data, metricName),
    };
  }

  /**
   * Create anomaly from rule
   */
  private async createRuleBasedAnomaly(data: MetricData, rule: DetectionRule): Promise<Anomaly> {
    return {
      id: `rule-anomaly-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      description: `Detection rule '${rule.name}' triggered`,
      confidence: 0.8,
      timestamp: data.timestamp,
      source: data.source,
      metrics: data.metrics,
      baseline: {},
      deviation: 0,
      recommendations: this.generateRuleRecommendations(rule),
      relatedEvents: [],
    };
  }

  /**
   * Handle detected anomaly
   */
  private async handleAnomaly(anomaly: Anomaly): Promise<void> {
    logger.warn(
      'Anomaly detected',
      {
        anomalyId: anomaly.id,
        type: anomaly.type,
        severity: anomaly.severity,
        title: anomaly.title,
        confidence: anomaly.confidence,
      },
      ['anomaly', 'detected']
    );

    // Emit event for listeners
    this.emit('anomaly-detected', anomaly);

    // Auto-response if configured
    if (anomaly.autoResponse) {
      await this.executeAutoResponse(anomaly);
    }

    // Security anomalies get special handling
    if (anomaly.type === 'security') {
      await this.handleSecurityAnomaly(anomaly);
    }
  }

  /**
   * Execute automatic response
   */
  private async executeAutoResponse(anomaly: Anomaly): Promise<void> {
    // In a real implementation, execute the actual response
    logger.info(
      'Executing auto-response',
      {
        anomalyId: anomaly.id,
        action: anomaly.autoResponse!.action,
      },
      ['anomaly', 'response']
    );

    anomaly.autoResponse.executed = true;
    anomaly.autoResponse.result = 'success';
  }

  /**
   * Handle security-specific anomalies
   */
  private async handleSecurityAnomaly(anomaly: Anomaly): Promise<void> {
    // Log to audit system
    await auditLogger.logSecretAccessFailure(
      'anomaly_detection',
      anomaly.title,
      'security-monitor',
      'ANOMALY_DETECTED'
    );
  }

  /**
   * Check for immediate anomalies (critical metrics)
   */
  private async checkImmediateAnomalies(data: MetricData): Promise<void> {
    const criticalThresholds = {
      cpu_usage_percent: 95,
      memory_usage_percent: 95,
      error_rate_percent: 10,
      response_time_ms: 5000,
    };

    for (const [metric, threshold] of Object.entries(criticalThresholds)) {
      const value = data.metrics[metric];
      if (value !== undefined && value > threshold) {
        const anomaly: Anomaly = {
          id: `critical-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          type: 'operational',
          severity: 'critical',
          title: `Critical ${metric} Alert`,
          description: `${metric} exceeded critical threshold: ${value} > ${threshold}`,
          confidence: 0.95,
          timestamp: data.timestamp,
          source: data.source,
          metrics: { [metric]: value },
          baseline: { [metric]: threshold },
          deviation: 0,
          recommendations: [`Immediately investigate ${metric}`, `Consider scaling resources`],
          relatedEvents: [],
        };

        this.anomalies.push(anomaly);
        await this.handleAnomaly(anomaly);
      }
    }
  }

  /**
   * Calculate trend from values
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + val * i, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * Calculate severity from deviation
   */
  private calculateSeverity(deviation: number): Anomaly['severity'] {
    if (deviation > 4) return 'critical';
    if (deviation > 3) return 'high';
    if (deviation > 2) return 'medium';
    return 'low';
  }

  /**
   * Determine anomaly type from metric
   */
  private determineAnomalyType(metricName: string): Anomaly['type'] {
    if (
      metricName.includes('login') ||
      metricName.includes('auth') ||
      metricName.includes('security')
    ) {
      return 'security';
    }
    if (
      metricName.includes('response') ||
      metricName.includes('throughput') ||
      metricName.includes('error')
    ) {
      return 'performance';
    }
    if (
      metricName.includes('cpu') ||
      metricName.includes('memory') ||
      metricName.includes('disk')
    ) {
      return 'operational';
    }
    return 'behavioral';
  }

  /**
   * Generate recommendations for anomaly
   */
  private generateRecommendations(metricName: string, value: number, baseline: any): string[] {
    const recommendations: string[] = [];

    if (value > baseline.mean * 1.5) {
      recommendations.push(`Investigate spike in ${metricName}`);
      recommendations.push('Check for underlying system issues');
    }

    if (metricName.includes('memory')) {
      recommendations.push('Monitor for memory leaks');
      recommendations.push('Consider increasing memory allocation');
    }

    if (metricName.includes('cpu')) {
      recommendations.push('Optimize CPU-intensive operations');
      recommendations.push('Consider horizontal scaling');
    }

    if (metricName.includes('error')) {
      recommendations.push('Review error logs for patterns');
      recommendations.push('Implement circuit breakers if needed');
    }

    return recommendations;
  }

  /**
   * Generate recommendations for rule-based anomaly
   */
  private generateRuleRecommendations(rule: DetectionRule): string[] {
    const recommendations: string[] = [];

    if (rule.type === 'security') {
      recommendations.push('Review security logs');
      recommendations.push('Consider blocking suspicious IPs');
    }

    if (rule.type === 'performance') {
      recommendations.push('Optimize affected components');
      recommendations.push('Monitor system resources');
    }

    if (rule.type === 'operational') {
      recommendations.push('Check system health');
      recommendations.push('Verify service dependencies');
    }

    return recommendations;
  }

  /**
   * Find related events for anomaly
   */
  private async findRelatedEvents(data: MetricData, metricName: string): Promise<string[]> {
    // In a real implementation, query logs and events
    return [`event-${Date.now()}-1`, `event-${Date.now()}-2`];
  }

  /**
   * Evaluate detection rule against data
   */
  private async evaluateRule(data: MetricData, rule: DetectionRule): Promise<boolean> {
    for (const condition of rule.conditions) {
      const value = data.metrics[condition.metric];
      if (value === undefined) continue;

      let matches = false;
      switch (condition.operator) {
        case '>':
          matches = value > condition.threshold;
          break;
        case '<':
          matches = value < condition.threshold;
          break;
        case '=':
          matches = value === condition.threshold;
          break;
      }

      if (!matches) return false;
    }

    return true;
  }

  /**
   * Calculate detection accuracy
   */
  private calculateAccuracy(): number {
    // Mock calculation - in real implementation, track true positives/negatives
    return 0.85;
  }

  /**
   * Calculate false positive rate
   */
  private calculateFalsePositiveRate(): number {
    // Mock calculation - in real implementation, track false positives
    return 0.12;
  }
}

// Export singleton instance
export const anomalyDetector = AnomalyDetector.getInstance();
