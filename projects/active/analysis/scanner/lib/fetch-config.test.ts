/**
 * Fetch Configuration & Error Handling Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  FetchClient,
  KeepAliveManager,
  classifyFetchError,
  isPortReachable,
  getDefaultPort,
  parseUrlWithPort,
  fetchWithTimeout,
  fetchWithRetry,
  defaultClient,
  highPerformanceClient,
  reliableClient,
} from './fetch-config';

describe('FetchClient', () => {
  let client: FetchClient;

  beforeEach(() => {
    client = new FetchClient({
      baseUrl: 'https://httpbin.org',
      timeout: 10000,
      retries: 2,
    });
  });

  it('should create client with default config', () => {
    const defaultC = new FetchClient();
    const config = defaultC.getConfig();
    expect(config.timeout).toBe(30000);
    expect(config.retries).toBe(3);
    expect(config.keepAlive).toBe(true);
  });

  it('should merge custom headers', () => {
    client = new FetchClient({
      headers: { 'X-Custom': 'value' },
    });
    const config = client.getConfig();
    expect(config.headers).toEqual({ 'X-Custom': 'value' });
  });

  it('should update config dynamically', () => {
    client.updateConfig({ timeout: 5000 });
    expect(client.getConfig().timeout).toBe(5000);
  });

  it('should perform GET request', async () => {
    const result = await client.get('/get');
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.metrics.durationMs).toBeGreaterThan(0);
  });

  it('should perform POST request', async () => {
    const payload = { test: 'data' };
    const result = await client.post('/post', payload);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should handle 404 errors', async () => {
    const result = await client.get('https://httpbin.org/status/404');
    expect(result.success).toBe(false);
    expect(result.error?.status).toBe(404);
  });

  it('should handle 500 errors as retryable', async () => {
    const result = await client.get('https://httpbin.org/status/500');
    expect(result.success).toBe(false);
    expect(result.error?.retryable).toBe(true);
  });

  it('should handle timeout', async () => {
    client.updateConfig({ timeout: 100 });
    const result = await client.get('https://httpbin.org/delay/5');
    expect(result.success).toBe(false);
    expect(result.error?.type).toBe('TIMEOUT');
  });

  it('should track retry count', async () => {
    client.updateConfig({ timeout: 100, retries: 2 });
    const result = await client.get('https://httpbin.org/delay/5');
    expect(result.retries).toBeGreaterThan(0);
  });
});

describe('Error Classification', () => {
  it('should classify DNS errors', () => {
    const error = new Error('getaddrinfo ENOTFOUND example.com');
    (error as { code: string }).code = 'ENOTFOUND';
    const classified = classifyFetchError(error, 'http://example.com');
    expect(classified.type).toBe('DNS_ERROR');
    expect(classified.retryable).toBe(true);
  });

  it('should classify connection refused', () => {
    const error = new Error('connect ECONNREFUSED');
    (error as { code: string }).code = 'ECONNREFUSED';
    const classified = classifyFetchError(error, 'http://localhost:9999');
    expect(classified.type).toBe('CONNECTION_REFUSED');
    expect(classified.hostname).toBe('localhost');
    expect(classified.port).toBe(9999);
  });

  it('should classify timeout errors', () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    const classified = classifyFetchError(error, 'http://example.com');
    expect(classified.type).toBe('TIMEOUT');
    expect(classified.retryable).toBe(true);
  });

  it('should classify TLS errors', () => {
    const error = new Error('TLS handshake failed');
    (error as { code: string }).code = 'TLS_HANDSHAKE_FAILED';
    const classified = classifyFetchError(error, 'https://example.com');
    expect(classified.type).toBe('TLS_ERROR');
    expect(classified.retryable).toBe(false);
  });

  it('should classify certificate errors', () => {
    const error = new Error('certificate has expired');
    const classified = classifyFetchError(error, 'https://example.com');
    expect(classified.type).toBe('CERT_ERROR');
    expect(classified.retryable).toBe(false);
  });
});

describe('KeepAliveManager', () => {
  let manager: KeepAliveManager;

  beforeEach(() => {
    manager = new KeepAliveManager(5);
  });

  it('should track connection acquisition', () => {
    expect(manager.acquire('host1')).toBe(true);
    expect(manager.getActiveCount('host1')).toBe(1);
  });

  it('should enforce max connections', () => {
    for (let i = 0; i < 5; i++) {
      expect(manager.acquire('host1')).toBe(true);
    }
    expect(manager.acquire('host1')).toBe(false);
  });

  it('should release connections', () => {
    manager.acquire('host1');
    manager.acquire('host1');
    expect(manager.getActiveCount('host1')).toBe(2);
    
    manager.release('host1');
    expect(manager.getActiveCount('host1')).toBe(1);
  });

  it('should check connection availability', () => {
    expect(manager.canConnect('host1')).toBe(true);
    for (let i = 0; i < 5; i++) {
      manager.acquire('host1');
    }
    expect(manager.canConnect('host1')).toBe(false);
  });

  it('should clear all connections', () => {
    manager.acquire('host1');
    manager.acquire('host2');
    manager.clear();
    expect(manager.getActiveCount('host1')).toBe(0);
    expect(manager.getActiveCount('host2')).toBe(0);
  });
});

describe('Port Utilities', () => {
  it('should get default port for https', () => {
    expect(getDefaultPort('https:')).toBe(443);
  });

  it('should get default port for http', () => {
    expect(getDefaultPort('http:')).toBe(80);
  });

  it('should get default port for ftp', () => {
    expect(getDefaultPort('ftp:')).toBe(21);
  });

  it('should parse URL with port override', () => {
    const url = parseUrlWithPort('https://example.com/path', 8080);
    expect(url.hostname).toBe('example.com');
    expect(url.port).toBe('8080');
  });

  it('should check port reachability', async () => {
    // Test with httpbin.org port 80 (should be reachable)
    const reachable = await isPortReachable('httpbin.org', 80, 5000);
    expect(reachable).toBe(true);

    // Test with unlikely port (should not be reachable)
    const unreachable = await isPortReachable('localhost', 65432, 100);
    expect(unreachable).toBe(false);
  });
});

describe('Convenience Functions', () => {
  it('should fetch with timeout', async () => {
    const response = await fetchWithTimeout('https://httpbin.org/get', {}, 10000);
    expect(response.ok).toBe(true);
  });

  it('should timeout on slow requests', async () => {
    try {
      await fetchWithTimeout('https://httpbin.org/delay/10', {}, 100);
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should fetch with retry', async () => {
    const response = await fetchWithRetry('https://httpbin.org/get', {}, 3, 100);
    expect(response.ok).toBe(true);
  });
});

describe('Pre-configured Clients', () => {
  it('should have default client', () => {
    const config = defaultClient.getConfig();
    expect(config.timeout).toBe(30000);
    expect(config.retries).toBe(3);
    expect(config.keepAlive).toBe(true);
  });

  it('should have high-performance client', () => {
    const config = highPerformanceClient.getConfig();
    expect(config.timeout).toBe(10000);
    expect(config.retries).toBe(2);
    expect(config.maxConnections).toBe(50);
  });

  it('should have reliable client', () => {
    const config = reliableClient.getConfig();
    expect(config.timeout).toBe(60000);
    expect(config.retries).toBe(5);
    expect(config.keepAlive).toBe(false);
  });
});

describe('Performance Benchmarks', () => {
  it('should handle concurrent requests efficiently', async () => {
    const client = new FetchClient({ baseUrl: 'https://httpbin.org', timeout: 10000, keepAlive: true });
    const requests = Array.from({ length: 5 }, (_, i) =>
      client.get(`/get?i=${i}`)
    );
    
    const start = performance.now();
    const results = await Promise.all(requests);
    const duration = performance.now() - start;
    
    expect(results.every(r => r.success)).toBe(true);
    expect(duration).toBeLessThan(30000); // Should complete within 30s
  });

  it('should track metrics accurately', async () => {
    const result = await defaultClient.get('https://httpbin.org/get');
    expect(result.metrics.startTime).toBeGreaterThan(0);
    expect(result.metrics.durationMs).toBeGreaterThan(0);
    expect(result.metrics.ttfbMs).toBeGreaterThan(0);
  });
});
