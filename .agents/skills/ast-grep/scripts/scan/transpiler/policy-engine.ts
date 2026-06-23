import { SemverMatcher } from "./semver-matcher.ts";
import type { SecurityPolicy } from "./policy-loader.ts";
import type { PackageViolation, ViolationKind } from "./registry.ts";
import type { Severity } from "./types.ts";

export type ConstraintHit = {
  kind: ViolationKind;
  ruleId: string;
  severity: Severity;
  message: string;
  range?: string;
  safeRange?: string;
  cve?: string;
  violated: boolean;
};

export type PackageEvaluation = {
  package: string;
  version: string;
  compliant: boolean;
  hits: ConstraintHit[];
  strictestSafeRange: string | null;
  primaryKind?: ViolationKind;
};

/** Merge multiple safe-range floors (e.g. >=1.6.0 + >=1.6.2 → >=1.6.2). */
export function strictestSafeRange(ranges: string[]): string | null {
  const valid = ranges.map((r) => r.trim()).filter(Boolean);
  if (!valid.length) return null;

  const floors: string[] = [];
  for (const range of valid) {
    const gte = range.match(/^>=\s*(.+)$/);
    if (gte) floors.push(gte[1].trim());
  }

  if (floors.length === valid.length) {
    const top = floors.sort((a, b) => SemverMatcher.order(b, a))[0];
    return `>=${top}`;
  }

  const candidates = [...new Set(floors.length ? floors : valid)];
  for (const version of candidates.sort((a, b) => SemverMatcher.order(b, a))) {
    if (valid.every((r) => SemverMatcher.satisfies(version, r))) return `>=${version}`;
  }
  return valid[0] ?? null;
}

export function evaluationFromViolations(
  pkg: string,
  version: string,
  violations: PackageViolation[],
  allHits?: ConstraintHit[],
): PackageEvaluation {
  const hits = allHits ?? violations.map((v) => ({
    kind: v.kind,
    ruleId: v.ruleId,
    severity: v.severity,
    message: v.message,
    range: v.vulnRange,
    safeRange: v.safeRange,
    cve: v.cve,
    violated: true,
  }));

  const safeRanges = violations
    .map((v) => v.safeRange)
    .filter((r): r is string => Boolean(r));
  const strict = strictestSafeRange(safeRanges);

  return {
    package: pkg,
    version,
    compliant: violations.length === 0,
    hits,
    strictestSafeRange: strict,
    primaryKind: violations[0]?.kind,
  };
}

export function evaluateAgainstPolicy(
  pkg: string,
  version: string,
  policy: SecurityPolicy,
  violations: PackageViolation[],
): PackageEvaluation {
  const hits: ConstraintHit[] = [];

  const allowed = policy.semver_packages[pkg];
  if (allowed) {
    const ok = SemverMatcher.satisfies(version, allowed);
    hits.push({
      kind: "allowed",
      ruleId: `allowed-${pkg}`,
      severity: "high",
      message: ok
        ? `${pkg}@${version} satisfies allow floor ${allowed}`
        : `${pkg}@${version} below allow floor ${allowed}`,
      range: allowed,
      safeRange: allowed,
      violated: !ok,
    });
  }

  const blocked = policy.semver_blocked[pkg];
  if (blocked) {
    const hit = SemverMatcher.satisfies(version, blocked);
    hits.push({
      kind: "blocked",
      ruleId: `blocked-${pkg}`,
      severity: "critical",
      message: hit
        ? `${pkg}@${version} matches blocked range ${blocked}`
        : `${pkg}@${version} outside blocked range ${blocked}`,
      range: blocked,
      violated: hit,
    });
  }

  for (const rule of policy.semver_rules) {
    if (rule.package !== pkg) continue;
    const hit = SemverMatcher.satisfies(version, rule.range);
    hits.push({
      kind: "semver_rule",
      ruleId: rule.id,
      severity: rule.severity,
      message: hit
        ? `${rule.description} (matches ${rule.range})`
        : `${rule.description} (clear — outside ${rule.range})`,
      range: rule.range,
      safeRange: rule.safeRange,
      violated: hit,
    });
  }

  for (const v of violations) {
    if (v.kind === "threat") {
      hits.push({
        kind: "threat",
        ruleId: v.ruleId,
        severity: v.severity,
        message: v.cve ? `${v.message} (${v.cve})` : v.message,
        range: v.vulnRange,
        safeRange: v.safeRange,
        cve: v.cve,
        violated: true,
      });
    }
  }

  return evaluationFromViolations(pkg, version, violations, hits);
}

export function explainEvaluation(eval_: PackageEvaluation): string[] {
  const lines: string[] = [
    `${eval_.package}@${eval_.version} — ${eval_.compliant ? "COMPLIANT" : "VIOLATION"}`,
  ];
  for (const hit of eval_.hits) {
    const mark = hit.violated ? "✗" : "✓";
    const kind = `[${hit.kind}]`;
    lines.push(`  ${mark} ${kind} ${hit.ruleId}: ${hit.message}`);
  }
  if (eval_.strictestSafeRange) {
    lines.push(`  → strictest safe range: ${eval_.strictestSafeRange}`);
  }
  return lines;
}