import { describe, test, expect, beforeEach, spyOn } from "bun:test";
import {
  LatticeSecurity,
  LatticeMetricsCollector,
  LatticeCookieManager,
  cookieManager
} from "../../web/advanced-dashboard";
import { createMockResponse, mockSecurityAudit, delay } from "../fixtures/components";


describe("LatticeSecurity", () => {
  let security: LatticeSecurity;

  beforeEach(() => {
    security = new LatticeSecurity();
  });

  describe("auditRequest", () => {
    test("performs basic security audit", async () => {
      const mockRequest = {
        method: 'GET',
        url: 'https://api.test.com/components',
        headers: new Headers({
          'User-Agent': 'Mozilla/5.0 (Test Browser)',
          'X-Forwarded-For': '192.168.1.100'
        })
      } as Request;

      const result = await security.auditRequest(mockRequest);

      expect(result).toEqual({
        timestamp: expect.any(String),
        method: 'GET',
        url: 'https://api.test.com/components',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        ip: '192.168.1.100',
        threats: ['Private IP address detected'],
        safe: false
      });
    });

    test("detects bot traffic", async () => {
      const mockRequest = {
        method: 'GET',
        url: 'https://api.test.com/',
        headers: new Headers({
          'User-Agent': 'Googlebot/2.1',
          'X-Forwarded-For': '8.8.8.8'
        })
      } as Request;

      const result = await security.auditRequest(mockRequest);

      expect(result.threats).toContain('Automated request detected');
      expect(result.safe).toBe(false);
    });

    test("detects malformed POST requests", async () => {
      const mockRequest = {
        method: 'POST',
        url: 'https://api.test.com/components',
        headers: new Headers({
          'Content-Type': 'text/plain',
          'X-Forwarded-For': '1.2.3.4'
        })
      } as Request;

      const result = await security.auditRequest(mockRequest);

      expect(result.threats).toContain('POST request without proper content-type');
      expect(result.safe).toBe(false);
    });

    test("passes safe requests", async () => {
      const mockRequest = {
        method: 'GET',
        url: 'https://api.test.com/components',
        headers: new Headers({
          'User-Agent': 'Mozilla/5.0 (Browser)',
          'X-Forwarded-For': '203.0.113.1',
          'Content-Type': 'application/json'
        })
      } as Request;

      const result = await security.auditRequest(mockRequest);

      expect(result.threats).toEqual([]);
      expect(result.safe).toBe(true);
    });
  });
});

describe("LatticeMetricsCollector", () => {
  let metrics: LatticeMetricsCollector;

  beforeEach(() => {
    metrics = new LatticeMetricsCollector();
  });

  describe("trackRequest", () => {
    test("tracks request metrics", async () => {
      const startTime = performance.now() - 150; // 150ms ago
      const endpoint = '/api/components';

      const result = await metrics.trackRequest(endpoint, startTime);

      expect(result).toEqual({
        endpoint,
        duration: expect.stringMatching(/150\.\d{2}ms/),
        timestamp: expect.any(String),
        status: 'NORMAL',
        memory: expect.any(Object),
        cpu: expect.any(Object)
      });
    });

    test("categorizes performance correctly", async () => {
      const testCases = [
        { delay: 50, expected: 'FAST' },
        { delay: 500, expected: 'NORMAL' },
        { delay: 1500, expected: 'SLOW' },
        { delay: 6000, expected: 'TIMEOUT' }
      ];

      for (const { delay, expected } of testCases) {
        const startTime = performance.now() - delay;
        const result = await metrics.trackRequest('/test', startTime);
        expect(result.status).toBe(expected);
      }
    });

    test("triggers SLA violation alerts", async () => {
      const consoleSpy = spyOn(console, 'error');

      // Create 5 slow requests to trigger alert
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now() - 3000; // 3 seconds
        await metrics.trackRequest('/slow-endpoint', startTime);
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'SLA VIOLATION: /slow-endpoint exceeded threshold'
      );
    });
  });

  describe("getHealthStatus", () => {
    test("calculates health metrics correctly", () => {
      // Add some test metrics
      const mockMetrics = [
        { endpoint: '/test', duration: '100.00ms', timestamp: '', status: 'FAST', memory: {}, cpu: {} },
        { endpoint: '/test', duration: '200.00ms', timestamp: '', status: 'NORMAL', memory: {}, cpu: {} },
        { endpoint: '/test', duration: '300.00ms', timestamp: '', status: 'NORMAL', memory: {}, cpu: {} }
      ];

      // Manually set metrics (normally done by trackRequest)
      (metrics as any).metrics = mockMetrics;

      const health = metrics.getHealthStatus();

      expect(health).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        metrics: 3,
        averageResponseTime: '200.00ms',
        slaViolations: 0,
        memoryUsage: expect.any(Object)
      });
    });

    test("reports degraded status for slow responses", () => {
      const mockMetrics = [
        { endpoint: '/slow', duration: '1500.00ms', timestamp: '', status: 'SLOW', memory: {}, cpu: {} }
      ];
      (metrics as any).metrics = mockMetrics;

      const health = metrics.getHealthStatus();

      expect(health.status).toBe('degraded');
      expect(health.averageResponseTime).toBe('1500.00ms');
    });
  });
});

describe("LatticeCookieManager", () => {
  let cookieManager: LatticeCookieManager;

  beforeEach(async () => {
    cookieManager = new LatticeCookieManager();
    // Wait for config to load
    await delay(10);
  });

  describe("setSessionCookie", () => {
    test("sets session cookie with default options", () => {
      cookieManager.setSessionCookie('session-123');

      const value = cookieManager.getCookie('t3_session');
      expect(value).toBe('session-123');
    });

    test("sets session cookie with custom options", () => {
      cookieManager.setSessionCookie('session-456', { maxAge: 3600, secure: true });

      const value = cookieManager.getCookie('t3_session');
      expect(value).toBe('session-456');
    });
  });

  describe("setCsrfCookie", () => {
    test("sets CSRF cookie with appropriate options", () => {
      cookieManager.setCsrfCookie('csrf-token-789');

      const value = cookieManager.getCookie('t3_csrf');
      expect(value).toBe('csrf-token-789');
    });
  });

  describe("cookie operations", () => {
    test("gets cookie value", () => {
      cookieManager.setSessionCookie('test-session');

      const value = cookieManager.getCookie('t3_session');
      expect(value).toBe('test-session');
    });

    test("deletes cookie", () => {
      cookieManager.setSessionCookie('test-session');
      cookieManager.deleteCookie('t3_session');

      const value = cookieManager.getCookie('t3_session');
      expect(value).toBeNull();
    });
  });

  describe("getCookieHeaders", () => {
    test("returns cookie headers when cookies are set", () => {
      cookieManager.setSessionCookie('test-session');

      const headers = cookieManager.getCookieHeaders();
      expect(headers).toHaveProperty('Set-Cookie');
      expect(typeof headers['Set-Cookie']).toBe('string');
    });

    test("returns empty headers when no cookies", () => {
      // Clear cookies first
      cookieManager.deleteCookie('t3_session');
      cookieManager.deleteCookie('t3_csrf');

      const headers = cookieManager.getCookieHeaders();
      expect(headers).not.toHaveProperty('Set-Cookie');
    });
  });
});

// Test global instances
describe("global instances", () => {
  test("cookieManager is properly initialized", () => {
    expect(cookieManager).toBeInstanceOf(LatticeCookieManager);
  });
});