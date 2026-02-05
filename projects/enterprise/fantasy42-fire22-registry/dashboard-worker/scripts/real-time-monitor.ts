#!/usr/bin/env bun
/**
 * 📊 Fire22 Real-Time Performance Monitor
 *
 * Enhanced real-time monitoring system with:
 * - Live performance metrics streaming
 * - API endpoint response time tracking
 * - Resource utilization monitoring
 * - Alert system for performance thresholds
 * - Dashboard integration
 *
 * @version 3.0.9
 * @author Fire22 Development Team
 */

import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PerformanceAlert {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
}

interface APIEndpointMetrics {
  endpoint: string;
  method: string;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalRequests: number;
  successRate: number;
  lastChecked: string;
  status: 'healthy' | 'warning' | 'critical' | 'down';
}

interface SystemMetrics {
  timestamp: string;
  cpu: {
    usage: number;
    load: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    swap?: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connectionsActive: number;
  };
  bun: {
    version: string;
    uptime: number;
    heap: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

interface MonitoringConfig {
  interval: number; // ms
  apiBaseUrl: string;
  alertThresholds: {
    cpu: number;
    memory: number;
    responseTime: number;
    errorRate: number;
  };
  endpoints: string[];
  exportInterval: number; // ms
  maxHistory: number;
}

class RealTimeMonitor {
  private config: MonitoringConfig;
  private isMonitoring = false;
  private alerts: PerformanceAlert[] = [];
  private systemHistory: SystemMetrics[] = [];
  private apiMetrics: Map<string, APIEndpointMetrics> = new Map();
  private intervalIds: NodeJS.Timeout[] = [];

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      interval: 5000, // 5 seconds
      apiBaseUrl: 'http://localhost:8080',
      alertThresholds: {
        cpu: 80,
        memory: 85,
        responseTime: 2000,
        errorRate: 5,
      },
      endpoints: ['/api/health', '/api/health/detailed', '/api/manager/agents', '/dashboard'],
      exportInterval: 60000, // 1 minute
      maxHistory: 288, // 24 hours at 5-second intervals
      ...config,
    };

    console.log('📊 Real-Time Monitor initialized');
    console.log(`📍 Monitoring interval: ${this.config.interval}ms`);
    console.log(`🔗 API Base URL: ${this.config.apiBaseUrl}`);
  }

  /**
   * Start real-time monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️ Monitor is already running');
      return;
    }

    this.isMonitoring = true;
    console.log('🚀 Starting real-time monitoring...\n');

    // System metrics monitoring
    const systemInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.interval);
    this.intervalIds.push(systemInterval);

    // API endpoint monitoring
    const apiInterval = setInterval(() => {
      this.monitorAPIEndpoints();
    }, this.config.interval * 2); // Check APIs less frequently
    this.intervalIds.push(apiInterval);

    // Export data periodically
    const exportInterval = setInterval(() => {
      this.exportMetrics();
    }, this.config.exportInterval);
    this.intervalIds.push(exportInterval);

    // Display live dashboard
    const dashboardInterval = setInterval(() => {
      this.displayLiveDashboard();
    }, this.config.interval);
    this.intervalIds.push(dashboardInterval);

    // Initial metrics collection
    await this.collectSystemMetrics();
    await this.monitorAPIEndpoints();

    console.log('✅ Real-time monitoring started');
    console.log('Press Ctrl+C to stop monitoring\n');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stopMonitoring();
      process.exit(0);
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('\n🛑 Stopping real-time monitoring...');

    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds = [];
    this.isMonitoring = false;

    // Final export
    this.exportMetrics();

    console.log('✅ Monitoring stopped');
  }

  /**
   * Collect system performance metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      cpu: {
        usage: Math.round((cpuUsage.user + cpuUsage.system) / 1000000), // Convert to seconds
        load: process.cpuUsage().user / 1000000,
      },
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      disk: {
        used: 0, // Would need fs stats in real implementation
        total: 0,
        percentage: 0,
      },
      network: {
        bytesIn: 0, // Would need network monitoring
        bytesOut: 0,
        connectionsActive: 0,
      },
      bun: {
        version: Bun.version,
        uptime: process.uptime(),
        heap: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        },
      },
    };

    // Add to history
    this.systemHistory.unshift(metrics);
    if (this.systemHistory.length > this.config.maxHistory) {
      this.systemHistory = this.systemHistory.slice(0, this.config.maxHistory);
    }

    // Check for alerts
    this.checkSystemAlerts(metrics);
  }

  /**
   * Monitor API endpoints
   */
  private async monitorAPIEndpoints(): Promise<void> {
    for (const endpoint of this.config.endpoints) {
      await this.checkEndpoint(endpoint);
    }
  }

