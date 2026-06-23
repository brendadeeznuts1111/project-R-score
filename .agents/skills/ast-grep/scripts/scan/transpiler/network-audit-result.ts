import {
  loadOpenApiCatalog,
  type EndpointCatalog,
} from "./endpoint-catalog.ts";
import type { NetworkBaselineDelta } from "./network-baseline.ts";
import { formatNetworkHerdrTab, formatNetworkLoopJson } from "./herdr-tab.ts";
import type { NetworkLoopTick } from "./network-loop.ts";
import type { BundleScanReport } from "./types.ts";

export type NetworkAuditOutputFormat = "table" | "json" | "herdr";

export type NetworkAuditDetails = {
  catalog?: EndpointCatalog;
  routes: string[];
  networkSurfaces: Record<string, number>;
  hotspots: Array<{ file: string; hits: number; surfaces?: Record<string, number> }>;
};

export type NetworkAuditResult = {
  networkUnique: number;
  networkRaw: number;
  endpoints: number;
  routes: number;
  healthStatus?: string;
  healthLatency?: number;
  patternMatches: number;
  semverViolations: number;
  baselineDrift?: { endpoints: number; routes: number };
  details?: NetworkAuditDetails;
  at: number;
  delta?: NetworkBaselineDelta;
  tick: NetworkLoopTick;
};

function countPatternMatches(report: BundleScanReport): number {
  let n = 0;
  for (const target of report.targets ?? []) {
    for (const finding of target.findings) {
      if (finding.layer === "network") n++;
    }
  }
  return n;
}

function countSemverViolations(report: BundleScanReport): number {
  let n = 0;
  for (const target of report.targets ?? []) {
    for (const finding of target.findings) {
      if (finding.violationKind === "semver_rule" || finding.type === "semver") n++;
    }
  }
  return n;
}

function firstHealthLatency(tick: NetworkLoopTick): number | undefined {
  const probe = tick.health?.probes.find((p) => p.ok);
  return probe?.latency_ms;
}

export async function collectEndpointDetails(
  report: BundleScanReport,
): Promise<NetworkAuditDetails> {
  const routes = report.endpoints?.route_fingerprints?.length
    ? [...report.endpoints.route_fingerprints]
    : (report.endpoints?.health_routes ?? []).map((r) => `${r.method} ${r.path}`);

  let catalog: EndpointCatalog | undefined;
  if (report.endpoints?.source) {
    try {
      catalog = await loadOpenApiCatalog(report.endpoints.source);
    } catch {
      catalog = undefined;
    }
  }

  const hotspots = (report.network?.hotspots ?? report.network?.by_file ?? [])
    .slice(0, 20)
    .map((row) => ({
      file: row.basename ?? row.file,
      hits: row.hits,
      surfaces: row.surfaces,
    }));

  return {
    catalog,
    routes,
    networkSurfaces: { ...(report.network?.by_surface ?? {}) },
    hotspots,
  };
}

export function auditResultFromTick(
  tick: NetworkLoopTick,
  details?: NetworkAuditDetails,
): NetworkAuditResult {
  const report = tick.report;
  const endpoints = report?.endpoints?.total ?? 0;
  const routes = report?.endpoints?.route_fingerprints?.length
    ?? report?.endpoints?.health_routes?.length
    ?? endpoints;

  const result: NetworkAuditResult = {
    networkUnique: report?.network?.unique_total ?? 0,
    networkRaw: report?.network?.total ?? 0,
    endpoints,
    routes,
    healthStatus: tick.health?.overall,
    healthLatency: firstHealthLatency(tick),
    patternMatches: report ? countPatternMatches(report) : 0,
    semverViolations: report ? countSemverViolations(report) : 0,
    at: tick.at,
    delta: tick.delta,
    tick,
  };

  if (tick.delta) {
    result.baselineDrift = {
      endpoints: tick.delta.endpoints_added - tick.delta.endpoints_removed,
      routes: tick.delta.routes_added - tick.delta.routes_removed,
    };
  }

  if (details) result.details = details;
  return result;
}

export function resolveAuditOutputFormat(
  opts: Record<string, string | boolean | number>,
): NetworkAuditOutputFormat {
  const output = opts.output;
  if (output === "json" || output === "herdr" || output === "table") {
    return output;
  }
  if (opts.json === true) return "json";
  if (opts["herdr-tab"] === true) return "herdr";
  return "table";
}

