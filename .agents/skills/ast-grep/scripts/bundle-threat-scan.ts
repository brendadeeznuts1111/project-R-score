#!/usr/bin/env bun
/**
 * Bundle / supply-chain scan CLI (Layer 4.5) — thin wrapper over scan/transpiler.
 *
 *   bun scripts/bundle-threat-scan.ts --repo . --zone agents --profile ci
 *   bun scripts/bundle-threat-scan.ts --path dist --format markdown --parallel
 */

import { resolve } from "node:path";
import { runBundleScan } from "./scan/transpiler/bundle-scanner.ts";
import { formatReport, maxSeverity } from "./scan/transpiler/reporter.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");

function parseArgs(argv: string[]): Record<string, string | boolean | number> {
  const out: Record<string, string | boolean | number> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (key === "workers") {
      out.workers = Number(next);
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

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const repo = resolve(String(opts.repo ?? process.cwd()));
  const format = (typeof opts.format === "string" ? opts.format : "json") as "json" | "html" | "markdown";
  const ruleIds = typeof opts.rules === "string"
    ? opts.rules.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const report = await runBundleScan({
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

  if (opts["dry-run"] === true) {
    process.stdout.write(`${JSON.stringify({ dry_run: true, targets: report.targets })}\n`);
    return;
  }

  process.stdout.write(formatReport(report));

  const allFindings = report.targets.flatMap((t) => t.findings);
  const failSev = typeof opts["fail-on"] === "string" ? opts["fail-on"] : "error";
  if (opts["fail-on"] === true || opts["fail-on"]) {
    const worst = maxSeverity(allFindings);
    const rank = { info: 0, warn: 1, error: 2, critical: 3 } as Record<string, number>;
    if ((rank[worst] ?? 0) >= (rank[failSev] ?? 2)) process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});