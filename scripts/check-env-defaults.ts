#!/usr/bin/env bun
// @see https://bun.com/docs/guides/runtime/timezone — TZ
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * check-env-defaults.ts — Bun.env.* hygiene gate (CLI).
 *
 *   bun scripts/check-env-defaults.ts              # lib/config/scripts/tools
 *   bun scripts/check-env-defaults.ts --staged     # pre-commit
 *   bun scripts/check-env-defaults.ts --full       # whole tree
 *   bun scripts/check-env-defaults.ts --summary
 *   bun scripts/check-env-defaults.ts --dry-run
 *
 * Scanner: scripts/lib/env-defaults-scan.ts
 * Inventory: bun run env:inventory
 */
import { Glob } from 'bun';
import { relative, resolve } from 'node:path';
import { scanTextForIssues, type EnvIssue } from './lib/env-defaults-scan.ts';

const ROOT = process.cwd();
const argv = Bun.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run') || argv.includes('--dry');
const STAGED = argv.includes('--staged');
const FULL = argv.includes('--full');
const SUMMARY = argv.includes('--summary');
const JSON_OUT = argv.includes('--json');

const DEFAULT_ROOTS = ['lib', 'config', 'scripts', 'tools'];

const IGNORE_DIR_PARTS = [
  '/node_modules/',
  '/.git/',
  '/.cache/',
  '/__snapshots__/',
  '/public/',
  '/dist/',
  '/.grok/',
  '/coverage/',
  '/examples/',
  '/demo/',
  '/demos/',
];

const IGNORE_FILE_RE = [
  /\.test\./,
  /\.spec\./,
  /\.bench\./,
  /\.d\.ts$/,
  /fixtures\//,
  /__tests__\//,
  /check-env-defaults\.ts$/,
  /env-defaults-scan\.ts$/,
  /env-inventory\.ts$/,
  /-demo\.ts$/,
  /demo\.ts$/,
  /bun-features-demo\.ts$/,
  /bun-advanced-apis-demo\.ts$/,
  /test\/setup\.ts$/,
];

async function stagedTsFiles(): Promise<string[]> {
  const proc = Bun.spawn(['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.endsWith('.ts') && !s.endsWith('.d.ts'))
    .map(s => resolve(ROOT, s));
}

async function collectFiles(): Promise<string[]> {
  if (STAGED) {
    return (await stagedTsFiles()).filter(f => {
      if (IGNORE_FILE_RE.some(re => re.test(f))) return false;
      if (IGNORE_DIR_PARTS.some(p => f.includes(p))) return false;
      return true;
    });
  }

  const roots = FULL ? ['.'] : DEFAULT_ROOTS;
  const found: string[] = [];
  const glob = new Glob('**/*.ts');

  for (const root of roots) {
    const base = resolve(ROOT, root);
    try {
      for await (const file of glob.scan({ cwd: base, absolute: true })) {
        if (IGNORE_DIR_PARTS.some(p => file.includes(p))) continue;
        if (IGNORE_FILE_RE.some(re => re.test(file))) continue;
        found.push(file);
      }
    } catch {
      // root may not exist
    }
  }
  return found;
}

export async function runEnvDefaultsCheck(opts?: {
  staged?: boolean;
  full?: boolean;
  dryRun?: boolean;
}): Promise<{ filesScanned: number; issues: EnvIssue[] }> {
  const files = await collectFiles();
  // allow test override via opts by re-reading flags — CLI uses module flags
  void opts;
  const issues: EnvIssue[] = [];
  for (const file of files) {
    try {
      const text = await Bun.file(file).text();
      issues.push(...scanTextForIssues(file, text));
    } catch {
      // skip unreadable
    }
  }
  return { filesScanned: files.length, issues };
}

async function main(): Promise<void> {
  const { filesScanned, issues } = await runEnvDefaultsCheck();
  const rel = (f: string) => relative(ROOT, f);
  const mode = STAGED ? 'staged' : FULL ? 'full' : 'harness';

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          mode,
          filesScanned,
          issueCount: issues.length,
          issues: issues.map(i => ({ ...i, file: rel(i.file) })),
        },
        null,
        2
      )
    );
  } else if (issues.length === 0) {
    console.log(`✅ env-defaults: clean (${filesScanned} file(s), mode=${mode})`);
  } else {
    const byVar = new Map<string, number>();
    const byDir = new Map<string, number>();
    for (const i of issues) {
      byVar.set(i.envVar, (byVar.get(i.envVar) ?? 0) + 1);
      const top = rel(i.file).split('/')[0] ?? '?';
      byDir.set(top, (byDir.get(top) ?? 0) + 1);
    }
    console.error(
      `❌ ${issues.length} optional Bun.env config read(s) without fallback (mode=${mode}, files=${filesScanned})`
    );
    if (SUMMARY || issues.length > 0) {
      console.error('  Top vars:');
      for (const [k, n] of [...byVar.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
        console.error(`    ${k}: ${n}`);
      }
      console.error('  Top roots:');
      for (const [k, n] of [...byDir.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
        console.error(`    ${k}/: ${n}`);
      }
    }
    console.error('  First 25:');
    for (const i of issues.slice(0, 25)) {
      console.error(`    ${rel(i.file)}:${i.line}: Bun.env.${i.envVar}`);
    }
    if (issues.length > 25) console.error(`    ... and ${issues.length - 25} more`);
    console.error(
      '  Tip: add || / ?? default, guard with if (Bun.env.X), or use require* for secrets.'
    );
    console.error(
      '       Secrets/ambient skipped. Inventory: bun run env:inventory · Vault: proton:check'
    );
  }

  if (issues.length > 0 && !DRY_RUN) process.exit(1);
}

if (import.meta.main) {
  await main();
}
