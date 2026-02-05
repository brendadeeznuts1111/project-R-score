#!/usr/bin/env bun

import { SelfHealMetricsCollector } from '../src/metrics/self-heal-metrics';

/**
 * Enhanced Time Series Aggregator with ML Integration
 */
export interface TimeSeriesMetric {
  timestamp: string;
  value: number;
  agentId?: string;
  containerId?: string;
  metricType: string;
  scope: string;
}

export interface Anomaly {
  timestamp: string;
  value: number;
  expected: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: string;
  recommendations: string[];
  agentId?: string;
  containerId?: string;
}

export interface AggregationWindow {
  windowStart: string;
  windowEnd: string;
  aggregation: {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    stdDev: number;
    trend: 'up' | 'down' | 'stable';
  };
  anomalies: Anomaly[];
  agents: string[];
  containers: string[];
}

export class TimeSeriesAggregator {
  private metrics: TimeSeriesMetric[] = [];
  private metricsCollector: SelfHealMetricsCollector;
  private readonly MAX_METRICS = 10000;

  constructor() {
    this.metricsCollector = new SelfHealMetricsCollector();
  }

  /**
   * Add a new metric to the time series
   */
  async addMetric(metric: TimeSeriesMetric): Promise<void> {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS / 2);
    }

    // Track with metrics collector
    await this.metricsCollector.startOperation('aggregate', 'find');
    await this.metricsCollector.completeOperation(Date.now().toString(), true);
  }

  /**
   * Aggregate metrics by time window
   */
  async aggregateMetrics(
    scope: string,
    windowSize: string,
    options: {
      startTime?: string;
      endTime?: string;
    } = {}
  ): Promise<AggregationWindow[]> {
    const now = new Date();
    const windowMs = this.parseWindowSize(windowSize);
    const endTime = options.endTime ? new Date(options.endTime) : now;
    const startTime = options.startTime ? new Date(options.startTime) : new Date(endTime.getTime() - windowMs * 10);

    // Filter metrics by scope and time range
    const filteredMetrics = this.metrics.filter(m => 
      m.scope === scope && 
      new Date(m.timestamp) >= startTime && 
      new Date(m.timestamp) <= endTime
    );

    if (filteredMetrics.length === 0) {
      return [];
    }

    // Group by time windows
    const windows = new Map<string, TimeSeriesMetric[]>();
    
    filteredMetrics.forEach(metric => {
      const metricTime = new Date(metric.timestamp);
      const windowStart = new Date(Math.floor(metricTime.getTime() / windowMs) * windowMs);
      const windowKey = windowStart.toISOString();
      
      if (!windows.has(windowKey)) {
        windows.set(windowKey, []);
      }
      windows.get(windowKey)!.push(metric);
    });

    // Generate aggregations
    const aggregations: AggregationWindow[] = [];
    
    for (const [windowStart, windowMetrics] of windows) {
      const windowEnd = new Date(new Date(windowStart).getTime() + windowMs);
      
      const values = windowMetrics.map(m => m.value);
      const aggregation = this.calculateAggregation(values);
      
      // Detect anomalies
      const anomalies = await this.detectAnomalies(windowMetrics, aggregation);
      
      // Extract unique agents and containers
      const agents = [...new Set(windowMetrics.map(m => m.agentId).filter(Boolean))];
      const containers = [...new Set(windowMetrics.map(m => m.containerId).filter(Boolean))];

      aggregations.push({
        windowStart,
        windowEnd: windowEnd.toISOString(),
        aggregation,
        anomalies,
        agents,
        containers
      });
    }

    return aggregations.sort((a, b) => 
      new Date(a.windowStart).getTime() - new Date(b.windowStart).getTime()
    );
  }

  /**
   * Calculate aggregation statistics
   */
  private calculateAggregation(values: number[]): AggregationWindow['aggregation'] {
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        stdDev: 0,
        trend: 'stable'
      };
    }

    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate standard deviation
    const variance = values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    // Determine trend (simplified)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (values.length >= 3) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const difference = (secondAvg - firstAvg) / firstAvg;
      if (difference > 0.1) trend = 'up';
      else if (difference < -0.1) trend = 'down';
    }

    return { count, sum, avg, min, max, stdDev, trend };
  }

  /**
   * Detect anomalies in metrics
   */
  private async detectAnomalies(
    metrics: TimeSeriesMetric[],
    aggregation: AggregationWindow['aggregation']
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    for (const metric of metrics) {
      const zScore = Math.abs((metric.value - aggregation.avg) / aggregation.stdDev);
      
      if (zScore > 2) { // Simple threshold for anomaly detection
        const severity = this.calculateSeverity(zScore, metric.value);
        const pattern = this.detectPattern(metric, aggregation);
        const recommendations = this.generateRecommendations(pattern, severity);
        
        anomalies.push({
          timestamp: metric.timestamp,
          value: metric.value,
          expected: aggregation.avg,
          deviation: zScore,
          severity,
          pattern,
          recommendations,
          agentId: metric.agentId,
          containerId: metric.containerId
        });
      }
    }
    
    return anomalies;
  }

  /**
   * Calculate anomaly severity
   */
  private calculateSeverity(zScore: number, value: number): Anomaly['severity'] {
    if (zScore > 4) return 'critical';
    if (zScore > 3) return 'high';
    if (zScore > 2.5) return 'medium';
    return 'low';
  }

  /**
   * Detect pattern in anomaly
   */
  private detectPattern(metric: TimeSeriesMetric, aggregation: AggregationWindow['aggregation']): string {
    const value = metric.value;
    const avg = aggregation.avg;
    
    if (value > avg * 2) return 'spike';
    if (value < avg * 0.5) return 'drop';
    if (aggregation.trend === 'up') return 'gradual_increase';
    if (aggregation.trend === 'down') return 'gradual_decrease';
    if (aggregation.stdDev > aggregation.avg * 0.3) return 'volatile';
    
    return 'deviation';
  }

  /**
   * Generate recommendations for anomaly
   */
  private generateRecommendations(pattern: string, severity: Anomaly['severity']): string[] {
    const baseRecommendations = [
      'Monitor the metric for continued anomalies',
      'Check system logs for related errors',
      'Consider adjusting alert thresholds'
    ];

    const patternSpecific: Record<string, string[]> = {
      spike: [
        'Check for resource contention',
        'Investigate sudden load increases',
        'Consider auto-scaling triggers'
      ],
      drop: [
        'Verify service connectivity',
        'Check for service failures',
        'Review recent deployments'
      ],
      gradual_increase: [
        'Plan for capacity expansion',
        'Investigate memory leaks',
        'Review resource utilization trends'
      ],
      volatile: [
        'Stabilize system load',
        'Implement smoothing algorithms',
        'Review configuration settings'
      ]
    };

    const severitySpecific: Record<Anomaly['severity'], string[]> = {
      critical: [
        'Immediate investigation required',
        'Consider service restart',
        'Escalate to on-call team'
      ],
      high: [
        'Investigate within 1 hour',
        'Prepare rollback plan',
        'Monitor closely'
      ],
      medium: [
        'Investigate within 4 hours',
        'Document findings',
        'Review trends'
      ],
      low: [
        'Monitor for patterns',
        'Log for analysis',
        'Review in daily standup'
      ]
    };

    return [
      ...baseRecommendations,
      ...(patternSpecific[pattern] || []),
      ...(severitySpecific[severity] || [])
    ].slice(0, 5);
  }

  /**
   * Parse window size string to milliseconds
   */
  private parseWindowSize(windowSize: string): number {
    const units: Record<string, number> = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    const match = windowSize.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid window size format: ${windowSize}`);
    }

    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }

  /**
   * Predict resource requirements based on trends
   */
  async predictResourceRequirements(
    scope: string,
    timeHorizon: string
  ): Promise<{
    cpu: { current: number; required: number; recommendation: string };
    memory: { current: number; required: number; recommendation: string };
    containers: { current: number; required: number; recommendation: string };
  }> {
    const aggregations = await this.aggregateMetrics(scope, '1h', {
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });

    if (aggregations.length === 0) {
      return {
        cpu: { current: 0, required: 0, recommendation: 'No data available' },
        memory: { current: 0, required: 0, recommendation: 'No data available' },
        containers: { current: 0, required: 0, recommendation: 'No data available' }
      };
    }

    // Calculate current averages
    const recentAggregations = aggregations.slice(-6); // Last 6 hours
    const currentCpu = recentAggregations.reduce((sum, a) => sum + a.aggregation.avg, 0) / recentAggregations.length;
    const currentMemory = currentCpu * 0.8; // Simplified relationship
    const currentContainers = new Set(recentAggregations.flatMap(a => a.containers)).size;

    // Predict based on trends
    const trendMultiplier = this.calculateTrendMultiplier(recentAggregations);
    const horizonMultiplier = this.parseTimeHorizonMultiplier(timeHorizon);

    const predictedCpu = currentCpu * trendMultiplier * horizonMultiplier;
    const predictedMemory = predictedCpu * 0.8;
    const predictedContainers = Math.ceil(currentContainers * (1 + (trendMultiplier - 1) * 0.5));

    return {
      cpu: {
        current: currentCpu,
        required: predictedCpu,
        recommendation: predictedCpu > currentCpu * 1.3 ? 
          'Scale up CPU resources' : 'Current CPU allocation adequate'
      },
      memory: {
        current: currentMemory,
        required: predictedMemory,
        recommendation: predictedMemory > currentMemory * 1.3 ? 
          'Scale up memory resources' : 'Current memory allocation adequate'
      },
      containers: {
        current: currentContainers,
        required: predictedContainers,
        recommendation: predictedContainers > currentContainers ? 
          'Add more containers' : 'Current container count adequate'
      }
    };
  }

  /**
   * Calculate trend multiplier for predictions
   */
  private calculateTrendMultiplier(aggregations: AggregationWindow[]): number {
    if (aggregations.length < 3) return 1.0;

    const values = aggregations.map(a => a.aggregation.avg);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    return secondAvg / firstAvg;
  }

  /**
   * Parse time horizon to multiplier
   */
  private parseTimeHorizonMultiplier(horizon: string): number {
    const multipliers: Record<string, number> = {
      '1h': 1.0,
      '6h': 1.1,
      '12h': 1.15,
      '1d': 1.2,
      '3d': 1.3,
      '1w': 1.5
    };

    return multipliers[horizon] || 1.2;
  }

  /**
   * Get metrics for ML analysis
   */
  async getMasterPerfMetrics(
    scope: string,
    options: {
      startTime?: string;
      endTime?: string;
      category?: string;
    } = {}
  ): Promise<TimeSeriesMetric[]> {
    const startTime = options.startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endTime = options.endTime || new Date().toISOString();

    return this.metrics.filter(m => 
      m.scope === scope &&
      new Date(m.timestamp) >= new Date(startTime) &&
      new Date(m.timestamp) <= new Date(endTime)
    );
  }

  /**
   * Get system metrics for dashboard
   */
  async getSystemMetrics(): Promise<any> {
    return await this.metricsCollector.collectSystemMetrics();
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.metricsCollector.reset();
  }

  /**
   * Get metrics count
   */
  getMetricsCount(): number {
    return this.metrics.length;
  }
}
