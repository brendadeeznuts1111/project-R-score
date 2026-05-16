import { describe, test, expect, beforeEach, spyOn } from "bun:test";
import {
  type WorkerTaskType,
  type WorkerPriority,
  createWorker,
  getTaskDefaults,
  getWorkerEntry,
  getAllWorkerIds,
  terminateWorker,
  terminateAll,
  getRegistrySize,
  setGlobalWorkerConfig,
  getGlobalWorkerConfig,
  _resetRegistry,
} from "../workers/factory";

beforeEach(() => {
  _resetRegistry();
});

// ─── Task Defaults ─────────────────────────────────────────────────
describe("getTaskDefaults", () => {
  test("heavy: full stack, ref'd, 2048MB old gen", () => {
    const d = getTaskDefaults("heavy");
    expect(d.smol).toBe(false);
    expect(d.ref).toBe(true);
    expect(d.resourceLimits.maxOldGenerationSizeMb).toBe(2048);
    expect(d.resourceLimits.maxYoungGenerationSizeMb).toBe(256);
  });

  test("light: smol stack, ref'd, 512MB old gen", () => {
    const d = getTaskDefaults("light");
    expect(d.smol).toBe(true);
    expect(d.ref).toBe(true);
    expect(d.resourceLimits.maxOldGenerationSizeMb).toBe(512);
    expect(d.resourceLimits.maxYoungGenerationSizeMb).toBe(128);
  });

  test("background: smol stack, unref'd, 256MB old gen", () => {
    const d = getTaskDefaults("background");
    expect(d.smol).toBe(true);
    expect(d.ref).toBe(false);
    expect(d.resourceLimits.maxOldGenerationSizeMb).toBe(256);
    expect(d.resourceLimits.maxYoungGenerationSizeMb).toBe(64);
  });

  test("critical: full stack, ref'd, 1024MB old gen", () => {
    const d = getTaskDefaults("critical");
    expect(d.smol).toBe(false);
    expect(d.ref).toBe(true);
    expect(d.resourceLimits.maxOldGenerationSizeMb).toBe(1024);
    expect(d.resourceLimits.maxYoungGenerationSizeMb).toBe(192);
  });

  test("only heavy and critical get full stack (smol: false)", () => {
    const types: WorkerTaskType[] = ["heavy", "light", "background", "critical"];
    for (const t of types) {
      const d = getTaskDefaults(t);
      if (t === "heavy" || t === "critical") {
        expect(d.smol).toBe(false);
      } else {
        expect(d.smol).toBe(true);
      }
    }
  });

  test("only background is unref'd", () => {
    const types: WorkerTaskType[] = ["heavy", "light", "background", "critical"];
    for (const t of types) {
      const d = getTaskDefaults(t);
      expect(d.ref).toBe(t !== "background");
    }
  });

  test("returns a copy, not the original", () => {
    const a = getTaskDefaults("heavy");
    const b = getTaskDefaults("heavy");
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

// ─── createWorker ──────────────────────────────────────────────────
describe("createWorker", () => {
  test("passes correct smol/ref for each task type", () => {
    const types: WorkerTaskType[] = ["heavy", "light", "background", "critical"];

    for (const taskType of types) {
      using spy = spyOn(globalThis, "Worker");
      spy.mockImplementation((() => ({ terminate() {} })) as any);

      createWorker({ taskType, script: "./test.ts" });

      const [, opts] = spy.mock.calls[0] as [string, any];
      const defaults = getTaskDefaults(taskType);
      expect(opts.smol).toBe(defaults.smol);
      expect(opts.ref).toBe(defaults.ref);
    }
  });

  test("uses default preload when none specified", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({ taskType: "light", script: "./test.ts" });

    const [, opts] = spy.mock.calls[0] as [string, any];
    expect(opts.preload).toEqual(["./shared-utils.ts"]);
  });

  test("uses custom preload when specified", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({
      taskType: "light",
      script: "./test.ts",
      preloadScripts: ["./custom.ts"],
    });

    const [, opts] = spy.mock.calls[0] as [string, any];
    expect(opts.preload).toEqual(["./custom.ts"]);
  });

  test("returns worker, id, and initial metrics", () => {
    using spy = spyOn(globalThis, "Worker");
    const fakeWorker = { terminate() {} };
    spy.mockImplementation((() => fakeWorker) as any);

    const result = createWorker({ taskType: "heavy", script: "./test.ts" });

    expect(result.worker).toBe(fakeWorker);
    expect(typeof result.id).toBe("string");
    expect(result.metrics.taskCount).toBe(0);
    expect(result.metrics.created).toBeInstanceOf(Date);
    expect(result.metrics.lastActive).toBeInstanceOf(Date);
  });

  test("uses custom threadId when provided", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    const result = createWorker({
      taskType: "heavy",
      script: "./test.ts",
      threadId: "my-worker-1",
    });

    expect(result.id).toBe("my-worker-1");
  });

  test("generates unique ids when threadId not provided", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    const a = createWorker({ taskType: "light", script: "./a.ts" });
    const b = createWorker({ taskType: "light", script: "./b.ts" });

    expect(a.id).not.toBe(b.id);
  });

  test("converts environmentData record to Map for Worker", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({
      taskType: "light",
      script: "./test.ts",
      environmentData: { API_URL: "https://api.internal", REGION: "us-east-1" },
    });

    const [, opts] = spy.mock.calls[0] as [string, any];
    expect(opts.environmentData).toBeInstanceOf(Map);
    expect(opts.environmentData.get("API_URL")).toBe("https://api.internal");
    expect(opts.environmentData.get("REGION")).toBe("us-east-1");
  });

  test("omits environmentData when not provided", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({ taskType: "light", script: "./test.ts" });

    const [, opts] = spy.mock.calls[0] as [string, any];
    expect(opts.environmentData).toBeUndefined();
  });

  test("uses custom name or falls back to id", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);

    createWorker({ taskType: "light", script: "./test.ts", name: "my-worker" });
    const [, opts1] = spy.mock.calls[0] as [string, any];
    expect(opts1.name).toBe("my-worker");
  });
});

