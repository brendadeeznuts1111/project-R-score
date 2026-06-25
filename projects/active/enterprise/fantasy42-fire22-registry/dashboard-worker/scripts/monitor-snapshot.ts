#!/usr/bin/env bun
/**
 * 📊 Fire22 Monitor Snapshot
 *
 * Demonstrates the monitoring dashboard output
 * Shows what fire22 monitor displays in real-time
 *
 * @version 3.0.9
 * @author Fire22 Development Team
 */

import { RealTimeMonitor } from './real-time-monitor.ts';

class MonitorSnapshot {
  private monitor: RealTimeMonitor;

  constructor() {
    this.monitor = new RealTimeMonitor({
      interval: 5000,
      apiBaseUrl: 'http://localhost:8080',
    });
  }

  /**
   * Display a snapshot of what the monitor shows
   */
  displaySnapshot(): void {
    // Clear screen for clean display
    console.clear();

    // Display the dashboard header
    console.info('🔥 Fire22 Real-Time Performance Dashboard');
    console.info('='.repeat(50));
    console.info(`📅 ${new Date().toLocaleString()}\n`);

    // System Metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const memPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    const cpuTime = (cpuUsage.user + cpuUsage.system) / 1000000;

    console.info('💻 System Metrics:');
    console.info(`   CPU Usage: ${Math.round(cpuTime)}% ${this.getHealthIndicator(cpuTime, 80)}`);
    console.info(
      `   Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB (${memPercent}%) ${this.getHealthIndicator(memPercent, 85)}`
    );
    console.info(
      `   Uptime: ${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s`
    );
    console.info(`   Bun Version: ${Bun.version}\n`);

    // API Endpoints Status (simulated)
    console.info('🌐 API Endpoints:');
    const endpoints = [
      { path: '/api/health', status: 'healthy', responseTime: 45, successRate: 100 },
      { path: '/api/health/detailed', status: 'healthy', responseTime: 67, successRate: 100 },
      { path: '/api/manager/agents', status: 'warning', responseTime: 1250, successRate: 95 },
      { path: '/dashboard', status: 'healthy', responseTime: 120, successRate: 99 },
    ];

    endpoints.forEach(endpoint => {
      const statusIcon = this.getStatusIcon(endpoint.status);
      console.info(
        `   ${statusIcon} ${endpoint.path} - ${endpoint.responseTime}ms (${endpoint.successRate}% success)`
      );
    });

    // Recent Alerts (simulated)
    console.info('\n🚨 Recent Alerts:');
    const alerts = [
      {
        severity: 'medium',
        time: '10:45:23',
        message: 'Response time elevated for /api/manager/agents',
      },
      { severity: 'low', time: '10:44:15', message: 'Memory usage approaching threshold (82%)' },
    ];

    if (alerts.length > 0) {
      alerts.forEach(alert => {
        const severityIcon = this.getSeverityIcon(alert.severity);
        console.info(`   ${severityIcon} [${alert.time}] ${alert.message}`);
      });
    } else {
      console.info('   ✅ No active alerts');
    }

    // Performance Trends
    console.info('\n📈 Performance Trends:');
    console.info(`   Average Response Time: 370ms`);
    console.info(`   Error Rate: 0.5%`);
    console.info(`   Health Score: 92/100`);
    console.info(`   Trend: 📈 Improving`);

    // Footer
    console.info(`\n📊 Monitoring active | Interval: 5000ms | Press Ctrl+C to stop`);
    console.info('─'.repeat(50));

    // Show sample data updates
    console.info('\n📡 Live Data Stream (Sample):');
    this.showLiveDataSample();
  }

  /**
   * Show sample of live data updates
   */
  private showLiveDataSample(): void {
    const updates = [
      { time: '10:45:30', type: 'API', message: 'GET /api/health - 42ms - 200 OK' },
      { time: '10:45:31', type: 'SYS', message: 'Memory: 145MB used (68%)' },
      {
        time: '10:45:32',
        type: 'API',
        message: 'POST /api/manager/getLiveWagers - 856ms - 200 OK',
      },
      { time: '10:45:33', type: 'PERF', message: 'CPU spike detected: 87%' },
      { time: '10:45:34', type: 'API', message: 'GET /dashboard - 98ms - 200 OK' },
    ];

    updates.forEach(update => {
      const typeColor =
        update.type === 'API'
          ? '\x1b[36m' // Cyan
          : update.type === 'SYS'
            ? '\x1b[33m' // Yellow
            : update.type === 'PERF'
              ? '\x1b[35m' // Magenta
              : '\x1b[37m'; // White
      const reset = '\x1b[0m';

      console.info(`   [${update.time}] ${typeColor}${update.type}${reset} ${update.message}`);
    });
  }

