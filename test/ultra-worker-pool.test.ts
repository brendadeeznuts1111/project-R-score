import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { UltraWorkerPool, type WorkerTaskMessage, type WorkerResultMessage } from "../workers/ultra-pool";

type Listener = (event: any) => void;

class FakeWorker {
  private listeners = new Map<string, Listener[]>();
  private readonly autoReply: boolean;
  private readonly replyDelayMs: number;

  constructor(opts?: { autoReply?: boolean; replyDelayMs?: number }) {
    this.autoReply = opts?.autoReply ?? true;
    this.replyDelayMs = opts?.replyDelayMs ?? 0;
  }

  addEventListener(type: string, listener: Listener): void {
    const current = this.listeners.get(type) || [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  postMessage(message: WorkerTaskMessage<string>): void {
    if (!this.autoReply) return;
    const response: WorkerResultMessage<string> = {
      type: "result",
      id: message.id,
      ok: true,
      value: `ok:${message.payload}`,
    };
    setTimeout(() => {
      this.emit("message", { data: response });
    }, this.replyDelayMs);
  }

  terminate(): void {}
  unref(): void {}

  emit(type: string, event: any): void {
    const handlers = this.listeners.get(type) || [];
    for (const handler of handlers) {
      handler(event);
    }
  }
}

const pools: Array<UltraWorkerPool<any, any>> = [];

afterEach(() => {
  while (pools.length > 0) {
    pools.pop()?.terminateAll("test teardown");
  }
});

// ─── Original hardening tests ──────────────────────────────────────
describe("UltraWorkerPool hardening", () => {
  test("enforces queue backpressure via maxQueueSize", async () => {
    using spy = spyOn(globalThis, "Worker");
    const workers: FakeWorker[] = [];
    spy.mockImplementation((() => {
      const w = new FakeWorker({ autoReply: false });
      workers.push(w);
      return w;
    }) as any);

    const pool = new UltraWorkerPool<string, string>({
      workerUrl: "./fake-worker.ts",
      minWorkers: 1,
      maxWorkers: 1,
      maxQueueSize: 1,
      taskTimeoutMs: 20,
    });
    pools.push(pool);

    const first = pool.execute("first").catch(() => undefined);
    const second = pool.execute("second").catch(() => undefined);
    const third = pool.execute("third");

    await expect(third).rejects.toThrow("queue limit reached");
    const stats = pool.getStats();
    expect(stats.rejectedTasks).toBe(1);
    expect(stats.lastErrors.some((e) => e.event === "queue-overflow")).toBe(true);

    await Promise.all([first, second]);
  });

  test("rejects slow tasks with taskTimeoutMs and tracks timeout stats", async () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => new FakeWorker({ autoReply: false })) as any);

    const pool = new UltraWorkerPool<string, string>({
      workerUrl: "./fake-worker.ts",
      minWorkers: 1,
      maxWorkers: 1,
      taskTimeoutMs: 25,
    });
    pools.push(pool);

    await expect(pool.execute("will-timeout")).rejects.toThrow("timeout");

    const stats = pool.getStats();
    expect(stats.timedOutTasks).toBe(1);
    expect(stats.inFlightTasks).toBe(0);
    expect(stats.lastErrors.some((e) => e.event === "task-timeout")).toBe(true);
  });

  test("handles worker error+close without double replacement", async () => {
    using spy = spyOn(globalThis, "Worker");
    const workers: FakeWorker[] = [];
    spy.mockImplementation((() => {
      const worker = new FakeWorker({ autoReply: false });
      workers.push(worker);
      return worker;
    }) as any);

    const pool = new UltraWorkerPool<string, string>({
      workerUrl: "./fake-worker.ts",
      minWorkers: 1,
      maxWorkers: 2,
    });
    pools.push(pool);

    const initial = workers[0];
    expect(initial).toBeDefined();

    initial.emit("error", { error: new Error("boom"), message: "boom" });
    initial.emit("close", { code: 1 });

    // Allow replacement work to settle.
    await Bun.sleep(10);

    const stats = pool.getStats();
    expect(stats.replacedWorkers).toBe(1);
    expect(stats.workers).toBeGreaterThanOrEqual(1);
  });
});

