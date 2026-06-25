import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  REPO_ROOT,
  appendHistory,
  buildGithubSummary,
  buildHtml,
  buildJson,
  buildHistoryChart,
  buildPipelineSvg,
  escapeHtml,
  gatesForRun,
  historyFromReport,
  loadAstGrepRules,
  loadHistory,
  parseMetrics,
  parseRuleYaml,
  type GateResult,
  type Report,
} from "./gate-report.ts";

function sampleGate(overrides: Partial<GateResult> = {}): GateResult {
  return {
    id: "test",
    label: "Bun tests",
    description: "Test suite",
    command: "bun run test",
    status: "pass",
    exitCode: 0,
    durationMs: 120,
    stdout: "33 pass\n0 fail\n112 expect() calls",
    stderr: "",
    metrics: { tests: 33, failed: 0, expects: 112 },
    ...overrides,
  };
}

function sampleReport(overrides: Partial<Report> = {}): Report {
  return {
    generatedAt: "2026-06-24T12:00:00.000Z",
    bunVersion: "1.4.0",
    astGrepVersion: "0.44.0",
    mode: "live",
    overall: "pass",
    totalDurationMs: 1500,
    gates: [
      {
        id: "typecheck",
        label: "Typecheck",
        description: "tsc",
        command: "bun run typecheck",
        status: "pass",
        exitCode: 0,
        durationMs: 900,
        stdout: "",
        stderr: "",
        metrics: {},
      },
      sampleGate(),
    ],
    astGrepRules: [
      { id: "no-node-fs", severity: "warning", message: "Prefer Bun.file" },
      { id: "bun-serve-exact-signature", severity: "error", message: "Bun.serve expects options" },
    ],
    ...overrides,
  };
}

describe("gate-report helpers", () => {
  test("escapeHtml encodes special characters", () => {
    expect(escapeHtml(`<script>"a&b"</script>`)).toBe(
      "&lt;script&gt;&quot;a&amp;b&quot;&lt;/script&gt;"
    );
  });

  test("parseMetrics extracts ast-grep and test counts", () => {
    expect(parseMetrics("ast-grep-test", "test result: ok. 15 passed; 0 failed", "")).toEqual({
      rules: 15,
      failed: 0,
    });
    expect(parseMetrics("test", "33 pass\n0 fail\n112 expect() calls", "")).toEqual({
      tests: 33,
      failed: 0,
      expects: 112,
    });
    expect(parseMetrics("verify-hashes", "OK: skill-a\nAll hashes match.\n", "")).toEqual({
      skills: 1,
      matched: "yes",
    });
  });

  test("parseRuleYaml reads rule metadata", () => {
    const yaml = `id: no-node-fs
severity: warning
message: "Prefer Bun.file / Bun.write over node:fs imports in Bun projects"`;
    expect(parseRuleYaml(yaml)).toEqual({
      id: "no-node-fs",
      severity: "warning",
      message: "Prefer Bun.file / Bun.write over node:fs imports in Bun projects",
    });
  });

  test("gatesForRun adds grounding gate when requested", () => {
    expect(gatesForRun(false)).toHaveLength(5);
    expect(gatesForRun(true).map((g) => g.id)).toContain("ground-references");
  });

  test("loadAstGrepRules finds all project rules", async () => {
    const rules = await loadAstGrepRules(REPO_ROOT);
    expect(rules.length).toBe(15);
    expect(rules.map((r) => r.id)).toContain("effect-prefer-tagged-error");
    expect(rules.map((r) => r.id)).toContain("no-node-fs");
  });
});

describe("gate-report builders", () => {
  test("buildHtml includes pipeline, rules, and pass status", () => {
    const html = buildHtml(sampleReport());
    expect(html).toContain("All gates passed");
    expect(html).toContain("ast-grep rule inventory");
    expect(html).toContain("no-node-fs");
    expect(html).toContain("<svg class=\"pipeline\"");
    expect(html).toContain("Gate details");
  });

  test("buildHtml reflects failure state", () => {
    const html = buildHtml(
      sampleReport({
        overall: "fail",
        gates: [sampleGate({ id: "test", status: "fail", exitCode: 1 })],
      })
    );
    expect(html).toContain("1 gate(s) failed");
    expect(html).toContain('class="gate-card fail"');
  });

  test("buildHtml labels fixture reports as demo", () => {
    const html = buildHtml(
      sampleReport({
        mode: "fixture-fail",
        overall: "fail",
        gates: [sampleGate({ id: "ast-grep-scan", status: "fail", exitCode: 1 })],
      })
    );
    expect(html).toContain("Demo report");
    expect(html).toContain("not a real run");
    expect(html).not.toContain("<title>Plannator Gate Report — FAIL</title>");
  });

  test("buildPipelineSvg renders one node per gate", () => {
    const svg = buildPipelineSvg(sampleReport().gates);
    expect(svg).toContain("Typecheck");
    expect(svg).toContain("PASS");
    expect(svg).toContain("<svg");
  });

  test("buildGithubSummary is markdown table", () => {
    const md = buildGithubSummary(sampleReport());
    expect(md).toContain("## Plannator gate report");
    expect(md).toContain("| Typecheck |");
    expect(md).toContain("✅");
  });

  test("buildJson round-trips report shape", () => {
    const report = sampleReport();
    const parsed = JSON.parse(buildJson(report)) as Report;
    expect(parsed.overall).toBe("pass");
    expect(parsed.astGrepRules).toHaveLength(2);
    expect(parsed.gates[1].metrics.tests).toBe(33);
  });

  test("buildHtml includes history chart when entries exist", () => {
    const html = buildHtml(
      sampleReport(),
      [
        {
          generatedAt: "2026-06-24T10:00:00.000Z",
          overall: "pass",
          totalDurationMs: 1200,
          gatesPassed: 5,
          gatesTotal: 5,
        },
        {
          generatedAt: "2026-06-24T11:00:00.000Z",
          overall: "fail",
          totalDurationMs: 900,
          gatesPassed: 4,
          gatesTotal: 5,
        },
      ]
    );
    expect(html).toContain("Run history");
    expect(html).toContain("history-chart");
    expect(html).toContain("pass rate:");
  });

  test("buildHistoryChart returns empty for no history", () => {
    expect(buildHistoryChart([])).toBe("");
  });

  test("historyFromReport summarizes gate counts", () => {
    const entry = historyFromReport(sampleReport());
    expect(entry.gatesPassed).toBe(2);
    expect(entry.gatesTotal).toBe(2);
    expect(entry.overall).toBe("pass");
  });
});

describe("gate-report history persistence", () => {
  test("appendHistory and loadHistory round-trip", async () => {
    const path = `${Bun.env.TMPDIR ?? "/tmp"}/plannator-history-${Bun.randomUUIDv7()}.jsonl`;
    const report = sampleReport();
    await appendHistory(report, path);
    await appendHistory({ ...report, overall: "fail" }, path);
    const loaded = await loadHistory(path, 10);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].overall).toBe("pass");
    expect(loaded[1].overall).toBe("fail");
    await Bun.spawn({ cmd: ["rm", "-f", path] }).exited;
  });
});