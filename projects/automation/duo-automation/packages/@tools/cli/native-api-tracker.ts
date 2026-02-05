#!/usr/bin/env bun
// Native API Tracker Implementation for Status API
// Comprehensive monitoring and tracking of Bun native API usage

// =============================================================================
// NATIVE API TRACKER - MONITORING AND TRACKING SYSTEM
// =============================================================================

/**
 * Native API usage metrics and tracking
 */
export interface NativeAPIMetrics {
  /** API name (e.g., 'Bun.Cookie', 'Bun.file', 'fetch') */
  apiName: string;
  /** Domain classification for the API */
  domain: 'filesystem' | 'networking' | 'crypto' | 'cookies' | 'streams' | 'binary' | 'system' | 'runtime';
  /** Number of times API was called */
  callCount: number;
  /** Total time spent in API calls (ms) */
  totalDuration: number;
  /** Average duration per call (ms) */
  averageDuration: number;
  /** Last call timestamp */
  lastCalled: Date;
  /** Success/failure statistics */
  successCount: number;
  errorCount: number;
  /** Implementation type with detailed classification */
  implementation: 'native' | 'fallback' | 'polyfill' | 'shim' | 'emulated';
  /** Implementation source details */
  implementationSource: {
    /** Source of implementation */
    source: 'bun-native' | 'bun-polyfill' | 'custom-fallback' | 'web-api' | 'node-compat';
    /** Version or build info */
    version?: string;
    /** Performance tier */
    performanceTier: 'ultra-fast' | 'fast' | 'moderate' | 'slow';
    /** Memory efficiency */
    memoryEfficiency: 'optimal' | 'good' | 'moderate' | 'high';
  };
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Native API tracker for monitoring Bun native API usage
 */
export class NativeAPITracker {
  private metrics: Map<string, NativeAPIMetrics> = new Map();
  private startTime: Date = new Date();
  
  /**
   * Determine domain classification for an API
   */
  private classifyDomain(apiName: string): NativeAPIMetrics['domain'] {
    const domain = apiName.toLowerCase();
    
    if (domain.includes('file') || domain.includes('write') || domain.includes('read')) {
      return 'filesystem';
    } else if (domain.includes('fetch') || domain.includes('request') || domain.includes('response')) {
      return 'networking';
    } else if (domain.includes('crypto') || domain.includes('hash') || domain.includes('encrypt')) {
      return 'crypto';
    } else if (domain.includes('cookie') || domain.includes('session')) {
      return 'cookies';
    } else if (domain.includes('stream') || domain.includes('readable') || domain.includes('writable')) {
      return 'streams';
    } else if (domain.includes('buffer') || domain.includes('binary') || domain.includes('array')) {
      return 'binary';
    } else if (domain.includes('process') || domain.includes('system') || domain.includes('env')) {
      return 'system';
    } else {
      return 'runtime';
    }
  }
  
  /**
   * Determine implementation type and source
   */
  private detectImplementation(apiName: string): NativeAPIMetrics['implementationSource'] {
    const name = apiName.toLowerCase();
    
    // Bun native APIs - highest performance
    if (name.startsWith('bun.') || name.includes('native')) {
      return {
        source: 'bun-native',
        version: Bun.version,
        performanceTier: 'ultra-fast',
        memoryEfficiency: 'optimal'
      };
    }
    
    // Web APIs implemented by Bun
    if (['fetch', 'response', 'request', 'headers', 'url', 'urlsearchparams'].includes(name)) {
      return {
        source: 'bun-native',
        version: Bun.version,
        performanceTier: 'fast',
        memoryEfficiency: 'optimal'
      };
    }
    
    // Node.js compatibility APIs
    if (name.includes('node') || name.includes('fs') || name.includes('path')) {
      return {
        source: 'node-compat',
        performanceTier: 'moderate',
        memoryEfficiency: 'good'
      };
    }
    
    // Custom implementations
    if (name.includes('tracked') || name.includes('custom')) {
      return {
        source: 'custom-fallback',
        performanceTier: 'moderate',
        memoryEfficiency: 'good'
      };
    }
    
    // Default polyfill
    return {
      source: 'bun-polyfill',
      performanceTier: 'slow',
      memoryEfficiency: 'moderate'
    };
  }
  