// ─── Construction validation ───────────────────────────────────────
describe("UltraWorkerPool construction validation", () => {
  test("throws when minWorkers < 1", () => {
    expect(() => new UltraWorkerPool({
      workerUrl: "./fake.ts",
      minWorkers: 0,
      maxWorkers: 1,
    })).toThrow("minWorkers must be >= 1");
  });

  test("throws when maxWorkers < minWorkers", () => {
    expect(() => new UltraWorkerPool({
      workerUrl: "./fake.ts",
      minWorkers: 3,
      maxWorkers: 2,
    })).toThrow("maxWorkers must be >= minWorkers");
  });

  test("throws when maxQueueSize < 1", () => {
    expect(() => new UltraWorkerPool({
      workerUrl: "./fake.ts",
      minWorkers: 1,
      maxWorkers: 1,
      maxQueueSize: 0,
    })).toThrow("maxQueueSize must be >= 1");
  });

  test("throws when taskTimeoutMs < 0", () => {
    expect(() => new UltraWorkerPool({
      workerUrl: "./fake.ts",
      minWorkers: 1,
      maxWorkers: 1,
      taskTimeoutMs: -1,
    })).toThrow("taskTimeoutMs must be >= 0");
  });
});

// ─── execute() round-trip with real blob workers ───────────────────

/** Blob URL for an echo worker that returns payloads unchanged. */
const ECHO_WORKER_CODE = `self.onmessage = (e) => {
  if (e.data.type === "task") {
    postMessage({ type: "result", id: e.data.id, ok: true, value: e.data.payload });
  }
};`;

function createEchoWorkerUrl(): string {
  return URL.createObjectURL(new Blob([ECHO_WORKER_CODE], { type: "application/javascript" }));
}

describe("UltraWorkerPool execute round-trip", () => {
  test("echoes string payload via blob worker", async () => {
    const url = createEchoWorkerUrl();

    const pool = new UltraWorkerPool<string, string>({
      workerUrl: url,
      minWorkers: 1,
      maxWorkers: 1,
    });
    pools.push(pool);

    const result = await pool.execute("hello-world");
    expect(result).toBe("hello-world");

    pool.terminateAll();
    URL.revokeObjectURL(url);
  });

  test("round-trips structured object payload", async () => {
    const url = createEchoWorkerUrl();

    const pool = new UltraWorkerPool<{ name: string; count: number }, { name: string; count: number }>({
      workerUrl: url,
      minWorkers: 1,
      maxWorkers: 1,
    });
    pools.push(pool);

    const payload = { name: "test", count: 42 };
    const result = await pool.execute(payload);
    expect(result).toEqual(payload);

    pool.terminateAll();
    URL.revokeObjectURL(url);
  });
});

// ─── Priority queue ordering ───────────────────────────────────────
describe("UltraWorkerPool priority ordering", () => {
  test("higher priority executes first", async () => {
    using spy = spyOn(globalThis, "Worker");
    const workers: FakeWorker[] = [];
    spy.mockImplementation((() => {
      const w = new FakeWorker({ autoReply: false });
      workers.push(w);
      return w;
    }) as any);

    const pool = new UltraWorkerPool<string, string>({
      workerUrl: "./fake.ts",
      minWorkers: 1,
      maxWorkers: 1,
    });
    pools.push(pool);

    const order: string[] = [];

    // First task occupies the only worker
    const first = pool.execute("blocking", 0);
    // Queue 3 more with different priorities
    const low = pool.execute("low", 1).then((v) => { order.push(v); return v; });
    const high = pool.execute("high", 3).then((v) => { order.push(v); return v; });
    const mid = pool.execute("mid", 2).then((v) => { order.push(v); return v; });

    await Bun.sleep(5);

    // Complete the blocking task — worker picks from priority queue
    const w = workers[0];
    const blockingMsg: WorkerResultMessage<string> = { type: "result", id: 1, ok: true, value: "ok:blocking" };
    w.emit("message", { data: blockingMsg });

    await Bun.sleep(5);
    // Complete high priority (id 3, popped first from queue)
    const highMsg: WorkerResultMessage<string> = { type: "result", id: 3, ok: true, value: "ok:high" };
    w.emit("message", { data: highMsg });

    await Bun.sleep(5);
    // Complete mid priority (id 4, next in queue)
    const midMsg: WorkerResultMessage<string> = { type: "result", id: 4, ok: true, value: "ok:mid" };
    w.emit("message", { data: midMsg });

    await Bun.sleep(5);
    // Complete low priority (id 2, last)
    const lowMsg: WorkerResultMessage<string> = { type: "result", id: 2, ok: true, value: "ok:low" };
    w.emit("message", { data: lowMsg });

    await Promise.all([first, low, high, mid]);

    expect(order).toEqual(["ok:high", "ok:mid", "ok:low"]);
  });

  test("equal priority maintains FIFO order", async () => {
    using spy = spyOn(globalThis, "Worker");
    const workers: FakeWorker[] = [];
    spy.mockImplementation((() => {
      const w = new FakeWorker({ autoReply: false });
      workers.push(w);
      return w;
    }) as any);

    const pool = new UltraWorkerPool<string, string>({
      workerUrl: "./fake.ts",
      minWorkers: 1,
      maxWorkers: 1,
    });
    pools.push(pool);

    const order: string[] = [];

    // First task occupies the worker
    const first = pool.execute("blocking", 0);
    // Queue 3 with equal priority
    const a = pool.execute("a", 1).then((v) => { order.push(v); return v; });
    const b = pool.execute("b", 1).then((v) => { order.push(v); return v; });
    const c = pool.execute("c", 1).then((v) => { order.push(v); return v; });

    await Bun.sleep(5);
    const w = workers[0];

    // Complete blocking
    w.emit("message", { data: { type: "result", id: 1, ok: true, value: "ok:blocking" } });
    await Bun.sleep(5);

    // Complete a (id 2)
    w.emit("message", { data: { type: "result", id: 2, ok: true, value: "ok:a" } });
    await Bun.sleep(5);

    // Complete b (id 3)
    w.emit("message", { data: { type: "result", id: 3, ok: true, value: "ok:b" } });
    await Bun.sleep(5);

    // Complete c (id 4)
    w.emit("message", { data: { type: "result", id: 4, ok: true, value: "ok:c" } });

    await Promise.all([first, a, b, c]);

    expect(order).toEqual(["ok:a", "ok:b", "ok:c"]);
  });
});

