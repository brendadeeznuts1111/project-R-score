#!/usr/bin/env bun
/**
 * Metrics and Monitoring for Syndicate Analysis System
 * 
 * Tracks system performance, pattern detection metrics, and operational statistics.
 */

// =============================================================================
// METRICS TYPES
// =============================================================================

export interface SystemMetrics {
  timestamp: number;
  patternsDetected: number;
  betsProcessed: number;
  eventsEmitted: number;
  cacheHitRate: number;
  averageProcessingTime: number;
  activeSyndicates: number;
  activePatterns: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

export interface PatternMetrics {
  patternType: string;
  detections: number;
  averageStrength: number;
  averageConfidence: number;
  lastDetected: number;
  syndicatesAffected: number;
}

export interface PerformanceMetrics {
  operation: string;
  count: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
}

// =============================================================================
// METRICS COLLECTOR
// =============================================================================

export class MetricsCollector {
  private patternMetrics: Map<string, PatternMetrics> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();
  private systemMetrics: SystemMetrics[] = [];
  private maxHistorySize: number = 1000;

  // =============================================================================
  // PATTERN METRICS
  // =============================================================================

  recordPatternDetection(
    patternType: string,
    strength: number,
    confidence: number,
    syndicateId: string
  ): void {
    const existing = this.patternMetrics.get(patternType) || {
      patternType,
      detections: 0,
      averageStrength: 0,
      averageConfidence: 0,
      lastDetected: 0,
      syndicatesAffected: 0
    };

    existing.detections++;
    existing.averageStrength = 
      (existing.averageStrength * (existing.detections - 1) + strength) / existing.detections;
    existing.averageConfidence = 
      (existing.averageConfidence * (existing.detections - 1) + confidence) / existing.detections;
    existing.lastDetected = Date.now();
    existing.syndicatesAffected = new Set([
      ...(this.patternMetrics.get(patternType)?.syndicatesAffected ? [syndicateId] : []),
      syndicateId
    ]).size;

    this.patternMetrics.set(patternType, existing);
  }

  getPatternMetrics(patternType?: string): PatternMetrics | Map<string, PatternMetrics> {
    if (patternType) {
      return this.patternMetrics.get(patternType) || {
        patternType,
        detections: 0,
        averageStrength: 0,
        averageConfidence: 0,
        lastDetected: 0,
        syndicatesAffected: 0
      };
    }
    return new Map(this.patternMetrics);
  }

  // =============================================================================
  // PERFORMANCE METRICS
  // =============================================================================

  recordOperation(operation: string, duration: number): void {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }

    const times = this.performanceMetrics.get(operation)!;
    times.push(duration);

    // Keep only recent measurements
    if (times.length > 1000) {
      times.shift();
    }
  }

  getPerformanceMetrics(operation?: string): PerformanceMetrics | Map<string, PerformanceMetrics> {
    if (operation) {
      return this.calculatePerformanceMetrics(operation);
    }

    const result = new Map<string, PerformanceMetrics>();
    this.performanceMetrics.forEach((_, op) => {
      result.set(op, this.calculatePerformanceMetrics(op));
    });
    return result;
  }

  private calculatePerformanceMetrics(operation: string): PerformanceMetrics {
    const times = this.performanceMetrics.get(operation) || [];
    
    if (times.length === 0) {
      return {
        operation,
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p50: 0,
        p95: 0,
        p99: 0
      };
    }

    const sorted = [...times].sort((a, b) => a - b);
    const totalTime = times.reduce((sum, t) => sum + t, 0);
    const averageTime = totalTime / times.length;

    return {
      operation,
      count: times.length,
      totalTime,
      averageTime,
      minTime: sorted[0],
      maxTime: sorted[sorted.length - 1],
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99)
    };
  }

  // =============================================================================
  // SYSTEM METRICS
  // =============================================================================

  recordSystemMetrics(metrics: Partial<SystemMetrics>): void {
    const fullMetrics: SystemMetrics = {
      timestamp: Date.now(),
      patternsDetected: metrics.patternsDetected || 0,
      betsProcessed: metrics.betsProcessed || 0,
      eventsEmitted: metrics.eventsEmitted || 0,
      cacheHitRate: metrics.cacheHitRate || 0,
      averageProcessingTime: metrics.averageProcessingTime || 0,
      activeSyndicates: metrics.activeSyndicates || 0,
      activePatterns: metrics.activePatterns || 0,
      memoryUsage: metrics.memoryUsage || process.memoryUsage()
    };

    this.systemMetrics.push(fullMetrics);

    if (this.systemMetrics.length > this.maxHistorySize) {
      this.systemMetrics.shift();
    }
  }

  getSystemMetrics(count: number = 100): SystemMetrics[] {
    return this.systemMetrics.slice(-count);
  }

  getLatestSystemMetrics(): SystemMetrics | null {
    return this.systemMetrics.length > 0 
      ? this.systemMetrics[this.systemMetrics.length - 1]
      : null;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  reset(): void {
    this.patternMetrics.clear();
    this.performanceMetrics.clear();
    this.systemMetrics = [];
  }

  getSummary(): {
    totalPatternDetections: number;
    totalOperations: number;
    patternTypes: number;
    averageCacheHitRate: number;
  } {
    const totalDetections = Array.from(this.patternMetrics.values())
      .reduce((sum, metrics) => sum + metrics.detections, 0);

    const totalOperations = Array.from(this.performanceMetrics.values())
      .reduce((sum, times) => sum + times.length, 0);

    const avgCacheHitRate = this.systemMetrics.length > 0
      ? this.systemMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / this.systemMetrics.length
      : 0;

    return {
      totalPatternDetections: totalDetections,
      totalOperations,
      patternTypes: this.patternMetrics.size,
      averageCacheHitRate: avgCacheHitRate
    };
  }
}

// Global metrics collector instance
export const metricsCollector = new MetricsCollector();