  /**
   * Check individual API endpoint
   */
  private async checkEndpoint(endpoint: string): Promise<void> {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    const startTime = performance.now();

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const responseTime = performance.now() - startTime;
      const success = response.ok;

      // Update metrics
      const existing = this.apiMetrics.get(endpoint);
      const totalRequests = (existing?.totalRequests || 0) + 1;
      const successCount = success
        ? (existing ? Math.round((existing.successRate * existing.totalRequests) / 100) : 0) + 1
        : existing
          ? Math.round((existing.successRate * existing.totalRequests) / 100)
          : 0;

      const metrics: APIEndpointMetrics = {
        endpoint,
        method: 'GET',
        averageResponseTime: existing
          ? (existing.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests
          : responseTime,
        minResponseTime: existing ? Math.min(existing.minResponseTime, responseTime) : responseTime,
        maxResponseTime: existing ? Math.max(existing.maxResponseTime, responseTime) : responseTime,
        totalRequests,
        successRate: Math.round((successCount / totalRequests) * 100),
        lastChecked: new Date().toISOString(),
        status: this.getEndpointStatus(responseTime, success),
      };

      this.apiMetrics.set(endpoint, metrics);

      // Check for API alerts
      this.checkAPIAlerts(metrics);
    } catch (error) {
      // Handle endpoint failure
      const metrics: APIEndpointMetrics = {
        endpoint,
        method: 'GET',
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        totalRequests: (this.apiMetrics.get(endpoint)?.totalRequests || 0) + 1,
        successRate: 0,
        lastChecked: new Date().toISOString(),
        status: 'down',
      };

      this.apiMetrics.set(endpoint, metrics);

      this.addAlert({
        id: `api-down-${endpoint}`,
        timestamp: new Date().toISOString(),
        severity: 'critical',
        metric: 'api-availability',
        value: 0,
        threshold: 100,
        message: `API endpoint ${endpoint} is down: ${error.message}`,
      });
    }
  }

  /**
   * Get endpoint status based on response time and success
   */
  private getEndpointStatus(responseTime: number, success: boolean): APIEndpointMetrics['status'] {
    if (!success) return 'down';
    if (responseTime > this.config.alertThresholds.responseTime) return 'critical';
    if (responseTime > this.config.alertThresholds.responseTime * 0.7) return 'warning';
    return 'healthy';
  }

  /**
   * Check system metrics for alerts
   */
  private checkSystemAlerts(metrics: SystemMetrics): void {
    // CPU usage alert
    if (metrics.cpu.usage > this.config.alertThresholds.cpu) {
      this.addAlert({
        id: 'cpu-high',
        timestamp: metrics.timestamp,
        severity: metrics.cpu.usage > 90 ? 'critical' : 'high',
        metric: 'cpu-usage',
        value: metrics.cpu.usage,
        threshold: this.config.alertThresholds.cpu,
        message: `High CPU usage detected: ${metrics.cpu.usage}%`,
      });
    }

    // Memory usage alert
    if (metrics.memory.percentage > this.config.alertThresholds.memory) {
      this.addAlert({
        id: 'memory-high',
        timestamp: metrics.timestamp,
        severity: metrics.memory.percentage > 95 ? 'critical' : 'high',
        metric: 'memory-usage',
        value: metrics.memory.percentage,
        threshold: this.config.alertThresholds.memory,
        message: `High memory usage detected: ${metrics.memory.percentage}%`,
      });
    }
  }

