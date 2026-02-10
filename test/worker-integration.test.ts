import { describe, test, expect, afterEach, spyOn } from "bun:test";
import { setEnvironmentData, getEnvironmentData } from "worker_threads";
import {
  createWorker,
  getWorkerEntry,
  terminateWorker,
  terminateAll,
  getRegistrySize,
  setGlobalWorkerConfig,
  getGlobalWorkerConfig,
  _resetRegistry,
} from "../workers/factory";

afterEach(() => {
  _resetRegistry();
});

// ─── Blob URL Workers ──────────────────────────────────────────────
describe("blob-worker", () => {
  test("creates a worker from a blob: URL with TypeScript", () => {
    const source = `
      declare var self: Worker;
      self.onmessage = (event: MessageEvent) => {
        postMessage({ echo: event.data });
      };
    `;
    const blob = new Blob([source], { type: "application/typescript" });
    const url = URL.createObjectURL(blob);

    expect(url).toMatch(/^blob:/);

    // Verify the factory accepts blob URLs
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    const { worker, id } = createWorker({
      taskType: "light",
      script: url,
      threadId: "blob-test-1",
    });

    const [script] = spy.mock.calls[0] as [string, any];
    expect(script).toBe(url);
    expect(id).toBe("blob-test-1");

    URL.revokeObjectURL(url);
  });

  test("blob worker with File constructor preserves filename for type detection", () => {
    const source = `self.onmessage = (event: MessageEvent) => postMessage(event.data);`;
    const file = new File([source], "echo-worker.ts");
    const url = URL.createObjectURL(file);

    expect(url).toMatch(/^blob:/);

    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({ taskType: "background", script: url });

    const [script] = spy.mock.calls[0] as [string, any];
    expect(script).toBe(url);

    URL.revokeObjectURL(url);
  });

  test("blob worker with binaryType blob (WebSocket regression)", () => {
    // Validates the blob: URL path that was crashing in older Bun versions
    const source = `
      declare var self: Worker;
      self.onmessage = (event: MessageEvent) => {
        const ws = { binaryType: "blob" as const };
        postMessage({ binaryType: ws.binaryType });
      };
    `;
    const blob = new Blob([source], { type: "application/typescript" });
    const url = URL.createObjectURL(blob);

    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({
      terminate() {},
      postMessage() {},
      addEventListener() {},
    })) as any);

    const { worker } = createWorker({
      taskType: "light",
      script: url,
      threadId: "blob-binary-test",
    });

    expect(spy).toHaveBeenCalledTimes(1);
    URL.revokeObjectURL(url);
  });
});

// ─── Preload Module Sharing ────────────────────────────────────────
describe("preload-modules", () => {
  test("default preload includes shared-utils", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({ taskType: "heavy", script: "./worker.ts" });

    const [, opts] = spy.mock.calls[0] as [string, any];
    expect(opts.preload).toEqual(["./shared-utils.ts"]);
  });

  test("custom preload overrides default", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({
      taskType: "heavy",
      script: "./worker.ts",
      preloadScripts: ["./sentry.ts", "./datadog.ts"],
    });

    const [, opts] = spy.mock.calls[0] as [string, any];
    expect(opts.preload).toEqual(["./sentry.ts", "./datadog.ts"]);
    expect(opts.preload).not.toContain("./shared-utils.ts");
  });

  test("preload is consistent across all task types", () => {
    const customPreload = ["./telemetry.ts"];
    const types = ["heavy", "light", "background", "critical"] as const;

    for (const taskType of types) {
      using spy = spyOn(globalThis, "Worker");
      spy.mockImplementation((() => ({ terminate() {} })) as any);

      createWorker({ taskType, script: "./w.ts", preloadScripts: customPreload });

      const [, opts] = spy.mock.calls[0] as [string, any];
      expect(opts.preload).toEqual(customPreload);
    }
  });

  test("empty preload array passes through", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({
      taskType: "light",
      script: "./worker.ts",
      preloadScripts: [],
    });

    const [, opts] = spy.mock.calls[0] as [string, any];
    expect(opts.preload).toEqual([]);
  });
});

