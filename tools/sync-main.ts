#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @updated --dry-run · fixed v1.3.4 · 2025-12-06 · https://bun.com/blog/bun-v1.3.4
// @updated --dry-run · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @verified --dry-run · Bun v1.3.14 · 2026-08-18 · https://bun.com/docs/pm/cli/install#dry-run
// @see https://bun.com/docs/bundler/executables — --force
// @updated --force · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated --force · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified --force · Bun v1.3.14 · 2026-08-18 · https://bun.com/docs/bundler/executables
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @released Bun.markdown.ansi · released v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.markdown.ansi · changed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.markdown.ansi · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * sync-main.ts — safe post-squash sync onto origin/main.
 *
 * Replaces the soft-reset-only `git sync-main` alias, which leaves every
 * unpushed local commit as staged residue (session friction: hundreds of
 * paths + stash gymnastics).
 *
 *   bun run sync:main
 *   bun run sync:main -- --dry-run
 *   bun run sync:main -- --yes
 *
 * Steps:
 *   1) require branch == main (unless --force)
 *   2) fetch origin main
 *   3) if ahead of origin/main → create backup/local-main-pre-sync-<stamp>
 *   4) soft-reset to origin/main
 *   5) clear soft-reset residue (mixed reset + restore tracked tree to HEAD)
 *   6) never git clean -fd (foreign untracked roots stay)
 *
 * Policy: AGENTS.md · docs/harness/tenants/maintain-workspace.md
 */

import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { section, statusLine, tones } from '../lib/console/index.ts';

export const SYNC_MAIN_ALLOWED_LONG = ['dry-run', 'force', 'help', 'yes'] as const;

export type SyncMainOpts = {
  dryRun: boolean;
  force: boolean;
  help: boolean;
  yes: boolean;
};

export type SyncMainPlan = {
  branch: string;
  head: string;
  originMain: string;
  ahead: number;
  behind: number;
  alreadySynced: boolean;
  backupBranch: string | null;
};

export function parseSyncMainOpts(argv: string[]): SyncMainOpts {
  const set = new Set(argv);
  return {
    dryRun: set.has('--dry-run'),
    force: set.has('--force'),
    help: set.has('--help') || set.has('-h'),
    yes: set.has('--yes') || set.has('-y'),
  };
}

/** Reject unknown `--*` flags (local allowlist; not yet in ALLOWED_LONG_REGISTRY). */
export function guardSyncMainArgv(argv: readonly string[]): string[] {
  const allowed = new Set<string>(SYNC_MAIN_ALLOWED_LONG);
  const unknown: string[] = [];
  for (const arg of argv) {
    if (!arg.startsWith('--') || arg === '--') continue;
    const name = arg.slice(2).split('=')[0] ?? '';
    if (!name || !allowed.has(name)) unknown.push(arg);
  }
  if (unknown.length > 0) {
    throw new Error(`❌ Unknown long option(s) in sync:main: ${unknown.join(' ')}`);
  }
  return [...argv];
}

export function backupBranchName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    '-',
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join('');
  return `backup/local-main-pre-sync-${stamp}`;
}

