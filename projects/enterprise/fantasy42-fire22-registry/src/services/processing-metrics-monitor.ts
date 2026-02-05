#!/usr/bin/env bun

/**
 * 📊 Advanced Processing Metrics and Monitoring System
 *
 * Comprehensive real-time monitoring, metrics collection, and analytics
 * for data processing pipelines with alerting and performance insights.
 *
 * Features:
 * - Real-time metrics collection
 * - Performance monitoring and alerting
 * - Resource usage tracking
 * - Pipeline health monitoring
 * - Predictive analytics
 * - Custom dashboards and reporting
 */

import { EventEmitter } from 'events';
import { Database } from 'bun:sqlite';

// ============================================================================
// METRICS INTERFACES
// ============================================================================

export interface ProcessingMetrics {
  // Timing metrics
  totalProcessingTime: number;
  averageProcessingTime: number;
  minProcessingTime: number;
  maxProcessingTime: number;
  p50ProcessingTime: number;
  p95ProcessingTime: number;
  p99ProcessingTime: number;

  // Throughput metrics
  recordsProcessed: number;
  recordsPerSecond: number;
  bytesProcessed: number;
  bytesPerSecond: number;

  // Quality metrics
  successRate: number;
  errorRate: number;
  validationScore: number;
  dataQualityScore: number;

  // Resource metrics
  cpuUsage: number;
  memoryUsage: number;
  diskIO: number;
  networkIO: number;

  // Cache metrics
  cacheHitRate: number;
  cacheSize: number;
  cacheEvictions: number;

  // Queue metrics
  queueSize: number;
  queueWaitTime: number;
  queueThroughput: number;

  // Error metrics
  errorCount: number;
  errorRatePerMinute: number;
  topErrors: Array<{ code: string; count: number; percentage: number }>;

  // Timestamp
  timestamp: string;
  period: string; // '1m', '5m', '15m', '1h', '24h'
}

export interface PipelineMetrics {
  pipelineId: string;
  status: 'healthy' | 'warning' | 'error' | 'critical';
  uptime: number;
  lastExecutionTime?: string;
  averageExecutionTime: number;
  successRate: number;
  throughput: number;
  errorRate: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  queueMetrics: {
    size: number;
    waitTime: number;
    processingRate: number;
  };
  healthScore: number; // 0-100
  alerts: Alert[];
}

export interface SystemMetrics {
  overallHealth: number;
  activePipelines: number;
  totalThroughput: number;
  systemLoad: number;
  memoryPressure: number;
  diskPressure: number;
  networkPressure: number;
  errorRate: number;
  alerts: Alert[];
  predictions: SystemPrediction[];
}

export interface Alert {
  id: string;
  type: 'performance' | 'error' | 'resource' | 'quality' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  resolved?: boolean;
  resolutionTime?: string;
  affectedComponents: string[];
  suggestedActions: string[];
}

export interface SystemPrediction {
  type: 'performance' | 'resource' | 'error' | 'scaling';
  prediction: string;
  confidence: number;
  timeframe: string; // '1h', '6h', '24h', '7d'
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

// ============================================================================
// MONITORING CONFIGURATION
// ============================================================================

export interface MonitoringConfig {
  collectionInterval: number; // milliseconds
  retentionPeriod: number; // days
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    queueSize: number;
  };
  predictiveAnalysis: boolean;
  anomalyDetection: boolean;
  alerting: {
    enabled: boolean;
    channels: string[]; // 'console', 'email', 'slack', 'webhook'
    escalationPolicy: EscalationRule[];
  };
}

export interface EscalationRule {
  severity: 'low' | 'medium' | 'high' | 'critical';
  delay: number; // minutes before escalation
  channels: string[];
  recipients: string[];
}

// ============================================================================
// ADVANCED PROCESSING METRICS MONITOR
// ============================================================================

export class AdvancedProcessingMetricsMonitor extends EventEmitter {
  private db: Database;
  private config: MonitoringConfig;
  private metricsBuffer: ProcessingMetrics[] = [];
  private pipelineMetrics: Map<string, PipelineMetrics> = new Map();
  private alerts: Alert[] = [];
  private collectionInterval: NodeJS.Timeout | null = null;
  private predictiveAnalyzer: PredictiveAnalyzer;
  private anomalyDetector: AnomalyDetector;

