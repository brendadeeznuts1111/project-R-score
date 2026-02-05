#!/usr/bin/env bun

/**
 * Networking Performance Benchmarks
 * Tests for HTTP server performance, network operations, and connection handling
 *
 * Run with: bun test tests/performance/networking/networking-performance.test.ts
 */

// @ts-ignore - Bun types are available at runtime
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { MemoryAnalyzer, PerformanceTracker } from "../../../src/core/benchmark.js";

describe("🌐 Networking Performance Benchmarks", () => {

  beforeEach(() => {
    // Clean environment before each test
    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true);
  });

  afterEach(() => {
    // Clean environment after each test
    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true);
  });

  describe("HTTP Server Performance", () => {

    it("should benchmark server creation and destruction", () => {
      const result = PerformanceTracker.measure(() => {
        // @ts-ignore - Bun.serve is available at runtime
        const server = Bun.serve({
          port: 0, // Random available port
          fetch(req) {
            return new Response(JSON.stringify({
              timestamp: Date.now(),
              url: req.url,
              method: req.method
            }));
          },
        });

        const port = server.port;
        server.stop();
        return port;
      }, "HTTP server lifecycle");

      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(65536);
    });

    it("should benchmark concurrent server handling", async () => {
      // @ts-ignore - Bun.serve is available at runtime
      const server = Bun.serve({
        port: 0,
        fetch(req) {
          // Simulate some processing
          const data = {
            timestamp: Date.now(),
            processed: true,
            url: req.url
          };
          return new Response(JSON.stringify(data));
        },
      });

      try {
        const concurrentRequests = 10;

        const result = await PerformanceTracker.measureAsync(async () => {
          const promises = Array.from({ length: concurrentRequests }, () =>
            fetch(`http://localhost:${server.port}`)
          );

          const responses = await Promise.all(promises);
          return responses.map(r => r.status);
        }, `${concurrentRequests} concurrent requests`);

        expect(result).toHaveLength(concurrentRequests);
        expect(result.every(status => status === 200)).toBe(true);

      } finally {
        server.stop();
      }
    });

    it("should benchmark server with different response sizes", async () => {
      // @ts-ignore - Bun.serve is available at runtime
      const server = Bun.serve({
        port: 0,
        fetch(req) {
          const url = new URL(req.url);
          const size = parseInt(url.searchParams.get('size') || '100');

          const data = {
            size,
            content: "x".repeat(size),
            timestamp: Date.now()
          };

          return new Response(JSON.stringify(data));
        },
      });

      try {
        const sizes = [100, 1000, 10000];
        const results: Array<{ size: number; time: number }> = [];

        for (const size of sizes) {
          const time = await PerformanceTracker.measureAsync(async () => {
            const response = await fetch(`http://localhost:${server.port}?size=${size}`);
            return await response.json();
          }, `Response size ${size} bytes`);

          results.push({ size, time });
        }

        // Larger responses should generally take longer
        expect(results[0].size).toBe(100);
        expect(results[1].size).toBe(1000);
        expect(results[2].size).toBe(10000);

        console.log("📊 Response size performance:");
        results.forEach(r => {
          console.log(`  ${r.size} bytes: ${r.time.toFixed(2)}ms`);
        });

      } finally {
        server.stop();
      }
    });
  });

  describe("Network Operations", () => {

    it("should benchmark HTTP GET requests", async () => {
      const urls = [
        "https://httpbin.org/get",
        "https://jsonplaceholder.typicode.com/posts/1",
        "https://api.github.com/repos/oven-sh/bun"
      ];

      for (const url of urls) {
        const result = await PerformanceTracker.measureAsync(async () => {
          const response = await fetch(url);
          // Convert Headers to plain object to avoid iteration issues
          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          return {
            status: response.status,
            headers
          };
        }, `GET ${new URL(url).hostname}`);

        expect(result.status).toBe(200);
        expect(result.headers).toBeDefined();
      }
    });

    it("should benchmark concurrent HTTP requests", async () => {
      const concurrentRequests = 5;
      const url = "https://httpbin.org/delay/1"; // 1 second delay

      const totalTime = await PerformanceTracker.measureAsync(async () => {
        const promises = Array.from({ length: concurrentRequests }, () =>
          fetch(url)
        );

        const responses = await Promise.all(promises);
        return responses.map(r => r.status);
      }, `${concurrentRequests} concurrent delayed requests`);

      // Should be faster than sequential requests
      expect(totalTime).toBeLessThan(2000); // Should be around 1 second, not 5 seconds
    });

    it("should benchmark POST request with data", async () => {
      const data = {
        message: "Hello from benchmark",
        timestamp: Date.now(),
        data: "x".repeat(1000) // 1KB of data
      };

      const result = await PerformanceTracker.measureAsync(async () => {
        const response = await fetch("https://httpbin.org/post", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        return await response.json();
      }, "POST with 1KB payload");

      expect(result.json).toEqual(data);
      expect(result.url).toBe("https://httpbin.org/post");
    });
  });

  describe("Connection Pool Simulation", () => {

    it("should benchmark connection pool management", () => {
      const poolSize = 10;
      const connections = Array.from({ length: poolSize }, (_, i) => ({
        id: i,
        created: Date.now(),
        active: true,
        host: "localhost",
        port: 3000 + i,
        lastUsed: Date.now() // Add missing property
      }));

      const result = PerformanceTracker.measure(() => {
        // Simulate connection pool operations
        const activeConnections = connections.filter(conn => conn.active);
        const selectedConnection = activeConnections[Math.floor(Math.random() * activeConnections.length)];

        // Simulate some work with the connection
        selectedConnection.lastUsed = Date.now();

        return {
          total: connections.length,
          active: activeConnections.length,
          selected: selectedConnection.id
        };
      }, "Connection pool selection");

      expect(result.total).toBe(poolSize);
      expect(result.active).toBe(poolSize);
      expect(result.selected).toBeGreaterThanOrEqual(0);
      expect(result.selected).toBeLessThan(poolSize);
    });

    it("should benchmark DNS resolution simulation", () => {
      const hosts = [
        "localhost",
        "example.com",
        "httpbin.org",
        "jsonplaceholder.typicode.com",
        "api.github.com"
      ];

      const results = PerformanceTracker.measure(() => {
        return hosts.map(host => {
          // Simulate DNS resolution
          const resolved = {
            host,
            ip: host === "localhost" ? "127.0.0.1" : `192.168.1.${Math.floor(Math.random() * 255)}`,
            ttl: Math.floor(Math.random() * 3600),
            resolved: Date.now()
          };

          return resolved;
        });
      }, "DNS resolution for 5 hosts");

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.host).toBe(hosts[index]);
        expect(result.ip).toBeDefined();
        expect(result.ttl).toBeGreaterThan(0);
        expect(result.resolved).toBeDefined();
      });
    });
  });

  describe("Memory Usage in Network Operations", () => {

    it("should analyze memory usage during server operations", () => {
      const beforeMemory = MemoryAnalyzer.snapshot("Before server operations");

      // Simulate server operations
      const servers = Array.from({ length: 5 }, (_, i) => {
        // @ts-ignore - Bun.serve is available at runtime
        const server = Bun.serve({
          port: 0,
          fetch() {
            return new Response(`Server ${i} response`);
          },
        });
        return server;
      });

      const duringMemory = MemoryAnalyzer.snapshot("During server operations");

      // Clean up servers
      servers.forEach(server => server.stop());

      // @ts-ignore - Bun.gc is available at runtime
      Bun.gc(true);

      const afterMemory = MemoryAnalyzer.snapshot("After server cleanup");

      expect(duringMemory.heapSize).toBeGreaterThan(beforeMemory.heapSize);
      expect(afterMemory.heapSize).toBeLessThanOrEqual(duringMemory.heapSize);

      console.log(`🧠 Memory usage during server operations:`);
      console.log(`  Before: ${(beforeMemory.heapSize / 1024).toFixed(2)}KB`);
      console.log(`  During: ${(duringMemory.heapSize / 1024).toFixed(2)}KB`);
      console.log(`  After: ${(afterMemory.heapSize / 1024).toFixed(2)}KB`);
    });

    it("should benchmark large response handling", async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: "x".repeat(100), // 100 chars per item
          metadata: {
            created: Date.now(),
            tags: [`tag${i}`, `category${i % 10}`]
          }
        }))
      };

      // @ts-ignore - Bun.serve is available at runtime
      const server = Bun.serve({
        port: 0,
        fetch() {
          return new Response(JSON.stringify(largeData));
        },
      });

      try {
        const result = await PerformanceTracker.measureAsync(async () => {
          const response = await fetch(`http://localhost:${server.port}`);
          const data = await response.json();

          return {
            itemCount: data.items.length,
            responseSize: JSON.stringify(data).length
          };
        }, "Large response handling");

        expect(result.itemCount).toBe(1000);
        expect(result.responseSize).toBeGreaterThan(100000); // Should be > 100KB

      } finally {
        server.stop();
      }
    });
  });

  describe("Security Headers Performance", () => {

    it("should benchmark security header generation", () => {
      const securityHeaders = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block; report=https://example.com/xss-report',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin'
      };

      const result = PerformanceTracker.measure(() => {
        // Simulate header processing
        const processedHeaders = Object.entries(securityHeaders).map(([key, value]) => ({
          name: key,
          value,
          length: value.length,
          hasDirectives: value.includes(';') || value.includes(' ')
        }));

        return {
          totalHeaders: processedHeaders.length,
          totalLength: processedHeaders.reduce((sum, h) => sum + h.length, 0),
          withDirectives: processedHeaders.filter(h => h.hasDirectives).length
        };
      }, "Security header processing");

      expect(result.totalHeaders).toBe(10);
      expect(result.totalLength).toBeGreaterThan(200);
      expect(result.withDirectives).toBeGreaterThan(5);

      console.log("📊 Security header processing:");
      console.log(`  Total headers: ${result.totalHeaders}`);
      console.log(`  Total length: ${result.totalLength} chars`);
      console.log(`  Headers with directives: ${result.withDirectives}`);
    });
  });
});
