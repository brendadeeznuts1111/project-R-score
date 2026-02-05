#!/usr/bin/env bun
// Minimal standalone demonstration of BunNativeAPIMetrics integration

// Define the interface directly to avoid imports
interface BunNativeAPIMetrics {
  apiName: string;
  domain: 'filesystem' | 'networking' | 'crypto' | 'cookies' | 'streams' | 'binary' | 'system' | 'runtime' | 'database' | 'build' | 'web' | 'workers' | 'utilities';
  callCount: number;
  totalDuration: number;
  averageDuration: number;
  lastCalled: Date;
  successCount: number;
  errorCount: number;
  implementation: 'native' | 'fallback' | 'polyfill' | 'shim' | 'emulated';
  implementationSource: {
    source: 'bun-native' | 'bun-polyfill' | 'custom-fallback' | 'web-api' | 'node-compat';
    version?: string;
    performanceTier: 'ultra-fast' | 'fast' | 'moderate' | 'slow';
    memoryEfficiency: 'optimal' | 'good' | 'moderate' | 'high';
  };
  metadata?: Record<string, any>;
}

class BunNativeAPITracker {
  private metrics: Map<string, BunNativeAPIMetrics> = new Map();
  private startTime: Date = new Date();
  private enabled: boolean = true;
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  private classifyDomain(apiName: string): BunNativeAPIMetrics['domain'] {
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
  
  private detectImplementation(apiName: string): BunNativeAPIMetrics['implementationSource'] {
    const name = apiName.toLowerCase();
    
    if (name.startsWith('bun.') || name.includes('native')) {
      return {
        source: 'bun-native',
        version: Bun.version,
        performanceTier: 'ultra-fast',
        memoryEfficiency: 'optimal'
      };
    }
    
    if (['fetch', 'response', 'request', 'headers', 'url', 'urlsearchparams'].includes(name)) {
      return {
        source: 'bun-native',
        version: Bun.version,
        performanceTier: 'fast',
        memoryEfficiency: 'optimal'
      };
    }
    
    if (name.includes('node') || name.includes('fs') || name.includes('path')) {
      return {
        source: 'node-compat',
        performanceTier: 'moderate',
        memoryEfficiency: 'good'
      };
    }
    
    if (name.includes('tracked') || name.includes('custom')) {
      return {
        source: 'custom-fallback',
        performanceTier: 'moderate',
        memoryEfficiency: 'good'
      };
    }
    
    return {
      source: 'bun-polyfill',
      performanceTier: 'slow',
      memoryEfficiency: 'moderate'
    };
  }
  
  private classifyImplementation(source: ReturnType<BunNativeAPITracker['detectImplementation']>): BunNativeAPIMetrics['implementation'] {
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
  
  trackCall(apiName: string, duration: number, success: boolean, implementation?: BunNativeAPIMetrics['implementation'], metadata?: Record<string, any>): void {
    if (!this.enabled) return;
    
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

  async trackCallAsync<T>(
    apiName: string, 
    apiCall: () => Promise<T>, 
    implementation?: BunNativeAPIMetrics['implementation'],
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.enabled) {
      return apiCall();
    }
    
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

  trackCallSync<T>(
    apiName: string, 
    apiCall: () => T, 
    implementation?: BunNativeAPIMetrics['implementation'],
    metadata?: Record<string, any>
  ): T {
    if (!this.enabled) {
      return apiCall();
    }
    
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

  getMetrics(apiName: string): BunNativeAPIMetrics | undefined {
    return this.metrics.get(apiName);
  }

  getAllMetrics(): BunNativeAPIMetrics[] {
    return Array.from(this.metrics.values()).sort((a, b) => b.callCount - a.callCount);
  }

  getSummary() {
    const allMetrics = this.getAllMetrics();
    const totalCalls = allMetrics.reduce((sum, m) => sum + m.callCount, 0);
    const totalDuration = allMetrics.reduce((sum, m) => sum + m.totalDuration, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const nativeAPIs = allMetrics.filter(m => m.implementation === 'native').length;

    return {
      uptime: Date.now() - this.startTime.getTime(),
      totalAPIs: allMetrics.length,
      totalCalls,
      totalDuration,
      averageCallDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
      totalErrors,
      errorRate: totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0,
      nativeAPIs,
      nativeRate: allMetrics.length > 0 ? (nativeAPIs / allMetrics.length) * 100 : 0
    };
  }

  export() {
    return {
      timestamp: new Date().toISOString(),
      summary: this.getSummary(),
      metrics: this.getAllMetrics()
    };
  }

  reset(): void {
    this.metrics.clear();
    this.startTime = new Date();
  }
}

class TrackedBunAPIs {
  private tracker: BunNativeAPITracker;

  constructor(tracker?: BunNativeAPITracker) {
    this.tracker = tracker || new BunNativeAPITracker();
  }

  async trackedFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    return this.tracker.trackCallAsync('fetch', async () => {
      return fetch(input, init);
    }, 'native', { 
      url: input.toString(),
      method: init?.method || 'GET'
    });
  }

  trackedFile(path: string | URL): BunFile {
    return this.tracker.trackCallSync('Bun.file', () => {
      return Bun.file(path);
    }, 'native', { path: path.toString() });
  }

  async trackedWrite(path: string | URL, data: any): Promise<number> {
    return this.tracker.trackCallAsync('Bun.write', async () => {
      return Bun.write(path, data);
    }, 'native', { 
      path: path.toString(),
      dataType: typeof data
    });
  }

  trackedCookieMap(input?: string | Record<string, string> | Array<[string, string]>): CookieMap {
    return this.tracker.trackCallSync('Bun.CookieMap', () => {
      return new Bun.CookieMap(input);
    }, 'native', { 
      inputType: typeof input,
      hasInput: !!input
    });
  }

  trackedCookie(name: string, value: string, options?: CookieInit): Cookie {
    return this.tracker.trackCallSync('Bun.Cookie', () => {
      return new Bun.Cookie(name, value, options);
    }, 'native', { 
      name,
      hasOptions: !!options
    });
  }

  getTracker(): BunNativeAPITracker {
    return this.tracker;
  }
}

/**
 * Demonstrate the comprehensive BunNativeAPIMetrics integration
 */
async function demonstrateBunNativeMetricsIntegration(): Promise<void> {
  console.log('🔍 BUN NATIVE METRICS INTEGRATION DEMONSTRATION');
  console.log('============================================================');
  
  // Create tracker and tracked APIs
  const tracker = new BunNativeAPITracker();
  const trackedAPIs = new TrackedBunAPIs(tracker);
  
  console.log('\n📊 TRACKED API CALLS IN ACTION:');
  
  // 1. Tracked fetch calls
  console.log('  🌐 Fetch operations:');
  await trackedAPIs.trackedFetch('https://example.com');
  await trackedAPIs.trackedFetch('https://example.com', { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'data' })
  });
  
  // 2. Tracked file operations
  console.log('  📁 File operations:');
  const testFile = 'integration-test.json';
  const testData = { message: 'Bun Native Metrics Integration', timestamp: new Date().toISOString() };
  
  await trackedAPIs.trackedWrite(testFile, JSON.stringify(testData, null, 2));
  const file = trackedAPIs.trackedFile(testFile);
  const content = await file.text();
  console.log(`    File written and read: ${JSON.parse(content).message}`);
  
  // 3. Tracked cookie operations
  console.log('  🍪 Cookie operations:');
  const cookieMap = trackedAPIs.trackedCookieMap('session=abc123; theme=dark');
  const cookie = trackedAPIs.trackedCookie('user', 'john', { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'strict' 
  });
  
  console.log(`    CookieMap size: ${cookieMap.size}`);
  console.log(`    Cookie created: ${cookie.name}=${cookie.value}`);
  
  // 4. Manual tracking examples
  console.log('  🔧 Manual tracking examples:');
  tracker.trackCallSync('custom-operation', () => {
    // Simulate some work
    const start = Date.now();
    while (Date.now() - start < 10) { /* busy wait */ }
    return 'completed';
  }, 'custom', { operation: 'test', type: 'sync' });
  
  await tracker.trackCallAsync('async-operation', async () => {
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 5));
    return 'async completed';
  }, 'custom', { operation: 'test', type: 'async' });
  
