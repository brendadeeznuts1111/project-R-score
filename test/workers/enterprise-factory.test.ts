import { describe, test, expect, beforeEach, spyOn } from "bun:test";
import {
  type WorkerType,
  EnterpriseWorkerFactory,
} from "../../workers/enterprise-factory";

let factory: EnterpriseWorkerFactory;

beforeEach(() => {
  factory = new EnterpriseWorkerFactory();
});

// ─── Resource Limits ───────────────────────────────────────────────
describe("Resource limits", () => {
  test("cpu: largest young gen", () => {
    const limits = EnterpriseWorkerFactory.getResourceLimits("cpu");
    expect(limits.maxOldGenerationSizeMb).toBe(4096);
    expect(limits.maxYoungGenerationSizeMb).toBe(512);
  });

  test("io: smallest limits", () => {
    const limits = EnterpriseWorkerFactory.getResourceLimits("io");
    expect(limits.maxOldGenerationSizeMb).toBe(1024);
    expect(limits.maxYoungGenerationSizeMb).toBe(128);
  });

  test("memory: largest old gen", () => {
    const limits = EnterpriseWorkerFactory.getResourceLimits("memory");
    expect(limits.maxOldGenerationSizeMb).toBe(8192);
    expect(limits.maxYoungGenerationSizeMb).toBe(1024);
  });

  test("network: mid-range limits", () => {
    const limits = EnterpriseWorkerFactory.getResourceLimits("network");
    expect(limits.maxOldGenerationSizeMb).toBe(2048);
    expect(limits.maxYoungGenerationSizeMb).toBe(256);
  });

  test("returns a copy, not the original", () => {
    const a = EnterpriseWorkerFactory.getResourceLimits("cpu");
    const b = EnterpriseWorkerFactory.getResourceLimits("cpu");
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

// ─── Worker Creation ───────────────────────────────────────────────
describe("create", () => {
  test("creates worker with correct smol/ref for each type", () => {
    const cases: { type: WorkerType; smol: boolean }[] = [
      { type: "cpu", smol: false },
      { type: "io", smol: true },
      { type: "memory", smol: false },
      { type: "network", smol: true },
    ];

    for (const { type, smol } of cases) {
      using spy = spyOn(globalThis, "Worker");
      spy.mockImplementation((() => ({
        terminate() {},
        addEventListener() {},
        removeEventListener() {},
      })) as any);

      factory.create({ id: `w-${type}`, script: "./w.ts", type, priority: 1 });

      const [, opts] = spy.mock.calls[0] as [string, any];
      expect(opts.smol).toBe(smol);
      expect(opts.name).toBe(`w-${type}`);
    }
  });

  test("priority 0 sets ref: false", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({
      terminate() {},
      addEventListener() {},
      removeEventListener() {},
    })) as any);

    factory.create({ id: "low-pri", script: "./w.ts", type: "io", priority: 0 });

    const [, opts] = spy.mock.calls[0] as [string, any];
    expect(opts.ref).toBe(false);
  });

  test("priority > 0 sets ref: true", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({
      terminate() {},
      addEventListener() {},
      removeEventListener() {},
    })) as any);

    factory.create({ id: "hi-pri", script: "./w.ts", type: "cpu", priority: 5 });

    const [, opts] = spy.mock.calls[0] as [string, any];
    expect(opts.ref).toBe(true);
  });

  test("throws on duplicate id", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({
      terminate() {},
      addEventListener() {},
      removeEventListener() {},
    })) as any);

    factory.create({ id: "dup", script: "./w.ts", type: "io", priority: 1 });

    expect(() => {
      factory.create({ id: "dup", script: "./w.ts", type: "io", priority: 1 });
    }).toThrow('Worker "dup" already exists');
  });
});

// ─── Registry ──────────────────────────────────────────────────────
describe("Registry", () => {
  function mockCreate(id: string, type: WorkerType = "io") {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({
      terminate() {},
      addEventListener() {},
      removeEventListener() {},
    })) as any);
    return factory.create({ id, script: "./w.ts", type, priority: 1 });
  }

  test("get returns worker by id", () => {
    const worker = mockCreate("reg-1");
    expect(factory.get("reg-1")).toBe(worker);
  });

  test("get returns undefined for unknown id", () => {
    expect(factory.get("ghost")).toBeUndefined();
  });

  test("size tracks count", () => {
    expect(factory.size).toBe(0);
    mockCreate("s-1");
    expect(factory.size).toBe(1);
    mockCreate("s-2");
    expect(factory.size).toBe(2);
  });

  test("terminate removes worker", () => {
    mockCreate("t-1");
    expect(factory.terminate("t-1")).toBe(true);
    expect(factory.size).toBe(0);
    expect(factory.get("t-1")).toBeUndefined();
  });

  test("terminate returns false for unknown", () => {
    expect(factory.terminate("ghost")).toBe(false);
  });

  test("terminateAll clears everything", () => {
    mockCreate("a-1");
    mockCreate("a-2");
    mockCreate("a-3");

    const count = factory.terminateAll();
    expect(count).toBe(3);
    expect(factory.size).toBe(0);
  });
});

// ─── Metrics ───────────────────────────────────────────────────────
describe("Metrics", () => {
  test("initial metrics after creation", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({
      terminate() {},
      addEventListener() {},
      removeEventListener() {},
    })) as any);

    factory.create({ id: "m-1", script: "./w.ts", type: "cpu", priority: 1 });

    const m = factory.getMetrics("m-1");
    expect(m).toBeDefined();
    expect(m!.id).toBe("m-1");
    expect(m!.messageCount).toBe(0);
    expect(m!.errorCount).toBe(0);
    expect(m!.errorRate).toBe(0);
    expect(m!.uptime).toBeGreaterThanOrEqual(0);
  });

  test("getMetrics returns undefined for unknown id", () => {
    expect(factory.getMetrics("ghost")).toBeUndefined();
  });

  test("getAllMetrics returns snapshots for all workers", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({
      terminate() {},
      addEventListener() {},
      removeEventListener() {},
    })) as any);

    factory.create({ id: "all-1", script: "./w.ts", type: "io", priority: 1 });
    factory.create({ id: "all-2", script: "./w.ts", type: "cpu", priority: 1 });

    const all = factory.getAllMetrics();
    expect(all).toHaveLength(2);
    expect(all.map((m) => m.id).sort()).toEqual(["all-1", "all-2"]);
  });

  test("metrics cleared after terminate", () => {
    using spy = spyOn(globalThis, "Worker");
    spy.mockImplementation((() => ({
      terminate() {},
      addEventListener() {},
      removeEventListener() {},
    })) as any);

    factory.create({ id: "cl-1", script: "./w.ts", type: "io", priority: 1 });
    factory.terminate("cl-1");

    expect(factory.getMetrics("cl-1")).toBeUndefined();
    expect(factory.getAllMetrics()).toHaveLength(0);
  });
});