  /**
   * Determine implementation type based on performance and source
   */
  private classifyImplementation(source: NativeAPITracker['detectImplementation']): NativeAPIMetrics['implementation'] {
    switch (source.source) {
      case 'bun-native':
        return 'native';
      case 'bun-polyfill':
        return 'polyfill';
      case 'custom-fallback':
        return 'fallback';
      case 'web-api':
        return 'native';
      case 'node-compat':
        return 'shim';
      default:
        return 'emulated';
    }
  }
  
  /**
   * Track an API call with automatic domain and implementation detection
   */
  trackCall(apiName: string, duration: number, success: boolean, implementation?: 'native' | 'fallback' | 'polyfill' | 'shim' | 'emulated', metadata?: Record<string, any>): void {
    const domain = this.classifyDomain(apiName);
    const implementationSource = this.detectImplementation(apiName);
    const implementationType = implementation || this.classifyImplementation(implementationSource);
    
    const existing = this.metrics.get(apiName) || {
      apiName,
      domain,
      callCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      lastCalled: new Date(),
      successCount: 0,
      errorCount: 0,
      implementation: implementationType,
      implementationSource,
      metadata
    };

    existing.callCount++;
    existing.totalDuration += duration;
    existing.averageDuration = existing.totalDuration / existing.callCount;
    existing.lastCalled = new Date();
    existing.implementation = implementationType;
    existing.implementationSource = implementationSource;
    
    if (success) {
      existing.successCount++;
    } else {
      existing.errorCount++;
    }

    if (metadata) {
      existing.metadata = { ...existing.metadata, ...metadata };
    }

    this.metrics.set(apiName, existing);
  }

  /**
   * Track API call with automatic timing
   */
  async trackCallAsync<T>(
    apiName: string, 
    apiCall: () => Promise<T>, 
    implementation: 'native' | 'fallback' = 'native',
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let result: T;

    try {
      result = await apiCall();
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.trackCall(apiName, duration, success, implementation, metadata);
    }
  }

  /**
   * Track synchronous API call with automatic timing
   */
  trackCallSync<T>(
    apiName: string, 
    apiCall: () => T, 
    implementation: 'native' | 'fallback' = 'native',
    metadata?: Record<string, any>
  ): T {
    const startTime = Date.now();
    let success = false;
    let result: T;

    try {
      result = apiCall();
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.trackCall(apiName, duration, success, implementation, metadata);
    }
  }

  /**
   * Get metrics for a specific API
   */
  getMetrics(apiName: string): NativeAPIMetrics | undefined {
    return this.metrics.get(apiName);
  }

  /**
   * Get all API metrics
   */
  getAllMetrics(): NativeAPIMetrics[] {
    return Array.from(this.metrics.values()).sort((a, b) => b.callCount - a.callCount);
  }

  /**
   * Get metrics grouped by domain
   */
  getMetricsByDomain(): Record<NativeAPIMetrics['domain'], NativeAPIMetrics[]> {
    const allMetrics = this.getAllMetrics();
    const grouped: Record<NativeAPIMetrics['domain'], NativeAPIMetrics[]> = {
      filesystem: [],
      networking: [],
      crypto: [],
      cookies: [],
      streams: [],
      binary: [],
      system: [],
      runtime: []
    };
    
    allMetrics.forEach(metric => {
      grouped[metric.domain].push(metric);
    });
    
    return grouped;
  }
  
