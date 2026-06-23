import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SemverMatcher } from "./semver-matcher.ts";
import type { SecurityPolicy } from "./policy-loader.ts";
import { loadPolicyFromSkill } from "./policy-loader.ts";

export const DEFAULT_SCANNER_VERSION = "2.0.0";

export type SnapshotSemverSection = {
  policyFingerprint?: string;
  packages?: Record<string, string>;
  capturedAt?: string;
  violationCount?: number;
};

export type SnapshotNetworkSection = {
  domain: string;
  scanPath: string;
  capturedAt: string;
  endpointCount: number;
  routeCount: number;
  healthRouteCount: number;
  routeFingerprints: string[];
  networkUnique: number;
  networkRaw: number;
  bySurface?: Record<string, number>;
  hotspotFiles?: string[];
  healthStatus?: "healthy" | "degraded" | "unreachable";
  lastProbe?: string;
};

export type NetworkDrift = {
  drift: boolean;
  endpointsAdded: number;
  endpointsRemoved: number;
  routesAdded: number;
  routesRemoved: number;
  networkUniqueDelta: number;
  addedRoutes: string[];
  removedRoutes: string[];
  healthStatus: "stable" | "changed" | "degraded" | "unknown";
};

export type DoctorSnapshotV2 = {
  snapshotVersion?: string;
  sections?: string[];
  scannerVersion?: string;
  semver?: SnapshotSemverSection;
  network?: SnapshotNetworkSection;
  policy?: {
    snapshotVersionRange?: string;
    compatibleScannerVersions?: string;
  };
  generatedAt?: string;
  [key: string]: unknown;
};

export type PackageDrift = {
  added: string[];
  removed: string[];
  changed: Array<{ package: string; from: string; to: string }>;
};

export type SnapshotDrift = {
  policyDrift: boolean;
  liveFingerprint?: string;
  snapshotFingerprint?: string;
  packages: PackageDrift;
  network?: NetworkDrift;
};

export type SnapshotValidation = {
  compatible: boolean;
  legacy: boolean;
  requiredRange: string;
  snapshotVersion?: string;
  message?: string;
};

export function validateSnapshotVersion(
  snapshot: DoctorSnapshotV2,
  policy: SecurityPolicy,
  fallbackRange = "^2.0.0",
): SnapshotValidation {
  const requiredRange = policy.snapshot?.snapshotVersionRange ?? fallbackRange;

  if (!snapshot.snapshotVersion) {
    return {
      compatible: true,
      legacy: true,
      requiredRange,
      message: "Snapshot missing snapshotVersion (legacy) — assuming compatible",
    };
  }

  const compatible = SemverMatcher.snapshotCompatible(
    snapshot.snapshotVersion,
    requiredRange,
  );

  return {
    compatible,
    legacy: false,
    requiredRange,
    snapshotVersion: snapshot.snapshotVersion,
    message: compatible
      ? undefined
      : `Snapshot version ${snapshot.snapshotVersion} does not satisfy ${requiredRange}`,
  };
}

export function validateSnapshotSections(
  snapshot: DoctorSnapshotV2,
  policy: SecurityPolicy,
): string[] {
  const required = policy.snapshot?.requiredSections ?? [];
  const present = new Set(snapshot.sections ?? []);
  return required.filter((s) => !present.has(s));
}

export type ScannerCompatibility = {
  compatible: boolean;
  scannerVersion: string;
  requiredRange: string;
  message?: string;
  migrationHint?: string;
};

export function validateScannerCompatibility(
  scannerVersion: string,
  policy: SecurityPolicy,
  fallbackRange = ">=2.0.0 <3.0.0",
): ScannerCompatibility {
  const requiredRange = policy.snapshot?.compatibleScannerVersions ?? fallbackRange;
  const compatible = SemverMatcher.satisfies(scannerVersion, requiredRange);
  return {
    compatible,
    scannerVersion,
    requiredRange,
    message: compatible
      ? undefined
      : `Scanner ${scannerVersion} is not compatible with required range ${requiredRange}`,
    migrationHint: compatible
      ? undefined
      : `Snapshot/scanner mismatch — run: bun supply-chain doctor --snapshot -u (or upgrade scanner to satisfy ${requiredRange})`,
  };
}

export async function loadScannerVersion(skillRoot: string): Promise<string> {
  try {
    const layers = JSON.parse(
      await readFile(join(skillRoot, "supply-chain-layers.json"), "utf8"),
    ) as { scannerVersion?: string };
    if (layers.scannerVersion) return layers.scannerVersion;
  } catch {
    // fallback
  }
  return DEFAULT_SCANNER_VERSION;
}

