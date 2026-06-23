import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SemverMatcher } from "./semver-matcher.ts";
import type { SecurityPolicy } from "./policy-loader.ts";
import { loadPolicyFromSkill } from "./policy-loader.ts";

export const DEFAULT_SCANNER_VERSION = "2.0.0";

export type DoctorSnapshotV2 = {
  snapshotVersion?: string;
  sections?: string[];
  [key: string]: unknown;
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

export async function validateSnapshotFull(options: {
  skillRoot: string;
  snapshot: DoctorSnapshotV2;
  scannerVersion?: string;
}): Promise<{
  version: SnapshotValidation;
  sections: string[];
  scanner: ScannerCompatibility;
}> {
  const policy = await loadPolicyFromSkill(options.skillRoot);
  const scannerVersion = options.scannerVersion ?? await loadScannerVersion(options.skillRoot);
  return {
    version: validateSnapshotVersion(options.snapshot, policy),
    sections: validateSnapshotSections(options.snapshot, policy),
    scanner: validateScannerCompatibility(scannerVersion, policy),
  };
}