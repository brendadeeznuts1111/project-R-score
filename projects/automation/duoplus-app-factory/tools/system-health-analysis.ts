#!/usr/bin/env bun
/**
 * System Health Analysis for Nebula-Flow™ Dashboard Export
 */

interface SystemHealth {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

interface SystemStatus {
  uptime: number;
  deviceCount: number;
  systemHealth: SystemHealth;
}

class SystemHealthAnalyzer {
  private data: SystemStatus;

  constructor(data: SystemStatus) {
    this.data = data;
  }

  analyze(): void {
    console.info('🩺 Nebula-Flow™ System Health Analysis');
    console.info('=====================================\n');

    this.analyzeUptime();
    this.analyzeDeviceCount();
    this.analyzeSystemHealth();
    this.provideRecommendations();
  }

  private analyzeUptime(): void {
    const uptime = this.data.uptime;
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    console.info('⏱️  SYSTEM UPTIME ANALYSIS');
    console.info('-------------------------');
    console.info(`Current Uptime: ${hours}h ${minutes}m ${seconds}s`);
    console.info(`Total Seconds: ${uptime}`);

    // Uptime assessment
    if (uptime < 300) { // 5 minutes
      console.info('⚠️  Assessment: System recently started or restarted');
    } else if (uptime < 3600) { // 1 hour
      console.info('📈 Assessment: System in initial operation phase');
    } else if (uptime < 86400) { // 24 hours
      console.info('✅ Assessment: System operating normally');
    } else {
      console.info('🏆 Assessment: System demonstrating excellent stability');
    }
    console.info('');
  }

  private analyzeDeviceCount(): void {
    const count = this.data.deviceCount;

    console.info('📱 DEVICE FLEET ANALYSIS');
    console.info('-----------------------');
    console.info(`Active Devices: ${count}`);

    // Fleet assessment
    if (count === 0) {
      console.info('⚠️  Assessment: No devices currently active');
      console.info('💡 Suggestion: Check device connections or start device initialization');
    } else if (count < 10) {
      console.info('📈 Assessment: Small fleet operating');
      console.info('💡 Status: Suitable for development/testing');
    } else if (count < 100) {
      console.info('✅ Assessment: Medium fleet operational');
      console.info('💡 Status: Production-ready scale');
    } else if (count < 1000) {
      console.info('🚀 Assessment: Large fleet active');
      console.info('💡 Status: High-capacity operations');
    } else {
      console.info('🏆 Assessment: Massive fleet deployed');
      console.info('💡 Status: Enterprise-scale operations');
    }
    console.info('');
  }

  private analyzeSystemHealth(): void {
    const health = this.data.systemHealth;

    console.info('🖥️  SYSTEM HEALTH METRICS');
    console.info('------------------------');

    // Individual metric analysis
    this.analyzeMetric('CPU', health.cpu, 'Processing capacity utilization');
    this.analyzeMetric('Memory', health.memory, 'RAM usage for system operations');
    this.analyzeMetric('Disk', health.disk, 'Storage I/O and capacity usage');
    this.analyzeMetric('Network', health.network, 'Data transfer and connectivity');

    // Overall health score
    const healthScore = this.calculateHealthScore(health);
    console.info(`\n🏥 OVERALL HEALTH SCORE: ${healthScore}/100`);

    if (healthScore >= 90) {
      console.info('🟢 Status: EXCELLENT - System operating optimally');
    } else if (healthScore >= 75) {
      console.info('🟡 Status: GOOD - Minor optimization opportunities');
    } else if (healthScore >= 50) {
      console.info('🟠 Status: FAIR - Performance monitoring recommended');
    } else {
      console.info('🔴 Status: POOR - Immediate attention required');
    }
    console.info('');
  }

