#!/usr/bin/env bun

/**
 * Repo hygiene check — catches stray generated files before they get committed.
 *
 * Checks:
 *  1. No timestamped JSON/JSONL output files in root or utils/
 *  2. No secrets staged (.bunfig.toml, .env files)
 *  3. No stray log files in root
 *
 * Usage: bun scripts/repo-hygiene.ts          # full check
 *        bun scripts/repo-hygiene.ts --staged  # only check staged files (pre-commit)
 */

import { Glob } from "bun";
import { join, relative } from "path";

const ROOT = join(import.meta.dir, "..");

// Patterns that should never appear as tracked/staged files
const STRAY_PATTERNS = [
  // Timestamped output JSONs (e.g. junior-1770398161888.json, hierarchy-report-1770398067150.json)
  /^[a-z][a-z-]*-\d{10,}\.json$/,
  // Date-stamped outputs (e.g. enterprise-audit-2026-02-06.jsonl)
  /^.*-\d{4}-\d{2}-\d{2}\.(json|jsonl)$/,
  // Any .jsonl file
  /\.jsonl$/,
  // Log files
  /\.log$/,
];

// Files that must never be staged (contain secrets)
const SECRETS_FILES = [
  ".bunfig.toml",
  ".env",
  ".env.production",
  ".env.secret",
  ".env.enc",
  ".env.local",
];

// Directories to scan for stray output files
const SCAN_DIRS = [".", "utils"];

interface Violation {
  file: string;
  rule: string;
}

async function findStrayFiles(): Promise<Violation[]> {
  const violations: Violation[] = [];

  for (const dir of SCAN_DIRS) {
    const absDir = join(ROOT, dir);
    const glob = new Glob("*.{json,jsonl,log}");

    for await (const file of glob.scan({ cwd: absDir, absolute: false })) {
      for (const pattern of STRAY_PATTERNS) {
        if (pattern.test(file)) {
          const rel = dir === "." ? file : `${dir}/${file}`;
          violations.push({ file: rel, rule: "stray-output" });
          break;
        }
      }
    }
  }

  return violations;
}

async function checkStagedSecrets(): Promise<Violation[]> {
  const violations: Violation[] = [];
  const proc = Bun.spawn(["git", "diff", "--cached", "--name-only"], {
    cwd: ROOT,
    stdout: "pipe",
  });
  const staged = (await new Response(proc.stdout).text()).trim().split("\n").filter(Boolean);

  for (const file of staged) {
    const basename = file.split("/").pop()!;
    if (SECRETS_FILES.includes(basename) || SECRETS_FILES.includes(file)) {
      violations.push({ file, rule: "secrets-staged" });
    }
  }

  return violations;
}

async function checkStagedStray(): Promise<Violation[]> {
  const violations: Violation[] = [];
  const proc = Bun.spawn(["git", "diff", "--cached", "--name-only"], {
    cwd: ROOT,
    stdout: "pipe",
  });
  const staged = (await new Response(proc.stdout).text()).trim().split("\n").filter(Boolean);

  for (const file of staged) {
    const basename = file.split("/").pop()!;
    for (const pattern of STRAY_PATTERNS) {
      if (pattern.test(basename)) {
        violations.push({ file, rule: "stray-output-staged" });
        break;
      }
    }
  }

  return violations;
}

async function main() {
  const stagedOnly = process.argv.includes("--staged");
  const violations: Violation[] = [];

  if (stagedOnly) {
    // Pre-commit mode: only check what's being committed
    violations.push(...(await checkStagedSecrets()));
    violations.push(...(await checkStagedStray()));
  } else {
    // Full scan mode
    violations.push(...(await findStrayFiles()));
    violations.push(...(await checkStagedSecrets()));
  }

  if (violations.length === 0) {
    console.log("✅ Repo hygiene: clean");
    process.exit(0);
  }

  console.log(`❌ Repo hygiene: ${violations.length} violation(s)\n`);
  console.log(
    Bun.inspect.table(
      violations.map((v) => ({ file: v.file, rule: v.rule })),
      ["file", "rule"],
      { colors: true }
    )
  );

  process.exit(1);
}

// Export for testing
export { STRAY_PATTERNS, SECRETS_FILES, findStrayFiles, checkStagedSecrets };

// Only run when executed directly, not when imported by tests
if (import.meta.main) {
  main();
}