// ─── Environment Data Isolation ────────────────────────────────────
describe("environment-data", () => {
  test("setGlobalWorkerConfig stores structured data via worker_threads", () => {
    const key = `__TEST_ENV_${Date.now()}`;
    setGlobalWorkerConfig({ [key]: { nested: true, count: 42 } });

    const retrieved = getGlobalWorkerConfig(key);
    expect(retrieved).toEqual({ nested: true, count: 42 });
  });

  test("per-worker environmentData is converted to Map", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({
      taskType: "light",
      script: "./w.ts",
      environmentData: { DB_HOST: "localhost", DB_PORT: 5432 },
    });

    const [, opts] = spy.mock.calls[0] as [string, any];
    expect(opts.environmentData).toBeInstanceOf(Map);
    expect(opts.environmentData.get("DB_HOST")).toBe("localhost");
    expect(opts.environmentData.get("DB_PORT")).toBe(5432);
  });

  test("workers without environmentData get undefined (no empty Map)", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({ taskType: "light", script: "./w.ts" });

    const [, opts] = spy.mock.calls[0] as [string, any];
    expect(opts.environmentData).toBeUndefined();
  });

  test("different workers can have different environmentData", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({
      taskType: "heavy",
      script: "./a.ts",
      threadId: "env-a",
      environmentData: { ROLE: "primary" },
    });

    createWorker({
      taskType: "light",
      script: "./b.ts",
      threadId: "env-b",
      environmentData: { ROLE: "replica" },
    });

    const entryA = getWorkerEntry("env-a")!;
    const entryB = getWorkerEntry("env-b")!;
    expect(entryA.config.environmentData!.ROLE).toBe("primary");
    expect(entryB.config.environmentData!.ROLE).toBe("replica");
  });

  test("global config is independent of per-worker config", () => {
    const globalKey = `__TEST_GLOBAL_${Date.now()}`;
    setGlobalWorkerConfig({ [globalKey]: "global-val" });

    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({
      taskType: "light",
      script: "./w.ts",
      environmentData: { LOCAL: "local-val" },
    });

    // Global config accessible via worker_threads API
    expect(getGlobalWorkerConfig(globalKey)).toBe("global-val");

    // Per-worker config is in the Worker constructor options
    const [, opts] = spy.mock.calls[0] as [string, any];
    expect(opts.environmentData.get("LOCAL")).toBe("local-val");
    expect(opts.environmentData.has(globalKey)).toBe(false);
  });
});

// ─── Worker Termination ────────────────────────────────────────────
describe("worker-termination", () => {
  function mockCreate(threadId: string, taskType: "heavy" | "light" | "background" | "critical" = "light") {
    using spy = spyOn(globalThis, "Worker");
    const fakeWorker = { terminate: () => {}, ref: () => {}, unref: () => {} };
    spy.mockImplementation((() => fakeWorker) as any);
    return createWorker({ taskType, script: "./w.ts", threadId });
  }

  test("terminateWorker calls worker.terminate() and removes from registry", () => {
    using spy = spyOn(globalThis, "Worker");
    let terminateCalled = false;
    spy.mockImplementation((() => ({
      terminate() { terminateCalled = true; },
    })) as any);

    createWorker({ taskType: "light", script: "./w.ts", threadId: "term-1" });
    expect(getRegistrySize()).toBe(1);

    terminateWorker("term-1");
    expect(terminateCalled).toBe(true);
    expect(getRegistrySize()).toBe(0);
    expect(getWorkerEntry("term-1")).toBeUndefined();
  });

  test("terminateWorker returns false for non-existent worker", () => {
    expect(terminateWorker("ghost")).toBe(false);
  });

  test("terminateAll terminates every registered worker", () => {
    using spy = spyOn(globalThis, "Worker");
    let terminateCount = 0;
    spy.mockImplementation((() => ({
      terminate() { terminateCount++; },
    })) as any);

    createWorker({ taskType: "heavy", script: "./a.ts", threadId: "t-1" });
    createWorker({ taskType: "light", script: "./b.ts", threadId: "t-2" });
    createWorker({ taskType: "background", script: "./c.ts", threadId: "t-3" });
    createWorker({ taskType: "critical", script: "./d.ts", threadId: "t-4" });

    expect(getRegistrySize()).toBe(4);

    const count = terminateAll();
    expect(count).toBe(4);
    expect(terminateCount).toBe(4);
    expect(getRegistrySize()).toBe(0);
  });

  test("terminateAll returns 0 on empty registry", () => {
    expect(terminateAll()).toBe(0);
  });

  test("background workers have ref: false (process won't wait)", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({ taskType: "background", script: "./bg.ts", threadId: "bg-1" });

    const [, opts] = spy.mock.calls[0] as [string, any];
    expect(opts.ref).toBe(false);
  });

  test("double terminate is safe (second returns false)", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({ taskType: "light", script: "./w.ts", threadId: "dbl-1" });

    expect(terminateWorker("dbl-1")).toBe(true);
    expect(terminateWorker("dbl-1")).toBe(false);
  });
});
