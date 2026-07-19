// @see https://bun.com/docs/runtime/file-io — Bun.file
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  DEFAULT_GATE_MAP_PATH,
  formatGateMapTree,
  loadGateMap,
  projectMatchesChanges,
  resolveProjectPath,
  resolveProjects,
  validateGateMap,
} from "./gate-map.ts";
import {
  kimiCheckMetrics,
  parseKimiCheckJson,
} from "./gate-report-monorepo.ts";

describe("gate-map", () => {
  test("loads gate-map.json from ast-grep skill", async () => {
    const map = await loadGateMap(DEFAULT_GATE_MAP_PATH);
    expect(map.version).toBe(1);
    expect(map.projects.length).toBeGreaterThanOrEqual(6);
    expect(map.projects.map((p) => p.id)).toContain("plannator");
    expect(map.projects.map((p) => p.id)).toContain("sports-terminal-os");
    expect(map.projects.map((p) => p.id)).toContain("kimi-toolchain");
  });

  test("validateGateMap passes for committed manifest", async () => {
    const map = await loadGateMap(DEFAULT_GATE_MAP_PATH);
    const result = await validateGateMap(map);
    expect(result.ok).toBe(true);
  });

  test("resolveProjects filters by zone", async () => {
    const map = await loadGateMap(DEFAULT_GATE_MAP_PATH);
    const agents = resolveProjects(map, { zone: "agents" });
    expect(agents.every((p) => p.zone === "agents")).toBe(true);
    expect(agents.map((p) => p.id)).toContain("plannator");
  });

  test("resolveProjects filters by project id", async () => {
    const map = await loadGateMap(DEFAULT_GATE_MAP_PATH);
    const one = resolveProjects(map, { projectId: "plannator" });
    expect(one).toHaveLength(1);
    expect(one[0]?.id).toBe("plannator");
  });

  test("projectMatchesChanges respects project prefix", () => {
    const project = {
      id: "plannator",
      zone: "agents",
      name: "Plannator",
      path: "plannator",
      enabled: true,
      gates: [],
    };
    expect(projectMatchesChanges(project, ["plannator/lib/foo.ts"])).toBe(true);
    expect(projectMatchesChanges(project, ["projects/active/other/x.ts"])).toBe(false);
  });

  test("formatGateMapTree includes zones and gates", async () => {
    const map = await loadGateMap(DEFAULT_GATE_MAP_PATH);
    const tree = formatGateMapTree(map, map.projects.slice(0, 1));
    expect(tree).toContain("zone:");
    expect(tree).toContain("plannator");
    expect(tree).toContain("typecheck");
  });

  test("resolveProjectPath finds kimi-toolchain sibling repo", async () => {
    const map = {
      id: "kimi-toolchain",
      zone: "toolchain",
      name: "Kimi Toolchain",
      path: "../kimi-toolchain",
      pathEnv: "KIMI_TOOLCHAIN_ROOT",
      external: true,
      enabled: true,
      gates: [],
    };
    const resolved = resolveProjectPath(map);
    expect(resolved).toContain("kimi-toolchain");
    expect(await Bun.file(join(resolved, "package.json")).exists()).toBe(true);
  });
});

describe("kimi-toolchain check JSON adapter", () => {
  test("parseKimiCheckJson extracts step summary", () => {
    const stdout = `noise\n{"passed":true,"steps":{"lint":{"passed":true,"durationMs":120},"typecheck":{"passed":true,"durationMs":80}},"totalDurationMs":200}\n`;
    const summary = parseKimiCheckJson(stdout);
    expect(summary?.passed).toBe(true);
    expect(summary?.steps.lint?.durationMs).toBe(120);
    const metrics = kimiCheckMetrics(summary!);
    expect(metrics.steps).toBe(2);
    expect(metrics.passed).toBe(2);
  });
});