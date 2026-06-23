#!/usr/bin/env bun
/**
 * Pre-commit ast-grep + semver gates — runs when skill or lockfile paths are staged.
 */
const repoRoot = import.meta.dir + '/..';
const skillRoot = `${repoRoot}/.agents/skills/ast-grep`;
const helper = `${skillRoot}/scripts/ast_grep_helper.py`;

const AST_GREP_PREFIX = '.agents/skills/ast-grep/';
const LOCKFILE_PATHS = new Set([
  'package.json',
  'bun.lock',
  'bun.lockb',
  `${AST_GREP_PREFIX}package.json`,
  `${AST_GREP_PREFIX}bun.lock`,
  `${AST_GREP_PREFIX}bun.lockb`,
]);
const POLICY_PATH = `${AST_GREP_PREFIX}policies/security.policy.toml`;

function isAstGrepRelevant(file: string): boolean {
  const normalized = file.replace(/^\.\//, '');
  if (normalized.startsWith(AST_GREP_PREFIX)) return true;
  if (LOCKFILE_PATHS.has(normalized)) return true;
  return false;
}

function hasLockfileChange(files: string[]): boolean {
  return files.some(file => LOCKFILE_PATHS.has(file.replace(/^\.\//, '')));
}

function hasPolicyChange(files: string[]): boolean {
  return files.some(file => file.replace(/^\.\//, '') === POLICY_PATH);
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

async function runCommand(label: string, cmd: string[], cwd = repoRoot): Promise<number> {
  console.info(`🔍 ${label}...`);
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`❌ ${label} failed`);
  }
  return code;
}

async function main(): Promise<void> {
  const staged = await getStagedFiles();
  const relevant = staged.filter(isAstGrepRelevant);

  if (relevant.length === 0) {
    console.info('✅ No staged ast-grep / semver paths');
    return;
  }

  console.info(`📦 ast-grep pre-commit (${relevant.length} staged path(s))`);

  const checks: Array<Promise<number>> = [
    runCommand('ast-grep rule tests', ['python3', helper, '-q', 'test']),
    runCommand('semver policy tests', [
      'python3',
      helper,
      '-q',
      'bun',
      'test-ci',
      '--profile',
      'semver',
      '--skip-preflight',
    ]),
  ];

  if (hasLockfileChange(relevant) || hasPolicyChange(relevant)) {
    checks.push(
      runCommand('semver supply-chain packages', [
        'bun',
        `${skillRoot}/scripts/bun-cli.ts`,
        'bun',
        'supply-chain',
        'packages',
        '--domain',
        'agents-ast-grep',
        '--fail-on',
      ])
    );
  }

  const results = await Promise.all(checks);
  if (results.some(code => code !== 0)) {
    process.exit(1);
  }

  console.info('✅ ast-grep + semver pre-commit checks passed');
}

if (import.meta.main) {
  await main();
}
