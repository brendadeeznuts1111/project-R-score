#!/usr/bin/env bun
/**
 * Package version policy + threat-feed scan (Layer 5).
 *
 *   bun scripts/scan-packages.ts --repo . --domain agents-ast-grep --threat-feed
 *   bun scripts/scan-packages.ts --path . --threat-feed --fix --dry-run
 */

import { resolve } from "node:path";
import { scanPackagesForTarget } from "./scan/transpiler/service.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
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

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const repo = resolve(String(opts.repo ?? process.cwd()));
  const threatFeed = opts["no-threat-feed"] !== true;

  const result = await scanPackagesForTarget({
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

  const payload = {
    layer: "5",
    command: "scan packages",
    threatFeed: result.threatFeed,
    ...result,
    clean: result.findings.length === 0,
  };

  if (opts.json === true) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else if (result.findings.length === 0) {
    console.log(`✅ All packages satisfy policies + threat-feed (${result.targetId})`);
  } else {
    printRemediation(result.findings);
    if (result.fixesApplied.length) {
      console.log("\n✅ Fixes applied:");
      for (const cmd of result.fixesApplied) console.log(`  ${cmd}`);
    }
  }

  if (opts["fail-on"] === true && result.findings.length > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});