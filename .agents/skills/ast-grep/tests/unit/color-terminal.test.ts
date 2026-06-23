import { describe, expect, test } from "bun:test";
import {
  ColorMatcher,
  COLOR_OUTPUT_FORMATS,
} from "../../scripts/scan/transpiler/color-matcher.ts";
import {
  enrichFindingColors,
  formatTerminalReport,
  severityBadgeStyle,
  severityHex,
} from "../../scripts/scan/transpiler/terminal-color.ts";
import { formatHtml, formatJson } from "../../scripts/scan/transpiler/reporter.ts";
import type { BundleScanReport } from "../../scripts/scan/transpiler/types.ts";

const sampleReport: BundleScanReport = {
  repo: "/repo",
  profile: "supply-chain-pillars",
  layer: "4.5",
  min_severity: "warn",
  format: "json",
  elapsed_ms: 12,
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
        action: "upgrade",
        safeRange: ">=4.17.21",
        suggestedVersion: "4.17.21",
        latestInLockfile: "4.17.21",
        command: "bun add lodash@4.17.21",
        reason: "Upgrade lodash",
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

describe("ColorMatcher", () => {
  test("exports all documented output formats", () => {
    expect(COLOR_OUTPUT_FORMATS).toContain("ansi-16m");
    expect(COLOR_OUTPUT_FORMATS).toContain("{rgba}");
  });

  test("round-trip red through number and hex", () => {
    const n = ColorMatcher.toNumber("red");
    expect(n).toBe(16711680);
    expect(ColorMatcher.toHex(n!)).toBe("#ff0000");
    expect(ColorMatcher.normalize("#ff0000")).toBe("red");
  });

  test("isValid rejects garbage", () => {
    expect(ColorMatcher.isValid("not-a-color")).toBe(false);
    expect(ColorMatcher.isValid("#ff0000")).toBe(true);
  });

  test("rgb and hsl string outputs", () => {
    expect(ColorMatcher.convert("red", "rgb")).toBe("rgb(255, 0, 0)");
    expect(String(ColorMatcher.convert("red", "hsl"))).toContain("hsl");
  });
});

describe("terminal + reporter color integration", () => {
  test("severityHex uses Bun.color", () => {
    expect(severityHex("critical")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test("severityBadgeStyle emits inline CSS", () => {
    expect(severityBadgeStyle("error")).toContain("background:#");
  });

  test("enrichFindingColors adds hex metadata", () => {
    const f = sampleReport.targets[0]!.findings[0]!;
    const enriched = enrichFindingColors(f);
    expect(enriched.colors?.severity).toMatch(/^#[0-9a-f]{6}$/i);
    expect(enriched.colors?.kinds?.length).toBe(2);
  });

  test("formatJson embeds color_docs, markdown, and finding colors", () => {
    const json = JSON.parse(formatJson(sampleReport));
    expect(json.color_docs).toContain("/runtime/color");
    expect(json.markdown_docs).toContain("/runtime/markdown");
    const html = json.markdown.rendered.html as string;
    expect(html).toContain("Supply-Chain Scan");
    expect(html.startsWith("<") || html.includes("id=")).toBe(true);
    expect(json.targets[0].findings[0].colors.severity).toBeTruthy();
  });

  test("formatHtml uses Bun.markdown.html pipeline", () => {
    const html = formatHtml(sampleReport);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<table>");
    expect(html).toContain("lodash");
  });

  test("formatTerminalReport includes remediation command", () => {
    const text = formatTerminalReport(sampleReport);
    expect(text).toContain("lodash");
    expect(text).toContain("bun add lodash@4.17.21");
  });
});