export async function policyFingerprint(skillRoot: string): Promise<string> {
  const text = await readFile(join(skillRoot, "policies/security.policy.toml"), "utf8");
  return Bun.hash(text).toString(16).slice(0, 16);
}

export function diffSnapshotPackages(
  snapshot: DoctorSnapshotV2,
  current: Record<string, string>,
): PackageDrift {
  const pinned = snapshot.semver?.packages ?? {};
  const pinnedKeys = new Set(Object.keys(pinned));
  const currentKeys = new Set(Object.keys(current));
  const added = [...currentKeys].filter((k) => !pinnedKeys.has(k));
  const removed = [...pinnedKeys].filter((k) => !currentKeys.has(k));
  const changed: PackageDrift["changed"] = [];
  for (const pkg of pinnedKeys) {
    if (!currentKeys.has(pkg)) continue;
    const from = pinned[pkg];
    const to = current[pkg];
    if (from !== to) changed.push({ package: pkg, from, to });
  }
  return { added, removed, changed };
}

export function diffSnapshotNetwork(
  snapshot: DoctorSnapshotV2,
  current: SnapshotNetworkSection,
): NetworkDrift {
  const pinned = new Set(snapshot.network?.routeFingerprints ?? []);
  const live = new Set(current.routeFingerprints);
  const addedRoutes = [...live].filter((r) => !pinned.has(r));
  const removedRoutes = [...pinned].filter((r) => !live.has(r));
  const endpointsAdded = Math.max(0, current.endpointCount - (snapshot.network?.endpointCount ?? 0));
  const endpointsRemoved = Math.max(0, (snapshot.network?.endpointCount ?? 0) - current.endpointCount);
  const drift = addedRoutes.length > 0 || removedRoutes.length > 0
    || endpointsAdded > 0 || endpointsRemoved > 0
    || current.networkUnique !== (snapshot.network?.networkUnique ?? current.networkUnique);

  let healthStatus: NetworkDrift["healthStatus"] = "unknown";
  if (current.healthStatus) {
    if (current.healthStatus !== "healthy") healthStatus = "degraded";
    else if (snapshot.network?.healthStatus && snapshot.network.healthStatus !== current.healthStatus) {
      healthStatus = "changed";
    } else {
      healthStatus = "stable";
    }
  } else {
    healthStatus = "stable";
  }

  return {
    drift,
    endpointsAdded,
    endpointsRemoved,
    routesAdded: addedRoutes.length,
    routesRemoved: removedRoutes.length,
    networkUniqueDelta: current.networkUnique - (snapshot.network?.networkUnique ?? 0),
    addedRoutes,
    removedRoutes,
    healthStatus,
  };
}

export async function validateSnapshotDrift(options: {
  skillRoot: string;
  snapshot: DoctorSnapshotV2;
  currentPackages?: Record<string, string>;
  currentNetwork?: SnapshotNetworkSection;
}): Promise<SnapshotDrift> {
  const live = await policyFingerprint(options.skillRoot);
  const snap = options.snapshot.semver?.policyFingerprint;
  const packages = options.currentPackages
    ? diffSnapshotPackages(options.snapshot, options.currentPackages)
    : { added: [], removed: [], changed: [] };
  const network = options.currentNetwork && options.snapshot.network
    ? diffSnapshotNetwork(options.snapshot, options.currentNetwork)
    : options.currentNetwork && !options.snapshot.network
      ? {
          drift: true,
          endpointsAdded: options.currentNetwork.endpointCount,
          endpointsRemoved: 0,
          routesAdded: options.currentNetwork.routeCount,
          routesRemoved: 0,
          networkUniqueDelta: options.currentNetwork.networkUnique,
          addedRoutes: options.currentNetwork.routeFingerprints,
          removedRoutes: [],
          healthStatus: "unknown" as const,
        }
      : undefined;
  return {
    policyDrift: Boolean(snap && snap !== live),
    liveFingerprint: live,
    snapshotFingerprint: snap,
    packages,
    network,
  };
}

