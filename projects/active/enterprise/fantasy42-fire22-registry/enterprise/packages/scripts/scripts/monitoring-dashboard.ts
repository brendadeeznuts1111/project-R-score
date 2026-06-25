#!/usr/bin/env bun
/**
 * 🔥 Fire22 Interactive Monitoring Dashboard
 *
 * Comprehensive real-time monitoring system with:
 * - Live metrics collection
 * - Performance analysis
 * - Alert management
 * - Historical tracking
 *
 * @version 3.0.9
 */

import { randomInt } from 'crypto';
import chalk from 'chalk';
import boxen from 'boxen';

interface SystemMetrics {
  timestamp: number;
  cpu: number;
  memory: number;
  disk: number;
  network: {
    in: number;
    out: number;
  };
  processes: number;
  uptime: number;
}

interface ApiEndpoint {
  name: string;
  url: string;
  method: string;
  responseTime: number;
  status: 'healthy' | 'degraded' | 'down';
  successRate: number;
  errorCount: number;
  lastError?: string;
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  component: string;
  message: string;
  timestamp: number;
  resolved: boolean;
}

interface PerformanceMetrics {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  stdDev: number;
  throughput: number;
}

class MonitoringDashboard {
  private metrics: SystemMetrics[] = [];
  private endpoints: Map<string, ApiEndpoint> = new Map();
  private alerts: Alert[] = [];
  private performanceHistory: PerformanceMetrics[] = [];

  constructor() {
    this.initializeEndpoints();
    this.startMetricsCollection();
  }

  private initializeEndpoints() {
    const endpoints: ApiEndpoint[] = [
      {
        name: 'Health Check',
        url: '/health',
        method: 'GET',
        responseTime: 0,
        status: 'healthy',
        successRate: 100,
        errorCount: 0,
      },
      {
        name: 'Fire22 Customers',
        url: '/api/customers',
        method: 'GET',
        responseTime: 0,
        status: 'healthy',
        successRate: 99.5,
        errorCount: 2,
      },
      {
        name: 'Live Wagers',
        url: '/api/manager/getLiveWagers',
        method: 'POST',
        responseTime: 0,
        status: 'healthy',
        successRate: 98.2,
        errorCount: 5,
      },
      {
        name: 'Weekly Figures',
        url: '/api/manager/getWeeklyFigureByAgent',
        method: 'POST',
        responseTime: 0,
        status: 'healthy',
        successRate: 99.8,
        errorCount: 1,
      },
      {
        name: 'DNS Cache Stats',
        url: '/api/fire22/dns-stats',
        method: 'GET',
        responseTime: 0,
        status: 'healthy',
        successRate: 100,
        errorCount: 0,
      },
    ];

    endpoints.forEach(ep => this.endpoints.set(ep.name, ep));
  }

