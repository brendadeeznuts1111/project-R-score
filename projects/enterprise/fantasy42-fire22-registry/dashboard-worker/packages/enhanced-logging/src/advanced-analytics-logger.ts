/**
 * Advanced Analytics Logger - Enhanced sorting, filtering, and actionable insights
 */

import { LogLevel, LogContext, LogEntry, LKeyLogEntry } from './types';
import { LKeyAuditLogger } from './l-key-audit-logger';

// Enhanced Log Entry with Analytics
export interface AnalyticsLogEntry extends LKeyLogEntry {
  errorCode?: string;
  errorType?:
    | 'CACHE_MISS'
    | 'DB_TIMEOUT'
    | 'API_FAILURE'
    | 'VALIDATION_ERROR'
    | 'NETWORK_ERROR'
    | 'MEMORY_ERROR';
  resolution?: string;
  impact?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedUsers?: number;
  recoveryTime?: number; // milliseconds
  correlationId?: string;
  traceRoute?: string[];
  cacheHit?: boolean;
  cacheType?: 'KV' | 'R2' | 'D1' | 'MEMORY' | 'BROWSER';
  performanceMetrics?: {
    cpuUsage: number;
    memoryUsage: number;
    diskIO: number;
    networkIO: number;
  };
}

// Failure Analysis Result
export interface FailureAnalysis {
  failureId: string;
  timestamp: Date;
  errorType: string;
  rootCause: string;
  affectedSystems: string[];
  resolution: string;
  preventionSteps: string[];
  similarIncidents: number;
  averageRecoveryTime: number;
  businessImpact: {
    affectedUsers: number;
    revenueImpact: number;
    transactionsAffected: number;
  };
}

// Cache Performance Analysis
export interface CacheAnalysis {
  cacheType: string;
  hitRate: number;
  missRate: number;
  averageLatency: number;
  totalRequests: number;
  evictionRate: number;
  memoryUtilization: number;
  hotKeys: Array<{ key: string; hits: number; lastAccess: Date }>;
  coldKeys: Array<{ key: string; misses: number; lastMiss: Date }>;
  recommendations: string[];
}

// Advanced Sorting Options
export interface SortingOptions {
  field:
    | 'timestamp'
    | 'level'
    | 'lKey'
    | 'entityType'
    | 'impact'
    | 'recoveryTime'
    | 'affectedUsers';
  direction: 'asc' | 'desc';
  secondary?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

// Advanced Filtering Options
export interface FilterOptions {
  timeRange?: { start: Date; end: Date };
  logLevels?: LogLevel[];
  lKeyCategories?: string[];
  errorTypes?: string[];
  impactLevels?: string[];
  hasResolution?: boolean;
  cacheTypes?: string[];
  minAffectedUsers?: number;
  maxRecoveryTime?: number;
  textSearch?: string;
  correlationId?: string;
}

export class AdvancedAnalyticsLogger extends LKeyAuditLogger {
  private analyticsEntries: AnalyticsLogEntry[] = [];
  private failureDatabase: Map<string, FailureAnalysis> = new Map();
  private cacheStats: Map<string, CacheAnalysis> = new Map();
  private alertThresholds = {
    errorRate: 0.05, // 5%
    responseTime: 1000, // 1 second
    cacheHitRate: 0.85, // 85%
    affectedUsers: 100,
  };

  constructor(config = {}) {
    super({
      component: 'advanced-analytics',
      enableLKeyTracking: true,
      ...config,
    });
  }

  /**
   * Log with advanced analytics context
   */
  public logWithAnalytics(
    level: LogLevel,
    message: string,
    context: LogContext,
    analytics: Partial<AnalyticsLogEntry>,
    metadata?: Record<string, any>
  ): void {
    const analyticsEntry: AnalyticsLogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      metadata,
      lKey: context.lKey || 'L0000',
      lKeyCategory: this.getLKeyCategory(context.lKey || 'L0000'),
      entityType: analytics.entityType || 'UNKNOWN',
      entityId: context.entityId || 'UNKNOWN',
      action: analytics.action || 'LOG_ENTRY',
      auditTrail: [context.lKey || 'L0000'],
      ...analytics,
    };

    this.addAnalyticsEntry(analyticsEntry);

    // Check for alerts
    this.checkAlertThresholds(analyticsEntry);