export async function validateSnapshotFull(options: {
  skillRoot: string;
  snapshot: DoctorSnapshotV2;
  scannerVersion?: string;
  currentPackages?: Record<string, string>;
  currentNetwork?: SnapshotNetworkSection;
  failOnNetworkDrift?: boolean;
}): Promise<{
  version: SnapshotValidation;
  sections: string[];
  scanner: ScannerCompatibility;
  drift: SnapshotDrift;
  ok: boolean;
}> {
  const policy = await loadPolicyFromSkill(options.skillRoot);
  const scannerVersion = options.scannerVersion ?? await loadScannerVersion(options.skillRoot);
  const drift = await validateSnapshotDrift({
    skillRoot: options.skillRoot,
    snapshot: options.snapshot,
    currentPackages: options.currentPackages,
    currentNetwork: options.currentNetwork,
  });
  const version = validateSnapshotVersion(options.snapshot, policy);
  const sections = validateSnapshotSections(options.snapshot, policy);
  const scanner = validateScannerCompatibility(scannerVersion, policy);
  const networkOk = !options.failOnNetworkDrift || !drift.network?.drift;
  const ok = version.compatible
    && sections.length === 0
    && scanner.compatible
    && !drift.policyDrift
    && networkOk;
  return { version, sections, scanner, drift, ok };
}

export async function buildSnapshotTemplate(skillRoot: string): Promise<DoctorSnapshotV2> {
  const policy = await loadPolicyFromSkill(skillRoot);
  const scannerVersion = await loadScannerVersion(skillRoot);
  const fp = await policyFingerprint(skillRoot);
  return {
    snapshotVersion: "2.0.0",
    sections: policy.snapshot?.requiredSections ?? ["policy", "transpiler", "semver"],
    scannerVersion,
    policy: {
      snapshotVersionRange: policy.snapshot?.snapshotVersionRange ?? "^2.0.0",
      compatibleScannerVersions: policy.snapshot?.compatibleScannerVersions ?? ">=2.0.0 <3.0.0",
    },
    semver: {
      policyFingerprint: fp,
      packages: {},
      capturedAt: new Date().toISOString(),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function captureSnapshot(options: {
  skillRoot: string;
  packages: Record<string, string>;
  violationCount?: number;
  network?: SnapshotNetworkSection;
}): Promise<DoctorSnapshotV2> {
  const template = await buildSnapshotTemplate(options.skillRoot);
  const sections = new Set(template.sections ?? []);
  if (options.network) sections.add("network");
  return {
    ...template,
    sections: [...sections],
    network: options.network,
    semver: {
      ...template.semver,
      packages: { ...options.packages },
      capturedAt: new Date().toISOString(),
      violationCount: options.violationCount ?? 0,
    },
  };
}

export type SnapshotMigration = {
  migrated: boolean;
  before: DoctorSnapshotV2;
  after: DoctorSnapshotV2;
  changes: string[];
  hint?: string;
};

export async function migrateSnapshot(options: {
  skillRoot: string;
  snapshot: DoctorSnapshotV2;
}): Promise<SnapshotMigration> {
  const policy = await loadPolicyFromSkill(options.skillRoot);
  const scannerVersion = await loadScannerVersion(options.skillRoot);
  const requiredSections = policy.snapshot?.requiredSections ?? [];
  const targetVersion = policy.snapshot?.snapshotVersionRange?.replace(/^\^/, "") ?? "2.0.0";
  const after: DoctorSnapshotV2 = { ...options.snapshot };
  const changes: string[] = [];

  if (!after.snapshotVersion) {
    after.snapshotVersion = targetVersion;
    changes.push(`set snapshotVersion=${targetVersion}`);
  }
  const present = new Set(after.sections ?? []);
  const merged = [...(after.sections ?? [])];
  for (const section of requiredSections) {
    if (!present.has(section)) {
      merged.push(section);
      changes.push(`add section=${section}`);
    }
  }
  if (merged.length !== (after.sections ?? []).length) {
    after.sections = merged;
  }
  if (!after.scannerVersion) {
    after.scannerVersion = scannerVersion;
    changes.push(`set scannerVersion=${scannerVersion}`);
  }
  if (!after.semver?.policyFingerprint) {
    const fp = await policyFingerprint(options.skillRoot);
    after.semver = {
      ...(after.semver ?? {}),
      policyFingerprint: fp,
      packages: after.semver?.packages ?? {},
      capturedAt: after.semver?.capturedAt ?? new Date().toISOString(),
    };
    changes.push(`set semver.policyFingerprint=${fp}`);
  }
  if (after.network && !present.has("network")) {
    after.sections = [...(after.sections ?? []), "network"];
    changes.push("add section=network");
  }

  const validation = await validateSnapshotFull({
    skillRoot: options.skillRoot,
    snapshot: after,
    scannerVersion: String(after.scannerVersion ?? scannerVersion),
  });
  const hint = validation.version.compatible && validation.scanner.compatible
    ? undefined
    : validation.scanner.migrationHint ?? validation.version.message;

  return {
    migrated: changes.length > 0,
    before: options.snapshot,
    after,
    changes,
    hint,
  };
}