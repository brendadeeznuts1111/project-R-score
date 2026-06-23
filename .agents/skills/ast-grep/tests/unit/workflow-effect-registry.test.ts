import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { EffectRegistry } from "../../scripts/scan/transpiler/workflow-effects/registry.ts";
import { parseEffectFlags, mergeEffectConfigs } from "../../scripts/scan/transpiler/workflow-effects/config.ts";
import type { EffectContext, EffectPlugin } from "../../scripts/scan/transpiler/workflow-effects/plugin.ts";
import type { WorkflowScannerResult } from "../../scripts/scan/transpiler/workflow-loop.ts";
import {
  getPingCount,
  resetPingCount,
} from "../fixtures/workflow-effects/ping.ts";
import { captureBunRuntime } from "../../scripts/scan/transpiler/workflow-effects/runtime.ts";

const FIXTURES = resolve(import.meta.dir, "../fixtures/workflow-effects");

const sampleResult: WorkflowScannerResult = {
  scannerId: "semver",
  status: "fail",
  elapsedMs: 5,
  issues: [{ severity: "high", message: "test issue" }],
};

function baseCtx(overrides?: Partial<EffectContext>): EffectContext {
  return {
    domain: "test-domain",
    skillRoot: ".",
    repo: ".",
    results: [sampleResult],
    drift: { hasDrift: true },
    seedState: null,
    dryRun: false,
    failOnSeverity: "error",
    options: {},
    deps: {},
    bun: captureBunRuntime(),
    bunDrift: null,
    includeBunVersion: true,
    ...overrides,
  };
}

describe("EffectRegistry", () => {
  test("registers and lists built-in effects", () => {
    const registry = new EffectRegistry();
    const ids = registry.list().map((p) => p.id).sort();
    expect(ids).toEqual(["alert", "fix", "log", "report"]);
  });

  test("configure disables effects", async () => {
    const registry = new EffectRegistry(false);
    const ran: string[] = [];
    const plugin: EffectPlugin = {
      id: "trace",
      name: "Trace",
      description: "trace",
      async run() { ran.push("trace"); },
    };
    registry.register(plugin);
    registry.configure("trace", { enabled: false });
    await registry.runAll(baseCtx());
    expect(ran).toEqual([]);
  });

  test("runAll executes only enabled effects matching condition", async () => {
    const registry = new EffectRegistry(false);
    const ran: string[] = [];

    registry.register({
      id: "always",
      name: "Always",
      description: "always",
      async run() { ran.push("always"); },
    });
    registry.register({
      id: "conditional",
      name: "Conditional",
      description: "conditional",
      condition: (ctx) => ctx.results.some((r) => r.issues.length > 0),
      async run() { ran.push("conditional"); },
    });
    registry.register({
      id: "skip",
      name: "Skip",
      description: "skip",
      condition: () => false,
      async run() { ran.push("skip"); },
    });

    registry.configure("always", { enabled: true });
    registry.configure("conditional", { enabled: true });
    registry.configure("skip", { enabled: true });

    await registry.runAll(baseCtx());
    expect(ran.sort()).toEqual(["always", "conditional"]);
  });

  test("runAll executes effects in parallel", async () => {
    const registry = new EffectRegistry(false);
    const order: string[] = [];

    registry.register({
      id: "slow",
      name: "Slow",
      description: "slow",
      async run() {
        await new Promise((r) => setTimeout(r, 30));
        order.push("slow");
      },
    });
    registry.register({
      id: "fast",
      name: "Fast",
      description: "fast",
      async run() { order.push("fast"); },
    });
    registry.configure("slow", { enabled: true });
    registry.configure("fast", { enabled: true });

    await registry.runAll(baseCtx());
    expect(order[0]).toBe("fast");
    expect(order[1]).toBe("slow");
  });

  test("loadFromDirectory loads custom plugins", async () => {
    resetPingCount();
    const registry = new EffectRegistry(false);
    const loaded = await registry.loadFromDirectory(FIXTURES);
    expect(loaded).toBe(1);
    expect(registry.list().some((p) => p.id === "ping")).toBe(true);

    registry.configure("ping", { enabled: true });
    await registry.runAll(baseCtx({ results: [] }));
    expect(getPingCount()).toBe(1);
  });
});

describe("parseEffectFlags", () => {
  test("parses enable, disable, and param specs", () => {
    const cfg = parseEffectFlags([
      "alert.url=https://hooks.example.com/x",
      "log.enabled=false",
      "fix",
      "report.path=reports/out.md",
    ]);
    expect(cfg.alert?.enabled).toBe(true);
    expect(cfg.alert?.params?.url).toBe("https://hooks.example.com/x");
    expect(cfg.log?.enabled).toBe(false);
    expect(cfg.fix?.enabled).toBe(true);
    expect(cfg.report?.params?.path).toBe("reports/out.md");
  });

  test("mergeEffectConfigs layers overrides", () => {
    const merged = mergeEffectConfigs(
      { log: { enabled: true }, alert: { enabled: false, params: { url: "a" } } },
      { alert: { enabled: true, params: { url: "b" } } },
    );
    expect(merged.log?.enabled).toBe(true);
    expect(merged.alert?.enabled).toBe(true);
    expect(merged.alert?.params?.url).toBe("b");
  });
});