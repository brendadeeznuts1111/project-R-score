import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type SemverRule = {
  id: string;
  package: string;
  range: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  safeRange?: string;
};

export type SecurityPolicy = {
  version?: number;
  snapshot?: {
    allowedDrift?: string[];
    requiredSections?: string[];
    snapshotVersionRange?: string;
    compatibleScannerVersions?: string;
  };
  semver_rules: SemverRule[];
  semver_packages: Record<string, string>;
  semver_blocked: Record<string, string>;
};

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function parseStringMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function parseSemverRule(row: Record<string, unknown>): SemverRule | null {
  const id = asString(row.id);
  const pkg = asString(row.package);
  const range = asString(row.range);
  const severity = asString(row.severity);
  const description = asString(row.description);
  if (!id || !pkg || !range || !severity || !description) return null;
  if (!["low", "medium", "high", "critical"].includes(severity)) return null;
  return {
    id,
    package: pkg,
    range,
    severity,
    description,
    safeRange: asString(row.safeRange),
  };
}

export function parseSecurityPolicy(doc: Record<string, unknown>): SecurityPolicy {
  const snapshotRaw = doc.snapshot as Record<string, unknown> | undefined;
  const semverRaw = doc.semver as Record<string, unknown> | undefined;
  const semverRows = doc.semver_rule as Record<string, unknown>[] | Record<string, unknown> | undefined;
  const rulesList = Array.isArray(semverRows)
    ? semverRows
    : semverRows
      ? [semverRows]
      : [];

  const semver_rules: SemverRule[] = [];
  for (const row of rulesList) {
    const parsed = parseSemverRule(row);
    if (parsed) semver_rules.push(parsed);
  }

  return {
    version: typeof doc.version === "number" ? doc.version : undefined,
    snapshot: snapshotRaw
      ? {
          allowedDrift: Array.isArray(snapshotRaw.allowedDrift)
            ? snapshotRaw.allowedDrift.map(String)
            : undefined,
          requiredSections: Array.isArray(snapshotRaw.requiredSections)
            ? snapshotRaw.requiredSections.map(String)
            : undefined,
          snapshotVersionRange: asString(snapshotRaw.snapshotVersionRange),
          compatibleScannerVersions: asString(snapshotRaw.compatibleScannerVersions),
        }
      : undefined,
    semver_rules,
    semver_packages: parseStringMap(semverRaw?.packages),
    semver_blocked: parseStringMap(semverRaw?.blocked),
  };
}

export async function loadPolicy(filePath: string): Promise<SecurityPolicy> {
  const text = await readFile(filePath, "utf8");
  const parsed = Bun.TOML.parse(text) as Record<string, unknown>;
  return parseSecurityPolicy(parsed);
}

export async function loadPolicyFromSkill(skillRoot: string): Promise<SecurityPolicy> {
  return loadPolicy(join(skillRoot, "policies/security.policy.toml"));
}