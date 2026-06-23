import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { SemverMatcher } from "../scripts/scan/transpiler/semver-matcher.ts";
import { loadPolicyFromSkill } from "../scripts/scan/transpiler/policy-loader.ts";
import { Registry } from "../scripts/scan/transpiler/registry.ts";
import { Service } from "../scripts/scan/transpiler/service.ts";
import { validateSnapshotVersion } from "../scripts/scan/transpiler/snapshot.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");
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

  test("loadPolicy reads [semver_rule] from security.policy.toml", async () => {
    const policy = await loadPolicyFromSkill(SKILL_ROOT);
    expect(policy.semver_rules.length).toBeGreaterThanOrEqual(3);
    expect(policy.snapshot?.snapshotVersionRange).toBe("^2.0.0");
  });

  test("Registry.checkPackageVersions flags vulnerable lodash", async () => {
    const registry = new Registry(SKILL_ROOT);
    const violations = await registry.checkPackageVersions({ lodash: "4.17.20" });
    expect(violations.some((v) => v.rule.id === "lodash-prototype-policy")).toBe(true);
  });

  test("Service.scanPackages on sports-terminal target", async () => {
    const service = new Service({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      targetPath: "projects/active/sports-terminal-os",
      minSeverity: "warn",
    });
    const findings = await service.scanPackages();
    expect(Array.isArray(findings)).toBe(true);
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