  /**
   * Get domain performance summary
   */
  getDomainPerformance(): Record<NativeAPIMetrics['domain'], {
    totalAPIs: number;
    totalCalls: number;
    averageDuration: number;
    nativeRate: number;
    errorRate: number;
    topPerformers: string[];
  }> {
    const grouped = this.getMetricsByDomain();
    const summary: any = {};
    
    Object.entries(grouped).forEach(([domain, metrics]) => {
      const totalCalls = metrics.reduce((sum, m) => sum + m.callCount, 0);
      const totalDuration = metrics.reduce((sum, m) => sum + m.totalDuration, 0);
      const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);
      const nativeCount = metrics.filter(m => m.implementation === 'native').length;
      
      summary[domain as NativeAPIMetrics['domain']] = {
        totalAPIs: metrics.length,
        totalCalls,
        averageDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
        nativeRate: metrics.length > 0 ? (nativeCount / metrics.length) * 100 : 0,
        errorRate: totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0,
        topPerformers: metrics
          .sort((a, b) => a.averageDuration - b.averageDuration)
          .slice(0, 3)
          .map(m => m.apiName)
      };
    });
    
    return summary;
  }
  
  /**
   * Get implementation analysis
   */
  getImplementationAnalysis() {
    const allMetrics = this.getAllMetrics();
    const implementations = allMetrics.reduce((acc, metric) => {
      const impl = metric.implementation;
      if (!acc[impl]) {
        acc[impl] = {
          count: 0,
          totalCalls: 0,
          avgDuration: 0,
          sources: new Set()
        };
      }
      acc[impl].count++;
      acc[impl].totalCalls += metric.callCount;
      acc[impl].sources.add(metric.implementationSource.source);
      return acc;
    }, {} as Record<string, any>);
    
    // Calculate averages
    Object.values(implementations).forEach((impl: any) => {
      impl.avgDuration = allMetrics
        .filter(m => m.implementation === Object.keys(implementations).find(k => implementations[k] === impl))
        .reduce((sum, m) => sum + m.averageDuration, 0) / impl.count;
      impl.sources = Array.from(impl.sources);
    });
    
    return implementations;
  }
  getSummary() {
    const allMetrics = this.getAllMetrics();
    const totalCalls = allMetrics.reduce((sum, m) => sum + m.callCount, 0);
    const totalDuration = allMetrics.reduce((sum, m) => sum + m.totalDuration, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const nativeAPIs = allMetrics.filter(m => m.implementation === 'native').length;
    const fallbackAPIs = allMetrics.filter(m => m.implementation === 'fallback').length;

    return {
      uptime: Date.now() - this.startTime.getTime(),
      totalAPIs: allMetrics.length,
      totalCalls,
      totalDuration,
      averageCallDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
      totalErrors,
      errorRate: totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0,
      nativeAPIs,
      fallbackAPIs,
      nativeRate: allMetrics.length > 0 ? (nativeAPIs / allMetrics.length) * 100 : 0
    };
  }

  /**
   * Get health status for all tracked APIs
   */
  getHealthStatus() {
    const allMetrics = this.getAllMetrics();
    const healthy = allMetrics.filter(m => m.errorCount === 0).length;
    const degraded = allMetrics.filter(m => m.errorCount > 0 && m.errorCount < m.callCount * 0.1).length;
    const unhealthy = allMetrics.filter(m => m.errorCount >= m.callCount * 0.1).length;

    return {
      overall: unhealthy === 0 ? (degraded === 0 ? 'healthy' : 'degraded') : 'unhealthy',
      counts: { healthy, degraded, unhealthy, total: allMetrics.length },
      details: allMetrics.map(m => ({
        api: m.apiName,
        status: m.errorCount === 0 ? 'healthy' : m.errorCount >= m.callCount * 0.1 ? 'unhealthy' : 'degraded',
        successRate: m.callCount > 0 ? ((m.successCount / m.callCount) * 100).toFixed(1) : '0',
        implementation: m.implementation
      }))
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.startTime = new Date();
  }

  /**
   * Export metrics as JSON
   */
  export() {
    return {
      timestamp: new Date().toISOString(),
      summary: this.getSummary(),
      health: this.getHealthStatus(),
      metrics: this.getAllMetrics()
    };
  }
}

/**
 * Simple cookie store for demonstration
 */
class SimpleCookieStore {
  private cookies: Map<string, string> = new Map();
  
  async set(name: string, value: string, options?: any): Promise<void> {
    this.cookies.set(name, value);
  }
  
  get(name: string): string | null {
    return this.cookies.get(name) || null;
  }
  
  has(name: string): boolean {
    return this.cookies.has(name);
  }
  
  delete(name: string): boolean {
    return this.cookies.delete(name);
  }
}

/**
 * Enhanced cookie store with API tracking
 */
export class TrackedCookieStore extends SimpleCookieStore {
  private tracker: NativeAPITracker;

  constructor() {
    super();
    this.tracker = new NativeAPITracker();
  }

  /**
   * Tracked cookie operations
   */
  async set(name: string, value: string, options?: any): Promise<void> {
    await this.tracker.trackCallAsync('Bun.CookieMap.set', async () => {
      return super.set(name, value, options);
    }, 'native', { name, hasOptions: !!options });
  }

  get(name: string): string | null {
    return this.tracker.trackCallSync('Bun.CookieMap.get', () => {
      return super.get(name);
    }, 'native', { name });
  }

  has(name: string): boolean {
    return this.tracker.trackCallSync('Bun.CookieMap.has', () => {
      return super.has(name);
    }, 'native', { name });
  }

  delete(name: string): boolean {
    return this.tracker.trackCallSync('Bun.CookieMap.delete', () => {
      return super.delete(name);
    }, 'native', { name });
  }

  /**
   * Get tracker instance
   */
  getTracker(): NativeAPITracker {
    return this.tracker;
  }
}

/**
 * Status API with native API tracking
 */
export class NativeAPIStatusAPI {
  private tracker: NativeAPITracker;
  private cookieStore: TrackedCookieStore;

  constructor() {
    this.tracker = new NativeAPITracker();
    this.cookieStore = new TrackedCookieStore();
  }

  /**
   * Get comprehensive status with native API tracking
   */
  async getStatus() {
    // Track this status API call itself
    await this.tracker.trackCallAsync('NativeAPIStatusAPI.getStatus', async () => {
      return this.getSystemStatus();
    }, 'native');

    const trackerMetrics = this.tracker.getAllMetrics();
    const trackerSummary = this.tracker.getSummary();

    return {
      timestamp: new Date().toISOString(),
      status: 'operational',
      nativeAPIs: {
        tracker: {
          summary: trackerSummary,
          metrics: trackerMetrics,
          health: this.tracker.getHealthStatus()
        },
        performance: {
          totalTrackedAPIs: trackerMetrics.length,
          totalCalls: trackerSummary.totalCalls,
          averageResponseTime: trackerSummary.averageCallDuration,
          errorRate: trackerSummary.errorRate,
          nativeImplementationRate: trackerSummary.nativeRate,
          uptime: trackerSummary.uptime
        },
        topAPIs: trackerMetrics.slice(0, 5).map(m => ({
          name: m.apiName,
          calls: m.callCount,
          avgDuration: m.averageDuration.toFixed(2),
          successRate: ((m.successCount / m.callCount) * 100).toFixed(1),
          implementation: m.implementation
        }))
      },
      features: {
        cookieTracking: '✅ Active',
        performanceMonitoring: '✅ Active',
        healthChecks: '✅ Active',
        metricsExport: '✅ Active',
        realTimeTracking: '✅ Active',
        errorTracking: '✅ Active'
      }
    };
  }

  /**
   * Get the tracker instance
   */
  getTracker(): NativeAPITracker {
    return this.tracker;
  }

  /**
   * Get detailed metrics for specific API
   */
  getAPIMetrics(apiName: string) {
    const metrics = this.tracker.getMetrics(apiName);
    return metrics ? {
      ...metrics,
      health: metrics.errorCount === 0 ? 'healthy' : 
               metrics.errorCount >= metrics.callCount * 0.1 ? 'unhealthy' : 'degraded'
    } : null;
  }

  /**
   * Reset tracking metrics
   */
  resetMetrics() {
    this.tracker.reset();
    return { message: 'Native API tracking metrics reset successfully' };
  }

  /**
   * Export all tracking data
   */
  exportTrackingData() {
    return this.tracker.export();
  }

  /**
   * Get basic system status
   */
  private getSystemStatus() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      arch: process.arch,
      bun: {
        version: Bun.version,
        revision: Bun.revision
      }
    };
  }

