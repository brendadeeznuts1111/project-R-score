/**
 * Cache Monitor - Comprehensive cache monitoring and optimization
 */

import { AdvancedAnalyticsLogger } from './advanced-analytics-logger';
import { LogLevel, LogContext } from './types';

// Cache Types
export type CacheType = 'KV' | 'R2' | 'D1' | 'MEMORY' | 'BROWSER' | 'CDN' | 'REDIS' | 'MEMCACHED';

// Cache Operation Types
export type CacheOperation =
  | 'GET'
  | 'SET'
  | 'DELETE'
  | 'EVICT'
  | 'EXPIRE'
  | 'FLUSH'
  | 'SIZE'
  | 'KEYS';

// Cache Miss Reasons
export type CacheMissReason =
  | 'KEY_NOT_FOUND'
  | 'EXPIRED'
  | 'EVICTED'
  | 'INVALID'
  | 'SIZE_LIMIT'
  | 'TTL_EXPIRED'
  | 'DEPENDENCY_CHANGED'
  | 'FORCE_REFRESH'
  | 'COLD_START'
  | 'NETWORK_ERROR';

// Detailed Cache Metrics
export interface DetailedCacheMetrics {
  cacheType: CacheType;
  totalOperations: number;
  hitRate: number;
  missRate: number;
  evictionRate: number;

  // Performance Metrics
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;

  // Size and Memory
  currentSize: number;
  maxSize: number;
  memoryUtilization: number;

  // Operation Breakdown
  operationStats: Map<
    CacheOperation,
    {
      count: number;
      averageLatency: number;
      errorRate: number;
    }
  >;

  // Miss Analysis
  missReasons: Map<CacheMissReason, number>;

  // Hot/Cold Data
  hotKeys: Array<{
    key: string;
    hits: number;
    lastAccess: Date;
    averageLatency: number;
    size: number;
  }>;

  coldKeys: Array<{
    key: string;
    misses: number;
    lastMiss: Date;
    reason: CacheMissReason;
  }>;

  // Time-based Analysis
  hourlyStats: Array<{
    hour: number;
    hitRate: number;
    operations: number;
    averageLatency: number;
  }>;

  // Geographic Distribution (for CDN/distributed caches)
  regionStats?: Map<
    string,
    {
      hitRate: number;
      latency: number;
      operations: number;
    }
  >;

  // Cost Analysis
  costMetrics: {
    operationCosts: number;
    storageCosts: number;
    bandwidthCosts: number;
    totalCost: number;
  };
}

// Cache Optimization Suggestion
export interface CacheOptimizationSuggestion {
  id: string;
  cacheType: CacheType;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'PERFORMANCE' | 'COST' | 'RELIABILITY' | 'CAPACITY';

  title: string;
  description: string;

  currentState: {
    metric: string;
    value: number;
    unit: string;
    benchmark: string;
  };

  targetState: {
    metric: string;
    value: number;
    unit: string;
    expectedImprovement: string;
  };

  implementationSteps: Array<{
    step: string;
    effort: 'LOW' | 'MEDIUM' | 'HIGH';
    duration: string;
    dependencies: string[];
  }>;

  expectedBenefits: {
    performanceGain: string;
    costSavings: string;
    reliabilityImprovement: string;
  };

  risks: Array<{
    risk: string;
    likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
    mitigation: string;
  }>;

  validationMetrics: string[];
  rollbackPlan: string[];
}

// Cache Alert
export interface CacheAlert {
  id: string;
  timestamp: Date;
  cacheType: CacheType;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

  alertType:
    | 'LOW_HIT_RATE'
    | 'HIGH_LATENCY'
    | 'HIGH_EVICTION_RATE'
    | 'MEMORY_EXHAUSTION'
    | 'CONNECTION_ERRORS'
    | 'UNUSUAL_PATTERN'
    | 'COST_THRESHOLD';

  currentValue: number;
  threshold: number;
  trend: 'IMPROVING' | 'DEGRADING' | 'STABLE' | 'VOLATILE';

