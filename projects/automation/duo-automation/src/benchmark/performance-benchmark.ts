// src/benchmark/performance-benchmark.ts
/**
 * 📊 Performance Benchmark System
 * 
 * Comprehensive benchmarking suite for measuring and analyzing
 * the performance of the Factory-Wager admin dashboard system.
 */

export interface BenchmarkConfig {
  name: string;
  iterations: number;
  warmupIterations: number;
  timeout: number;
  metrics: string[];
  targets: {
    webVitals: boolean;
    networkPerformance: boolean;
    resourceLoading: boolean;
    preconnectEffectiveness: boolean;
  };
}

export interface BenchmarkResult {
  name: string;
  timestamp: string;
  duration: number;
  metrics: {
    [key: string]: number | string;
  };
  webVitals?: {
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    ttfb: number; // Time to First Byte
  };
  networkPerformance?: {
    dnsLookup: number;
    tcpConnect: number;
    sslHandshake: number;
    firstByte: number;
    totalResponse: number;
  };
  resourceLoading?: {
    totalResources: number;
    cachedResources: number;
    totalSize: number;
    compressionRatio: number;
  };
  preconnectEffectiveness?: {
    preconnectedDomains: number;
    averageConnectionTime: number;
    dnsTimeSaved: number;
    totalTimeSaved: number;
  };
}

