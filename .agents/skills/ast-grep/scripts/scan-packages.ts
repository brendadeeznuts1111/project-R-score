#!/usr/bin/env bun
/**
 * Package version policy + threat-feed scan (Layer 5).
 *
 *   bun scripts/scan-packages.ts --path . --threat-feed --fix
 *   bun scripts/scan-packages.ts --path . --format markdown --profile pillars
 */

import { resolve } from "node:path";
import { scanPackagesForTarget } from "./scan/transpiler/service.ts";
import { loadPackageProfile } from "./scan/transpiler/profile-loader.ts";
import { runWatchLoop } from "./scan/transpiler/watch.ts";
import {
  formatFindingLine,
  formatRemediationPlan,
  okLine,
} from "./scan/transpiler/terminal-color.ts";
import {
  buildPackageScanMarkdown,
  renderMarkdownDocument,
  type ReportRenderFormat,
} from "./scan/transpiler/markdown-reporter.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");

function parseArgs(argv: string[]): Record<string, string | boolean | number> {
  const out: Record<string, string | boolean | number> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (key === "watch-interval") {
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

async function resolveFormat(
  opts: Record<string, string | boolean | number>,
): Promise<ReportRenderFormat> {
  if (typeof opts.format === "string") return opts.format as ReportRenderFormat;
  const profile = await loadPackageProfile(
    SKILL_ROOT,
    typeof opts.profile === "string" ? opts.profile : undefined,
  );
  return profile.report_format ?? "json";
}

function printRemediation(
  findings: Awaited<ReturnType<typeof scanPackagesForTarget>>["findings"],
  plan?: Awaited<ReturnType<typeof scanPackagesForTarget>>["plan"],
): void {
  for (const f of findings) console.log(formatFindingLine(f));
  if (plan?.items.length) {
    console.log("");
    console.log(formatRemediationPlan(plan));
  }
}

async function runOnce(opts: Record<string, string | boolean | number>) {
  const repo = resolve(String(opts.repo ?? process.cwd()));
  const explicitThreatOff = opts["no-threat-feed"] === true;
  const explicitThreatOn = opts["threat-feed"] === true;

  return scanPackagesForTarget({
    skillRoot: SKILL_ROOT,
    repo,
    targetId: typeof opts.domain === "string" ? opts.domain : undefined,
    targetPath: typeof opts.path === "string" ? opts.path : undefined,
    packageProfileName: typeof opts.profile === "string" ? opts.profile : undefined,
    minSeverity: typeof opts["min-severity"] === "string"
      ? opts["min-severity"] as "warn"
      : undefined,
    threatFeed: explicitThreatOff ? false : explicitThreatOn ? true : undefined,
    fix: opts.fix === true,
    dryRunFix: opts["dry-run"] === true && opts.fix === true,
  });
}

async function printResult(
  opts: Record<string, string | boolean | number>,
  result: Awaited<ReturnType<typeof runOnce>>,
  watch = false,
): Promise<number> {
  const format = await resolveFormat(opts);
  const profile = await loadPackageProfile(
    SKILL_ROOT,
    typeof opts.profile === "string" ? opts.profile : undefined,
  );
  const payload = {
    layer: "5",
    command: "scan packages",
    profile: typeof opts.profile === "string" ? opts.profile : "default",
    threatFeed: result.threatFeed,
    ...result,
    clean: result.findings.length === 0,
    format,
  };

  if (format !== "json" && !watch) {
    const md = buildPackageScanMarkdown(payload);
    process.stdout.write(renderMarkdownDocument(md, format, {
      colored: profile.markdown_colored !== false,
    }));
  } else if (opts.json === true && !watch) {
    const md = buildPackageScanMarkdown(payload);
    process.stdout.write(`${JSON.stringify({
      ...payload,
      markdown_source: md,
    }, null, 2)}\n`);
  } else if (result.findings.length === 0) {
    const msg = okLine(`✅ All packages satisfy policies + threat-feed (${result.targetId})`);
    if (watch) process.stderr.write(`[watch] ${msg}\n`);
    else console.log(msg);
  } else {
    if (watch) {
      process.stderr.write(`[watch] ${result.findings.length} violation(s)\n`);
      for (const f of result.findings.slice(0, 5)) {
        process.stderr.write(`  [${f.severity}] ${f.file} ${f.ruleId}\n`);
      }
    } else {
      printRemediation(result.findings, result.plan);
    }
    if (result.fixesApplied.length) {
      const lines = result.fixesApplied.map((c) => `  ${c}`).join("\n");
      if (watch) process.stderr.write(`[watch] fixes:\n${lines}\n`);
      else {
        console.log("\n✅ Fixes applied:");
        for (const cmd of result.fixesApplied) console.log(`  ${cmd}`);
      }
    }
  }

  if (opts["fail-on"] === true && result.findings.length > 0) return 1;
  return 0;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  opts.repo = resolve(String(opts.repo ?? process.cwd()));

  if (opts.watch === true) {
    const watchPath = typeof opts.path === "string" ? opts.path : ".";
    const interval = typeof opts["watch-interval"] === "number" ? opts["watch-interval"] : 750;
    process.stderr.write(`[watch] packages path=${watchPath} interval=${interval}ms\n`);
    const ac = new AbortController();
    process.on("SIGINT", () => ac.abort());

    await runWatchLoop({
      repo: String(opts.repo),
      watchPath,
      intervalMs: interval,
      onEvent: async (reason) => {
        process.stderr.write(`[watch] packages scan (${reason})\n`);
        const result = await runOnce(opts);
        const code = await printResult(opts, result, true);
        if (code) process.exitCode = code;
      },
      signal: ac.signal,
    });
    return;
  }

  const result = await runOnce(opts);
  process.exit(await printResult(opts, result));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});