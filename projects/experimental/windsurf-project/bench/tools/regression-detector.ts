#!/usr/bin/env bun
// regression-detector.ts - Performance Regression Detection

import { config } from 'dotenv';
config({ path: './.env' });

interface PerformanceBaseline {
  timestamp: string;
  avgThroughput: number;
  avgLatency: number;
  compressionRatio: number;
  errorRate: number;
  costPerUpload: number;
}

interface RegressionAlert {
  severity: 'critical' | 'warning' | 'info';
  metric: string;
  current: number;
  baseline: number;
  deviation: number;
  threshold: number;
  recommendation: string;
}

class PerformanceRegressionDetector {
  private baselineFile = 'performance-baseline.json';
  private alertThresholds = {
    throughput: -0.15,    // 15% decrease is critical
    latency: 0.20,        // 20% increase is critical  
    compression: -0.10,   // 10% decrease is warning
    errorRate: 0.05,      // 5% increase is critical
    cost: 0.25           // 25% increase is warning
  };

  async detectRegressions(currentMetrics: PerformanceBaseline): Promise<RegressionAlert[]> {
    console.log('🔍 **Performance Regression Detection**');
    console.log('='.repeat(50));

    const baseline = await this.loadBaseline();
    const alerts: RegressionAlert[] = [];

    if (!baseline) {
      console.log('📝 No baseline found - establishing current metrics as baseline');
      await this.saveBaseline(currentMetrics);
      return [];
    }

    console.log(`📊 Comparing with baseline from ${new Date(baseline.timestamp).toLocaleDateString()}`);
    console.log('');

    // Check each metric for regression
    const metrics = [
      {
        name: 'throughput',
        current: currentMetrics.avgThroughput,
        baseline: baseline.avgThroughput,
        threshold: this.alertThresholds.throughput,
        higherIsBetter: true
      },
      {
        name: 'latency',
        current: currentMetrics.avgLatency,
        baseline: baseline.avgLatency,
        threshold: this.alertThresholds.latency,
        higherIsBetter: false
      },
      {
        name: 'compression',
        current: currentMetrics.compressionRatio,
        baseline: baseline.compressionRatio,
        threshold: this.alertThresholds.compression,
        higherIsBetter: true
      },
      {
        name: 'errorRate',
        current: currentMetrics.errorRate,
        baseline: baseline.errorRate,
        threshold: this.alertThresholds.errorRate,
        higherIsBetter: false
      },
      {
        name: 'cost',
        current: currentMetrics.costPerUpload,
        baseline: baseline.costPerUpload,
        threshold: this.alertThresholds.cost,
        higherIsBetter: false
      }
    ];

    for (const metric of metrics) {
      const deviation = this.calculateDeviation(metric.current, metric.baseline, metric.higherIsBetter);
      
      if (deviation <= metric.threshold) {
        const severity = this.getSeverity(deviation, metric.threshold);
        const alert = this.createAlert(severity, metric, deviation);
        alerts.push(alert);
      } else {
        console.log(`✅ ${metric.name}: ${this.formatChange(metric.current, metric.baseline, metric.higherIsBetter)}`);
      }
    }

    // Display alerts
    if (alerts.length > 0) {
      this.displayAlerts(alerts);
      await this.saveRegressionReport(alerts, currentMetrics, baseline);
    } else {
      console.log('🎉 No performance regressions detected!');
    }

    // Update baseline if performance improved
    if (this.shouldUpdateBaseline(currentMetrics, baseline)) {
      console.log('📈 Performance improved - updating baseline');
      await this.saveBaseline(currentMetrics);
    }

    return alerts;
  }

  private calculateDeviation(current: number, baseline: number, higherIsBetter: boolean): number {
    if (baseline === 0) return 0;
    
    const change = (current - baseline) / baseline;
    return higherIsBetter ? -change : change;
  }

  private getSeverity(deviation: number, threshold: number): 'critical' | 'warning' | 'info' {
    if (deviation <= threshold * 2) return 'critical';
    if (deviation <= threshold * 1.5) return 'warning';
    return 'info';
  }

  private createAlert(severity: 'critical' | 'warning' | 'info', metric: any, deviation: number): RegressionAlert {
    const recommendations = {
      throughput: 'Consider optimizing upload strategy or checking network connectivity',
      latency: 'Investigate network latency or R2 endpoint performance',
      compression: 'Review compression settings or data format changes',
      errorRate: 'Check error logs and network stability',
      cost: 'Review data size and compression efficiency'
    };

    return {
      severity,
      metric: metric.name,
      current: metric.current,
      baseline: metric.baseline,
      deviation,
      threshold: metric.threshold,
      recommendation: recommendations[metric.name as keyof typeof recommendations]
    };
  }

