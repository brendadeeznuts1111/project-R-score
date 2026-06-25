export type ExpectShapeSpec = {
  id: string;
  description: string;
  requiredKeys: readonly string[];
  optionalKeys?: readonly string[];
  assert: string;
};

/** Catalog for test-list — maps domain types to Bun matcher assertions */
export const EXPECT_SHAPE_CATALOG: ExpectShapeSpec[] = [
  {
    id: "assembled-command",
    description: "test-runner assembleTestCommand output",
    requiredKeys: ["profile", "cwd", "command", "filters"],
    optionalKeys: ["testNamePattern", "env", "preflight"],
    assert: "expectAssembledCommand — toContainKeys + command starts bun test",
  },
  {
    id: "discovery-index",
    description: "buildTestIndex top-level sections",
    requiredKeys: [
      "skillRoot", "discovery", "api", "archive", "workspaceFilter", "time", "matchers", "shapes", "bunfig",
      "positionFilters", "domainPresets", "profiles", "files", "totals",
    ],
    assert: "expectDiscoveryIndex — toContainKeys on all sections",
  },
  {
    id: "bundle-scan-report",
    description: "Layer 4.5 BundleScanReport from runBundleScan",
    requiredKeys: [
      "repo", "profile", "layer", "min_severity", "format", "elapsed_ms",
      "workers", "integrity_enabled", "threat_feed_enabled", "advisories_matched",
      "targets", "summary",
    ],
    optionalKeys: ["network", "endpoints", "health", "platform", "remediation"],
    assert: "expectBundleScanReport — toContainKeys + summary.by_severity",
  },
  {
    id: "scan-result",
    description: "Single finding in a scan",
    requiredKeys: ["type", "file", "line", "column", "ruleId", "severity", "message", "layer"],
    optionalKeys: ["remediation", "kinds", "violationKind", "colors"],
    assert: "expectScanResult — toContainKeys + severity present",
  },
  {
    id: "doctor-snapshot-v2",
    description: "DoctorSnapshotV2 capture output",
    requiredKeys: ["snapshotVersion", "sections", "scannerVersion", "semver", "generatedAt"],
    optionalKeys: ["network", "policy"],
    assert: "expectDoctorSnapshot — toContainKeys + semver.packages",
  },
  {
    id: "snapshot-network-section",
    description: "SnapshotNetworkSection on DoctorSnapshotV2",
    requiredKeys: [
      "domain", "scanPath", "capturedAt", "endpointCount", "routeCount",
      "healthRouteCount", "routeFingerprints", "networkUnique", "networkRaw",
    ],
    assert: "expectSnapshotNetworkSection — toContainAllKeys exact section keys",
  },
];

export function listExpectShapes(): ExpectShapeSpec[] {
  return EXPECT_SHAPE_CATALOG;
}