  affectedKeys: string[];
  impact: {
    affectedOperations: number;
    performanceImpact: string;
    businessImpact: string;
  };

  automaticActions: string[];
  recommendedActions: string[];
  escalationRequired: boolean;
}

export class CacheMonitor {
  private analyticsLogger: AdvancedAnalyticsLogger;
  private cacheMetrics: Map<CacheType, DetailedCacheMetrics> = new Map();
  private alertHistory: CacheAlert[] = [];
  private optimizationSuggestions: Map<string, CacheOptimizationSuggestion> = new Map();

  // Configurable thresholds
  private thresholds = {
    hitRate: {
      warning: 0.85,
      critical: 0.7,
    },
    latency: {
      warning: 50, // ms
      critical: 200,
    },
    evictionRate: {
      warning: 0.1,
      critical: 0.3,
    },
    memoryUtilization: {
      warning: 0.8,
      critical: 0.95,
    },
    errorRate: {
      warning: 0.01,
      critical: 0.05,
    },
  };

  constructor(analyticsLogger: AdvancedAnalyticsLogger) {
    this.analyticsLogger = analyticsLogger;
    this.initializeCacheMonitoring();
  }

  /**
   * Record cache operation with comprehensive metrics
   */
  public recordCacheOperation(
    cacheType: CacheType,
    operation: CacheOperation,
    key: string,
    hit: boolean,
    latency: number,
    size?: number,
    region?: string,
    missReason?: CacheMissReason,
    context: LogContext = {}
  ): void {
    // Update detailed metrics
    this.updateDetailedMetrics(cacheType, operation, key, hit, latency, size, region, missReason);

    // Log to analytics system
    this.analyticsLogger.logCacheOperation(cacheType, operation, key, hit, latency, context, {
      size,
      region,
      missReason,
      timestamp: new Date().toISOString(),
    });

    // Check for alerts
    this.checkCacheAlerts(cacheType);

    // Generate optimization suggestions
    this.generateOptimizationSuggestions(cacheType);
  }

  /**
   * Get comprehensive cache analysis
   */
  public getCacheAnalysis(
    cacheType?: CacheType
  ): DetailedCacheMetrics | Map<CacheType, DetailedCacheMetrics> {
    if (cacheType) {
      return this.cacheMetrics.get(cacheType) || this.createEmptyMetrics(cacheType);
    }
    return new Map(this.cacheMetrics);
  }

