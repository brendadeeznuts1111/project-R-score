import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  expectBundleScanReport,
  expectDoctorSnapshot,
  expectMarkdownReport,
} from "../../scripts/scan/transpiler/expect-shapes.ts";
import { runBundleScan } from "../../scripts/scan/transpiler/bundle-scanner.ts";
import { formatMarkdown } from "../../scripts/scan/transpiler/reporter.ts";
import { captureSnapshot } from "../../scripts/scan/transpiler/snapshot.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

describe("live scan report shapes", () => {
  test("runBundleScan report passes expectBundleScanReport", async () => {
    const report = await runBundleScan({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      scanPath: `${SKILL_ROOT}/scripts/scan/transpiler/rule-engine.ts`,
      profileName: "supply-chain-pillars",
    });
    expectBundleScanReport(report);
    expect(report.profile).toEndWith("pillars");
  });

  test("markdown reporter output passes expectMarkdownReport", async () => {
    const report = await runBundleScan({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      scanPath: `${SKILL_ROOT}/scripts/scan/transpiler/analyzer.ts`,
      profileName: "supply-chain-pillars",
    });
    const md = formatMarkdown(report);
    expectMarkdownReport(md);
    expect(md).toContain("Layer 4.5");
  });

  test("captureSnapshot after scan-shaped packages", async () => {
    const snap = await captureSnapshot({
      skillRoot: SKILL_ROOT,
      packages: { "@ast-grep/cli": "0.44.0" },
      violationCount: 0,
    });
    expectDoctorSnapshot(snap);
    expect(snap.semver?.packages).toContainKey("@ast-grep/cli");
  });
});