export class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private observers: PerformanceObserver[] = [];
  private config: BenchmarkConfig;

  constructor(config?: Partial<BenchmarkConfig>) {
    this.config = {
      name: 'Factory-Wager Admin Dashboard Benchmark',
      iterations: 10,
      warmupIterations: 3,
      timeout: 30000,
      metrics: [
        'navigationStart',
        'domContentLoaded',
        'loadComplete',
        'firstPaint',
        'firstContentfulPaint'
      ],
      targets: {
        webVitals: true,
        networkPerformance: true,
        resourceLoading: true,
        preconnectEffectiveness: true
      },
      ...config
    };
  }

  async runBenchmark(url?: string): Promise<BenchmarkResult[]> {
    console.log('📊 Starting Performance Benchmark');
    console.log('='.repeat(40));
    console.log(`📋 Configuration: ${this.config.name}`);
    console.log(`🔄 Iterations: ${this.config.iterations}`);
    console.log(`🔥 Warmup: ${this.config.warmupIterations}`);
    console.log('');

    // Clear previous results
    this.results = [];

    // Setup performance observers
    this.setupObservers();

    // Warmup phase
    if (this.config.warmupIterations > 0) {
      console.log('🔥 Running warmup phase...');
      for (let i = 0; i < this.config.warmupIterations; i++) {
        await this.runSingleIteration(url, true);
      }
      console.log('✅ Warmup completed');
      console.log('');
    }

    // Main benchmark phase
    console.log('📊 Running main benchmark phase...');
    for (let i = 0; i < this.config.iterations; i++) {
      console.log(`🔄 Iteration ${i + 1}/${this.config.iterations}`);
      const result = await this.runSingleIteration(url, false);
      this.results.push(result);
      
      // Show progress
      const progress = ((i + 1) / this.config.iterations * 100).toFixed(1);
      console.log(`📈 Progress: ${progress}% - Duration: ${result.duration}ms`);
    }

    // Cleanup observers
    this.cleanupObservers();

    console.log('');
    console.log('✅ Benchmark completed successfully');
    return this.results;
  }

  private setupObservers(): void {
    if (this.config.targets.webVitals) {
      // Observer for Web Vitals
      const vitalsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            console.log(`🎨 Paint: ${entry.name} - ${entry.startTime}ms`);
          }
        }
      });
      vitalsObserver.observe({ entryTypes: ['paint', 'navigation', 'largest-contentful-paint'] });
      this.observers.push(vitalsObserver);
    }

    if (this.config.targets.resourceLoading) {
      // Observer for resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            console.log(`📦 Resource: ${resource.name} - ${resource.duration}ms`);
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    }
  }

  private cleanupObservers(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  private async runSingleIteration(url?: string, isWarmup: boolean): Promise<BenchmarkResult> {
    const startTime = performance.now();
    
    // Clear cache for accurate measurement
    if (!isWarmup) {
      await this.clearCache();
    }

    // Navigate or reload
    const navigationStart = performance.now();
    
    if (url) {
      window.location.href = url;
    } else {
      window.location.reload();
    }

    // Wait for page to load completely
    await this.waitForPageLoad();

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Collect metrics
    const metrics = this.collectMetrics();
    const webVitals = this.config.targets.webVitals ? this.collectWebVitals() : undefined;
    const networkPerformance = this.config.targets.networkPerformance ? this.collectNetworkMetrics() : undefined;
    const resourceLoading = this.config.targets.resourceLoading ? this.collectResourceMetrics() : undefined;
    const preconnectEffectiveness = this.config.targets.preconnectEffectiveness ? this.measurePreconnectEffectiveness() : undefined;

    return {
      name: this.config.name,
      timestamp: new Date().toISOString(),
      duration,
      metrics,
      webVitals,
      networkPerformance,
      resourceLoading,
      preconnectEffectiveness
    };
  }

  private async clearCache(): Promise<void> {
    // Clear application cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  }

  private async waitForPageLoad(): Promise<void> {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => {
          setTimeout(resolve, 1000); // Wait for additional processing
        });
      }
    });
  }

  private collectMetrics(): { [key: string]: number | string } {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      navigationStart: navigation.navigationStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
      loadComplete: navigation.loadEventEnd - navigation.navigationStart,
      firstPaint: this.getPaintTiming('first-paint'),
      firstContentfulPaint: this.getPaintTiming('first-contentful-paint'),
      domInteractive: navigation.domInteractive - navigation.navigationStart,
      domComplete: navigation.domComplete - navigation.navigationStart
    };
  }

  private getPaintTiming(name: string): number {
    const paintEntries = performance.getEntriesByType('paint');
    const entry = paintEntries.find(e => e.name === name);
    return entry ? entry.startTime : 0;
  }

  private collectWebVitals(): any {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      fcp: this.getPaintTiming('first-contentful-paint'),
      lcp: this.getLargestContentfulPaint(),
      fid: this.getFirstInputDelay(),
      cls: this.getCumulativeLayoutShift(),
      ttfb: navigation.responseStart - navigation.requestStart
    };
  }

  private getLargestContentfulPaint(): number {
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    return lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;
  }

  private getFirstInputDelay(): number {
    // FID measurement would require event listener setup
    return 0; // Placeholder
  }

  private getCumulativeLayoutShift(): number {
    // CLS measurement would require observer setup
    return 0; // Placeholder
  }

  private collectNetworkMetrics(): any {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcpConnect: navigation.connectEnd - navigation.connectStart,
      sslHandshake: navigation.secureConnectionStart > 0 ? navigation.connectEnd - navigation.secureConnectionStart : 0,
      firstByte: navigation.responseStart - navigation.requestStart,
      totalResponse: navigation.responseEnd - navigation.requestStart
    };
  }

  private collectResourceMetrics(): any {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    let totalSize = 0;
    let cachedResources = 0;
    
    resources.forEach(resource => {
      // Estimate size from transfer size
      const size = resource.transferSize || 0;
      totalSize += size;
      
      if (resource.transferSize === 0 && resource.decodedBodySize > 0) {
        cachedResources++;
      }
    });

    return {
      totalResources: resources.length,
      cachedResources,
      totalSize,
      compressionRatio: totalSize > 0 ? (totalSize / resources.length) : 0
    };
  }

  private measurePreconnectEffectiveness(): any {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    // Analyze preconnected domains
    const preconnectedDomains = new Set([
      'admin.factory-wager.com',
      'api.factory-wager.com',
      'fonts.googleapis.com',
      'cdn.tailwindcss.com'
    ]);

    let preconnectedCount = 0;
    let totalConnectionTime = 0;
    let preconnectedTime = 0;

    resources.forEach(resource => {
      try {
        const url = new URL(resource.name);
        const domain = url.hostname;
        
        if (preconnectedDomains.has(domain)) {
          preconnectedCount++;
          preconnectedTime += resource.connectEnd - resource.connectStart;
        }
        
        totalConnectionTime += resource.connectEnd - resource.connectStart;
      } catch {
        // Invalid URL, skip
      }
    });

    const averageConnectionTime = preconnectedCount > 0 ? preconnectedTime / preconnectedCount : 0;
    const averageNormalTime = resources.length > 0 ? totalConnectionTime / resources.length : 0;
    const timeSaved = averageNormalTime - averageConnectionTime;

    return {
      preconnectedDomains: preconnectedCount,
      averageConnectionTime,
      dnsTimeSaved: timeSaved > 0 ? timeSaved * 0.3 : 0, // Estimate DNS portion
      totalTimeSaved: timeSaved > 0 ? timeSaved : 0
    };
  }

  generateReport(): string {
    if (this.results.length === 0) {
      return 'No benchmark results available';
    }

    const report = [];
    report.push('📊 Performance Benchmark Report');
    report.push('='.repeat(40));
    report.push(`📋 Test: ${this.config.name}`);
    report.push(`📅 Date: ${new Date().toLocaleString()}`);
    report.push(`🔄 Iterations: ${this.results.length}`);
    report.push('');

    // Calculate averages
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    const minDuration = Math.min(...this.results.map(r => r.duration));
    const maxDuration = Math.max(...this.results.map(r => r.duration));

    report.push('⏱️ Performance Summary:');
    report.push(`  Average Duration: ${avgDuration.toFixed(2)}ms`);
    report.push(`  Min Duration: ${minDuration.toFixed(2)}ms`);
    report.push(`  Max Duration: ${maxDuration.toFixed(2)}ms`);
    report.push(`  Variance: ${(maxDuration - minDuration).toFixed(2)}ms`);
    report.push('');

    // Web Vitals
    if (this.results[0].webVitals) {
      const avgFCP = this.results.reduce((sum, r) => sum + (r.webVitals?.fcp || 0), 0) / this.results.length;
      const avgLCP = this.results.reduce((sum, r) => sum + (r.webVitals?.lcp || 0), 0) / this.results.length;
      const avgTTFB = this.results.reduce((sum, r) => sum + (r.webVitals?.ttfb || 0), 0) / this.results.length;

      report.push('🎯 Web Vitals:');
      report.push(`  First Contentful Paint: ${avgFCP.toFixed(2)}ms`);
      report.push(`  Largest Contentful Paint: ${avgLCP.toFixed(2)}ms`);
      report.push(`  Time to First Byte: ${avgTTFB.toFixed(2)}ms`);
      report.push('');
    }

    // Network Performance
    if (this.results[0].networkPerformance) {
      const avgDNS = this.results.reduce((sum, r) => sum + (r.networkPerformance?.dnsLookup || 0), 0) / this.results.length;
      const avgTCP = this.results.reduce((sum, r) => sum + (r.networkPerformance?.tcpConnect || 0), 0) / this.results.length;
      const avgFirstByte = this.results.reduce((sum, r) => sum + (r.networkPerformance?.firstByte || 0), 0) / this.results.length;

      report.push('🌐 Network Performance:');
      report.push(`  DNS Lookup: ${avgDNS.toFixed(2)}ms`);
      report.push(`  TCP Connect: ${avgTCP.toFixed(2)}ms`);
      report.push(`  First Byte: ${avgFirstByte.toFixed(2)}ms`);
      report.push('');
    }

    // Preconnect Effectiveness
    if (this.results[0].preconnectEffectiveness) {
      const avgPreconnected = this.results.reduce((sum, r) => sum + (r.preconnectEffectiveness?.preconnectedDomains || 0), 0) / this.results.length;
      const avgTimeSaved = this.results.reduce((sum, r) => sum + (r.preconnectEffectiveness?.totalTimeSaved || 0), 0) / this.results.length;

      report.push('🚀 Preconnect Effectiveness:');
      report.push(`  Preconnected Domains: ${avgPreconnected.toFixed(0)}`);
      report.push(`  Time Saved: ${avgTimeSaved.toFixed(2)}ms`);
      report.push(`  Performance Gain: ${avgTimeSaved > 0 ? '✅ Positive' : '⚠️ Minimal'}`);
      report.push('');
    }

    // Performance Grade
    const grade = this.calculatePerformanceGrade(avgDuration);
    report.push(`🏆 Performance Grade: ${grade}`);
    report.push('');

    // Recommendations
    const recommendations = this.generateRecommendations(avgDuration, avgTimeSaved);
    report.push('💡 Recommendations:');
    recommendations.forEach(rec => {
      report.push(`  • ${rec}`);
    });

    return report.join('\n');
  }

  private calculatePerformanceGrade(avgDuration: number): string {
    if (avgDuration < 1000) return 'A+ (Excellent)';
    if (avgDuration < 1500) return 'A (Very Good)';
    if (avgDuration < 2000) return 'B (Good)';
    if (avgDuration < 3000) return 'C (Fair)';
    if (avgDuration < 5000) return 'D (Poor)';
    return 'F (Very Poor)';
  }

  private generateRecommendations(avgDuration: number, timeSaved: number): string[] {
    const recommendations = [];

    if (avgDuration > 2000) {
      recommendations.push('Consider optimizing images and reducing resource size');
      recommendations.push('Implement lazy loading for non-critical resources');
    }

    if (timeSaved < 50) {
      recommendations.push('Preconnect optimization shows minimal impact');
      recommendations.push('Review preconnect configuration for critical resources');
    } else {
      recommendations.push('Preconnect optimization is working effectively');
      recommendations.push('Consider expanding preconnect to more resources');
    }

    if (avgDuration < 1500) {
      recommendations.push('Performance is excellent - maintain current optimizations');
    }

    return recommendations;
  }

  exportResults(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.results, null, 2);
    }

    if (format === 'csv') {
      const headers = ['Iteration', 'Duration', 'FCP', 'LCP', 'TTFB', 'DNS Lookup', 'TCP Connect'];
      const rows = this.results.map((result, index) => [
        index + 1,
        result.duration,
        result.webVitals?.fcp || 0,
        result.webVitals?.lcp || 0,
        result.webVitals?.ttfb || 0,
        result.networkPerformance?.dnsLookup || 0,
        result.networkPerformance?.tcpConnect || 0
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return '';
  }

  async compareWithBaseline(baselineResults: BenchmarkResult[]): Promise<string> {
    if (this.results.length === 0) {
      return 'No current results to compare';
    }

    const currentAvg = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    const baselineAvg = baselineResults.reduce((sum, r) => sum + r.duration, 0) / baselineResults.length;
    
    const improvement = ((baselineAvg - currentAvg) / baselineAvg * 100);
    const improvementStr = improvement > 0 ? `+${improvement.toFixed(2)}%` : `${improvement.toFixed(2)}%`;

    const comparison = [];
    comparison.push('📊 Performance Comparison Report');
    comparison.push('='.repeat(35));
    comparison.push(`📈 Performance Change: ${improvementStr}`);
    comparison.push(`📊 Current Average: ${currentAvg.toFixed(2)}ms`);
    comparison.push(`📊 Baseline Average: ${baselineAvg.toFixed(2)}ms`);
    comparison.push('');

    if (improvement > 5) {
      comparison.push('🎉 Significant performance improvement detected!');
    } else if (improvement > 0) {
      comparison.push('✅ Performance has improved');
    } else if (improvement > -5) {
      comparison.push('⚠️ Performance is relatively stable');
    } else {
      comparison.push('❌ Performance has degraded');
    }

    return comparison.join('\n');
  }
}

export default PerformanceBenchmark;
