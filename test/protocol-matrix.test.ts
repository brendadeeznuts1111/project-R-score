import { describe, test, expect, beforeEach, spyOn } from "bun:test";
import {
  type Protocol,
  PROTOCOL_MATRIX,
  ProtocolOrchestrator,
} from "../src/protocol-matrix";

beforeEach(() => {
  ProtocolOrchestrator.reset();
});

// ─── Protocol Configuration ────────────────────────────────────────
describe("PROTOCOL_MATRIX configuration", () => {
  const ALL_PROTOCOLS: Protocol[] = ["http", "https", "ws", "wss", "s3", "file", "data", "blob", "unix"];

  test("defines all 7 protocols", () => {
    const keys = Object.keys(PROTOCOL_MATRIX);
    expect(keys).toHaveLength(9);
    for (const p of ALL_PROTOCOLS) {
      expect(PROTOCOL_MATRIX[p]).toBeDefined();
    }
  });

  test("each protocol has required fields", () => {
    for (const p of ALL_PROTOCOLS) {
      const config = PROTOCOL_MATRIX[p];
      expect(typeof config.maxSize).toBe("number");
      expect(typeof config.timeout).toBe("number");
      expect(Array.isArray(config.fallbackChain)).toBe(true);
      expect(config.retryStrategy).toHaveProperty("maxAttempts");
      expect(config.retryStrategy).toHaveProperty("backoff");
    }
  });

  test("s3 has the largest maxSize", () => {
    const s3Size = PROTOCOL_MATRIX.s3.maxSize;
    for (const p of ALL_PROTOCOLS) {
      expect(s3Size).toBeGreaterThanOrEqual(PROTOCOL_MATRIX[p].maxSize);
    }
  });

  test("data has the smallest timeout", () => {
    const dataTimeout = PROTOCOL_MATRIX.data.timeout;
    for (const p of ALL_PROTOCOLS) {
      expect(dataTimeout).toBeLessThanOrEqual(PROTOCOL_MATRIX[p].timeout);
    }
  });
});

// ─── Protocol Selection ────────────────────────────────────────────
describe("ProtocolOrchestrator.selectProtocol", () => {
  test("selects data for small payloads (< 1KB)", () => {
    const { primary } = ProtocolOrchestrator.selectProtocol(512);
    expect(primary).toBe("data");
  });

  test("selects blob for medium payloads (< 1MB)", () => {
    const { primary } = ProtocolOrchestrator.selectProtocol(500_000);
    expect(primary).toBe("blob");
  });

  test("selects https as default for large payloads", () => {
    const { primary } = ProtocolOrchestrator.selectProtocol(10_000_000);
    expect(primary).toBe("https");
  });

  test("selects file when localOnly is true", () => {
    const { primary } = ProtocolOrchestrator.selectProtocol(10_000_000, { localOnly: true });
    expect(primary).toBe("file");
  });

  test("selects file when maxCost constraint is set", () => {
    const { primary } = ProtocolOrchestrator.selectProtocol(10_000_000, { maxCost: 0 });
    expect(primary).toBe("file");
  });
});

// ─── Protocol Execution ────────────────────────────────────────────
describe("ProtocolOrchestrator.execute", () => {
  test("executes data protocol for small inline payloads", async () => {
    const result = await ProtocolOrchestrator.execute({
      data: { msg: "hi" },
      size: 10,
      options: { cache: false },
    });

    expect(result.success).toBe(true);
    expect(result.protocol).toBe("data");
    expect((result.data as any).encoded).toBeDefined();
    expect(typeof (result.data as any).encoded).toBe("string");
  });

  test("executes blob protocol for medium payloads", async () => {
    const result = await ProtocolOrchestrator.execute({
      data: { payload: "x".repeat(2000) },
      size: 100_000,
      options: { cache: false },
    });

    expect(result.success).toBe(true);
    expect(result.protocol).toBe("blob");
    expect((result.data as any).url).toMatch(/^blob:/);
  });

  test("executes file protocol for local-only requests", async () => {
    const result = await ProtocolOrchestrator.execute({
      data: { file: "test.json" },
      options: { localOnly: true, cache: false },
    });

    expect(result.success).toBe(true);
    expect(result.protocol).toBe("file");
    expect((result.data as any).path).toMatch(/\.json$/);
  });

  test("executes ws protocol with socket metadata", async () => {
    const result = await ProtocolOrchestrator.execute({
      data: { channel: "updates" },
      options: { protocol: "ws", cache: false },
    });

    expect(result.success).toBe(true);
    expect(result.protocol).toBe("ws");
    const socket = (result.data as any).socket;
    expect(socket.url).toBe("ws://localhost");
    expect(socket.readyState).toBe(1);
    expect(socket.binaryType).toBe("blob");
  });

  test("executes wss protocol with socket metadata", async () => {
    const result = await ProtocolOrchestrator.execute({
      data: { channel: "secure-updates" },
      options: { protocol: "wss", cache: false },
    });

    expect(result.success).toBe(true);
    expect(result.protocol).toBe("wss");
    const socket = (result.data as any).socket;
    expect(socket.url).toBe("wss://localhost");
    expect(socket.readyState).toBe(1);
    expect(socket.binaryType).toBe("blob");
  });

  test("returns cached result on second call", async () => {
    const request = { data: { cached: true }, size: 10, options: { cache: true } };

    const first = await ProtocolOrchestrator.execute(request);
    expect(first.metadata.cacheHit).toBe(false);

    const second = await ProtocolOrchestrator.execute(request);
    expect(second.metadata.cacheHit).toBe(true);
    expect(second.protocol).toBe(first.protocol);
  });

  test("skips cache when cache: false", async () => {
    const request = { data: { noCache: true }, size: 10 };

    await ProtocolOrchestrator.execute({ ...request, options: { cache: true } });
    const second = await ProtocolOrchestrator.execute({ ...request, options: { cache: false } });
    expect(second.metadata.cacheHit).toBe(false);
  });
});

