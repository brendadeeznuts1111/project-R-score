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
