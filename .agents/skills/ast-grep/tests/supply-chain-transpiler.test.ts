import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { loadRuleSet, meetsSeverity, resolvePattern } from "../scripts/scan/transpiler/rule-engine.ts";
import { analyzeFile } from "../scripts/scan/transpiler/analyzer.ts";
import { formatMarkdown } from "../scripts/scan/transpiler/reporter.ts";
import { runBundleScan } from "../scripts/scan/transpiler/bundle-scanner.ts";
import {
  compareVersions,
  isVulnerable,
  loadThreatFeed,
  matchDependencies,
} from "../scripts/scan/transpiler/semver-matcher.ts";
import { resolveTargetDependencies } from "../scripts/scan/transpiler/dependency-resolver.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

describe("supply-chain Layer 4.5", () => {
  test("loadRuleSet merges JSON + TOML policies", async () => {
    const rules = await loadRuleSet(SKILL_ROOT);
    const ids = [
      ...rules.import_rules,
      ...rules.source_rules,
      ...rules.output_rules,
    ].map((r) => r.id);
    expect(ids).toContain("eval-source");
    expect(ids).toContain("hardcoded-secret");
    expect(ids).toContain("unsafe-eval");
  });

  test("astPattern maps to eval regex", async () => {
    const rules = await loadRuleSet(SKILL_ROOT);
    const evalRule = rules.source_rules.find((r) => r.id === "unsafe-eval");
    expect(evalRule).toBeDefined();
    expect(resolvePattern(evalRule!)).toContain("eval");
  });

  test("analyzeFile detects eval in source", async () => {
    const rules = await loadRuleSet(SKILL_ROOT);
    const tmp = `/tmp/sc-test-${Date.now()}.ts`;
    await Bun.write(tmp, "export const x = eval('1');\n");
    const result = await analyzeFile({
      fullPath: tmp,
      repo: "/tmp",
      rules,
      profile: {
        min_severity: "info",
        transform_output: false,
        use_scan_imports: true,
        max_file_kb: 64,
      },
      manifest: null,
    });
    expect(result.findings.some((f) => f.ruleId === "eval-source" || f.ruleId === "unsafe-eval")).toBe(true);
    await Bun.file(tmp).delete();
  });

  test("meetsSeverity ranks critical above warn", () => {
    expect(meetsSeverity("critical", "warn")).toBe(true);
    expect(meetsSeverity("info", "error")).toBe(false);
  });

  test("runBundleScan dry-run agents zone", async () => {
    const report = await runBundleScan({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      profileName: "default",
      zone: "agents",
      dryRun: true,
    });
    expect(report.layer).toBe("4.5");
    expect(report.targets.length).toBeGreaterThan(0);
  });

  test("formatMarkdown includes layer header", async () => {
    const md = formatMarkdown({
      repo: "/repo",
      profile: "ci",
      layer: "4.5",
      min_severity: "error",
      format: "markdown",
      elapsed_ms: 1,
      workers: 1,
      integrity_enabled: false,
      threat_feed_enabled: true,
      advisories_matched: 2,
      targets: [],
      summary: { files: 0, findings: 0, by_severity: {} },
    });
    expect(md).toContain("Layer 4.5");
    expect(md).toContain("threat-feed");
  });

  test("Bun.semver.satisfies matches official doc examples", () => {
    expect(isVulnerable("1.0.0", "^1.0.0")).toBe(true);
    expect(isVulnerable("1.0.0", "^1.0.1")).toBe(false);
    expect(isVulnerable("1.0.0", "~1.0.0")).toBe(true);
    expect(isVulnerable("1.0.0", "1.0.0 - 2.0.0")).toBe(true);
    expect(isVulnerable("1.5.0", "<1.6.0")).toBe(true);
    expect(isVulnerable("1.16.1", "<1.6.0")).toBe(false);
    expect(isVulnerable("not-a-version", "<1.6.0")).toBe(false);
  });

  test("Bun.semver.order compares versions", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
    expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
  });

  test("matchDependencies flags lodash below patched range", async () => {
    const feed = await loadThreatFeed(SKILL_ROOT);
    const findings = matchDependencies(
      [{ name: "lodash", version: "4.17.20", spec: "4.17.20", source: "lock" }],
      feed,
      "warn",
    );
    expect(findings.some((f) => f.ruleId === "lodash-prototype-pollution")).toBe(true);
  });

  test("resolveTargetDependencies reads root package.json", async () => {
    const { dependencies } = await resolveTargetDependencies({
      repo: REPO_ROOT,
      targetPath: ".",
      includeDev: false,
    });
    expect(dependencies.some((d) => d.name === "axios")).toBe(true);
  });

  test("supply-chain-ci enables threat feed correlation", async () => {
    const report = await runBundleScan({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      profileName: "supply-chain-ci",
      scanPath: "projects/active/sports-terminal-os",
      threatFeed: true,
    });
    expect(report.threat_feed_enabled).toBe(true);
    expect(report.targets[0]?.findings.length).toBeGreaterThanOrEqual(0);
  });
});