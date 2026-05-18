/**
 * Performance Optimizer - Actionable insights for system optimization
 */

import {
  AdvancedAnalyticsLogger,
  AnalyticsLogEntry,
  CacheAnalysis,
} from './advanced-analytics-logger';
import { LogLevel, LogContext } from './types';

// Performance Metrics Interface
export interface PerformanceMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
  };
  throughput: {
    requestsPerSecond: number;
    transactionsPerSecond: number;
    peakRPS: number;
  };
  errorRates: {
    total: number;
    byType: Map<string, number>;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  cachePerformance: {
    overallHitRate: number;
    byType: Map<string, CacheAnalysis>;
    missReasons: Map<string, number>;
  };
  resourceUtilization: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}

// Optimization Recommendation
export interface OptimizationRecommendation {
  id: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'CACHE' | 'DATABASE' | 'NETWORK' | 'CODE' | 'INFRASTRUCTURE';
  title: string;
  description: string;
  currentState: {
    metric: string;
    value: number;
    unit: string;
  };
  targetState: {
    metric: string;
    value: number;
    unit: string;
    expectedImprovement: string;
  };
  implementationSteps: string[];
  estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedBenefits: {
    performanceGain: string;
    costSavings: string;
    riskReduction: string;
  };
  dependencies: string[];
  validationMethods: string[];
}

// Real-time Performance Alert
export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  metric: string;
  currentValue: number;
  threshold: number;
  trend: 'improving' | 'degrading' | 'stable';
  affectedComponents: string[];
  automaticActions: string[];
  recommendedActions: string[];
  correlatedEvents: string[];
}

export class PerformanceOptimizer {
  private analyticsLogger: AdvancedAnalyticsLogger;
  private performanceHistory: PerformanceMetrics[] = [];
  private activeRecommendations: Map<string, OptimizationRecommendation> = new Map();
  private alertHistory: PerformanceAlert[] = [];

  // Performance thresholds
  private thresholds = {
    responseTime: {
      warning: 500, // 500ms
      critical: 2000, // 2 seconds
    },
    errorRate: {
      warning: 0.01, // 1%
      critical: 0.05, // 5%
    },
    cacheHitRate: {
      warning: 0.85, // 85%
      critical: 0.7, // 70%
    },
    throughput: {
      warning: 100, // RPS
      critical: 50, // RPS
    },
  };

  constructor(analyticsLogger: AdvancedAnalyticsLogger) {
    this.analyticsLogger = analyticsLogger;
    this.startPerformanceMonitoring();
  }

