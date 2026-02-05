/**
 * Response Time Distribution Tracker
 * High-performance monitoring using Bun's nanosecond precision
 */

export class ResponseTimeDistribution {
  private buckets: Map<number, number>;
  private measurements: number[];
  private maxMeasurements: number;
  private bucketRanges: number[];

  // Statistics cache
  private stats: {
    count: number;
    min: number;
    max: number;
    mean: number;
    median: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    p999: number;
    stdDev: number;
    lastUpdated: number;
  };

  constructor(maxMeasurements = 10000) {
    this.maxMeasurements = maxMeasurements;
    this.measurements = [];

    // Define histogram buckets (in milliseconds)
    this.bucketRanges = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, Infinity];

    this.buckets = new Map();
    this.bucketRanges.forEach(range => this.buckets.set(range, 0));

    this.stats = this.getEmptyStats();
  }

  /**
   * Record a response time measurement using Bun's nanosecond precision
   */
  record(startNanos: bigint, endNanos: bigint): void {
    const durationMs = Number(endNanos - startNanos) / 1_000_000;
    this.recordMs(durationMs);
  }

  /**
   * Record a response time in milliseconds
   */
  recordMs(durationMs: number): void {
    // Add to measurements array (rolling window)
    this.measurements.push(durationMs);
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift();
    }

    // Update histogram buckets
    for (let i = 0; i < this.bucketRanges.length - 1; i++) {
      if (durationMs >= this.bucketRanges[i] && durationMs < this.bucketRanges[i + 1]) {
        this.buckets.set(this.bucketRanges[i], this.buckets.get(this.bucketRanges[i])! + 1);
        break;
      }
    }

    // Mark stats as needing update
    this.stats.lastUpdated = 0;
  }

  /**
   * Calculate percentile from measurements
   */
  private calculatePercentile(percentile: number): number {
    if (this.measurements.length === 0) return 0;

    const sorted = [...this.measurements].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(mean: number): number {
    if (this.measurements.length === 0) return 0;

    const squaredDiffs = this.measurements.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((sum, value) => sum + value, 0) / this.measurements.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Get empty stats object
   */
  private getEmptyStats() {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      p999: 0,
      stdDev: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get current statistics
   */
  getStats() {
    // Return cached stats if recent
    if (Date.now() - this.stats.lastUpdated < 100) {
      return this.stats;
    }

    if (this.measurements.length === 0) {
      return this.getEmptyStats();
    }

    const sum = this.measurements.reduce((a, b) => a + b, 0);
    const mean = sum / this.measurements.length;

    this.stats = {
      count: this.measurements.length,
      min: Math.min(...this.measurements),
      max: Math.max(...this.measurements),
      mean: mean,
      median: this.calculatePercentile(50),
      p50: this.calculatePercentile(50),
      p75: this.calculatePercentile(75),
      p90: this.calculatePercentile(90),
      p95: this.calculatePercentile(95),
      p99: this.calculatePercentile(99),
      p999: this.calculatePercentile(99.9),
      stdDev: this.calculateStdDev(mean),
      lastUpdated: Date.now(),
    };

    return this.stats;
  }

  /**
   * Get histogram data for visualization
   */
  getHistogram() {
    const histogram = [];

    for (let i = 0; i < this.bucketRanges.length - 1; i++) {
      const rangeStart = this.bucketRanges[i];
      const rangeEnd = this.bucketRanges[i + 1];
      const count = this.buckets.get(rangeStart) || 0;

      histogram.push({
        range: rangeEnd === Infinity ? `>${rangeStart}ms` : `${rangeStart}-${rangeEnd}ms`,
        rangeStart,
        rangeEnd,
        count,
        percentage: this.measurements.length > 0 ? (count / this.measurements.length) * 100 : 0,
      });
    }

    return histogram;
  }

  /**
   * Get distribution summary
   */
  getDistribution() {
    const stats = this.getStats();
    const histogram = this.getHistogram();

    return {
      stats,
      histogram,
      summary: {
        fast: histogram.filter(h => h.rangeStart < 100).reduce((sum, h) => sum + h.count, 0),
        medium: histogram
          .filter(h => h.rangeStart >= 100 && h.rangeStart < 1000)
          .reduce((sum, h) => sum + h.count, 0),
        slow: histogram.filter(h => h.rangeStart >= 1000).reduce((sum, h) => sum + h.count, 0),
        totalRequests: stats.count,
      },
    };
  }

  /**
   * Clear all measurements
   */
  clear() {
    this.measurements = [];
    this.buckets.forEach((_, key) => this.buckets.set(key, 0));
    this.stats = this.getEmptyStats();
  }

  /**
   * Export measurements for analysis
   */
  exportMeasurements() {
    return {
      measurements: [...this.measurements],
      timestamp: Date.now(),
      stats: this.getStats(),
      histogram: this.getHistogram(),
    };
  }
}

/**
 * Response Time Monitor - Tracks multiple endpoints
 */
export class ResponseTimeMonitor {
  private distributions: Map<string, ResponseTimeDistribution>;
  private globalDistribution: ResponseTimeDistribution;
  private alerts: Array<{
    endpoint: string;
    message: string;
    timestamp: number;
    severity: 'warning' | 'critical';
  }>;

  // Alert thresholds (in ms)
  private thresholds = {
    warning: {
      p95: 1000,
      p99: 2000,
    },
    critical: {
      p95: 2000,
      p99: 5000,
    },
  };

  constructor() {
    this.distributions = new Map();
    this.globalDistribution = new ResponseTimeDistribution();
    this.alerts = [];
  }

  /**
   * Start timing a request
   */
  startTiming(): bigint {
    return Bun.nanoseconds();
  }

  /**
   * End timing and record the result
   */
  endTiming(endpoint: string, startNanos: bigint): number {
    const endNanos = Bun.nanoseconds();
    const durationMs = Number(endNanos - startNanos) / 1_000_000;

    // Get or create distribution for this endpoint
    if (!this.distributions.has(endpoint)) {
      this.distributions.set(endpoint, new ResponseTimeDistribution());
    }

    // Record in both endpoint-specific and global distributions
    this.distributions.get(endpoint)!.recordMs(durationMs);
    this.globalDistribution.recordMs(durationMs);

    // Check for alerts
    this.checkAlerts(endpoint);

    return durationMs;
  }

  /**
   * Check if alerts should be triggered
   */
  private checkAlerts(endpoint: string) {
    const distribution = this.distributions.get(endpoint);
    if (!distribution) return;

    const stats = distribution.getStats();

    // Check critical thresholds
    if (stats.p95 > this.thresholds.critical.p95) {
      this.addAlert(
        endpoint,
        `P95 response time (${stats.p95.toFixed(2)}ms) exceeds critical threshold`,
        'critical'
      );
    } else if (stats.p95 > this.thresholds.warning.p95) {
      this.addAlert(
        endpoint,
        `P95 response time (${stats.p95.toFixed(2)}ms) exceeds warning threshold`,
        'warning'
      );
    }

    if (stats.p99 > this.thresholds.critical.p99) {
      this.addAlert(
        endpoint,
        `P99 response time (${stats.p99.toFixed(2)}ms) exceeds critical threshold`,
        'critical'
      );
    } else if (stats.p99 > this.thresholds.warning.p99) {
      this.addAlert(
        endpoint,
        `P99 response time (${stats.p99.toFixed(2)}ms) exceeds warning threshold`,
        'warning'
      );
    }
  }

  /**
   * Add an alert
   */
  private addAlert(endpoint: string, message: string, severity: 'warning' | 'critical') {
    // Prevent duplicate alerts within 5 minutes
    const recentAlert = this.alerts.find(
      a =>
        a.endpoint === endpoint && a.message === message && Date.now() - a.timestamp < 5 * 60 * 1000
    );

    if (!recentAlert) {
      this.alerts.push({
        endpoint,
        message,
        timestamp: Date.now(),
        severity,
      });

      // Keep only last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }
    }
  }

  /**
   * Get statistics for a specific endpoint
   */
  getEndpointStats(endpoint: string) {
    const distribution = this.distributions.get(endpoint);
    if (!distribution) {
      return null;
    }

    return distribution.getDistribution();
  }

  /**
   * Get global statistics
   */
  getGlobalStats() {
    return this.globalDistribution.getDistribution();
  }

  /**
   * Get all endpoint statistics
   */
  getAllStats() {
    const endpoints: Record<string, any> = {};

    this.distributions.forEach((distribution, endpoint) => {
      endpoints[endpoint] = distribution.getDistribution();
    });

    return {
      global: this.globalDistribution.getDistribution(),
      endpoints,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      summary: {
        totalEndpoints: this.distributions.size,
        totalRequests: this.globalDistribution.getStats().count,
        averageResponseTime: this.globalDistribution.getStats().mean,
        activeAlerts: this.alerts.filter(a => Date.now() - a.timestamp < 5 * 60 * 1000).length,
      },
    };
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit = 10) {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear all data
   */
  clear() {
    this.distributions.clear();
    this.globalDistribution.clear();
    this.alerts = [];
  }

  /**
   * Set custom alert thresholds
   */
  setThresholds(warning: { p95: number; p99: number }, critical: { p95: number; p99: number }) {
    this.thresholds = { warning, critical };
  }
}

// Singleton instance
export const responseTimeMonitor = new ResponseTimeMonitor();
