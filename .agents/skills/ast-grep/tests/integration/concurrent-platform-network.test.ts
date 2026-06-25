import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  PlatformMatcher,
  resolveInstallProfile,
  resolveScanPlatform,
  CPU_VALUES,
  OS_VALUES,
} from "../../scripts/scan/transpiler/platform-matcher.ts";
import {
  NetworkMatcher,
  NETWORK_DOCS,
  dedupeNetworkFindings,
} from "../../scripts/scan/transpiler/network-matcher.ts";
import { loadRuleSet } from "../../scripts/scan/transpiler/rule-engine.ts";
import { loadBundleProfile } from "../../scripts/scan/transpiler/profile-loader.ts";
import { runBundleScan } from "../../scripts/scan/transpiler/bundle-scanner.ts";
import { buildSupplyChainMarkdown } from "../../scripts/scan/transpiler/markdown-reporter.ts";
import {
  classifyEndpoint,
  discoverOpenApi,
  loadOpenApiCatalog,
  mergeEndpointSections,
  parseOpenApiDoc,
} from "../../scripts/scan/transpiler/endpoint-catalog.ts";
import {
  formatLoopStatus,
  runNetworkAuditLoop,
  type NetworkLoopTick,
} from "../../scripts/scan/transpiler/network-loop.ts";
import { formatColoredLoopStatus, stripAnsi } from "../../scripts/scan/transpiler/loop-color.ts";
import {
  parseHealthUrlSecret,
  formatSecretChannelLog,
} from "../../scripts/scan/transpiler/health-secrets.ts";
import {
  captureBaselineFromReport,
  diffAgainstBaseline,
  parseJson5,
  stringifyJson5,
  type NetworkBaseline,
} from "../../scripts/scan/transpiler/network-baseline.ts";
import {
  formatNetworkHerdrTab,
  formatNetworkLoopJson,
} from "../../scripts/scan/transpiler/herdr-tab.ts";
import type { BundleScanReport, ScanResult } from "../../scripts/scan/transpiler/types.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");
const SPORTS_OPENAPI = resolve(REPO_ROOT, "projects/active/sports-terminal-os/openapi.json");

describe("PlatformMatcher", () => {
  test("normalizes common arch aliases", () => {
    expect(PlatformMatcher.normalizeCpu("x86_64")).toBe("x64");
    expect(PlatformMatcher.normalizeCpu("aarch64")).toBe("arm64");
    expect(PlatformMatcher.normalizeOs("macos")).toBe("darwin");
  });

  test("validates cpu/os against bun install spec", () => {
    expect(PlatformMatcher.isValidTarget({ cpu: "x64", os: "linux" })).toBe(true);
    expect(PlatformMatcher.isValidTarget({ cpu: "bogus", os: "linux" })).toBe(false);
    expect(CPU_VALUES).toContain("arm64");
    expect(OS_VALUES).toContain("darwin");
  });

  test("detectHost returns normalized cpu/os", () => {
    const host = PlatformMatcher.detectHost();
    expect(PlatformMatcher.isValidCpu(host.cpu)).toBe(true);
    expect(PlatformMatcher.isValidOs(host.os)).toBe(true);
    expect(host.bunVersion.length).toBeGreaterThan(0);
  });

  test("parseInstallArgs from cross-linux-x64 profile", async () => {
    const spec = await resolveInstallProfile(SKILL_ROOT, "cross-linux-x64");
    expect(spec?.target).toEqual({ cpu: "x64", os: "linux" });
    expect(spec?.args).toContain("--cpu=x64");
  });

  test("resolveScanPlatform flags cross-target", () => {
    const host = PlatformMatcher.detectHost();
    const other: typeof host = {
      ...host,
      cpu: host.cpu === "arm64" ? "x64" : "arm64",
      os: host.os === "linux" ? "darwin" : "linux",
    };
    const ctx = resolveScanPlatform({ cliTarget: { cpu: other.cpu, os: other.os } });
    expect(ctx.crossTarget).toBe(true);
    expect(ctx.installArgs).toEqual([`--cpu=${other.cpu}`, `--os=${other.os}`]);
  });
});

