#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Pre-commit ast-grep + semver gates.
 *
 * Modes:
 *   --staged   Husky hook — run only when ast-grep / lockfile paths are staged
 *   --full     Manual default — always run rules + semver (+ packages)
 *   --changed  Run when ast-grep paths differ from HEAD (unstaged or staged)
 */
import { agentSkillsDisplayPath, resolveAgentSkillsPath } from '../lib/agent-skills-paths.ts';

const repoRoot = import.meta.dir + '/..';
const skillRoot = resolveAgentSkillsPath(repoRoot, 'ast-grep');
const helper = `${skillRoot}/scripts/ast_grep_helper.py`;

const AST_GREP_PREFIX = `${agentSkillsDisplayPath('ast-grep')}/`;
const LOCKFILE_PATHS = new Set([
  'package.json',
  'bun.lock',
  'bun.lockb',
  `${AST_GREP_PREFIX}package.json`,
  `${AST_GREP_PREFIX}bun.lock`,
  `${AST_GREP_PREFIX}bun.lockb`,
]);
const POLICY_PATH = `${AST_GREP_PREFIX}policies/security.policy.toml`;

type Mode = 'staged' | 'full' | 'changed';

type Gate = {
  id: string;
  label: string;
  cmd: string[];
  cwd?: string;
};

function printHelp(): void {
  console.info(`pre-commit-ast-grep — ast-grep rule tests, semver policy, supply-chain packages

Usage:
  bun scripts/pre-commit-ast-grep.ts [mode]

Modes (pick one):
  --full      Run all gates (default for bun run precommit:ast-grep)
  --staged    Run only when relevant paths are staged (husky hook)
  --changed   Run when ast-grep / lockfile paths differ from HEAD
  -h, --help  Show this help

Examples:
  bun run precommit:ast-grep
  bun scripts/pre-commit-ast-grep.ts --staged
  bun scripts/pre-commit-ast-grep.ts --changed
`);
}

function parseMode(argv: string[]): Mode {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  if (argv.includes('--staged')) return 'staged';
  if (argv.includes('--changed')) return 'changed';
  return 'full';
}

function isAstGrepRelevant(file: string): boolean {
  const normalized = file.replace(/^\.\//, '');
  if (normalized.startsWith(AST_GREP_PREFIX)) return true;
  if (LOCKFILE_PATHS.has(normalized)) return true;
  return false;
}

function hasLockfileOrPolicyTrigger(files: string[]): boolean {
  return files.some(file => {
    const normalized = file.replace(/^\.\//, '');
    return LOCKFILE_PATHS.has(normalized) || normalized === POLICY_PATH;
  });
}

async function gitLines(args: string[]): Promise<string[]> {
  const proc = Bun.spawn(['git', ...args], {
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

async function getStagedFiles(): Promise<string[]> {
  return gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACM']);
}

async function getChangedFiles(): Promise<string[]> {
  const [unstaged, staged] = await Promise.all([
    gitLines(['diff', '--name-only', '--diff-filter=ACM']),
    gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACM']),
  ]);
  return [...new Set([...unstaged, ...staged])];
}

function buildGates(includePackages: boolean, includeDoctor: boolean): Gate[] {
  const gates: Gate[] = [];

  if (includeDoctor) {
    gates.push({
      id: 'doctor',
      label: 'ast-grep doctor',
      cmd: ['bun', `${skillRoot}/scripts/bun-cli.ts`, 'doctor'],
      cwd: repoRoot,
    });
  }

  gates.push(
    {
      id: 'rules',
      label: 'ast-grep rule tests',
      cmd: ['python3', helper, '-q', 'test'],
    },
    {
      id: 'semver',
      label: 'semver policy tests',
      cmd: ['python3', helper, '-q', 'bun', 'test-ci', '--profile', 'semver', '--skip-preflight'],
    }
  );

  if (includePackages) {
    gates.push({
      id: 'packages',
      label: 'semver supply-chain packages',
      cmd: [
        'bun',
        `${skillRoot}/scripts/bun-cli.ts`,
        'bun',
        'supply-chain',
        'packages',
        '--domain',
        'agents-ast-grep',
        '--fail-on',
      ],
    });
  }

  return gates;
}

async function runGate(gate: Gate): Promise<{ id: string; ok: boolean; ms: number }> {
  const started = performance.now();
  console.info(`🔍 ${gate.label}...`);
  const proc = Bun.spawn(gate.cmd, {
    cwd: gate.cwd ?? repoRoot,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  const ms = Math.round(performance.now() - started);
  if (code !== 0) {
    console.error(`❌ ${gate.label} failed (${ms}ms)`);
    return { id: gate.id, ok: false, ms };
  }
  console.info(`✅ ${gate.label} (${ms}ms)`);
  return { id: gate.id, ok: true, ms };
}

async function main(): Promise<void> {
  const mode = parseMode(Bun.argv.slice(2));
  let triggerFiles: string[] = [];
  let includePackages = mode === 'full';

  if (mode === 'staged') {
    triggerFiles = (await getStagedFiles()).filter(isAstGrepRelevant);
    if (triggerFiles.length === 0) {
      console.info('✅ No staged ast-grep / semver paths — skipped');
      return;
    }
    includePackages = hasLockfileOrPolicyTrigger(triggerFiles);
    console.info(`📦 ast-grep pre-commit [staged] (${triggerFiles.length} path(s))`);
  } else if (mode === 'changed') {
    triggerFiles = (await getChangedFiles()).filter(isAstGrepRelevant);
    if (triggerFiles.length === 0) {
      console.info('✅ No changed ast-grep / semver paths — skipped');
      return;
    }
    includePackages = hasLockfileOrPolicyTrigger(triggerFiles);
    console.info(`📦 ast-grep pre-commit [changed] (${triggerFiles.length} path(s))`);
  } else {
    console.info('📦 ast-grep pre-commit [full] — rules + semver + packages');
  }

  if (triggerFiles.length > 0 && triggerFiles.length <= 8) {
    for (const file of triggerFiles) console.info(`   · ${file}`);
  } else if (triggerFiles.length > 8) {
    for (const file of triggerFiles.slice(0, 5)) console.info(`   · ${file}`);
    console.info(`   · … +${triggerFiles.length - 5} more`);
  }

  // Doctor is slow and only needed when the skill tree itself changes (or full mode).
  // Root package.json / lockfile triggers still run rules + semver + packages.
  const includeDoctor =
    mode === 'full' || triggerFiles.some(f => f.replace(/^\.\//, '').startsWith(AST_GREP_PREFIX));
  if (!includeDoctor) {
    console.info('⏭️  Skipping ast-grep doctor (no skill-tree paths in trigger set)');
  }

  const gates = buildGates(includePackages, includeDoctor);
  const results: Array<{ id: string; ok: boolean; ms: number }> = [];

  for (const gate of gates) {
    results.push(await runGate(gate));
    if (!results.at(-1)?.ok) break;
  }

  const failed = results.filter(r => !r.ok);
  const totalMs = results.reduce((sum, r) => sum + r.ms, 0);

  console.info('');
  if (failed.length > 0) {
    console.error(`❌ ast-grep pre-commit failed — gate: ${failed[0]!.id} (${totalMs}ms)`);
    console.error('   Fix and re-run: bun run precommit:ast-grep');
    process.exit(1);
  }

  console.info(`✅ ast-grep + semver passed — ${results.length} gate(s), ${totalMs}ms [${mode}]`);
}

if (import.meta.main) {
  await main();
}
