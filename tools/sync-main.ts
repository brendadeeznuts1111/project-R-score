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
 *   bun run sync:main -- --json
 *   bun run sync:main -- --yes
 *
 * Steps:
 *   1) require branch == main (unless --force)
 *   2) fetch origin main (also on --dry-run — counts stay honest)
 *   3) if ahead of origin/main → create backup/local-main-pre-sync-<stamp>
 *   4) soft-reset to origin/main
 *   5) clear soft-reset residue (mixed reset + restore tracked tree to HEAD)
 *   6) never git clean -fd (foreign untracked roots stay)
 *
 * Policy: AGENTS.md · docs/harness/tenants/maintain-workspace.md
 */

import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { jsonOut, section, statusLine, tones } from '../lib/console/index.ts';
import {
  applyUnknownLongOptionGuardFor,
  SYNC_MAIN_ALLOWED_LONG,
} from '../lib/docs/ref-id-tool-flags.ts';
import { printGateFailure } from '../lib/harness/gate-fail.ts';

export { SYNC_MAIN_ALLOWED_LONG };

export type SyncMainOpts = {
  dryRun: boolean;
  force: boolean;
  help: boolean;
  json: boolean;
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
  /** True when plan was computed after a successful `git fetch origin main`. */
  fetched: boolean;
};

export type SyncMainResult = {
  ok: boolean;
  dryRun: boolean;
  action: 'noop' | 'would-sync' | 'synced' | 'refused' | 'failed';
  plan: SyncMainPlan;
  dirtyPaths?: number;
  error?: string;
};

export function parseSyncMainOpts(argv: string[]): SyncMainOpts {
  const set = new Set(argv);
  return {
    dryRun: set.has('--dry-run'),
    force: set.has('--force'),
    help: set.has('--help') || set.has('-h'),
    json: set.has('--json'),
    yes: set.has('--yes') || set.has('-y'),
  };
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

export function planSyncMain(root: string, fetched: boolean): SyncMainPlan {
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
    fetched,
  };
}

