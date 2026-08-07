#!/usr/bin/env bun
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';

// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect.table
/**
 * Repo hygiene check — catches stray generated files before they get committed.
 *
 * Checks:
 *  1. No generated output files at the repository root
 *  2. No secrets staged (.bunfig.toml, .env files)
 *  3. No unexpected top-level directories outside the root policy
 *
 * Usage: bun scripts/repo-hygiene.ts          # full check
 *        bun scripts/repo-hygiene.ts --staged  # only check staged files (pre-commit)
 *        bun scripts/repo-hygiene.ts --tracked # committed tree only (pre-push/CI)
 */

import {
  ALLOWED_ROOT_DIRS,
  rootOutputRoute,
  type RootOutputRoute,
} from '../config/repo-root-policy.ts';
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { logTable } from '../lib/console-depth.ts';
import { isDirectorySync, joinPath, listEntriesSync } from './lib/fs-bun';
import { isTildeCachePath } from './lib/bun-install-env.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('hygiene', Bun.argv.slice(2))
  : Bun.argv.slice(2);
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

/** Skill-owned test entrypoints intentionally named with the guarded test-* prefix. */
const ALLOWED_STAGED_ENTRYPOINTS = new Set([
  '.agents/skills/ast-grep/scripts/test-cli.ts',
  '.agents/skills/ast-grep/scripts/scan/transpiler/test-runner.ts',
]);

// Dirs that must never exist at root (often created by misconfigured Bun cache)
const FORBIDDEN_ROOT_DIRS = new Set(['~']);

// Root files that should not live at monorepo root
const FORBIDDEN_ROOT_FILES = new Set(['index.html', 'index.ts']);

interface Violation {
  file: string;
  rule: string;
  owner: string;
  action: string;
}

const DEFAULT_ROUTE: RootOutputRoute = {
  owner: 'repository',
  target: 'an allowlisted owner directory',
  action: 'move the entry or add a documented root integration',
};

function violation(file: string, rule: string): Violation {
  const route = rootOutputRoute(file) ?? DEFAULT_ROUTE;
  return {
    file,
    rule,
    owner: route.owner,
    action: `${route.action} → ${route.target}`,
  };
}

