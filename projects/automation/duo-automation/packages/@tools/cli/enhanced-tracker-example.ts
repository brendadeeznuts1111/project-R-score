/**
 * Example usage of the Enhanced Bun Native API Tracker
 * Demonstrates real-time subscriptions, organized reports, garbage collection, and dryrun mode
 */

import { 
  EnhancedBunNativeAPITracker, 
  globalEnhancedTracker,
  subscribeToDomainBreakdown,
  generateMetricsReport,
  type DomainBreakdown,
  type SubscriptionCallback
} from './enhanced-bun-native-tracker';

/**
 * Dryrun demonstration class
 */
class DryrunDemonstration {
  private tracker: EnhancedBunNativeAPITracker;

  constructor() {
    // Create tracker with dryrun enabled
    this.tracker = new EnhancedBunNativeAPITracker({
      updateIntervalMs: 2000,
      maxReportAgeHours: 1,
      reportsDirectory: './dryrun-reports',
      enableGarbageCollection: true,
      dryRun: true // Enable dryrun mode
    });
  }

  /**
   * Demonstrate dryrun functionality
   */
  public async demonstrateDryrun(): Promise<void> {
    console.log('🔍 Dryrun Mode Demonstration');
    console.log('═'.repeat(40));

    // Simulate some API calls
    console.log('🔄 Simulating API calls in dryrun mode...');
    
    this.tracker.trackSynchronousCall('fetch', () => ({ data: 'response' }), 'native', { url: 'https://api.example.com' });
    this.tracker.trackSynchronousCall('Bun.file', () => ({ path: '/tmp/test.txt' }), 'native', { path: '/tmp/test.txt' });
    this.tracker.trackSynchronousCall('crypto.hash', () => 'hashed_data', 'native', { algorithm: 'sha256' });

    // Generate report (will show dryrun output)
    console.log('📋 Generating report in dryrun mode...');
    const reportPath = this.tracker.saveReport();

    // Test garbage collection in dryrun mode
    console.log('🗑️  Testing garbage collection in dryrun mode...');
    this.tracker.performGarbageCollection();

    // Show health status
    const health = this.tracker.getHealthStatus();
    console.log('🏥 Health Status (Dryrun):');
    console.log(`   Status: ${health.status}`);
    console.log(`   Tracked APIs: ${health.trackedAPIs}`);
    console.log(`   Total Calls: ${health.totalCalls}`);
    console.log(`   Dryrun Mode: ${health.config.dryRun ? 'ENABLED' : 'DISABLED'}`);

    // Cleanup
    this.tracker.shutdown();
    console.log('✅ Dryrun demonstration completed');
  }
}

/**
 * Real-time monitoring dashboard example
 */
class RealTimeMonitoringDashboard {
  private subscriptionId: string | null = null;
  private alertThresholds = {
    lowNativeRate: 80, // Alert if native implementation rate < 80%
    highErrorRate: 5,  // Alert if error rate > 5%
    slowResponseTime: 100 // Alert if average response time > 100ms
  };

  constructor(private tracker: EnhancedBunNativeAPITracker, private dryRun: boolean = false) {
    this.startMonitoring();
  }

  /**
   * Start real-time monitoring with alerts
   */
  private startMonitoring(): void {
    const monitoringCallback: SubscriptionCallback = (domainBreakdown: DomainBreakdown) => {
      this.analyzeAndAlert(domainBreakdown);
      this.updateDashboard(domainBreakdown);
    };

    this.subscriptionId = this.tracker.subscribeToDomainBreakdown(monitoringCallback);
    const mode = this.dryRun ? ' (DRYRUN)' : '';
    console.log(`🚀 Real-time monitoring started${mode}`);
  }

  /**
   * Analyze domain breakdown and trigger alerts
   */
  private analyzeAndAlert(domainBreakdown: DomainBreakdown): void {
    Object.entries(domainBreakdown).forEach(([domain, metrics]) => {
      if (metrics.length === 0) return;

      // Calculate domain-specific metrics
      const totalCalls = metrics.reduce((sum, m) => sum + m.callCount, 0);
      const nativeCount = metrics.filter(m => m.implementation === 'native').length;
      const nativeRate = (nativeCount / metrics.length) * 100;
      const errorCount = metrics.reduce((sum, m) => sum + m.errorCount, 0);
      const errorRate = totalCalls > 0 ? (errorCount / totalCalls) * 100 : 0;
      const avgResponseTime = metrics.reduce((sum, m) => sum + m.averageDuration, 0) / metrics.length;

      // Check alert conditions
      if (nativeRate < this.alertThresholds.lowNativeRate) {
        this.sendAlert(`⚠️ Low native implementation rate in ${domain}: ${nativeRate.toFixed(1)}%`);
      }

      if (errorRate > this.alertThresholds.highErrorRate) {
        this.sendAlert(`🚨 High error rate in ${domain}: ${errorRate.toFixed(1)}%`);
      }

      if (avgResponseTime > this.alertThresholds.slowResponseTime) {
        this.sendAlert(`🐌 Slow response time in ${domain}: ${avgResponseTime.toFixed(1)}ms`);
      }
    });
  }

