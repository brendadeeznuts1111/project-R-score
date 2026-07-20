#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Pre-commit harness checks — fast bun-native lint + format on staged root paths.
 */
import { HARNESS_FORMAT_GLOBS, HARNESS_PATHS } from '../config/eslint/harness/rollout.ts';

const repoRoot = import.meta.dir + '/..';

function isHarnessPath(file: string): boolean {
  const normalized = file.replace(/^\.\//, '');
  if (normalized.startsWith('projects/')) return false;
  if (!normalized.endsWith('.ts') && !normalized.endsWith('.tsx')) return false;
  if (/\.(test|spec|bench)\.ts$/.test(normalized)) return false;

  const prefixes = ['lib/', 'scripts/', 'packages/', 'server/', 'config/', 'tools/'];
  return prefixes.some(prefix => normalized.startsWith(prefix));
}

/** Platform doc SSOT — when staged, run tools/doc-map-check.ts */
const DOC_MAP_SSOT = new Set([
  'AGENTS.md',
  'README.md',
  'STRUCTURE.md',
  '.custom-instructions.md',
  'docs/AGENTS.md',
  'docs/README.md',
  'docs/UNIFIED.md',
  'docs/WIRE_BOUNDARY.md',
  'docs/BUN_NATIVE_CAPABILITIES.md',
  'docs/DEVELOPMENT-STANDARDS.md',
  'docs/IMPORT_BOUNDARIES.md',
  'lib/README.md',
  'lib/types/branded/README.md',
  'lib/docs/repo-docs.ts',
  'tools/doc-map-check.ts',
]);

function isDocMapPath(file: string): boolean {
  const normalized = file.replace(/^\.\//, '');
  return DOC_MAP_SSOT.has(normalized);
}

async function runDocMapCheck(): Promise<number> {
  const proc = Bun.spawn(['bun', 'tools/doc-map-check.ts'], {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  return proc.exited;
}

async function getStagedFiles(): Promise<string[]> {
  const proc = Bun.spawn(['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const out = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) return [];
  return out
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);
}

async function runEslintHarness(files: string[]): Promise<number> {
  const args = [
    'eslint',
    '--config',
    'eslint.bun-native.config.ts',
    '--fix',
    // Cap bounds warning noise, not correctness (errors always fail).
    // 500 covers bulk-annotation commits that stage hundreds of files at
    // once; the tree currently carries ~230 known no-restricted-imports
    // style warnings to burn down separately.
    '--max-warnings',
    '500',
    ...files,
  ];
  const proc = Bun.spawn(['bun', ...args], {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  return proc.exited;
}

async function runPrettier(files: string[]): Promise<number> {
  const args = ['prettier', '--write', ...files];
  const proc = Bun.spawn(['bun', 'x', ...args], {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  return proc.exited;
}

async function main(): Promise<void> {
  const staged = await getStagedFiles();
  const harnessFiles = staged.filter(isHarnessPath);
  const docMapFiles = staged.filter(isDocMapPath);

  // Platform doc SSOT: when root/docs maps or repo-docs.ts change, re-verify links.
  if (docMapFiles.length > 0) {
    console.info(`🗺️  Doc map check (${docMapFiles.length} SSOT path(s) staged)...`);
    const code = await runDocMapCheck();
    if (code !== 0) {
      console.error(
        '❌ Doc map check failed — fix broken links / CANONICAL_* paths\n' +
          '   bun tools/doc-map-check.ts\n' +
          '   bun tools/doc-map-check.ts --open'
      );
      process.exit(1);
    }
  }

  if (harnessFiles.length === 0) {
    if (docMapFiles.length > 0) {
      console.info('✅ Harness pre-commit checks passed (doc map only)');
    } else {
      console.info('✅ No staged harness TypeScript or doc-map SSOT files');
    }
    return;
  }

  console.info(`🔍 Harness lint (${harnessFiles.length} staged files)...`);
  const lintCode = await runEslintHarness(harnessFiles);
  if (lintCode !== 0) {
    console.error('❌ Harness ESLint check failed');
    process.exit(1);
  }

  console.info('✨ Harness format...');
  const formatCode = await runPrettier(harnessFiles);
  if (formatCode !== 0) {
    console.error('❌ Harness Prettier check failed');
    process.exit(1);
  }

  // Doc-reference gate: staged files must carry canonical @see links for
  // the Bun APIs they use (fix: bun tools/bun-doc-refs.ts annotate --write <files>)
  console.info('🔗 Doc refs...');
  const docRefs = Bun.spawn(
    ['bun', 'tools/bun-doc-refs.ts', 'check', ...harnessFiles.map(f => `${repoRoot}/${f}`)],
    { cwd: repoRoot, stdout: 'inherit', stderr: 'inherit' }
  );
  if ((await docRefs.exited) !== 0) {
    console.error(
      '❌ Missing canonical Bun doc refs — run: bun tools/bun-doc-refs.ts annotate --write <files>'
    );
    process.exit(1);
  }

  // Brand institutional record must match BRAND_CATALOG (detector reads it).
  console.info('🏷️  Brand manifest...');
  const brandManifest = Bun.spawn(['bun', 'tools/brand-manifest.ts', '--check'], {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await brandManifest.exited) !== 0) {
    console.error('❌ Stale brand-manifest.json — run: bun tools/brand-manifest.ts');
    process.exit(1);
  }

  // Branded-ID gate: only ADDED lines are judged, so legacy violations
  // elsewhere in a touched file never block; new violations always do.
  console.info('🏷️  Branded IDs...');
  const brandCheck = Bun.spawn(['bun', 'tools/branded-id-check.ts', '--staged', '--strict'], {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await brandCheck.exited) !== 0) {
    console.error(
      '❌ New unbranded domain ID (bare string) — agents MUST use lib/types/branded.ts\n' +
        '   as*/try*/parse* (SessionId, UserId, …). Opaque only: // brand-ok\n' +
        '   catalog: bun tools/brand-catalog.ts [BrandName]'
    );
    process.exit(1);
  }

  // Repo-wide smart gate: actionable unbranded IDs must stay 0.
  // Mid-line function params are detected; legacy hits live in
  // tools/branded-id-baseline.json (staged never uses baseline).
  // Manual: bun run check:brands
  console.info('🏷️  Branded IDs (repo-wide smart gate)...');
  const brandSmart = Bun.spawn(['bun', 'tools/branded-id-check.ts', '--smart', '--strict'], {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await brandSmart.exited) !== 0) {
    console.error(
      '❌ Actionable unbranded IDs in repo — brand them or // brand-ok; see: bun run check:brands'
    );
    process.exit(1);
  }

  // Type-level proof: brands are nominally distinct (tsc --noEmit on test-d file).
  console.info('🏷️  Branded IDs (type-level)...');
  const brandTypes = Bun.spawn(['bun', 'run', 'check:brands:types'], {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await brandTypes.exited) !== 0) {
    console.error('❌ Branded type assertions failed — see tests/branded-types.test-d.ts');
    process.exit(1);
  }

  console.info('✅ Harness pre-commit checks passed');
  void HARNESS_PATHS;
  void HARNESS_FORMAT_GLOBS;
}

if (import.meta.main) {
  await main();
}
