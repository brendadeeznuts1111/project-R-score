import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { SemverMatcher } from "../../scripts/scan/transpiler/semver-matcher.ts";
import { loadPolicyFromSkill } from "../../scripts/scan/transpiler/policy-loader.ts";
import { Registry } from "../../scripts/scan/transpiler/registry.ts";
import { Service } from "../../scripts/scan/transpiler/service.ts";
import {
  validateScannerCompatibility,
  validateSnapshotVersion,
} from "../../scripts/scan/transpiler/snapshot.ts";
import { FeedParser } from "../../scripts/scan/transpiler/feed.ts";
import { suggestUpgrade, inferSafeRange } from "../../scripts/scan/transpiler/remediation.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

describe("SemverMatcher policy runtime (Layer 5)", () => {
  test("checkRule returns first matching semver_rule", () => {
    const rules = [
      {
        id: "a",
        package: "axios",
        range: "<1.6.0",
        severity: "high" as const,
        description: "upgrade axios",
      },
    ];
    expect(SemverMatcher.checkRule("axios", "1.5.0", rules)?.id).toBe("a");
    expect(SemverMatcher.checkRule("axios", "1.16.1", rules)).toBeNull();
  });

  test("latestSatisfying picks highest compatible version", () => {
    const latest = SemverMatcher.latestSatisfying(
      ["1.0.0", "1.5.0", "1.0.1"],
      "^1.0.0",
    );
    expect(latest).toBe("1.5.0");
  });

  test("loadPolicy reads semver rules, packages, blocked, scanner range", async () => {
    const policy = await loadPolicyFromSkill(SKILL_ROOT);
    expect(policy.semver_rules.length).toBeGreaterThanOrEqual(3);
    expect(policy.snapshot?.snapshotVersionRange).toBe("^2.0.0");
    expect(policy.snapshot?.compatibleScannerVersions).toBe(">=2.0.0 <3.0.0");
    expect(policy.semver_packages.lodash).toBe(">=4.17.21");
    expect(policy.semver_blocked["left-pad"]).toBe("<1.0.0");
  });

  test("Registry.checkPackageVersions flags vulnerable lodash", async () => {
    const registry = new Registry(SKILL_ROOT);
    const violations = await registry.checkPackageVersions({ lodash: "4.17.20" });
    expect(violations.some((v) => v.rule.id === "lodash-prototype-policy")).toBe(true);
  });

  test("FeedParser.matchThreats uses versionRange", async () => {
    const feed = new FeedParser(SKILL_ROOT);
    const matches = await feed.matchThreats("lodash", "4.17.20");
    expect(matches.some((m) => m.cve === "CVE-2020-8203")).toBe(true);
    expect(matches[0]?.versionRange).toBe("<4.17.21");
  });

  test("Registry.checkAllViolations dedupes allowed + threat + semver_rule", async () => {
    const registry = new Registry(SKILL_ROOT);
    const rows = await registry.checkAllViolations(
      { lodash: "4.17.20", axios: "1.16.1" },
      { threatFeed: true },
    );
    const lodash = rows.find((r) => r.package === "lodash");
    expect(lodash).toBeDefined();
    expect(lodash?.kinds).toContain("threat");
    expect(lodash?.kinds).toContain("allowed");
    expect(rows.filter((r) => r.package === "lodash")).toHaveLength(1);
  });

  test("suggestUpgrade infers safe range from vuln range", async () => {
    expect(inferSafeRange("<4.17.21")).toBe(">=4.17.21");
    const hint = await suggestUpgrade({
      repo: REPO_ROOT,
      package: "lodash",
      currentVersion: "4.17.20",
      vulnRange: "<4.17.21",
    });
    expect(hint?.safeRange).toBe(">=4.17.21");
  });

  test("Service.scanPackages returns findings + remediations", async () => {
    const service = new Service({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      targetPath: "projects/active/sports-terminal-os",
      minSeverity: "warn",
      threatFeed: true,
    });
    const result = await service.scanPackages();
    expect(Array.isArray(result.findings)).toBe(true);
    expect(Array.isArray(result.remediations)).toBe(true);
  });

  test("validateScannerCompatibility enforces scanner range", async () => {
    const policy = await loadPolicyFromSkill(SKILL_ROOT);
    expect(validateScannerCompatibility("2.0.0", policy).compatible).toBe(true);
    expect(validateScannerCompatibility("1.5.0", policy).compatible).toBe(false);
    expect(validateScannerCompatibility("3.0.0", policy).compatible).toBe(false);
  });

  test("validateSnapshotVersion legacy missing field", async () => {
    const policy = await loadPolicyFromSkill(SKILL_ROOT);
    const result = validateSnapshotVersion({}, policy);
    expect(result.compatible).toBe(true);
    expect(result.legacy).toBe(true);
  });

  test("validateSnapshotVersion rejects out-of-range", async () => {
    const policy = await loadPolicyFromSkill(SKILL_ROOT);
    const result = validateSnapshotVersion({ snapshotVersion: "1.0.0" }, policy);
    expect(result.compatible).toBe(false);
  });
});