import { SemverMatcher } from "./semver-matcher.ts";
import type { SecurityPolicy } from "./policy-loader.ts";

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