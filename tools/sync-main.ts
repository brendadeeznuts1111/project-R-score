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
// @see https://bun.com/blog/bun-v1.4 — Bun 1.4 CLI kit
/**
 * sync-main.ts — safe post-squash sync onto origin/main.
 *
 *   bun run sync:main
 *   bun run sync:main -- --dry-run
 *   bun run sync:main -- --json
 *
 * Rebind the soft-reset-only git alias (operator machine):
 *   git config alias.sync-main '!bun run sync:main --'
 *
 * Policy: AGENTS.md · docs/harness/tenants/maintain-workspace.md
 */

import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { section, statusLine, tones } from '../lib/console/index.ts';
import {
  applyUnknownLongOptionGuardFor,
  SYNC_MAIN_ALLOWED_LONG,
} from '../lib/docs/ref-id-tool-flags.ts';
import {
  emitJson,
  failCli,
  printMarkdownHelp,
  setExitCode,
  spawnText,
  wantsHelp,
  wantsJson,
} from '../lib/harness/bun-cli.ts';

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
    help: wantsHelp(argv),
    json: wantsJson(argv),
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
  return spawnText(['git', ...args], { cwd, allowFail: opts.allowFail });
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
  return {
    branch,
    head,
    originMain,
    ahead,
    behind,
    alreadySynced: head === originMain,
    backupBranch: ahead > 0 ? backupBranchName() : null,
    fetched,
  };
}

function printHelp(): void {
  printMarkdownHelp(`# sync:main

Safe post-squash sync onto \`origin/main\` (backup unpushed tip · soft reset · clear residue).

## Usage

\`\`\`bash
bun run sync:main
bun run sync:main -- --dry-run
bun run sync:main -- --json
bun run sync:main -- --force
\`\`\`

## Operator rebind (optional)

\`\`\`bash
git config alias.sync-main '!bun run sync:main --'
\`\`\`

Always fetches \`origin/main\` (including \`--dry-run\`). Never \`git clean -fd\`.
`);
}

function say(label: string, value: string, tone: 'ok' | 'fail' | 'warn' | null = null): void {
  console.info(statusLine(label, value, tone));
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

  if (!opts.json) console.info(section('fetch origin main'));
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
    const result: SyncMainResult = {
      ok: false,
      dryRun: false,
      action: 'refused',
      plan,
      error: `Not on main (branch=${plan.branch || '(detached)'})`,
    };
    if (opts.json) {
      emitJson(result);
      return 1;
    }
    return failCli({
      title: 'sync:main refused',
      gate: 'sync-main',
      why: result.error!,
      fix: 'git checkout main && bun run sync:main',
      detail: 'Pass --force only for rare non-main sync experiments.',
    });
  }

  if (plan.alreadySynced) {
    if (!opts.json) say('ok', 'already at origin/main', 'ok');
    if (opts.json) {
      emitJson({
        ok: true,
        dryRun: opts.dryRun,
        action: 'noop',
        plan,
        dirtyPaths: 0,
      } satisfies SyncMainResult);
    }
    return 0;
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
    } else {
      emitJson({ ok: true, dryRun: true, action: 'would-sync', plan } satisfies SyncMainResult);
    }
    return 0;
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
    if (opts.json) {
      emitJson({
        ok: false,
        dryRun: false,
        action: 'failed',
        plan: after,
        error: 'HEAD still diverged from origin/main after reset/restore',
      } satisfies SyncMainResult);
      return 1;
    }
    return failCli({
      title: 'sync:main incomplete',
      gate: 'sync-main',
      why: 'HEAD still diverged from origin/main after reset/restore',
      fix: 'bun run sync:main -- --dry-run',
      detail: `head=${after.head.slice(0, 12)} origin/main=${after.originMain.slice(0, 12)}`,
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
  } else {
    emitJson({
      ok: true,
      dryRun: false,
      action: 'synced',
      plan: after,
      dirtyPaths,
    } satisfies SyncMainResult);
  }
  return 0;
}

if (isModuleEntrypoint(import.meta)) {
  try {
    setExitCode(await runSyncMain());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/unknown flag|Unknown long option/i.test(message)) {
      setExitCode(
        failCli({
          title: 'sync:main flags',
          gate: 'sync-main',
          why: message,
          fix: 'bun run sync:main -- --help',
        })
      );
    } else {
      console.error(message);
      setExitCode(1);
    }
  }
}
