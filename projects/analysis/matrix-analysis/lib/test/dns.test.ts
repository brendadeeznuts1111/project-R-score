import { describe, it, expect } from "bun:test";
import { lookup, prefetch, getCacheStats } from "../src/core/dns.ts";
import type { DNSCacheStats } from "../src/core/dns.ts";

describe("dns", () => {
  describe("BN-096: DNS Lookup", () => {
    it("should resolve localhost", async () => {
      const results = await lookup("localhost");
      expect(results).not.toBeNull();
      expect(results!.length).toBeGreaterThan(0);
      expect(results![0].address).toBeDefined();
    });

    it("should return null for invalid hostname", async () => {
      const results = await lookup("this-host-does-not-exist.invalid");
      expect(results).toBeNull();
    });

    it("should resolve with IPv4 family filter", async () => {
      const results = await lookup("localhost", 4);
      if (results) {
        for (const r of results) {
          expect(r.family).toBe(4);
        }
      }
    });
  });

  describe("BN-096b: DNS Prefetch", () => {
    it("should not throw on prefetch", () => {
      expect(() => prefetch("localhost")).not.toThrow();
    });

    it("should accept port parameter", () => {
      expect(() => prefetch("localhost", 80)).not.toThrow();
    });
  });

  describe("BN-124: DNS Cache Stats", () => {
    it("should return cache stats object", () => {
      const stats = getCacheStats();
      expect(stats).toBeDefined();
      expect(typeof stats.cacheHitsCompleted).toBe("number");
      expect(typeof stats.cacheHitsInflight).toBe("number");
      expect(typeof stats.cacheMisses).toBe("number");
      expect(typeof stats.size).toBe("number");
      expect(typeof stats.errors).toBe("number");
      expect(typeof stats.totalCount).toBe("number");
    });

    it("should return non-negative values", () => {
      const stats = getCacheStats();
      expect(stats.cacheHitsCompleted).toBeGreaterThanOrEqual(0);
      expect(stats.cacheHitsInflight).toBeGreaterThanOrEqual(0);
      expect(stats.cacheMisses).toBeGreaterThanOrEqual(0);
      expect(stats.size).toBeGreaterThanOrEqual(0);
      expect(stats.errors).toBeGreaterThanOrEqual(0);
      expect(stats.totalCount).toBeGreaterThanOrEqual(0);
    });

    it("should be callable multiple times", () => {
      const a = getCacheStats();
      const b = getCacheStats();
      expect(a).toBeDefined();
      expect(b).toBeDefined();
    });
  });
});
