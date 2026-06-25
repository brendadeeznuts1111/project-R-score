import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { HealthReport } from "./endpoint-catalog.ts";
import {
  captureBaselineFromReport,
  diffAgainstBaseline,
  loadNetworkBaseline,
  parseJson5,
  type NetworkBaseline,
  type NetworkBaselineDelta,
} from "./network-baseline.ts";
import type { SnapshotNetworkSection, DoctorSnapshotV2 } from "./snapshot.ts";
import type { BundleScanReport } from "./types.ts";

export function defaultSnapshotPath(skillRoot: string, domain: string): string {
  return join(skillRoot, "baselines", domain, "snapshot.json");
}

export function captureNetworkSectionFromReport(
  report: BundleScanReport,
  domain: string,
  scanPath: string,
): SnapshotNetworkSection {
  const baseline = captureBaselineFromReport(report, domain, scanPath);
  return baselineToSnapshotNetwork(baseline);
}

export function baselineToSnapshotNetwork(baseline: NetworkBaseline): SnapshotNetworkSection {
  return {
    domain: baseline.domain,
    scanPath: baseline.scanPath,
    capturedAt: baseline.capturedAt,
    endpointCount: baseline.endpoints.total,
    routeCount: baseline.endpoints.fingerprints.length,
    healthRouteCount: baseline.endpoints.health_count,
    routeFingerprints: [...baseline.endpoints.fingerprints],
    networkUnique: baseline.network.unique_total,
    networkRaw: baseline.network.total,
    bySurface: { ...baseline.network.by_surface },
    hotspotFiles: [...baseline.network.hotspot_files],
    healthStatus: baseline.health?.overall,
    lastProbe: baseline.capturedAt,
  };
}

export function snapshotNetworkToBaseline(section: SnapshotNetworkSection): NetworkBaseline {
  const routes = section.routeFingerprints.map((fp) => {
    const space = fp.indexOf(" ");
    return space < 0
      ? { method: "GET", path: fp }
      : { method: fp.slice(0, space), path: fp.slice(space + 1) };
  });
  return {
    schemaVersion: 1,
    domain: section.domain,
    capturedAt: section.capturedAt,
    scanPath: section.scanPath,
    network: {
      unique_total: section.networkUnique,
      total: section.networkRaw,
      by_surface: { ...(section.bySurface ?? {}) },
      hotspot_files: [...(section.hotspotFiles ?? [])],
    },
    endpoints: {
      total: section.endpointCount,
      health_count: section.healthRouteCount,
      routes,
      fingerprints: [...section.routeFingerprints],
    },
    health: section.healthStatus ? { overall: section.healthStatus } : undefined,
  };
}

export function baselineFromSnapshot(
  snapshot: DoctorSnapshotV2,
  fallbackDomain = "default",
  fallbackScanPath = ".",
): NetworkBaseline | undefined {
  if (!snapshot.network) return undefined;
  const section = snapshot.network as SnapshotNetworkSection;
  return snapshotNetworkToBaseline({
    ...section,
    domain: section.domain || fallbackDomain,
    scanPath: section.scanPath || fallbackScanPath,
  });
}

export function diffSnapshotNetworkSection(
  pinned: SnapshotNetworkSection | undefined,
  current: SnapshotNetworkSection,
  liveHealth?: HealthReport,
): NetworkBaselineDelta | undefined {
  if (!pinned) return undefined;
  return diffAgainstBaseline(
    snapshotNetworkToBaseline(current),
    snapshotNetworkToBaseline(pinned),
    liveHealth,
  );
}

export async function loadDomainBaseline(options: {
  skillRoot: string;
  domain: string;
  snapshotPath?: string;
  baselinePath?: string;
}): Promise<{ baseline?: NetworkBaseline; source?: string; snapshot?: DoctorSnapshotV2 }> {
  const snapshotCandidates = [
    options.snapshotPath,
    defaultSnapshotPath(options.skillRoot, options.domain),
  ].filter(Boolean) as string[];

  for (const path of snapshotCandidates) {
    try {
      const snapshot = JSON.parse(await readFile(resolve(path), "utf8")) as DoctorSnapshotV2;
      const baseline = baselineFromSnapshot(snapshot, options.domain);
      if (baseline) return { baseline, source: path, snapshot };
    } catch {
      // try next
    }
  }

  const legacyPath = options.baselinePath
    ?? join(options.skillRoot, "baselines", options.domain, "network-baseline.json5");
  try {
    const baseline = await loadNetworkBaseline(legacyPath);
    return { baseline, source: legacyPath };
  } catch {
    return {};
  }
}

export async function migrateLegacyBaselineToSnapshot(options: {
  skillRoot: string;
  domain: string;
  baselinePath?: string;
  scannerVersion?: string;
}): Promise<DoctorSnapshotV2> {
  const legacyPath = options.baselinePath
    ?? join(options.skillRoot, "baselines", options.domain, "network-baseline.json5");
  const raw = await readFile(resolve(legacyPath), "utf8");
  const baseline = parseJson5(raw) as NetworkBaseline;
  const network = baselineToSnapshotNetwork(baseline);
  return {
    snapshotVersion: "2.0.0",
    sections: ["policy", "transpiler", "semver", "network"],
    scannerVersion: options.scannerVersion ?? "2.0.0",
    network,
    generatedAt: new Date().toISOString(),
  };
}