// ─── Registry ──────────────────────────────────────────────────────
describe("Worker registry", () => {
  function mockAndCreate(taskType: WorkerTaskType, threadId?: string) {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({ terminate() {} })) as any);
    return createWorker({ taskType, script: "./test.ts", threadId });
  }

  test("registers workers on creation", () => {
    expect(getRegistrySize()).toBe(0);
    const { id } = mockAndCreate("light", "reg-1");
    expect(getRegistrySize()).toBe(1);
    expect(getWorkerEntry(id)).toBeDefined();
  });

  test("getWorkerEntry returns config and metrics", () => {
    const { id } = mockAndCreate("critical", "reg-2");
    const entry = getWorkerEntry(id)!;
    expect(entry.config.taskType).toBe("critical");
    expect(entry.metrics.taskCount).toBe(0);
  });

  test("getAllWorkerIds returns all registered ids", () => {
    mockAndCreate("heavy", "w-1");
    mockAndCreate("light", "w-2");
    mockAndCreate("background", "w-3");

    const ids = getAllWorkerIds();
    expect(ids).toContain("w-1");
    expect(ids).toContain("w-2");
    expect(ids).toContain("w-3");
    expect(ids).toHaveLength(3);
  });

  test("getWorkerEntry returns undefined for unknown id", () => {
    expect(getWorkerEntry("nonexistent")).toBeUndefined();
  });

  test("terminateWorker removes from registry", () => {
    mockAndCreate("light", "term-1");
    expect(getRegistrySize()).toBe(1);

    const removed = terminateWorker("term-1");
    expect(removed).toBe(true);
    expect(getRegistrySize()).toBe(0);
    expect(getWorkerEntry("term-1")).toBeUndefined();
  });

  test("terminateWorker returns false for unknown id", () => {
    expect(terminateWorker("nonexistent")).toBe(false);
  });

  test("terminateAll clears entire registry", () => {
    mockAndCreate("heavy", "all-1");
    mockAndCreate("light", "all-2");
    mockAndCreate("critical", "all-3");
    expect(getRegistrySize()).toBe(3);

    const count = terminateAll();
    expect(count).toBe(3);
    expect(getRegistrySize()).toBe(0);
  });
});

// ─── setGlobalWorkerConfig / getGlobalWorkerConfig ─────────────────
describe("setGlobalWorkerConfig", () => {
  test("sets and retrieves string values via worker_threads environmentData", () => {
    const key = `__TEST_FACTORY_${Date.now()}`;
    setGlobalWorkerConfig({ [key]: "test-value" });
    expect(getGlobalWorkerConfig(key)).toBe("test-value");
  });

  test("preserves non-string types (numbers, objects)", () => {
    const numKey = `__TEST_NUM_${Date.now()}`;
    const objKey = `__TEST_OBJ_${Date.now()}`;
    setGlobalWorkerConfig({
      [numKey]: 42,
      [objKey]: { apiUrl: "https://api.example.com" },
    });
    expect(getGlobalWorkerConfig(numKey)).toBe(42);
    expect(getGlobalWorkerConfig(objKey)).toEqual({ apiUrl: "https://api.example.com" });
  });

  test("returns undefined for unset keys", () => {
    expect(getGlobalWorkerConfig("__NEVER_SET__")).toBeUndefined();
  });
});
