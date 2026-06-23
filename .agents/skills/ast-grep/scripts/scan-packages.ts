#!/usr/bin/env bun
/**
 * Package version policy scan (Layer 5) — alias for `bun sp scan packages`.
 *
 *   bun scripts/scan-packages.ts --repo . --domain agents-ast-grep
 *   bun scripts/scan-packages.ts --path projects/active/sports-terminal-os --json
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

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const repo = resolve(String(opts.repo ?? process.cwd()));
  const domain = typeof opts.domain === "string" ? opts.domain : undefined;
  const scanPath = typeof opts.path === "string" ? opts.path : undefined;

  const result = await scanPackagesForTarget({
    skillRoot: SKILL_ROOT,
    repo,
    targetId: domain,
    targetPath: scanPath,
    minSeverity: typeof opts["min-severity"] === "string"
      ? opts["min-severity"] as "warn"
      : "warn",
  });

  const payload = {
    layer: "5",
    command: "scan packages",
    ...result,
    clean: result.findings.length === 0,
  };

  if (opts.json === true) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else if (result.findings.length === 0) {
    console.log(`✅ All packages satisfy version policies (${result.targetId})`);
  } else {
    console.table(
      result.findings.map((f) => ({
        rule: f.ruleId,
        severity: f.severity,
        package: f.file,
        message: f.message,
      })),
    );
  }

  if (opts["fail-on"] === true && result.findings.length > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});