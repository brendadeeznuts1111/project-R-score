import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { loadRuleSet, meetsSeverity, resolvePattern } from "../scripts/scan/transpiler/rule-engine.ts";
import { analyzeFile } from "../scripts/scan/transpiler/analyzer.ts";
import { formatMarkdown } from "../scripts/scan/transpiler/reporter.ts";
import { runBundleScan } from "../scripts/scan/transpiler/bundle-scanner.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");

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
      repo: resolve(SKILL_ROOT, "../.."),
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
      targets: [],
      summary: { files: 0, findings: 0, by_severity: {} },
    });
    expect(md).toContain("Layer 4.5");
  });
});