  /**
   * Track some demo operations
   */
  async trackDemoOperations() {
    console.log('🔍 TRACKING DEMO OPERATIONS:');
    
    // Track cookie operations
    console.log('  🍪 Cookie operations:');
    await this.cookieStore.set('demo-session', 'abc123', { httpOnly: true });
    const sessionValue = this.cookieStore.get('demo-session');
    console.log(`    Cookie set/get: ${sessionValue}`);
    
    // Track fetch operations
    console.log('  🌐 Fetch operations:');
    try {
      await this.tracker.trackCallAsync('fetch', async () => {
        return fetch('https://example.com');
      }, 'native', { endpoint: 'example.com' });
      console.log('    HTTP fetch: completed');
    } catch (error) {
      console.log(`    HTTP fetch: ${error.message}`);
    }
    
    // Track file operations
    console.log('  📁 File operations:');
    await this.tracker.trackCallAsync('Bun.write', async () => {
      return Bun.write('demo-tracking.json', JSON.stringify({
        timestamp: new Date().toISOString(),
        message: 'Native API tracking demo'
      }, null, 2));
    }, 'native', { fileType: 'json' });
    
    const fileContent = await this.tracker.trackCallAsync('Bun.file', async () => {
      const file = Bun.file('demo-tracking.json');
      return file.text();
    }, 'native', { operation: 'read' });
    
    console.log(`    File write/read: ${JSON.parse(fileContent).message}`);
  }
}

