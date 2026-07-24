#!/usr/bin/env bun

// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect.table
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

// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/file-io — Bun.file
import { Glob } from 'bun';
import { isDirectorySync, joinPath, listEntriesSync } from './lib/fs-bun';
import { isTildeCachePath } from './lib/bun-install-env.ts';

const ROOT = joinPath(import.meta.dir, '..');

// Patterns that should never appear as tracked/staged files
const STRAY_PATTERNS = [
  // Timestamped output JSONs (e.g. junior-1770398161888.json, hierarchy-report-1770398067150.json)
  /^[a-z][a-z-]*-\d{10,}\.json$/,
  // Timestamped output Markdown (e.g. senior-1770412138259.md)
  /^[a-z][a-z-]*-\d{10,}\.md$/,
  // Date-stamped outputs (e.g. enterprise-audit-2026-02-06.jsonl)
  /^.*-\d{4}-\d{2}-\d{2}\.(json|jsonl)$/,
  // Pipeline profile outputs (e.g. md-profile.json)
  /^md-profile\.json$/,
  // Any .jsonl file
  /\.jsonl$/,
  // Log files
  /\.log$/,
  // Root demo/template drift
  /^DEMO-.*\.(ts|js|md|json)$/,
  /^demo-.*\.(ts|js|md|json|txt|bin)$/,
  // Root temp/test drift
  /^temp-.*\.(ts|js|tsx|md|json)$/,
  /^test-.*\.(ts|js|md|json|txt)$/,
  /^type-test\..+$/,
  /^url-test\..+$/,
  /^fd-test\..+$/,
  // Root Bun analysis docs that must be archived
  /^BUN-.*(SUMMARY|ANALYSIS|INTEGRATION)\.md$/,
  // Root telemetry/db artifacts
  /^.*\.(db|rdb)$/,
  /^telemetry.*$/,
];

// Files that must never be staged (contain secrets)
const SECRETS_FILES = [
  '.bunfig.toml',
  '.env',
  '.env.production',
  '.env.secret',
  '.env.enc',
  '.env.local',
];

/** Path prefixes / exact paths that must never be staged (regenerable harness noise). */
const FORBIDDEN_STAGED = [
  'reports/harness-gate-timing.json',
  'reports/ci-harness-timing.json',
  'reports/ci-core-timing.json',
  'reports/bun-usage-inventory.json',
  '.cache/',
  'lib/profile.md',
];

// Directories to scan for stray output files (skip if absent — root utils/ was retired)
const SCAN_DIRS = ['.'];

// Top-level dirs allowed at monorepo root (see STRUCTURE.md)
const ALLOWED_ROOT_DIRS = new Set([
  'archive',
  'artifacts',
  'assets',
  'config',
  'dashboard',
  'database',
  'docs',
  'examples',
  'functions',
  'herdr-worktrees',
  'Kalshi-bot',
  'lib',
  'logs',
  'node_modules',
  'packages',
  'plannator',
  'projects',
  'public',
  'reports',
  'scratch',
  'scripts',
  'server',
  'services',
  'spine',
  'src',
  'tests',
  'tools',
  'utils',
  'workers',
]);

// Dirs that must never exist at root (often created by misconfigured Bun cache)
const FORBIDDEN_ROOT_DIRS = new Set(['~']);

// Root files that should not live at monorepo root
const FORBIDDEN_ROOT_FILES = new Set(['index.html', 'index.ts']);

interface Violation {
  file: string;
  rule: string;
}

function isGitignored(relPath: string): boolean {
  const probe = Bun.spawnSync(['git', 'check-ignore', '-q', '--', relPath], { cwd: ROOT });
  return probe.exitCode === 0;
}

async function findRootClutter(): Promise<Violation[]> {
  const violations: Violation[] = [];
  // Glob onlyFiles:false includes directories (bun-types GlobScanOptions)
  const rootEntries = listEntriesSync(ROOT, { dot: true });

  for (const name of rootEntries) {
    if (isDirectorySync(joinPath(ROOT, name))) {
      if (FORBIDDEN_ROOT_DIRS.has(name)) {
        violations.push({ file: name + '/', rule: 'forbidden-root-dir' });
      } else if (!name.startsWith('.') && !ALLOWED_ROOT_DIRS.has(name) && !isGitignored(name)) {
        violations.push({ file: name + '/', rule: 'unexpected-root-dir' });
      }
      continue;
    }

    if (FORBIDDEN_ROOT_FILES.has(name)) {
      violations.push({ file: name, rule: 'forbidden-root-file' });
    }
  }

  return violations;
}