describe("NetworkMatcher", () => {
  const sampleFinding: ScanResult = {
    type: "transpiler",
    file: "api.ts",
    line: 10,
    column: 1,
    ruleId: "fetch-call",
    severity: "warn",
    message: "fetch outbound",
    layer: "network",
    snippet: "const r = await fetch(url)",
  };

  test("classifies fetch rule surface", () => {
    expect(NetworkMatcher.classifyFinding(sampleFinding)).toBe("fetch");
  });

  test("summarize aggregates by surface", () => {
    const summary = NetworkMatcher.summarize([sampleFinding], true);
    expect(summary.total).toBe(1);
    expect(summary.unique_total).toBe(1);
    expect(summary.by_surface.fetch).toBe(1);
  });

  test("dedupeNetworkFindings collapses minified duplicates", () => {
    const dupes = [sampleFinding, { ...sampleFinding }, { ...sampleFinding, line: 2 }];
    expect(dedupeNetworkFindings(dupes).length).toBe(2);
  });

  test("summarize builds file heatmap", () => {
    const a = { ...sampleFinding, file: "dist/a.js" };
    const b = { ...sampleFinding, file: "dist/b.js", ruleId: "websocket-constructor" };
    const summary = NetworkMatcher.summarize([a, a, b], true);
    expect(summary.by_file.length).toBe(2);
    expect(summary.hotspots[0]?.basename).toBe("a.js");
    expect(summary.total).toBe(3);
    expect(summary.unique_total).toBe(2);
  });

  test("buildNetworkMarkdown includes hotspots table", () => {
    const summary = NetworkMatcher.summarize([sampleFinding], true);
    const md = NetworkMatcher.buildNetworkMarkdown(summary);
    expect(md).toContain("## Hotspots");
    expect(md).toContain("unique hits");
  });

  test("tagFinding adds networkSurface", () => {
    const tagged = NetworkMatcher.tagFinding(sampleFinding);
    expect(tagged.networkSurface).toBe("fetch");
  });

  test("NETWORK_DOCS points to fetch runtime docs", () => {
    expect(NETWORK_DOCS).toContain("/runtime/networking/");
  });
});

describe("supply-chain platform + network integration", () => {
  test("loadRuleSet includes network rules from policy", async () => {
    const rules = await loadRuleSet(SKILL_ROOT);
    expect(rules.network_rules.some((r) => r.id === "fetch-call")).toBe(true);
    expect(rules.network_rules.some((r) => r.id === "tcp-connect")).toBe(true);
  });

  test("supply-chain-network profile enables network_audit", async () => {
    const profile = await loadBundleProfile(SKILL_ROOT, "supply-chain-network");
    expect(profile.network_audit).toBe(true);
  });

  test("supply-chain-cross-linux-x64 pins platform target", async () => {
    const profile = await loadBundleProfile(SKILL_ROOT, "supply-chain-cross-linux-x64");
    expect(profile.platform_target).toEqual({ cpu: "x64", os: "linux" });
    expect(profile.install_profile).toBe("cross-linux-x64");
  });

  test("scan report embeds platform and network metadata", async () => {
    const report = await runBundleScan({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      profileName: "supply-chain-cross-linux-x64",
      scanPath: ".agents/skills/ast-grep/scripts/scan/transpiler",
      format: "json",
      platformTarget: { cpu: "x64", os: "linux" },
    });
    expect(report.platform?.target).toEqual({ cpu: "x64", os: "linux" });
    expect(report.platform?.installProfile).toBe("cross-linux-x64");
    expect(report.platform?.docs).toContain("/pm/cli/install");
    expect(report.network).toBeDefined();
  });

  test("supply-chain-network-dist profile tuned for bundles", async () => {
    const profile = await loadBundleProfile(SKILL_ROOT, "supply-chain-network-dist");
    expect(profile.network_audit).toBe(true);
    expect(profile.max_file_kb).toBe(4096);
    expect(profile.transform_output).toBe(false);
  });

  test("markdown report includes network hotspots when enabled", async () => {
    const findings = Array.from({ length: 3 }, () => ({
      type: "transpiler" as const,
      file: "dist/chunk.js",
      line: 1,
      column: 0,
      ruleId: "fetch-call",
      severity: "warn" as const,
      message: "fetch",
      layer: "network" as const,
    }));
    const report = {
      repo: "/r",
      profile: "supply-chain-network-dist",
      layer: "4.5" as const,
      min_severity: "warn" as const,
      format: "markdown" as const,
      elapsed_ms: 1,
      workers: 1,
      integrity_enabled: false,
      threat_feed_enabled: false,
      advisories_matched: 0,
      targets: [{ id: "t", path: "dist", skipped: false, files_scanned: 1, scan_ms: 1, files: [], findings }],
      summary: { files: 1, findings: 3, by_severity: { warn: 3 } },
      network: {
        ...NetworkMatcher.summarize(findings, true),
        by_surface: NetworkMatcher.summarize(findings, true).by_surface as Record<string, number>,
        by_file: NetworkMatcher.summarize(findings, true).by_file.map((r) => ({
          ...r,
          surfaces: r.surfaces as Record<string, number>,
        })),
        hotspots: NetworkMatcher.summarize(findings, true).hotspots.map((r) => ({
          ...r,
          surfaces: r.surfaces as Record<string, number>,
        })),
        docs: NETWORK_DOCS,
      },
    };
    const md = buildSupplyChainMarkdown(report as BundleScanReport);
    expect(md).toContain("Network hotspots");
    expect(md).toContain("raw /");
  });

  test("supply-chain-network-dist enables endpoint_meta", async () => {
    const profile = await loadBundleProfile(SKILL_ROOT, "supply-chain-network-dist");
    expect(profile.endpoint_meta).toBe(true);
  });

  test("markdown report includes platform section", async () => {
    const report = await runBundleScan({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      profileName: "supply-chain-network",
      scanPath: ".agents/skills/ast-grep/scripts/scan/transpiler",
      format: "markdown",
    });
    const md = buildSupplyChainMarkdown(report);
    expect(md).toContain("platform host");
    expect(md).toContain("platform target");
  });
});