  /**
   * Update dashboard display
   */
  private updateDashboard(domainBreakdown: DomainBreakdown): void {
    console.clear();
    const mode = this.dryRun ? ' (DRYRUN MODE)' : '';
    console.log(`📊 Real-time Bun Native API Dashboard${mode}`);
    console.log('═'.repeat(60));

    Object.entries(domainBreakdown).forEach(([domain, metrics]) => {
      if (metrics.length === 0) return;

      const totalCalls = metrics.reduce((sum, m) => sum + m.callCount, 0);
      const nativeCount = metrics.filter(m => m.implementation === 'native').length;
      const nativeRate = (nativeCount / metrics.length) * 100;
      const avgResponseTime = metrics.reduce((sum, m) => sum + m.averageDuration, 0) / metrics.length;

      const status = nativeRate >= 90 ? '🟢' : nativeRate >= 70 ? '🟡' : '🔴';
      
      console.log(`${status} ${domain.padEnd(12)} | ${metrics.length.toString().padStart(3)} APIs | ${totalCalls.toString().padStart(6)} calls | ${nativeRate.toFixed(1).padStart(5)}% native | ${avgResponseTime.toFixed(1).padStart(6)}ms`);
    });

    const summary = this.tracker.getSummaryStatistics();
    console.log('═'.repeat(60));
    console.log(`📈 Total: ${summary.totalAPIs} APIs, ${summary.totalCalls} calls, ${summary.nativeImplementationRate.toFixed(1)}% native`);
    console.log(`⏱️  Avg Response: ${summary.averageResponseTime.toFixed(1)}ms | Error Rate: ${summary.errorRate.toFixed(1)}% | Uptime: ${(summary.uptime / 1000).toFixed(0)}s`);
  }

  /**
   * Send alert (in dryrun mode, just log without external actions)
   */
  private sendAlert(message: string): void {
    const timestamp = new Date().toISOString();
    const prefix = this.dryRun ? '🔍 DRYRUN ALERT:' : '🚨 ALERT:';
    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (!this.dryRun) {
      // In a real implementation, you might:
      // - Send to Slack webhook
      // - Trigger PagerDuty alert
      // - Send email notification
      // - Log to monitoring system
    }
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.subscriptionId) {
      this.tracker.unsubscribeFromDomainBreakdown(this.subscriptionId);
      this.subscriptionId = null;
    }
    const mode = this.dryRun ? ' (DRYRUN)' : '';
    console.log(`🛑 Real-time monitoring stopped${mode}`);
  }
}

/**
 * Scheduled report generator example with dryrun support
 */
class ScheduledReportGenerator {
  private reportTimer: NodeJS.Timeout | null = null;
  private reportInterval: number; // in milliseconds

  constructor(
    private tracker: EnhancedBunNativeAPITracker,
    reportIntervalMinutes: number = 30,
    private dryRun: boolean = false
  ) {
    this.reportInterval = reportIntervalMinutes * 60 * 1000;
    this.startScheduledReports();
  }

  /**
   * Start scheduled report generation
   */
  private startScheduledReports(): void {
    const mode = this.dryRun ? ' (DRYRUN)' : '';
    console.log(`📅 Starting scheduled reports every ${this.reportInterval / 60000} minutes${mode}`);
    
    // Generate initial report
    this.generateAndSaveReport();
    
    // Schedule subsequent reports
    this.reportTimer = setInterval(() => {
      this.generateAndSaveReport();
    }, this.reportInterval);
  }

  /**
   * Generate and save report with proper organization (or dryrun simulation)
   */
  private generateAndSaveReport(): void {
    try {
      const reportPath = this.tracker.saveReport();
      const prefix = this.dryRun ? '🔍 DRYRUN:' : '📋';
      console.log(`${prefix} Report processed: ${reportPath}`);
      
      if (!this.dryRun) {
        // You could also:
        // - Upload to S3 or other storage
        // - Send via email
        // - Post to API endpoint
        // - Archive to database
      }
      
    } catch (error) {
      const prefix = this.dryRun ? '🔍 DRYRUN ERROR:' : '❌';
      console.error(`${prefix} Failed to generate report:`, error);
    }
  }

