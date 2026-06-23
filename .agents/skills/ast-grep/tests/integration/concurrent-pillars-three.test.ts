import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { dedupeViolations, Registry } from "../../scripts/scan/transpiler/registry.ts";
import { scanDependencyViolations } from "../../scripts/scan/transpiler/dep-scan.ts";
import {
  buildSnapshotTemplate,
  migrateSnapshot,
  validateSnapshotVersion,
  captureSnapshot,
  diffSnapshotPackages,
  policyFingerprint,
} from "../../scripts/scan/transpiler/snapshot.ts";
import { loadPolicyFromSkill } from "../../scripts/scan/transpiler/policy-loader.ts";
import { formatMarkdown } from "../../scripts/scan/transpiler/reporter.ts";
import type { BundleScanReport } from "../../scripts/scan/transpiler/types.ts";
import { strictestSafeRange } from "../../scripts/scan/transpiler/policy-engine.ts";
import { suggestRemediation } from "../../scripts/scan/transpiler/remediation.ts";
import { buildRemediationPlan } from "../../scripts/scan/transpiler/remediation-plan.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

describe("three pillars — remediation, snapshot, policy", () => {
  test("dedupeViolations merges semver_rule + allowed + threat for same package", () => {
    const merged = dedupeViolations([
      {
        kind: "semver_rule",
        package: "lodash",
        version: "4.17.20",
        ruleId: "lodash-prototype-policy",
        severity: "high",
        message: "Lodash prototype pollution",
        vulnRange: "<4.17.21",
        safeRange: ">=4.17.21",
      },
      {
        kind: "allowed",
        package: "lodash",
        version: "4.17.20",
        ruleId: "allowed-lodash",
        severity: "high",
        message: "below allowed range",
        vulnRange: ">=4.17.21",
        safeRange: ">=4.17.21",
      },
      {
        kind: "threat",
        package: "lodash",
        version: "4.17.20",
        ruleId: "CVE-2020-8203",
        severity: "high",
        message: "Prototype pollution",
        vulnRange: "<4.17.21",
        safeRange: ">=4.17.21",
        cve: "CVE-2020-8203",
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.kinds?.sort()).toEqual(["allowed", "semver_rule", "threat"]);
    expect(merged[0]?.cve).toBe("CVE-2020-8203");
    expect(merged[0]?.message).toContain("[");
  });

  test("scanDependencyViolations attaches remediation hints", async () => {
    const registry = new Registry(SKILL_ROOT);
    const findings = await scanDependencyViolations({
      repo: REPO_ROOT,
      registry,
      packages: { lodash: "4.17.20" },
      threatFeed: true,
      minSeverity: "warn",
    });
    const lodash = findings.find((f) => f.file === "lodash");
    expect(lodash).toBeDefined();
    expect(lodash?.remediation?.safeRange).toBe(">=4.17.21");
    expect(lodash?.remediation?.command).toContain("bun add lodash@");
    expect(lodash?.kinds?.length).toBeGreaterThanOrEqual(2);
  });

  test("strictestSafeRange merges multiple floors", () => {
    expect(strictestSafeRange([">=1.6.0", ">=1.6.2"])).toBe(">=1.6.2");
    expect(strictestSafeRange([">=4.17.21", ">=4.17.21"])).toBe(">=4.17.21");
  });

  test("blocked package suggests removal not upgrade", async () => {
    const hint = await suggestRemediation({
      repo: REPO_ROOT,
      package: "left-pad",
      currentVersion: "0.0.1",
      kinds: ["blocked"],
      vulnRange: "<1.0.0",
    });
    expect(hint?.action).toBe("remove");
    expect(hint?.command).toBe("bun remove left-pad");
  });

  test("Registry.evaluatePackage explains all constraint kinds", async () => {
    const registry = new Registry(SKILL_ROOT);
    const eval_ = await registry.evaluatePackage("lodash", "4.17.20", { threatFeed: true });
    expect(eval_.compliant).toBe(false);
    expect(eval_.hits.some((h) => h.kind === "allowed" && h.violated)).toBe(true);
    expect(eval_.hits.some((h) => h.kind === "threat" && h.violated)).toBe(true);
    expect(eval_.strictestSafeRange).toBe(">=4.17.21");
  });

  test("buildRemediationPlan dedupes commands per package", async () => {
    const plan = await buildRemediationPlan({
      repo: REPO_ROOT,
      findings: [{
        type: "semver",
        file: "lodash",
        line: 0,
        column: 0,
        ruleId: "lodash-prototype-policy",
        severity: "high",
        message: "upgrade",
        layer: "deps",
        packageVersion: "4.17.20",
        kinds: ["semver_rule", "threat", "allowed"],
        remediation: {
          action: "upgrade",
          safeRange: ">=4.17.21",
          suggestedVersion: "4.17.21",
          latestInLockfile: null,
          command: "bun add lodash@4.17.21",
          reason: "upgrade",
        },
      }],
    });
    expect(plan.items).toHaveLength(1);
    expect(plan.commands).toHaveLength(1);
    expect(plan.upgrades).toBe(1);
  });

  test("buildSnapshotTemplate includes policy fingerprint", async () => {
    const template = await buildSnapshotTemplate(SKILL_ROOT);
    expect(template.snapshotVersion).toBe("2.0.0");
    expect(template.sections).toContain("policy");
    expect(template.sections).toContain("semver");
    expect(template.scannerVersion).toBeTruthy();
    expect(template.semver?.policyFingerprint).toBeTruthy();
    const fp = await policyFingerprint(SKILL_ROOT);
    expect(template.semver?.policyFingerprint).toBe(fp);
  });

  test("captureSnapshot pins packages and violation count", async () => {
    const snap = await captureSnapshot({
      skillRoot: SKILL_ROOT,
      packages: { lodash: "4.17.21", axios: "1.16.1" },
      violationCount: 0,
    });
    expect(snap.semver?.packages?.lodash).toBe("4.17.21");
    expect(snap.semver?.violationCount).toBe(0);
  });

  test("diffSnapshotPackages detects version drift", () => {
    const drift = diffSnapshotPackages(
      { semver: { packages: { lodash: "4.17.20" } } },
      { lodash: "4.17.21", ws: "8.18.0" },
    );
    expect(drift.changed).toHaveLength(1);
    expect(drift.added).toContain("ws");
    expect(drift.changed[0]?.package).toBe("lodash");
  });

  test("migrateSnapshot upgrades legacy snapshot", async () => {
    const result = await migrateSnapshot({
      skillRoot: SKILL_ROOT,
      snapshot: { branding: "legacy" },
    });
    expect(result.migrated).toBe(true);
    expect(result.after.snapshotVersion).toBeTruthy();
    expect(result.after.sections?.length).toBeGreaterThan(0);
    const policy = await loadPolicyFromSkill(SKILL_ROOT);
    expect(validateSnapshotVersion(result.after, policy).legacy).toBe(false);
  });

  test("formatMarkdown surfaces violation kind and remediation", () => {
    const report: BundleScanReport = {
      repo: "/tmp",
      profile: "test",
      layer: "4.5",
      min_severity: "warn",
      format: "markdown",
      elapsed_ms: 1,
      workers: 1,
      integrity_enabled: false,
      threat_feed_enabled: true,
      advisories_matched: 1,
      targets: [{
        id: "t",
        path: ".",
        skipped: false,
        files_scanned: 1,
        scan_ms: 1,
        files: [],
        findings: [{
          type: "semver",
          file: "lodash",
          line: 0,
          column: 0,
          ruleId: "lodash-prototype-policy",
          severity: "high",
          message: "upgrade lodash",
          layer: "deps",
          violationKind: "semver_rule",
          kinds: ["semver_rule", "threat"],
          remediation: {
            safeRange: ">=4.17.21",
            suggestedVersion: "4.17.21",
            latestInLockfile: "4.17.21",
            command: "bun add lodash@4.17.21",
          },
        }],
      }],
      summary: { files: 1, findings: 1, by_severity: { high: 1 } },
      remediation: {
        actionable: 1,
        upgrades: 1,
        removals: 0,
        commands: ["bun add lodash@4.17.21"],
      },
    };
    const md = formatMarkdown(report);
    expect(md).toContain("semver_rule+threat");
    expect(md).toContain("bun add lodash@4.17.21");
    expect(md).toContain("Remediation plan");
    expect(md).toContain("Summary by severity");
    expect(md).toContain("| Severity | Kind |");
  });
});