import type { Registry, PackageViolation } from "./registry.ts";
import { suggestRemediation } from "./remediation.ts";
import { meetsSeverity, normalizeSeverity } from "./rule-engine.ts";
import type { ResolvedDependency } from "./dependency-resolver.ts";
import type { ScanResult, ScanRemediation, Severity, ViolationKind } from "./types.ts";

function violationType(kind: ViolationKind): ScanResult["type"] {
  return kind === "threat" ? "threat" : "semver";
}

function toRemediation(hint: Awaited<ReturnType<typeof suggestRemediation>>): ScanRemediation | undefined {
  if (!hint) return undefined;
  return {
    action: hint.action,
    safeRange: hint.safeRange,
    suggestedVersion: hint.suggestedVersion,
    latestInLockfile: hint.latestInLockfile,
    command: hint.command,
    reason: hint.reason,
  };
}

export function violationToFinding(
  v: PackageViolation,
  remediation?: ScanRemediation,
  source?: string,
): ScanResult {
  const detail = v.vulnRange
    ? `range ${v.vulnRange}${source ? ` [${source}]` : ""}`
    : source
      ? `[${source}]`
      : undefined;
  return {
    type: violationType(v.kind),
    file: v.package,
    line: 0,
    column: 0,
    ruleId: v.ruleId,
    severity: normalizeSeverity(v.severity),
    message: v.kind === "threat" && v.cve ? `${v.message} (${v.cve})` : v.message,
    layer: "deps",
    detail,
    cve: v.cve,
    violationKind: v.kind,
    kinds: v.kinds ?? [v.kind],
    packageVersion: v.version,
    remediation,
  };
}

export async function scanDependencyViolations(options: {
  repo: string;
  registry: Registry;
  packages: Record<string, string>;
  sourceByPackage?: Record<string, string>;
  threatFeed?: boolean;
  minSeverity: Severity;
}): Promise<ScanResult[]> {
  const violations = await options.registry.checkAllViolations(options.packages, {
    threatFeed: options.threatFeed !== false,
  });
  const findings: ScanResult[] = [];

  for (const v of violations) {
    if (!meetsSeverity(v.severity, options.minSeverity)) continue;
    const hint = await suggestRemediation({
      repo: options.repo,
      package: v.package,
      currentVersion: v.version,
      kinds: v.kinds ?? [v.kind],
      safeRange: v.safeRange,
      vulnRange: v.vulnRange,
    });
    findings.push(
      violationToFinding(
        v,
        toRemediation(hint),
        options.sourceByPackage?.[v.package],
      ),
    );
  }
  return findings;
}

export function dependenciesToPackages(deps: ResolvedDependency[]): {
  packages: Record<string, string>;
  sourceByPackage: Record<string, string>;
} {
  const packages: Record<string, string> = {};
  const sourceByPackage: Record<string, string> = {};
  for (const dep of deps) {
    packages[dep.name] = dep.version;
    sourceByPackage[dep.name] = dep.source;
  }
  return { packages, sourceByPackage };
}