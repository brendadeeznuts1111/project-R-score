#!/usr/bin/env bun

/**
 * 📊 R2 Analytics & Metrics Dashboard
 * 
 * Comprehensive analytics for R2 storage with:
 * - Real-time metrics collection and aggregation
 * - Usage patterns and trend analysis
 * - Performance monitoring and alerting
 * - Cost analysis and optimization recommendations
 * - Custom dashboards and visualizations
 */

import { styled, FW_COLORS } from '../theme/colors.ts';
import { r2EventSystem } from './r2-event-system.ts';

export interface MetricDataPoint {
  timestamp: string;
  value: number;
  labels: Record<string, string>;
}

export interface TimeSeries {
  name: string;
  unit: string;
  data: MetricDataPoint[];
  metadata?: Record<string, any>;
}

export interface R2Metrics {
  storage: {
    totalSize: number;
    objectCount: number;
    sizeByBucket: Record<string, number>;
    objectsByBucket: Record<string, number>;
    sizeByClass: Record<string, number>;
    growthRate: number; // bytes/day
  };
  operations: {
    reads: number;
    writes: number;
    deletes: number;
    lists: number;
    errors: number;
    latency: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
  bandwidth: {
    ingress: number; // bytes
    egress: number; // bytes
    byBucket: Record<string, { in: number; out: number }>;
  };
  costs: {
    storageCost: number;
    operationCost: number;
    bandwidthCost: number;
    totalCost: number;
    projectedMonthly: number;
  };
}

export interface UsagePattern {
  pattern: string;
  frequency: number;
  peakHours: number[];
  popularKeys: string[];
  accessTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface AlertRule {
  id: string;
  name: string;
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number; // seconds
  };
  actions: Array<{
    type: 'email' | 'webhook' | 'slack' | 'log';
    target: string;
    message?: string;
  }>;
  enabled: boolean;
  lastTriggered?: string;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'stat' | 'table' | 'gauge';
  title: string;
  metric: string;
  query: string;
  refreshInterval: number;
  config: Record<string, any>;
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  timeRange: { from: string; to: string };
  refreshInterval: number;
}

export class R2Analytics {
  private metrics: Map<string, TimeSeries> = new Map();
  private alerts: Map<string, AlertRule> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private retentionDays: number = 90;
  private isCollecting: boolean = false;
  private collectionInterval?: Timer;

  /**
   * Initialize analytics system
   */
  async initialize(): Promise<void> {
    console.log(styled('📊 Initializing R2 Analytics', 'accent'));

    // Subscribe to events for metrics collection
    this.setupEventListeners();

    // Start metrics collection
    this.startCollection();

    // Load default alerts
    this.loadDefaultAlerts();

    // Create default dashboard
    this.createDefaultDashboard();

    console.log(styled('✅ Analytics system initialized', 'success'));
  }

  /**
   * Setup event listeners for metrics
   */
  private setupEventListeners(): void {
    // Storage operations
    r2EventSystem.on('object:created', (event) => {
      this.recordMetric('storage.writes', 1, { bucket: event.bucket });
      if (event.metadata?.size) {
        this.recordMetric('storage.size', event.metadata.size, { bucket: event.bucket });
      }
    });

    r2EventSystem.on('object:accessed', (event) => {
      this.recordMetric('storage.reads', 1, { bucket: event.bucket, key: event.key });
    });

    r2EventSystem.on('object:deleted', (event) => {
      this.recordMetric('storage.deletes', 1, { bucket: event.bucket });
    });

    // Sync operations
    r2EventSystem.on('bucket:sync-completed', (event) => {
      this.recordMetric('sync.operations', 1, { bucket: event.bucket, status: 'success' });
    });

    r2EventSystem.on('bucket:sync-failed', (event) => {
      this.recordMetric('sync.operations', 1, { bucket: event.bucket, status: 'failed' });
    });

    // Backup operations
    r2EventSystem.on('backup:completed', (event) => {
      this.recordMetric('backup.operations', 1, { bucket: event.bucket, status: 'success' });
    });

    // Lifecycle events
    r2EventSystem.on('lifecycle:expired', (event) => {
      this.recordMetric('lifecycle.expired', 1, { bucket: event.bucket });
    });
  }