function printHelp(): void {
  const md = `# sync:main

Safe post-squash sync onto \`origin/main\` (backup unpushed tip · soft reset · clear residue).

## Usage

\`\`\`bash
bun run sync:main
bun run sync:main -- --dry-run
bun run sync:main -- --json
bun run sync:main -- --yes
bun run sync:main -- --force   # allow non-main branch (rare)
\`\`\`

## What it does

1. Fetch \`origin/main\` (also under \`--dry-run\` so ahead/behind stay honest)
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

function failGate(input: {
  title: string;
  gate: string;
  why: string;
  fix: string;
  detail?: string;
  json: boolean;
  plan: SyncMainPlan;
  action: SyncMainResult['action'];
}): number {
  const result: SyncMainResult = {
    ok: false,
    dryRun: false,
    action: input.action,
    plan: input.plan,
    error: input.why,
  };
  if (input.json) {
    jsonOut(result);
  } else {
    printGateFailure({
      title: input.title,
      gate: input.gate,
      why: input.why,
      fix: input.fix,
      detail: input.detail,
    });
  }
  return 1;
}

function emitOk(opts: SyncMainOpts, result: SyncMainResult): number {
  if (opts.json) {
    jsonOut(result);
    return result.ok ? 0 : 1;
  }
  return result.ok ? 0 : 1;
}

export async function runSyncMain(
  root: string = process.cwd(),
  argv: string[] = Bun.argv.slice(2)
): Promise<number> {
  const guarded = applyUnknownLongOptionGuardFor('sync:main', argv, { onFail: 'throw' });
  const opts = parseSyncMainOpts(guarded);
  if (opts.help) {
    printHelp();
    return 0;
  }

  if (!opts.json) {
    console.info(section('fetch origin main'));
  }
  // Always fetch so dry-run ahead/behind match remote (read-only network).
  git(['fetch', 'origin', 'main'], root);
  if (opts.dryRun && !opts.json) {
    say('fetch', 'origin/main updated (dry-run still fetches)', 'ok');
  }

  const plan = planSyncMain(root, true);
  if (!opts.json) {
    console.info(
      [
        `branch=${plan.branch}`,
        `head=${plan.head.slice(0, 12)}`,
        `origin/main=${plan.originMain.slice(0, 12)}`,
        `ahead=${plan.ahead}`,
        `behind=${plan.behind}`,
        `fetched=${plan.fetched}`,
      ].join(' ')
    );
  }

  if (plan.branch !== 'main' && !opts.force) {
    return failGate({
      title: 'sync:main refused',
      gate: 'sync-main',
      why: `Not on main (branch=${plan.branch || '(detached)'})`,
      fix: 'git checkout main && bun run sync:main',
      detail: 'Pass --force only for rare non-main sync experiments.',
      json: opts.json,
      plan,
      action: 'refused',
    });
  }

  if (plan.alreadySynced) {
    if (!opts.json) say('ok', 'already at origin/main', 'ok');
    return emitOk(opts, {
      ok: true,
      dryRun: opts.dryRun,
      action: 'noop',
      plan,
      dirtyPaths: 0,
    });
  }

  if (!opts.json) {
    if (plan.behind > 0 && plan.ahead === 0) {
      say('sync', `behind ${plan.behind} — will move HEAD to origin/main`, 'warn');
    }
    if (plan.ahead > 0) {
      say('backup', `${plan.ahead} unpushed commit(s) → ${plan.backupBranch}`, 'warn');
    }
  }

  if (opts.dryRun) {
    if (!opts.json) {
      console.info(section('dry-run plan'));
      if (plan.backupBranch) {
        console.log(`  would create branch ${plan.backupBranch} at ${plan.head.slice(0, 12)}`);
      }
      console.log(`  would: git reset --soft origin/main`);
      console.log(`  would: git reset && git restore --source=HEAD --worktree -- .`);
      console.log(`  would NOT: git clean -fd`);
      say('dry-run', 'no changes written', 'warn');
    }
    return emitOk(opts, {
      ok: true,
      dryRun: true,
      action: 'would-sync',
      plan,
    });
  }

  if (plan.backupBranch) {
    if (!opts.json) console.info(section('backup unpushed tip'));
    git(['branch', plan.backupBranch, 'HEAD'], root);
    if (!opts.json) say('backup', plan.backupBranch, 'ok');
  }

  if (!opts.json) console.info(section('soft reset → origin/main'));
  git(['reset', '--soft', 'origin/main'], root);

  if (!opts.json) console.info(section('clear soft-reset residue'));
  git(['reset'], root);
  git(['restore', '--source=HEAD', '--worktree', '--', '.'], root);

  const after = planSyncMain(root, true);
  if (after.head !== after.originMain) {
    return failGate({
      title: 'sync:main incomplete',
      gate: 'sync-main',
      why: 'HEAD still diverged from origin/main after reset/restore',
      fix: 'bun run sync:main -- --dry-run',
      detail: `head=${after.head.slice(0, 12)} origin/main=${after.originMain.slice(0, 12)}`,
      json: opts.json,
      plan: after,
      action: 'failed',
    });
  }

  const dirty = git(['status', '--porcelain=v1'], root, { allowFail: true }).stdout;
  const dirtyPaths = dirty ? dirty.split('\n').filter(Boolean).length : 0;
  if (!opts.json) {
    say(
      'ok',
      `synced to origin/main · remaining dirty paths: ${dirtyPaths} (untracked/foreign kept)`,
      'ok'
    );
    if (plan.backupBranch) {
      console.log(tones.dim(`backup tip: git log -1 --oneline ${plan.backupBranch}`));
    }
  }
  return emitOk(opts, {
    ok: true,
    dryRun: false,
    action: 'synced',
    plan: after,
    dirtyPaths,
  });
}

if (isModuleEntrypoint(import.meta)) {
  try {
    process.exitCode = await runSyncMain();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/unknown flag|Unknown long option/i.test(message)) {
      printGateFailure({
        title: 'sync:main flags',
        gate: 'sync-main',
        why: message,
        fix: 'bun run sync:main -- --help',
      });
      process.exitCode = 1;
    } else {
      console.error(message);
      process.exitCode = 1;
    }
  }
}
