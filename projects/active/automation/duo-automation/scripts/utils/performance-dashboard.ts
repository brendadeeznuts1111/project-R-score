#!/usr/bin/env bun

/**
 * 🎯 Empire Pro CLI Performance Dashboard
 * Real-time performance monitoring with advanced metrics
 */

import { EnhancedBunNativeAPITracker } from '../packages/cli/enhanced-bun-native-tracker.js';

class PerformanceDashboard {
  private tracker: EnhancedBunNativeAPITracker;
  private startTime: Date = new Date();

  constructor() {
    this.tracker = new EnhancedBunNativeAPITracker({
      updateIntervalMs: 1000,
      dryRun: true,
      enableGarbageCollection: false
    });
  }

  /**
   * 🚀 Start performance monitoring dashboard
   */
  async startDashboard(): Promise<void> {
    console.clear();
    console.info('🎯 Empire Pro CLI Performance Dashboard');
    console.info('═'.repeat(60));
    
    // Subscribe to real-time updates
    this.tracker.subscribeToDomainBreakdown((domainBreakdown) => {
      this.renderDashboard(domainBreakdown);
    });

    // Simulate various API calls for demonstration
    this.simulateApiActivity();
    
    // Keep dashboard running
    await this.keepAlive();
  }

  /**
   * 📊 Render the performance dashboard
   */
  private renderDashboard(domainBreakdown: any): void {
    console.clear();
    
    const uptime = Date.now() - this.startTime.getTime();
    const health = this.tracker.getHealthStatus();
    const summary = this.tracker.getSummaryStatistics();
    
    // Header
    console.info('🎯 Empire Pro CLI Performance Dashboard');
    console.info('═'.repeat(60));
    console.info(`⏱️  Uptime: ${(uptime / 1000).toFixed(1)}s | 📊 APIs: ${summary.totalAPIs} | ⚡ Calls: ${summary.totalCalls}`);
    console.info(`🔥 Native Rate: ${summary.nativeImplementationRate.toFixed(1)}% | 📈 Avg Response: ${summary.averageResponseTime.toFixed(2)}ms`);
    console.info('─'.repeat(60));

    // Domain breakdown with performance indicators
    console.info('📊 Domain Performance Breakdown:');
    console.info('─'.repeat(60));
    
    const domains = ['filesystem', 'networking', 'crypto', 'system', 'runtime'];
    domains.forEach(domain => {
      const metrics = domainBreakdown[domain] || [];
      const totalCalls = metrics.reduce((sum: number, m: any) => sum + m.callCount, 0);
      const avgTime = metrics.length > 0 
        ? metrics.reduce((sum: number, m: any) => sum + m.averageDuration, 0) / metrics.length 
        : 0;
      
      const performance = this.getPerformanceIndicator(avgTime);
      const activity = this.getActivityIndicator(totalCalls);
      
      console.info(`${performance} ${domain.padEnd(12)} │ ${activity} ${totalCalls.toString().padStart(4)} calls │ ⏱️  ${avgTime.toFixed(2).padStart(6)}ms`);
    });

    console.info('─'.repeat(60));
    
    // Performance metrics
    console.info('📈 Performance Metrics:');
    console.info(`🏆 Fastest API: ${this.getFastestApi(domainBreakdown)}`);
    console.info(`🐌 Slowest API: ${this.getSlowestApi(domainBreakdown)}`);
    console.info(`🔥 Most Active: ${this.getMostActiveApi(domainBreakdown)}`);
    console.info(`💾 Memory Usage: ${(health.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
    
    console.info('─'.repeat(60));
    console.info('🔄 Real-time updates every 1s | Press Ctrl+C to exit');
  }

  /**
   * 🎨 Get performance indicator
   */
  private getPerformanceIndicator(avgTime: number): string {
    if (avgTime < 5) return '🟢';
    if (avgTime < 20) return '🟡';
    if (avgTime < 50) return '🟠';
    return '🔴';
  }

  /**
   * ⚡ Get activity indicator
   */
  private getActivityIndicator(calls: number): string {
    if (calls === 0) return '💤';
    if (calls < 10) return '🔹';
    if (calls < 50) return '🔸';
    return '🔶';
  }

  /**
   * 🏆 Get fastest API
   */
  private getFastestApi(domainBreakdown: any): string {
    let fastest = 'N/A';
    let minTime = Infinity;
    
    Object.values(domainBreakdown).forEach((metrics: any) => {
      (metrics as any[]).forEach(metric => {
        if (metric.averageDuration < minTime) {
          minTime = metric.averageDuration;
          fastest = metric.apiName;
        }
      });
    });
    
    return fastest;
  }

  /**
   * 🐌 Get slowest API
   */
  private getSlowestApi(domainBreakdown: any): string {
    let slowest = 'N/A';
    let maxTime = 0;
    
    Object.values(domainBreakdown).forEach((metrics: any) => {
      (metrics as any[]).forEach(metric => {
        if (metric.averageDuration > maxTime) {
          maxTime = metric.averageDuration;
          slowest = metric.apiName;
        }
      });
    });
    
    return slowest;
  }

  /**
   * 🔥 Get most active API
   */
  private getMostActiveApi(domainBreakdown: any): string {
    let mostActive = 'N/A';
    let maxCalls = 0;
    
    Object.values(domainBreakdown).forEach((metrics: any) => {
      (metrics as any[]).forEach(metric => {
        if (metric.callCount > maxCalls) {
          maxCalls = metric.callCount;
          mostActive = metric.apiName;
        }
      });
    });
    
    return mostActive;
  }

  /**
   * 🎭 Simulate API activity for demonstration
   */
  private simulateApiActivity(): void {
    const apis = [
      { name: 'Bun.file', domain: 'filesystem', time: 2 },
      { name: 'fetch', domain: 'networking', time: 15 },
      { name: 'crypto.hash', domain: 'crypto', time: 5 },
      { name: 'Bun.spawn', domain: 'system', time: 25 },
      { name: 'JSON.parse', domain: 'runtime', time: 1 },
      { name: 'Bun.write', domain: 'filesystem', time: 8 },
      { name: 'Response.json', domain: 'networking', time: 12 },
      { name: 'CryptoHasher.update', domain: 'crypto', time: 3 }
    ];

    // Simulate random API calls
    setInterval(() => {
      const api = apis[Math.floor(Math.random() * apis.length)];
      this.tracker.trackSynchronousCall(
        api.name, 
        () => ({ result: 'simulated' }), 
        'native',
        { domain: api.domain, simulated: true }
      );
    }, Math.random() * 800 + 200); // Random interval between 200-1000ms
  }

  /**
   * 🔄 Keep dashboard alive
   */
  private async keepAlive(): Promise<void> {
    return new Promise((resolve) => {
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.info('\n🛑 Shutting down performance dashboard...');
        this.tracker.shutdown();
        resolve();
      });
    });
  }
}

// Start dashboard if run directly
if (import.meta.main) {
  const dashboard = new PerformanceDashboard();
  await dashboard.startDashboard();
}

export { PerformanceDashboard };
