/**
 * Enhanced Bun Native API Tracker with real-time subscriptions, proper file organization, and garbage collection
 */

// Bun native file operations

// Type definitions
export type BunNativeAPIDomain = 
  | 'filesystem' | 'networking' | 'crypto' | 'cookies' | 'streams' 
  | 'binary' | 'system' | 'database' | 'build' | 'web' | 'workers'
  | 'utilities' | 'events' | 'timing' | 'text' | 'nodejs' 
  | 'javascript' | 'runtime';

export interface BunNativeAPIMetrics {
  /** API name */
  apiName: string;
  /** Domain classification */
  domain: BunNativeAPIDomain;
  /** Total number of calls */
  callCount: number;
  /** Implementation type */
  implementation: 'native' | 'fallback' | 'polyfill';
  /** Average duration in milliseconds */
  averageDuration: number;
  /** Total duration in milliseconds */
  totalDuration: number;
  /** Minimum duration */
  minDuration: number;
  /** Maximum duration */
  maxDuration: number;
  /** Error count */
  errorCount: number;
  /** Last call timestamp */
  lastCalled: Date;
  /** Performance tier */
  performanceTier: 'fast' | 'moderate' | 'slow';
  /** Memory efficiency */
  memoryEfficiency: 'optimal' | 'good' | 'moderate' | 'high';
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface DomainBreakdown {
  [domain: string]: BunNativeAPIMetrics[];
}

export interface SubscriptionCallback {
  (data: DomainBreakdown): void;
}

export interface TrackerConfig {
  /** Update interval in milliseconds */
  updateIntervalMs: number;
  /** Maximum age of reports before cleanup */
  maxReportAgeHours: number;
  /** Reports directory */
  reportsDirectory: string;
  /** Enable automatic garbage collection */
  enableGarbageCollection: boolean;
  /** Enable dryrun mode - no file operations */
  dryRun: boolean;
}

export interface TrackerReport {
  timestamp: string;
  summary: {
    totalAPIs: number;
    totalCalls: number;
    nativeImplementationRate: number;
    averageResponseTime: number;
    errorRate: number;
  };
  domainBreakdown: DomainBreakdown;
  performanceMetrics: {
    fastestAPI: string;
    slowestAPI: string;
    mostUsedAPI: string;
    leastUsedAPI: string;
  };
}

/**
 * Enhanced tracker with real-time subscriptions and proper file management
 */
export class EnhancedBunNativeAPITracker {
  private metrics: Map<string, BunNativeAPIMetrics> = new Map();
  private startTime: Date = new Date();
  private enabled: boolean = true;
  private subscribers: Map<string, SubscriptionCallback> = new Map();
  private updateTimer: NodeJS.Timeout | null = null;
  private config: TrackerConfig;
  private lastReportPath: string | null = null;

  constructor(config: Partial<TrackerConfig> = {}) {
    this.config = {
      updateIntervalMs: 5000,
      maxReportAgeHours: 24,
      reportsDirectory: './reports/bun-native-metrics',
      enableGarbageCollection: true,
      dryRun: false,
      ...config
    };

    // Initialize directory asynchronously without waiting
    if (!this.config.dryRun) {
      this.initializeReportsDirectory().catch(console.error);
    }
    this.startRealTimeUpdates();
  }

  /**
   * Initialize reports directory structure
   */
  private async initializeReportsDirectory(): Promise<void> {
    const dir = Bun.file(this.config.reportsDirectory);
    if (!await dir.exists()) {
      await Bun.write(this.config.reportsDirectory + '/.gitkeep', '');
    }
  }

