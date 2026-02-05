#!/usr/bin/env bun

/**
 * 🔍 Pattern Weaver Observability & Monitoring System
 * Advanced monitoring for Pattern Weaver performance and behavior
 */

import { EventEmitter } from 'events';
import {
  patternWeaver,
  PatternMetrics,
  PatternConnection,
} from '../patterns/pattern-weaver-integration';

export interface PatternAlert {
  id: string;
  pattern: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metrics: PatternMetrics;
  threshold: {
    type: 'execution_time' | 'cache_miss_rate' | 'connection_strength' | 'memory_usage';
    value: number;
    limit: number;
  };
}

export interface PatternHealthCheck {
  pattern: string;
  status: 'healthy' | 'degraded' | 'critical';
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
  lastCheck: Date;
}

export interface PatternTrend {
  pattern: string;
  metric: 'execution_time' | 'cache_hit_rate' | 'connections';
  values: { timestamp: Date; value: number }[];
  trend: 'improving' | 'stable' | 'degrading';
  prediction: number; // Predicted next value
}

/**
 * Advanced Pattern Observability System
 */
export class PatternObservabilitySystem extends EventEmitter {
  private alerts: Map<string, PatternAlert> = new Map();
  private healthChecks: Map<string, PatternHealthCheck> = new Map();
  private trends: Map<string, PatternTrend[]> = new Map();
  private monitoringInterval: Timer | null = null;
  private performanceThresholds = {
    execution_time: 10_000_000, // 10ms in nanoseconds
    cache_miss_rate: 0.1, // 10%
    connection_strength: 0.5, // Minimum strength
    memory_usage: 100 * 1024 * 1024, // 100MB
  };

  constructor() {
    super();
    this.initializeMonitoring();
  }

