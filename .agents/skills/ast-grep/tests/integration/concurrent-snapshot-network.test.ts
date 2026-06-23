import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  baselineToSnapshotNetwork,
  captureNetworkSectionFromReport,
  diffSnapshotNetworkSection,
  snapshotNetworkToBaseline,
} from "../../scripts/scan/transpiler/snapshot-network.ts";
import {
  captureSnapshot,
  diffSnapshotNetwork,
  validateSnapshotFull,
  type SnapshotNetworkSection,
} from "../../scripts/scan/transpiler/snapshot.ts";
import { runBundleScan } from "../../scripts/scan/transpiler/bundle-scanner.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

describe("snapshot network integration", () => {
  test("baseline round-trips through SnapshotNetworkSection", () => {
    const section: SnapshotNetworkSection = {
      domain: "sports-terminal-os",
      scanPath: "dist/frontend",
      capturedAt: "2026-06-23T00:00:00.000Z",
      endpointCount: 22,
      routeCount: 2,
      healthRouteCount: 3,
      routeFingerprints: ["GET /api/health", "GET /api/games"],
      networkUnique: 20,
      networkRaw: 102,
      healthStatus: "healthy",
    };
    const baseline = snapshotNetworkToBaseline(section);
    const back = baselineToSnapshotNetwork(baseline);
    expect(back.endpointCount).toBe(22);
    expect(back.routeFingerprints).toEqual(section.routeFingerprints);
  });

  test("diffSnapshotNetwork detects added routes", () => {
    const pinned: SnapshotNetworkSection = {
      domain: "x",
      scanPath: "dist",
      capturedAt: "2026-01-01T00:00:00.000Z",
      endpointCount: 2,
      routeCount: 2,
      healthRouteCount: 1,
      routeFingerprints: ["GET /api/health", "GET /api/a"],
      networkUnique: 10,
      networkRaw: 20,
    };
    const live: SnapshotNetworkSection = {
      ...pinned,
      endpointCount: 3,
      routeCount: 3,
      routeFingerprints: ["GET /api/health", "GET /api/a", "GET /api/b"],
      networkUnique: 11,
      networkRaw: 21,
    };
    const drift = diffSnapshotNetwork({ network: pinned }, live);
    expect(drift.drift).toBe(true);
    expect(drift.routesAdded).toBe(1);
    expect(drift.addedRoutes).toContain("GET /api/b");
  });

  test("captureSnapshot embeds network section", async () => {
    const network: SnapshotNetworkSection = {
      domain: "test",
      scanPath: "dist",
      capturedAt: new Date().toISOString(),
      endpointCount: 1,
      routeCount: 1,
      healthRouteCount: 1,
      routeFingerprints: ["GET /api/health"],
      networkUnique: 1,
      networkRaw: 1,
    };
    const snap = await captureSnapshot({
      skillRoot: SKILL_ROOT,
      packages: { lodash: "4.17.21" },
      network,
    });
    expect(snap.sections).toContain("network");
    expect(snap.network?.endpointCount).toBe(1);
  });

  test("validateSnapshotFull fails on network drift when requested", async () => {
    const snapshot = await captureSnapshot({
      skillRoot: SKILL_ROOT,
      packages: {},
      network: {
        domain: "x",
        scanPath: "dist",
        capturedAt: "2026-01-01T00:00:00.000Z",
        endpointCount: 1,
        routeCount: 1,
        healthRouteCount: 1,
        routeFingerprints: ["GET /api/health"],
        networkUnique: 1,
        networkRaw: 1,
      },
    });
    const live: SnapshotNetworkSection = {
      ...snapshot.network!,
      routeFingerprints: ["GET /api/health", "GET /api/new"],
      routeCount: 2,
      endpointCount: 2,
    };
    const result = await validateSnapshotFull({
      skillRoot: SKILL_ROOT,
      snapshot,
      currentNetwork: live,
      failOnNetworkDrift: true,
    });
    expect(result.drift.network?.drift).toBe(true);
    expect(result.ok).toBe(false);
  });

  test("captureNetworkSectionFromReport from sports-terminal dist", async () => {
    const report = await runBundleScan({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      profileName: "supply-chain-network-dist",
      scanPath: "projects/active/sports-terminal-os/dist/frontend",
      format: "json",
    });
    const section = captureNetworkSectionFromReport(
      report,
      "sports-terminal-os",
      "projects/active/sports-terminal-os/dist/frontend",
    );
    expect(section.endpointCount).toBeGreaterThan(15);
    expect(section.routeFingerprints.length).toBeGreaterThan(15);
    const delta = diffSnapshotNetworkSection(section, section);
    expect(delta?.drift).toBe(false);
  });
});