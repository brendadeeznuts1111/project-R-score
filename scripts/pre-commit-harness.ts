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

  if (harnessFiles.length === 0) {
    console.info('✅ No staged harness TypeScript files');
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
      '❌ New unbranded ID declarations — use lib/types/branded.ts brands or // brand-ok'
    );
    process.exit(1);
  }

  // Repo-wide smart gate: the brand rollout is complete (actionable = 0),
  // so any actionable hit anywhere in lib/ now fails the commit — this is
  // the standing local CI gate. Manual run: bun run check:brands
  console.info('🏷️  Branded IDs (repo-wide smart gate)...');
  const brandSmart = Bun.spawn(['bun', 'tools/branded-id-check.ts', '--smart', '--strict'], {
    cwd: repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await brandSmart.exited) !== 0) {
    console.error('❌ Actionable unbranded IDs in repo — see: bun run check:brands');
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