  /**
   * Start metrics collection
   */
  private startCollection(): void {
    if (this.isCollecting) return;

    this.isCollecting = true;
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 60000); // Every minute

    console.log(styled('📈 Metrics collection started', 'info'));
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    // In production, would query R2 API for actual metrics
    this.recordMetric('system.uptime', 1, {});
    
    // Cleanup old data
    this.cleanupOldMetrics();
  }

  /**
   * Record a metric data point
   */
  recordMetric(name: string, value: number, labels: Record<string, string>): void {
    const timestamp = new Date().toISOString();
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        unit: this.inferUnit(name),
        data: []
      });
    }

    const series = this.metrics.get(name)!;
    series.data.push({
      timestamp,
      value,
      labels
    });

    // Check alerts
    this.checkAlerts(name, value, labels);
  }

  /**
   * Get metrics summary
   */
  getMetrics(timeRange?: { from: string; to: string }): R2Metrics {
    const now = new Date();
    const from = timeRange ? new Date(timeRange.from) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const to = timeRange ? new Date(timeRange.to) : now;

    return {
      storage: this.calculateStorageMetrics(from, to),
      operations: this.calculateOperationMetrics(from, to),
      bandwidth: this.calculateBandwidthMetrics(from, to),
      costs: this.calculateCostMetrics(from, to)
    };
  }

  /**
   * Calculate storage metrics
   */
  private calculateStorageMetrics(from: Date, to: Date): R2Metrics['storage'] {
    const sizeSeries = this.metrics.get('storage.size')?.data || [];
    const filtered = sizeSeries.filter(d => {
      const ts = new Date(d.timestamp);
      return ts >= from && ts <= to;
    });

    const byBucket: Record<string, number> = {};
    filtered.forEach(d => {
      const bucket = d.labels.bucket || 'unknown';
      byBucket[bucket] = (byBucket[bucket] || 0) + d.value;
    });

    const totalSize = Object.values(byBucket).reduce((a, b) => a + b, 0);
    
    // Calculate growth rate
    const dayAgo = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    const recent = filtered.filter(d => new Date(d.timestamp) > dayAgo);
    const growthRate = recent.length > 0 ? totalSize / recent.length : 0;

    return {
      totalSize,
      objectCount: filtered.length,
      sizeByBucket: byBucket,
      objectsByBucket: {}, // Would calculate from object counts
      sizeByClass: {}, // Would calculate from storage class metrics
      growthRate
    };
  }

  /**
   * Calculate operation metrics
   */
  private calculateOperationMetrics(from: Date, to: Date): R2Metrics['operations'] {
    const reads = this.aggregateMetric('storage.reads', from, to);
    const writes = this.aggregateMetric('storage.writes', from, to);
    const deletes = this.aggregateMetric('storage.deletes', from, to);

    // Calculate latency percentiles
    const latencyData = this.metrics.get('storage.latency')?.data || [];
    const latencies = latencyData
      .filter(d => {
        const ts = new Date(d.timestamp);
        return ts >= from && ts <= to;
      })
      .map(d => d.value)
      .sort((a, b) => a - b);

    return {
      reads,
      writes,
      deletes,
      lists: this.aggregateMetric('storage.lists', from, to),
      errors: this.aggregateMetric('storage.errors', from, to),
      latency: {
        p50: this.percentile(latencies, 50),
        p95: this.percentile(latencies, 95),
        p99: this.percentile(latencies, 99)
      }
    };
  }

  /**
   * Calculate bandwidth metrics
   */
  private calculateBandwidthMetrics(from: Date, to: Date): R2Metrics['bandwidth'] {
    const ingress = this.aggregateMetric('bandwidth.ingress', from, to);
    const egress = this.aggregateMetric('bandwidth.egress', from, to);

    const byBucket: Record<string, { in: number; out: number }> = {};
    
    // Aggregate by bucket
    ['storage.writes', 'storage.reads'].forEach(metricName => {
      const series = this.metrics.get(metricName);
      if (!series) return;

      series.data
        .filter(d => {
          const ts = new Date(d.timestamp);
          return ts >= from && ts <= to;
        })
        .forEach(d => {
          const bucket = d.labels.bucket || 'unknown';
          if (!byBucket[bucket]) {
            byBucket[bucket] = { in: 0, out: 0 };
          }
          if (metricName === 'storage.writes') {
            byBucket[bucket].in += d.value;
          } else {
            byBucket[bucket].out += d.value;
          }
        });
    });

    return { ingress, egress, byBucket };
  }

  /**
   * Calculate cost metrics
   */
  private calculateCostMetrics(from: Date, to: Date): R2Metrics['costs'] {
    const storage = this.calculateStorageMetrics(from, to);
    const operations = this.calculateOperationMetrics(from, to);
    const bandwidth = this.calculateBandwidthMetrics(from, to);

    // R2 pricing (simplified)
    const storageCost = (storage.totalSize / 1024 / 1024 / 1024) * 0.015; // $0.015/GB/month
    const operationCost = (operations.reads + operations.writes + operations.deletes) * 0.0000004; // $0.36 per million
    const bandwidthCost = bandwidth.egress > 10 * 1024 * 1024 * 1024 ? 
      ((bandwidth.egress - 10 * 1024 * 1024 * 1024) / 1024 / 1024 / 1024) * 0.09 : 0; // Free first 10GB

    const totalCost = storageCost + operationCost + bandwidthCost;
    const daysDiff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    const projectedMonthly = daysDiff > 0 ? (totalCost / daysDiff) * 30 : 0;

    return {
      storageCost,
      operationCost,
      bandwidthCost,
      totalCost,
      projectedMonthly
    };
  }

  /**
   * Analyze usage patterns
   */
  analyzePatterns(timeRange?: { from: string; to: string }): UsagePattern[] {
    const patterns: UsagePattern[] = [];
    const reads = this.metrics.get('storage.reads')?.data || [];

    // Group by hour to find peak hours
    const hourlyAccess: number[] = new Array(24).fill(0);
    reads.forEach(d => {
      const hour = new Date(d.timestamp).getHours();
      hourlyAccess[hour]++;
    });

    const peakHours = hourlyAccess
      .map((count, hour) => ({ count, hour }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(h => h.hour);

    // Find popular keys
    const keyAccess: Record<string, number> = {};
    reads.forEach(d => {
      if (d.labels.key) {
        keyAccess[d.labels.key] = (keyAccess[d.labels.key] || 0) + 1;
      }
    });

    const popularKeys = Object.entries(keyAccess)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key]) => key);

    patterns.push({
      pattern: 'access-by-hour',
      frequency: reads.length,
      peakHours,
      popularKeys,
      accessTrend: reads.length > 1000 ? 'increasing' : 'stable'
    });

    return patterns;
  }

  /**
   * Create alert rule
   */
  createAlert(rule: Omit<AlertRule, 'id'>): AlertRule {
    const alert: AlertRule = {
      ...rule,
      id: `alert-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    };

    this.alerts.set(alert.id, alert);
    console.log(styled(`🔔 Created alert: ${alert.name}`, 'success'));
    return alert;
  }

  /**
   * Check alerts against metric value
   */
  private checkAlerts(metricName: string, value: number, labels: Record<string, string>): void {
    for (const alert of this.alerts.values()) {
      if (!alert.enabled) continue;
      if (alert.condition.metric !== metricName) continue;

      const triggered = this.evaluateCondition(alert.condition, value);
      
      if (triggered) {
        alert.lastTriggered = new Date().toISOString();
        this.triggerAlert(alert, value, labels);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(
    condition: AlertRule['condition'],
    value: number
  ): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'eq': return value === condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lte': return value <= condition.threshold;
      default: return false;
    }
  }

  /**
   * Trigger alert actions
   */
  private triggerAlert(alert: AlertRule, value: number, labels: Record<string, string>): void {
    console.log(styled(`🚨 Alert triggered: ${alert.name} (${value})`, 'error'));

    for (const action of alert.actions) {
      switch (action.type) {
        case 'log':
          console.log(styled(`[ALERT] ${alert.name}: ${action.message || 'Threshold exceeded'}`, 'warning'));
          break;
        case 'webhook':
          // Would send webhook
          break;
        case 'email':
          // Would send email
          break;
        case 'slack':
          // Would send Slack notification
          break;
      }
    }
  }

  /**
   * Create dashboard
   */
  createDashboard(name: string, widgets: Omit<DashboardWidget, 'id'>[]): Dashboard {
    const dashboard: Dashboard = {
      id: `dash-${Date.now()}`,
      name,
      widgets: widgets.map((w, i) => ({ ...w, id: `widget-${i}` })),
      timeRange: {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      },
      refreshInterval: 30000
    };

    this.dashboards.set(dashboard.id, dashboard);
    console.log(styled(`📊 Created dashboard: ${name}`, 'success'));
    return dashboard;
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(): Array<{
    type: 'cost' | 'performance' | 'security';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    potentialSavings?: number;
  }> {
    const recommendations = [];
    const metrics = this.getMetrics();

    // Cost recommendations
    if (metrics.costs.projectedMonthly > 100) {
      recommendations.push({
        type: 'cost',
        priority: 'medium',
        title: 'Enable lifecycle policies',
        description: 'Configure automatic transition to cheaper storage classes',
        potentialSavings: metrics.costs.storageCost * 0.5
      });
    }

    // Performance recommendations
    if (metrics.operations.latency.p95 > 500) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'High latency detected',
        description: 'P95 latency exceeds 500ms. Consider using CDN or edge caching.'
      });
    }

    // Security recommendations
    const publicAccess = this.metrics.get('security.public-objects')?.data || [];
    if (publicAccess.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        title: 'Public objects detected',
        description: `${publicAccess.length} objects may have public access. Review permissions.`
      });
    }

    return recommendations;
  }

  /**
   * Generate HTML dashboard
   */
  generateHTMLDashboard(dashboardId: string): string {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return '<p>Dashboard not found</p>';

    const metrics = this.getMetrics(dashboard.timeRange);

    return `
<!DOCTYPE html>
<html>
<head>
  <title>R2 Analytics - ${dashboard.name}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: system-ui; background: #1f2937; color: #fff; padding: 20px; }
    .metric-card { background: #374151; padding: 20px; border-radius: 8px; margin: 10px; }
    .metric-value { font-size: 2em; font-weight: bold; color: #3b82f6; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
  </style>
</head>
<body>
  <h1>🏭 R2 Analytics Dashboard</h1>
  <div class="grid">
    <div class="metric-card">
      <h3>Storage</h3>
      <div class="metric-value">${(metrics.storage.totalSize / 1024 / 1024 / 1024).toFixed(2)} GB</div>
      <p>${metrics.storage.objectCount.toLocaleString()} objects</p>
    </div>
    <div class="metric-card">
      <h3>Operations (24h)</h3>
      <div class="metric-value">${(metrics.operations.reads + metrics.operations.writes).toLocaleString()}</div>
      <p>Reads: ${metrics.operations.reads} | Writes: ${metrics.operations.writes}</p>
    </div>
    <div class="metric-card">
      <h3>Estimated Cost</h3>
      <div class="metric-value">$${metrics.costs.projectedMonthly.toFixed(2)}</div>
      <p>per month</p>
    </div>
    <div class="metric-card">
      <h3>Latency (P95)</h3>
      <div class="metric-value">${metrics.operations.latency.p95}ms</div>
      <p>P50: ${metrics.operations.latency.p50}ms | P99: ${metrics.operations.latency.p99}ms</p>
    </div>
  </div>
</body>
</html>`;
  }

  // Private helpers

  private inferUnit(name: string): string {
    if (name.includes('size') || name.includes('bytes')) return 'bytes';
    if (name.includes('latency') || name.includes('duration')) return 'ms';
    if (name.includes('count') || name.includes('operations')) return 'count';
    return 'unknown';
  }

  private aggregateMetric(name: string, from: Date, to: Date): number {
    const series = this.metrics.get(name);
    if (!series) return 0;

    return series.data
      .filter(d => {
        const ts = new Date(d.timestamp);
        return ts >= from && ts <= to;
      })
      .reduce((sum, d) => sum + d.value, 0);
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    
    for (const series of this.metrics.values()) {
      series.data = series.data.filter(d => new Date(d.timestamp) > cutoff);
    }
  }

  private loadDefaultAlerts(): void {
    this.createAlert({
      name: 'High Storage Cost',
      condition: {
        metric: 'costs.total',
        operator: 'gt',
        threshold: 100,
        duration: 3600
      },
      actions: [{ type: 'log', target: 'console' }],
      enabled: true
    });

    this.createAlert({
      name: 'High Error Rate',
      condition: {
        metric: 'storage.errors',
        operator: 'gt',
        threshold: 10,
        duration: 300
      },
      actions: [{ type: 'log', target: 'console' }],
      enabled: true
    });
  }

  private createDefaultDashboard(): void {
    this.createDashboard('R2 Overview', [
      { type: 'stat', title: 'Storage Size', metric: 'storage.totalSize', query: '', refreshInterval: 60000, config: {} },
      { type: 'chart', title: 'Operations', metric: 'storage.operations', query: '', refreshInterval: 60000, config: { type: 'line' } },
      { type: 'gauge', title: 'Cost', metric: 'costs.total', query: '', refreshInterval: 3600000, config: { max: 100 } }
    ]);
  }
}

// Export singleton
export const r2Analytics = new R2Analytics();

// CLI interface
if (import.meta.main) {
  const analytics = r2Analytics;
  await analytics.initialize();

  console.log(styled('\n📊 R2 Analytics Demo', 'accent'));
  console.log(styled('====================', 'accent'));

  // Record some sample metrics
  analytics.recordMetric('storage.size', 1024 * 1024 * 100, { bucket: 'scanner-cookies' });
  analytics.recordMetric('storage.reads', 150, { bucket: 'scanner-cookies' });
  analytics.recordMetric('storage.writes', 50, { bucket: 'scanner-cookies' });

  // Get metrics
  const metrics = analytics.getMetrics();
  console.log(styled('\n📈 Current Metrics:', 'info'));
  console.log(styled(`  Storage: ${(metrics.storage.totalSize / 1024 / 1024).toFixed(2)} MB`, 'muted'));
  console.log(styled(`  Objects: ${metrics.storage.objectCount}`, 'muted'));
  console.log(styled(`  Reads: ${metrics.operations.reads}`, 'muted'));
  console.log(styled(`  Writes: ${metrics.operations.writes}`, 'muted'));

  // Get recommendations
  const recommendations = analytics.getRecommendations();
  console.log(styled('\n💡 Recommendations:', 'info'));
  for (const rec of recommendations) {
    console.log(styled(`  [${rec.priority.toUpperCase()}] ${rec.title}`, rec.priority === 'high' ? 'error' : 'warning'));
    console.log(styled(`     ${rec.description}`, 'muted'));
  }
}
