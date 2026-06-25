import { expect } from "bun:test";
import {
  EXPECT_SHAPE_CATALOG,
  listExpectShapes,
  type ExpectShapeSpec,
} from "./expect-shape-catalog.ts";
import type { AssembledTestCommand } from "./test-runner.ts";
import type { DoctorSnapshotV2, SnapshotNetworkSection } from "./snapshot.ts";
import type { BundleScanReport, ScanResult, TargetScanResult } from "./types.ts";

export { EXPECT_SHAPE_CATALOG, listExpectShapes, type ExpectShapeSpec };

export function expectAssembledCommand(cmd: AssembledTestCommand): void {
  expect(cmd).toContainKeys([...EXPECT_SHAPE_CATALOG[0].requiredKeys]);
  expect(cmd.command[0]).toBe("bun");
  expect(cmd.command[1]).toBe("test");
  if (cmd.env) expect(cmd.env).toContainKey("TZ");
}

export function expectDiscoveryIndex(index: Record<string, unknown>): void {
  expect(index).toContainKeys([...EXPECT_SHAPE_CATALOG[1].requiredKeys]);
  const totals = index.totals as Record<string, unknown>;
  expect(totals).toContainKeys(["files", "unit", "integration", "concurrent"]);
}

export function expectBundleScanReport(report: BundleScanReport): void {
  expect(report).toContainKeys([...EXPECT_SHAPE_CATALOG[2].requiredKeys]);
  expect(report).toEqual(expect.objectContaining({
    layer: "4.5",
    summary: expect.objectContaining({
      files: expect.any(Number),
      findings: expect.any(Number),
      by_severity: expect.any(Object),
    }),
  }));
  expect(report.targets.length).toBeGreaterThan(0);
  for (const t of report.targets) expectTargetScan(t);
}

export function expectTargetScan(target: TargetScanResult): void {
  expect(target).toContainKeys(["id", "path", "skipped", "files_scanned", "findings", "files", "scan_ms"]);
  for (const f of target.findings) expectScanResult(f);
}

export function expectScanResult(finding: ScanResult): void {
  expect(finding).toContainKeys([...EXPECT_SHAPE_CATALOG[3].requiredKeys]);
  expect(finding.severity).toBeTruthy();
}

export function expectDoctorSnapshot(snap: DoctorSnapshotV2): void {
  expect(snap).toContainKeys(["snapshotVersion", "sections", "scannerVersion", "semver", "generatedAt"]);
  expect(snap.sections).toContain("semver");
  if (snap.semver?.packages) expect(snap.semver).toContainKey("packages");
}

export function expectSnapshotNetworkSection(section: SnapshotNetworkSection): void {
  expect(section).toContainAllKeys([...EXPECT_SHAPE_CATALOG[5].requiredKeys]);
  expect(section.routeFingerprints.length).toBeGreaterThanOrEqual(0);
}

export function expectMarkdownReport(md: string): void {
  expect(md).toContain("##");
  expect(md.length).toBeGreaterThan(20);
}

export function expectHealthOverall(
  health: NonNullable<BundleScanReport["health"]>,
): void {
  expect(health).toContainKeys(["probed", "base_url", "overall", "probes"]);
  expect(["healthy", "degraded", "unreachable"]).toContainEqual(health.overall);
}