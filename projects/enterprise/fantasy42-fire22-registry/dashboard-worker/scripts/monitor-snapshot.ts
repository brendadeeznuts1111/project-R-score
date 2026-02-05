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
    console.log('🔥 Fire22 Real-Time Performance Dashboard');
    console.log('='.repeat(50));
    console.log(`📅 ${new Date().toLocaleString()}\n`);

    // System Metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const memPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    const cpuTime = (cpuUsage.user + cpuUsage.system) / 1000000;

    console.log('💻 System Metrics:');
    console.log(`   CPU Usage: ${Math.round(cpuTime)}% ${this.getHealthIndicator(cpuTime, 80)}`);
    console.log(
      `   Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB (${memPercent}%) ${this.getHealthIndicator(memPercent, 85)}`
    );
    console.log(
      `   Uptime: ${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s`
    );
    console.log(`   Bun Version: ${Bun.version}\n`);

    // API Endpoints Status (simulated)
    console.log('🌐 API Endpoints:');
    const endpoints = [
      { path: '/api/health', status: 'healthy', responseTime: 45, successRate: 100 },
      { path: '/api/health/detailed', status: 'healthy', responseTime: 67, successRate: 100 },
      { path: '/api/manager/agents', status: 'warning', responseTime: 1250, successRate: 95 },
      { path: '/dashboard', status: 'healthy', responseTime: 120, successRate: 99 },
    ];

    endpoints.forEach(endpoint => {
      const statusIcon = this.getStatusIcon(endpoint.status);
      console.log(
        `   ${statusIcon} ${endpoint.path} - ${endpoint.responseTime}ms (${endpoint.successRate}% success)`
      );
    });

    // Recent Alerts (simulated)
    console.log('\n🚨 Recent Alerts:');
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
        console.log(`   ${severityIcon} [${alert.time}] ${alert.message}`);
      });
    } else {
      console.log('   ✅ No active alerts');
    }

    // Performance Trends
    console.log('\n📈 Performance Trends:');
    console.log(`   Average Response Time: 370ms`);
    console.log(`   Error Rate: 0.5%`);
    console.log(`   Health Score: 92/100`);
    console.log(`   Trend: 📈 Improving`);

    // Footer
    console.log(`\n📊 Monitoring active | Interval: 5000ms | Press Ctrl+C to stop`);
    console.log('─'.repeat(50));

    // Show sample data updates
    console.log('\n📡 Live Data Stream (Sample):');
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

      console.log(`   [${update.time}] ${typeColor}${update.type}${reset} ${update.message}`);
    });
  }

  /**
   * Display tree structure of monitoring components
   */
  displayMonitorTree(): void {
    console.log('\n🌲 Fire22 Monitor Component Tree:');
    console.log('');
    console.log('fire22 monitor');
    console.log('├── 💻 System Metrics');
    console.log('│   ├── CPU Usage Monitoring');
    console.log('│   ├── Memory Tracking');
    console.log('│   ├── Disk I/O Statistics');
    console.log('│   └── Network Activity');
    console.log('├── 🌐 API Endpoints');
    console.log('│   ├── /api/health');
    console.log('│   ├── /api/health/detailed');
    console.log('│   ├── /api/manager/*');
    console.log('│   ├── /api/admin/*');
    console.log('│   ├── /api/customer/*');
    console.log('│   └── /dashboard');
    console.log('├── 📊 Performance Analysis');
    console.log('│   ├── Response Time Tracking');
    console.log('│   ├── Success Rate Calculation');
    console.log('│   ├── Error Rate Monitoring');
    console.log('│   └── Throughput Metrics');
    console.log('├── 🚨 Alert System');
    console.log('│   ├── CPU Threshold (80%)');
    console.log('│   ├── Memory Threshold (85%)');
    console.log('│   ├── Response Time Alerts (>2000ms)');
    console.log('│   └── Error Rate Alerts (>5%)');
    console.log('└── 📈 Reporting');
    console.log('    ├── Real-time Dashboard');
    console.log('    ├── Historical Trends');
    console.log('    ├── Export to JSON');
    console.log('    └── Performance Reports');
  }

  /**
   * Show monitoring capabilities
   */
  displayCapabilities(): void {
    console.log('\n🎯 Fire22 Monitor Capabilities:\n');

    console.log('📊 Real-Time Metrics:');
    console.log('   • CPU usage and load tracking');
    console.log('   • Memory usage and heap analysis');
    console.log('   • API endpoint response times');
    console.log('   • Success/error rate calculation');
    console.log('   • Network throughput monitoring\n');

    console.log('🚨 Intelligent Alerting:');
    console.log('   • Configurable thresholds');
    console.log('   • Severity-based alerts (low/medium/high/critical)');
    console.log('   • Automatic alert correlation');
    console.log('   • Historical alert tracking\n');

    console.log('📈 Trend Analysis:');
    console.log('   • Performance trend detection');
    console.log('   • Health score calculation');
    console.log('   • Predictive alerts');
    console.log('   • Resource usage forecasting\n');

    console.log('💾 Data Management:');
    console.log('   • Automatic data export');
    console.log('   • JSON report generation');
    console.log('   • Historical data retention');
    console.log('   • Performance benchmarking\n');

    console.log('🔧 Configuration Options:');
    console.log('   • Customizable monitoring interval');
    console.log('   • API endpoint selection');
    console.log('   • Alert threshold configuration');
    console.log('   • Duration-based monitoring');
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
    console.log(`
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
