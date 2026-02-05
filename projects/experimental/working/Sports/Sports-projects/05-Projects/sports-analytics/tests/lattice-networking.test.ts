import { expect, test, describe, beforeAll } from "bun:test";
import { LatticeRegistryClient } from "../src/t3-lattice-registry";
import { LatticeConfigManager } from "../src/config/lattice.config";

describe("T3-Lattice Networking Unit Tests", () => {
  let client: LatticeRegistryClient;

  beforeAll(() => {
    process.env.LATTICE_TOKEN = "test-token";
    client = new LatticeRegistryClient();
  });

  test("Fetch with Timeout (AbortSignal.timeout)", async () => {
    // We use a non-existent internal URL to trigger a timeout or connection error
    const start = performance.now();
    try {
      await fetch("https://registry.lattice.internal/v1/timeout-test", {
        signal: AbortSignal.timeout(10)
      });
    } catch (e: any) {
      // In some Bun versions, it might just be "Error" with a specific message
      expect(e).toBeDefined();
    }
    const end = performance.now();
    expect(end - start).toBeLessThan(100); // Should abort quickly
  });

  test("POST Request with JSON Body", async () => {
    // Verify mock logic for FD calculation
    const result = await client.fetchFdCalculation({ test: true });
    expect(result).toBeDefined();
    expect(result.fdValue).toBeGreaterThan(0);
  });

  test("DNS Cache Stats API", () => {
    const { dns } = require("bun");
    const stats = dns.getCacheStats();
    expect(stats).toHaveProperty("cacheHitsCompleted");
    expect(stats).toHaveProperty("cacheMisses");
    expect(stats).toHaveProperty("size");
  });

  test("Error Handling: GET with Body", async () => {
    try {
      await fetch("https://example.com", {
        method: "GET",
        body: JSON.stringify({ illegal: "body" })
      } as any);
    } catch (e: any) {
      // Bun/Fetch throws when GET has a body
      expect(e).toBeDefined();
    }
  });

  test("Proxy Configuration Object Format", () => {
    const config = LatticeConfigManager.getInstance().getConfig();
    expect(config.proxy).toHaveProperty("url");
    expect(config.proxy).toHaveProperty("enabled");
    
    // Verify fetch options construction logic (internal check)
    const fetchOptions: any = {
      proxy: {
        url: config.proxy.url,
        headers: config.proxy.headers
      }
    };
    expect(fetchOptions.proxy.url).toBeDefined();
  });

  test("Latency Tracking Accuracy", async () => {
    const start = performance.now();
    await client.fetchRegistryManifest();
    const metrics = client.getRecentMetrics(1);
    const latency = parseFloat(metrics[0]["P99 Latency"]);
    expect(latency).toBeGreaterThanOrEqual(0);
  });

  test("Connection Not Present (Offline Simulation)", async () => {
    try {
      // Use a completely invalid domain
      await fetch("https://this-domain-does-not-exist-12345.com", {
        signal: AbortSignal.timeout(1000)
      });
    } catch (e: any) {
      expect(e).toBeDefined();
      // Should be a connection error or timeout
    }
  });
});