  /**
   * Get cache optimization recommendations with detailed implementation plans
   */
  public getOptimizationRecommendations(cacheType?: CacheType): CacheOptimizationSuggestion[] {
    let suggestions = Array.from(this.optimizationSuggestions.values());

    if (cacheType) {
      suggestions = suggestions.filter(s => s.cacheType === cacheType);
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get actionable cache insights
   */
  public getCacheInsights(): {
    summary: {
      totalCacheTypes: number;
      overallHitRate: number;
      averageLatency: number;
      totalOperations: number;
      costSavingsOpportunity: number;
    };

    topIssues: Array<{
      cacheType: CacheType;
      issue: string;
      severity: string;
      impact: string;
      quickFix: string;
    }>;

    performanceOpportunities: Array<{
      cacheType: CacheType;
      opportunity: string;
      expectedGain: string;
      implementationEffort: string;
      roi: number;
    }>;

    costOptimizations: Array<{
      cacheType: CacheType;
      optimization: string;
      currentCost: number;
      projectedSavings: number;
      implementation: string[];
    }>;

    hotKeys: Array<{
      cacheType: CacheType;
      key: string;
      hits: number;
      performance: string;
      recommendation: string;
    }>;
  } {
    const insights = {
      summary: this.calculateSummaryMetrics(),
      topIssues: [] as any[],
      performanceOpportunities: [] as any[],
      costOptimizations: [] as any[],
      hotKeys: [] as any[],
    };

    // Analyze each cache type
    this.cacheMetrics.forEach((metrics, cacheType) => {
      // Top Issues
      if (metrics.hitRate < this.thresholds.hitRate.warning) {
        insights.topIssues.push({
          cacheType,
          issue: `Low hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`,
          severity: metrics.hitRate < this.thresholds.hitRate.critical ? 'CRITICAL' : 'HIGH',
          impact: `${((this.thresholds.hitRate.warning - metrics.hitRate) * metrics.totalOperations).toFixed(0)} additional misses`,
          quickFix: 'Implement cache warming for top keys',
        });
      }

      if (metrics.averageLatency > this.thresholds.latency.warning) {
        insights.topIssues.push({
          cacheType,
          issue: `High latency: ${metrics.averageLatency.toFixed(1)}ms`,
          severity: metrics.averageLatency > this.thresholds.latency.critical ? 'CRITICAL' : 'HIGH',
          impact: `${(metrics.averageLatency - 20).toFixed(1)}ms additional delay per operation`,
          quickFix: 'Optimize connection pooling and serialization',
        });
      }

      // Performance Opportunities
      const hitRateImprovement = 0.95 - metrics.hitRate;
      if (hitRateImprovement > 0.05) {
        const roi = this.calculateROI(
          metrics.totalOperations,
          hitRateImprovement,
          metrics.averageLatency
        );
        insights.performanceOpportunities.push({
          cacheType,
          opportunity: `Hit rate optimization to 95%`,
          expectedGain: `${(hitRateImprovement * 100).toFixed(1)}% hit rate increase`,
          implementationEffort: 'MEDIUM',
          roi,
        });
      }

      // Cost Optimizations
      const currentCost = metrics.costMetrics.totalCost;
      if (currentCost > 100) {
        // Threshold for cost optimization
        const projectedSavings = currentCost * 0.2; // Estimated 20% savings
        insights.costOptimizations.push({
          cacheType,
          optimization: 'Implement intelligent eviction and compression',
          currentCost,
          projectedSavings,
          implementation: ['Enable compression', 'Optimize TTL settings', 'Implement LRU eviction'],
        });
      }

      // Hot Keys
      metrics.hotKeys.slice(0, 3).forEach(hotKey => {
        insights.hotKeys.push({
          cacheType,
          key: hotKey.key.substring(0, 50) + '...',
          hits: hotKey.hits,
          performance: `${hotKey.averageLatency.toFixed(1)}ms avg`,
          recommendation:
            hotKey.averageLatency > 20 ? 'Consider dedicated caching' : 'Well optimized',
        });
      });
    });

    return insights;
  }

  /**
   * Get real-time cache alerts
   */
  public getCacheAlerts(activeOnly: boolean = true): CacheAlert[] {
    let alerts = this.alertHistory;

    if (activeOnly) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      alerts = alerts.filter(alert => alert.timestamp > fiveMinutesAgo);
    }

    return alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, ERROR: 3, WARNING: 2, INFO: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Generate cache health report
   */
  public generateHealthReport(): {
    overallHealth: number;
    cacheHealth: Map<
      CacheType,
      {
        healthScore: number;
        status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
        issues: string[];
        recommendations: string[];
      }
    >;
    trends: Array<{
      metric: string;
      trend: 'IMPROVING' | 'DEGRADING' | 'STABLE';
      changePercent: number;
    }>;
  } {
    const report = {
      overallHealth: 0,
      cacheHealth: new Map(),
      trends: [] as any[],
    };

    let totalHealthScore = 0;
    let cacheCount = 0;

    this.cacheMetrics.forEach((metrics, cacheType) => {
      const healthScore = this.calculateCacheHealthScore(metrics);
      const status = this.getHealthStatus(healthScore);
      const issues = this.identifyHealthIssues(metrics);
      const recommendations = this.generateHealthRecommendations(metrics);

      report.cacheHealth.set(cacheType, {
        healthScore,
        status,
        issues,
        recommendations,
      });

      totalHealthScore += healthScore;
      cacheCount++;
    });

    report.overallHealth = cacheCount > 0 ? totalHealthScore / cacheCount : 0;

    // Generate trends (simplified for demo)
    report.trends = [
      {
        metric: 'Hit Rate',
        trend: 'IMPROVING',
        changePercent: 2.3,
      },
      {
        metric: 'Average Latency',
        trend: 'STABLE',
        changePercent: 0.5,
      },
    ];

    return report;
  }

  // Private implementation methods

  private initializeCacheMonitoring(): void {
    // Initialize common cache types
    const commonCacheTypes: CacheType[] = ['KV', 'MEMORY', 'R2', 'CDN'];
    commonCacheTypes.forEach(cacheType => {
      if (!this.cacheMetrics.has(cacheType)) {
        this.cacheMetrics.set(cacheType, this.createEmptyMetrics(cacheType));
      }
    });

    // Start background monitoring
    this.startBackgroundMonitoring();
  }

  private createEmptyMetrics(cacheType: CacheType): DetailedCacheMetrics {
    return {
      cacheType,
      totalOperations: 0,
      hitRate: 0,
      missRate: 0,
      evictionRate: 0,
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      currentSize: 0,
      maxSize: 10000,
      memoryUtilization: 0,
      operationStats: new Map(),
      missReasons: new Map(),
      hotKeys: [],
      coldKeys: [],
      hourlyStats: [],
      costMetrics: {
        operationCosts: 0,
        storageCosts: 0,
        bandwidthCosts: 0,
        totalCost: 0,
      },
    };
  }

  private updateDetailedMetrics(
    cacheType: CacheType,
    operation: CacheOperation,
    key: string,
    hit: boolean,
    latency: number,
    size?: number,
    region?: string,
    missReason?: CacheMissReason
  ): void {
    let metrics = this.cacheMetrics.get(cacheType);
    if (!metrics) {
      metrics = this.createEmptyMetrics(cacheType);
      this.cacheMetrics.set(cacheType, metrics);
    }

    // Update basic counters
    metrics.totalOperations++;

    // Update hit/miss rates
    if (hit) {
      metrics.hitRate =
        (metrics.hitRate * (metrics.totalOperations - 1) + 1) / metrics.totalOperations;
    } else {
      metrics.missRate =
        (metrics.missRate * (metrics.totalOperations - 1) + 1) / metrics.totalOperations;

      // Track miss reason
      if (missReason) {
        const currentMisses = metrics.missReasons.get(missReason) || 0;
        metrics.missReasons.set(missReason, currentMisses + 1);
      }
    }

    // Update latency metrics
    metrics.averageLatency =
      (metrics.averageLatency * (metrics.totalOperations - 1) + latency) / metrics.totalOperations;

    // Update operation stats
    const opStats = metrics.operationStats.get(operation) || {
      count: 0,
      averageLatency: 0,
      errorRate: 0,
    };
    opStats.count++;
    opStats.averageLatency =
      (opStats.averageLatency * (opStats.count - 1) + latency) / opStats.count;
    metrics.operationStats.set(operation, opStats);

    // Update hot/cold keys
    this.updateKeyTracking(metrics, key, hit, latency, size || 0, missReason);

    // Update cost metrics (simplified calculation)
    this.updateCostMetrics(metrics, operation, size || 0);

    // Update region stats if provided
    if (region && metrics.regionStats) {
      const regionStat = metrics.regionStats.get(region) || {
        hitRate: 0,
        latency: 0,
        operations: 0,
      };
      regionStat.operations++;
      regionStat.hitRate =
        (regionStat.hitRate * (regionStat.operations - 1) + (hit ? 1 : 0)) / regionStat.operations;
      regionStat.latency =
        (regionStat.latency * (regionStat.operations - 1) + latency) / regionStat.operations;
      metrics.regionStats.set(region, regionStat);
    }
  }

  private updateKeyTracking(
    metrics: DetailedCacheMetrics,
    key: string,
    hit: boolean,
    latency: number,
    size: number,
    missReason?: CacheMissReason
  ): void {
    if (hit) {
      // Update hot keys
      let hotKey = metrics.hotKeys.find(hk => hk.key === key);
      if (hotKey) {
        hotKey.hits++;
        hotKey.lastAccess = new Date();
        hotKey.averageLatency = (hotKey.averageLatency * (hotKey.hits - 1) + latency) / hotKey.hits;
      } else if (metrics.hotKeys.length < 20) {
        metrics.hotKeys.push({
          key,
          hits: 1,
          lastAccess: new Date(),
          averageLatency: latency,
          size,
        });
      } else {
        // Replace least accessed hot key if this one has more potential
        metrics.hotKeys.sort((a, b) => a.hits - b.hits);
        if (metrics.hotKeys[0].hits < 2) {
          metrics.hotKeys[0] = {
            key,
            hits: 1,
            lastAccess: new Date(),
            averageLatency: latency,
            size,
          };
        }
      }
    } else {
      // Update cold keys
      let coldKey = metrics.coldKeys.find(ck => ck.key === key);
      if (coldKey) {
        coldKey.misses++;
        coldKey.lastMiss = new Date();
      } else if (metrics.coldKeys.length < 20) {
        metrics.coldKeys.push({
          key,
          misses: 1,
          lastMiss: new Date(),
          reason: missReason || 'KEY_NOT_FOUND',
        });
      }
    }

    // Sort hot keys by hits
    metrics.hotKeys.sort((a, b) => b.hits - a.hits);
    // Sort cold keys by misses
    metrics.coldKeys.sort((a, b) => b.misses - a.misses);
  }

  private updateCostMetrics(
    metrics: DetailedCacheMetrics,
    operation: CacheOperation,
    size: number
  ): void {
    // Simplified cost calculation (would be more complex in real implementation)
    const operationCost = 0.001; // $0.001 per operation
    const storageCost = size * 0.000001; // $0.000001 per byte

    metrics.costMetrics.operationCosts += operationCost;
    metrics.costMetrics.storageCosts += storageCost;
    metrics.costMetrics.totalCost =
      metrics.costMetrics.operationCosts +
      metrics.costMetrics.storageCosts +
      metrics.costMetrics.bandwidthCosts;
  }

  private checkCacheAlerts(cacheType: CacheType): void {
    const metrics = this.cacheMetrics.get(cacheType);
    if (!metrics) return;

    const alerts: CacheAlert[] = [];

    // Low hit rate alert
    if (metrics.hitRate < this.thresholds.hitRate.warning && metrics.totalOperations > 100) {
      alerts.push({
        id: `CACHE_HIT_RATE_${cacheType}_${Date.now()}`,
        timestamp: new Date(),
        cacheType,
        severity: metrics.hitRate < this.thresholds.hitRate.critical ? 'CRITICAL' : 'WARNING',
        alertType: 'LOW_HIT_RATE',
        currentValue: metrics.hitRate * 100,
        threshold: this.thresholds.hitRate.warning * 100,
        trend: 'DEGRADING', // Simplified
        affectedKeys: metrics.coldKeys.slice(0, 5).map(ck => ck.key),
        impact: {
          affectedOperations: Math.floor(metrics.totalOperations * (1 - metrics.hitRate)),
          performanceImpact: `${((1 - metrics.hitRate) * 100).toFixed(1)}% of operations experiencing cache misses`,
          businessImpact: 'Increased response times and backend load',
        },
        automaticActions: ['Enable cache warming', 'Increase cache size'],
        recommendedActions: ['Analyze miss patterns', 'Optimize cache keys', 'Review TTL settings'],
        escalationRequired: metrics.hitRate < 0.5,
      });
    }

    // High latency alert
    if (metrics.averageLatency > this.thresholds.latency.warning) {
      alerts.push({
        id: `CACHE_LATENCY_${cacheType}_${Date.now()}`,
        timestamp: new Date(),
        cacheType,
        severity:
          metrics.averageLatency > this.thresholds.latency.critical ? 'CRITICAL' : 'WARNING',
        alertType: 'HIGH_LATENCY',
        currentValue: metrics.averageLatency,
        threshold: this.thresholds.latency.warning,
        trend: 'STABLE', // Simplified
        affectedKeys: [],
        impact: {
          affectedOperations: metrics.totalOperations,
          performanceImpact: `${(metrics.averageLatency - 20).toFixed(1)}ms additional latency per operation`,
          businessImpact: 'Degraded user experience',
        },
        automaticActions: ['Scale cache infrastructure'],
        recommendedActions: [
          'Optimize serialization',
          'Review connection pooling',
          'Check network latency',
        ],
        escalationRequired: metrics.averageLatency > 500,
      });
    }

    // Add alerts to history
    alerts.forEach(alert => {
      this.alertHistory.push(alert);

      // Log critical alerts
      if (alert.severity === 'CRITICAL') {
        console.error(`🚨 CACHE ALERT: ${alert.alertType} for ${alert.cacheType}`, alert);
      }
    });

    // Maintain alert history size
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-500);
    }
  }