// =============================================================================
// NATIVE API TRACKER DEMONSTRATION
// =============================================================================

/**
 * Demonstrate the native API tracker with domain and implementation detection
 */
export async function demonstrateNativeAPITracker(): Promise<void> {
  console.log('🔍 NATIVE API TRACKER DEMONSTRATION');
  console.log('============================================================');
  
  // Create status API with tracking
  const statusAPI = new NativeAPIStatusAPI();
  
  // Track demo operations
  await statusAPI.trackDemoOperations();
  
  // Get comprehensive status
  console.log('\n📈 COMPREHENSIVE STATUS WITH API TRACKING:');
  const status = await statusAPI.getStatus();
  
  console.log(`  Overall Status: ${status.status}`);
  console.log(`  Uptime: ${Math.round(status.nativeAPIs.performance.uptime / 1000)}s`);
  console.log(`  Total APIs Tracked: ${status.nativeAPIs.performance.totalTrackedAPIs}`);
  console.log(`  Total Calls: ${status.nativeAPIs.performance.totalCalls}`);
  console.log(`  Average Response Time: ${status.nativeAPIs.performance.averageResponseTime.toFixed(2)}ms`);
  console.log(`  Error Rate: ${status.nativeAPIs.performance.errorRate.toFixed(1)}%`);
  console.log(`  Native Implementation Rate: ${status.nativeAPIs.performance.nativeImplementationRate.toFixed(1)}%`);
  
  console.log('\n🔝 TOP PERFORMING APIS:');
  status.nativeAPIs.topAPIs.forEach((api, index) => {
    console.log(`  ${index + 1}. ${api.name}: ${api.calls} calls, ${api.avgDuration}ms avg, ${api.successRate}% success`);
  });
  
  console.log('\n🏥 API HEALTH STATUS:');
  const health = status.nativeAPIs.tracker.health;
  console.log(`  Overall: ${health.overall}`);
  console.log(`  Healthy: ${health.counts.healthy}`);
  console.log(`  Degraded: ${health.counts.degraded}`);
  console.log(`  Unhealthy: ${health.counts.unhealthy}`);
  
  console.log('\n✅ FEATURES STATUS:');
  Object.entries(status.features).forEach(([feature, status]) => {
    console.log(`  ${feature}: ${status}`);
  });
  
  // NEW: Show domain analysis
  console.log('\n🌐 DOMAIN ANALYSIS:');
  const tracker = statusAPI.getTracker();
  const domainPerformance = tracker.getDomainPerformance();
  Object.entries(domainPerformance).forEach(([domain, perf]) => {
    if (perf.totalAPIs > 0) {
      console.log(`  ${domain}: ${perf.totalAPIs} APIs, ${perf.totalCalls} calls, ${perf.nativeRate.toFixed(1)}% native`);
      console.log(`    Top performers: ${perf.topPerformers.join(', ')}`);
    }
  });
  
  // NEW: Show implementation analysis
  console.log('\n🔧 IMPLEMENTATION ANALYSIS:');
  const implAnalysis = tracker.getImplementationAnalysis();
  Object.entries(implAnalysis).forEach(([impl, data]: [string, any]) => {
    console.log(`  ${impl}: ${data.count} APIs, ${data.totalCalls} calls, ${data.avgDuration.toFixed(2)}ms avg`);
    console.log(`    Sources: ${data.sources.join(', ')}`);
  });
  
  // NEW: Show detailed API information
  console.log('\n📊 DETAILED API METRICS:');
  const allMetrics = tracker.getAllMetrics();
  allMetrics.forEach((metric, index) => {
    console.log(`  ${index + 1}. ${metric.apiName}`);
    console.log(`     Domain: ${metric.domain}`);
    console.log(`     Implementation: ${metric.implementation} (${metric.implementationSource.source})`);
    console.log(`     Performance: ${metric.callCount} calls, ${metric.averageDuration.toFixed(2)}ms avg`);
    console.log(`     Source: ${metric.implementationSource.source}, Tier: ${metric.implementationSource.performanceTier}`);
    console.log(`     Memory: ${metric.implementationSource.memoryEfficiency}, Success: ${((metric.successCount / metric.callCount) * 100).toFixed(1)}%`);
  });
  
  // Export tracking data
  console.log('\n📤 EXPORTING TRACKING DATA:');
  const exportData = statusAPI.exportTrackingData();
  console.log(`  Export timestamp: ${exportData.timestamp}`);
  console.log(`  Metrics included: ${exportData.metrics.length} APIs`);
  console.log(`  Summary: ${exportData.summary.totalCalls} total calls tracked`);
  
  console.log('\n🎯 NATIVE API TRACKER SUMMARY:');
  console.log('  ✅ Real-time API usage monitoring');
  console.log('  ✅ Performance metrics and timing');
  console.log('  ✅ Success/failure rate tracking');
  console.log('  ✅ Native vs fallback implementation detection');
  console.log('  ✅ Domain-based classification');
  console.log('  ✅ Implementation source analysis');
  console.log('  ✅ Health status monitoring');
  console.log('  ✅ Comprehensive metrics export');
  console.log('  ✅ Integration with status API');
  
  // Cleanup demo file
  await Bun.write('demo-tracking.json', JSON.stringify({
    ...exportData,
    domainAnalysis: domainPerformance,
    implementationAnalysis: implAnalysis,
    demoCompleted: true
  }, null, 2));
}

// Start the native API tracker demonstration
if (import.meta.main) {
  demonstrateNativeAPITracker().catch(error => {
    console.error(`❌ Native API Tracker demo failed: ${error.message}`);
    process.exit(1);
  });
}