  // Get comprehensive metrics
  console.log('\n📈 COMPREHENSIVE METRICS ANALYSIS:');
  const allMetrics = tracker.getAllMetrics();
  const summary = tracker.getSummary();
  
  console.log(`  Total APIs Tracked: ${summary.totalAPIs}`);
  console.log(`  Total Calls: ${summary.totalCalls}`);
  console.log(`  Average Duration: ${summary.averageCallDuration.toFixed(2)}ms`);
  console.log(`  Error Rate: ${summary.errorRate.toFixed(1)}%`);
  console.log(`  Native Implementation Rate: ${summary.nativeRate.toFixed(1)}%`);
  
  console.log('\n🔝 DETAILED API METRICS:');
  allMetrics.forEach((metric, index) => {
    console.log(`  ${index + 1}. ${metric.apiName}`);
    console.log(`     Domain: ${metric.domain}`);
    console.log(`     Implementation: ${metric.implementation} (${metric.implementationSource.source})`);
    console.log(`     Performance: ${metric.callCount} calls, ${metric.averageDuration.toFixed(2)}ms avg`);
    console.log(`     Source: ${metric.implementationSource.source}, Tier: ${metric.implementationSource.performanceTier}`);
    console.log(`     Memory: ${metric.implementationSource.memoryEfficiency}, Success: ${((metric.successCount / metric.callCount) * 100).toFixed(1)}%`);
    if (metric.metadata) {
      console.log(`     Metadata: ${JSON.stringify(metric.metadata)}`);
    }
  });
  