  constructor(db: Database, config?: Partial<MonitoringConfig>) {
    super();

    this.db = db;
    this.config = {
      collectionInterval: 60000, // 1 minute
      retentionPeriod: 30, // 30 days
      alertThresholds: {
        errorRate: 5, // 5%
        responseTime: 5000, // 5 seconds
        cpuUsage: 80, // 80%
        memoryUsage: 85, // 85%
        diskUsage: 90, // 90%
        queueSize: 1000, // 1000 items
      },
      predictiveAnalysis: true,
      anomalyDetection: true,
      alerting: {
        enabled: true,
        channels: ['console'],
        escalationPolicy: [
          {
            severity: 'low',
            delay: 15,
            channels: ['console'],
            recipients: [],
          },
          {
            severity: 'medium',
            delay: 5,
            channels: ['console'],
            recipients: [],
          },
          {
            severity: 'high',
            delay: 1,
            channels: ['console'],
            recipients: [],
          },
          {
            severity: 'critical',
            delay: 0,
            channels: ['console'],
            recipients: [],
          },
        ],
      },
      ...config,
    };

    this.predictiveAnalyzer = new PredictiveAnalyzer();
    this.anomalyDetector = new AnomalyDetector();

    this.initializeDatabase();
    this.startMetricsCollection();
    this.loadExistingAlerts();
  }

