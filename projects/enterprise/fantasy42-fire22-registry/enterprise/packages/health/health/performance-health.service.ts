/**
 * Performance Health Service
 * Monitors application performance metrics, response times, and throughput
 */

export class PerformanceHealthService {
  private responseTimes: number[] = [];
  private requestCounts: number[] = [];
  private errorCounts: number[] = [];
  private startTime: number = Date.now();

  constructor() {
    this.initializeMetrics();
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    status: string;
    timestamp: string;
    responseTime: {
      avg: number;
      p50: number;
      p95: number;
      p99: number;
    };
    throughput: {
      requestsPerSecond: number;
      totalRequests: number;
    };
    errorRate: number;
    uptime: number;
  }> {
    const avgResponseTime = this.calculateAverage(this.responseTimes);
    const p50 = this.calculatePercentile(this.responseTimes, 50);
    const p95 = this.calculatePercentile(this.responseTimes, 95);
    const p99 = this.calculatePercentile(this.responseTimes, 99);

    const totalRequests = this.requestCounts.reduce((sum, count) => sum + count, 0);
    const totalErrors = this.errorCounts.reduce((sum, count) => sum + count, 0);
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    const uptime = (Date.now() - this.startTime) / 1000; // seconds
    const requestsPerSecond = uptime > 0 ? totalRequests / uptime : 0;

    // Determine status based on performance thresholds
    let status = 'healthy';
    if (p95 > 1000 || errorRate > 0.05) {
      status = 'degraded';
    }
    if (p95 > 2000 || errorRate > 0.1) {
      status = 'critical';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      responseTime: {
        avg: avgResponseTime,
        p50,
        p95,
        p99,
      },
      throughput: {
        requestsPerSecond,
        totalRequests,
      },
      errorRate,
      uptime,
    };
  }

  /**
   * Get response time metrics
   */
  async getResponseTimeMetrics(): Promise<{
    status: string;
    current: number;
    average: number;
    trend: 'improving' | 'stable' | 'degrading';
    timestamp: string;
  }> {
    const current = this.responseTimes[this.responseTimes.length - 1] || 0;
    const average = this.calculateAverage(this.responseTimes);

    // Calculate trend (simplified)
    const recent = this.responseTimes.slice(-10);
    const older = this.responseTimes.slice(-20, -10);
    const recentAvg = this.calculateAverage(recent);
    const olderAvg = this.calculateAverage(older);

    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (recentAvg < olderAvg * 0.9) {
      trend = 'improving';
    } else if (recentAvg > olderAvg * 1.1) {
      trend = 'degrading';
    }

    let status = 'healthy';
    if (current > 1000) {
      status = 'degraded';
    }
    if (current > 2000) {
      status = 'critical';
    }

    return {
      status,
      current,
      average,
      trend,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get throughput metrics
   */
  async getThroughputMetrics(): Promise<{
    status: string;
    currentRPS: number;
    averageRPS: number;
    peakRPS: number;
    timestamp: string;
  }> {
    const uptime = (Date.now() - this.startTime) / 1000;
    const totalRequests = this.requestCounts.reduce((sum, count) => sum + count, 0);
    const averageRPS = uptime > 0 ? totalRequests / uptime : 0;
    const peakRPS = Math.max(...this.requestCounts);

    // Calculate current RPS (last minute)
    const recentRequests = this.requestCounts.slice(-60).reduce((sum, count) => sum + count, 0);
    const currentRPS = recentRequests / 60;

    let status = 'healthy';
    if (currentRPS > 100) {
      status = 'degraded';
    }
    if (currentRPS > 200) {
      status = 'critical';
    }

    return {
      status,
      currentRPS,
      averageRPS,
      peakRPS,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get error rate metrics
   */
  async getErrorRateMetrics(): Promise<{
    status: string;
    currentRate: number;
    averageRate: number;
    trend: 'improving' | 'stable' | 'degrading';
    timestamp: string;
  }> {
    const totalRequests = this.requestCounts.reduce((sum, count) => sum + count, 0);
    const totalErrors = this.errorCounts.reduce((sum, count) => sum + count, 0);
    const averageRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    // Calculate current error rate (last 100 requests)
    const recentRequests = this.requestCounts.slice(-10).reduce((sum, count) => sum + count, 0);
    const recentErrors = this.errorCounts.slice(-10).reduce((sum, count) => sum + count, 0);
    const currentRate = recentRequests > 0 ? recentErrors / recentRequests : 0;

    // Calculate trend
    const olderRequests = this.requestCounts.slice(-20, -10).reduce((sum, count) => sum + count, 0);
    const olderErrors = this.errorCounts.slice(-20, -10).reduce((sum, count) => sum + count, 0);
    const olderRate = olderRequests > 0 ? olderErrors / olderRequests : 0;

    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (currentRate < olderRate * 0.8) {
      trend = 'improving';
    } else if (currentRate > olderRate * 1.2) {
      trend = 'degrading';
    }

    let status = 'healthy';
    if (currentRate > 0.05) {
      status = 'degraded';
    }
    if (currentRate > 0.1) {
      status = 'critical';
    }

    return {
      status,
      currentRate,
      averageRate,
      trend,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Record performance metrics
   */
  recordMetrics(responseTime: number, success: boolean): void {
    // Record response time
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000); // Keep last 1000
    }

    // Record request and error counts (per minute)
    const currentMinute = Math.floor(Date.now() / 60000);
    if (this.requestCounts.length === 0 || this.requestCounts.length - 1 !== currentMinute) {
      this.requestCounts.push(1);
      this.errorCounts.push(success ? 0 : 1);
    } else {
      this.requestCounts[this.requestCounts.length - 1]++;
      if (!success) {
        this.errorCounts[this.errorCounts.length - 1]++;
      }
    }

    // Keep only last 60 minutes
    if (this.requestCounts.length > 60) {
      this.requestCounts = this.requestCounts.slice(-60);
      this.errorCounts = this.errorCounts.slice(-60);
    }
  }

  /**
   * Get Prometheus-style metrics
   */
  async getPrometheusMetrics(): Promise<string> {
    const metrics = await this.getPerformanceMetrics();

    return `# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_avg ${metrics.responseTime.avg / 1000}
http_request_duration_seconds_p50 ${metrics.responseTime.p50 / 1000}
http_request_duration_seconds_p95 ${metrics.responseTime.p95 / 1000}
http_request_duration_seconds_p99 ${metrics.responseTime.p99 / 1000}

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total ${metrics.throughput.totalRequests}

# HELP http_requests_per_second Current requests per second
# TYPE http_requests_per_second gauge
http_requests_per_second ${metrics.throughput.requestsPerSecond}

# HELP http_error_rate Current error rate
# TYPE http_error_rate gauge
http_error_rate ${metrics.errorRate}

# HELP application_uptime_seconds Application uptime in seconds
# TYPE application_uptime_seconds counter
application_uptime_seconds ${metrics.uptime}
`;
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.responseTimes = [];
    this.requestCounts = [];
    this.errorCounts = [];
    this.startTime = Date.now();
  }

  // Private helper methods
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  private initializeMetrics(): void {
    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupOldData();
    }, 300000); // Every 5 minutes
  }

  private cleanupOldData(): void {
    // Keep response times manageable
    if (this.responseTimes.length > 2000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    // Keep request counts to last 24 hours (1440 minutes)
    if (this.requestCounts.length > 1440) {
      this.requestCounts = this.requestCounts.slice(-1440);
      this.errorCounts = this.errorCounts.slice(-1440);
    }
  }
}
