import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SemverMatcher } from "./semver-matcher.ts";
import type { SemverRule, SecurityPolicy } from "./policy-loader.ts";
import { loadPolicyFromSkill } from "./policy-loader.ts";
import type { RepoTarget } from "./bundle-scanner.ts";

export type SemverViolation = {
  rule: SemverRule;
  package: string;
  version: string;
};

export class Registry {
  readonly semver = SemverMatcher;
  private policyCache: SecurityPolicy | null = null;

  constructor(private readonly skillRoot: string) {}

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
}