/**
 * MetricsCollector Unit Tests
 * 
 * Comprehensive test suite covering:
 * - API metrics recording and aggregation
 * - Performance metrics tracking
 * - Error metrics recording
 * - Health metrics tracking
 * - Aggregation and calculation functions
 * - Event emissions
 * - Memory management and pruning
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MetricsCollector, type APIMetric, type PerformanceMetric, type ErrorMetric, type HealthMetric } from '../../../src/services/MetricsCollector';
import { Logger } from '../../../src/Logger';
import { TIME_WINDOWS } from '../../../src/constants/api-metrics';

describe('MetricsCollector', () => {
  let metricsCollector: MetricsCollector;
  let mockLogger: Logger | undefined;

  beforeEach(() => {
    MetricsCollector.reset();
    metricsCollector = MetricsCollector.getInstance();
  });

  afterEach(() => {
    MetricsCollector.reset();
    metricsCollector.reset();
  });

  // =========================================================================
  // Singleton Pattern Tests
  // =========================================================================

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = MetricsCollector.getInstance();
      const instance2 = MetricsCollector.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      MetricsCollector.getInstance();
      MetricsCollector.reset();
      
      // After reset, next getInstance should create new instance
      const newInstance = MetricsCollector.getInstance();
      expect(newInstance).toBeDefined();
    });
  });

  // =========================================================================
  // API Metrics Recording Tests
  // =========================================================================

  describe('API Metrics Recording', () => {
    it('should record API call with success flag', () => {
      metricsCollector.recordAPICall({
        endpoint: '/api/users',
        method: 'GET',
        duration: 150,
        status: 200
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.apiMetrics.totalRequests).toBe(1);
      expect(metrics.apiMetrics.successRequests).toBe(1);
      expect(metrics.apiMetrics.failedRequests).toBe(0);
    });

    it('should mark request as failed for 4xx status', () => {
      metricsCollector.recordAPICall({
        endpoint: '/api/users',
        method: 'GET',
        duration: 100,
        status: 404
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.apiMetrics.successRequests).toBe(0);
      expect(metrics.apiMetrics.failedRequests).toBe(1);
    });

    it('should mark request as failed for 5xx status', () => {
      metricsCollector.recordAPICall({
        endpoint: '/api/users',
        method: 'POST',
        duration: 200,
        status: 500
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.apiMetrics.successRequests).toBe(0);
      expect(metrics.apiMetrics.failedRequests).toBe(1);
    });

    it('should record request size metrics', () => {
      metricsCollector.recordAPICall({
        endpoint: '/api/data',
        method: 'POST',
        duration: 100,
        status: 201,
        requestSize: 512,
        responseSize: 1024
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.apiMetrics.totalRequestSize).toBe(512);
      expect(metrics.apiMetrics.totalResponseSize).toBe(1024);
    });

    it('should record batch of API calls', () => {
      metricsCollector.recordAPICallBatch([
        { endpoint: '/api/1', method: 'GET', duration: 50, status: 200 },
        { endpoint: '/api/2', method: 'POST', duration: 100, status: 201 },
        { endpoint: '/api/3', method: 'DELETE', duration: 75, status: 204 }
      ]);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.apiMetrics.totalRequests).toBe(3);
    });

    it('should calculate error rate by status code', () => {
      metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: 50, status: 200 });
      metricsCollector.recordAPICall({ endpoint: '/b', method: 'GET', duration: 50, status: 400 });
      metricsCollector.recordAPICall({ endpoint: '/c', method: 'GET', duration: 50, status: 500 });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.apiMetrics.errorsByStatus['200']).toBeUndefined(); // Status is a number key
      expect(metrics.apiMetrics.errorsByStatus[200]).toBe(1);
      expect(metrics.apiMetrics.errorsByStatus[400]).toBe(1);
      expect(metrics.apiMetrics.errorsByStatus[500]).toBe(1);
    });
  });

  // =========================================================================
  // Performance Metrics Tests
  // =========================================================================

  describe('Performance Metrics', () => {
    it('should record performance metric', () => {
      metricsCollector.recordPerformance('database-query', 250);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.performanceMetrics.labels).toContain('database-query');
      expect(metrics.performanceMetrics.avgDurations['database-query']).toBe(250);
    });

    it('should record performance with tags and metadata', () => {
      metricsCollector.recordPerformance('cache-hit', 5, {
        tags: { type: 'redis', operation: 'get' },
        metadata: { key: 'user:123' }
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.performanceMetrics.labels).toContain('cache-hit');
    });

    it('should calculate average duration for multiple measurements', () => {
      metricsCollector.recordPerformance('operation', 100);
      metricsCollector.recordPerformance('operation', 200);
      metricsCollector.recordPerformance('operation', 300);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.performanceMetrics.avgDurations['operation']).toBe(200);
    });

    it('should aggregate multiple labels', () => {
      metricsCollector.recordPerformance('db-query', 150);
      metricsCollector.recordPerformance('cache-get', 10);
      metricsCollector.recordPerformance('api-call', 200);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.performanceMetrics.labels).toHaveLength(3);
    });
  });

  // =========================================================================
  // Error Metrics Tests
  // =========================================================================

  describe('Error Metrics', () => {
    it('should record error', () => {
      metricsCollector.recordError({
        code: 'ERR_001',
        message: 'System error',
        severity: 'error'
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.errorMetrics.totalErrors).toBe(1);
    });

    it('should increment count for duplicate errors within time window', () => {
      metricsCollector.recordError({
        code: 'DB_001',
        message: 'Database connection failed',
        severity: 'critical'
      });

      metricsCollector.recordError({
        code: 'DB_001',
        message: 'Database connection failed',
        severity: 'critical'
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.errorMetrics.totalErrors).toBe(2);
    });

    it('should track errors by severity', () => {
      metricsCollector.recordError({ code: 'ERR_001', message: 'warn msg', severity: 'warn' });
      metricsCollector.recordError({ code: 'ERR_002', message: 'error msg', severity: 'error' });
      metricsCollector.recordError({ code: 'ERR_003', message: 'critical msg', severity: 'critical' });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.errorMetrics.errorsBySeverity['warn']).toBe(1);
      expect(metrics.errorMetrics.errorsBySeverity['error']).toBe(1);
      expect(metrics.errorMetrics.errorsBySeverity['critical']).toBe(1);
    });

    it('should track errors by code', () => {
      metricsCollector.recordError({ code: 'API_001', message: 'api error', severity: 'error' });
      metricsCollector.recordError({ code: 'API_001', message: 'api error', severity: 'error' });
      metricsCollector.recordError({ code: 'DB_001', message: 'db error', severity: 'error' });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.errorMetrics.errorsByCode['API_001']).toBe(2);
      expect(metrics.errorMetrics.errorsByCode['DB_001']).toBe(1);
    });

    it('should record error with context', () => {
      metricsCollector.recordError({
        code: 'API_002',
        message: 'Unauthorized',
        severity: 'warn',
        context: { userId: '123', endpoint: '/admin' }
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.errorMetrics.totalErrors).toBe(1);
    });
  });

  // =========================================================================
  // Health Metrics Tests
  // =========================================================================

  describe('Health Metrics', () => {
    it('should record health metric', () => {
      metricsCollector.recordHealth({
        cpuUsage: 25,
        memoryUsage: 45,
        uptime: 3600000,
        requestsPerSecond: 100,
        errorRate: 0.02,
        avgLatency: 150,
        status: 'healthy'
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.healthMetrics.cpuUsage).toBe(25);
      expect(metrics.healthMetrics.memoryUsage).toBe(45);
    });

    it('should track multiple health snapshots', () => {
      metricsCollector.recordHealth({
        cpuUsage: 20, memoryUsage: 40, uptime: 1000, requestsPerSecond: 50, errorRate: 0.01, avgLatency: 100, status: 'healthy'
      });
      
      metricsCollector.recordHealth({
        cpuUsage: 30, memoryUsage: 50, uptime: 2000, requestsPerSecond: 60, errorRate: 0.02, avgLatency: 120, status: 'healthy'
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.healthMetrics.cpuUsage).toBe(30); // Latest value
      expect(metrics.healthMetrics.memoryUsage).toBe(50);
    });
  });

  // =========================================================================
  // Aggregation & Calculation Tests
  // =========================================================================

  describe('Metrics Aggregation & Calculation', () => {
    it('should calculate error rate', () => {
      metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: 50, status: 200 });
      metricsCollector.recordAPICall({ endpoint: '/b', method: 'GET', duration: 50, status: 200 });
      metricsCollector.recordAPICall({ endpoint: '/c', method: 'GET', duration: 50, status: 500 });

      const errorRate = metricsCollector.getErrorRate();
      expect(errorRate).toBe(1/3); // 1 failed out of 3
    });

    it('should calculate average latency', () => {
      metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: 100, status: 200 });
      metricsCollector.recordAPICall({ endpoint: '/b', method: 'GET', duration: 200, status: 200 });
      metricsCollector.recordAPICall({ endpoint: '/c', method: 'GET', duration: 300, status: 200 });

      const avgLatency = metricsCollector.getAverageLatency();
      expect(avgLatency).toBe(200);
    });

    it('should calculate latency percentiles', () => {
      const durations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      durations.forEach(d => {
        metricsCollector.recordAPICall({ endpoint: '/test', method: 'GET', duration: d, status: 200 });
      });

      const p50 = metricsCollector.getLatencyPercentile(50);
      const p95 = metricsCollector.getLatencyPercentile(95);
      const p99 = metricsCollector.getLatencyPercentile(99);

      expect(p50).toBeDefined();
      expect(p95).toBeDefined();
      expect(p99).toBeDefined();
      expect(p50).toBeLessThanOrEqual(p95);
      expect(p95).toBeLessThanOrEqual(p99);
    });

    it('should calculate throughput (requests per second)', () => {
      for (let i = 0; i < 10; i++) {
        metricsCollector.recordAPICall({ endpoint: '/api', method: 'GET', duration: 50, status: 200 });
      }

      const throughput = metricsCollector.getThroughput(TIME_WINDOWS.SHORT);
      expect(throughput).toBeGreaterThan(0);
    });

    it('should calculate health score (0-100)', () => {
      // Record some successful metrics
      metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: 50, status: 200 });
      metricsCollector.recordAPICall({ endpoint: '/b', method: 'GET', duration: 60, status: 200 });
      
      metricsCollector.recordHealth({
        cpuUsage: 20, memoryUsage: 30, uptime: 1000000, requestsPerSecond: 100, errorRate: 0.01, avgLatency: 55, status: 'healthy'
      });

      const healthScore = metricsCollector.calculateHealthScore();
      expect(healthScore).toBeGreaterThanOrEqual(0);
      expect(healthScore).toBeLessThanOrEqual(100);
    });

    it('should determine health status from score', () => {
      expect(metricsCollector.getHealthStatus(90)).toBe('healthy');
      expect(metricsCollector.getHealthStatus(70)).toBe('degraded');
      expect(metricsCollector.getHealthStatus(50)).toBe('impaired');
      expect(metricsCollector.getHealthStatus(20)).toBe('critical');
    });
  });

  // =========================================================================
  // Filtering Tests
  // =========================================================================

  describe('Metrics Filtering', () => {
    it('should filter by endpoint', () => {
      metricsCollector.recordAPICall({ endpoint: '/users', method: 'GET', duration: 50, status: 200 });
      metricsCollector.recordAPICall({ endpoint: '/posts', method: 'GET', duration: 100, status: 200 });

      const metrics = metricsCollector.getMetrics({ endpoint: '/users' });
      expect(metrics.apiMetrics.totalRequests).toBe(1);
    });

    it('should filter by method', () => {
      metricsCollector.recordAPICall({ endpoint: '/data', method: 'GET', duration: 50, status: 200 });
      metricsCollector.recordAPICall({ endpoint: '/data', method: 'POST', duration: 100, status: 201 });

      const metrics = metricsCollector.getMetrics({ method: 'POST' });
      expect(metrics.apiMetrics.totalRequests).toBe(1);
    });

    it('should filter by time range', async () => {
      metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: 50, status: 200 });
      
      // Wait a bit and record another
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metricsRecent = metricsCollector.getMetrics({ timeRange: 50 });
      expect(metricsRecent.apiMetrics.totalRequests).toBeLessThanOrEqual(1);
    });

    it('should get endpoint specific metrics', () => {
      metricsCollector.recordAPICall({ endpoint: '/api/users', method: 'GET', duration: 50, status: 200 });
      metricsCollector.recordAPICall({ endpoint: '/api/posts', method: 'GET', duration: 100, status: 200 });

      const metrics = metricsCollector.getEndpointMetrics('/api/users');
      expect(metrics.apiMetrics.totalRequests).toBe(1);
    });

    it('should get recent metrics', () => {
      metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: 50, status: 200 });
      metricsCollector.recordAPICall({ endpoint: '/b', method: 'GET', duration: 60, status: 200 });

      const metrics = metricsCollector.getRecentMetrics();
      expect(metrics.apiMetrics.totalRequests).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // Event Emission Tests
  // =========================================================================

  describe('Event Emissions', () => {
    it('should emit api-call-recorded event', (done) => {
      metricsCollector.onMetricEvent('api-call-recorded', (data) => {
        expect(data.endpoint).toBe('/test');
        done();
      });

      metricsCollector.recordAPICall({ endpoint: '/test', method: 'GET', duration: 50, status: 200 });
    });

    it('should emit performance-recorded event', (done) => {
      metricsCollector.onMetricEvent('performance-recorded', (data) => {
        expect(data.label).toBe('test-perf');
        done();
      });

      metricsCollector.recordPerformance('test-perf', 100);
    });

    it('should emit error-recorded event', (done) => {
      metricsCollector.onMetricEvent('error-recorded', (data) => {
        expect(data.code).toBe('ERR_TEST');
        done();
      });

      metricsCollector.recordError({ code: 'ERR_TEST', message: 'test', severity: 'error' });
    });

    it('should emit health-recorded event', (done) => {
      metricsCollector.onMetricEvent('health-recorded', (data) => {
        expect(data.cpuUsage).toBe(50);
        done();
      });

      metricsCollector.recordHealth({
        cpuUsage: 50, memoryUsage: 50, uptime: 1000, requestsPerSecond: 100, errorRate: 0.01, avgLatency: 100, status: 'healthy'
      });
    });

    it('should allow unsubscribe from events', (done) => {
      let callCount = 0;
      const handler = () => { callCount++; };

      metricsCollector.onMetricEvent('api-call-recorded', handler);
      metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: 50, status: 200 });

      metricsCollector.offMetricEvent('api-call-recorded', handler);
      metricsCollector.recordAPICall({ endpoint: '/b', method: 'GET', duration: 50, status: 200 });

      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 50);
    });
  });

  // =========================================================================
  // Memory Management & Pruning Tests
  // =========================================================================

  describe('Memory Management', () => {
    it('should prune old metrics', () => {
      metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: 50, status: 200 });
      
      // Prune metrics older than 100ms (current one should remain)
      metricsCollector.pruneOldMetrics(100);
      
      const metrics = metricsCollector.getMetrics();
      expect(metrics.apiMetrics.totalRequests).toBe(1);
    });

    it('should maintain metric collection stats', () => {
      metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: 50, status: 200 });
      metricsCollector.recordPerformance('test', 100);
      metricsCollector.recordError({ code: 'ERR_001', message: 'test', severity: 'error' });
      metricsCollector.recordHealth({
        cpuUsage: 20, memoryUsage: 30, uptime: 1000, requestsPerSecond: 100, errorRate: 0.01, avgLatency: 50, status: 'healthy'
      });

      const stats = metricsCollector.getStats();
      expect(stats.apiMetricsCount).toBe(1);
      expect(stats.performanceMetricsCount).toBe(1);
      expect(stats.errorMetricsCount).toBe(1);
      expect(stats.healthMetricsCount).toBe(1);
      expect(stats.totalMemory).toBeGreaterThan(0);
    });

    it('should track uptime', async () => {
      const stats1 = metricsCollector.getStats();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats2 = metricsCollector.getStats();
      expect(stats2.uptime).toBeGreaterThan(stats1.uptime);
    });
  });

  // =========================================================================
  // Data Management Tests
  // =========================================================================

  describe('Data Management', () => {
    it('should reset all metrics', () => {
      metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: 50, status: 200 });
      metricsCollector.recordPerformance('test', 100);

      metricsCollector.reset();

      const metrics = metricsCollector.getMetrics();
      expect(metrics.apiMetrics.totalRequests).toBe(0);
      expect(metrics.performanceMetrics.labels).toHaveLength(0);
    });

    it('should handle empty metrics gracefully', () => {
      const metrics = metricsCollector.getMetrics();
      expect(metrics.apiMetrics.totalRequests).toBe(0);
      expect(metrics.apiMetrics.avgDuration).toBe(0);
      expect(metricsCollector.getErrorRate()).toBe(0);
      expect(metricsCollector.getAverageLatency()).toBe(0);
      expect(metricsCollector.getThroughput()).toBe(0);
    });
  });

  // =========================================================================
  // Edge Cases & Boundary Tests
  // =========================================================================

  describe('Edge Cases & Boundaries', () => {
    it('should handle zero duration', () => {
      metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: 0, status: 200 });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.apiMetrics.totalRequests).toBe(1);
      expect(metrics.apiMetrics.avgDuration).toBe(0);
    });

    it('should handle very large durations', () => {
      metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: 999999, status: 200 });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.apiMetrics.avgDuration).toBe(999999);
    });

    it('should handle extreme percentiles', () => {
      for (let i = 1; i <= 5; i++) {
        metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: i * 10, status: 200 });
      }

      const p1 = metricsCollector.getLatencyPercentile(1);
      const p99 = metricsCollector.getLatencyPercentile(99);

      expect(p1).toBeDefined();
      expect(p99).toBeDefined();
    });

    it('should handle negative time windows gracefully', () => {
      metricsCollector.recordAPICall({ endpoint: '/a', method: 'GET', duration: 50, status: 200 });

      const metrics = metricsCollector.getMetrics({ timeRange: 0 });
      expect(metrics.apiMetrics.totalRequests).toBe(0);
    });
  });
});