// ─── Dynamic scaling ───────────────────────────────────────────────
describe("UltraWorkerPool dynamic scaling", () => {
  test("spawns additional workers under load", async () => {
    using spy = spyOn(globalThis, "Worker");
    const workers: FakeWorker[] = [];
    spy.mockImplementation((() => {
      const w = new FakeWorker({ autoReply: false });
      workers.push(w);
      return w;
    }) as any);

    const pool = new UltraWorkerPool<string, string>({
      workerUrl: "./fake.ts",
      minWorkers: 1,
      maxWorkers: 3,
    });
    pools.push(pool);

    expect(workers).toHaveLength(1);

    // Occupy worker 1
    const t1 = pool.execute("task1").catch(() => undefined);
    await Bun.sleep(5);

    // Enqueue more to trigger scale-up
    const t2 = pool.execute("task2").catch(() => undefined);
    await Bun.sleep(5);
    expect(workers.length).toBeGreaterThan(1);

    const t3 = pool.execute("task3").catch(() => undefined);
    await Bun.sleep(5);
    expect(workers.length).toBeGreaterThan(2);

    pool.terminateAll();
    await Promise.allSettled([t1, t2, t3]);
  });

  test("does not exceed maxWorkers", async () => {
    using spy = spyOn(globalThis, "Worker");
    const workers: FakeWorker[] = [];
    spy.mockImplementation((() => {
      const w = new FakeWorker({ autoReply: false });
      workers.push(w);
      return w;
    }) as any);

    const pool = new UltraWorkerPool<string, string>({
      workerUrl: "./fake.ts",
      minWorkers: 1,
      maxWorkers: 2,
    });
    pools.push(pool);

    // Fire many tasks to try to force scaling beyond max
    const tasks = Array.from({ length: 10 }, (_, i) =>
      pool.execute(`task-${i}`).catch(() => undefined)
    );
    await Bun.sleep(10);

    expect(workers.length).toBeLessThanOrEqual(2);

    pool.terminateAll();
    await Promise.allSettled(tasks);
  });
});

// ─── fastPath optimization ─────────────────────────────────────────
describe("UltraWorkerPool fastPath", () => {
  test("simple payloads pass through unchanged", async () => {
    using spy = spyOn(globalThis, "Worker");
    let postedPayload: unknown;
    spy.mockImplementation((() => {
      const w = new FakeWorker({ autoReply: false });
      w.postMessage = (msg: any) => {
        postedPayload = msg.payload;
        setTimeout(() => {
          w.emit("message", { data: { type: "result", id: msg.id, ok: true, value: msg.payload } });
        }, 0);
      };
      return w;
    }) as any);

    const pool = new UltraWorkerPool<{ x: number; name: string }, any>({
      workerUrl: "./fake.ts",
      minWorkers: 1,
      maxWorkers: 1,
      fastPath: true,
    });
    pools.push(pool);

    const payload = { x: 42, name: "test" };
    await pool.execute(payload);
    expect(postedPayload).toEqual(payload);
  });

  test("complex objects with non-plain prototype are preserved", async () => {
    using spy = spyOn(globalThis, "Worker");
    let postedPayload: unknown;
    spy.mockImplementation((() => {
      const w = new FakeWorker({ autoReply: false });
      w.postMessage = (msg: any) => {
        postedPayload = msg.payload;
        setTimeout(() => {
          w.emit("message", { data: { type: "result", id: msg.id, ok: true, value: msg.payload } });
        }, 0);
      };
      return w;
    }) as any);

    const pool = new UltraWorkerPool<any, any>({
      workerUrl: "./fake.ts",
      minWorkers: 1,
      maxWorkers: 1,
      fastPath: true,
    });
    pools.push(pool);

    class Custom { data = [1, 2, 3]; }
    const payload = new Custom();
    await pool.execute(payload);
    // Non-plain prototype object should still be sent as-is
    expect(postedPayload).toEqual(payload);
  });
});