/** Resolve all ignored candidates with one git process instead of one per entry. */
function findGitignored(relPaths: string[], cwd = ROOT): Set<string> {
  if (relPaths.length === 0) return new Set();
  const probe = Bun.spawnSync(['git', 'check-ignore', '--', ...relPaths], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return new Set(
    probe.stdout
      .toString()
      .split('\n')
      .map(path => path.trim())
      .filter(Boolean)
  );
}

function dedupeViolations(violations: Violation[]): Violation[] {
  const unique = new Map<string, Violation>();
  for (const item of violations) {
    const key = `${item.file}\0${item.rule}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()];
}

async function findRootClutter(): Promise<Violation[]> {
  const violations: Violation[] = [];
  const rootEntries = listEntriesSync(ROOT, { dot: true });
  const directoryNames = rootEntries.filter(name => isDirectorySync(joinPath(ROOT, name)));
  const ignoreCandidates = directoryNames.filter(
    name => !name.startsWith('.') && !FORBIDDEN_ROOT_DIRS.has(name) && !ALLOWED_ROOT_DIRS.has(name)
  );
  const ignored = findGitignored(ignoreCandidates);

  for (const name of rootEntries) {
    if (isDirectorySync(joinPath(ROOT, name))) {
      if (FORBIDDEN_ROOT_DIRS.has(name)) {
        violations.push(violation(name + '/', 'forbidden-root-dir'));
      } else if (!name.startsWith('.') && !ALLOWED_ROOT_DIRS.has(name) && !ignored.has(name)) {
        violations.push(violation(name + '/', 'unexpected-root-dir'));
      }
      continue;
    }

    if (FORBIDDEN_ROOT_FILES.has(name)) {
      violations.push(violation(name, 'forbidden-root-file'));
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
        violations.push(violation(file, 'stray-output-root'));
        break;
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
      violations.push(violation(file, 'secrets-staged'));
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
    if (ALLOWED_STAGED_ENTRYPOINTS.has(file)) continue;
    if (isTildeCachePath(file)) {
      violations.push(violation(file, 'tilde-cache-staged'));
      continue;
    }
    if (
      FORBIDDEN_STAGED.some(
        p => file === p || file.startsWith(p) || (p.endsWith('/') && file.startsWith(p))
      )
    ) {
      violations.push(violation(file, 'harness-regenerable-staged'));
      continue;
    }
    for (const pattern of STRAY_PATTERNS) {
      if (pattern.test(basename)) {
        violations.push(violation(file, 'stray-output-staged'));
        break;
      }
    }
  }

  return violations;
}

/** Push/CI view: inspect only Git-owned paths, never ignored operator state. */
async function findTrackedViolations(): Promise<Violation[]> {
  const proc = Bun.spawn(['git', 'ls-files', '-z'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) throw new Error('git ls-files failed during tracked hygiene scan');

  const violations: Violation[] = [];
  for (const file of output.split('\0').filter(Boolean)) {
    const [top] = file.split('/');
    if (file.includes('/') && top && !top.startsWith('.') && !ALLOWED_ROOT_DIRS.has(top)) {
      violations.push(violation(`${top}/`, 'unexpected-tracked-root-dir'));
      continue;
    }
    if (!file.includes('/') && FORBIDDEN_ROOT_FILES.has(file)) {
      violations.push(violation(file, 'forbidden-root-file'));
    }
    // The tracked-tree gate protects root machine credentials. Nested product
    // fixtures/config are governed when added by the stricter staged scan.
    if (!file.includes('/') && SECRETS_FILES.includes(file)) {
      violations.push(violation(file, 'tracked-secret-file'));
    }
    if (
      FORBIDDEN_STAGED.some(
        p => file === p || file.startsWith(p) || (p.endsWith('/') && file.startsWith(p))
      )
    ) {
      violations.push(violation(file, 'tracked-harness-regenerable'));
    }
    if (!file.includes('/') && STRAY_PATTERNS.some(pattern => pattern.test(file))) {
      violations.push(violation(file, 'tracked-stray-output-root'));
    }
  }
  return dedupeViolations(violations);
}

/**
 * Flag a stale .git/index.lock: a crashed git process leaves a zero-byte
 * lock behind that blocks every subsequent git write until removed.
 * A lock younger than 30 min is treated as a live operation (pre-commit
 * hooks can hold the index for minutes).
 */
async function checkStaleIndexLock(): Promise<Violation[]> {
  const lock = joinPath(ROOT, '.git/index.lock');
  const lockFile = Bun.file(lock);
  if (!(await lockFile.exists())) return [];
  const ageMin = (Date.now() - lockFile.lastModified) / 60_000;
  if (ageMin <= 30) return [];
  return [
    {
      file: '.git/index.lock',
      rule: 'stale-index-lock',
      owner: 'repository',
      action: `lock is ${Math.round(ageMin)} min old and blocks all git writes — confirm no git process is running, then: rm .git/index.lock`,
    },
  ];
}

async function main() {
  const stagedOnly = argv.includes('--staged');
  const trackedOnly = argv.includes('--tracked');
  const findings: Violation[] = [];

  if (stagedOnly && trackedOnly) {
    throw new Error('--staged and --tracked are mutually exclusive');
  }

  if (trackedOnly) {
    findings.push(...(await findTrackedViolations()));
  } else if (stagedOnly) {
    // Pre-commit mode — evict drift first so ./~ never gets staged
    Bun.spawnSync(bunSpawnArgs([joinPath(ROOT, 'scripts/evict-root-tilde-cache.ts')]), {
      cwd: ROOT,
    });
    findings.push(...(await checkStagedSecrets()));
    findings.push(...(await checkStagedStray()));
  } else {
    // Full scan mode — auto-evict Bun tilde-cache drift before scanning
    Bun.spawnSync(bunSpawnArgs([joinPath(ROOT, 'scripts/evict-root-tilde-cache.ts')]), {
      cwd: ROOT,
    });
    findings.push(...(await findRootClutter()));
    findings.push(...(await findStrayFiles()));
    findings.push(...(await checkStagedSecrets()));
    findings.push(...(await checkStaleIndexLock()));
  }
  const violations = dedupeViolations(findings);

  if (violations.length === 0) {
    console.info('✅ Repo hygiene: clean');
    process.exit(0);
  }

  console.info(`❌ Repo hygiene: ${violations.length} violation(s)\n`);
  logTable(
    violations.map(v => ({
      file: v.file,
      rule: v.rule,
      owner: v.owner,
      action: v.action,
    })),
    ['file', 'rule', 'owner', 'action'],
    { colors: true }
  );

  process.exit(1);
}

// Export for testing
export {
  STRAY_PATTERNS,
  SECRETS_FILES,
  ALLOWED_ROOT_DIRS,
  FORBIDDEN_ROOT_DIRS,
  ALLOWED_STAGED_ENTRYPOINTS,
  dedupeViolations,
  findGitignored,
  findRootClutter,
  findStrayFiles,
  findTrackedViolations,
  checkStagedSecrets,
  type Violation,
};

// Only run when executed directly, not when imported by tests
if (import.meta.main) {
  main();
}