  private generateOptimizationSuggestions(cacheType: CacheType): void {
    const metrics = this.cacheMetrics.get(cacheType);
    if (!metrics) return;

    // Hit rate optimization
    if (metrics.hitRate < 0.9 && !this.optimizationSuggestions.has(`HIT_RATE_${cacheType}`)) {
      const suggestion: CacheOptimizationSuggestion = {
        id: `HIT_RATE_${cacheType}`,
        cacheType,
        priority: metrics.hitRate < 0.7 ? 'HIGH' : 'MEDIUM',
        category: 'PERFORMANCE',
        title: 'Optimize Cache Hit Rate',
        description: `Improve ${cacheType} cache hit rate from ${(metrics.hitRate * 100).toFixed(1)}% to 95%+`,
        currentState: {
          metric: 'Hit Rate',
          value: metrics.hitRate * 100,
          unit: '%',
          benchmark: 'Industry standard: 90%+',
        },
        targetState: {
          metric: 'Hit Rate',
          value: 95,
          unit: '%',
          expectedImprovement: `${((0.95 - metrics.hitRate) * 100).toFixed(1)}% improvement`,
        },
        implementationSteps: [
          {
            step: 'Analyze cache miss patterns and identify frequently missed keys',
            effort: 'LOW',
            duration: '1-2 days',
            dependencies: ['Access to cache metrics'],
          },
          {
            step: 'Implement cache warming for hot keys',
            effort: 'MEDIUM',
            duration: '3-5 days',
            dependencies: ['Miss pattern analysis'],
          },
          {
            step: 'Optimize cache key structure and TTL settings',
            effort: 'MEDIUM',
            duration: '2-3 days',
            dependencies: ['Cache warming implementation'],
          },
        ],
        expectedBenefits: {
          performanceGain: '25-40% response time improvement',
          costSavings: '15-25% reduction in backend load',
          reliabilityImprovement: 'Better user experience and system stability',
        },
        risks: [
          {
            risk: 'Increased memory usage from cache warming',
            likelihood: 'MEDIUM',
            mitigation: 'Monitor memory usage and implement intelligent eviction',
          },
        ],
        validationMetrics: ['Hit rate percentage', 'Average response time', 'Cache miss frequency'],
        rollbackPlan: ['Disable cache warming', 'Revert TTL changes', 'Monitor for stability'],
      };

      this.optimizationSuggestions.set(suggestion.id, suggestion);
    }
  }

