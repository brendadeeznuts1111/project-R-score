#!/usr/bin/env bun
/**
 * Run plannator quality gates and emit HTML + JSON dashboards.
 */

import { join } from "node:path";
import {
  DEFAULT_HTML_OUTPUT,
  DEFAULT_JSON_OUTPUT,
  appendHistory,
  buildFixtureReport,
  buildGithubSummary,
  buildHtml,
  buildJson,
  gatesForRun,
  historyFromReport,
  loadAstGrepRules,
  loadHistory,
  runGate,
  toolVersion,
  REPO_ROOT,
  type GateResult,
  type Report,
} from "../lib/gate-report.ts";

function printUsage(): void {
  console.log("Usage: bun run gate-report [options]");
  console.log("  --output <path>       HTML output (default: reports/gate-report.html)");
  console.log("  --json <path>         JSON output (default: reports/gate-report.json)");
  console.log("  --open                Open HTML report in default browser");
  console.log("  --with-grounding      Include ground-references gate");
  console.log("  --fail-fast           Stop after first failing gate");
  console.log("  --no-history          Skip appending to reports/history.jsonl");
  console.log("  --fixture <pass|fail> Build demo report without running gates");
}

async function main(): Promise<number> {
  const args = Bun.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return 0;
  }

  let htmlPath = DEFAULT_HTML_OUTPUT;
  let jsonPath = DEFAULT_JSON_OUTPUT;
  const openAfter = args.includes("--open");
  const includeGrounding = args.includes("--with-grounding");
  const failFast = args.includes("--fail-fast");
  const skipHistory = args.includes("--no-history");

  let fixture: "pass" | "fail" | null = null;
  let jsonExplicit = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" && args[i + 1]) {
      htmlPath = args[i + 1].startsWith("/") ? args[i + 1] : join(REPO_ROOT, args[i + 1]);
      i++;
    } else if (args[i] === "--json" && args[i + 1]) {
      jsonPath = args[i + 1].startsWith("/") ? args[i + 1] : join(REPO_ROOT, args[i + 1]);
      jsonExplicit = true;
      i++;
    } else if (args[i] === "--fixture" && args[i + 1]) {
      fixture = args[i + 1] === "fail" ? "fail" : "pass";
      i++;
    }
  }
  if (!jsonExplicit && htmlPath !== DEFAULT_HTML_OUTPUT) {
    jsonPath = htmlPath.replace(/\.html$/i, ".json");
  }

  const start = Bun.nanoseconds();
  let report: Report;

  if (fixture) {
    console.log(`Building ${fixture} fixture report …`);
    report = await buildFixtureReport(fixture);
  } else {
    const [bunVersion, astGrepVersion, astGrepRules] = await Promise.all([
      toolVersion(["bun", "--version"]),
      toolVersion(["ast-grep", "--version"], "not installed"),
      loadAstGrepRules(),
    ]);

    console.log("Running quality gates …");
    const gates: GateResult[] = [];
    for (const gate of gatesForRun(includeGrounding)) {
      process.stdout.write(`  ${gate.label} … `);
      const result = await runGate(gate);
      gates.push(result);
      console.log(result.status === "pass" ? "PASS" : "FAIL");
      if (result.status === "fail" && failFast) {
        console.log("Stopping early (--fail-fast)");
        break;
      }
    }

    report = {
      generatedAt: new Date().toISOString(),
      bunVersion,
      astGrepVersion,
      overall: gates.every((g) => g.status === "pass") ? "pass" : "fail",
      totalDurationMs: Math.round((Bun.nanoseconds() - start) / 1_000_000),
      gates,
      astGrepRules,
    };
  }

  let history = await loadHistory();
  if (!skipHistory && !fixture) {
    await appendHistory(report);
    history = [...history, historyFromReport(report)];
  }

  await Bun.write(htmlPath, buildHtml(report, history));
  await Bun.write(jsonPath, buildJson(report));
  console.log(`\nHTML: ${htmlPath}`);
  console.log(`JSON: ${jsonPath}`);

  const summaryPath = Bun.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const existing = (await Bun.file(summaryPath).exists())
      ? await Bun.file(summaryPath).text()
      : "";
    await Bun.write(summaryPath, `${existing}\n${buildGithubSummary(report)}\n`);
    console.log("GitHub step summary updated");
  }

  if (openAfter) {
    const platform = process.platform;
    const openCmd =
      platform === "darwin"
        ? ["open", htmlPath]
        : platform === "win32"
          ? ["cmd", "/c", "start", "", htmlPath]
          : ["xdg-open", htmlPath];
    await Bun.spawn({ cmd: openCmd }).exited;
  }

  // Fixtures are visual demos — don't fail the shell.
  if (fixture) return 0;
  return report.overall === "pass" ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);