  /**
   * Start real-time update cycle
   */
  private startRealTimeUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.notifySubscribers();
    }, this.config.updateIntervalMs);
  }

  /**
   * Notify all subscribers with current domain breakdown
   */
  private notifySubscribers(): void {
    const domainBreakdown = this.getDomainBreakdown();
    this.subscribers.forEach((callback, subscriptionId) => {
      try {
        callback(domainBreakdown);
      } catch (error) {
        console.error(`Error in subscription ${subscriptionId}:`, error);
      }
    });
  }

  /**
   * Subscribe to real-time domain breakdown updates
   */
  public subscribeToDomainBreakdown(callback: SubscriptionCallback): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscribers.set(subscriptionId, callback);
    
    // Immediately send current data
    const currentBreakdown = this.getDomainBreakdown();
    callback(currentBreakdown);
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from domain breakdown updates
   */
  public unsubscribeFromDomainBreakdown(subscriptionId: string): boolean {
    return this.subscribers.delete(subscriptionId);
  }

  /**
   * Get current domain breakdown (enhanced version of getMetricsByDomain)
   */
  public getDomainBreakdown(): DomainBreakdown {
    const allMetrics = this.getAllMetrics();
    const grouped: DomainBreakdown = {};

    // Initialize all domains
    const domains: BunNativeAPIDomain[] = [
      'filesystem', 'networking', 'crypto', 'cookies', 'streams',
      'binary', 'system', 'database', 'build', 'web', 'workers',
      'utilities', 'events', 'timing', 'text', 'nodejs',
      'javascript', 'runtime'
    ];

    domains.forEach(domain => {
      grouped[domain] = [];
    });

    // Group metrics by domain
    allMetrics.forEach(metric => {
      grouped[metric.domain].push(metric);
    });

    return grouped;
  }

  /**
   * Enable/disable tracking
   */
  public setTrackingEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Determine domain classification for an API
   */
  private classifyAPIName(apiName: string): BunNativeAPIDomain {
    const name = apiName.toLowerCase();
    
    // File I/O operations
    if (name.includes('file') || name.includes('write') || name.includes('read') || 
        name.includes('stdin') || name.includes('stdout') || name.includes('stderr')) {
      return 'filesystem';
    }
    
    // Networking operations
    if (name.includes('fetch') || name.includes('request') || name.includes('response') ||
        name.includes('serve') || name.includes('listen') || name.includes('connect') ||
        name.includes('udpsocket') || name.includes('dns') || name.includes('websocket') ||
        name.includes('headers') || name.includes('url') || name.includes('blob') ||
        name.includes('unix') || name.includes('socket') || name.includes('docker')) {
      return 'networking';
    }
    
    // Cryptographic operations
    if (name.includes('crypto') || name.includes('hash') || name.includes('encrypt') ||
        name.includes('password') || name.includes('sha') || name.includes('cryptohasher')) {
      return 'crypto';
    }
    
    // Cookie operations
    if (name.includes('cookie') || name.includes('session')) {
      return 'cookies';
    }
    
    // Stream operations
    if (name.includes('stream') || name.includes('readable') || name.includes('writable') ||
        name.includes('transform') || name.includes('duplex')) {
      return 'streams';
    }
    
    // Binary operations
    if (name.includes('buffer') || name.includes('arraybuffer') || name.includes('uint8') ||
        name.includes('uint16') || name.includes('uint32') || name.includes('dataview')) {
      return 'binary';
    }
    
    // System operations
    if (name.includes('spawn') || name.includes('exec') || name.includes('env') ||
        name.includes('platform') || name.includes('arch') || name.includes('pid')) {
      return 'system';
    }
    
    // Database operations
    if (name.includes('sqlite') || name.includes('database') || name.includes('db')) {
      return 'database';
    }
    
    // Build operations
    if (name.includes('build') || name.includes('compile') || name.includes('transpile') ||
        name.includes('bundle') || name.includes('minify')) {
      return 'build';
    }
    
    // Web operations
    if (name.includes('html') || name.includes('css') || name.includes('js') ||
        name.includes('dom') || name.includes('document')) {
      return 'web';
    }
    
    // Worker operations
    if (name.includes('worker') || name.includes('thread')) {
      return 'workers';
    }
    
    // Utility operations
    if (name.includes('util') || name.includes('path') || name.includes('url') ||
        name.includes('querystring') || name.includes('string')) {
      return 'utilities';
    }
    
    // Event operations
    if (name.includes('event') || name.includes('emit') || name.includes('on') ||
        name.includes('listener')) {
      return 'events';
    }
    
    // Timing operations
    if (name.includes('time') || name.includes('date') || name.includes('timeout') ||
        name.includes('interval') || name.includes('immediate')) {
      return 'timing';
    }
    
    // Text operations
    if (name.includes('text') || name.includes('encoding') || name.includes('utf') ||
        name.includes('base64')) {
      return 'text';
    }
    
    // Node.js compatibility
    if (name.includes('node') || name.includes('fs') || name.includes('http') ||
        name.includes('https') || name.includes('net')) {
      return 'nodejs';
    }
    
    // JavaScript operations
    if (name.includes('json') || name.includes('parse') || name.includes('stringify') ||
        name.includes('eval') || name.includes('function')) {
      return 'javascript';
    }
    
    // Default to runtime
    return 'runtime';
  }

  /**
   * Track a synchronous API call
   */
  public trackSynchronousCall(
    apiName: string, 
    callFunction: () => any, 
    implementationType: 'native' | 'fallback' | 'polyfill' = 'native',
    metadata?: Record<string, any>
  ): any {
    if (!this.enabled) {
      return callFunction();
    }

    const startTime = performance.now();
    let result: any;
    let error: Error | null = null;

    try {
      result = callFunction();
    } catch (e) {
      error = e as Error;
      throw e;
    } finally {
      const duration = performance.now() - startTime;
      this.updateMetrics(apiName, duration, error !== null, implementationType, metadata);
    }

    return result;
  }

  /**
   * Track an asynchronous API call
   */
  public async trackAsynchronousCall(
    apiName: string, 
    callFunction: () => Promise<any>, 
    implementationType: 'native' | 'fallback' | 'polyfill' = 'native',
    metadata?: Record<string, any>
  ): Promise<any> {
    if (!this.enabled) {
      return callFunction();
    }

    const startTime = performance.now();
    let result: any;
    let error: Error | null = null;

    try {
      result = await callFunction();
    } catch (e) {
      error = e as Error;
      throw e;
    } finally {
      const duration = performance.now() - startTime;
      this.updateMetrics(apiName, duration, error !== null, implementationType, metadata);
    }

    return result;
  }

  /**
   * Update metrics for an API call
   */
  private updateMetrics(
    apiName: string, 
    duration: number, 
    hasError: boolean, 
    implementationType: 'native' | 'fallback' | 'polyfill',
    metadata?: Record<string, any>
  ): void {
    const existing = this.metrics.get(apiName);
    
    if (existing) {
      existing.callCount++;
      existing.totalDuration += duration;
      existing.averageDuration = existing.totalDuration / existing.callCount;
      existing.minDuration = Math.min(existing.minDuration, duration);
      existing.maxDuration = Math.max(existing.maxDuration, duration);
      existing.lastCalled = new Date();
      
      if (hasError) {
        existing.errorCount++;
      }
      
      // Update performance tier
      existing.performanceTier = this.calculatePerformanceTier(existing.averageDuration);
      existing.memoryEfficiency = this.calculateMemoryEfficiency(existing);
    } else {
      const domain = this.classifyAPIName(apiName);
      this.metrics.set(apiName, {
        apiName,
        domain,
        callCount: 1,
        implementation: implementationType,
        averageDuration: duration,
        totalDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        errorCount: hasError ? 1 : 0,
        lastCalled: new Date(),
        performanceTier: this.calculatePerformanceTier(duration),
        memoryEfficiency: 'optimal',
        metadata
      });
    }
  }

  /**
   * Calculate performance tier based on duration
   */
  private calculatePerformanceTier(duration: number): 'fast' | 'moderate' | 'slow' {
    if (duration < 10) return 'fast';
    if (duration < 100) return 'moderate';
    return 'slow';
  }

  /**
   * Calculate memory efficiency
   */
  private calculateMemoryEfficiency(metrics: BunNativeAPIMetrics): 'optimal' | 'good' | 'moderate' | 'high' {
    // Simple heuristic based on call count and average duration
    const efficiency = metrics.callCount / metrics.averageDuration;
    if (efficiency > 100) return 'optimal';
    if (efficiency > 50) return 'good';
    if (efficiency > 10) return 'moderate';
    return 'high';
  }

  /**
   * Get metrics for a specific API
   */
  public getAPIMetrics(apiName: string): BunNativeAPIMetrics | undefined {
    return this.metrics.get(apiName);
  }

  /**
   * Get all API metrics
   */
  public getAllMetrics(): BunNativeAPIMetrics[] {
    return Array.from(this.metrics.values()).sort((a, b) => b.callCount - a.callCount);
  }

  /**
   * Get metrics grouped by domain (legacy method for compatibility)
   */
  public getMetricsByDomain(): Record<BunNativeAPIDomain, BunNativeAPIMetrics[]> {
    return this.getDomainBreakdown() as Record<BunNativeAPIDomain, BunNativeAPIMetrics[]>;
  }

  /**
   * Get summary statistics
   */
  public getSummaryStatistics() {
    const allMetrics = this.getAllMetrics();
    const totalCalls = allMetrics.reduce((sum, m) => sum + m.callCount, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const nativeAPIs = allMetrics.filter(m => m.implementation === 'native');
    const avgResponseTime = allMetrics.length > 0 
      ? allMetrics.reduce((sum, m) => sum + m.averageDuration, 0) / allMetrics.length 
      : 0;

    return {
      totalAPIs: allMetrics.length,
      totalCalls,
      nativeImplementationRate: allMetrics.length > 0 ? (nativeAPIs.length / allMetrics.length) * 100 : 0,
      averageResponseTime: avgResponseTime,
      errorRate: totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0,
      uptime: Date.now() - this.startTime.getTime()
    };
  }

  /**
   * Generate comprehensive report
   */
  public generateReport(): TrackerReport {
    const summary = this.getSummaryStatistics();
    const domainBreakdown = this.getDomainBreakdown();
    const allMetrics = this.getAllMetrics();

    // Calculate performance metrics
    const fastestAPI = allMetrics.reduce((min, m) => 
      m.averageDuration < min.averageDuration ? m : min, allMetrics[0]);
    const slowestAPI = allMetrics.reduce((max, m) => 
      m.averageDuration > max.averageDuration ? m : max, allMetrics[0]);
    const mostUsedAPI = allMetrics.reduce((max, m) => 
      m.callCount > max.callCount ? m : max, allMetrics[0]);
    const leastUsedAPI = allMetrics.reduce((min, m) => 
      m.callCount < min.callCount ? m : min, allMetrics[0]);

    return {
      timestamp: new Date().toISOString(),
      summary,
      domainBreakdown,
      performanceMetrics: {
        fastestAPI: fastestAPI.apiName,
        slowestAPI: slowestAPI.apiName,
        mostUsedAPI: mostUsedAPI.apiName,
        leastUsedAPI: leastUsedAPI.apiName
      }
    };
  }

  /**
   * Save report to organized file structure (or simulate in dryrun mode)
   */
  public async saveReport(): Promise<string> {
    const report = this.generateReport();
    
    if (this.config.dryRun) {
      // Dryrun mode - don't actually save file, just return what would be saved
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `bun-native-metrics-${timestamp}.json`;
      const filepath = `${this.config.reportsDirectory}/${filename}`;
      
      console.log(`🔍 DRYRUN: Would save report to: ${filepath}`);
      console.log(`🔍 DRYRUN: Report contains ${report.summary.totalAPIs} APIs, ${report.summary.totalCalls} calls`);
      console.log(`🔍 DRYRUN: Native implementation rate: ${report.summary.nativeImplementationRate.toFixed(1)}%`);
      
      this.lastReportPath = filepath;
      return filepath;
    }

    // Actual file saving
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `bun-native-metrics-${timestamp}.json`;
    const filepath = `${this.config.reportsDirectory}/${filename}`;

    await Bun.write(filepath, JSON.stringify(report, null, 2));
    this.lastReportPath = filepath;
    console.log(`💾 Report saved to: ${filepath}`);

    // Clean up old reports if garbage collection is enabled
    if (this.config.enableGarbageCollection) {
      await this.performGarbageCollection();
    }

    return filepath;
  }

  /**
   * Clean up old reports based on max age (or simulate in dryrun mode)
   */
  public async performGarbageCollection(): Promise<void> {
    if (this.config.dryRun) {
      console.log(`🔍 DRYRUN: Would perform garbage collection in ${this.config.reportsDirectory}`);
      console.log(`🔍 DRYRUN: Would clean up files older than ${this.config.maxReportAgeHours} hours`);
      return;
    }

    try {
      const dir = Bun.file(this.config.reportsDirectory);
      if (!await dir.exists()) return;
      
      const files = await Array.fromAsync(Bun.readdir(this.config.reportsDirectory));
      const cutoffTime = Date.now() - (this.config.maxReportAgeHours * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = `${this.config.reportsDirectory}/${file}`;
          const stats = await Bun.file(filepath).stat();
          
          if (stats.mtime.getTime() < cutoffTime) {
            await Bun.write(filepath, ''); // effectively delete by emptying
            cleanedCount++;
            console.log(`🗑️  Cleaned up old report: ${file}`);
          }
        }
      }

      if (cleanedCount === 0) {
        console.log(`✅ No old reports to clean up`);
      } else {
        console.log(`🧹 Garbage collection completed: ${cleanedCount} files removed`);
      }
    } catch (error) {
      console.error('❌ Error during garbage collection:', error);
    }
  }

  /**
   * Get health status of the tracker
   */
  public getHealthStatus() {
    const summary = this.getSummaryStatistics();
    const activeSubscriptions = this.subscribers.size;
    
    return {
      status: this.enabled ? 'healthy' : 'disabled',
      uptime: Date.now() - this.startTime.getTime(),
      trackedAPIs: summary.totalAPIs,
      totalCalls: summary.totalCalls,
      activeSubscriptions,
      lastReportPath: this.lastReportPath,
      memoryUsage: process.memoryUsage(),
      config: this.config
    };
  }

  /**
   * Stop the tracker and clean up resources
   */
  public shutdown(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.subscribers.clear();
    this.setTrackingEnabled(false);
    
    console.log('Enhanced Bun Native API Tracker shutdown complete');
  }

  /**
   * Restart the tracker
   */
  public restart(): void {
    this.shutdown();
    this.enabled = true;
    this.startRealTimeUpdates();
    console.log('Enhanced Bun Native API Tracker restarted');
  }
}

// Global instance for backward compatibility
export const globalEnhancedTracker = new EnhancedBunNativeAPITracker();

// Export convenience functions
export const subscribeToDomainBreakdown = (callback: SubscriptionCallback) => 
  globalEnhancedTracker.subscribeToDomainBreakdown(callback);

export const unsubscribeFromDomainBreakdown = (subscriptionId: string) => 
  globalEnhancedTracker.unsubscribeFromDomainBreakdown(subscriptionId);

export const getCurrentDomainBreakdown = () => 
  globalEnhancedTracker.getDomainBreakdown();

export const generateMetricsReport = async () => 
  await globalEnhancedTracker.saveReport();
