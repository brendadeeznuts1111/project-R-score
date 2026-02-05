#!/usr/bin/env bun

import { custom as inspectCustom } from 'bun:inspect';

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface AggregationWindow {
  start: string;
  end: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
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

  [inspectCustom]: () => string;
}

export class TimeSeriesAggregator {
  private data: Map<string, TimeSeriesDataPoint[]> = new Map();
  private anomalies: Anomaly[] = [];

  /**
   * Add data point to time series
   */
  addDataPoint(series: string, point: TimeSeriesDataPoint): void {
    if (!this.data.has(series)) {
      this.data.set(series, []);
    }

    const seriesData = this.data.get(series)!;
    seriesData.push(point);

    // Keep only last 1000 points per series
    if (seriesData.length > 1000) {
      seriesData.shift();
    }
  }

  /**
   * Aggregate data over a time window
   */
  aggregate(series: string, windowMs: number, startTime?: string): AggregationWindow | null {
    const seriesData = this.data.get(series);
    if (!seriesData || seriesData.length === 0) {
      return null;
    }

    const now = startTime ? new Date(startTime).getTime() : Date.now();
    const windowStart = now - windowMs;

    const windowData = seriesData.filter(point =>
      new Date(point.timestamp).getTime() >= windowStart
    );

    if (windowData.length === 0) {
      return null;
    }

    const values = windowData.map(p => p.value).sort((a, b) => a - b);

    return {
      start: new Date(windowStart).toISOString(),
      end: new Date(now).toISOString(),
      count: values.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)]
    };
  }

  /**
   * Detect anomalies in time series
   */
  detectAnomalies(series: string, windowMs: number = 300000): Anomaly[] { // 5 minutes
    const seriesData = this.data.get(series);
    if (!seriesData || seriesData.length < 10) {
      return [];
    }

    const recent = seriesData.slice(-20); // Last 20 points
    const values = recent.map(p => p.value);

    // Simple anomaly detection based on standard deviation
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const threshold = 2 * stdDev; // 2 standard deviations

    const newAnomalies: Anomaly[] = [];

    recent.forEach((point, index) => {
      const deviation = Math.abs(point.value - mean);

      if (deviation > threshold) {
        const severity = deviation > threshold * 2 ? 'critical' :
                        deviation > threshold * 1.5 ? 'high' :
                        deviation > threshold * 1.2 ? 'medium' : 'low';

        const anomaly: Anomaly = {
          timestamp: point.timestamp,
          value: point.value,
          expected: mean,
          deviation: deviation / mean,
          severity,
          pattern: 'statistical_outlier',
          recommendations: [
            `Value ${point.value} deviates from mean ${mean.toFixed(2)}`,
            'Check system resources and recent changes',
            'Monitor for pattern recurrence'
          ],
          agentId: point.metadata?.agentId,
          containerId: point.metadata?.containerId,

          [inspectCustom]: function() {
            const color = {
              critical: '\x1b[31m', // Red
              high: '\x1b[31m',     // Red
              medium: '\x1b[33m',   // Yellow
              low: '\x1b[33m'       // Yellow
            }[severity];

            return [
              `${color}[${severity.toUpperCase()}]`.padEnd(12),
              new Date(this.timestamp).toLocaleString().padEnd(20),
              `${this.value.toFixed(2)}`.padStart(8),
              `(expected: ${this.expected.toFixed(2)})`.padStart(15),
              `${(this.deviation * 100).toFixed(1)}%`.padStart(8),
              this.pattern.padEnd(20),
              '\x1b[0m'
            ].join(' | ');
          }
        };

        newAnomalies.push(anomaly);
      }
    });

    // Add to anomalies list
    this.anomalies.push(...newAnomalies);

    // Keep only last 100 anomalies
    if (this.anomalies.length > 100) {
      this.anomalies = this.anomalies.slice(-50);
    }

    return newAnomalies;
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(limit: number = 10): Anomaly[] {
    return this.anomalies.slice(-limit);
  }

  /**
   * Aggregate metrics for virtual device system
   */
  async aggregateMetrics(category: string, window: string, filters: any): Promise<any> {
    // This would integrate with the virtual device system
    // For now, return mock aggregation results

    const mockAggregations = {
      'VIRTUAL_DEVICE': {
        '5m': {
          taskCount: 45,
          avgDuration: 1250,
          successRate: 96.7,
          errorRate: 3.3,
          anomalies: 2
        },
        '1h': {
          taskCount: 180,
          avgDuration: 1180,
          successRate: 97.2,
          errorRate: 2.8,
          anomalies: 5
        }
      }
    };

    return mockAggregations[category]?.[window] || {};
  }

  /**
   * Get time series data for visualization
   */
  getTimeSeriesData(series: string, limit: number = 100): TimeSeriesDataPoint[] {
    const seriesData = this.data.get(series);
    return seriesData ? seriesData.slice(-limit) : [];
  }
}