    // Log to base system
    this.log(level, message, context, metadata);
  }

  /**
   * Log cache operation with detailed metrics
   */
  public logCacheOperation(
    cacheType: 'KV' | 'R2' | 'D1' | 'MEMORY' | 'BROWSER',
    operation: 'GET' | 'SET' | 'DELETE' | 'EVICT',
    key: string,
    hit: boolean,
    latency: number,
    context: LogContext = {},
    metadata?: Record<string, any>
  ): void {
    this.logWithAnalytics(
      LogLevel.DEBUG,
      `Cache ${operation}: ${key} (${hit ? 'HIT' : 'MISS'})`,
      {
        ...context,
        component: 'cache-monitor',
      },
      {
        entityType: 'CACHE_OPERATION',
        entityId: key,
        action: `CACHE_${operation}`,
        cacheHit: hit,
        cacheType,
        performanceMetrics: {
          cpuUsage: 0,
          memoryUsage: 0,
          diskIO: latency,
          networkIO: 0,
        },
      },
      {
        cacheType,
        operation,
        key,
        hit,
        latency,
        ...metadata,
      }
    );

    // Update cache statistics
    this.updateCacheStats(cacheType, key, hit, latency);
  }

  /**
   * Log failure with comprehensive analysis
   */
  public logFailure(
    errorType: string,
    rootCause: string,
    affectedSystems: string[],
    affectedUsers: number,
    context: LogContext = {},
    metadata?: Record<string, any>
  ): string {
    const failureId = `FAIL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logWithAnalytics(
      LogLevel.ERROR,
      `System Failure: ${errorType}`,
      {
        ...context,
        component: 'failure-tracker',
      },
      {
        entityType: 'SYSTEM_FAILURE',
        entityId: failureId,
        action: 'FAILURE_DETECTED',
        errorType: errorType as any,
        impact: this.calculateImpact(affectedUsers),
        affectedUsers,
        correlationId: failureId,
      },
      {
        failureId,
        rootCause,
        affectedSystems,
        affectedUsers,
        ...metadata,
      }
    );

    // Store failure analysis
    this.storeFailureAnalysis(failureId, errorType, rootCause, affectedSystems, affectedUsers);

    return failureId;
  }

  /**
   * Log failure resolution
   */
  public logResolution(
    failureId: string,
    resolution: string,
    recoveryTime: number,
    preventionSteps: string[],
    context: LogContext = {}
  ): void {
    this.logWithAnalytics(
      LogLevel.INFO,
      `Failure Resolved: ${failureId}`,
      {
        ...context,
        component: 'failure-tracker',
      },
      {
        entityType: 'FAILURE_RESOLUTION',
        entityId: failureId,
        action: 'FAILURE_RESOLVED',
        resolution,
        recoveryTime,
        correlationId: failureId,
      },
      {
        failureId,
        resolution,
        recoveryTime,
        preventionSteps,
      }
    );

    // Update failure analysis
    this.updateFailureResolution(failureId, resolution, recoveryTime, preventionSteps);
  }

  /**
   * Advanced sorting of log entries
   */
  public getSortedEntries(options: SortingOptions, filters?: FilterOptions): AnalyticsLogEntry[] {
    let entries = this.analyticsEntries;

    // Apply filters
    if (filters) {
      entries = this.applyFilters(entries, filters);
    }

    // Primary sort
    entries.sort((a, b) => {
      let comparison = this.compareValues(a, b, options.field);
      if (options.direction === 'desc') {
        comparison = -comparison;
      }

      // Secondary sort if values are equal
      if (comparison === 0 && options.secondary) {
        let secondaryComparison = this.compareValues(a, b, options.secondary.field);
        if (options.secondary.direction === 'desc') {
          secondaryComparison = -secondaryComparison;
        }
        return secondaryComparison;
      }

      return comparison;
    });

    return entries;
  }

  /**
   * Get actionable insights from log data
   */
  public getActionableInsights(timeRange?: { start: Date; end: Date }): {
    criticalIssues: Array<{
      issue: string;
      severity: string;
      recommendation: string;
      affectedSystems: string[];
      estimatedImpact: string;
    }>;
    performanceOptimizations: Array<{
      area: string;
      currentMetric: number;
      targetMetric: number;
      improvement: string;
      implementation: string;
    }>;
    cacheOptimizations: Array<{
      cacheType: string;
      currentHitRate: number;
      targetHitRate: number;
      recommendations: string[];
    }>;
    trends: Array<{
      metric: string;
      trend: 'increasing' | 'decreasing' | 'stable';
      changePercent: number;
      significance: 'low' | 'medium' | 'high';
    }>;
  } {
    const insights = {
      criticalIssues: [] as any[],
      performanceOptimizations: [] as any[],
      cacheOptimizations: [] as any[],
      trends: [] as any[],
    };

    // Analyze critical issues
    const criticalEntries = this.getFilteredEntries({
      ...timeRange,
      logLevels: [LogLevel.ERROR, LogLevel.CRITICAL],
      impactLevels: ['HIGH', 'CRITICAL'],
    });

    // Group by error type
    const errorGroups = new Map<string, AnalyticsLogEntry[]>();
    criticalEntries.forEach(entry => {
      const errorType = entry.errorType || 'UNKNOWN';
      if (!errorGroups.has(errorType)) {
        errorGroups.set(errorType, []);
      }
      errorGroups.get(errorType)!.push(entry);
    });

    // Generate critical issue insights
    errorGroups.forEach((entries, errorType) => {
      if (entries.length > 1) {
        // Recurring issues
        const totalAffectedUsers = entries.reduce((sum, e) => sum + (e.affectedUsers || 0), 0);
        const avgRecoveryTime =
          entries.reduce((sum, e) => sum + (e.recoveryTime || 0), 0) / entries.length;

        insights.criticalIssues.push({
          issue: `Recurring ${errorType} errors (${entries.length} occurrences)`,
          severity: 'HIGH',
          recommendation: entries[0].resolution || 'Implement monitoring and automated recovery',
          affectedSystems: [...new Set(entries.flatMap(e => e.traceRoute || []))],
          estimatedImpact: `${totalAffectedUsers} users, ${avgRecoveryTime.toFixed(0)}ms avg recovery`,
        });
      }
    });

    // Analyze cache performance
    this.cacheStats.forEach((stats, cacheType) => {
      if (stats.hitRate < this.alertThresholds.cacheHitRate) {
        insights.cacheOptimizations.push({
          cacheType,
          currentHitRate: stats.hitRate,
          targetHitRate: 0.95,
          recommendations: stats.recommendations,
        });
      }
    });

    // Analyze performance trends
    const responseTimeEntries = this.getFilteredEntries({
      ...timeRange,
      hasResolution: false,
    }).filter(e => e.performanceMetrics);

    if (responseTimeEntries.length > 10) {
      const recent = responseTimeEntries.slice(-5);
      const older = responseTimeEntries.slice(-15, -10);

      const recentAvg = recent.reduce((sum, e) => sum + (e.recoveryTime || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, e) => sum + (e.recoveryTime || 0), 0) / older.length;

      const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

      insights.trends.push({
        metric: 'Response Time',
        trend: changePercent > 5 ? 'increasing' : changePercent < -5 ? 'decreasing' : 'stable',
        changePercent: Math.abs(changePercent),
        significance:
          Math.abs(changePercent) > 20 ? 'high' : Math.abs(changePercent) > 10 ? 'medium' : 'low',
      });
    }

    return insights;
  }

  /**
   * Get comprehensive cache analysis
   */
  public getCacheAnalysis(): Map<string, CacheAnalysis> {
    return new Map(this.cacheStats);
  }

  /**
   * Get failure analysis report
   */
  public getFailureAnalysis(failureId?: string): FailureAnalysis | FailureAnalysis[] {
    if (failureId) {
      return this.failureDatabase.get(failureId) || ({} as FailureAnalysis);
    }
    return Array.from(this.failureDatabase.values());
  }

  /**
   * Generate real-time alerts
   */
  public generateAlerts(): Array<{
    id: string;
    timestamp: Date;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    affectedSystems: string[];
    recommendedActions: string[];
    autoResolution?: string;
  }> {
    const alerts = [];
    const recentEntries = this.analyticsEntries.filter(
      e => e.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
    );

    // High error rate alert
    const errorEntries = recentEntries.filter(e => e.level >= LogLevel.ERROR);
    const errorRate = errorEntries.length / Math.max(recentEntries.length, 1);

    if (errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        id: `ERROR_RATE_${Date.now()}`,
        timestamp: new Date(),
        severity: errorRate > 0.2 ? 'CRITICAL' : 'HIGH',
        title: `High Error Rate Detected: ${(errorRate * 100).toFixed(1)}%`,
        description: `Error rate of ${(errorRate * 100).toFixed(1)}% exceeds threshold of ${this.alertThresholds.errorRate * 100}%`,
        affectedSystems: [...new Set(errorEntries.map(e => e.context.component || 'unknown'))],
        recommendedActions: [
          'Review recent deployments',
          'Check system resources',
          'Validate external dependencies',
          'Scale up if necessary',
        ],
        autoResolution: errorRate > 0.5 ? 'ESCALATE_TO_ON_CALL' : undefined,
      });
    }

    // Cache hit rate alert
    this.cacheStats.forEach((stats, cacheType) => {
      if (stats.hitRate < this.alertThresholds.cacheHitRate && stats.totalRequests > 100) {
        alerts.push({
          id: `CACHE_HIT_RATE_${cacheType}_${Date.now()}`,
          timestamp: new Date(),
          severity: stats.hitRate < 0.5 ? 'HIGH' : 'MEDIUM',
          title: `Low Cache Hit Rate: ${cacheType}`,
          description: `${cacheType} cache hit rate of ${(stats.hitRate * 100).toFixed(1)}% is below threshold`,
          affectedSystems: [cacheType],
          recommendedActions: stats.recommendations,
          autoResolution: stats.hitRate < 0.3 ? 'INCREASE_CACHE_SIZE' : undefined,
        });
      }
    });

    return alerts;
  }

  // Private helper methods

  private addAnalyticsEntry(entry: AnalyticsLogEntry): void {
    this.analyticsEntries.push(entry);

    // Maintain max size
    if (this.analyticsEntries.length > 20000) {
      this.analyticsEntries = this.analyticsEntries.slice(-15000);
    }
  }

  private calculateImpact(affectedUsers: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (affectedUsers >= 1000) return 'CRITICAL';
    if (affectedUsers >= 100) return 'HIGH';
    if (affectedUsers >= 10) return 'MEDIUM';
    return 'LOW';
  }

  private storeFailureAnalysis(
    failureId: string,
    errorType: string,
    rootCause: string,
    affectedSystems: string[],
    affectedUsers: number
  ): void {
    const analysis: FailureAnalysis = {
      failureId,
      timestamp: new Date(),
      errorType,
      rootCause,
      affectedSystems,
      resolution: '',
      preventionSteps: [],
      similarIncidents: this.countSimilarIncidents(errorType),
      averageRecoveryTime: 0,
      businessImpact: {
        affectedUsers,
        revenueImpact: affectedUsers * 10, // Estimated $10 per affected user
        transactionsAffected: 0,
      },
    };

    this.failureDatabase.set(failureId, analysis);
  }

  private updateFailureResolution(
    failureId: string,
    resolution: string,
    recoveryTime: number,
    preventionSteps: string[]
  ): void {
    const analysis = this.failureDatabase.get(failureId);
    if (analysis) {
      analysis.resolution = resolution;
      analysis.preventionSteps = preventionSteps;
      analysis.averageRecoveryTime = recoveryTime;
    }
  }

  private updateCacheStats(cacheType: string, key: string, hit: boolean, latency: number): void {
    let stats = this.cacheStats.get(cacheType);
    if (!stats) {
      stats = {
        cacheType,
        hitRate: 0,
        missRate: 0,
        averageLatency: 0,
        totalRequests: 0,
        evictionRate: 0,
        memoryUtilization: 0,
        hotKeys: [],
        coldKeys: [],
        recommendations: [],
      };
      this.cacheStats.set(cacheType, stats);
    }

    stats.totalRequests++;
    stats.averageLatency =
      (stats.averageLatency * (stats.totalRequests - 1) + latency) / stats.totalRequests;

    if (hit) {
      stats.hitRate = (stats.hitRate * (stats.totalRequests - 1) + 1) / stats.totalRequests;

      // Track hot keys
      const hotKey = stats.hotKeys.find(hk => hk.key === key);
      if (hotKey) {
        hotKey.hits++;
        hotKey.lastAccess = new Date();
      } else if (stats.hotKeys.length < 10) {
        stats.hotKeys.push({ key, hits: 1, lastAccess: new Date() });
      }
    } else {
      stats.missRate = (stats.missRate * (stats.totalRequests - 1) + 1) / stats.totalRequests;

      // Track cold keys
      const coldKey = stats.coldKeys.find(ck => ck.key === key);
      if (coldKey) {
        coldKey.misses++;
        coldKey.lastMiss = new Date();
      } else if (stats.coldKeys.length < 10) {
        stats.coldKeys.push({ key, misses: 1, lastMiss: new Date() });
      }
    }

    // Update recommendations
    this.updateCacheRecommendations(stats);
  }

  private updateCacheRecommendations(stats: CacheAnalysis): void {
    stats.recommendations = [];

    if (stats.hitRate < 0.5) {
      stats.recommendations.push('Consider increasing cache size');
      stats.recommendations.push('Review cache key patterns for optimization');
    }

    if (stats.averageLatency > 100) {
      stats.recommendations.push('Investigate cache performance bottlenecks');
    }

    if (stats.coldKeys.length > 7) {
      stats.recommendations.push('Implement cache warming for frequently missed keys');
    }
  }

  private countSimilarIncidents(errorType: string): number {
    return Array.from(this.failureDatabase.values()).filter(f => f.errorType === errorType).length;
  }

  private applyFilters(entries: AnalyticsLogEntry[], filters: FilterOptions): AnalyticsLogEntry[] {
    return entries.filter(entry => {
      if (filters.timeRange) {
        if (entry.timestamp < filters.timeRange.start || entry.timestamp > filters.timeRange.end) {
          return false;
        }
      }

      if (filters.logLevels && !filters.logLevels.includes(entry.level)) {
        return false;
      }

      if (filters.errorTypes && entry.errorType && !filters.errorTypes.includes(entry.errorType)) {
        return false;
      }

      if (filters.impactLevels && entry.impact && !filters.impactLevels.includes(entry.impact)) {
        return false;
      }

      if (filters.hasResolution !== undefined) {
        const hasResolution = !!entry.resolution;
        if (filters.hasResolution !== hasResolution) {
          return false;
        }
      }

      if (
        filters.minAffectedUsers &&
        (!entry.affectedUsers || entry.affectedUsers < filters.minAffectedUsers)
      ) {
        return false;
      }

      if (filters.textSearch) {
        const searchText = filters.textSearch.toLowerCase();
        if (
          !entry.message.toLowerCase().includes(searchText) &&
          !entry.errorType?.toLowerCase().includes(searchText)
        ) {
          return false;
        }
      }

      return true;
    });
  }

  private getFilteredEntries(filters: FilterOptions): AnalyticsLogEntry[] {
    return this.applyFilters(this.analyticsEntries, filters);
  }

  private compareValues(a: AnalyticsLogEntry, b: AnalyticsLogEntry, field: string): number {
    const getValue = (entry: AnalyticsLogEntry, field: string): any => {
      switch (field) {
        case 'timestamp':
          return entry.timestamp.getTime();
        case 'level':
          return entry.level;
        case 'lKey':
          return entry.lKey;
        case 'entityType':
          return entry.entityType;
        case 'impact':
          return entry.impact || 'LOW';
        case 'recoveryTime':
          return entry.recoveryTime || 0;
        case 'affectedUsers':
          return entry.affectedUsers || 0;
        default:
          return 0;
      }
    };

    const aValue = getValue(a, field);
    const bValue = getValue(b, field);

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue);
    }

    return aValue - bValue;
  }

  private checkAlertThresholds(entry: AnalyticsLogEntry): void {
    // Real-time threshold checking
    if (
      entry.level >= LogLevel.ERROR &&
      entry.affectedUsers &&
      entry.affectedUsers > this.alertThresholds.affectedUsers
    ) {
      this.generateImmediateAlert(entry);
    }
  }

  private generateImmediateAlert(entry: AnalyticsLogEntry): void {
    console.warn(`🚨 IMMEDIATE ALERT: ${entry.message}`, {
      level: LogLevel[entry.level],
      affectedUsers: entry.affectedUsers,
      errorType: entry.errorType,
      timestamp: entry.timestamp.toISOString(),
    });
  }
}

export default AdvancedAnalyticsLogger;
