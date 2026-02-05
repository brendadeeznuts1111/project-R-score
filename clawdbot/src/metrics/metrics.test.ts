/**
 * Metrics System Tests
 *
 * Run all: bun test src/metrics
 * Run canary: bun test --grep '\[CANARY\]'
 * Run fast: bun test --grep '\[FAST\]'
 * Run WS: bun test --grep '\[WS\]'
 * Run metrics: bun test --grep '\[METRICS\]'
 *
 * Note: SQLite and WebSocket tests require Bun runtime.
 * Run with: bun test src/metrics/metrics.test.ts
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { MetricsCollector } from "./collector.js";
import { AnomalyDetector, type SystemMetrics } from "./anomaly-detector.js";
import {
  serverMessages,
  clientMessages,
  handleServerMessage,
  handleClientMessage,
  DEFAULT_THRESHOLDS,
} from "./protocol.js";
import type { SkillExecutionRecord, MetricsData } from "./types.js";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Check if running in Bun (has bun:sqlite available)
const isBun = typeof globalThis.Bun !== "undefined";

// ─────────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function createTestRecord(overrides: Partial<SkillExecutionRecord> = {}): SkillExecutionRecord {
  return {
    skillId: "test-skill",
    command: "test",
    args: [],
    duration: 100,
    success: true,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function createTempDbPath(): string {
  const tempDir = mkdtempSync(join(tmpdir(), "metrics-test-"));
  return join(tempDir, "test.db");
}

// ─────────────────────────────────────────────────────────────────────────────
// Canary Tests - Quick health checks
// ─────────────────────────────────────────────────────────────────────────────

describe("[CANARY] Health Checks", () => {
  test("[CANARY] MetricsCollector instantiates", () => {
    const collector = new MetricsCollector();
    expect(collector).toBeDefined();
    expect(collector.getMetrics()).toBeDefined();
  });

  test("[CANARY] AnomalyDetector instantiates", () => {
    const detector = new AnomalyDetector();
    expect(detector).toBeDefined();
    expect(detector.getThresholds()).toEqual(DEFAULT_THRESHOLDS);
  });

  test("[CANARY] Protocol message builders work", () => {
    const snapshot = serverMessages.snapshot({
      version: "1.0",
      bySkill: {},
      recentExecutions: [],
      aggregate: {
        totalExecutions: 0,
        successRate: 100,
        avgDuration: 0,
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    });
    expect(snapshot.type).toBe("snapshot");
    expect(snapshot.timestamp).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fast Tests - Unit tests that don't require I/O
// ─────────────────────────────────────────────────────────────────────────────

describe("[FAST] MetricsCollector", () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
    collector.reset();
  });

  test("[FAST] records execution", async () => {
    const record = createTestRecord();
    await collector.recordExecution(
      record.skillId,
      record.command,
      record.args,
      record.duration,
      record.success,
    );

    const data = collector.getMetrics();
    expect(data.recentExecutions).toHaveLength(1);
    expect(data.recentExecutions[0].skillId).toBe("test-skill");
  });

  test("[FAST] calculates aggregates", async () => {
    await collector.recordExecution("test-skill", "test", [], 100, true);
    await collector.recordExecution("test-skill", "test", [], 200, true);
    await collector.recordExecution("test-skill", "test", [], 300, false);

    const data = collector.getMetrics();
    expect(data.aggregate.totalExecutions).toBe(3);
    // successRate is a percentage
    expect(data.aggregate.successRate).toBeCloseTo(66.67, 0);
    expect(data.aggregate.avgDuration).toBe(200);
  });

  test("[FAST] tracks per-skill metrics", async () => {
    await collector.recordExecution("skill-a", "test", [], 100, true);
    await collector.recordExecution("skill-a", "test", [], 200, true);
    await collector.recordExecution("skill-b", "test", [], 50, true);

    const data = collector.getMetrics();
    expect(Object.keys(data.bySkill)).toHaveLength(2);
    expect(data.bySkill["skill-a"].totalExecutions).toBe(2);
    expect(data.bySkill["skill-b"].totalExecutions).toBe(1);
  });

  test("[FAST] respects maxRecentExecutions", async () => {
    const collector = new MetricsCollector({ maxRecentExecutions: 5 });
    collector.reset();

    for (let i = 0; i < 10; i++) {
      await collector.recordExecution("test-skill", `cmd-${i}`, [], 100, true);
    }

    const data = collector.getMetrics();
    expect(data.recentExecutions).toHaveLength(5);
    expect(data.recentExecutions[0].command).toBe("cmd-9"); // Most recent first
  });
});

describe("[FAST] AnomalyDetector", () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector();
  });

  test("[FAST] records latency baseline", () => {
    detector.recordLatency("skill-a", 100);
    detector.recordLatency("skill-a", 200);
    detector.recordLatency("skill-a", 150);

    const baseline = detector.getBaselineLatency("skill-a");
    expect(baseline).toBe(150); // (100 + 200 + 150) / 3
  });

  test("[FAST] returns null for unknown skill baseline", () => {
    expect(detector.getBaselineLatency("unknown")).toBeNull();
  });

  test("[FAST] detects latency spike", () => {
    // Build baseline
    for (let i = 0; i < 10; i++) {
      detector.recordLatency("skill-a", 100);
    }

    const now = new Date().toISOString();
    const metrics: MetricsData = {
      version: "1.0",
      bySkill: {
        "skill-a": {
          totalExecutions: 10,
          successCount: 10,
          failureCount: 0,
          totalDuration: 2000,
          avgDuration: 200, // 100% above baseline
          minDuration: 100,
          maxDuration: 300,
          p95Duration: 280,
        },
      },
      recentExecutions: [],
      aggregate: {
        totalExecutions: 10,
        successRate: 100,
        avgDuration: 200,
        startedAt: now,
        lastUpdated: now,
      },
    };

    const alerts = detector.detectAnomalies(metrics);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].type).toBe("latency_spike");
  });

  test("[FAST] detects high error rate", () => {
    const now = new Date().toISOString();
    const metrics: MetricsData = {
      version: "1.0",
      bySkill: {
        "skill-a": {
          totalExecutions: 100,
          successCount: 90,
          failureCount: 10, // 10% error rate > 5% critical threshold
          totalDuration: 10000,
          avgDuration: 100,
          minDuration: 50,
          maxDuration: 200,
          p95Duration: 180,
        },
      },
      recentExecutions: [],
      aggregate: {
        totalExecutions: 100,
        successRate: 90,
        avgDuration: 100,
        startedAt: now,
        lastUpdated: now,
      },
    };

    const alerts = detector.detectAnomalies(metrics);
    expect(alerts.some((a) => a.type === "error_rate")).toBe(true);
  });

  test("[FAST] detects high memory usage", () => {
    const system: SystemMetrics = {
      memoryUsageMB: 600, // > 512 threshold
      cpuUsagePercent: 50,
      storageUsagePercent: 50,
      cacheHitRatio: 95,
    };

    const now = new Date().toISOString();
    const metrics: MetricsData = {
      version: "1.0",
      bySkill: {},
      recentExecutions: [],
      aggregate: {
        totalExecutions: 0,
        successRate: 100,
        avgDuration: 0,
        startedAt: now,
        lastUpdated: now,
      },
    };

    const alerts = detector.detectAnomalies(metrics, system);
    expect(alerts.some((a) => a.type === "memory_high")).toBe(true);
  });

  test("[FAST] custom thresholds work", () => {
    detector.setThresholds({ errorRateCritical: 20 });
    expect(detector.getThresholds().errorRateCritical).toBe(20);
  });

  test("[FAST] clears baselines", () => {
    detector.recordLatency("skill-a", 100);
    expect(detector.getBaselineLatency("skill-a")).toBe(100);

    detector.clearBaseline("skill-a");
    expect(detector.getBaselineLatency("skill-a")).toBeNull();
  });
});

describe("[FAST] Protocol Messages", () => {
  test("[FAST] server message builders have correct types", () => {
    const now = new Date().toISOString();
    expect(
      serverMessages.snapshot({
        version: "1.0",
        bySkill: {},
        recentExecutions: [],
        aggregate: {
          totalExecutions: 0,
          successRate: 100,
          avgDuration: 0,
          startedAt: now,
          lastUpdated: now,
        },
      }).type,
    ).toBe("snapshot");
    expect(serverMessages.pong().type).toBe("pong");
    expect(serverMessages.error("test").type).toBe("error");
  });

  test("[FAST] client message builders have correct types", () => {
    expect(clientMessages.subscribe().type).toBe("subscribe");
    expect(clientMessages.ping().type).toBe("ping");
    expect(clientMessages.dismissAlert("abc").type).toBe("dismiss_alert");
  });

  test("[FAST] handleServerMessage routes correctly", () => {
    let received: string | null = null;

    handleServerMessage(serverMessages.pong(), {
      onSnapshot: () => {
        received = "snapshot";
      },
      onUpdate: () => {
        received = "update";
      },
      onExecution: () => {
        received = "execution";
      },
      onAlert: () => {
        received = "alert";
      },
      onThresholds: () => {
        received = "thresholds";
      },
      onError: () => {
        received = "error";
      },
      onPong: () => {
        received = "pong";
      },
    });

    expect(received).toBe("pong");
  });

  test("[FAST] handleClientMessage routes correctly", () => {
    let received: string | null = null;

    handleClientMessage(clientMessages.ping(), {
      onSubscribe: () => {
        received = "subscribe";
      },
      onUnsubscribe: () => {
        received = "unsubscribe";
      },
      onGetSnapshot: () => {
        received = "get_snapshot";
      },
      onSetThresholds: () => {
        received = "set_thresholds";
      },
      onDismissAlert: () => {
        received = "dismiss_alert";
      },
      onPing: () => {
        received = "ping";
      },
    });

    expect(received).toBe("ping");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Metrics Tests - Tests requiring database I/O (Bun-only)
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!isBun)("[METRICS] SQLiteMetricsStore", () => {
  // Dynamic imports for Bun-only modules
  let SQLiteMetricsStore: typeof import("./sqlite-store.js").SQLiteMetricsStore;
  let store: InstanceType<typeof SQLiteMetricsStore>;
  let dbPath: string;

  beforeEach(async () => {
    const module = await import("./sqlite-store.js");
    SQLiteMetricsStore = module.SQLiteMetricsStore;
    dbPath = createTempDbPath();
    store = new SQLiteMetricsStore(dbPath);
  });

  afterEach(() => {
    store?.close();
    try {
      rmSync(dbPath, { force: true });
      rmSync(dbPath + "-wal", { force: true });
      rmSync(dbPath + "-shm", { force: true });
      rmSync(join(dbPath, ".."), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test("[METRICS] records and retrieves executions", () => {
    const record = createTestRecord();
    store.recordExecution(record);

    const recent = store.getRecentExecutions("test-skill", 10);
    expect(recent).toHaveLength(1);
    expect(recent[0].skillId).toBe("test-skill");
  });

  test("[METRICS] batch insert works", () => {
    const records = Array.from({ length: 100 }, (_, i) =>
      createTestRecord({ command: `cmd-${i}` }),
    );

    store.recordExecutionsBatch(records);

    const recent = store.getAllRecentExecutions(200);
    expect(recent).toHaveLength(100);
  });

  test("[METRICS] calculates skill aggregates", () => {
    store.recordExecution(createTestRecord({ duration: 100, success: true }));
    store.recordExecution(createTestRecord({ duration: 200, success: true }));
    store.recordExecution(createTestRecord({ duration: 300, success: false }));

    const agg = store.getSkillAggregates("test-skill");
    expect(agg).not.toBeNull();
    expect(agg!.totalExecutions).toBe(3);
    expect(agg!.successCount).toBe(2);
    expect(agg!.failureCount).toBe(1);
  });

  test("[METRICS] calculates P95 latency", () => {
    // Insert 100 records with durations 1-100
    const records = Array.from({ length: 100 }, (_, i) => createTestRecord({ duration: i + 1 }));
    store.recordExecutionsBatch(records);

    const p95 = store.getP95Latency("test-skill");
    expect(p95).toBeGreaterThanOrEqual(95);
  });

  test("[METRICS] records and dismisses alerts", () => {
    const alert = {
      id: "test-alert-1",
      type: "error_rate" as const,
      severity: "warning" as const,
      message: "Test alert",
      value: 5,
      threshold: 1,
      timestamp: Date.now(),
      dismissed: false,
    };

    store.recordAlert(alert);

    let active = store.getActiveAlerts();
    expect(active).toHaveLength(1);

    store.dismissAlert("test-alert-1");

    active = store.getActiveAlerts();
    expect(active).toHaveLength(0);
  });

  test("[METRICS] cleanup removes old data", () => {
    // Insert old record (simulate 10 days ago)
    const oldTs = Date.now() - 10 * 24 * 60 * 60 * 1000;
    store.recordExecution({
      ...createTestRecord(),
      timestamp: new Date(oldTs).toISOString(),
    });

    // Insert recent record
    store.recordExecution(createTestRecord());

    const result = store.cleanup(7); // Remove data older than 7 days
    expect(result.metricsDeleted).toBe(1);
  });

  test("[METRICS] getStats returns counts", () => {
    store.recordExecution(createTestRecord());
    store.recordExecution(createTestRecord());

    const stats = store.getStats();
    expect(stats.metricsCount).toBe(2);
    expect(stats.alertsCount).toBe(0);
    expect(stats.dbSizeBytes).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket Tests - Server integration tests (Bun-only)
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!isBun)("[WS] MetricsWebSocketServer", () => {
  // Dynamic imports for Bun-only modules
  let MetricsWebSocketServer: typeof import("./websocket-server.js").MetricsWebSocketServer;
  let SQLiteMetricsStore: typeof import("./sqlite-store.js").SQLiteMetricsStore;
  let server: InstanceType<typeof MetricsWebSocketServer>;
  let collector: MetricsCollector;
  let dbPath: string;
  const testPort = 19876;

  beforeEach(async () => {
    const wsModule = await import("./websocket-server.js");
    const sqliteModule = await import("./sqlite-store.js");
    MetricsWebSocketServer = wsModule.MetricsWebSocketServer;
    SQLiteMetricsStore = sqliteModule.SQLiteMetricsStore;

    collector = new MetricsCollector();
    dbPath = createTempDbPath();
    const store = new SQLiteMetricsStore(dbPath);
    const detector = new AnomalyDetector();

    server = new MetricsWebSocketServer(collector, detector, store, {
      port: testPort,
      hostname: "127.0.0.1",
    });
    server.start();
  });

  afterEach(() => {
    server?.stop();
    try {
      rmSync(dbPath, { force: true });
      rmSync(dbPath + "-wal", { force: true });
      rmSync(dbPath + "-shm", { force: true });
      rmSync(join(dbPath, ".."), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test("[WS] REST /api/metrics returns JSON", async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/api/metrics`);
    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type")).toContain("application/json");

    const data = await response.json();
    expect(data).toHaveProperty("bySkill");
    expect(data).toHaveProperty("recentExecutions");
    expect(data).toHaveProperty("aggregate");
  });

  test("[WS] REST /api/thresholds returns thresholds", async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/api/thresholds`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("latencySpikePercent");
    expect(data).toHaveProperty("errorRateCritical");
  });

  test("[WS] REST /health returns status", async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/health`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.connections).toBe(0);
  });

  test("[WS] WebSocket connects and receives snapshot", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${testPort}/ws`);

    const messages: unknown[] = [];

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        ws.send(JSON.stringify(clientMessages.subscribe()));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string);
        messages.push(msg);
        if (msg.type === "snapshot") {
          ws.close();
          resolve();
        }
      };

      ws.onerror = (err) => reject(err);

      setTimeout(() => reject(new Error("Timeout")), 5000);
    });

    expect(messages.length).toBeGreaterThan(0);
    expect((messages[0] as { type: string }).type).toBe("snapshot");
  });

  test("[WS] WebSocket ping/pong works", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${testPort}/ws`);

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        ws.send(JSON.stringify(clientMessages.ping()));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "pong") {
          ws.close();
          resolve();
        }
      };

      ws.onerror = (err) => reject(err);

      setTimeout(() => reject(new Error("Timeout")), 5000);
    });
  });

  test("[WS] getStats returns connection info", () => {
    const stats = server.getStats();
    expect(stats.connections).toBe(0);
    expect(stats.port).toBe(testPort);
  });

  test("[WS] recordExecution broadcasts to clients", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${testPort}/ws`);

    const messages: unknown[] = [];

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        ws.send(JSON.stringify(clientMessages.subscribe()));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data as string);
        messages.push(msg);

        if (msg.type === "snapshot") {
          // After receiving snapshot, record an execution
          await server.recordExecution(createTestRecord());
        }

        if (msg.type === "execution") {
          ws.close();
          resolve();
        }
      };

      ws.onerror = (err) => reject(err);

      setTimeout(() => reject(new Error("Timeout")), 5000);
    });

    expect(messages.some((m) => (m as { type: string }).type === "execution")).toBe(true);
  });
});