  /**
   * Check API metrics for alerts
   */
  private checkAPIAlerts(metrics: APIEndpointMetrics): void {
    // Response time alert
    if (metrics.averageResponseTime > this.config.alertThresholds.responseTime) {
      this.addAlert({
        id: `response-time-${metrics.endpoint}`,
        timestamp: metrics.lastChecked,
        severity: 'medium',
        metric: 'response-time',
        value: metrics.averageResponseTime,
        threshold: this.config.alertThresholds.responseTime,
        message: `Slow response time for ${metrics.endpoint}: ${metrics.averageResponseTime.toFixed(2)}ms`,
      });
    }

    // Error rate alert
    const errorRate = 100 - metrics.successRate;
    if (errorRate > this.config.alertThresholds.errorRate) {
      this.addAlert({
        id: `error-rate-${metrics.endpoint}`,
        timestamp: metrics.lastChecked,
        severity: errorRate > 10 ? 'high' : 'medium',
        metric: 'error-rate',
        value: errorRate,
        threshold: this.config.alertThresholds.errorRate,
        message: `High error rate for ${metrics.endpoint}: ${errorRate}%`,
      });
    }
  }

  /**
   * Add alert (avoid duplicates)
   */
  private addAlert(alert: PerformanceAlert): void {
    // Remove existing alert with same ID
    this.alerts = this.alerts.filter(a => a.id !== alert.id);

    // Add new alert
    this.alerts.unshift(alert);

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    // Log critical alerts immediately
    if (alert.severity === 'critical') {
      console.log(`\n🚨 CRITICAL ALERT: ${alert.message}`);
    }
  }

  /**
   * Display live dashboard
   */
  private displayLiveDashboard(): void {
    // Clear screen and position cursor at top
    process.stdout.write('\x1b[2J\x1b[H');

    const currentMetrics = this.systemHistory[0];
    if (!currentMetrics) return;

    console.log('🔥 Fire22 Real-Time Performance Dashboard');
    console.log('='.repeat(50));
    console.log(`📅 ${new Date().toLocaleString()}\n`);

    // System metrics
    console.log('💻 System Metrics:');
    console.log(
      `   CPU Usage: ${currentMetrics.cpu.usage}% ${this.getHealthIndicator(currentMetrics.cpu.usage, 80)}`
    );
    console.log(
      `   Memory: ${currentMetrics.memory.used}MB / ${currentMetrics.memory.total}MB (${currentMetrics.memory.percentage}%) ${this.getHealthIndicator(currentMetrics.memory.percentage, 85)}`
    );
    console.log(
      `   Uptime: ${Math.floor(currentMetrics.bun.uptime / 60)}m ${Math.floor(currentMetrics.bun.uptime % 60)}s`
    );
    console.log(`   Bun Version: ${currentMetrics.bun.version}\n`);

    // API endpoints status
    console.log('🌐 API Endpoints:');
    for (const [endpoint, metrics] of this.apiMetrics.entries()) {
      const statusIcon = this.getStatusIcon(metrics.status);
      const responseTime = metrics.averageResponseTime.toFixed(0);
      console.log(
        `   ${statusIcon} ${endpoint} - ${responseTime}ms (${metrics.successRate}% success)`
      );
    }

    // Recent alerts
    if (this.alerts.length > 0) {
      console.log('\n🚨 Recent Alerts:');
      const recentAlerts = this.alerts.slice(0, 5);
      for (const alert of recentAlerts) {
        const severityIcon = this.getSeverityIcon(alert.severity);
        const time = new Date(alert.timestamp).toLocaleTimeString();
        console.log(`   ${severityIcon} [${time}] ${alert.message}`);
      }
    }

    console.log(
      `\n📊 Monitoring active | Interval: ${this.config.interval}ms | Press Ctrl+C to stop`
    );
  }

  /**
   * Get health indicator for metrics
   */
  private getHealthIndicator(value: number, threshold: number): string {
    if (value > threshold * 1.1) return '🔴';
    if (value > threshold) return '🟡';
    return '🟢';
  }

  /**
   * Get status icon for endpoints
   */
  private getStatusIcon(status: APIEndpointMetrics['status']): string {
    switch (status) {
      case 'healthy':
        return '🟢';
      case 'warning':
        return '🟡';
      case 'critical':
        return '🟠';
      case 'down':
        return '🔴';
      default:
        return '⚪';
    }
  }

  /**
   * Get severity icon for alerts
   */
  private getSeverityIcon(severity: PerformanceAlert['severity']): string {
    switch (severity) {
      case 'low':
        return '🔵';
      case 'medium':
        return '🟡';
      case 'high':
        return '🟠';
      case 'critical':
        return '🔴';
      default:
        return '⚪';
    }
  }

