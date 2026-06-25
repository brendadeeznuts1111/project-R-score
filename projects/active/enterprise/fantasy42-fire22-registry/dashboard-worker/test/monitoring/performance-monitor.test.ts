import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  PerformanceMonitor,
  RequestTracker,
  withRequestTracking,
} from '../../src/monitoring/performance-monitor';
import { MonitoringConfig } from '../../src/types/enhanced-types';

describe('Performance Monitor', () => {
  let monitor: PerformanceMonitor;
  let config: MonitoringConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      logLevel: 'info',
      metricsInterval: 1000,
      securityEventRetention: 1000,
      healthCheckInterval: 5000,
    };
    monitor = new PerformanceMonitor(config);
  });

  afterEach(() => {
    monitor.stopPeriodicCollection();
  });

  describe('PerformanceMonitor', () => {
    it('should create a PerformanceMonitor with correct configuration', () => {
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
      expect(monitor.getCurrentMetrics()).toBeDefined();
    });

    it('should start and end request tracking', () => {
      const requestId = 'test-request-1';
      monitor.startRequest(requestId);

      expect(monitor['activeRequests'].has(requestId)).toBe(true);

      const metrics = monitor.endRequest(requestId);
      expect(metrics).toBeDefined();
      expect(metrics?.responseTime).toBeGreaterThan(0);
      expect(monitor['activeRequests'].has(requestId)).toBe(false);
    });

    it('should return null when ending non-existent request', () => {
      const metrics = monitor.endRequest('non-existent-request');
      expect(metrics).toBeNull();
    });

    it('should collect metrics with response time', () => {
      const metrics = monitor.collectMetrics(150);
      expect(metrics.responseTime).toBe(150);
      expect(metrics.timestamp).toBeDefined();
    });

    it('should collect current metrics', () => {
      const metrics = monitor.getCurrentMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.responseTime).toBe(0); // No active requests
      expect(metrics.timestamp).toBeDefined();
    });

    it('should store and retrieve metrics', () => {
      monitor.startRequest('test-request-1');
      monitor.endRequest('test-request-1');

      const metrics = monitor.getMetrics(1);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].responseTime).toBeGreaterThan(0);
    });

    it('should limit stored metrics', () => {
      // Add more than 1000 metrics
      for (let i = 0; i < 1005; i++) {
        monitor.startRequest(`request-${i}`);
        monitor.endRequest(`request-${i}`);
      }

      const metrics = monitor.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });

    it('should calculate average response time', () => {
      // Add some metrics with known response times
      monitor.startRequest('request-1');
      monitor.endRequest('request-1');

      monitor.startRequest('request-2');
      monitor.endRequest('request-2');

      const avgTime = monitor.getAverageResponseTime();
      expect(avgTime).toBeGreaterThan(0);
    });

    it('should return 0 for average response time when no metrics', () => {
      const avgTime = monitor.getAverageResponseTime();
      expect(avgTime).toBe(0);
    });

    it('should calculate request rate', () => {
      // Add some metrics
      monitor.startRequest('request-1');
      monitor.endRequest('request-1');

      const rate = monitor.getRequestRate();
      expect(rate).toBeGreaterThan(0);
    });

    it('should return 0 for request rate when no metrics', () => {
      const rate = monitor.getRequestRate();
      expect(rate).toBe(0);
    });

    it('should start and stop periodic collection', () => {
      expect(monitor['metricsIntervalId']).toBeUndefined();

      monitor.startPeriodicCollection();
      expect(monitor['metricsIntervalId']).toBeDefined();

      monitor.stopPeriodicCollection();
      expect(monitor['metricsIntervalId']).toBeUndefined();
    });

    it('should not start periodic collection twice', () => {
      monitor.startPeriodicCollection();
      const firstId = monitor['metricsIntervalId'];

      monitor.startPeriodicCollection();
      const secondId = monitor['metricsIntervalId'];

      expect(firstId).toBe(secondId);
    });

    it('should get uptime', () => {
      const uptime1 = monitor.getUptime();
      expect(uptime1).toBeGreaterThan(0);

      // Wait a bit
      Bun.sleep(10).then(() => {
        const uptime2 = monitor.getUptime();
        expect(uptime2).toBeGreaterThan(uptime1);
      });
    });

    it('should reset metrics', () => {
      monitor.startRequest('test-request');
      monitor.endRequest('test-request');

      expect(monitor.getMetrics().length).toBe(1);

      monitor.reset();
      expect(monitor.getMetrics().length).toBe(0);
      expect(monitor['activeRequests'].size).toBe(0);
    });
  });

  describe('RequestTracker', () => {
    let tracker: RequestTracker;

    beforeEach(() => {
      tracker = new RequestTracker(monitor);
    });

    it('should start tracking a request', () => {
      const request = new Request('http://example.com', {
        method: 'GET',
        headers: new Headers({
          'User-Agent': 'test-agent',
          'X-Forwarded-For': '192.168.1.1',
        }),
      });

      const requestId = tracker.startTracking(request);
      expect(requestId).toBeDefined();
      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);

      const activeRequests = tracker.getActiveRequests();
      expect(activeRequests).toHaveLength(1);
      expect(activeRequests[0].id).toBe(requestId);
      expect(activeRequests[0].method).toBe('GET');
      expect(activeRequests[0].url).toBe('http://example.com');
      expect(activeRequests[0].userAgent).toBe('test-agent');
      expect(activeRequests[0].ip).toBe('192.168.1.1');
    });

    it('should start tracking with user ID', () => {
      const request = new Request('http://example.com');
      const userId = 'user-123';

      const requestId = tracker.startTracking(request, userId);
      const activeRequests = tracker.getActiveRequests();

      expect(activeRequests[0].userId).toBe(userId);
    });

    it('should end tracking a request', () => {
      const request = new Request('http://example.com');
      const requestId = tracker.startTracking(request);

      const requestInfo = tracker.endTracking(requestId);
      expect(requestInfo).toBeDefined();
      expect(requestInfo?.id).toBe(requestId);
      expect(requestInfo?.responseTime).toBeDefined();
      expect(requestInfo?.responseTime).toBeGreaterThan(0);

      const activeRequests = tracker.getActiveRequests();
      expect(activeRequests).toHaveLength(0);
    });

    it('should return null when ending non-existent tracking', () => {
      const requestInfo = tracker.endTracking('non-existent');
      expect(requestInfo).toBeNull();
    });

    it('should get client IP from various headers', () => {
      // Test CF-Connecting-IP
      let request = new Request('http://example.com', {
        headers: new Headers({
          'CF-Connecting-IP': '203.0.113.1',
        }),
      });
      expect(tracker['getClientIP'](request)).toBe('203.0.113.1');

      // Test X-Forwarded-For
      request = new Request('http://example.com', {
        headers: new Headers({
          'X-Forwarded-For': '192.168.1.1, 10.0.0.1',
        }),
      });
      expect(tracker['getClientIP'](request)).toBe('192.168.1.1');

      // Test X-Real-IP
      request = new Request('http://example.com', {
        headers: new Headers({
          'X-Real-IP': '172.16.0.1',
        }),
      });
      expect(tracker['getClientIP'](request)).toBe('172.16.0.1');

      // Test no headers
      request = new Request('http://example.com');
      expect(tracker['getClientIP'](request)).toBe('unknown');
    });
  });

  describe('withRequestTracking', () => {
    it('should wrap request handler with tracking', async () => {
      const handler = async (request: Request): Promise<Response> => {
        return new Response('OK');
      };

      const wrappedHandler = withRequestTracking(monitor, handler);

      const response = await wrappedHandler(new Request('http://example.com'));
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Request-ID')).toBeDefined();
    });

    it('should complete tracking even if handler throws error', async () => {
      const handler = async (request: Request): Promise<Response> => {
        throw new Error('Handler error');
      };

      const wrappedHandler = withRequestTracking(monitor, handler);

      await expect(wrappedHandler(new Request('http://example.com'))).rejects.toThrow(
        'Handler error'
      );

      // Verify tracking was completed
      const activeRequests = monitor['activeRequests'].size;
      expect(activeRequests).toBe(0);
    });
  });

  describe('CPU and Memory Usage Simulation', () => {
    it('should simulate CPU usage based on active requests', () => {
      // Base CPU should be 5
      let metrics = monitor.getCurrentMetrics();
      expect(metrics.cpuUsage).toBe(5);

      // Each request adds 2% CPU
      monitor.startRequest('request-1');
      monitor.startRequest('request-2');

      metrics = monitor.getCurrentMetrics();
      expect(metrics.cpuUsage).toBe(9); // 5 + 2*2

      monitor.endRequest('request-1');
      monitor.endRequest('request-2');
    });

    it('should cap CPU usage at 100%', () => {
      // Simulate many requests to test cap
      for (let i = 0; i < 100; i++) {
        monitor.startRequest(`request-${i}`);
      }

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.cpuUsage).toBe(100);
    });

    it('should simulate memory usage based on metrics history', () => {
      // Base memory should be 30
      let metrics = monitor.getCurrentMetrics();
      expect(metrics.memoryUsage).toBe(30);

      // Add metrics to increase memory usage
      monitor.startRequest('request-1');
      monitor.endRequest('request-1');

      metrics = monitor.getCurrentMetrics();
      expect(metrics.memoryUsage).toBeGreaterThan(30);
    });

    it('should cap memory usage at 100%', () => {
      // Add many metrics to test cap
      for (let i = 0; i < 1000; i++) {
        monitor.startRequest(`request-${i}`);
        monitor.endRequest(`request-${i}`);
      }

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.memoryUsage).toBeLessThanOrEqual(100);
    });
  });
});