async function findStrayFiles(): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Root-level filename scan (captures patterns beyond json/md/log extensions)
  for (const file of listEntriesSync(ROOT, { dot: true })) {
    if (isDirectorySync(joinPath(ROOT, file))) continue;
    for (const pattern of STRAY_PATTERNS) {
      if (pattern.test(file)) {
        violations.push({ file, rule: 'stray-output-root' });
        break;
      }
    }
  }

  for (const dir of SCAN_DIRS) {
    const absDir = joinPath(ROOT, dir);
    if (dir !== '.' && !isDirectorySync(absDir)) continue;
    const glob = new Glob('*.{json,jsonl,log,md}');

    for await (const file of glob.scan({ cwd: absDir, absolute: false })) {
      for (const pattern of STRAY_PATTERNS) {
        if (pattern.test(file)) {
          const rel = dir === '.' ? file : `${dir}/${file}`;
          violations.push({ file: rel, rule: 'stray-output' });
          break;
        }
      }
    }
  }

  return violations;
}

async function checkStagedSecrets(): Promise<Violation[]> {
  const violations: Violation[] = [];
  const proc = Bun.spawn(['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    cwd: ROOT,
    stdout: 'pipe',
  });
  const staged = (await new Response(proc.stdout).text()).trim().split('\n').filter(Boolean);

  for (const file of staged) {
    const basename = file.split('/').pop()!;
    if (SECRETS_FILES.includes(basename) || SECRETS_FILES.includes(file)) {
      violations.push({ file, rule: 'secrets-staged' });
    }
  }

  return violations;
}

async function checkStagedStray(): Promise<Violation[]> {
  const violations: Violation[] = [];
  // diff-filter=A: only NEW files. A tracked file being edited is not stray
  // output; the rule exists to stop new demo/report/temp files from landing.
  const proc = Bun.spawn(['git', 'diff', '--cached', '--name-only', '--diff-filter=A'], {
    cwd: ROOT,
    stdout: 'pipe',
  });
  const staged = (await new Response(proc.stdout).text()).trim().split('\n').filter(Boolean);

  for (const file of staged) {
    const basename = file.split('/').pop()!;
    if (isTildeCachePath(file)) {
      violations.push({ file, rule: 'tilde-cache-staged' });
      continue;
    }
    if (
      FORBIDDEN_STAGED.some(
        p => file === p || file.startsWith(p) || (p.endsWith('/') && file.startsWith(p))
      )
    ) {
      violations.push({ file, rule: 'harness-regenerable-staged' });
      continue;
    }
    for (const pattern of STRAY_PATTERNS) {
      if (pattern.test(basename)) {
        violations.push({ file, rule: 'stray-output-staged' });
        break;
      }
    }
  }

  return violations;
}

async function main() {
  const stagedOnly = Bun.argv.includes('--staged');
  const violations: Violation[] = [];

  if (stagedOnly) {
    // Pre-commit mode — evict drift first so ./~ never gets staged
    Bun.spawnSync(['bun', joinPath(ROOT, 'scripts/evict-root-tilde-cache.ts')], { cwd: ROOT });
    violations.push(...(await checkStagedSecrets()));
    violations.push(...(await checkStagedStray()));
  } else {
    // Full scan mode — auto-evict Bun tilde-cache drift before scanning
    Bun.spawnSync(['bun', joinPath(ROOT, 'scripts/evict-root-tilde-cache.ts')], { cwd: ROOT });
    violations.push(...(await findRootClutter()));
    violations.push(...(await findStrayFiles()));
    violations.push(...(await checkStagedSecrets()));
  }

  if (violations.length === 0) {
    console.info('✅ Repo hygiene: clean');
    process.exit(0);
  }

  console.info(`❌ Repo hygiene: ${violations.length} violation(s)\n`);
  console.info(
    Bun.inspect.table(
      violations.map(v => ({ file: v.file, rule: v.rule })),
      ['file', 'rule'],
      { colors: true }
    )
  );

  process.exit(1);
}

// Export for testing
export {
  STRAY_PATTERNS,
  SECRETS_FILES,
  ALLOWED_ROOT_DIRS,
  FORBIDDEN_ROOT_DIRS,
  findRootClutter,
  findStrayFiles,
  checkStagedSecrets,
};

// Only run when executed directly, not when imported by tests
if (import.meta.main) {
  main();
}
