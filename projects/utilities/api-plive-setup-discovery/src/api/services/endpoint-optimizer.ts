// src/api/services/endpoint-optimizer.ts - AI Endpoint Optimizer Service
// Analyzes traffic patterns and suggests optimizations

import { file, YAML } from 'bun';
import { hybridCache } from './cache-service';

interface EndpointMetrics {
  path: string;
  method: string;
  routeId: string;
  requestCount: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  cacheHitRate?: number;
  peakConcurrency: number;
}

interface OptimizationRecommendation {
  endpoint: string;
  priority: 'high' | 'medium' | 'low';
  type: 'caching' | 'compression' | 'rate-limit' | 'async' | 'batching' | 'worker';
  impact: string;
  estimatedImprovement: string;
  implementation: string;
}

/**
 * AI Endpoint Optimizer
 * Analyzes traffic patterns and suggests performance optimizations
 */
export class EndpointOptimizer {
  private metrics: Map<string, EndpointMetrics> = new Map();
  private config: any;

  async initialize() {
    // Load bun.yaml for endpoint definitions
    this.config = YAML.parse(await file('bun.yaml').text());
  }

  /**
   * Analyze endpoint and suggest optimizations
   */
  async analyzeEndpoint(path: string, method: string): Promise<OptimizationRecommendation[]> {
    await this.initialize();

    const routeId = this.findRouteId(path, method);
    const metrics = this.metrics.get(routeId) || this.getDefaultMetrics(path, method);
    const recommendations: OptimizationRecommendation[] = [];

    // 1. Caching recommendations
    if (metrics.avgResponseTime > 10 && metrics.errorRate < 0.01) {
      recommendations.push({
        endpoint: `${method} ${path}`,
        priority: 'high',
        type: 'caching',
        impact: `Reduce response time from ${metrics.avgResponseTime}ms to <5ms`,
        estimatedImprovement: `${((metrics.avgResponseTime - 5) / metrics.avgResponseTime * 100).toFixed(1)}% faster`,
        implementation: `Add hybridCache.set() for GET requests, TTL: 300s`
      });
    }

    // 2. Compression recommendations
    if (method === 'POST' && metrics.avgResponseTime > 20) {
      recommendations.push({
        endpoint: `${method} ${path}`,
        priority: 'medium',
        type: 'compression',
        impact: `Reduce payload size with zstd compression`,
        estimatedImprovement: `~30-50% size reduction`,
        implementation: `Use Bun.zstdCompressSync() on response payloads`
      });
    }

    // 3. Rate limiting recommendations
    if (metrics.errorRate > 0.05 || metrics.peakConcurrency > 100) {
      recommendations.push({
        endpoint: `${method} ${path}`,
        priority: 'high',
        type: 'rate-limit',
        impact: `Reduce error rate from ${(metrics.errorRate * 100).toFixed(2)}%`,
        estimatedImprovement: `~${(metrics.errorRate * 50).toFixed(1)}% error reduction`,
        implementation: `Add rate limiter: ${this.calculateRateLimit(metrics)} req/sec`
      });
    }

    // 4. Async processing recommendations
    if (metrics.avgResponseTime > 100 && method === 'POST') {
      recommendations.push({
        endpoint: `${method} ${path}`,
        priority: 'medium',
        type: 'async',
        impact: `Move heavy processing to background`,
        estimatedImprovement: `Response time: ${metrics.avgResponseTime}ms → <20ms`,
        implementation: `Use Bun.queue() or Worker for async processing`
      });
    }

    // 5. Batching recommendations
    if (metrics.requestCount > 1000 && metrics.avgResponseTime > 5) {
      recommendations.push({
        endpoint: `${method} ${path}`,
        priority: 'low',
        type: 'batching',
        impact: `Process multiple requests in batch`,
        estimatedImprovement: `~40% throughput increase`,
        implementation: `Implement batch endpoint using Bun.Worker`
      });
    }

    // 6. Worker recommendations
    if (metrics.p95ResponseTime > 200) {
      recommendations.push({
        endpoint: `${method} ${path}`,
        priority: 'high',
        type: 'worker',
        impact: `Parallelize CPU-intensive operations`,
        estimatedImprovement: `${((metrics.p95ResponseTime / 4) / metrics.p95ResponseTime * 100).toFixed(1)}% faster (4 workers)`,
        implementation: `Use Bun.Worker API for parallel processing`
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Analyze all endpoints from bun.yaml
   */
  async analyzeAllEndpoints(): Promise<Map<string, OptimizationRecommendation[]>> {
    await this.initialize();
    const results = new Map<string, OptimizationRecommendation[]>();

    const routes = this.config.api?.routes || [];
    for (const route of routes) {
      const recommendations = await this.analyzeEndpoint(route.path, route.method);
      if (recommendations.length > 0) {
        results.set(route.id, recommendations);
      }
    }

    return results;
  }

  /**
   * Generate optimization report
   */
  async generateReport(): Promise<string> {
    const allRecommendations = await this.analyzeAllEndpoints();
    
    let report = '# Endpoint Optimization Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    let highPriority = 0;
    let mediumPriority = 0;
    let lowPriority = 0;

    for (const [routeId, recommendations] of allRecommendations) {
      const route = this.findRouteById(routeId);
      report += `## ${route?.method || 'GET'} ${route?.path || routeId}\n\n`;
      
      for (const rec of recommendations) {
        if (rec.priority === 'high') highPriority++;
        else if (rec.priority === 'medium') mediumPriority++;
        else lowPriority++;

        report += `### ${rec.priority.toUpperCase()} Priority: ${rec.type}\n`;
        report += `- **Impact**: ${rec.impact}\n`;
        report += `- **Improvement**: ${rec.estimatedImprovement}\n`;
        report += `- **Implementation**: ${rec.implementation}\n\n`;
      }
    }

    report += `## Summary\n\n`;
    report += `- High Priority: ${highPriority}\n`;
    report += `- Medium Priority: ${mediumPriority}\n`;
    report += `- Low Priority: ${lowPriority}\n`;
    report += `- Total Recommendations: ${highPriority + mediumPriority + lowPriority}\n`;

    return report;
  }

  /**
   * Record endpoint metrics (for real-time analysis)
   */
  recordMetrics(path: string, method: string, responseTime: number, error: boolean = false): void {
    const routeId = this.findRouteId(path, method);
    const metrics = this.metrics.get(routeId) || this.getDefaultMetrics(path, method);
    
    metrics.requestCount++;
    metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.requestCount - 1) + responseTime) / metrics.requestCount;
    
    if (error) {
      metrics.errorRate = (metrics.errorRate * (metrics.requestCount - 1) + 1) / metrics.requestCount;
    }
    
    this.metrics.set(routeId, metrics);
  }

  private findRouteId(path: string, method: string): string {
    const routes = this.config.api?.routes || [];
    const route = routes.find((r: any) => 
      r.path === path && r.method === method.toUpperCase()
    );
    return route?.id || `${method}-${path}`;
  }

  private findRouteById(routeId: string): any {
    const routes = this.config.api?.routes || [];
    return routes.find((r: any) => r.id === routeId);
  }

  private getDefaultMetrics(path: string, method: string): EndpointMetrics {
    return {
      path,
      method,
      routeId: this.findRouteId(path, method),
      requestCount: 0,
      avgResponseTime: 50, // Default assumption
      p95ResponseTime: 100,
      errorRate: 0.01,
      cacheHitRate: 0,
      peakConcurrency: 10
    };
  }

  private calculateRateLimit(metrics: EndpointMetrics): number {
    // Calculate optimal rate limit based on error rate and concurrency
    if (metrics.errorRate > 0.1) {
      return Math.max(10, metrics.peakConcurrency * 0.5);
    }
    return Math.max(100, metrics.peakConcurrency * 2);
  }
}

// Export singleton instance
export const endpointOptimizer = new EndpointOptimizer();