// ─── Fallback Chains ───────────────────────────────────────────────
describe("Fallback chains", () => {
  test("falls through chain on failures", async () => {
    using spy = spyOn(ProtocolOrchestrator, "executeProtocol");

    let callCount = 0;
    spy.mockImplementation(async (protocol: Protocol, _data: unknown) => {
      callCount++;
      if (protocol !== "https") {
        throw new Error(`${protocol} failed`);
      }
      return { response: { status: 200, protocol: "https", size: 0 } };
    });

    // size > 1MB => selects https, but force s3 to test fallback
    const result = await ProtocolOrchestrator.execute({
      data: { test: "fallback" },
      options: { protocol: "s3", cache: false },
    });

    // s3 fallback chain: s3 -> https -> file
    // s3 fails, https succeeds
    expect(result.success).toBe(true);
    expect(result.protocol).toBe("https");
    expect(callCount).toBeGreaterThanOrEqual(2);
  }); // spy auto-restored via Symbol.dispose

  test("returns failure when entire chain fails", async () => {
    using spy = spyOn(ProtocolOrchestrator, "executeProtocol");

    spy.mockImplementation(async () => {
      throw new Error("all protocols down");
    });

    const result = await ProtocolOrchestrator.execute({
      data: { test: "total-failure" },
      size: 10,
      options: { cache: false },
    });

    expect(result.success).toBe(false);
  }); // spy auto-restored
});

// ─── Concurrency ───────────────────────────────────────────────────
describe("Concurrency", () => {
  test("handles concurrent executions", async () => {
    const requests = Array.from({ length: 20 }, (_, i) => ({
      data: { id: i },
      size: 10,
      options: { cache: false },
    }));

    const results = await Promise.all(requests.map((r) => ProtocolOrchestrator.execute(r)));

    expect(results).toHaveLength(20);
    for (const r of results) {
      expect(r.success).toBe(true);
    }
  });
});

// ─── Metrics ───────────────────────────────────────────────────────
describe("Metrics", () => {
  test("tracks per-protocol call counts", async () => {
    // Execute requests that hit different protocols
    await ProtocolOrchestrator.execute({ data: { a: 1 }, size: 10, options: { cache: false } }); // data
    await ProtocolOrchestrator.execute({ data: { b: 2 }, size: 10, options: { cache: false } }); // data
    await ProtocolOrchestrator.execute({ data: { c: 3 }, size: 500_000, options: { cache: false } }); // blob

    const metrics = ProtocolOrchestrator.getMetrics();
    expect(metrics.data).toBe(2);
    expect(metrics.blob).toBe(1);
    expect(metrics.https).toBe(0);
  });

  test("returns zero counts for unused protocols", () => {
    const metrics = ProtocolOrchestrator.getMetrics();
    const allProtocols: Protocol[] = ["http", "https", "ws", "wss", "s3", "file", "data", "blob", "unix"];
    for (const p of allProtocols) {
      expect(metrics[p]).toBe(0);
    }
  });
});

// ─── Health Check ──────────────────────────────────────────────────
describe("Health check", () => {
  test("returns status for all 9 protocols", () => {
    const health = ProtocolOrchestrator.healthCheck();
    const keys = Object.keys(health);
    expect(keys).toHaveLength(9);
    for (const key of keys) {
      expect(typeof health[key as Protocol]).toBe("boolean");
    }
  });

  test("all protocols report healthy by default", () => {
    const health = ProtocolOrchestrator.healthCheck();
    for (const value of Object.values(health)) {
      expect(value).toBe(true);
    }
  });
});

// ─── Stress Test ───────────────────────────────────────────────────
describe("Stress test", () => {
  test("handles 1000 concurrent requests", async () => {
    const requests = Array.from({ length: 1000 }, (_, i) => ({
      data: { stress: i },
      size: 10,
      options: { cache: false },
    }));

    const results = await Promise.all(requests.map((r) => ProtocolOrchestrator.execute(r)));

    expect(results).toHaveLength(1000);
    const successes = results.filter((r) => r.success);
    expect(successes.length).toBe(1000);
  });
});
