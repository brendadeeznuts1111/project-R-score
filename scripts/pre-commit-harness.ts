#!/usr/bin/env bun
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
    '--max-warnings',
    '200',
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

  console.info('✅ Harness pre-commit checks passed');
  void HARNESS_PATHS;
  void HARNESS_FORMAT_GLOBS;
}

if (import.meta.main) {
  await main();
}