  private formatChange(current: number, baseline: number, higherIsBetter: boolean): string {
    const change = ((current - baseline) / baseline) * 100;
    const direction = higherIsBetter ? 
      (change >= 0 ? '↗️' : '↘️') : 
      (change >= 0 ? '↘️' : '↗️');
    
    return `${direction} ${change.toFixed(1)}% (${baseline.toFixed(1)} → ${current.toFixed(1)})`;
  }

  private displayAlerts(alerts: RegressionAlert[]) {
    console.log('');
    console.log('🚨 **PERFORMANCE REGRESSION ALERTS**');
    console.log('='.repeat(60));

    alerts.forEach(alert => {
      const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🟠';
      console.log(`${icon} **${alert.severity.toUpperCase()}**: ${alert.metric}`);
      console.log(`   Current: ${alert.current.toFixed(2)} | Baseline: ${alert.baseline.toFixed(2)}`);
      console.log(`   Deviation: ${(alert.deviation * 100).toFixed(1)}% | Threshold: ${(alert.threshold * 100).toFixed(1)}%`);
      console.log(`   💡 ${alert.recommendation}`);
      console.log('');
    });
  }

  private async loadBaseline(): Promise<PerformanceBaseline | null> {
    try {
      const { BunR2AppleManager } = await import('../../src/storage/r2-apple-manager.js');
      const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
      
      // Try to load from R2 first
      try {
        const s3File = manager.getS3Client()?.file('reports/performance-baseline.json');
        if (s3File) {
          const baselineData = await s3File.text();
          return JSON.parse(baselineData);
        }
      } catch {
        // Fallback to local file
        const fs = await import('fs');
        if (fs.existsSync(this.baselineFile)) {
          const data = fs.readFileSync(this.baselineFile, 'utf-8');
          return JSON.parse(data);
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  private async saveBaseline(baseline: PerformanceBaseline) {
    try {
      const { BunR2AppleManager } = await import('../../src/storage/r2-apple-manager.js');
      const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
      
      // Save to R2
      await manager.uploadReport(baseline, 'performance-baseline.json');
      
      // Also save locally
      const fs = await import('fs');
      fs.writeFileSync(this.baselineFile, JSON.stringify(baseline, null, 2));
      
      console.log('💾 Performance baseline saved');
    } catch (error: any) {
      console.error('❌ Failed to save baseline:', error.message);
    }
  }

  private shouldUpdateBaseline(current: PerformanceBaseline, baseline: PerformanceBaseline): boolean {
    // Update if throughput improved significantly or latency decreased
    const throughputImprovement = (current.avgThroughput - baseline.avgThroughput) / baseline.avgThroughput;
    const latencyImprovement = (baseline.avgLatency - current.avgLatency) / baseline.avgLatency;
    
    return throughputImprovement > 0.05 || latencyImprovement > 0.05;
  }

  private async saveRegressionReport(alerts: RegressionAlert[], current: PerformanceBaseline, baseline: PerformanceBaseline) {
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        testType: 'regression-detection',
        alerts: alerts,
        current: current,
        baseline: baseline,
        summary: {
          criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
          warningAlerts: alerts.filter(a => a.severity === 'warning').length,
          infoAlerts: alerts.filter(a => a.severity === 'info').length
        }
      };

      const { BunR2AppleManager } = await import('../../src/storage/r2-apple-manager.js');
      const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
      await manager.uploadReport(reportData, `regression-alert-${Date.now()}.json`);
      
      console.log('📤 Regression report uploaded to R2');
      
    } catch (error: any) {
      console.error('❌ Failed to upload regression report:', error.message);
    }
  }
}

// Sample usage and testing
if (Bun.main === import.meta.path) {
  const detector = new PerformanceRegressionDetector();
  
  // Sample current metrics (would come from actual benchmark)
  const currentMetrics: PerformanceBaseline = {
    timestamp: new Date().toISOString(),
    avgThroughput: 1800,  // Down from 2000 baseline
    avgLatency: 600,      // Up from 500 baseline  
    compressionRatio: 78, // Down from 82 baseline
    errorRate: 0.02,      // Up from 0.01 baseline
    costPerUpload: 0.000003
  };
  
  const alerts = await detector.detectRegressions(currentMetrics);
  
  if (alerts.length > 0) {
    console.log(`\n🚨 ${alerts.length} regression(s) detected!`);
  }
}

export { PerformanceRegressionDetector };