  /**
   * Export metrics to file
   */
  private exportMetrics(): void {
    const exportData = {
      timestamp: new Date().toISOString(),
      config: this.config,
      systemMetrics: {
        current: this.systemHistory[0],
        history: this.systemHistory.slice(0, 60), // Last 5 minutes at 5s intervals
      },
      apiMetrics: Object.fromEntries(this.apiMetrics),
      alerts: this.alerts.slice(0, 20), // Recent alerts
      summary: {
        totalAlerts: this.alerts.length,
        criticalAlerts: this.alerts.filter(a => a.severity === 'critical').length,
        uptime: this.systemHistory[0]?.bun.uptime || 0,
        healthyEndpoints: Array.from(this.apiMetrics.values()).filter(m => m.status === 'healthy')
          .length,
        totalEndpoints: this.apiMetrics.size,
      },
    };

    const exportPath = join(process.cwd(), 'monitoring-report.json');
    writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  }

  /**
   * Generate performance report
   */
  async generateReport(): Promise<string> {
    const reportPath = join(process.cwd(), `performance-report-${Date.now()}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      duration: (this.systemHistory.length * this.config.interval) / 1000, // seconds
      systemMetrics: {
        samples: this.systemHistory.length,
        averageCPU:
          this.systemHistory.reduce((sum, m) => sum + m.cpu.usage, 0) / this.systemHistory.length,
        averageMemory:
          this.systemHistory.reduce((sum, m) => sum + m.memory.percentage, 0) /
          this.systemHistory.length,
        peakCPU: Math.max(...this.systemHistory.map(m => m.cpu.usage)),
        peakMemory: Math.max(...this.systemHistory.map(m => m.memory.percentage)),
      },
      apiMetrics: Object.fromEntries(this.apiMetrics),
      alerts: {
        total: this.alerts.length,
        bySeverity: {
          critical: this.alerts.filter(a => a.severity === 'critical').length,
          high: this.alerts.filter(a => a.severity === 'high').length,
          medium: this.alerts.filter(a => a.severity === 'medium').length,
          low: this.alerts.filter(a => a.severity === 'low').length,
        },
      },
    };

    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return reportPath;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const config: Partial<MonitoringConfig> = {};
  let duration = 0; // 0 = infinite

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--interval':
      case '-i':
        config.interval = parseInt(args[++i]);
        break;
      case '--api-url':
      case '-u':
        config.apiBaseUrl = args[++i];
        break;
      case '--duration':
      case '-d':
        duration = parseInt(args[++i]) * 1000; // Convert to ms
        break;
      case '--cpu-threshold':
        config.alertThresholds = { ...config.alertThresholds, cpu: parseInt(args[++i]) };
        break;
      case '--memory-threshold':
        config.alertThresholds = { ...config.alertThresholds, memory: parseInt(args[++i]) };
        break;
      case '--help':
      case '-h':
        console.log(`
📊 Fire22 Real-Time Performance Monitor

USAGE:
  bun run scripts/real-time-monitor.ts [options]

OPTIONS:
  -i, --interval <ms>         Monitoring interval (default: 5000)
  -u, --api-url <url>        API base URL (default: http://localhost:8080)
  -d, --duration <seconds>   Monitoring duration (default: infinite)
  --cpu-threshold <percent>  CPU alert threshold (default: 80)
  --memory-threshold <percent> Memory alert threshold (default: 85)
  -h, --help                 Show this help message

EXAMPLES:
  bun run scripts/real-time-monitor.ts              # Monitor indefinitely
  bun run scripts/real-time-monitor.ts -d 300      # Monitor for 5 minutes
  bun run scripts/real-time-monitor.ts -i 1000     # Monitor every second
  fire22 monitor                                    # Via Fire22 CLI

🔥 Fire22 Development Team - Enterprise Dashboard System
`);
        process.exit(0);
    }
  }

  const monitor = new RealTimeMonitor(config);

  try {
    await monitor.startMonitoring();

    // Stop monitoring after duration if specified
    if (duration > 0) {
      setTimeout(async () => {
        monitor.stopMonitoring();
        const reportPath = await monitor.generateReport();
        console.log(`\n📊 Performance report generated: ${reportPath}`);
        process.exit(0);
      }, duration);
    }
  } catch (error) {
    console.error('💥 Monitoring failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('💥 Real-time monitoring failed:', error);
    process.exit(1);
  });
}

export { RealTimeMonitor, PerformanceAlert, APIEndpointMetrics, SystemMetrics };
