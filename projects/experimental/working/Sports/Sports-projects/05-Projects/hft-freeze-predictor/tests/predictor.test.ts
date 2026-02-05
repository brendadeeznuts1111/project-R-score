// HFT Freeze Predictor - Tests
import { test, expect, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import { predict, evaluateThresholds, DEFAULT_CONFIG } from "../src/predictor";
import { init, store, query, getConfig, close } from "../src/store";
import { createServer, stopServer } from "../src/server";
import type { MetricsSnapshot, FreezeEvent, Config } from "../src/types";

describe("predictor", () => {
  const config: Config = DEFAULT_CONFIG;

  test("returns high probability when velocity exceeds threshold", () => {
    const metrics: MetricsSnapshot = {
      velocity: 120, // Above 80 threshold
      latency: 50,   // Below 100 threshold
      sharpeRatio: 0.8, // Above 0.5 threshold
      timestamp: Date.now(),
    };

    const prediction = predict(metrics, config);
    expect(prediction.probability).toBeGreaterThan(0);
    expect(prediction.confidence).toBeGreaterThan(0.5);
  });

  test("returns high probability when latency exceeds threshold", () => {
    const metrics: MetricsSnapshot = {
      velocity: 50,    // Below threshold
      latency: 150,    // Above 100 threshold
      sharpeRatio: 0.8, // Above threshold
      timestamp: Date.now(),
    };

    const prediction = predict(metrics, config);
    expect(prediction.probability).toBeGreaterThan(0);
  });

  test("returns high probability when sharpe below threshold", () => {
    const metrics: MetricsSnapshot = {
      velocity: 50,     // Below threshold
      latency: 50,      // Below threshold
      sharpeRatio: 0.2, // Below 0.5 threshold
      timestamp: Date.now(),
    };

    const prediction = predict(metrics, config);
    expect(prediction.probability).toBeGreaterThan(0);
  });

  test("returns low probability when all metrics normal", () => {
    const metrics: MetricsSnapshot = {
      velocity: 50,     // Below 80
      latency: 50,      // Below 100
      sharpeRatio: 0.8, // Above 0.5
      timestamp: Date.now(),
    };

    const prediction = predict(metrics, config);
    expect(prediction.probability).toBe(0);
    expect(prediction.confidence).toBe(0.3);
  });

  test("combines multiple threshold breaches", () => {
    const metrics: MetricsSnapshot = {
      velocity: 120,    // Above threshold
      latency: 150,     // Above threshold
      sharpeRatio: 0.2, // Below threshold
      timestamp: Date.now(),
    };

    const prediction = predict(metrics, config);
    expect(prediction.probability).toBeGreaterThan(0.3);
    expect(prediction.confidence).toBe(0.95); // 0.5 + 3 * 0.15
  });

  test("evaluateThresholds returns correct boolean array", () => {
    const metrics: MetricsSnapshot = {
      velocity: 120,
      latency: 150,
      sharpeRatio: 0.2,
      timestamp: Date.now(),
    };

    const [velocityExceeded, latencyExceeded, sharpeBelow] = evaluateThresholds(metrics, config);
    expect(velocityExceeded).toBe(true);
    expect(latencyExceeded).toBe(true);
    expect(sharpeBelow).toBe(true);
  });

  test("prediction has required fields", () => {
    const metrics: MetricsSnapshot = {
      velocity: 100,
      latency: 100,
      sharpeRatio: 0.5,
      timestamp: Date.now(),
    };

    const prediction = predict(metrics, config);
    expect(prediction.id).toBeDefined();
    expect(prediction.eventId).toBeDefined();
    expect(typeof prediction.probability).toBe("number");
    expect(typeof prediction.confidence).toBe("number");
    expect(prediction.predictedAt).toBeGreaterThan(0);
  });
});

describe("store", () => {
  beforeEach(() => {
    init(":memory:");
  });

  afterAll(() => {
    close();
  });

  test("creates tables on init", () => {
    const config = getConfig();
    expect(config.velocityThreshold).toBe(80);
    expect(config.latencyThreshold).toBe(100);
    expect(config.sharpeThreshold).toBe(0.5);
  });

  test("stores and retrieves events", () => {
    const event: FreezeEvent = {
      id: "test-event-1",
      timestamp: Date.now(),
      velocity: 90,
      latency: 120,
      sharpeRatio: 0.3,
      frozen: true,
    };

    store(event);
    const events = query(0);

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("test-event-1");
    expect(events[0].velocity).toBe(90);
    expect(events[0].frozen).toBe(true);
  });

  test("queries events by timestamp range", () => {
    const now = Date.now();

    const oldEvent: FreezeEvent = {
      id: "old-event",
      timestamp: now - 10000,
      velocity: 50,
      latency: 50,
      sharpeRatio: 0.8,
      frozen: false,
    };

    const newEvent: FreezeEvent = {
      id: "new-event",
      timestamp: now,
      velocity: 100,
      latency: 150,
      sharpeRatio: 0.2,
      frozen: true,
    };

    store(oldEvent);
    store(newEvent);

    // Query only recent events
    const recentEvents = query(now - 5000);
    expect(recentEvents).toHaveLength(1);
    expect(recentEvents[0].id).toBe("new-event");

    // Query all events
    const allEvents = query(0);
    expect(allEvents).toHaveLength(2);
  });
});

describe("api", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(() => {
    server = createServer();
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop();
    stopServer();
  });

  test("GET /health returns ok", async () => {
    const res = await fetch(`${baseUrl}/health`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeGreaterThan(0);
  });

  test("POST /api/hft/ingest processes metrics", async () => {
    const metrics: MetricsSnapshot = {
      velocity: 100,
      latency: 120,
      sharpeRatio: 0.3,
      timestamp: Date.now(),
    };

    const res = await fetch(`${baseUrl}/api/hft/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metrics),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.event).toBeDefined();
    expect(data.prediction).toBeDefined();
    expect(data.prediction.probability).toBeGreaterThan(0);
  });

  test("POST /api/hft/ingest validates input", async () => {
    const res = await fetch(`${baseUrl}/api/hft/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: "data" }),
    });

    expect(res.status).toBe(400);
  });

  test("GET /api/hft/events returns history", async () => {
    const res = await fetch(`${baseUrl}/api/hft/events`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/hft/status returns config and last prediction", async () => {
    const res = await fetch(`${baseUrl}/api/hft/status`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.config).toBeDefined();
    expect(data.config.velocityThreshold).toBe(80);
  });

  test("GET /api/hft/stats returns statistics", async () => {
    const res = await fetch(`${baseUrl}/api/hft/stats`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(typeof data.events).toBe("number");
    expect(typeof data.frozenEvents).toBe("number");
    expect(typeof data.predictions).toBe("number");
    expect(data.freezeRate).toBeDefined();
  });

  test("GET /api/hft/events supports limit param", async () => {
    // Ingest a few events first
    for (let i = 0; i < 5; i++) {
      await fetch(`${baseUrl}/api/hft/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          velocity: 100 + i,
          latency: 100,
          sharpeRatio: 0.3,
          timestamp: Date.now() + i,
        }),
      });
    }

    const res = await fetch(`${baseUrl}/api/hft/events?limit=2`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.length).toBeLessThanOrEqual(2);
  });
});
