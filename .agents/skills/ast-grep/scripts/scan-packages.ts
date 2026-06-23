#!/usr/bin/env bun
/**
 * Package version policy + threat-feed scan (Layer 5).
 *
 *   bun scripts/scan-packages.ts --path . --threat-feed --fix
 *   bun scripts/scan-packages.ts --path . --watch --watch-interval 1000
 */

import { resolve } from "node:path";
import { scanPackagesForTarget } from "./scan/transpiler/service.ts";
import { runWatchLoop } from "./scan/transpiler/watch.ts";

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

function printRemediation(findings: Awaited<ReturnType<typeof scanPackagesForTarget>>["findings"]): void {
  for (const f of findings) {
    const cve = f.cve ? ` (${f.cve})` : "";
    console.log(`⚠️  [${f.severity}] ${f.file} — ${f.ruleId}${cve}`);
    console.log(`    ${f.message}`);
    if (f.remediation?.suggestedVersion) {
      const latest = f.remediation.latestInLockfile;
      const extra = latest && latest !== f.remediation.suggestedVersion
        ? ` (latest in lockfile: ${latest})`
        : "";
      console.log(
        `    → Upgrade to ${f.file}@${f.remediation.suggestedVersion} or later${extra}`,
      );
      console.log(`    → ${f.remediation.command}`);
    } else if (f.remediation?.safeRange) {
      console.log(`    → Satisfy range: ${f.remediation.safeRange}`);
      console.log(`    → ${f.remediation.command}`);
    }
  }
}

async function runOnce(opts: Record<string, string | boolean | number>) {
  const repo = resolve(String(opts.repo ?? process.cwd()));
  const threatFeed = opts["no-threat-feed"] !== true;

  return scanPackagesForTarget({
    skillRoot: SKILL_ROOT,
    repo,
    targetId: typeof opts.domain === "string" ? opts.domain : undefined,
    targetPath: typeof opts.path === "string" ? opts.path : undefined,
    minSeverity: typeof opts["min-severity"] === "string"
      ? opts["min-severity"] as "warn"
      : "warn",
    threatFeed,
    fix: opts.fix === true,
    dryRunFix: opts["dry-run"] === true && opts.fix === true,
  });
}

async function printResult(
  opts: Record<string, string | boolean | number>,
  result: Awaited<ReturnType<typeof runOnce>>,
  watch = false,
): Promise<number> {
  const payload = {
    layer: "5",
    command: "scan packages",
    threatFeed: result.threatFeed,
    ...result,
    clean: result.findings.length === 0,
  };

  if (opts.json === true && !watch) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else if (result.findings.length === 0) {
    const msg = `✅ All packages satisfy policies + threat-feed (${result.targetId})`;
    if (watch) process.stderr.write(`[watch] ${msg}\n`);
    else console.log(msg);
  } else {
    if (watch) {
      process.stderr.write(`[watch] ${result.findings.length} violation(s)\n`);
      for (const f of result.findings.slice(0, 5)) {
        process.stderr.write(`  [${f.severity}] ${f.file} ${f.ruleId}\n`);
      }
    } else {
      printRemediation(result.findings);
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