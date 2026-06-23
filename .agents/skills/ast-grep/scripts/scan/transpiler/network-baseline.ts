import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { HealthReport } from "./endpoint-catalog.ts";
import type { BundleScanReport } from "./types.ts";

export const BASELINE_SCHEMA_VERSION = 1;

export type NetworkBaselineRoute = {
  method: string;
  path: string;
};

export type NetworkBaseline = {
  schemaVersion: number;
  domain: string;
  capturedAt: string;
  scanPath: string;
  network: {
    unique_total: number;
    total: number;
    by_surface: Record<string, number>;
    hotspot_files: string[];
  };
  endpoints: {
    total: number;
    health_count: number;
    routes: NetworkBaselineRoute[];
    fingerprints: string[];
  };
  health?: {
    overall: HealthReport["overall"];
  };
};

export type NetworkBaselineDelta = {
  endpoints_added: number;
  endpoints_removed: number;
  routes_added: number;
  routes_removed: number;
  network_unique_delta: number;
  health_status: "stable" | "changed" | "degraded" | "unknown";
  added_routes: string[];
  removed_routes: string[];
  drift: boolean;
};

export function routeFingerprint(route: NetworkBaselineRoute): string {
  return `${route.method} ${route.path}`;
}

export function defaultBaselinePath(skillRoot: string, domain: string): string {
  return join(skillRoot, "baselines", domain, "network-baseline.json5");
}

/** Minimal JSON5 reader — strips comments, allows trailing commas */
export function parseJson5(text: string): unknown {
  let body = text.replace(/\r\n/g, "\n");
  body = body.replace(/\/\*[\s\S]*?\*\//g, "");
  body = body.replace(/^\s*\/\/.*$/gm, "");
  body = body.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(body);
}

export function stringifyJson5(value: unknown): string {
  const header = "// network-baseline.json5 — golden template for supply-chain network loop\n";
  return `${header}${JSON.stringify(value, null, 2)}\n`;
}

export function captureBaselineFromReport(
  report: BundleScanReport,
  domain: string,
  scanPath: string,
): NetworkBaseline {
  const catalogRoutes: NetworkBaselineRoute[] = [];
  const fingerprints = report.endpoints?.route_fingerprints?.length
    ? [...report.endpoints.route_fingerprints]
    : [];
  if (report.endpoints) {
    for (const fp of fingerprints) {
      const space = fp.indexOf(" ");
      if (space < 0) continue;
      catalogRoutes.push({
        method: fp.slice(0, space),
        path: fp.slice(space + 1),
      });
    }
    if (!catalogRoutes.length) {
      for (const r of report.endpoints.health_routes) {
        catalogRoutes.push({ method: r.method, path: r.path });
      }
    }
  }
  const routePrints = fingerprints.length
    ? fingerprints
    : catalogRoutes.map(routeFingerprint);
  const hotspots = (report.network?.hotspots ?? report.network?.by_file ?? [])
    .map((r) => r.basename ?? r.file?.split("/").pop() ?? r.file)
    .filter(Boolean) as string[];

  return {
    schemaVersion: BASELINE_SCHEMA_VERSION,
    domain,
    capturedAt: new Date().toISOString(),
    scanPath,
    network: {
      unique_total: report.network?.unique_total ?? 0,
      total: report.network?.total ?? 0,
      by_surface: { ...(report.network?.by_surface ?? {}) },
      hotspot_files: hotspots.slice(0, 32),
    },
    endpoints: {
      total: report.endpoints?.total ?? 0,
      health_count: report.endpoints?.health_count ?? 0,
      routes: catalogRoutes,
      fingerprints: routePrints,
    },
    health: report.health?.overall ? { overall: report.health.overall } : undefined,
  };
}

export async function loadNetworkBaseline(path: string): Promise<NetworkBaseline> {
  const raw = await readFile(resolve(path), "utf8");
  const doc = parseJson5(raw) as NetworkBaseline;
  if (!doc || typeof doc !== "object" || doc.schemaVersion !== BASELINE_SCHEMA_VERSION) {
    throw new Error(`invalid network baseline: ${path}`);
  }
  return doc;
}

export async function writeNetworkBaseline(path: string, baseline: NetworkBaseline): Promise<void> {
  const abs = resolve(path);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, stringifyJson5(baseline), "utf8");
}

export function diffAgainstBaseline(
  current: NetworkBaseline,
  previous: NetworkBaseline,
  liveHealth?: HealthReport,
): NetworkBaselineDelta {
  const prevRoutes = new Set(previous.endpoints.fingerprints);
  const curRoutes = new Set(current.endpoints.fingerprints);
  const added_routes = [...curRoutes].filter((r) => !prevRoutes.has(r));
  const removed_routes = [...prevRoutes].filter((r) => !curRoutes.has(r));

  let health_status: NetworkBaselineDelta["health_status"] = "unknown";
  if (liveHealth) {
    if (liveHealth.overall !== "healthy") {
      health_status = "degraded";
    } else if (previous.health?.overall && previous.health.overall !== liveHealth.overall) {
      health_status = "changed";
    } else {
      health_status = "stable";
    }
  } else if (previous.health?.overall && current.health?.overall) {
    health_status = previous.health.overall === current.health.overall ? "stable" : "changed";
  } else {
    health_status = "stable";
  }

  const endpoints_added = Math.max(0, current.endpoints.total - previous.endpoints.total);
  const endpoints_removed = Math.max(0, previous.endpoints.total - current.endpoints.total);
  const drift = added_routes.length > 0 || removed_routes.length > 0
    || endpoints_added > 0
    || endpoints_removed > 0;

  return {
    endpoints_added,
    endpoints_removed,
    routes_added: added_routes.length,
    routes_removed: removed_routes.length,
    network_unique_delta: current.network.unique_total - previous.network.unique_total,
    health_status,
    added_routes,
    removed_routes,
    drift,
  };
}

export function formatBaselineDelta(delta: NetworkBaselineDelta): string {
  return `Δ endpoints +${delta.endpoints_added}/-${delta.endpoints_removed}`
    + ` Δ routes +${delta.routes_added}/-${delta.routes_removed}`
    + ` health=${delta.health_status}`;
}