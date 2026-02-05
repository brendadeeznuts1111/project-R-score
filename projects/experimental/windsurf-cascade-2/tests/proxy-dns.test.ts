// tests/proxy-dns.test.ts
//! Tests for DNS cache integration

import { test, expect, describe } from "bun:test";
import { 
  resolveProxy, 
  resolveProxyWithMetrics, 
  warmupDNSCache, 
  getDNSCacheStats,
  dnsMetrics 
} from "../src/net/proxy/dns.js";

// Performance timing
const nanoseconds = () => performance.now() * 1000000;

describe("DNS Resolution", () => {
  test("resolves known proxy URLs", async () => {
    const result = await resolveProxy("http://proxy.mycompany.com:8080");
    expect(result).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:8080$/);
  });

  test("resolves npm proxy URLs", async () => {
    const result = await resolveProxy("http://proxy.npmjs.org:8080");
    expect(result).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:8080$/);
  });

  test("handles different ports", async () => {
    const result = await resolveProxy("https://registry.mycompany.com:443");
    expect(result).toMatch(/^https:\/\/\d+\.\d+\.\d+\.\d+:443$/);
  });

  test("handles default ports", async () => {
    const result = await resolveProxy("http://proxy.mycompany.com");
    expect(result).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:80$/);
  });

  test("handles https default port", async () => {
    const result = await resolveProxy("https://proxy.mycompany.com");
    expect(result).toMatch(/^https:\/\/\d+\.\d+\.\d+\.\d+:443$/);
  });

  test("throws on invalid URLs", async () => {
    await expect(resolveProxy("invalid-url")).rejects.toThrow();
  });
});

describe("DNS Cache Performance", () => {
  test("cache hits are fast", async () => {
    const iterations = 100;
    const start = nanoseconds();
    
    // First call to populate cache
    await resolveProxy("http://proxy.mycompany.com:8080");
    
    // Subsequent calls should hit cache
    for (let i = 0; i < iterations; i++) {
      await resolveProxy("http://proxy.mycompany.com:8080");
    }
    
    const duration = nanoseconds() - start;
    const avgPerResolution = duration / iterations;
    
    // Cache hits should be under 100ns
    expect(avgPerResolution).toBeLessThan(100);
    
    console.log(`Average cache hit time: ${avgPerResolution.toFixed(2)}ns`);
  });

  test("cache misses take longer", async () => {
    const start = nanoseconds();
    
    // Resolve different domains to cause cache misses
    await resolveProxy("http://unknown1.mycompany.com:8080");
    await resolveProxy("http://unknown2.mycompany.com:8080");
    await resolveProxy("http://unknown3.mycompany.com:8080");
    
    const duration = nanoseconds() - start;
    const avgPerResolution = duration / 3;
    
    // Cache misses should take longer (simulated 1-5ms)
    expect(avgPerResolution).toBeGreaterThan(1000); // 1μs minimum
    
    console.log(`Average cache miss time: ${avgPerResolution.toFixed(2)}ns`);
  });
});

describe("DNS Metrics", () => {
  test("records metrics correctly", async () => {
    dnsMetrics.reset();
    
    // Simulate some resolutions
    await resolveProxyWithMetrics("http://proxy.mycompany.com:8080"); // Likely cache hit
    await resolveProxyWithMetrics("http://unknown.mycompany.com:8080"); // Likely cache miss
    await resolveProxyWithMetrics("http://proxy.mycompany.com:8080"); // Likely cache hit
    
    const metrics = dnsMetrics.getMetrics();
    
    expect(metrics.resolutions).toBe(3);
    expect(metrics.cacheHits).toBeGreaterThan(0);
    expect(metrics.cacheMisses).toBeGreaterThan(0);
    expect(metrics.hitRate).toBeGreaterThan(0);
    expect(metrics.hitRate).toBeLessThan(100);
  });

  test("calculates hit rate correctly", async () => {
    dnsMetrics.reset();
    
    // Force specific cache behavior
    for (let i = 0; i < 10; i++) {
      await resolveProxyWithMetrics("http://proxy.mycompany.com:8080"); // Cache hit
    }
    
    for (let i = 0; i < 5; i++) {
      await resolveProxyWithMetrics(`http://unknown${i}.mycompany.com:8080`); // Cache miss
    }
    
    const metrics = dnsMetrics.getMetrics();
    
    expect(metrics.hitRate).toBeCloseTo(66.67, 1); // 10 hits out of 15 total
    expect(metrics.avgCacheHitLatency).toBeLessThan(metrics.avgCacheMissLatency);
  });

  test("resets metrics correctly", async () => {
    dnsMetrics.reset();
    
    const metrics = dnsMetrics.getMetrics();
    
    expect(metrics.resolutions).toBe(0);
    expect(metrics.cacheHits).toBe(0);
    expect(metrics.cacheMisses).toBe(0);
    expect(metrics.hitRate).toBe(0);
  });
});