  private analyzeMetric(name: string, value: number, description: string): void {
    const bar = this.createProgressBar(value);
    const status = this.getMetricStatus(name, value);

    console.info(`${name.toUpperCase().padEnd(7)}: ${value.toString().padStart(3)}% ${bar} ${status}`);
    console.info(`         ${description}`);

    if (value > 90) {
      console.info(`         ⚠️  HIGH UTILIZATION - Monitor closely`);
    } else if (value > 75) {
      console.info(`         📊 ELEVATED USAGE - Consider optimization`);
    } else if (value < 5) {
      console.info(`         💤 VERY LOW ACTIVITY - Confirm normal operation`);
    }
    console.info('');
  }

  private createProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  private getMetricStatus(name: string, value: number): string {
    const thresholds = {
      CPU: { low: 70, high: 90 },
      Memory: { low: 75, high: 90 },
      Disk: { low: 80, high: 95 },
      Network: { low: 70, high: 85 }
    };

    const threshold = thresholds[name];
    if (!threshold) return '❓';

    if (value >= threshold.high) return '🔴 CRITICAL';
    if (value >= threshold.low) return '🟠 WARNING';
    if (value <= 5) return '💤 IDLE';
    return '🟢 NORMAL';
  }

  private calculateHealthScore(health: SystemHealth): number {
    // Calculate weighted health score
    // Lower resource usage = higher score (inverse relationship)
    const cpuScore = Math.max(0, 100 - health.cpu);
    const memoryScore = Math.max(0, 100 - health.memory);
    const diskScore = Math.max(0, 100 - health.disk);
    const networkScore = Math.max(0, 100 - health.network);

    // Weighted average (CPU/Memory more critical)
    const weightedScore = (
      cpuScore * 0.3 +
      memoryScore * 0.3 +
      diskScore * 0.2 +
      networkScore * 0.2
    );

    return Math.round(weightedScore);
  }

  private provideRecommendations(): void {
    console.info('💡 SYSTEM RECOMMENDATIONS');
    console.info('=========================');

    const recommendations = [];
    const health = this.data.systemHealth;

    // Uptime recommendations
    if (this.data.uptime < 3600) {
      recommendations.push('⏱️  Allow system to stabilize for at least 1 hour before full analysis');
    }

    // Resource recommendations
    if (health.cpu > 80) {
      recommendations.push('⚡ High CPU usage detected - review active processes and consider scaling');
    }

    if (health.memory > 85) {
      recommendations.push('🧠 High memory consumption - monitor for potential memory leaks');
    }

    if (health.disk > 90) {
      recommendations.push('💾 High disk usage - review storage allocation and cleanup policies');
    }

    if (health.network > 80) {
      recommendations.push('🌐 High network activity - monitor bandwidth usage and connections');
    }

    // Device recommendations
    if (this.data.deviceCount === 0) {
      recommendations.push('📱 No active devices - verify device connections and initialization');
    } else if (this.data.deviceCount < 10) {
      recommendations.push('📈 Small device fleet - consider scaling for production workloads');
    }

    // Idle system recommendations
    const allIdle = Object.values(health).every(v => v <= 5);
    if (allIdle) {
      recommendations.push('💤 System appears idle - verify this is expected behavior');
      recommendations.push('🔍 Consider running load tests to validate system capacity');
    }

    if (recommendations.length === 0) {
      console.info('✅ All systems operating within normal parameters');
      console.info('🎉 Nebula-Flow™ ecosystem health is excellent!');
    } else {
      recommendations.forEach(rec => console.info(rec));
    }

    console.info('');
    console.info('📊 ANALYSIS SUMMARY');
    console.info('==================');
    console.info(`System Uptime: ${Math.floor(this.data.uptime / 60)} minutes`);
    console.info(`Active Devices: ${this.data.deviceCount}`);
    console.info(`Health Score: ${this.calculateHealthScore(health)}/100`);
    console.info(`Resource Status: ${allIdle ? 'IDLE' : 'ACTIVE'}`);
  }
}

// Load and analyze the dashboard export
import { readFile } from 'fs/promises';

async function main() {
  try {
    const data = JSON.parse(await readFile('nebula-dashboard-2026-01-21.json', 'utf8'));
    const analyzer = new SystemHealthAnalyzer(data.system);
    analyzer.analyze();
  } catch (error) {
    console.error('❌ Error analyzing system health:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}