function git(
  args: string[],
  cwd: string,
  opts: { allowFail?: boolean } = {}
): { code: number; stdout: string; stderr: string } {
  const proc = Bun.spawnSync(['git', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = proc.stdout.toString().trim();
  const stderr = proc.stderr.toString().trim();
  const code = proc.exitCode ?? 1;
  if (code !== 0 && !opts.allowFail) {
    throw new Error(`git ${args.join(' ')} failed (${code}): ${stderr || stdout}`);
  }
  return { code, stdout, stderr };
}

export function planSyncMain(root: string): SyncMainPlan {
  const branch = git(['branch', '--show-current'], root).stdout;
  const head = git(['rev-parse', 'HEAD'], root).stdout;
  const originMain = git(['rev-parse', 'origin/main'], root, { allowFail: true }).stdout;
  if (!originMain) {
    throw new Error('origin/main missing — run: git fetch origin main');
  }
  const counts = git(['rev-list', '--left-right', '--count', 'HEAD...origin/main'], root)
    .stdout.split(/\s+/)
    .map(Number);
  const ahead = counts[0] ?? 0;
  const behind = counts[1] ?? 0;
  const alreadySynced = head === originMain;
  return {
    branch,
    head,
    originMain,
    ahead,
    behind,
    alreadySynced,
    backupBranch: ahead > 0 ? backupBranchName() : null,
  };
}

function printHelp(): void {
  const md = `# sync:main

Safe post-squash sync onto \`origin/main\` (backup unpushed tip · soft reset · clear residue).

## Usage

\`\`\`bash
bun run sync:main
bun run sync:main -- --dry-run
bun run sync:main -- --yes
bun run sync:main -- --force   # allow non-main branch (rare)
\`\`\`

## What it does

1. Fetch \`origin/main\`
2. If this tip is **ahead** of \`origin/main\`, create \`backup/local-main-pre-sync-<UTC>\`
3. Soft-reset to \`origin/main\`
4. Clear soft-reset staged residue (\`git reset\` + restore tracked files to HEAD)
5. Leave untracked foreign roots alone (no \`git clean -fd\`)

Prefer this over the soft-reset-only \`git sync-main\` alias.
`;
  try {
    console.log(Bun.markdown.ansi(md));
  } catch {
    console.log(md);
  }
}

function say(label: string, value: string, tone: 'ok' | 'fail' | 'warn' | null = null): void {
  console.info(statusLine(label, value, tone));
}

export async function runSyncMain(
  root: string = process.cwd(),
  argv: string[] = Bun.argv.slice(2)
): Promise<number> {
  guardSyncMainArgv(argv);
  const opts = parseSyncMainOpts(argv);
  if (opts.help) {
    printHelp();
    return 0;
  }

  console.info(section('fetch origin main'));
  if (!opts.dryRun) {
    git(['fetch', 'origin', 'main'], root);
  } else {
    say('dry-run', 'skip fetch', 'warn');
  }

  const plan = planSyncMain(root);
  console.info(
    [
      `branch=${plan.branch}`,
      `head=${plan.head.slice(0, 12)}`,
      `origin/main=${plan.originMain.slice(0, 12)}`,
      `ahead=${plan.ahead}`,
      `behind=${plan.behind}`,
    ].join(' ')
  );

  if (plan.branch !== 'main' && !opts.force) {
    say('refused', 'not on main (pass --force to override)', 'fail');
    return 1;
  }

  if (plan.alreadySynced) {
    say('ok', 'already at origin/main', 'ok');
    return 0;
  }

  if (plan.behind > 0 && plan.ahead === 0) {
    say('sync', `behind ${plan.behind} — will move HEAD to origin/main`, 'warn');
  }

  if (plan.ahead > 0) {
    say('backup', `${plan.ahead} unpushed commit(s) → ${plan.backupBranch}`, 'warn');
  }

  if (opts.dryRun) {
    console.info(section('dry-run plan'));
    if (plan.backupBranch) {
      console.log(`  would create branch ${plan.backupBranch} at ${plan.head.slice(0, 12)}`);
    }
    console.log(`  would: git reset --soft origin/main`);
    console.log(`  would: git reset && git restore --source=HEAD --worktree -- .`);
    console.log(`  would NOT: git clean -fd`);
    say('dry-run', 'no changes written', 'warn');
    return 0;
  }

  if (plan.backupBranch) {
    console.info(section('backup unpushed tip'));
    git(['branch', plan.backupBranch, 'HEAD'], root);
    say('backup', plan.backupBranch, 'ok');
  }

  console.info(section('soft reset → origin/main'));
  git(['reset', '--soft', 'origin/main'], root);

  console.info(section('clear soft-reset residue'));
  // Mixed reset: unstage everything soft-reset left in the index.
  git(['reset'], root);
  // Restore tracked paths to match HEAD (origin/main). Leaves untracked alone.
  git(['restore', '--source=HEAD', '--worktree', '--', '.'], root);

  const after = planSyncMain(root);
  if (after.head !== after.originMain) {
    say('fail', 'HEAD still diverged from origin/main', 'fail');
    return 1;
  }

  const dirty = git(['status', '--porcelain=v1'], root, { allowFail: true }).stdout;
  const dirtyLines = dirty ? dirty.split('\n').filter(Boolean).length : 0;
  say(
    'ok',
    `synced to origin/main · remaining dirty paths: ${dirtyLines} (untracked/foreign kept)`,
    'ok'
  );
  if (plan.backupBranch) {
    console.log(tones.dim(`backup tip: git log -1 --oneline ${plan.backupBranch}`));
  }
  return 0;
}

if (isModuleEntrypoint(import.meta)) {
  try {
    process.exitCode = await runSyncMain();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
