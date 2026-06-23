import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  formatSeedStatus,
  seedNetworkBaseline,
  shouldSeedNetworkBaseline,
} from "../../scripts/scan/transpiler/network-seed.ts";
import {
  formatNetworkPointersJson,
  getGroundTruthReference,
  getNetworkModulePointer,
  NETWORK_CLI_FLAGS_HELP,
  NETWORK_GROUND_TRUTH_REFERENCES,
  NETWORK_MODULE_POINTERS,
  NETWORK_STANDARDS,
} from "../../scripts/scan/transpiler/network-pointers.ts";
import {
  validateNetworkGroundTruth,
} from "../../scripts/scan/transpiler/network-ground-truth-validator.ts";
import {
  auditResultFromTick,
  formatAuditHerdr,
  formatAuditJson,
  formatAuditTable,
  resolveAuditOutputFormat,
} from "../../scripts/scan/transpiler/network-audit-result.ts";
import {
  runNetworkAuditOnce,
  type NetworkLoopTick,
} from "../../scripts/scan/transpiler/network-loop.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

describe("network loop dry-run", () => {
  test("runNetworkAuditOnce returns structured audit result", async () => {
    const result = await runNetworkAuditOnce({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      scanPath: "projects/active/sports-terminal-os/dist/frontend",
      profileName: "supply-chain-network-dist",
      domain: "sports-terminal-os",
      verbose: true,
    });
    expect(result.networkUnique).toBeGreaterThan(0);
    expect(result.endpoints).toBeGreaterThan(15);
    expect(result.routes).toBeGreaterThan(15);
    expect(result.patternMatches).toBeGreaterThanOrEqual(0);
    expect(result.tick.reason).toBe("initial");
    expect(result.details?.routes.length).toBeGreaterThan(15);
  });

  test("auditResultFromTick maps health and baseline drift", () => {
    const tick: NetworkLoopTick = {
      reason: "initial",
      at: Date.now(),
      report: {
        network: { unique_total: 20, total: 102 },
        endpoints: {
          total: 22,
          health_count: 3,
          route_fingerprints: ["GET /api/health", "GET /api/scores"],
        },
      } as NetworkLoopTick["report"],
      health: {
        probed: true,
        base_url: "http://localhost:3000",
        overall: "healthy",
        probes: [{ url: "http://localhost:3000/api/health", ok: true, status: 200, latency_ms: 9 }],
      },
      delta: {
        endpoints_added: 1,
        endpoints_removed: 0,
        routes_added: 1,
        routes_removed: 0,
        network_unique_delta: 1,
        health_status: "stable",
        added_routes: ["GET /api/new"],
        removed_routes: [],
        drift: true,
      },
    };
    const result = auditResultFromTick(tick);
    expect(result.healthStatus).toBe("healthy");
    expect(result.healthLatency).toBe(9);
    expect(result.baselineDrift).toEqual({ endpoints: 1, routes: 1 });
    expect(result.routes).toBe(2);
  });

  test("resolveAuditOutputFormat honors --output and legacy flags", () => {
    expect(resolveAuditOutputFormat({ output: "json" })).toBe("json");
    expect(resolveAuditOutputFormat({ output: "herdr" })).toBe("herdr");
    expect(resolveAuditOutputFormat({ json: true })).toBe("json");
    expect(resolveAuditOutputFormat({ "herdr-tab": true })).toBe("herdr");
    expect(resolveAuditOutputFormat({})).toBe("table");
  });

  test("shouldSeedNetworkBaseline when missing or forced", () => {
    expect(shouldSeedNetworkBaseline(undefined, {})).toBe(true);
    expect(shouldSeedNetworkBaseline(undefined, { force: false })).toBe(true);
    expect(shouldSeedNetworkBaseline({} as never, { force: true })).toBe(true);
    expect(shouldSeedNetworkBaseline({} as never, {})).toBe(false);
  });

  test("seedNetworkBaseline writes snapshot section", async () => {
    const dir = await mkdtemp(join(tmpdir(), "network-seed-"));
    const snapshotPath = join(dir, "snapshot.json");
    try {
      const result = await seedNetworkBaseline({
        skillRoot: SKILL_ROOT,
        repo: REPO_ROOT,
        scanPath: "projects/active/sports-terminal-os/dist/frontend",
        profileName: "supply-chain-network-dist",
        domain: "seed-test-domain",
        snapshotPath,
      });
      expect(result.baseline.endpoints.total).toBeGreaterThan(15);
      expect(formatSeedStatus(result)).toContain("seed-test-domain");
      const snapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as {
        network?: { endpointCount: number };
        sections?: string[];
      };
      expect(snapshot.sections).toContain("network");
      expect(snapshot.network?.endpointCount).toBeGreaterThan(15);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("network pointers index flags and modules", () => {
    expect(NETWORK_CLI_FLAGS_HELP).toContain("--dry-run");
    expect(NETWORK_CLI_FLAGS_HELP).toContain("--seed");
    expect(NETWORK_MODULE_POINTERS.some((m) => m.id === "loop")).toBe(true);
    expect(getNetworkModulePointer("seed")?.path).toContain("network-seed.ts");
    const json = JSON.parse(formatNetworkPointersJson());
    expect(json.tool).toBe("supply-chain-network");
    expect(json.modules.length).toBeGreaterThan(10);
    expect(json.groundTruth.length).toBeGreaterThan(8);
    expect(json.standards.schemas.routeFingerprint.format).toBe("METHOD /path");
  });

  test("validateNetworkGroundTruth passes for sports-terminal golden fixture", async () => {
    const report = await validateNetworkGroundTruth({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      ids: [
        "sports-terminal-snapshot",
        "sports-terminal-openapi",
        "security-policy-network",
        "network-dist-profile",
      ],
    });
    expect(report.ok).toBe(true);
    expect(report.checks.every((c) => c.ok)).toBe(true);
  });

  test("ground truth references pin sports-terminal golden counts", () => {
    const gt = getGroundTruthReference("sports-terminal-snapshot");
    expect(gt?.pinned?.endpointCount).toBe(22);
    expect(gt?.pinned?.networkUnique).toBe(20);
    expect(NETWORK_GROUND_TRUTH_REFERENCES.some((g) => g.kind === "policy")).toBe(true);
    expect(NETWORK_STANDARDS.policy.networkRuleIds).toContain("fetch-call");
    expect(NETWORK_STANDARDS.expectShapes).toContain("snapshot-network-section");
  });

  test("formatters emit dry-run payloads", () => {
    const tick: NetworkLoopTick = {
      reason: "initial",
      at: Date.now(),
      report: {
        network: { unique_total: 10, total: 20 },
        endpoints: { total: 5, health_count: 1, route_fingerprints: ["GET /api/health"] },
      } as NetworkLoopTick["report"],
    };
    const result = auditResultFromTick(tick, {
      routes: ["GET /api/health"],
      networkSurfaces: { fetch: 12 },
      hotspots: [{ file: "chunk.js", hits: 4 }],
    });
    expect(formatAuditTable(result)).toContain("networkUnique");
    const json = JSON.parse(formatAuditJson(result));
    expect(json.mode).toBe("dry-run");
    expect(json.summary.endpoints).toBe(5);
    expect(formatAuditHerdr(result)).toContain("route-catalog");
  });
});