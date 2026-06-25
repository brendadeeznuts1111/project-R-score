import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SemverMatcher } from "./semver-matcher.ts";
import type { SemverRule, SecurityPolicy } from "./policy-loader.ts";
import { loadPolicyFromSkill } from "./policy-loader.ts";
import { FeedParser, type ThreatMatch } from "./feed.ts";
import type { RepoTarget } from "./bundle-scanner.ts";
import type { Severity } from "./types.ts";
import { SEVERITY_RANK, normalizeSeverity } from "./rule-engine.ts";
import { strictestSafeRange, evaluateAgainstPolicy } from "./policy-engine.ts";

export type SemverViolation = {
  rule: SemverRule;
  package: string;
  version: string;
};

export type ViolationKind = "semver_rule" | "allowed" | "blocked" | "threat";

export type PackageViolation = {
  kind: ViolationKind;
  kinds?: ViolationKind[];
  package: string;
  version: string;
  ruleId: string;
  severity: Severity;
  message: string;
  vulnRange?: string;
  safeRange?: string;
  cve?: string;
};

const KIND_PRIORITY: Record<ViolationKind, number> = {
  blocked: 4,
  threat: 3,
  semver_rule: 2,
  allowed: 1,
};

export function dedupeViolations(rows: PackageViolation[]): PackageViolation[] {
  const byPkg = new Map<string, PackageViolation[]>();
  for (const row of rows) {
    const list = byPkg.get(row.package) ?? [];
    list.push(row);
    byPkg.set(row.package, list);
  }

  const out: PackageViolation[] = [];
  for (const group of byPkg.values()) {
    if (group.length === 1) {
      out.push({ ...group[0], kinds: [group[0].kind] });
      continue;
    }

    const kinds = [...new Set(group.map((g) => g.kind))];
    const primary = group.reduce((best, cur) => {
      const bp = KIND_PRIORITY[best.kind];
      const cp = KIND_PRIORITY[cur.kind];
      if (cp !== bp) return cp > bp ? cur : best;
      const bs = SEVERITY_RANK[normalizeSeverity(best.severity)] ?? 0;
      const cs = SEVERITY_RANK[normalizeSeverity(cur.severity)] ?? 0;
      return cs > bs ? cur : best;
    });
    const maxSev = group.reduce((max, g) => {
      const gs = SEVERITY_RANK[normalizeSeverity(g.severity)] ?? 0;
      const ms = SEVERITY_RANK[normalizeSeverity(max.severity)] ?? 0;
      return gs > ms ? g : max;
    }, group[0]);

    const safeRanges = group.map((g) => g.safeRange).filter((r): r is string => Boolean(r));
    out.push({
      ...primary,
      severity: maxSev.severity,
      kinds,
      safeRange: strictestSafeRange(safeRanges) ?? primary.safeRange,
      cve: group.find((g) => g.cve)?.cve ?? primary.cve,
      message: kinds.length > 1
        ? `${primary.package}@${primary.version} — [${kinds.join("+")}] ${primary.message}`
        : primary.message,
    });
  }
  return out;
}

export class Registry {
  readonly semver = SemverMatcher;
  private policyCache: SecurityPolicy | null = null;
  readonly feed: FeedParser;

  constructor(private readonly skillRoot: string) {
    this.feed = new FeedParser(skillRoot);
  }

  async loadPolicy(): Promise<SecurityPolicy> {
    if (!this.policyCache) {
      this.policyCache = await loadPolicyFromSkill(this.skillRoot);
    }
    return this.policyCache;
  }

  async loadTargets(): Promise<RepoTarget[]> {
    const mapPath = join(this.skillRoot, "repo-map.json");
    const map = JSON.parse(await readFile(mapPath, "utf8")) as { targets: RepoTarget[] };
    return map.targets ?? [];
  }