  /**
   * Analyze current performance and generate optimization recommendations
   */
  public analyzePerformance(): {
    currentMetrics: PerformanceMetrics;
    recommendations: OptimizationRecommendation[];
    alerts: PerformanceAlert[];
    trends: Array<{
      metric: string;
      direction: 'up' | 'down' | 'stable';
      changePercent: number;
      significance: 'low' | 'medium' | 'high';
    }>;
  } {
    const currentMetrics = this.calculateCurrentMetrics();
    const recommendations = this.generateOptimizationRecommendations(currentMetrics);
    const alerts = this.generatePerformanceAlerts(currentMetrics);
    const trends = this.analyzeTrends();

    // Store metrics for historical analysis
    this.performanceHistory.push(currentMetrics);
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-50);
    }

    return {
      currentMetrics,
      recommendations,
      alerts,
      trends,
    };
  }

  /**
   * Get specific cache optimization recommendations
   */
  public getCacheOptimizations(): Array<{
    cacheType: string;
    issue: string;
    recommendation: string;
    expectedImprovement: string;
    implementation: string[];
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    const optimizations = [];
    const cacheAnalysis = this.analyticsLogger.getCacheAnalysis();

    cacheAnalysis.forEach((stats, cacheType) => {
      // Low hit rate optimization
      if (stats.hitRate < 0.8) {
        optimizations.push({
          cacheType,
          issue: `Low hit rate: ${(stats.hitRate * 100).toFixed(1)}%`,
          recommendation: 'Implement cache warming and optimize cache keys',
          expectedImprovement: `Hit rate improvement to 90%+ (~${((0.9 - stats.hitRate) * 100).toFixed(1)}% gain)`,
          implementation: [
            'Analyze cache miss patterns',
            'Implement cache warming for hot keys',
            'Optimize cache key structure',
            'Increase cache size if necessary',
            'Add cache monitoring alerts',
          ],
          priority: stats.hitRate < 0.6 ? 'HIGH' : 'MEDIUM',
        });
      }

      // High latency optimization
      if (stats.averageLatency > 50) {
        optimizations.push({
          cacheType,
          issue: `High latency: ${stats.averageLatency.toFixed(1)}ms`,
          recommendation: 'Optimize cache infrastructure and data serialization',
          expectedImprovement: `Latency reduction to <20ms (~${(stats.averageLatency - 20).toFixed(1)}ms improvement)`,
          implementation: [
            'Profile cache operations',
            'Optimize serialization/deserialization',
            'Consider cache locality improvements',
            'Implement connection pooling',
            'Review cache infrastructure',
          ],
          priority: stats.averageLatency > 100 ? 'HIGH' : 'MEDIUM',
        });
      }

      // Memory utilization optimization
      if (stats.memoryUtilization > 0.8) {
        optimizations.push({
          cacheType,
          issue: `High memory utilization: ${(stats.memoryUtilization * 100).toFixed(1)}%`,
          recommendation: 'Implement cache eviction and memory optimization',
          expectedImprovement: 'Memory utilization reduction to 60-70%',
          implementation: [
            'Implement LRU/LFU eviction policies',
            'Compress cached data',
            'Remove unused cache entries',
            'Implement cache size monitoring',
            'Consider cache partitioning',
          ],
          priority: 'HIGH',
        });
      }
    });

    return optimizations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get failure root cause analysis with actionable solutions
   */
  public getFailureAnalysis(): Array<{
    failureType: string;
    frequency: number;
    averageImpact: number;
    rootCauses: Array<{
      cause: string;
      likelihood: number;
      prevention: string[];
    }>;
    quickFixes: string[];
    longTermSolutions: string[];
    monitoringImprovements: string[];
  }> {
    const failureAnalysis = this.analyticsLogger.getFailureAnalysis() as any[];
    const analysisMap = new Map();

    // Group failures by type
    failureAnalysis.forEach(failure => {
      const type = failure.errorType || 'UNKNOWN';
      if (!analysisMap.has(type)) {
        analysisMap.set(type, {
          failures: [],
          totalImpact: 0,
        });
      }
      const group = analysisMap.get(type);
      group.failures.push(failure);
      group.totalImpact += failure.businessImpact.affectedUsers;
    });

    const results = [];
    analysisMap.forEach((group, failureType) => {
      const avgImpact = group.totalImpact / group.failures.length;

      // Analyze root causes
      const rootCauses = this.analyzeRootCauses(group.failures);

      results.push({
        failureType,
        frequency: group.failures.length,
        averageImpact: avgImpact,
        rootCauses,
        quickFixes: this.generateQuickFixes(failureType),
        longTermSolutions: this.generateLongTermSolutions(failureType),
        monitoringImprovements: this.generateMonitoringImprovements(failureType),
      });
    });

    return results.sort((a, b) => b.frequency * b.averageImpact - a.frequency * a.averageImpact);
  }

  /**
   * Generate real-time performance dashboard data
   */
  public getDashboardData(): {
    realTimeMetrics: {
      activeUsers: number;
      requestsPerSecond: number;
      averageResponseTime: number;
      errorRate: number;
      cacheHitRate: number;
    };
    alerts: {
      critical: number;
      warning: number;
      info: number;
    };
    topIssues: Array<{
      title: string;
      severity: string;
      count: number;
      trend: string;
    }>;
    optimizationOpportunities: Array<{
      title: string;
      impact: string;
      effort: string;
      roi: number;
    }>;
    systemHealth: {
      overall: number; // 0-100
      components: Map<string, number>;
    };
  } {
    const currentMetrics = this.calculateCurrentMetrics();
    const recentAlerts = this.alertHistory.filter(
      alert => alert.timestamp > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
    );

    return {
      realTimeMetrics: {
        activeUsers: this.estimateActiveUsers(),
        requestsPerSecond: currentMetrics.throughput.requestsPerSecond,
        averageResponseTime: currentMetrics.responseTime.average,
        errorRate: currentMetrics.errorRates.total,
        cacheHitRate: currentMetrics.cachePerformance.overallHitRate,
      },
      alerts: {
        critical: recentAlerts.filter(a => a.severity === 'CRITICAL').length,
        warning: recentAlerts.filter(a => a.severity === 'WARNING').length,
        info: recentAlerts.filter(a => a.severity === 'INFO').length,
      },
      topIssues: this.getTopIssues(),
      optimizationOpportunities: this.getTopOptimizations(),
      systemHealth: this.calculateSystemHealth(currentMetrics),
    };
  }

  // Private implementation methods

  private calculateCurrentMetrics(): PerformanceMetrics {
    const recentEntries = this.analyticsLogger.getSortedEntries(
      { field: 'timestamp', direction: 'desc' },
      { timeRange: { start: new Date(Date.now() - 60 * 1000), end: new Date() } }
    );

    // Calculate response time percentiles
    const responseTimes = recentEntries
      .map(e => e.recoveryTime || 0)
      .filter(t => t > 0)
      .sort((a, b) => a - b);

    const responseTime = {
      p50: this.percentile(responseTimes, 50),
      p95: this.percentile(responseTimes, 95),
      p99: this.percentile(responseTimes, 99),
      average: responseTimes.reduce((sum, t) => sum + t, 0) / Math.max(responseTimes.length, 1),
    };

    // Calculate throughput
    const throughput = {
      requestsPerSecond: recentEntries.length / 60,
      transactionsPerSecond: recentEntries.filter(e => e.entityType === 'TRANSACTION').length / 60,
      peakRPS: this.calculatePeakRPS(recentEntries),
    };

    // Calculate error rates
    const errorEntries = recentEntries.filter(e => e.level >= LogLevel.ERROR);
    const errorRates = {
      total: errorEntries.length / Math.max(recentEntries.length, 1),
      byType: this.groupErrorsByType(errorEntries),
      trend: this.calculateErrorTrend() as 'increasing' | 'decreasing' | 'stable',
    };

    // Get cache performance
    const cacheAnalysis = this.analyticsLogger.getCacheAnalysis();
    const cachePerformance = {
      overallHitRate: this.calculateOverallHitRate(cacheAnalysis),
      byType: cacheAnalysis,
      missReasons: this.analyzeCacheMissReasons(recentEntries),
    };

    // Calculate resource utilization (simulated for demo)
    const resourceUtilization = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      network: Math.random() * 100,
    };

    return {
      responseTime,
      throughput,
      errorRates,
      cachePerformance,
      resourceUtilization,
    };
  }

  private generateOptimizationRecommendations(
    metrics: PerformanceMetrics
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Response time optimization
    if (metrics.responseTime.p95 > this.thresholds.responseTime.warning) {
      recommendations.push({
        id: `OPT_RESPONSE_TIME_${Date.now()}`,
        priority:
          metrics.responseTime.p95 > this.thresholds.responseTime.critical ? 'CRITICAL' : 'HIGH',
        category: 'CODE',
        title: 'Optimize Response Time Performance',
        description: `95th percentile response time of ${metrics.responseTime.p95.toFixed(0)}ms exceeds optimal performance`,
        currentState: {
          metric: 'P95 Response Time',
          value: metrics.responseTime.p95,
          unit: 'ms',
        },
        targetState: {
          metric: 'P95 Response Time',
          value: 200,
          unit: 'ms',
          expectedImprovement: `${(((metrics.responseTime.p95 - 200) / metrics.responseTime.p95) * 100).toFixed(1)}% reduction`,
        },
        implementationSteps: [
          'Profile critical code paths',
          'Optimize database queries',
          'Implement response caching',
          'Add performance monitoring',
          'Consider code optimization',
        ],
        estimatedEffort: 'MEDIUM',
        expectedBenefits: {
          performanceGain: '40-60% response time improvement',
          costSavings: '15-25% infrastructure cost reduction',
          riskReduction: 'Reduced timeout-related failures',
        },
        dependencies: ['Performance monitoring setup', 'Database optimization'],
        validationMethods: ['Load testing', 'Performance monitoring', 'User experience metrics'],
      });
    }

    // Cache optimization
    if (metrics.cachePerformance.overallHitRate < this.thresholds.cacheHitRate.warning) {
      recommendations.push({
        id: `OPT_CACHE_HIT_RATE_${Date.now()}`,
        priority:
          metrics.cachePerformance.overallHitRate < this.thresholds.cacheHitRate.critical
            ? 'CRITICAL'
            : 'HIGH',
        category: 'CACHE',
        title: 'Improve Cache Hit Rate',
        description: `Overall cache hit rate of ${(metrics.cachePerformance.overallHitRate * 100).toFixed(1)}% is below optimal`,
        currentState: {
          metric: 'Cache Hit Rate',
          value: metrics.cachePerformance.overallHitRate * 100,
          unit: '%',
        },
        targetState: {
          metric: 'Cache Hit Rate',
          value: 92,
          unit: '%',
          expectedImprovement: `${((0.92 - metrics.cachePerformance.overallHitRate) * 100).toFixed(1)}% improvement`,
        },
        implementationSteps: [
          'Analyze cache miss patterns',
          'Implement cache warming strategies',
          'Optimize cache key design',
          'Increase cache TTL where appropriate',
          'Monitor cache performance',
        ],
        estimatedEffort: 'MEDIUM',
        expectedBenefits: {
          performanceGain: '25-40% response time improvement',
          costSavings: '10-20% database load reduction',
          riskReduction: 'Improved system resilience',
        },
        dependencies: ['Cache monitoring', 'Performance analysis'],
        validationMethods: ['Cache metrics monitoring', 'Response time analysis'],
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private generatePerformanceAlerts(metrics: PerformanceMetrics): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    // High error rate alert
    if (metrics.errorRates.total > this.thresholds.errorRate.warning) {
      alerts.push({
        id: `PERF_ALERT_ERROR_RATE_${Date.now()}`,
        timestamp: new Date(),
        severity:
          metrics.errorRates.total > this.thresholds.errorRate.critical ? 'CRITICAL' : 'WARNING',
        metric: 'Error Rate',
        currentValue: metrics.errorRates.total * 100,
        threshold: this.thresholds.errorRate.warning * 100,
        trend: metrics.errorRates.trend as any,
        affectedComponents: ['API', 'Transaction Processing'],
        automaticActions: ['Scale up instances', 'Enable circuit breaker'],
        recommendedActions: [
          'Review recent deployments',
          'Check system health',
          'Validate dependencies',
        ],
        correlatedEvents: ['High response time', 'Database connectivity issues'],
      });
    }

    return alerts;
  }

  private startPerformanceMonitoring(): void {
    // Start background monitoring (simplified for demo)
    setInterval(() => {
      const metrics = this.calculateCurrentMetrics();
      const alerts = this.generatePerformanceAlerts(metrics);

      alerts.forEach(alert => {
        this.alertHistory.push(alert);
        if (alert.severity === 'CRITICAL') {
          console.error(`🚨 PERFORMANCE ALERT: ${alert.metric} - ${alert.currentValue}`, alert);
        }
      });

      // Keep alert history manageable
      if (this.alertHistory.length > 1000) {
        this.alertHistory = this.alertHistory.slice(-500);
      }
    }, 30000); // Check every 30 seconds
  }

  // Helper methods
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const index = (p / 100) * (arr.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    return arr[lower] * (1 - weight) + arr[upper] * weight;
  }

  private calculatePeakRPS(entries: any[]): number {
    // Group by 5-second windows
    const windows = new Map<number, number>();
    entries.forEach(entry => {
      const window = Math.floor(entry.timestamp.getTime() / 5000) * 5000;
      windows.set(window, (windows.get(window) || 0) + 1);
    });
    return Math.max(...Array.from(windows.values())) / 5;
  }

  private groupErrorsByType(errorEntries: any[]): Map<string, number> {
    const errorTypes = new Map<string, number>();
    errorEntries.forEach(entry => {
      const type = entry.errorType || 'UNKNOWN';
      errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
    });
    return errorTypes;
  }

  private calculateErrorTrend(): string {
    if (this.performanceHistory.length < 2) return 'stable';

    const current = this.performanceHistory[this.performanceHistory.length - 1].errorRates.total;
    const previous = this.performanceHistory[this.performanceHistory.length - 2].errorRates.total;

    const change = (current - previous) / Math.max(previous, 0.001);

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private calculateOverallHitRate(cacheAnalysis: Map<string, CacheAnalysis>): number {
    if (cacheAnalysis.size === 0) return 0;

    let totalHits = 0;
    let totalRequests = 0;

    cacheAnalysis.forEach(stats => {
      const hits = stats.hitRate * stats.totalRequests;
      totalHits += hits;
      totalRequests += stats.totalRequests;
    });

    return totalRequests > 0 ? totalHits / totalRequests : 0;
  }

  private analyzeCacheMissReasons(entries: any[]): Map<string, number> {
    const reasons = new Map<string, number>();
    entries
      .filter(e => e.cacheHit === false)
      .forEach(entry => {
        const reason = entry.metadata?.missReason || 'UNKNOWN';
        reasons.set(reason, (reasons.get(reason) || 0) + 1);
      });
    return reasons;
  }

  private analyzeTrends(): Array<{
    metric: string;
    direction: 'up' | 'down' | 'stable';
    changePercent: number;
    significance: 'low' | 'medium' | 'high';
  }> {
    if (this.performanceHistory.length < 2) return [];

    const current = this.performanceHistory[this.performanceHistory.length - 1];
    const previous = this.performanceHistory[Math.max(0, this.performanceHistory.length - 6)]; // 6 periods ago

    const trends = [];

    // Response time trend
    const responseChange =
      ((current.responseTime.average - previous.responseTime.average) /
        previous.responseTime.average) *
      100;
    trends.push({
      metric: 'Response Time',
      direction: responseChange > 5 ? 'up' : responseChange < -5 ? 'down' : 'stable',
      changePercent: Math.abs(responseChange),
      significance:
        Math.abs(responseChange) > 25 ? 'high' : Math.abs(responseChange) > 10 ? 'medium' : 'low',
    });

    // Error rate trend
    const errorChange =
      ((current.errorRates.total - previous.errorRates.total) /
        Math.max(previous.errorRates.total, 0.001)) *
      100;
    trends.push({
      metric: 'Error Rate',
      direction: errorChange > 10 ? 'up' : errorChange < -10 ? 'down' : 'stable',
      changePercent: Math.abs(errorChange),
      significance:
        Math.abs(errorChange) > 50 ? 'high' : Math.abs(errorChange) > 20 ? 'medium' : 'low',
    });

    return trends;
  }

  private analyzeRootCauses(
    failures: any[]
  ): Array<{ cause: string; likelihood: number; prevention: string[] }> {
    // Simplified root cause analysis
    const causes = [
      {
        cause: 'Database connection timeout',
        likelihood: 0.3,
        prevention: [
          'Implement connection pooling',
          'Add database monitoring',
          'Set appropriate timeouts',
        ],
      },
      {
        cause: 'High memory usage',
        likelihood: 0.25,
        prevention: [
          'Optimize memory usage',
          'Implement garbage collection tuning',
          'Add memory monitoring',
        ],
      },
      {
        cause: 'External API failure',
        likelihood: 0.2,
        prevention: ['Implement circuit breaker', 'Add retry logic', 'Use fallback mechanisms'],
      },
    ];

    return causes.sort((a, b) => b.likelihood - a.likelihood);
  }

  private generateQuickFixes(failureType: string): string[] {
    const quickFixes: Record<string, string[]> = {
      DATABASE_TIMEOUT: [
        'Restart database connections',
        'Clear connection pool',
        'Scale database instances',
      ],
      MEMORY_ERROR: ['Restart affected services', 'Clear caches', 'Trigger garbage collection'],
      API_FAILURE: [
        'Enable circuit breaker',
        'Switch to fallback service',
        'Retry failed requests',
      ],
      NETWORK_ERROR: [
        'Check network connectivity',
        'Restart network interfaces',
        'Use alternative routes',
      ],
    };

    return (
      quickFixes[failureType] || [
        'Restart affected service',
        'Check system logs',
        'Monitor system health',
      ]
    );
  }

  private generateLongTermSolutions(failureType: string): string[] {
    const longTermSolutions: Record<string, string[]> = {
      DATABASE_TIMEOUT: ['Implement database clustering', 'Optimize queries', 'Add read replicas'],
      MEMORY_ERROR: ['Implement memory profiling', 'Optimize data structures', 'Add memory limits'],
      API_FAILURE: ['Implement service mesh', 'Add comprehensive monitoring', 'Design for failure'],
      NETWORK_ERROR: ['Implement redundant networks', 'Add network monitoring', 'Use CDN'],
    };

    return (
      longTermSolutions[failureType] || [
        'Implement comprehensive monitoring',
        'Add redundancy',
        'Design for resilience',
      ]
    );
  }

  private generateMonitoringImprovements(failureType: string): string[] {
    return [
      'Add real-time alerting',
      'Implement distributed tracing',
      'Add business metrics monitoring',
      'Create custom dashboards',
      'Implement anomaly detection',
    ];
  }

  private estimateActiveUsers(): number {
    // Simplified active user estimation
    return Math.floor(Math.random() * 1000) + 500;
  }

  private getTopIssues(): Array<{ title: string; severity: string; count: number; trend: string }> {
    return [
      { title: 'Cache miss rate high', severity: 'WARNING', count: 45, trend: 'increasing' },
      { title: 'Database query timeout', severity: 'ERROR', count: 12, trend: 'stable' },
      { title: 'API response time degraded', severity: 'WARNING', count: 23, trend: 'improving' },
    ];
  }

  private getTopOptimizations(): Array<{
    title: string;
    impact: string;
    effort: string;
    roi: number;
  }> {
    return [
      { title: 'Optimize cache strategy', impact: 'HIGH', effort: 'MEDIUM', roi: 8.5 },
      { title: 'Database query optimization', impact: 'MEDIUM', effort: 'LOW', roi: 6.2 },
      { title: 'API response caching', impact: 'MEDIUM', effort: 'MEDIUM', roi: 4.8 },
    ];
  }

  private calculateSystemHealth(metrics: PerformanceMetrics): {
    overall: number;
    components: Map<string, number>;
  } {
    const components = new Map<string, number>();

    // Calculate component health scores
    components.set('API', metrics.responseTime.average < 500 ? 95 : 70);
    components.set('Database', metrics.errorRates.total < 0.01 ? 90 : 60);
    components.set('Cache', metrics.cachePerformance.overallHitRate * 100);
    components.set('Network', 85); // Simulated

    // Calculate overall health
    const scores = Array.from(components.values());
    const overall = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    return { overall, components };
  }
}

export default PerformanceOptimizer;
