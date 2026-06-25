import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { MINIMAL_SCAN_REPORT } from "../fixtures/minimal-scan-report.ts";
import {
  EXPECT_SHAPE_CATALOG,
  expectAssembledCommand,
  expectBundleScanReport,
  expectDoctorSnapshot,
  expectDiscoveryIndex,
  expectScanResult,
  expectSnapshotNetworkSection,
  listExpectShapes,
} from "../../scripts/scan/transpiler/expect-shapes.ts";
import {
  assembleTestCommand,
  buildTestIndex,
} from "../../scripts/scan/transpiler/test-runner.ts";
import { captureSnapshot } from "../../scripts/scan/transpiler/snapshot.ts";
import type { SnapshotNetworkSection } from "../../scripts/scan/transpiler/snapshot.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

describe("expect-shapes catalog", () => {
  test("listExpectShapes exposes all domain assertions", () => {
    expect(listExpectShapes().length).toBe(EXPECT_SHAPE_CATALOG.length);
    expect(EXPECT_SHAPE_CATALOG.map((s) => s.id)).toContainEqual("bundle-scan-report");
    expect(EXPECT_SHAPE_CATALOG.every((s) => s.requiredKeys.length > 0)).toBe(true);
  });
});

describe("expect-shapes — test-runner", () => {
  test("expectAssembledCommand", () => {
    const cmd = assembleTestCommand(
      { ci: { args: ["--parallel", "--isolate"], cwd: ".agents/skills/ast-grep", env: { TZ: "Etc/UTC" } } },
      { skillRoot: SKILL_ROOT, repoRoot: REPO_ROOT, profile: "ci" },
    );
    expectAssembledCommand(cmd);
  });

  test("expectDiscoveryIndex", async () => {
    const index = await buildTestIndex(SKILL_ROOT);
    expectDiscoveryIndex(index as unknown as Record<string, unknown>);
    expect(index.shapes.length).toBeGreaterThan(0);
  });
});

describe("expect-shapes — supply-chain types", () => {
  test("expectBundleScanReport on fixture", () => {
    expectBundleScanReport(MINIMAL_SCAN_REPORT);
  });

  test("expectScanResult on first finding", () => {
    const finding = MINIMAL_SCAN_REPORT.targets[0]!.findings[0]!;
    expectScanResult(finding);
    expect(finding.kinds).toContainEqual("semver_rule");
    expect(finding.remediation).toContainKey("command");
  });

  test("expectDoctorSnapshot after capture", async () => {
    const snap = await captureSnapshot({
      skillRoot: SKILL_ROOT,
      packages: { lodash: "4.17.21" },
    });
    expectDoctorSnapshot(snap);
    expect(snap.semver?.packages).toContainKey("lodash");
  });

  test("expectSnapshotNetworkSection", () => {
    const section: SnapshotNetworkSection = {
      domain: "sports-terminal-os",
      scanPath: "dist/frontend",
      capturedAt: "2026-06-23T12:00:00.000Z",
      endpointCount: 22,
      routeCount: 2,
      healthRouteCount: 3,
      routeFingerprints: ["GET /api/health"],
      networkUnique: 20,
      networkRaw: 25,
    };
    expectSnapshotNetworkSection(section);
  });
});