  private startMetricsCollection() {
    // Simulate continuous metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
      this.updateEndpointStatus();
      this.checkForAlerts();
      this.calculatePerformanceMetrics();
    }, 1000);
  }

  private collectSystemMetrics() {
    const metrics: SystemMetrics = {
      timestamp: Date.now(),
      cpu: 45 + randomInt(0, 20),
      memory: 60 + randomInt(0, 15),
      disk: 35 + randomInt(0, 10),
      network: {
        in: 100 + randomInt(0, 50),
        out: 80 + randomInt(0, 40),
      },
      processes: 150 + randomInt(0, 30),
      uptime: process.uptime(),
    };

    this.metrics.push(metrics);
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  private updateEndpointStatus() {
    this.endpoints.forEach(endpoint => {
      // Simulate response times
      endpoint.responseTime = 10 + randomInt(0, 100);

      // Randomly simulate issues
      if (randomInt(0, 100) > 95) {
        endpoint.status = 'degraded';
        endpoint.errorCount++;
      } else if (randomInt(0, 100) > 99) {
        endpoint.status = 'down';
        endpoint.errorCount++;
        endpoint.lastError = 'Connection timeout';
      } else {
        endpoint.status = 'healthy';
      }

      // Update success rate
      const totalRequests = 1000;
      endpoint.successRate = ((totalRequests - endpoint.errorCount) / totalRequests) * 100;
    });
  }

  private checkForAlerts() {
    const currentMetrics = this.metrics[this.metrics.length - 1];
    if (!currentMetrics) return;

    // CPU Alert
    if (currentMetrics.cpu > 80) {
      this.createAlert('critical', 'System', `High CPU usage: ${currentMetrics.cpu}%`);
    }

    // Memory Alert
    if (currentMetrics.memory > 85) {
      this.createAlert('warning', 'System', `High memory usage: ${currentMetrics.memory}%`);
    }

    // Endpoint Alerts
    this.endpoints.forEach((endpoint, name) => {
      if (endpoint.status === 'down') {
        this.createAlert('critical', name, `Endpoint is down: ${endpoint.lastError}`);
      } else if (endpoint.status === 'degraded') {
        this.createAlert(
          'warning',
          name,
          `Endpoint degraded: ${endpoint.responseTime}ms response time`
        );
      }
    });
  }

  private createAlert(severity: Alert['severity'], component: string, message: string) {
    const existingAlert = this.alerts.find(
      a => a.component === component && a.message === message && !a.resolved
    );

    if (!existingAlert) {
      this.alerts.push({
        id: `alert-${Date.now()}`,
        severity,
        component,
        message,
        timestamp: Date.now(),
        resolved: false,
      });
    }
  }

  private calculatePerformanceMetrics() {
    const responseTimes = Array.from(this.endpoints.values())
      .map(ep => ep.responseTime)
      .sort((a, b) => a - b);

    if (responseTimes.length === 0) return;

    const metrics: PerformanceMetrics = {
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)],
      mean: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      stdDev: 0,
      throughput: randomInt(500, 1000),
    };

    // Calculate standard deviation
    const variance =
      responseTimes.reduce((sum, time) => {
        return sum + Math.pow(time - metrics.mean, 2);
      }, 0) / responseTimes.length;
    metrics.stdDev = Math.sqrt(variance);

    this.performanceHistory.push(metrics);
    if (this.performanceHistory.length > 60) {
      this.performanceHistory.shift();
    }
  }

  public renderDashboard() {
    console.clear();

    // Header
    console.info(
      boxen(chalk.bold.red('🔥 Fire22 Monitoring Dashboard'), {
        padding: 1,
        borderStyle: 'double',
        borderColor: 'red',
      })
    );

    // System Metrics
    this.renderSystemMetrics();

    // API Endpoints
    this.renderEndpointStatus();

    // Performance Metrics
    this.renderPerformanceMetrics();

    // Active Alerts
    this.renderAlerts();

    // Footer
    console.info(chalk.gray(`\nLast Updated: ${new Date().toLocaleTimeString()}`));
    console.info(chalk.gray('Press Ctrl+C to exit monitoring\n'));
  }

  private renderSystemMetrics() {
    const current = this.metrics[this.metrics.length - 1];
    if (!current) return;

    console.info(chalk.bold.cyan('\n📊 System Metrics'));
    console.info('─'.repeat(60));

    const cpuStatus = current.cpu > 80 ? '🔴' : current.cpu > 60 ? '🟡' : '🟢';
    const memStatus = current.memory > 85 ? '🔴' : current.memory > 70 ? '🟡' : '🟢';
    const diskStatus = current.disk > 90 ? '🔴' : current.disk > 80 ? '🟡' : '🟢';

    console.info(`${cpuStatus} CPU Usage:     ${this.renderBar(current.cpu, 100)} ${current.cpu}%`);
    console.info(
      `${memStatus} Memory Usage:  ${this.renderBar(current.memory, 100)} ${current.memory}%`
    );
    console.info(
      `${diskStatus} Disk Usage:    ${this.renderBar(current.disk, 100)} ${current.disk}%`
    );
    console.info(`📡 Network In:    ${current.network.in} Mbps`);
    console.info(`📡 Network Out:   ${current.network.out} Mbps`);
    console.info(`⚙️  Processes:     ${current.processes}`);
    console.info(`⏰ Uptime:        ${this.formatUptime(current.uptime)}`);
  }

  private renderEndpointStatus() {
    console.info(chalk.bold.cyan('\n🌐 API Endpoint Status'));
    console.info('─'.repeat(60));

    this.endpoints.forEach(endpoint => {
      const statusIcon =
        endpoint.status === 'healthy' ? '🟢' : endpoint.status === 'degraded' ? '🟡' : '🔴';
      const statusColor =
        endpoint.status === 'healthy' ? 'green' : endpoint.status === 'degraded' ? 'yellow' : 'red';

      console.info(
        `${statusIcon} ${chalk.white(endpoint.name.padEnd(25))} ` +
          `${chalk[statusColor](endpoint.status.padEnd(10))} ` +
          `${endpoint.responseTime}ms ` +
          `${chalk.gray(`(${endpoint.successRate.toFixed(1)}% success)`)}`
      );
    });
  }

  private renderPerformanceMetrics() {
    const latest = this.performanceHistory[this.performanceHistory.length - 1];
    if (!latest) return;

    console.info(chalk.bold.cyan('\n📈 Performance Analysis'));
    console.info('─'.repeat(60));

    console.info(`P50 Response Time:  ${latest.p50.toFixed(1)}ms`);
    console.info(`P95 Response Time:  ${latest.p95.toFixed(1)}ms`);
    console.info(`P99 Response Time:  ${latest.p99.toFixed(1)}ms`);
    console.info(`Mean Response:      ${latest.mean.toFixed(1)}ms`);
    console.info(`Std Deviation:      ${latest.stdDev.toFixed(1)}ms`);
    console.info(`Throughput:         ${latest.throughput} req/s`);
  }

  private renderAlerts() {
    const activeAlerts = this.alerts.filter(a => !a.resolved).slice(-5);

    if (activeAlerts.length === 0) {
      console.info(chalk.bold.green('\n✅ No Active Alerts'));
      return;
    }

    console.info(chalk.bold.red('\n🚨 Active Alerts'));
    console.info('─'.repeat(60));

    activeAlerts.forEach(alert => {
      const icon =
        alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : 'ℹ️';
      const color =
        alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'yellow' : 'blue';

      const age = Date.now() - alert.timestamp;
      const ageStr =
        age < 60000 ? `${Math.floor(age / 1000)}s ago` : `${Math.floor(age / 60000)}m ago`;

      console.info(
        `${icon} ${chalk[color](alert.component.padEnd(20))} ` +
          `${alert.message} ${chalk.gray(`(${ageStr})`)}`
      );
    });
  }

  private renderBar(value: number, max: number, width: number = 20): string {
    const filled = Math.floor((value / max) * width);
    const empty = width - filled;
    const color = value > 80 ? 'red' : value > 60 ? 'yellow' : 'green';
    return chalk[color]('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

// Main execution
const dashboard = new MonitoringDashboard();

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--demo')) {
  // Demo mode: show dashboard once and exit
  dashboard.renderDashboard();
} else {
  // Live mode: continuous monitoring
  console.info(chalk.yellow('Starting Fire22 Monitoring Dashboard...'));
  console.info(chalk.gray('Collecting initial metrics...\n'));

  setTimeout(() => {
    setInterval(() => {
      dashboard.renderDashboard();
    }, 2000); // Update every 2 seconds

    dashboard.renderDashboard();
  }, 1000);
}
