#!/usr/bin/env bun
// monitor-dashboard.ts - Real-time R2 Performance Monitoring Dashboard

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

interface PerformanceMetrics {
  timestamp: number;
  uploads: number;
  avgTime: number;
  throughput: number;
  compression: number;
  errors: number;
  cost: number;
}

class R2MonitorDashboard {
  private metrics: PerformanceMetrics[] = [];
  private manager: BunR2AppleManager;
  private isRunning = false;
  private interval: number | null = null;

  constructor() {
    this.manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
  }

  async startMonitoring(intervalMs: number = 5000) {
    console.log('📊 **R2 Performance Monitor Started**');
    console.log('='.repeat(60));
    
    this.isRunning = true;
    this.interval = setInterval(() => this.collectMetrics(), intervalMs) as any;
    
    // Display initial dashboard
    this.displayDashboard();
  }

  private async collectMetrics() {
    if (!this.isRunning) return;

    const startTime = Date.now();
    const testData = Array(50).fill(0).map((_, i) => ({
      id: i,
      email: `monitor-${i}@test.com`,
      timestamp: Date.now()
    }));

    try {
      // Run mini benchmark
      const results = await this.runMiniBenchmark(testData);
      
      const metric: PerformanceMetrics = {
        timestamp: Date.now(),
        uploads: testData.length,
        avgTime: results.avgTime,
        throughput: results.throughput,
        compression: results.compression,
        errors: results.errors,
        cost: results.cost
      };

      this.metrics.push(metric);
      
      // Keep only last 20 data points
      if (this.metrics.length > 20) {
        this.metrics.shift();
      }

      this.displayDashboard();
      
    } catch (error: any) {
      console.error(`❌ Monitoring error: ${error.message}`);
    }
  }

  private async runMiniBenchmark(data: any[]) {
    const startTime = Date.now();
    let success = 0;
    let errors = 0;
    let totalCompression = 0;

    for (const item of data) {
      try {
        const result = await this.manager.uploadAppleID(item, `monitor/${Date.now()}-${item.id}.json`);
        if (result.success) {
          success++;
          totalCompression += result.savings || 0;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    const avgTime = duration / data.length;
    const throughput = data.length / (duration / 1000);
    const avgCompression = totalCompression / success || 0;
    const cost = (data.length * 0.000245 * 0.015) / 1000; // Estimated cost

    return { avgTime, throughput, compression: avgCompression, errors, cost };
  }

  private displayDashboard() {
    // Clear screen (works in most terminals)
    console.clear();
    
    console.log('🌐 **R2 Performance Monitor Dashboard**');
    console.log('='.repeat(60));
    console.log(`📊 Bucket: ${Bun.env.R2_BUCKET}`);
    console.log(`🔗 Endpoint: ${Bun.env.S3_ENDPOINT}`);
    console.log(`⏰ Last Update: ${new Date().toLocaleString()}`);
    console.log('');

    if (this.metrics.length === 0) {
      console.log('⏳ Collecting initial metrics...');
      return;
    }

    const latest = this.metrics[this.metrics.length - 1];
    const previous = this.metrics[this.metrics.length - 2] || latest;

    // Current metrics
    console.log('📈 **Current Performance**');
    console.log(`├── Uploads: ${latest.uploads}`);
    console.log(`├── Avg Time: ${latest.avgTime.toFixed(2)}ms`);
    console.log(`├── Throughput: ${latest.throughput.toFixed(0)} IDs/s`);
    console.log(`├── Compression: ${latest.compression.toFixed(1)}%`);
    console.log(`├── Errors: ${latest.errors}`);
    console.log(`└── Cost: $${latest.cost.toFixed(6)}`);
    console.log('');

    // Trends
    const timeTrend = latest.avgTime - previous.avgTime;
    const throughputTrend = latest.throughput - previous.throughput;
    
    console.log('📊 **Performance Trends**');
    console.log(`├── Time: ${timeTrend >= 0 ? '📈' : '📉'} ${timeTrend >= 0 ? '+' : ''}${timeTrend.toFixed(2)}ms`);
    console.log(`└── Throughput: ${throughputTrend >= 0 ? '📈' : '📉'} ${throughputTrend >= 0 ? '+' : ''}${throughputTrend.toFixed(0)} IDs/s`);
    console.log('');

    // ASCII Performance Graph
    this.drawPerformanceGraph();
    
    console.log('');
    console.log('🎮 **Controls**: Press Ctrl+C to stop monitoring');
  }

  private drawPerformanceGraph() {
    if (this.metrics.length < 2) return;

    console.log('📊 **Throughput Graph (Last 20 samples)**');
    
    const maxThroughput = Math.max(...this.metrics.map(m => m.throughput));
    const graphWidth = 40;
    
    this.metrics.forEach((metric, index) => {
      const barLength = Math.round((metric.throughput / maxThroughput) * graphWidth);
      const bar = '█'.repeat(barLength) + '░'.repeat(graphWidth - barLength);
      const label = index === this.metrics.length - 1 ? 'NOW' : `${index}`;
      console.log(`${label.padEnd(4)} │${bar}│ ${metric.throughput.toFixed(0)}`);
    });
  }

  stop() {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('\n🛑 Monitoring stopped');
  }
}

// Start monitoring if run directly
if (Bun.main === import.meta.path) {
  const monitor = new R2MonitorDashboard();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    monitor.stop();
    process.exit(0);
  });

  await monitor.startMonitoring(5000); // Update every 5 seconds
}

export { R2MonitorDashboard };