  /**
   * Initialize continuous monitoring
   */
  private initializeMonitoring(): void {
    // Monitor pattern performance every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
      this.detectAnomalies();
      this.updateTrends();
    }, 30_000);

    // Listen for pattern events
    patternWeaver.on('pattern:executed', data => {
      this.recordPatternExecution(data.pattern, data.duration, data.success);
    });

    patternWeaver.on('patterns:weaved', data => {
      this.recordPatternWeaving(data.patterns, data.duration, data.connectionCount);
    });

    patternWeaver.on('pattern:error', data => {
      this.createAlert(
        data.pattern,
        'critical',
        `Pattern execution failed: ${data.error.message}`,
        {
          type: 'execution_time',
          value: 0,
          limit: 0,
        }
      );
    });
  }

  /**
   * Perform comprehensive health checks on all patterns
   */
  private performHealthChecks(): void {
    const allMetrics = patternWeaver.getMetrics() as Map<string, PatternMetrics>;

    allMetrics.forEach((metrics, patternName) => {
      const healthCheck = this.evaluatePatternHealth(patternName, metrics);
      this.healthChecks.set(patternName, healthCheck);

      // Emit health status changes
      this.emit('health:checked', {
        pattern: patternName,
        health: healthCheck,
      });

      // Create alerts for critical health issues
      if (healthCheck.status === 'critical') {
        this.createAlert(
          patternName,
          'critical',
          `Pattern health is critical: ${healthCheck.issues.join(', ')}`,
          {
            type: 'execution_time',
            value: metrics.executionTime,
            limit: this.performanceThresholds.execution_time,
          }
        );
      }
    });
  }

  /**
   * Evaluate individual pattern health
   */
  private evaluatePatternHealth(patternName: string, metrics: PatternMetrics): PatternHealthCheck {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check execution time
    const avgExecutionTime =
      metrics.executionTime / Math.max(1, metrics.cacheHits + metrics.cacheMisses);
    if (avgExecutionTime > this.performanceThresholds.execution_time) {
      issues.push('High execution time');
      recommendations.push('Consider optimizing pattern logic or caching');
      score -= 20;
    }

    // Check cache efficiency
    const totalRequests = metrics.cacheHits + metrics.cacheMisses;
    const cacheMissRate = totalRequests > 0 ? metrics.cacheMisses / totalRequests : 0;
    if (cacheMissRate > this.performanceThresholds.cache_miss_rate) {
      issues.push('High cache miss rate');
      recommendations.push('Review caching strategy');
      score -= 15;
    }

    // Check connection health
    const connections = patternWeaver.getConnections(patternName);
    const weakConnections = connections.filter(
      c => c.strength < this.performanceThresholds.connection_strength
    );
    if (weakConnections.length > connections.length * 0.5) {
      issues.push('Weak pattern connections');
      recommendations.push('Strengthen pattern relationships');
      score -= 10;
    }

    // Check memory usage
    if (metrics.memoryUsed > this.performanceThresholds.memory_usage) {
      issues.push('High memory usage');
      recommendations.push('Optimize memory allocation');
      score -= 25;
    }

    let status: 'healthy' | 'degraded' | 'critical';
    if (score >= 80) status = 'healthy';
    else if (score >= 60) status = 'degraded';
    else status = 'critical';

    return {
      pattern: patternName,
      status,
      score: Math.max(0, score),
      issues,
      recommendations,
      lastCheck: new Date(),
    };
  }

  /**
   * Detect performance anomalies
   */
  private detectAnomalies(): void {
    const allMetrics = patternWeaver.getMetrics() as Map<string, PatternMetrics>;

    allMetrics.forEach((metrics, patternName) => {
      const trends = this.trends.get(patternName) || [];

      // Detect execution time spikes
      const executionTrend = trends.find(t => t.metric === 'execution_time');
      if (executionTrend && executionTrend.values.length > 5) {
        const recent = executionTrend.values.slice(-3);
        const baseline = executionTrend.values.slice(0, -3);

        const recentAvg = recent.reduce((sum, v) => sum + v.value, 0) / recent.length;
        const baselineAvg = baseline.reduce((sum, v) => sum + v.value, 0) / baseline.length;

        // Alert if recent performance is 50% worse than baseline
        if (recentAvg > baselineAvg * 1.5) {
          this.createAlert(
            patternName,
            'warning',
            `Performance degradation detected: ${(((recentAvg - baselineAvg) / baselineAvg) * 100).toFixed(1)}% slower`,
            {
              type: 'execution_time',
              value: recentAvg,
              limit: baselineAvg * 1.5,
            }
          );
        }
      }
    });
  }

  /**
   * Update performance trends
   */
  private updateTrends(): void {
    const allMetrics = patternWeaver.getMetrics() as Map<string, PatternMetrics>;
    const now = new Date();

    allMetrics.forEach((metrics, patternName) => {
      let patternTrends = this.trends.get(patternName) || [];

      // Update execution time trend
      let executionTrend = patternTrends.find(t => t.metric === 'execution_time');
      if (!executionTrend) {
        executionTrend = {
          pattern: patternName,
          metric: 'execution_time',
          values: [],
          trend: 'stable',
          prediction: 0,
        };
        patternTrends.push(executionTrend);
      }

      const totalRequests = metrics.cacheHits + metrics.cacheMisses;
      const avgExecutionTime = totalRequests > 0 ? metrics.executionTime / totalRequests : 0;

      executionTrend.values.push({ timestamp: now, value: avgExecutionTime });

      // Keep only last 20 values
      if (executionTrend.values.length > 20) {
        executionTrend.values = executionTrend.values.slice(-20);
      }

      // Calculate trend direction
      if (executionTrend.values.length >= 5) {
        const recent = executionTrend.values.slice(-3).reduce((sum, v) => sum + v.value, 0) / 3;
        const older = executionTrend.values.slice(-8, -5).reduce((sum, v) => sum + v.value, 0) / 3;

        if (recent < older * 0.9) {
          executionTrend.trend = 'improving';
        } else if (recent > older * 1.1) {
          executionTrend.trend = 'degrading';
        } else {
          executionTrend.trend = 'stable';
        }

        // Simple linear prediction
        const slope = (recent - older) / 5;
        executionTrend.prediction = recent + slope * 3; // Predict 3 periods ahead
      }

      // Update cache hit rate trend
      let cacheHitTrend = patternTrends.find(t => t.metric === 'cache_hit_rate');
      if (!cacheHitTrend) {
        cacheHitTrend = {
          pattern: patternName,
          metric: 'cache_hit_rate',
          values: [],
          trend: 'stable',
          prediction: 0,
        };
        patternTrends.push(cacheHitTrend);
      }

      const cacheHitRate = totalRequests > 0 ? metrics.cacheHits / totalRequests : 0;
      cacheHitTrend.values.push({ timestamp: now, value: cacheHitRate });

      if (cacheHitTrend.values.length > 20) {
        cacheHitTrend.values = cacheHitTrend.values.slice(-20);
      }

      this.trends.set(patternName, patternTrends);
    });
  }

  /**
   * Create and manage alerts
   */
  private createAlert(
    pattern: string,
    severity: 'info' | 'warning' | 'critical',
    message: string,
    threshold: PatternAlert['threshold']
  ): void {
    const alertId = `${pattern}-${Date.now()}`;
    const metrics = (patternWeaver.getMetrics() as Map<string, PatternMetrics>).get(pattern) || {
      executionTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      connectionsFormed: 0,
      memoryUsed: 0,
    };

    const alert: PatternAlert = {
      id: alertId,
      pattern,
      severity,
      message,
      timestamp: new Date(),
      metrics,
      threshold,
    };

    this.alerts.set(alertId, alert);

    // Emit alert event
    this.emit('alert:created', alert);

    // Auto-resolve info alerts after 5 minutes
    if (severity === 'info') {
      setTimeout(
        () => {
          this.alerts.delete(alertId);
          this.emit('alert:resolved', alertId);
        },
        5 * 60 * 1000
      );
    }
  }

  /**
   * Record pattern execution for monitoring
   */
  private recordPatternExecution(pattern: string, duration: number, success: boolean): void {
    if (!success) return; // Errors are handled separately

    // Check for performance alerts
    if (duration > this.performanceThresholds.execution_time) {
      this.createAlert(
        pattern,
        'warning',
        `Slow execution: ${(duration / 1_000_000).toFixed(2)}ms`,
        {
          type: 'execution_time',
          value: duration,
          limit: this.performanceThresholds.execution_time,
        }
      );
    }

    this.emit('pattern:monitored', {
      pattern,
      duration,
      durationMs: duration / 1_000_000,
    });
  }

  /**
   * Record pattern weaving events
   */
  private recordPatternWeaving(
    patterns: string[],
    duration: number,
    connectionCount: number
  ): void {
    this.emit('weaving:monitored', {
      patterns,
      duration,
      connectionCount,
      efficiency: connectionCount / patterns.length, // Connections per pattern
    });
  }

  /**
   * Get current health status
   */
  getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'critical';
    patterns: PatternHealthCheck[];
    summary: {
      healthy: number;
      degraded: number;
      critical: number;
      totalScore: number;
    };
  } {
    const patterns = Array.from(this.healthChecks.values());
    const healthy = patterns.filter(p => p.status === 'healthy').length;
    const degraded = patterns.filter(p => p.status === 'degraded').length;
    const critical = patterns.filter(p => p.status === 'critical').length;
    const totalScore = patterns.reduce((sum, p) => sum + p.score, 0) / patterns.length || 0;

    let overall: 'healthy' | 'degraded' | 'critical';
    if (critical > 0) overall = 'critical';
    else if (degraded > patterns.length * 0.3) overall = 'degraded';
    else overall = 'healthy';

    return {
      overall,
      patterns,
      summary: { healthy, degraded, critical, totalScore },
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PatternAlert[] {
    return Array.from(this.alerts.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Get performance trends
   */
  getTrends(patternName?: string): PatternTrend[] {
    if (patternName) {
      return this.trends.get(patternName) || [];
    }

    return Array.from(this.trends.values()).flat();
  }

  /**
   * Generate comprehensive monitoring report
   */
  generateReport(): {
    timestamp: Date;
    health: ReturnType<typeof this.getHealthStatus>;
    alerts: PatternAlert[];
    trends: PatternTrend[];
    recommendations: string[];
    metrics: {
      totalPatterns: number;
      totalExecutionTime: number;
      totalCacheHits: number;
      totalCacheMisses: number;
      cacheEfficiency: number;
      averageExecutionTime: number;
    };
  } {
    const health = this.getHealthStatus();
    const alerts = this.getActiveAlerts();
    const trends = this.getTrends();
    const allMetrics = patternWeaver.getMetrics() as Map<string, PatternMetrics>;

    const totalExecutionTime = Array.from(allMetrics.values()).reduce(
      (sum, m) => sum + m.executionTime,
      0
    );
    const totalCacheHits = Array.from(allMetrics.values()).reduce((sum, m) => sum + m.cacheHits, 0);
    const totalCacheMisses = Array.from(allMetrics.values()).reduce(
      (sum, m) => sum + m.cacheMisses,
      0
    );
    const totalRequests = totalCacheHits + totalCacheMisses;

    // Generate recommendations based on current state
    const recommendations: string[] = [];

    if (health.summary.critical > 0) {
      recommendations.push('🔴 Address critical pattern health issues immediately');
    }

    if (totalRequests > 0 && totalCacheMisses / totalRequests > 0.2) {
      recommendations.push('📈 Consider improving caching strategies - high miss rate detected');
    }

    if (alerts.filter(a => a.severity === 'warning').length > 5) {
      recommendations.push('⚠️ Multiple performance warnings - consider system optimization');
    }

    const degradingTrends = trends.filter(t => t.trend === 'degrading').length;
    if (degradingTrends > trends.length * 0.3) {
      recommendations.push('📉 Multiple patterns showing performance degradation');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System is performing well - continue monitoring');
    }

    return {
      timestamp: new Date(),
      health,
      alerts,
      trends,
      recommendations,
      metrics: {
        totalPatterns: allMetrics.size,
        totalExecutionTime,
        totalCacheHits,
        totalCacheMisses,
        cacheEfficiency: totalRequests > 0 ? (totalCacheHits / totalRequests) * 100 : 0,
        averageExecutionTime: totalRequests > 0 ? totalExecutionTime / totalRequests : 0,
      },
    };
  }

  /**
   * Cleanup monitoring resources
   */
  cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.alerts.clear();
    this.healthChecks.clear();
    this.trends.clear();
    this.removeAllListeners();
  }
}

/**
 * Singleton instance for application-wide monitoring
 */
export const patternObservability = new PatternObservabilitySystem();

/**
 * Export for dashboard integration
 */
export default patternObservability;