  private calculateSummaryMetrics(): {
    totalCacheTypes: number;
    overallHitRate: number;
    averageLatency: number;
    totalOperations: number;
    costSavingsOpportunity: number;
  } {
    let totalOperations = 0;
    let weightedHitRate = 0;
    let weightedLatency = 0;
    let totalCost = 0;

    this.cacheMetrics.forEach(metrics => {
      totalOperations += metrics.totalOperations;
      weightedHitRate += metrics.hitRate * metrics.totalOperations;
      weightedLatency += metrics.averageLatency * metrics.totalOperations;
      totalCost += metrics.costMetrics.totalCost;
    });

    return {
      totalCacheTypes: this.cacheMetrics.size,
      overallHitRate: totalOperations > 0 ? weightedHitRate / totalOperations : 0,
      averageLatency: totalOperations > 0 ? weightedLatency / totalOperations : 0,
      totalOperations,
      costSavingsOpportunity: totalCost * 0.2, // Estimated 20% potential savings
    };
  }

  private calculateROI(
    operations: number,
    hitRateImprovement: number,
    currentLatency: number
  ): number {
    // Simplified ROI calculation
    const latencyImprovementMs = hitRateImprovement * currentLatency * 0.5;
    const costSavings = operations * hitRateImprovement * 0.001; // $0.001 per avoided backend call
    const implementationCost = 5000; // Estimated implementation cost

    return costSavings > implementationCost ? costSavings / implementationCost : 0;
  }

