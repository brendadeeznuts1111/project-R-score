export class DashboardPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private startTime: number;
  private alerts: Map<string, any> = new Map();
  private performanceHistory: any[] = [];

  constructor() {
    this.startTime = performance.now();
  }

  // Bun 1.3 optimized performance tracking
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 1000 values for memory efficiency
    if (values.length > 1000) {
      values.shift();
    }
  }

  recordAlert(name: string, severity: string, message: string, data?: any): void {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      severity,
      message,
      data,
      timestamp: Date.now(),
      active: true
    };

    this.alerts.set(alert.id, alert);

    // Log alert based on severity
    const logMethod = severity === 'critical' ? console.error :
                     severity === 'warning' ? console.warn :
                     console.info;

    logMethod(`🚨 ${severity.toUpperCase()}: ${name} - ${message}`);
  }

  resolveAlert(alertId: string): void {
    if (this.alerts.has(alertId)) {
      const alert = this.alerts.get(alertId);
      alert.active = false;
      alert.resolvedAt = Date.now();

      console.info(`✅ Alert resolved: ${alert.name}`);
    }
  }

  getPerformanceReport(): any {
    const report: any = {
      timestamp: Date.now(),
      uptime: performance.now() - this.startTime,
      metrics: {},
      alerts: Array.from(this.alerts.values()),
      system: this.getSystemInfo()
    };

    for (const [name, values] of this.metrics.entries()) {
      if (values.length === 0) continue;

      const sorted = values.slice().sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const count = sorted.length;

      report.metrics[name] = {
        count,
        average: sum / count,
        min: sorted[0],
        max: sorted[count - 1],
        median: this.percentile(sorted, 0.5),
        p95: this.percentile(sorted, 0.95),
        p99: this.percentile(sorted, 0.99),
        trend: this.calculateTrend(name),
        rate: this.calculateRate(name)
      };
    }

    // Store in performance history
    this.performanceHistory.push(report);
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }

    return report;
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateTrend(metricName: string): number {
    const values = this.metrics.get(metricName);
    if (!values || values.length < 10) return 0;

    const recent = values.slice(-5);
    const previous = values.slice(-10, -5);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

    return previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
  }

  private calculateRate(metricName: string): number {
    const values = this.metrics.get(metricName);
    if (!values || values.length < 2) return 0;

    const timeWindow = 60; // Assume 1 minute window
    const recentValues = values.slice(-Math.min(values.length, timeWindow));
    const total = recentValues.reduce((a, b) => a + b, 0);

    return total / (recentValues.length / 60); // per second
  }

  private getSystemInfo(): any {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      bunVersion: Bun.version,
      environment: Bun.env.NODE_ENV,
      pid: process.pid,
      memory: {
        rss: this.formatBytes(memUsage.rss),
        heapUsed: this.formatBytes(memUsage.heapUsed),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        external: this.formatBytes(memUsage.external),
        utilization: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000), // microseconds to milliseconds
        system: Math.round(cpuUsage.system / 1000),
        total: Math.round((cpuUsage.user + cpuUsage.system) / 1000)
      },
      uptime: process.uptime(),
      loadAverage: this.getLoadAverage()
    };
  }

  private getLoadAverage(): any {
    try {
      // This is platform-dependent, simplified implementation
      const uptime = process.uptime();
      return {
        '1min': uptime > 0 ? Math.random() * 2 : 0, // Mock for demo
        '5min': uptime > 0 ? Math.random() * 1.5 : 0,
        '15min': uptime > 0 ? Math.random() * 1 : 0
      };
    } catch (error) {
      return { '1min': 0, '5min': 0, '15min': 0 };
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Alert evaluation methods
  evaluateAlerts(rules: any[]): void {
    for (const rule of rules) {
      try {
        const isTriggered = this.evaluateCondition(rule.condition);
        const existingAlert = Array.from(this.alerts.values())
          .find(a => a.name === rule.name && a.active);

        if (isTriggered && !existingAlert) {
          this.recordAlert(rule.name, rule.severity, rule.message, {
            condition: rule.condition,
            threshold: rule.threshold
          });
        } else if (!isTriggered && existingAlert) {
          this.resolveAlert(existingAlert.id);
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${rule.name}:`, error);
      }
    }
  }

  private evaluateCondition(condition: string): boolean {
    try {
      // Parse simple conditions like "metric_name > threshold"
      const conditions: { [key: string]: () => boolean } = {
        'http_request_duration_p95 > 500': () => {
          const metric = this.metrics.get('http_request_duration_p95');
          return metric ? this.percentile(metric.slice().sort((a, b) => a - b), 0.95) > 500 : false;
        },
        'memory_utilization > 80': () => {
          const memUsage = process.memoryUsage();
          return (memUsage.heapUsed / memUsage.heapTotal) * 100 > 80;
        },
        'error_rate > 5': () => {
          const errorMetric = this.metrics.get('error_rate');
          return errorMetric ? errorMetric[errorMetric.length - 1] > 5 : false;
        }
      };

      return conditions[condition]?.() || false;
    } catch (error) {
      console.error("Error evaluating condition:", error);
      return false;
    }
  }

  // Performance optimization methods
  optimizePerformance(): void {
    // Clear old metrics to reduce memory usage
    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 500) {
        // Keep only recent values
        this.metrics.set(name, values.slice(-100));
      }
    }

    // Clear old performance history
    if (this.performanceHistory.length > 50) {
      this.performanceHistory = this.performanceHistory.slice(-25);
    }

    console.log("🧹 Performance monitor optimized");
  }

  // Export methods
  exportMetrics(format: 'json' | 'csv' | 'prometheus' = 'json'): string {
    const report = this.getPerformanceReport();

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);

      case 'csv':
        return this.convertToCSV(report);

      case 'prometheus':
        return this.convertToPrometheus(report);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private convertToCSV(report: any): string {
    const rows = [
      ['Metric', 'Count', 'Average', 'Min', 'Max', 'P95', 'P99', 'Trend', 'Rate'],
      ...Object.entries(report.metrics).map(([name, data]: [string, any]) => [
        name,
        data.count,
        data.average.toFixed(2),
        data.min.toFixed(2),
        data.max.toFixed(2),
        data.p95.toFixed(2),
        data.p99.toFixed(2),
        data.trend.toFixed(2) + '%',
        data.rate.toFixed(2)
      ])
    ];

    return rows.map(row => row.join(',')).join('\n');
  }

  private convertToPrometheus(report: any): string {
    let output = '# Performance Monitor Metrics\n';

    for (const [name, data] of Object.entries(report.metrics)) {
      output += `\n# ${name}\n`;
      output += `performance_${name}_count ${data.count}\n`;
      output += `performance_${name}_average ${data.average}\n`;
      output += `performance_${name}_min ${data.min}\n`;
      output += `performance_${name}_max ${data.max}\n`;
      output += `performance_${name}_p95 ${data.p95}\n`;
      output += `performance_${name}_p99 ${data.p99}\n`;
      output += `performance_${name}_trend_percent ${data.trend}\n`;
      output += `performance_${name}_rate_per_second ${data.rate}\n`;
    }

    output += `\n# System Metrics\n`;
    output += `performance_uptime_seconds ${report.uptime}\n`;
    output += `performance_memory_utilization_percent ${report.system.memory.utilization}\n`;

    return output;
  }

  // Get active alerts
  getActiveAlerts(): any[] {
    return Array.from(this.alerts.values()).filter(alert => alert.active);
  }

  // Get resolved alerts (last 24 hours)
  getResolvedAlerts(hours: number = 24): any[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return Array.from(this.alerts.values())
      .filter(alert => !alert.active && alert.resolvedAt > cutoff);
  }

  // Cleanup old alerts
  cleanupOldAlerts(days: number = 7): number {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    let removed = 0;

    for (const [id, alert] of this.alerts.entries()) {
      if (!alert.active && alert.timestamp < cutoff) {
        this.alerts.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old alerts`);
    }

    return removed;
  }

  // Reset all metrics (useful for testing)
  reset(): void {
    this.metrics.clear();
    this.alerts.clear();
    this.performanceHistory.length = 0;
    this.startTime = performance.now();
    console.log("🔄 Performance monitor reset");
  }
}

// Export singleton instance
export const performanceMonitor = new DashboardPerformanceMonitor();

// Export helper functions
export const recordMetric = (name: string, value: number) =>
  performanceMonitor.recordMetric(name, value);

export const recordAlert = (name: string, severity: string, message: string, data?: any) =>
  performanceMonitor.recordAlert(name, severity, message, data);

export const getPerformanceReport = () =>
  performanceMonitor.getPerformanceReport();