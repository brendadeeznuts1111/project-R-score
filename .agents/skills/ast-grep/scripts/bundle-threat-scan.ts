#!/usr/bin/env bun
/**
 * Bundle / supply-chain scan CLI (Layer 4.5).
 *
 *   bun scripts/bundle-threat-scan.ts --repo . --zone agents --profile ci
 *   bun scripts/bundle-threat-scan.ts --path dist --watch --fix
 */

import { resolve } from "node:path";
import { runBundleScan } from "./scan/transpiler/bundle-scanner.ts";
import { formatReport, maxSeverity } from "./scan/transpiler/reporter.ts";
import { runWatchLoop } from "./scan/transpiler/watch.ts";
import { applyBundleFixes } from "./scan/transpiler/autofix.ts";
import type { BundleScanReport } from "./scan/transpiler/types.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");

function parseArgs(argv: string[]): Record<string, string | boolean | number> {
  const out: Record<string, string | boolean | number> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (key === "workers" || key === "watch-interval") {
      out[key] = Number(next);
      i++;
    } else if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

async function runScan(opts: Record<string, string | boolean | number>): Promise<BundleScanReport> {
  const repo = resolve(String(opts.repo ?? process.cwd()));
  const format = (typeof opts.format === "string" ? opts.format : "json") as "json" | "html" | "markdown";
  const ruleIds = typeof opts.rules === "string"
    ? opts.rules.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  return runBundleScan({
    skillRoot: SKILL_ROOT,
    repo,
    profileName: typeof opts.profile === "string" ? opts.profile : "default",
    zone: typeof opts.zone === "string" ? opts.zone : undefined,
    only: typeof opts.only === "string" ? opts.only : undefined,
    scanPath: typeof opts.path === "string" ? opts.path : undefined,
    format,
    parallel: opts.parallel === true,
    workers: typeof opts.workers === "number" ? opts.workers : undefined,
    integrityManifest: typeof opts["integrity-manifest"] === "string"
      ? opts["integrity-manifest"]
      : undefined,
    ruleIds,
    dryRun: opts["dry-run"] === true,
    threatFeed: opts["no-threat-feed"] === true
      ? false
      : opts["threat-feed"] === true
        ? true
        : undefined,
  });
}

async function emitReport(
  opts: Record<string, string | boolean | number>,
  report: BundleScanReport,
): Promise<number> {
  if (opts["dry-run"] === true) {
    process.stdout.write(`${JSON.stringify({ dry_run: true, targets: report.targets })}\n`);
    return 0;
  }

  const allFindings = report.targets.flatMap((t) => t.findings);

  if (opts.fix === true && allFindings.length > 0) {
    const dryRun = opts["dry-run-fix"] === true;
    const fixReport = await applyBundleFixes({
      skillRoot: SKILL_ROOT,
      repo: resolve(String(opts.repo ?? process.cwd())),
      findings: allFindings,
      targetPath: typeof opts.path === "string" ? opts.path : ".",
      dryRun,
    });
    if (!dryRun) {
      const srcN = fixReport.source.filter((s) => s.applied).length;
      if (srcN || fixReport.packages.length) {
        process.stderr.write(
          `[autofix] source=${srcN} package_cmds=${fixReport.packages.length}\n`,
        );
      }
    } else {
      process.stderr.write(
        `[autofix dry-run] source_rules=${fixReport.source.length} packages=${fixReport.packages.length}\n`,
      );
    }
  }

  if (opts.watch === true) {
    const summary = `${report.summary.findings} finding(s) in ${report.summary.files} file(s)`;
    process.stderr.write(`[watch] ${summary} — ${report.elapsed_ms}ms\n`);
    return allFindings.length > 0 ? 1 : 0;
  }

  process.stdout.write(formatReport(report));

  const failSev = typeof opts["fail-on"] === "string" ? opts["fail-on"] : "error";
  if (opts["fail-on"] === true || opts["fail-on"]) {
    const worst = maxSeverity(allFindings);
    const rank = { info: 0, warn: 1, error: 2, critical: 3 } as Record<string, number>;
    if ((rank[worst] ?? 0) >= (rank[failSev] ?? 2)) return 1;
  }
  return 0;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  opts.repo = resolve(String(opts.repo ?? process.cwd()));

  if (opts.watch === true) {
    const watchPath = typeof opts.path === "string" ? opts.path : ".";
    const interval = typeof opts["watch-interval"] === "number" ? opts["watch-interval"] : 750;
    process.stderr.write(`[watch] supply-chain scan path=${watchPath} interval=${interval}ms\n`);
    const ac = new AbortController();
    process.on("SIGINT", () => ac.abort());

    await runWatchLoop({
      repo: String(opts.repo),
      watchPath,
      intervalMs: interval,
      onEvent: async (reason) => {
        process.stderr.write(`[watch] scan triggered (${reason})\n`);
        const report = await runScan(opts);
        const code = await emitReport(opts, report);
        if (code && opts["fail-on"]) process.exitCode = code;
      },
      signal: ac.signal,
    });
    return;
  }

  const report = await runScan(opts);
  process.exit(await emitReport(opts, report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});