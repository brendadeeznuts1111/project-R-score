import { describe, test, expect, afterEach, spyOn, beforeEach } from "bun:test";
import { ProtocolWorkerBridge } from "../src/protocol-worker-bridge";
import { ProtocolOrchestrator } from "../src/protocol-matrix";

type Listener = (event: any) => void;

class FakeWorker {
  private listeners = new Map<string, Listener[]>();

  addEventListener(type: string, listener: Listener): void {
    const current = this.listeners.get(type) || [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  postMessage(message: any): void {
    if (message.type === "task") {
      // Simulate worker executing ProtocolOrchestrator
      setTimeout(() => {
        const result = {
          success: true,
          protocol: "data",
          data: { encoded: "base64" },
          metadata: { latency: 1, cacheHit: false },
        };
        this.emit("message", {
          data: { type: "result", id: message.id, ok: true, value: result },
        });
      }, 0);
    }
  }

  terminate(): void {}
  unref(): void {}

  emit(type: string, event: any): void {
    const handlers = this.listeners.get(type) || [];
    for (const handler of handlers) handler(event);
  }
}

let bridges: ProtocolWorkerBridge[] = [];

beforeEach(() => {
  ProtocolOrchestrator.reset();
});

afterEach(() => {
  while (bridges.length > 0) {
    bridges.pop()?.terminate();
  }
});

describe("ProtocolWorkerBridge", () => {
  test("small payloads stay on main thread", async () => {
    using workerSpy = spyOn(globalThis, "Worker");
    workerSpy.mockImplementation((() => new FakeWorker()) as any);

    using execSpy = spyOn(ProtocolOrchestrator, "execute");
    execSpy.mockResolvedValue({
      success: true,
      protocol: "data",
      data: { encoded: "test" },
      metadata: { latency: 1, cacheHit: false },
    });

    const bridge = new ProtocolWorkerBridge({
      sizeThreshold: 1000,
      pool: { minWorkers: 1, maxWorkers: 1 },
    });
    bridges.push(bridge);

    const result = await bridge.execute({ data: "small", size: 10 });

    expect(result.success).toBe(true);
    expect(execSpy).toHaveBeenCalled();

    const metrics = bridge.getMetrics();
    expect(metrics.mainThreadExecutions).toBe(1);
    expect(metrics.workerOffloadedExecutions).toBe(0);
  });

  test("large payloads offloaded to pool", async () => {
    using workerSpy = spyOn(globalThis, "Worker");
    workerSpy.mockImplementation((() => new FakeWorker()) as any);

    using execSpy = spyOn(ProtocolOrchestrator, "execute");

    const bridge = new ProtocolWorkerBridge({
      sizeThreshold: 100,
      pool: { minWorkers: 1, maxWorkers: 1 },
    });
    bridges.push(bridge);

    const result = await bridge.execute({ data: "x".repeat(200), size: 200 });

    expect(result.success).toBe(true);
    // Main thread ProtocolOrchestrator should NOT have been called
    expect(execSpy).not.toHaveBeenCalled();

    const metrics = bridge.getMetrics();
    expect(metrics.mainThreadExecutions).toBe(0);
    expect(metrics.workerOffloadedExecutions).toBe(1);
  });

  test("threshold boundary: at threshold goes to worker", async () => {
    using workerSpy = spyOn(globalThis, "Worker");
    workerSpy.mockImplementation((() => new FakeWorker()) as any);

    using execSpy = spyOn(ProtocolOrchestrator, "execute");
    execSpy.mockResolvedValue({
      success: true,
      protocol: "data",
      data: { encoded: "test" },
      metadata: { latency: 1, cacheHit: false },
    });

    const bridge = new ProtocolWorkerBridge({
      sizeThreshold: 100,
      pool: { minWorkers: 1, maxWorkers: 1 },
    });
    bridges.push(bridge);

    // Exactly at threshold — goes to worker (not less than)
    await bridge.execute({ data: "at-threshold", size: 100 });

    const metrics = bridge.getMetrics();
    expect(metrics.workerOffloadedExecutions).toBe(1);
    expect(metrics.mainThreadExecutions).toBe(0);

    // Below threshold — stays on main thread
    await bridge.execute({ data: "below", size: 99 });

    const metrics2 = bridge.getMetrics();
    expect(metrics2.mainThreadExecutions).toBe(1);
    expect(metrics2.workerOffloadedExecutions).toBe(1);
  });

  test("metrics track correctly", async () => {
    using workerSpy = spyOn(globalThis, "Worker");
    workerSpy.mockImplementation((() => new FakeWorker()) as any);

    using execSpy = spyOn(ProtocolOrchestrator, "execute");
    execSpy.mockResolvedValue({
      success: true,
      protocol: "data",
      data: {},
      metadata: { latency: 1, cacheHit: false },
    });

    const bridge = new ProtocolWorkerBridge({
      sizeThreshold: 500,
      pool: { minWorkers: 1, maxWorkers: 2 },
    });
    bridges.push(bridge);

    // 3 main-thread, 2 worker
    await bridge.execute({ data: "a", size: 10 });
    await bridge.execute({ data: "b", size: 100 });
    await bridge.execute({ data: "c", size: 200 });
    await bridge.execute({ data: "d", size: 1000 });
    await bridge.execute({ data: "e", size: 5000 });

    const m = bridge.getMetrics();
    expect(m.mainThreadExecutions).toBe(3);
    expect(m.workerOffloadedExecutions).toBe(2);
    expect(m.totalExecutions).toBe(5);
  });

  test("returns same ExecuteResult shape from both paths", async () => {
    using workerSpy = spyOn(globalThis, "Worker");
    workerSpy.mockImplementation((() => new FakeWorker()) as any);

    using execSpy = spyOn(ProtocolOrchestrator, "execute");
    execSpy.mockResolvedValue({
      success: true,
      protocol: "data",
      data: { encoded: "main-thread" },
      metadata: { latency: 5, cacheHit: false },
    });

    const bridge = new ProtocolWorkerBridge({
      sizeThreshold: 500,
      pool: { minWorkers: 1, maxWorkers: 1 },
    });
    bridges.push(bridge);

    // Main thread path
    const mainResult = await bridge.execute({ data: "small", size: 10 });
    expect(mainResult).toHaveProperty("success");
    expect(mainResult).toHaveProperty("protocol");
    expect(mainResult).toHaveProperty("data");
    expect(mainResult).toHaveProperty("metadata");

    // Worker path
    const workerResult = await bridge.execute({ data: "large", size: 1000 });
    expect(workerResult).toHaveProperty("success");
    expect(workerResult).toHaveProperty("protocol");
    expect(workerResult).toHaveProperty("data");
    expect(workerResult).toHaveProperty("metadata");
  });

  test("terminate cleans up pool", async () => {
    using workerSpy = spyOn(globalThis, "Worker");
    const workers: FakeWorker[] = [];
    workerSpy.mockImplementation((() => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    }) as any);

    const bridge = new ProtocolWorkerBridge({
      sizeThreshold: 500,
      pool: { minWorkers: 2, maxWorkers: 2 },
    });
    // Don't push to bridges since we manually terminate

    expect(workers).toHaveLength(2);
    bridge.terminate();

    // After termination, executing should fail
    await expect(
      bridge.execute({ data: "after-terminate", size: 1000 }),
    ).rejects.toThrow();
  });

  test("multiple concurrent mixed requests", async () => {
    using workerSpy = spyOn(globalThis, "Worker");
    workerSpy.mockImplementation((() => new FakeWorker()) as any);

    using execSpy = spyOn(ProtocolOrchestrator, "execute");
    execSpy.mockResolvedValue({
      success: true,
      protocol: "data",
      data: { encoded: "concurrent" },
      metadata: { latency: 1, cacheHit: false },
    });

    const bridge = new ProtocolWorkerBridge({
      sizeThreshold: 500,
      pool: { minWorkers: 2, maxWorkers: 4 },
    });
    bridges.push(bridge);

    // Mix of small (main thread) and large (worker) requests
    const tasks = [
      bridge.execute({ data: "s1", size: 10 }),
      bridge.execute({ data: "l1", size: 1000 }),
      bridge.execute({ data: "s2", size: 50 }),
      bridge.execute({ data: "l2", size: 2000 }),
      bridge.execute({ data: "s3", size: 100 }),
      bridge.execute({ data: "l3", size: 5000 }),
    ];

    const results = await Promise.all(tasks);

    expect(results).toHaveLength(6);
    for (const r of results) {
      expect(r.success).toBe(true);
    }

    const m = bridge.getMetrics();
    expect(m.mainThreadExecutions).toBe(3);
    expect(m.workerOffloadedExecutions).toBe(3);
    expect(m.totalExecutions).toBe(6);
  });

  test("default pool config is reasonable", () => {
    using workerSpy = spyOn(globalThis, "Worker");
    const workers: FakeWorker[] = [];
    workerSpy.mockImplementation((() => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    }) as any);

    const bridge = new ProtocolWorkerBridge({ sizeThreshold: 1000 });
    bridges.push(bridge);

    // Default minWorkers: 2
    expect(workers).toHaveLength(2);
  });

  test("infers size from data when size not provided", async () => {
    using workerSpy = spyOn(globalThis, "Worker");
    workerSpy.mockImplementation((() => new FakeWorker()) as any);

    using execSpy = spyOn(ProtocolOrchestrator, "execute");
    execSpy.mockResolvedValue({
      success: true,
      protocol: "data",
      data: {},
      metadata: { latency: 1, cacheHit: false },
    });

    const bridge = new ProtocolWorkerBridge({
      sizeThreshold: 100,
      pool: { minWorkers: 1, maxWorkers: 1 },
    });
    bridges.push(bridge);

    // Small payload, no explicit size — should be inferred as small
    await bridge.execute({ data: "hi" });

    const m = bridge.getMetrics();
    expect(m.mainThreadExecutions).toBe(1);
  });
});