describe("DNS Cache Stats", () => {
  test("returns cache statistics", () => {
    const stats = getDNSCacheStats();
    
    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
    expect(stats).toHaveProperty('size');
    
    expect(typeof stats.hits).toBe('number');
    expect(typeof stats.misses).toBe('number');
    expect(typeof stats.size).toBe('number');
  });

  test("stats update after resolutions", async () => {
    const initialStats = getDNSCacheStats();
    
    await resolveProxy("http://proxy.mycompany.com:8080");
    
    const updatedStats = getDNSCacheStats();
    
    // Stats should have changed
    expect(updatedStats.hits + updatedStats.misses).toBeGreaterThan(
      initialStats.hits + initialStats.misses
    );
  });
});

describe("DNS Cache Warmup", () => {
  test("warms up cache successfully", async () => {
    const start = nanoseconds();
    
    await warmupDNSCache();
    
    const duration = nanoseconds() - start;
    
    // Should complete quickly (under 100ms)
    expect(duration).toBeLessThan(100000000); // 100ms in nanoseconds
    
    const stats = getDNSCacheStats();
    expect(stats.size).toBeGreaterThan(0);
  });

  test("handles warmup failures gracefully", async () => {
    // This test would simulate DNS failures during warmup
    // For now, just ensure it doesn't throw
    await expect(warmupDNSCache()).resolves.not.toThrow();
  });
});

describe("Edge Cases", () => {
  test("handles malformed URLs", async () => {
    await expect(resolveProxy("not-a-url")).rejects.toThrow();
    await expect(resolveProxy("http://")).rejects.toThrow();
    await expect(resolveProxy("://missing-protocol.com")).rejects.toThrow();
  });

  test("handles very long hostnames", async () => {
    const longHostname = "a".repeat(300) + ".com";
    await expect(resolveProxy(`http://${longHostname}:8080`)).rejects.toThrow();
  });

  test("handles IPv6 addresses", async () => {
    // This would need to be implemented in the actual DNS resolver
    // For now, just ensure it doesn't crash
    const result = await resolveProxy("http://[::1]:8080");
    expect(result).toBeDefined();
  });

  test("handles concurrent resolutions", async () => {
    const promises = [];
    
    // Launch multiple concurrent resolutions
    for (let i = 0; i < 10; i++) {
      promises.push(resolveProxy("http://proxy.mycompany.com:8080"));
    }
    
    const results = await Promise.all(promises);
    
    // All should resolve successfully
    results.forEach(result => {
      expect(result).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:8080$/);
    });
  });
});

describe("Performance SLA", () => {
  test("meets cache hit SLA", async () => {
    // Warm up cache
    await resolveProxy("http://proxy.mycompany.com:8080");
    
    const iterations = 1000;
    const start = nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
      await resolveProxy("http://proxy.mycompany.com:8080");
    }
    
    const duration = nanoseconds() - start;
    const avgPerResolution = duration / iterations;
    
    // SLA: < 60ns for cache hits
    expect(avgPerResolution).toBeLessThan(60);
    
    console.log(`SLA Test - Cache hit: ${avgPerResolution.toFixed(2)}ns < 60ns ✅`);
  });

  test("meets cache miss SLA", async () => {
    const iterations = 10;
    const start = nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
      await resolveProxy(`http://unique${i}.mycompany.com:8080`);
    }
    
    const duration = nanoseconds() - start;
    const avgPerResolution = duration / iterations;
    
    // SLA: < 10ms for cache misses (10,000,000ns)
    expect(avgPerResolution).toBeLessThan(10000000);
    
    console.log(`SLA Test - Cache miss: ${avgPerResolution.toFixed(2)}ns < 10ms ✅`);
  });

  test("maintains high cache hit rate", async () => {
    dnsMetrics.reset();
    
    // Simulate typical usage pattern
    const popularDomains = [
      "http://proxy.mycompany.com:8080",
      "http://registry.mycompany.com:8080",
      "http://auth.mycompany.com:8080"
    ];
    
    // 80% cache hits (popular domains)
    for (let i = 0; i < 80; i++) {
      const domain = popularDomains[i % popularDomains.length];
      await resolveProxyWithMetrics(domain);
    }
    
    // 20% cache misses (unique domains)
    for (let i = 0; i < 20; i++) {
      await resolveProxyWithMetrics(`http://unique${i}.mycompany.com:8080`);
    }
    
    const metrics = dnsMetrics.getMetrics();
    
    // Should maintain >70% cache hit rate
    expect(metrics.hitRate).toBeGreaterThan(70);
    
    console.log(`Cache hit rate: ${metrics.hitRate.toFixed(1)}% > 70% ✅`);
  });
});