  private calculateCacheHealthScore(metrics: DetailedCacheMetrics): number {
    let score = 100;

    // Hit rate score (40% weight)
    const hitRateScore = Math.min(metrics.hitRate / 0.95, 1) * 40;

    // Latency score (30% weight)
    const latencyScore = Math.max(0, (50 - metrics.averageLatency) / 50) * 30;

    // Error rate score (20% weight)
    const errorRate = this.calculateErrorRate(metrics);
    const errorScore = Math.max(0, (0.01 - errorRate) / 0.01) * 20;

    // Memory utilization score (10% weight)
    const memoryScore = Math.max(0, (0.8 - metrics.memoryUtilization) / 0.8) * 10;

    return Math.max(0, hitRateScore + latencyScore + errorScore + memoryScore);
  }

  private getHealthStatus(healthScore: number): 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL' {
    if (healthScore >= 90) return 'EXCELLENT';
    if (healthScore >= 75) return 'GOOD';
    if (healthScore >= 60) return 'WARNING';
    return 'CRITICAL';
  }

  private identifyHealthIssues(metrics: DetailedCacheMetrics): string[] {
    const issues = [];

    if (metrics.hitRate < 0.8) {
      issues.push(`Low hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
    }

    if (metrics.averageLatency > 50) {
      issues.push(`High latency: ${metrics.averageLatency.toFixed(1)}ms`);
    }

    if (metrics.memoryUtilization > 0.8) {
      issues.push(`High memory usage: ${(metrics.memoryUtilization * 100).toFixed(1)}%`);
    }

    if (metrics.evictionRate > 0.1) {
      issues.push(`High eviction rate: ${(metrics.evictionRate * 100).toFixed(1)}%`);
    }

    return issues;
  }

  private generateHealthRecommendations(metrics: DetailedCacheMetrics): string[] {
    const recommendations = [];

    if (metrics.hitRate < 0.8) {
      recommendations.push('Implement cache warming for frequently accessed keys');
      recommendations.push('Optimize cache key patterns and TTL settings');
    }

    if (metrics.averageLatency > 50) {
      recommendations.push('Optimize serialization and connection pooling');
      recommendations.push('Consider cache infrastructure scaling');
    }

    if (metrics.memoryUtilization > 0.8) {
      recommendations.push('Implement intelligent cache eviction policies');
      recommendations.push('Consider cache size optimization or scaling');
    }

    return recommendations;
  }

  private calculateErrorRate(metrics: DetailedCacheMetrics): number {
    // Simplified error rate calculation
    let totalErrors = 0;
    metrics.operationStats.forEach(stats => {
      totalErrors += stats.errorRate * stats.count;
    });
    return totalErrors / Math.max(metrics.totalOperations, 1);
  }

  private startBackgroundMonitoring(): void {
    // Background monitoring every 30 seconds
    setInterval(() => {
      this.cacheMetrics.forEach((metrics, cacheType) => {
        this.checkCacheAlerts(cacheType);
        this.generateOptimizationSuggestions(cacheType);
      });
    }, 30000);
  }
}

export default CacheMonitor;