// ─── getStats() accuracy ───────────────────────────────────────────
describe("UltraWorkerPool getStats", () => {
  test("reports accurate stats after mixed operations", async () => {
    using spy = spyOn(globalThis, "Worker");
    let workerCount = 0;
    spy.mockImplementation((() => {
      workerCount++;
      return new FakeWorker({ autoReply: true, replyDelayMs: 0 });
    }) as any);

    const pool = new UltraWorkerPool<string, string>({
      workerUrl: "./fake.ts",
      minWorkers: 2,
      maxWorkers: 4,
    });
    pools.push(pool);

    // Execute several tasks
    await pool.execute("a");
    await pool.execute("b");
    await pool.execute("c");

    const stats = pool.getStats();
    expect(stats.workers).toBeGreaterThanOrEqual(2);
    expect(stats.createdWorkers).toBeGreaterThanOrEqual(2);
    expect(stats.queuedTasks).toBe(0);
    expect(stats.inFlightTasks).toBe(0);
    expect(stats.timedOutTasks).toBe(0);
    expect(stats.rejectedTasks).toBe(0);
  });
});

// ─── terminateAll + closed state ───────────────────────────────────
describe("UltraWorkerPool terminateAll", () => {
  test("rejects pending queued tasks on terminateAll", async () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => new FakeWorker({ autoReply: false })) as any);

    const pool = new UltraWorkerPool<string, string>({
      workerUrl: "./fake.ts",
      minWorkers: 1,
      maxWorkers: 1,
    });
    pools.push(pool);

    // Occupy the worker
    const t1 = pool.execute("blocking");
    // Queue another
    const t2 = pool.execute("queued");

    // Attach catch handlers before terminateAll to prevent unhandled rejection
    t1.catch(() => {});
    t2.catch(() => {});

    await Bun.sleep(5);
    pool.terminateAll("shutting down");

    await expect(t1).rejects.toThrow("shutting down");
    await expect(t2).rejects.toThrow("shutting down");
  });

  test("execute throws after terminateAll", async () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => new FakeWorker()) as any);

    const pool = new UltraWorkerPool<string, string>({
      workerUrl: "./fake.ts",
      minWorkers: 1,
      maxWorkers: 1,
    });
    // Don't push to pools array since we terminate manually
    pool.terminateAll();

    await expect(pool.execute("after-close")).rejects.toThrow("UltraWorkerPool is closed");
  });
});

// ─── unref() ───────────────────────────────────────────────────────
describe("UltraWorkerPool unref", () => {
  test("calls unref() on all pool workers", () => {
    using spy = spyOn(globalThis, "Worker");
    const workers: FakeWorker[] = [];
    const unrefCalls: FakeWorker[] = [];

    spy.mockImplementation((() => {
      const w = new FakeWorker();
      const originalUnref = w.unref.bind(w);
      w.unref = () => { unrefCalls.push(w); originalUnref(); };
      workers.push(w);
      return w;
    }) as any);

    const pool = new UltraWorkerPool<string, string>({
      workerUrl: "./fake.ts",
      minWorkers: 3,
      maxWorkers: 3,
    });
    pools.push(pool);

    expect(workers).toHaveLength(3);
    pool.unref();
    expect(unrefCalls).toHaveLength(3);
  });
});

// ─── Worker replacement restores minWorkers ────────────────────────
describe("UltraWorkerPool worker replacement", () => {
  test("auto-spawns back to minWorkers after worker close", async () => {
    using spy = spyOn(globalThis, "Worker");
    const workers: FakeWorker[] = [];
    spy.mockImplementation((() => {
      const w = new FakeWorker({ autoReply: true });
      workers.push(w);
      return w;
    }) as any);

    const pool = new UltraWorkerPool<string, string>({
      workerUrl: "./fake.ts",
      minWorkers: 2,
      maxWorkers: 4,
    });
    pools.push(pool);

    expect(workers).toHaveLength(2);

    // Simulate worker 0 closing
    workers[0].emit("close", { code: 0 });
    await Bun.sleep(10);

    // Pool should have spawned a replacement
    const stats = pool.getStats();
    expect(stats.workers).toBeGreaterThanOrEqual(2);
    expect(stats.replacedWorkers).toBeGreaterThanOrEqual(1);
  });
});