  getTarget(targets: RepoTarget[], domainId: string): RepoTarget | null {
    const q = domainId.toLowerCase();
    return (
      targets.find((t) => (t.id ?? "").toLowerCase() === q)
      ?? targets.find((t) => (t.name ?? "").toLowerCase() === q)
      ?? null
    );
  }

  async checkPackageVersions(
    packages: Record<string, string>,
    rules?: SemverRule[],
  ): Promise<SemverViolation[]> {
    const policy = await this.loadPolicy();
    const active = rules ?? policy.semver_rules;
    const violations: SemverViolation[] = [];

    for (const [pkg, version] of Object.entries(packages)) {
      const rule = SemverMatcher.checkRule(pkg, version, active);
      if (rule) violations.push({ rule, package: pkg, version });
    }
    return violations;
  }

  checkAllowedPackages(
    packages: Record<string, string>,
    allowed: Record<string, string>,
  ): PackageViolation[] {
    const out: PackageViolation[] = [];
    for (const [pkg, version] of Object.entries(packages)) {
      const range = allowed[pkg];
      if (!range) continue;
      if (SemverMatcher.satisfies(version, range)) continue;
      out.push({
        kind: "allowed",
        package: pkg,
        version,
        ruleId: `allowed-${pkg}`,
        severity: "high",
        message: `${pkg}@${version} below allowed range ${range}`,
        vulnRange: range,
        safeRange: range,
      });
    }
    return out;
  }

  checkBlockedPackages(
    packages: Record<string, string>,
    blocked: Record<string, string>,
  ): PackageViolation[] {
    const out: PackageViolation[] = [];
    for (const [pkg, version] of Object.entries(packages)) {
      const range = blocked[pkg];
      if (!range) continue;
      if (!SemverMatcher.satisfies(version, range)) continue;
      out.push({
        kind: "blocked",
        package: pkg,
        version,
        ruleId: `blocked-${pkg}`,
        severity: "critical",
        message: `${pkg}@${version} matches blocked range ${range}`,
        vulnRange: range,
      });
    }
    return out;
  }

  threatMatchesToViolations(matches: ThreatMatch[]): PackageViolation[] {
    return matches.map((m) => ({
      kind: "threat" as const,
      package: m.package,
      version: m.matchedVersion,
      ruleId: m.id,
      severity: m.severity,
      message: m.message,
      vulnRange: m.versionRange,
      safeRange: m.safeRange,
      cve: m.cve,
    }));
  }

  semverViolationsToPackage(rows: SemverViolation[]): PackageViolation[] {
    return rows.map((v) => ({
      kind: "semver_rule" as const,
      package: v.package,
      version: v.version,
      ruleId: v.rule.id,
      severity: v.rule.severity,
      message: v.rule.description,
      vulnRange: v.rule.range,
      safeRange: v.rule.safeRange,
    }));
  }

  async checkAllViolations(
    packages: Record<string, string>,
    options: { threatFeed?: boolean } = {},
  ): Promise<PackageViolation[]> {
    const policy = await this.loadPolicy();
    const rows: PackageViolation[] = [];

    rows.push(...this.semverViolationsToPackage(await this.checkPackageVersions(packages)));
    rows.push(...this.checkAllowedPackages(packages, policy.semver_packages));
    rows.push(...this.checkBlockedPackages(packages, policy.semver_blocked));

    if (options.threatFeed !== false) {
      const threats = await this.feed.matchAllPackages(packages);
      rows.push(...this.threatMatchesToViolations(threats));
    }

    return dedupeViolations(rows);
  }

  async evaluatePackage(
    pkg: string,
    version: string,
    options: { threatFeed?: boolean } = {},
  ): Promise<ReturnType<typeof evaluateAgainstPolicy>> {
    const policy = await this.loadPolicy();
    const violations = await this.checkAllViolations({ [pkg]: version }, options);
    const pkgViolations = violations.filter((v) => v.package === pkg);
    return evaluateAgainstPolicy(pkg, version, policy, pkgViolations);
  }
}