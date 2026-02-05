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
    console.log('🩺 Nebula-Flow™ System Health Analysis');
    console.log('=====================================\n');

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

    console.log('⏱️  SYSTEM UPTIME ANALYSIS');
    console.log('-------------------------');
    console.log(`Current Uptime: ${hours}h ${minutes}m ${seconds}s`);
    console.log(`Total Seconds: ${uptime}`);

    // Uptime assessment
    if (uptime < 300) { // 5 minutes
      console.log('⚠️  Assessment: System recently started or restarted');
    } else if (uptime < 3600) { // 1 hour
      console.log('📈 Assessment: System in initial operation phase');
    } else if (uptime < 86400) { // 24 hours
      console.log('✅ Assessment: System operating normally');
    } else {
      console.log('🏆 Assessment: System demonstrating excellent stability');
    }
    console.log('');
  }

  private analyzeDeviceCount(): void {
    const count = this.data.deviceCount;

    console.log('📱 DEVICE FLEET ANALYSIS');
    console.log('-----------------------');
    console.log(`Active Devices: ${count}`);

    // Fleet assessment
    if (count === 0) {
      console.log('⚠️  Assessment: No devices currently active');
      console.log('💡 Suggestion: Check device connections or start device initialization');
    } else if (count < 10) {
      console.log('📈 Assessment: Small fleet operating');
      console.log('💡 Status: Suitable for development/testing');
    } else if (count < 100) {
      console.log('✅ Assessment: Medium fleet operational');
      console.log('💡 Status: Production-ready scale');
    } else if (count < 1000) {
      console.log('🚀 Assessment: Large fleet active');
      console.log('💡 Status: High-capacity operations');
    } else {
      console.log('🏆 Assessment: Massive fleet deployed');
      console.log('💡 Status: Enterprise-scale operations');
    }
    console.log('');
  }

  private analyzeSystemHealth(): void {
    const health = this.data.systemHealth;

    console.log('🖥️  SYSTEM HEALTH METRICS');
    console.log('------------------------');

    // Individual metric analysis
    this.analyzeMetric('CPU', health.cpu, 'Processing capacity utilization');
    this.analyzeMetric('Memory', health.memory, 'RAM usage for system operations');
    this.analyzeMetric('Disk', health.disk, 'Storage I/O and capacity usage');
    this.analyzeMetric('Network', health.network, 'Data transfer and connectivity');

    // Overall health score
    const healthScore = this.calculateHealthScore(health);
    console.log(`\n🏥 OVERALL HEALTH SCORE: ${healthScore}/100`);

    if (healthScore >= 90) {
      console.log('🟢 Status: EXCELLENT - System operating optimally');
    } else if (healthScore >= 75) {
      console.log('🟡 Status: GOOD - Minor optimization opportunities');
    } else if (healthScore >= 50) {
      console.log('🟠 Status: FAIR - Performance monitoring recommended');
    } else {
      console.log('🔴 Status: POOR - Immediate attention required');
    }
    console.log('');
  }

  private analyzeMetric(name: string, value: number, description: string): void {
    const bar = this.createProgressBar(value);
    const status = this.getMetricStatus(name, value);

    console.log(`${name.toUpperCase().padEnd(7)}: ${value.toString().padStart(3)}% ${bar} ${status}`);
    console.log(`         ${description}`);

    if (value > 90) {
      console.log(`         ⚠️  HIGH UTILIZATION - Monitor closely`);
    } else if (value > 75) {
      console.log(`         📊 ELEVATED USAGE - Consider optimization`);
    } else if (value < 5) {
      console.log(`         💤 VERY LOW ACTIVITY - Confirm normal operation`);
    }
    console.log('');
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
    console.log('💡 SYSTEM RECOMMENDATIONS');
    console.log('=========================');

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
      console.log('✅ All systems operating within normal parameters');
      console.log('🎉 Nebula-Flow™ ecosystem health is excellent!');
    } else {
      recommendations.forEach(rec => console.log(rec));
    }

    console.log('');
    console.log('📊 ANALYSIS SUMMARY');
    console.log('==================');
    console.log(`System Uptime: ${Math.floor(this.data.uptime / 60)} minutes`);
    console.log(`Active Devices: ${this.data.deviceCount}`);
    console.log(`Health Score: ${this.calculateHealthScore(health)}/100`);
    console.log(`Resource Status: ${allIdle ? 'IDLE' : 'ACTIVE'}`);
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