export function formatAuditTable(result: NetworkAuditResult): string {
  const rows: Array<Record<string, string | number>> = [
    { metric: "networkUnique", value: result.networkUnique },
    { metric: "networkRaw", value: result.networkRaw },
    { metric: "endpoints", value: result.endpoints },
    { metric: "routes", value: result.routes },
  ];
  if (result.healthStatus) rows.push({ metric: "healthStatus", value: result.healthStatus });
  if (result.healthLatency !== undefined) rows.push({ metric: "healthLatencyMs", value: result.healthLatency });
  rows.push({ metric: "patternMatches", value: result.patternMatches });
  rows.push({ metric: "semverViolations", value: result.semverViolations });
  if (result.baselineDrift) {
    rows.push({ metric: "baselineDriftEndpoints", value: result.baselineDrift.endpoints });
    rows.push({ metric: "baselineDriftRoutes", value: result.baselineDrift.routes });
  }
  if (result.delta) {
    rows.push({ metric: "drift", value: result.delta.drift ? 1 : 0 });
  }

  const width = Math.max(...rows.map((r) => String(r.metric).length), 6);
  const lines = rows.map((r) => `${String(r.metric).padEnd(width)}  ${r.value}`);
  const out = [lines.join("\n")];

  if (result.details) {
    out.push("");
    out.push("endpoint catalog");
    if (result.details.catalog?.title) {
      out.push(`  title: ${result.details.catalog.title}`);
    }
    if (result.details.catalog?.source) {
      out.push(`  source: ${result.details.catalog.source}`);
    }
    out.push(`  routes: ${result.details.routes.length}`);
    for (const route of result.details.routes.slice(0, 12)) {
      out.push(`    ${route}`);
    }
    if (result.details.routes.length > 12) {
      out.push(`    … +${result.details.routes.length - 12} more`);
    }
    const surfaces = Object.entries(result.details.networkSurfaces);
    if (surfaces.length) {
      out.push("network surfaces");
      for (const [surface, hits] of surfaces.slice(0, 8)) {
        out.push(`  ${surface}: ${hits}`);
      }
    }
    if (result.details.hotspots.length) {
      out.push("hotspots");
      for (const h of result.details.hotspots.slice(0, 6)) {
        out.push(`  ${h.file}: ${h.hits}`);
      }
    }
  }

  return `${out.join("\n")}\n`;
}

export function formatAuditJson(result: NetworkAuditResult): string {
  const payload = {
    schemaVersion: 1,
    tool: "supply-chain-network",
    mode: "dry-run",
    at: new Date(result.at).toISOString(),
    summary: {
      networkUnique: result.networkUnique,
      networkRaw: result.networkRaw,
      endpoints: result.endpoints,
      routes: result.routes,
      healthStatus: result.healthStatus,
      healthLatencyMs: result.healthLatency,
      patternMatches: result.patternMatches,
      semverViolations: result.semverViolations,
      baselineDrift: result.baselineDrift,
      drift: Boolean(result.delta?.drift),
    },
    delta: result.delta,
    details: result.details
      ? {
          catalog: result.details.catalog
            ? {
                source: result.details.catalog.source,
                title: result.details.catalog.title,
                version: result.details.catalog.version,
                total: result.details.catalog.total,
                health_count: result.details.catalog.health_count,
                by_tag: result.details.catalog.by_tag,
                by_kind: result.details.catalog.by_kind,
              }
            : undefined,
          routes: result.details.routes,
          networkSurfaces: result.details.networkSurfaces,
          hotspots: result.details.hotspots,
        }
      : undefined,
    loop: JSON.parse(formatNetworkLoopJson(result.tick, result.delta)),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function formatAuditHerdr(result: NetworkAuditResult): string {
  const lines = formatNetworkHerdrTab(result.tick, result.delta);
  if (result.details?.routes.length) {
    lines.push(`route-catalog: ${result.details.routes.length} fingerprints`);
    for (const route of result.details.routes.slice(0, 8)) {
      lines.push(`  ${route}`);
    }
    if (result.details.routes.length > 8) {
      lines.push(`  … +${result.details.routes.length - 8} more`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function emitAuditResult(
  result: NetworkAuditResult,
  format: NetworkAuditOutputFormat,
): void {
  if (format === "json") {
    process.stdout.write(formatAuditJson(result));
    return;
  }
  if (format === "herdr") {
    process.stdout.write(formatAuditHerdr(result));
    return;
  }
  process.stdout.write(formatAuditTable(result));
}