describe("EndpointCatalog", () => {
  test("classifyEndpoint marks health and metrics routes", () => {
    expect(classifyEndpoint("/api/health", ["System"])).toBe("health");
    expect(classifyEndpoint("/api/health/ready", [])).toBe("health");
    expect(classifyEndpoint("/api/metrics", ["Metrics"])).toBe("metrics");
    expect(classifyEndpoint("/api/proxy/odds", ["Auth"])).toBe("proxy");
    expect(classifyEndpoint("/api/v1/games", ["Games"])).toBe("api");
  });

  test("parseOpenApiDoc normalizes paths and counts health routes", () => {
    const doc = {
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/health": { get: { summary: "Health", tags: ["System"] } },
        "/metrics": { get: { tags: ["Metrics"] } },
        "/api/games": { get: { tags: ["Games"] } },
      },
    };
    const catalog = parseOpenApiDoc(doc, "test.json");
    expect(catalog.total).toBe(3);
    expect(catalog.health_count).toBe(1);
    expect(catalog.health_routes[0]?.path).toBe("/api/health");
    expect(catalog.by_kind.metrics).toBe(1);
  });

  test("loadOpenApiCatalog reads sports-terminal openapi.json", async () => {
    const catalog = await loadOpenApiCatalog(SPORTS_OPENAPI);
    expect(catalog.total).toBeGreaterThan(15);
    expect(catalog.health_count).toBeGreaterThan(0);
    expect(catalog.health_routes.some((r) => r.path.includes("health"))).toBe(true);
  });

  test("discoverOpenApi finds openapi.json from dist path", async () => {
    const found = await discoverOpenApi(
      "projects/active/sports-terminal-os/dist/frontend",
      REPO_ROOT,
    );
    expect(found).toBe(SPORTS_OPENAPI);
  });

  test("mergeEndpointSections appends catalog markdown to network report", async () => {
    const catalog = await loadOpenApiCatalog(SPORTS_OPENAPI);
    const networkMd = "# Network\n\n- hits: 1\n";
    const merged = mergeEndpointSections(networkMd, catalog);
    expect(merged).toContain("API Endpoint Catalog");
    expect(merged).toContain("Health endpoints (catalog)");
  });

  test("formatLoopStatus summarizes tick metadata", () => {
    const line = formatLoopStatus({
      reason: "initial",
      at: Date.now(),
      report: {
        network: { unique_total: 20, total: 102 },
        endpoints: { total: 22, health_count: 3 },
      } as NetworkLoopTick["report"],
      health: {
        probed: true,
        base_url: "http://localhost:3000",
        overall: "healthy",
        probes: [{ url: "http://localhost:3000/api/health", ok: true, status: 200, latency_ms: 12 }],
      },
    });
    expect(line).toContain("[loop] initial");
    expect(line).toContain("network=20unique");
    expect(line).toContain("health=healthy");
  });

  test("runNetworkAuditLoop emits initial tick and exits on abort", async () => {
    const ac = new AbortController();
    const ticks: NetworkLoopTick[] = [];
    const run = runNetworkAuditLoop({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      scanPath: ".agents/skills/ast-grep/scripts/scan/transpiler",
      profileName: "supply-chain-network-dist",
      signal: ac.signal,
      onTick: async (tick) => {
        ticks.push(tick);
      },
    });
    await Bun.sleep(30);
    ac.abort();
    await run;
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0]?.reason).toBe("initial");
  });

  test("runNetworkAuditLoop fires health probe ticks", async () => {
    const ac = new AbortController();
    const ticks: NetworkLoopTick[] = [];
    const run = runNetworkAuditLoop({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      scanPath: ".agents/skills/ast-grep/scripts/scan/transpiler",
      profileName: "supply-chain-network-dist",
      healthUrl: "http://127.0.0.1:1",
      probeIntervalMs: 80,
      signal: ac.signal,
      onTick: async (tick) => {
        ticks.push(tick);
        if (ticks.filter((t) => t.reason === "probe").length >= 1) ac.abort();
      },
    });
    await run;
    expect(ticks.some((t) => t.reason === "probe")).toBe(true);
    expect(ticks.find((t) => t.reason === "probe")?.health?.overall).toBe("unreachable");
  });

  test("formatColoredLoopStatus paints domain-scoped keys", () => {
    const line = formatColoredLoopStatus({
      reason: "initial",
      networkUnique: 20,
      networkRaw: 102,
      endpoints: 22,
      healthRoutes: 3,
      health: {
        probed: true,
        base_url: "http://localhost:3000",
        overall: "healthy",
        probes: [{ url: "http://localhost:3000/api/health", ok: true, status: 200, latency_ms: 12 }],
      },
      opts: { enabled: true },
    });
    expect(line).toContain("network=");
    expect(line).toContain("latency=12ms");
    expect(stripAnsi(line)).toContain("[loop] initial");
  });

  test("parseHealthUrlSecret splits domain channel", () => {
    const ref = parseHealthUrlSecret("sports-terminal/health/prod");
    expect(ref.service).toBe("sports-terminal");
    expect(ref.name).toBe("health/prod");
    expect(ref.scopedService).toContain("sports-terminal");
    expect(formatSecretChannelLog(ref)).toContain("sports-terminal/health/prod");
  });

  test("baseline diff detects route drift", () => {
    const previous: NetworkBaseline = {
      schemaVersion: 1,
      domain: "test",
      capturedAt: "2026-01-01T00:00:00.000Z",
      scanPath: "dist",
      network: { unique_total: 10, total: 20, by_surface: { fetch: 20 }, hotspot_files: [] },
      endpoints: {
        total: 2,
        health_count: 1,
        routes: [{ method: "GET", path: "/api/health" }],
        fingerprints: ["GET /api/health"],
      },
    };
    const current: NetworkBaseline = {
      ...previous,
      endpoints: {
        total: 3,
        health_count: 1,
        routes: [
          { method: "GET", path: "/api/health" },
          { method: "GET", path: "/api/new" },
        ],
        fingerprints: ["GET /api/health", "GET /api/new"],
      },
    };
    const delta = diffAgainstBaseline(current, previous);
    expect(delta.drift).toBe(true);
    expect(delta.routes_added).toBe(1);
    expect(delta.endpoints_added).toBe(1);
    expect(delta.added_routes).toContain("GET /api/new");
  });

  test("parseJson5 allows comments and trailing commas", () => {
    const doc = parseJson5(`{
      // domain baseline
      "schemaVersion": 1,
      "domain": "x",
    }`) as { schemaVersion: number; domain: string };
    expect(doc.schemaVersion).toBe(1);
    expect(doc.domain).toBe("x");
    expect(stringifyJson5(doc)).toContain("network-baseline.json5");
  });

  test("formatNetworkHerdrTab and JSON output for loop ticks", () => {
    const tick: NetworkLoopTick = {
      reason: "watch",
      detail: "dist/chunk.js",
      at: Date.now(),
      report: {
        network: { unique_total: 21, total: 103, enabled: true } as NetworkLoopTick["report"]["network"],
        endpoints: { total: 23, health_count: 3 } as NetworkLoopTick["report"]["endpoints"],
      } as NetworkLoopTick["report"],
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
    const lines = formatNetworkHerdrTab(tick, tick.delta);
    expect(lines.some((l) => l.includes("baseline-drift"))).toBe(true);
    const json = JSON.parse(formatNetworkLoopJson(tick, tick.delta));
    expect(json.tool).toBe("supply-chain-network");
    expect(json.summary.drift).toBe(true);
  });

  test("captureBaselineFromReport uses route_fingerprints", async () => {
    const report = await runBundleScan({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      profileName: "supply-chain-network-dist",
      scanPath: "projects/active/sports-terminal-os/dist/frontend",
      format: "json",
    });
    const baseline = captureBaselineFromReport(report, "sports-terminal-os", report.targets[0].path);
    expect(baseline.endpoints.fingerprints.length).toBeGreaterThan(15);
    expect(baseline.network.unique_total).toBeGreaterThan(0);
  });

  test("scan report embeds endpoint catalog for sports-terminal dist", async () => {
    const report = await runBundleScan({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      profileName: "supply-chain-network-dist",
      scanPath: "projects/active/sports-terminal-os/dist/frontend",
      format: "json",
    });
    expect(report.endpoints?.total).toBeGreaterThan(15);
    expect(report.endpoints?.health_count).toBeGreaterThan(0);
    const md = buildSupplyChainMarkdown(report);
    expect(md).toContain("api catalog");
    expect(md).toContain("API health endpoints");
  });
});