  /**
   * Display tree structure of monitoring components
   */
  displayMonitorTree(): void {
    console.info('\n🌲 Fire22 Monitor Component Tree:');
    console.info('');
    console.info('fire22 monitor');
    console.info('├── 💻 System Metrics');
    console.info('│   ├── CPU Usage Monitoring');
    console.info('│   ├── Memory Tracking');
    console.info('│   ├── Disk I/O Statistics');
    console.info('│   └── Network Activity');
    console.info('├── 🌐 API Endpoints');
    console.info('│   ├── /api/health');
    console.info('│   ├── /api/health/detailed');
    console.info('│   ├── /api/manager/*');
    console.info('│   ├── /api/admin/*');
    console.info('│   ├── /api/customer/*');
    console.info('│   └── /dashboard');
    console.info('├── 📊 Performance Analysis');
    console.info('│   ├── Response Time Tracking');
    console.info('│   ├── Success Rate Calculation');
    console.info('│   ├── Error Rate Monitoring');
    console.info('│   └── Throughput Metrics');
    console.info('├── 🚨 Alert System');
    console.info('│   ├── CPU Threshold (80%)');
    console.info('│   ├── Memory Threshold (85%)');
    console.info('│   ├── Response Time Alerts (>2000ms)');
    console.info('│   └── Error Rate Alerts (>5%)');
    console.info('└── 📈 Reporting');
    console.info('    ├── Real-time Dashboard');
    console.info('    ├── Historical Trends');
    console.info('    ├── Export to JSON');
    console.info('    └── Performance Reports');
  }

  /**
   * Show monitoring capabilities
   */
  displayCapabilities(): void {
    console.info('\n🎯 Fire22 Monitor Capabilities:\n');

    console.info('📊 Real-Time Metrics:');
    console.info('   • CPU usage and load tracking');
    console.info('   • Memory usage and heap analysis');
    console.info('   • API endpoint response times');
    console.info('   • Success/error rate calculation');
    console.info('   • Network throughput monitoring\n');

    console.info('🚨 Intelligent Alerting:');
    console.info('   • Configurable thresholds');
    console.info('   • Severity-based alerts (low/medium/high/critical)');
    console.info('   • Automatic alert correlation');
    console.info('   • Historical alert tracking\n');

    console.info('📈 Trend Analysis:');
    console.info('   • Performance trend detection');
    console.info('   • Health score calculation');
    console.info('   • Predictive alerts');
    console.info('   • Resource usage forecasting\n');

    console.info('💾 Data Management:');
    console.info('   • Automatic data export');
    console.info('   • JSON report generation');
    console.info('   • Historical data retention');
    console.info('   • Performance benchmarking\n');

    console.info('🔧 Configuration Options:');
    console.info('   • Customizable monitoring interval');
    console.info('   • API endpoint selection');
    console.info('   • Alert threshold configuration');
    console.info('   • Duration-based monitoring');
  }

  private getHealthIndicator(value: number, threshold: number): string {
    if (value > threshold * 1.1) return '🔴';
    if (value > threshold) return '🟡';
    return '🟢';
  }

  private getStatusIcon(status: string): string {
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

  private getSeverityIcon(severity: string): string {
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
}

// Main execution
async function main() {
  const snapshot = new MonitorSnapshot();

  const args = process.argv.slice(2);

  if (args.includes('--tree')) {
    snapshot.displayMonitorTree();
  } else if (args.includes('--capabilities')) {
    snapshot.displayCapabilities();
  } else if (args.includes('--help')) {
    console.info(`
📊 Fire22 Monitor Snapshot

This shows what the real-time monitor displays when running.

USAGE:
  bun run scripts/monitor-snapshot.ts [options]

OPTIONS:
  --tree          Show component tree structure
  --capabilities  Show monitoring capabilities
  --help          Show this help message

To run the actual monitor:
  fire22 monitor              # Monitor indefinitely
  fire22 monitor -d 60        # Monitor for 60 seconds
  fire22 monitor -i 1000      # Monitor every second

🔥 Fire22 Development Team
`);
  } else {
    snapshot.displaySnapshot();
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('💥 Monitor snapshot failed:', error);
    process.exit(1);
  });
}

export { MonitorSnapshot };