  /**
   * Stop scheduled reports
   */
  public stopScheduledReports(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
    const mode = this.dryRun ? ' (DRYRUN)' : '';
    console.log(`🛑 Scheduled reports stopped${mode}`);
  }
}

/**
 * Example usage demonstration with dryrun support
 */
async function demonstrateEnhancedTracker(): Promise<void> {
  console.log('🚀 Enhanced Bun Native API Tracker Demo');
  console.log('═'.repeat(50));

  // Check for dryrun flag
  const isDryRun = process.argv.includes('--dryrun');
  console.log(`🔍 Dryrun mode: ${isDryRun ? 'ENABLED' : 'DISABLED'}`);

  // Create tracker with configuration based on dryrun flag
  const tracker = new EnhancedBunNativeAPITracker({
    updateIntervalMs: 2000, // Update every 2 seconds for demo
    maxReportAgeHours: 1,    // Keep reports for 1 hour
    reportsDirectory: isDryRun ? './dryrun-reports' : './demo-reports',
    enableGarbageCollection: true,
    dryRun: isDryRun
  });

  // Start real-time monitoring dashboard
  const dashboard = new RealTimeMonitoringDashboard(tracker, isDryRun);

  // Start scheduled report generation (every 10 seconds for demo)
  const reportGenerator = new ScheduledReportGenerator(tracker, 0.17, isDryRun); // ~10 seconds

  // Simulate some API calls to generate data
  console.log('🔄 Simulating API calls...');
  
  const simulateAPIcalls = async () => {
    for (let i = 0; i < 50; i++) {
      // Simulate different types of API calls
      await tracker.trackAsynchronousCall('fetch', async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return { data: 'response' };
      }, 'native', { url: 'https://api.example.com' });

      tracker.trackSynchronousCall('Bun.file', () => {
        return { path: '/tmp/test.txt' };
      }, 'native', { path: '/tmp/test.txt' });

      tracker.trackSynchronousCall('crypto.hash', () => {
        return 'hashed_data';
      }, 'native', { algorithm: 'sha256' });

      // Simulate some errors
      if (Math.random() < 0.1) {
        try {
          await tracker.trackAsynchronousCall('fetch.error', async () => {
            throw new Error('Network error');
          }, 'fallback');
        } catch (e) {
          // Expected error for demonstration
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  // Start simulation
  simulateAPIcalls();

  // Let it run for 30 seconds, then cleanup
  setTimeout(() => {
    console.log('\n🛑 Cleaning up demo...');
    
    dashboard.stopMonitoring();
    reportGenerator.stopScheduledReports();
    tracker.shutdown();
    
    console.log('✅ Demo completed');
    process.exit(0);
  }, 30000);
}

/**
 * Standalone dryrun demonstration
 */
async function demonstrateDryrunOnly(): Promise<void> {
  const dryrunDemo = new DryrunDemonstration();
  await dryrunDemo.demonstrateDryrun();
}

/**
 * Example of filtering specific domains in real-time
 */
function demonstrateDomainFiltering(): void {
  console.log('🔍 Domain Filtering Example');
  console.log('═'.repeat(30));

  // Subscribe to only specific domains
  const networkingCallback: SubscriptionCallback = (domainBreakdown: DomainBreakdown) => {
    const networkingMetrics = domainBreakdown.networking;
    const cryptoMetrics = domainBreakdown.crypto;
    
    if (networkingMetrics.length > 0) {
      const totalCalls = networkingMetrics.reduce((sum, m) => sum + m.callCount, 0);
      console.log(`🌐 Networking: ${networkingMetrics.length} APIs, ${totalCalls} calls`);
    }
    
    if (cryptoMetrics.length > 0) {
      const totalCalls = cryptoMetrics.reduce((sum, m) => sum + m.callCount, 0);
      console.log(`🔐 Crypto: ${cryptoMetrics.length} APIs, ${totalCalls} calls`);
    }
  };

  const subscriptionId = globalEnhancedTracker.subscribeToDomainBreakdown(networkingCallback);
  
  // Auto-unsubscribe after 10 seconds
  setTimeout(() => {
    globalEnhancedTracker.unsubscribeFromDomainBreakdown(subscriptionId);
    console.log('🔍 Domain filtering demo completed');
  }, 10000);
}

// Export for use in other modules
export {
  RealTimeMonitoringDashboard,
  ScheduledReportGenerator,
  DryrunDemonstration,
  demonstrateEnhancedTracker,
  demonstrateDryrunOnly,
  demonstrateDomainFiltering
};

// Run demo if this file is executed directly
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.includes('--dryrun-only')) {
    demonstrateDryrunOnly().catch(console.error);
  } else {
    demonstrateEnhancedTracker().catch(console.error);
  }
}