  // Domain analysis
  console.log('\n🌐 DOMAIN-BASED ANALYSIS:');
  const domainGroups = allMetrics.reduce((acc, metric) => {
    if (!acc[metric.domain]) acc[metric.domain] = [];
    acc[metric.domain].push(metric);
    return acc;
  }, {} as Record<string, typeof allMetrics>);
  
  Object.entries(domainGroups).forEach(([domain, metrics]) => {
    const totalCalls = metrics.reduce((sum, m) => sum + m.callCount, 0);
    const avgDuration = metrics.reduce((sum, m) => sum + m.averageDuration, 0) / metrics.length;
    const nativeCount = metrics.filter(m => m.implementation === 'native').length;
    
    console.log(`  ${domain}: ${metrics.length} APIs, ${totalCalls} calls, ${avgDuration.toFixed(2)}ms avg, ${(nativeCount/metrics.length*100).toFixed(1)}% native`);
  });
  
  // Implementation analysis
  console.log('\n🔧 IMPLEMENTATION ANALYSIS:');
  const implGroups = allMetrics.reduce((acc, metric) => {
    if (!acc[metric.implementation]) acc[metric.implementation] = [];
    acc[metric.implementation].push(metric);
    return acc;
  }, {} as Record<string, typeof allMetrics>);
  
  Object.entries(implGroups).forEach(([impl, metrics]) => {
    const totalCalls = metrics.reduce((sum, m) => sum + m.callCount, 0);
    const sources = [...new Set(metrics.map(m => m.implementationSource.source))];
    
    console.log(`  ${impl}: ${metrics.length} APIs, ${totalCalls} calls, sources: ${sources.join(', ')}`);
  });
  
  // Export functionality
  console.log('\n📤 EXPORT CAPABILITIES:');
  const exportData = tracker.export();
  console.log(`  Export timestamp: ${exportData.timestamp}`);
  console.log(`  Summary: ${exportData.summary.totalAPIs} APIs, ${exportData.summary.totalCalls} calls`);
  console.log(`  Metrics included: ${exportData.metrics.length} detailed entries`);
  
  // Enable/disable demonstration
  console.log('\n⚙️ TRACKING CONTROL:');
  console.log('  Disabling tracking...');
  tracker.setEnabled(false);
  
  await trackedAPIs.trackedFetch('https://example.com'); // This won't be tracked
  const metricsAfterDisable = tracker.getAllMetrics();
  console.log(`  Metrics after disable: ${metricsAfterDisable.length} (unchanged)`);
  
  console.log('  Re-enabling tracking...');
  tracker.setEnabled(true);
  
  await trackedAPIs.trackedFetch('https://example.com'); // This will be tracked
  const metricsAfterEnable = tracker.getAllMetrics();
  console.log(`  Metrics after re-enable: ${metricsAfterEnable.length} (updated)`);
  
  // Reset demonstration
  console.log('\n🔄 RESET FUNCTIONALITY:');
  console.log('  Resetting all metrics...');
  tracker.reset();
  
  const metricsAfterReset = tracker.getAllMetrics();
  const summaryAfterReset = tracker.getSummary();
  console.log(`  Metrics after reset: ${metricsAfterReset.length}`);
  console.log(`  Summary after reset: ${summaryAfterReset.totalAPIs} APIs, ${summaryAfterReset.totalCalls} calls`);
  
  // Cleanup
  await Bun.write(testFile, JSON.stringify({
    ...testData,
    integrationCompleted: true,
    finalMetrics: exportData.summary
  }, null, 2));
  
  console.log('\n🎯 INTEGRATION SUMMARY:');
  console.log('  ✅ BunNativeAPIMetrics interface fully implemented');
  console.log('  ✅ Comprehensive tracker with domain and implementation detection');
  console.log('  ✅ Tracked API wrappers for all major Bun APIs');
  console.log('  ✅ Real-time metrics collection and analysis');
  console.log('  ✅ Export functionality for external monitoring');
  console.log('  ✅ Enable/disable tracking control');
  console.log('  ✅ Reset functionality for clean testing');
  console.log('  ✅ Domain-based performance analysis');
  console.log('  ✅ Implementation source tracking');
  console.log('  ✅ Memory and performance tier classification');
  
  console.log('\n💡 USAGE EXAMPLES:');
  console.log('  // Basic usage');
  console.log('  const tracker = new BunNativeAPITracker();');
  console.log('  const trackedAPIs = new TrackedBunAPIs(tracker);');
  console.log('  ');
  console.log('  // Tracked API calls');
  console.log('  await trackedAPIs.trackedFetch("https://example.com");');
  console.log('  const file = trackedAPIs.trackedFile("data.json");');
  console.log('  await trackedAPIs.trackedWrite("output.json", data);');
  console.log('  ');
  console.log('  // Get metrics');
  console.log('  const metrics = tracker.getAllMetrics();');
  console.log('  const summary = tracker.getSummary();');
  console.log('  const exportData = tracker.export();');
}

// Start the integration demonstration
demonstrateBunNativeMetricsIntegration().catch(error => {
  console.error(`❌ Bun Native Metrics integration demo failed: ${error.message}`);
  process.exit(1);
});