  // ============================================================================
  // METRICS COLLECTION
  // ============================================================================

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionInterval);
  }

  /**
   * Collect comprehensive metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = new Date().toISOString();
    const metrics = await this.gatherMetrics();

    // Store in buffer
    this.metricsBuffer.push(metrics);

    // Keep only last 100 metrics in buffer
    if (this.metricsBuffer.length > 100) {
      this.metricsBuffer = this.metricsBuffer.slice(-100);
    }

    // Persist metrics
    await this.persistMetrics(metrics);

    // Check for alerts
    await this.checkAlerts(metrics);

    // Perform predictive analysis
    if (this.config.predictiveAnalysis) {
      const predictions = await this.predictiveAnalyzer.analyze(this.metricsBuffer);
      this.emit('predictions-generated', predictions);
    }

    // Detect anomalies
    if (this.config.anomalyDetection) {
      const anomalies = await this.anomalyDetector.detect(this.metricsBuffer);
      if (anomalies.length > 0) {
        this.emit('anomalies-detected', anomalies);
      }
    }

    this.emit('metrics-collected', metrics);
  }

  /**
   * Gather all metrics
   */
  private async gatherMetrics(): Promise<ProcessingMetrics> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Get recent processing data
    const recentMetrics = this.metricsBuffer.slice(-10); // Last 10 minutes

    const metrics: ProcessingMetrics = {
      // Timing metrics
      totalProcessingTime: this.calculateTotalProcessingTime(recentMetrics),
      averageProcessingTime: this.calculateAverageProcessingTime(recentMetrics),
      minProcessingTime: this.calculateMinProcessingTime(recentMetrics),
      maxProcessingTime: this.calculateMaxProcessingTime(recentMetrics),
      p50ProcessingTime: this.calculatePercentile(recentMetrics.map(m => m.averageProcessingTime), 50),
      p95ProcessingTime: this.calculatePercentile(recentMetrics.map(m => m.averageProcessingTime), 95),
      p99ProcessingTime: this.calculatePercentile(recentMetrics.map(m => m.averageProcessingTime), 99),

      // Throughput metrics
      recordsProcessed: this.calculateTotalRecords(recentMetrics),
      recordsPerSecond: this.calculateRecordsPerSecond(recentMetrics),
      bytesProcessed: this.calculateTotalBytes(recentMetrics),
      bytesPerSecond: this.calculateBytesPerSecond(recentMetrics),

      // Quality metrics
      successRate: this.calculateSuccessRate(recentMetrics),
      errorRate: this.calculateErrorRate(recentMetrics),
      validationScore: this.calculateValidationScore(recentMetrics),
      dataQualityScore: this.calculateDataQualityScore(recentMetrics),

      // Resource metrics
      cpuUsage: this.getCurrentCpuUsage(),
      memoryUsage: this.getCurrentMemoryUsage(),
      diskIO: this.getCurrentDiskIO(),
      networkIO: this.getCurrentNetworkIO(),

      // Cache metrics
      cacheHitRate: this.calculateCacheHitRate(recentMetrics),
      cacheSize: this.getCurrentCacheSize(),
      cacheEvictions: this.calculateCacheEvictions(recentMetrics),

      // Queue metrics
      queueSize: this.getCurrentQueueSize(),
      queueWaitTime: this.calculateQueueWaitTime(recentMetrics),
      queueThroughput: this.calculateQueueThroughput(recentMetrics),

      // Error metrics
      errorCount: this.calculateErrorCount(recentMetrics),
      errorRatePerMinute: this.calculateErrorRatePerMinute(recentMetrics),
      topErrors: this.getTopErrors(recentMetrics),

      // Metadata
      timestamp: new Date().toISOString(),
      period: '1m',
    };

    return metrics;
  }

  // ============================================================================
  // METRICS CALCULATIONS
  // ============================================================================

  private calculateTotalProcessingTime(metrics: ProcessingMetrics[]): number {
    return metrics.reduce((sum, m) => sum + m.totalProcessingTime, 0);
  }

  private calculateAverageProcessingTime(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 0;
    return this.calculateTotalProcessingTime(metrics) / metrics.length;
  }

  private calculateMinProcessingTime(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 0;
    return Math.min(...metrics.map(m => m.averageProcessingTime));
  }

  private calculateMaxProcessingTime(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 0;
    return Math.max(...metrics.map(m => m.averageProcessingTime));
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  private calculateTotalRecords(metrics: ProcessingMetrics[]): number {
    return metrics.reduce((sum, m) => sum + m.recordsProcessed, 0);
  }

  private calculateRecordsPerSecond(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 0;
    const totalRecords = this.calculateTotalRecords(metrics);
    const timeSpan = metrics.length * (this.config.collectionInterval / 1000); // seconds
    return totalRecords / timeSpan;
  }

  private calculateTotalBytes(metrics: ProcessingMetrics[]): number {
    return metrics.reduce((sum, m) => sum + m.bytesProcessed, 0);
  }

  private calculateBytesPerSecond(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 0;
    const totalBytes = this.calculateTotalBytes(metrics);
    const timeSpan = metrics.length * (this.config.collectionInterval / 1000); // seconds
    return totalBytes / timeSpan;
  }

  private calculateSuccessRate(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 100;
    const totalProcessed = metrics.reduce((sum, m) => sum + m.recordsProcessed, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);
    return totalProcessed > 0 ? ((totalProcessed - totalErrors) / totalProcessed) * 100 : 100;
  }

  private calculateErrorRate(metrics: ProcessingMetrics[]): number {
    return 100 - this.calculateSuccessRate(metrics);
  }

  private calculateValidationScore(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 100;
    return metrics.reduce((sum, m) => sum + m.validationScore, 0) / metrics.length;
  }

  private calculateDataQualityScore(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 100;
    return metrics.reduce((sum, m) => sum + m.dataQualityScore, 0) / metrics.length;
  }

  private getCurrentCpuUsage(): number {
    // In a real implementation, this would use system monitoring
    return Math.random() * 100; // Placeholder
  }

  private getCurrentMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return (memUsage.heapUsed / memUsage.heapTotal) * 100;
  }

  private getCurrentDiskIO(): number {
    // Placeholder - would need system monitoring
    return Math.random() * 100;
  }

  private getCurrentNetworkIO(): number {
    // Placeholder - would need system monitoring
    return Math.random() * 100;
  }

  private calculateCacheHitRate(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length;
  }

  private getCurrentCacheSize(): number {
    // Placeholder - would integrate with actual cache system
    return Math.floor(Math.random() * 1000);
  }

  private calculateCacheEvictions(metrics: ProcessingMetrics[]): number {
    return metrics.reduce((sum, m) => sum + m.cacheEvictions, 0);
  }

  private getCurrentQueueSize(): number {
    // Placeholder - would integrate with actual queue system
    return Math.floor(Math.random() * 100);
  }

  private calculateQueueWaitTime(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.queueWaitTime, 0) / metrics.length;
  }

  private calculateQueueThroughput(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.queueThroughput, 0) / metrics.length;
  }

  private calculateErrorCount(metrics: ProcessingMetrics[]): number {
    return metrics.reduce((sum, m) => sum + m.errorCount, 0);
  }

  private calculateErrorRatePerMinute(metrics: ProcessingMetrics[]): number {
    if (metrics.length === 0) return 0;
    const totalErrors = this.calculateErrorCount(metrics);
    const timeSpan = metrics.length * (this.config.collectionInterval / 1000 / 60); // minutes
    return totalErrors / timeSpan;
  }

  private getTopErrors(metrics: ProcessingMetrics[]): Array<{ code: string; count: number; percentage: number }> {
    const errorCounts = new Map<string, number>();

    // Aggregate errors from all metrics
    metrics.forEach(metric => {
      metric.topErrors.forEach(error => {
        errorCounts.set(error.code, (errorCounts.get(error.code) || 0) + error.count);
      });
    });

    const totalErrors = Array.from(errorCounts.values()).reduce((sum, count) => sum + count, 0);

    return Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({
        code,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
      }));
  }

  // ============================================================================
  // ALERT MANAGEMENT
  // ============================================================================

  /**
   * Check for alerts based on current metrics
   */
  private async checkAlerts(metrics: ProcessingMetrics): Promise<void> {
    const alerts: Alert[] = [];

    // Performance alerts
    if (metrics.averageProcessingTime > this.config.alertThresholds.responseTime) {
      alerts.push(this.createAlert(
        'performance',
        'high',
        'High Response Time',
        `Average processing time (${metrics.averageProcessingTime.toFixed(2)}ms) exceeds threshold (${this.config.alertThresholds.responseTime}ms)`,
        ['data-processor'],
        ['Optimize processing logic', 'Scale resources', 'Review bottlenecks']
      ));
    }

    // Error rate alerts
    if (metrics.errorRate > this.config.alertThresholds.errorRate) {
      alerts.push(this.createAlert(
        'error',
        'high',
        'High Error Rate',
        `Error rate (${metrics.errorRate.toFixed(2)}%) exceeds threshold (${this.config.alertThresholds.errorRate}%)`,
        ['data-processor'],
        ['Investigate error causes', 'Implement circuit breakers', 'Review error handling']
      ));
    }

    // Resource alerts
    if (metrics.cpuUsage > this.config.alertThresholds.cpuUsage) {
      alerts.push(this.createAlert(
        'resource',
        'medium',
        'High CPU Usage',
        `CPU usage (${metrics.cpuUsage.toFixed(2)}%) exceeds threshold (${this.config.alertThresholds.cpuUsage}%)`,
        ['system'],
        ['Scale CPU resources', 'Optimize CPU-intensive operations', 'Load balance']
      ));
    }

    if (metrics.memoryUsage > this.config.alertThresholds.memoryUsage) {
      alerts.push(this.createAlert(
        'resource',
        'high',
        'High Memory Usage',
        `Memory usage (${metrics.memoryUsage.toFixed(2)}%) exceeds threshold (${this.config.alertThresholds.memoryUsage}%)`,
        ['system'],
        ['Scale memory resources', 'Optimize memory usage', 'Implement memory limits']
      ));
    }

    // Queue alerts
    if (metrics.queueSize > this.config.alertThresholds.queueSize) {
      alerts.push(this.createAlert(
        'performance',
        'medium',
        'Large Queue Size',
        `Queue size (${metrics.queueSize}) exceeds threshold (${this.config.alertThresholds.queueSize})`,
        ['data-processor'],
        ['Scale processing capacity', 'Optimize throughput', 'Implement backpressure']
      ));
    }

    // Process alerts
    for (const alert of alerts) {
      await this.processAlert(alert);
    }
  }

  /**
   * Create alert
   */
  private createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    title: string,
    description: string,
    affectedComponents: string[],
    suggestedActions: string[]
  ): Alert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      description,
      timestamp: new Date().toISOString(),
      resolved: false,
      affectedComponents,
      suggestedActions,
    };
  }

  /**
   * Process alert
   */
  private async processAlert(alert: Alert): Promise<void> {
    // Check if similar alert already exists and is unresolved
    const existingAlert = this.alerts.find(a =>
      !a.resolved &&
      a.type === alert.type &&
      a.title === alert.title &&
      Date.now() - new Date(a.timestamp).getTime() < 300000 // 5 minutes
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    this.alerts.push(alert);
    await this.persistAlert(alert);

    // Send alert notifications
    if (this.config.alerting.enabled) {
      await this.sendAlertNotifications(alert);
    }

    this.emit('alert-created', alert);
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: Alert): Promise<void> {
    for (const channel of this.config.alerting.channels) {
      try {
        switch (channel) {
          case 'console':
            this.sendConsoleAlert(alert);
            break;
          case 'email':
            await this.sendEmailAlert(alert);
            break;
          case 'slack':
            await this.sendSlackAlert(alert);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert);
            break;
        }
      } catch (error) {
        console.error(`Failed to send alert via ${channel}:`, error);
      }
    }
  }

  private sendConsoleAlert(alert: Alert): void {
    const severityEmoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '💥',
    }[alert.severity];

    console.log(`${severityEmoji} ${alert.severity.toUpperCase()} ALERT: ${alert.title}`);
    console.log(`   ${alert.description}`);
    console.log(`   Affected: ${alert.affectedComponents.join(', ')}`);
    console.log(`   Actions: ${alert.suggestedActions.join(', ')}`);
  }

  private async sendEmailAlert(alert: Alert): Promise<void> {
    // Implementation for email alerts
    console.log(`📧 Email alert: ${alert.title}`);
  }

  private async sendSlackAlert(alert: Alert): Promise<void> {
    // Implementation for Slack alerts
    console.log(`💬 Slack alert: ${alert.title}`);
  }

  private async sendWebhookAlert(alert: Alert): Promise<void> {
    // Implementation for webhook alerts
    console.log(`🔗 Webhook alert: ${alert.title}`);
  }

  // ============================================================================
  // PIPELINE MONITORING
  // ============================================================================

  /**
   * Update pipeline metrics
   */
  updatePipelineMetrics(pipelineId: string, metrics: Partial<PipelineMetrics>): void {
    const existing = this.pipelineMetrics.get(pipelineId) || {
      pipelineId,
      status: 'healthy',
      uptime: 0,
      averageExecutionTime: 0,
      successRate: 100,
      throughput: 0,
      errorRate: 0,
      resourceUsage: { cpu: 0, memory: 0, disk: 0, network: 0 },
      queueMetrics: { size: 0, waitTime: 0, processingRate: 0 },
      healthScore: 100,
      alerts: [],
    };

    Object.assign(existing, metrics);
    this.pipelineMetrics.set(pipelineId, existing);

    // Calculate health score
    existing.healthScore = this.calculatePipelineHealthScore(existing);

    // Check pipeline health
    this.checkPipelineHealth(existing);

    this.emit('pipeline-metrics-updated', existing);
  }

  /**
   * Calculate pipeline health score
   */
  private calculatePipelineHealthScore(metrics: PipelineMetrics): number {
    let score = 100;

    // Deduct points for various issues
    if (metrics.errorRate > 5) score -= 20;
    if (metrics.errorRate > 10) score -= 20;
    if (metrics.averageExecutionTime > 5000) score -= 15;
    if (metrics.resourceUsage.cpu > 80) score -= 10;
    if (metrics.resourceUsage.memory > 85) score -= 10;
    if (metrics.queueMetrics.size > 100) score -= 15;

    return Math.max(0, score);
  }

  /**
   * Check pipeline health and create alerts
   */
  private checkPipelineHealth(metrics: PipelineMetrics): void {
    if (metrics.healthScore < 50) {
      metrics.status = 'critical';
    } else if (metrics.healthScore < 70) {
      metrics.status = 'error';
    } else if (metrics.healthScore < 85) {
      metrics.status = 'warning';
    } else {
      metrics.status = 'healthy';
    }

    // Create alerts for critical pipelines
    if (metrics.status === 'critical' || metrics.status === 'error') {
      const alert = this.createAlert(
        'performance',
        metrics.status === 'critical' ? 'critical' : 'high',
        `Pipeline ${metrics.pipelineId} Health Issue`,
        `Pipeline health score dropped to ${metrics.healthScore}`,
        [metrics.pipelineId],
        ['Investigate pipeline performance', 'Check resource usage', 'Review error logs']
      );

      this.processAlert(alert);
    }
  }

  /**
   * Get system-wide metrics
   */
  getSystemMetrics(): SystemMetrics {
    const activePipelines = Array.from(this.pipelineMetrics.values());
    const healthyPipelines = activePipelines.filter(p => p.status === 'healthy').length;
    const overallHealth = activePipelines.length > 0
      ? (healthyPipelines / activePipelines.length) * 100
      : 100;

    const totalThroughput = activePipelines.reduce((sum, p) => sum + p.throughput, 0);
    const systemLoad = this.getCurrentCpuUsage();
    const memoryPressure = this.getCurrentMemoryUsage();
    const diskPressure = this.getCurrentDiskIO();
    const networkPressure = this.getCurrentNetworkIO();
    const errorRate = activePipelines.reduce((sum, p) => sum + p.errorRate, 0) / Math.max(activePipelines.length, 1);

    return {
      overallHealth,
      activePipelines: activePipelines.length,
      totalThroughput,
      systemLoad,
      memoryPressure,
      diskPressure,
      networkPressure,
      errorRate,
      alerts: this.alerts.filter(a => !a.resolved),
      predictions: [], // Would be populated by predictive analyzer
    };
  }

  // ============================================================================
  // PREDICTIVE ANALYTICS
  // ============================================================================

  /**
   * Generate performance predictions
   */
  async generatePredictions(): Promise<SystemPrediction[]> {
    return this.predictiveAnalyzer.analyze(this.metricsBuffer);
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const systemMetrics = this.getSystemMetrics();

    if (systemMetrics.systemLoad > 80) {
      recommendations.push('Consider scaling CPU resources');
    }

    if (systemMetrics.memoryPressure > 85) {
      recommendations.push('Optimize memory usage or scale memory resources');
    }

    if (systemMetrics.errorRate > 5) {
      recommendations.push('Investigate and resolve high error rates');
    }

    if (systemMetrics.totalThroughput < 100) {
      recommendations.push('Optimize processing throughput');
    }

    return recommendations;
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  /**
   * Initialize database tables
   */
  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS processing_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        period TEXT,
        data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        type TEXT,
        severity TEXT,
        title TEXT,
        description TEXT,
        timestamp TEXT,
        resolved BOOLEAN,
        resolution_time TEXT,
        affected_components TEXT,
        suggested_actions TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pipeline_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pipeline_id TEXT,
        timestamp TEXT,
        data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON processing_metrics (timestamp);
      CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts (timestamp);
      CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_id ON pipeline_metrics (pipeline_id, timestamp);
    `);
  }

  /**
   * Persist metrics to database
   */
  private async persistMetrics(metrics: ProcessingMetrics): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO processing_metrics (timestamp, period, data)
      VALUES (?, ?, ?)
    `);

    stmt.run(metrics.timestamp, metrics.period, JSON.stringify(metrics));

    // Clean up old metrics
    const cutoff = new Date(Date.now() - this.config.retentionPeriod * 24 * 60 * 60 * 1000).toISOString();
    this.db.prepare('DELETE FROM processing_metrics WHERE timestamp < ?').run(cutoff);
  }

  /**
   * Persist alert to database
   */
  private async persistAlert(alert: Alert): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO alerts (id, type, severity, title, description, timestamp, resolved, affected_components, suggested_actions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      alert.id,
      alert.type,
      alert.severity,
      alert.title,
      alert.description,
      alert.timestamp,
      alert.resolved ? 1 : 0,
      JSON.stringify(alert.affectedComponents),
      JSON.stringify(alert.suggestedActions)
    );
  }

  /**
   * Load existing alerts
   */
  private loadExistingAlerts(): void {
    const rows = this.db.prepare('SELECT * FROM alerts WHERE resolved = 0').all();

    for (const row of rows) {
      this.alerts.push({
        id: row.id,
        type: row.type,
        severity: row.severity,
        title: row.title,
        description: row.description,
        timestamp: row.timestamp,
        resolved: row.resolved === 1,
        resolutionTime: row.resolution_time,
        affectedComponents: JSON.parse(row.affected_components),
        suggestedActions: JSON.parse(row.suggested_actions),
      });
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get metrics for time range
   */
  getMetrics(timeRange: { start: Date; end: Date }, period: string = '1m'): ProcessingMetrics[] {
    const rows = this.db.prepare(`
      SELECT * FROM processing_metrics
      WHERE timestamp BETWEEN ? AND ?
      AND period = ?
      ORDER BY timestamp DESC
    `).all(timeRange.start.toISOString(), timeRange.end.toISOString(), period);

    return rows.map(row => JSON.parse(row.data));
  }

  /**
   * Get current alerts
   */
  getCurrentAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolutionTime = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE alerts SET resolved = 1, resolution_time = ? WHERE id = ?
    `);

    stmt.run(alert.resolutionTime, alertId);

    this.emit('alert-resolved', alert);

    return true;
  }

  /**
   * Get pipeline metrics
   */
  getPipelineMetrics(pipelineId?: string): PipelineMetrics[] {
    if (pipelineId) {
      const metrics = this.pipelineMetrics.get(pipelineId);
      return metrics ? [metrics] : [];
    }

    return Array.from(this.pipelineMetrics.values());
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    this.removeAllListeners();
  }
}

// ============================================================================
// PREDICTIVE ANALYZER
// ============================================================================

class PredictiveAnalyzer {
  async analyze(metrics: ProcessingMetrics[]): Promise<SystemPrediction[]> {
    const predictions: SystemPrediction[] = [];

    if (metrics.length < 10) {
      return predictions; // Need more data for predictions
    }

    // Simple trend analysis
    const recentMetrics = metrics.slice(-10);
    const olderMetrics = metrics.slice(-20, -10);

    // Predict resource usage
    const cpuTrend = this.calculateTrend(recentMetrics.map(m => m.cpuUsage));
    if (cpuTrend > 0.1) {
      predictions.push({
        type: 'resource',
        prediction: 'CPU usage is trending upward',
        confidence: Math.min(cpuTrend * 100, 90),
        timeframe: '1h',
        impact: 'medium',
        recommendations: ['Monitor CPU usage closely', 'Prepare for scaling if trend continues'],
      });
    }

    // Predict error rates
    const errorTrend = this.calculateTrend(recentMetrics.map(m => m.errorRate));
    if (errorTrend > 0.05) {
      predictions.push({
        type: 'error',
        prediction: 'Error rate is increasing',
        confidence: Math.min(errorTrend * 200, 85),
        timeframe: '30m',
        impact: 'high',
        recommendations: ['Investigate error causes', 'Check system health', 'Prepare incident response'],
      });
    }

    // Predict performance degradation
    const responseTimeTrend = this.calculateTrend(recentMetrics.map(m => m.averageProcessingTime));
    if (responseTimeTrend > 0.2) {
      predictions.push({
        type: 'performance',
        prediction: 'Response times are increasing',
        confidence: Math.min(responseTimeTrend * 100, 80),
        timeframe: '2h',
        impact: 'medium',
        recommendations: ['Optimize processing logic', 'Scale resources', 'Review bottlenecks'],
      });
    }

    return predictions;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    return slope;
  }
}

// ============================================================================
// ANOMALY DETECTOR
// ============================================================================

class AnomalyDetector {
  async detect(metrics: ProcessingMetrics[]): Promise<any[]> {
    const anomalies: any[] = [];

    if (metrics.length < 20) {
      return anomalies; // Need more data for anomaly detection
    }

    const values = metrics.map(m => m.errorRate);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    // Detect anomalies in recent metrics
    const recentValues = values.slice(-5);
    recentValues.forEach((value, index) => {
      const zScore = Math.abs(value - mean) / stdDev;
      if (zScore > 3) { // 3 standard deviations
        anomalies.push({
          type: 'error_rate_spike',
          description: `Error rate spike detected: ${value.toFixed(2)}% (expected: ${mean.toFixed(2)}%)`,
          severity: zScore > 4 ? 'high' : 'medium',
          timestamp: metrics[metrics.length - 5 + index].timestamp,
          value,
          expected: mean,
          zScore,
        });
      }
    });

    return anomalies;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default AdvancedProcessingMetricsMonitor;
