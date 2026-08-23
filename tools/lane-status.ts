#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/utils#bun-readablestreamto — Bun.readableStreamToText
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-exit — Bun.exit
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — logTable
/**
 * lane-status.ts — read-only lane / worktree / branch / bake-drift reporter.
 *
 *   bun run lane:status
 *   bun run lane:status -- --json
 *   bun run lane:status -- --short
 *   bun run lane:status -- --count
 *   bun run lane:status -- --left-right
 *   bun run lane:status -- --merged
 *   bun run lane:status -- --verbose
 *   bun run lane:status -- --strict          # exit 1 if dirty / behind / off main
 *   bun run lane:status -- --watch
 *   bun run lane:status -- --watch --every '0,5 * * * *'
 *
 * Read-only git via Bun.spawnSync / Bun.spawn. Policy: AGENTS.md lane hygiene.
 */

import {
  applyUnknownLongOptionGuardFor,
  LANE_STATUS_ALLOWED_LONG,
} from '../lib/docs/ref-id-tool-flags.ts';
import {
  cliOut,
  kvLines,
  logTable,
  msFromNs,
  section,
  statusLine,
  tones,
} from '../lib/console/index.ts';
import { parseGitStatusPorcelain, type GitStatusEntry } from '../scripts/lib/git-porcelain.ts';

export { LANE_STATUS_ALLOWED_LONG };

const DEFAULT_WATCH_CRON = '*/5 * * * *';
const STALE_HOURS = 48;

export type LaneHealth = 'ok' | 'warn' | 'fail';

export type LaneCliOpts = {
  json: boolean;
  watch: boolean;
  every: string;
  short: boolean;
  count: boolean;
  mergedOnly: boolean;
  leftRightOnly: boolean;
  verbose: boolean;
  strict: boolean;
};

export type LaneReport = {
  primary: {
    path: string;
    branch: string;
    head: string;
    aheadOfOriginMain: number;
    behindOriginMain: number;
    dirtyTotal: number;
    dirtyByArea: Record<string, number>;
    dirtyFiles: Array<{ code: string; path: string; area: string }>;
    stagedFiles: string[];
    bakeDriftFiles: string[];
  };
  worktrees: Array<{
    path: string;
    branch: string;
    dirty: number;
    ageHours: number;
    flag: string;
  }>;
  mergedBranches: string[];
  meta: {
    health: LaneHealth;
    /** Collect duration in ms (numeric for JSON). */
    elapsedMs: number;
    /** Human label from msFromNs (e.g. "12.3 ms"). */
    elapsedLabel: string;
    staleHours: number;
    worktreeTotal: number;
    worktreeDirty: number;
    worktreeStale: number;
  };
};

/** Blocking git via Bun.spawnSync. */
function git(args: string[], cwd?: string, preserveLeadingWhitespace = false): string {
  const proc = Bun.spawnSync(['git', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (proc.exitCode !== 0) return '';
  const out = proc.stdout.toString();
  return preserveLeadingWhitespace ? out.trimEnd() : out.trim();
}

/** Async git via Bun.spawn + readableStreamToText (for parallel worktree probes). */
async function gitAsync(
  args: string[],
  cwd?: string,
  preserveLeadingWhitespace = false
): Promise<string> {
  const proc = Bun.spawn(['git', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const out = await Bun.readableStreamToText(proc.stdout);
  const code = await proc.exited;
  if (code !== 0) return '';
  return preserveLeadingWhitespace ? out.trimEnd() : out.trim();
}

function shortPath(path: string, home: string): string {
  return home && path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}

export function areaOf(path: string): string {
  if (path.startsWith('public/registry/')) return 'registry';
  if (path.startsWith('public/portal/') || path.startsWith('public/monitoring/')) return 'portal';
  if (path.startsWith('lib/')) return 'lib';
  if (path.startsWith('docs/')) return 'docs';
  if (path.startsWith('tests/')) return 'tests';
  if (path.startsWith('tools/') || path.startsWith('scripts/')) return 'tooling';
  return 'other';
}

export function healthOf(report: Pick<LaneReport, 'primary'>): LaneHealth {
  const { branch, behindOriginMain, dirtyTotal, bakeDriftFiles } = report.primary;
  if (behindOriginMain > 0 && branch === 'main') return 'fail';
  if (bakeDriftFiles.length > 0) return 'warn';
  if (dirtyTotal > 0) return 'warn';
  if (branch && branch !== 'main') return 'warn';
  return 'ok';
}

function dirtyEntriesSync(cwd: string): GitStatusEntry[] {
  return parseGitStatusPorcelain(git(['status', '--porcelain=v1'], cwd, true));
}

type WorktreeProbe = {
  path: string;
  branch: string;
  dirty: number;
  ageHours: number;
  flag: string;
};

async function probeWorktree(
  wtPath: string,
  wtBranch: string,
  home: string,
  nowSec: number
): Promise<WorktreeProbe> {
  const [statusOut, commitRaw] = await Promise.all([
    gitAsync(['status', '--porcelain=v1'], wtPath, true),
    gitAsync(['log', '-1', '--format=%ct'], wtPath),
  ]);
  const entries = parseGitStatusPorcelain(statusOut);
  const commitUnix = Number(commitRaw);
  const ageHours = commitUnix ? Math.floor((nowSec - commitUnix) / 3600) : -1;
  const stale = entries.length === 0 && ageHours > STALE_HOURS;
  return {
    path: shortPath(wtPath, home),
    branch: wtBranch,
    dirty: entries.length,
    ageHours,
    flag: stale ? 'STALE' : entries.length > 0 ? 'dirty' : '',
  };
}

export async function collectReport(root: string, home: string): Promise<LaneReport> {
  const t0 = Bun.nanoseconds();
  const branch = git(['branch', '--show-current'], root);
  const head = git(['rev-parse', '--short', 'HEAD'], root);
  const counts = git(['rev-list', '--left-right', '--count', 'HEAD...origin/main'], root).split(
    /\s+/
  );
  const ahead = Number(counts[0] ?? 0);
  const behind = Number(counts[1] ?? 0);

  const primaryDirty = dirtyEntriesSync(root);
  const dirtyByArea: Record<string, number> = {};
  const dirtyFiles = primaryDirty.map(d => {
    const area = areaOf(d.path);
    dirtyByArea[area] = (dirtyByArea[area] ?? 0) + 1;
    return { code: d.code, path: d.path, area };
  });
  const staged = primaryDirty.filter(d => d.code[0] !== ' ' && d.code[0] !== '?');
  const bakeDrift = primaryDirty.filter(d => d.path.startsWith('public/registry/'));

  const porcelain = git(['worktree', 'list', '--porcelain'], root);
  const worktreeBranches = new Set<string>();
  const probes: Array<Promise<WorktreeProbe>> = [];
  const nowSec = Math.floor(Date.now() / 1000);

  for (const block of porcelain.split('\n\n')) {
    const wtPath = block.match(/^worktree (.+)$/m)?.[1];
    if (!wtPath) continue;
    const wtBranch = block.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? '(detached)';
    if (wtBranch !== '(detached)') worktreeBranches.add(wtBranch);
    probes.push(probeWorktree(wtPath, wtBranch, home, nowSec));
  }

  const worktrees = (await Promise.all(probes)).sort((a, b) => b.ageHours - a.ageHours);

  const mergedRaw = git(['branch', '--merged', 'origin/main', '--format=%(refname:short)'], root);
  const mergedBranches = mergedRaw
    ? mergedRaw
        .split('\n')
        .filter(Boolean)
        .filter(
          b =>
            b !== 'main' && b !== branch && !b.startsWith('quarantine/') && !worktreeBranches.has(b)
        )
    : [];

  const primary = {
    path: root,
    branch,
    head,
    aheadOfOriginMain: ahead,
    behindOriginMain: behind,
    dirtyTotal: primaryDirty.length,
    dirtyByArea,
    dirtyFiles,
    stagedFiles: staged.map(s => s.path),
    bakeDriftFiles: bakeDrift.map(b => b.path),
  };

  const report: LaneReport = {
    primary,
    worktrees,
    mergedBranches,
    meta: {
      health: 'ok',
      elapsedMs: 0,
      elapsedLabel: '',
      staleHours: STALE_HOURS,
      worktreeTotal: worktrees.length,
      worktreeDirty: worktrees.filter(w => w.dirty > 0).length,
      worktreeStale: worktrees.filter(w => w.flag === 'STALE').length,
    },
  };
  const elapsedNs = Bun.nanoseconds() - t0;
  report.meta.elapsedMs = Math.round((elapsedNs / 1e6) * 100) / 100;
  report.meta.elapsedLabel = msFromNs(elapsedNs);
  report.meta.health = healthOf(report);
  return report;
}

function healthTone(h: LaneHealth): keyof typeof tones {
  if (h === 'ok') return 'ok';
  if (h === 'fail') return 'fail';
  return 'warn';
}

function printCount(report: LaneReport): void {
  const { primary, mergedBranches, meta } = report;
  console.info(
    [
      `dirty=${primary.dirtyTotal}`,
      `staged=${primary.stagedFiles.length}`,
      `ahead=${primary.aheadOfOriginMain}`,
      `behind=${primary.behindOriginMain}`,
      `worktrees=${meta.worktreeTotal}`,
      `wtDirty=${meta.worktreeDirty}`,
      `wtStale=${meta.worktreeStale}`,
      `merged=${mergedBranches.length}`,
      `health=${meta.health}`,
      `elapsed=${meta.elapsedLabel}`,
    ].join(' ')
  );
}

function printLeftRight(report: LaneReport): void {
  const { primary, meta } = report;
  for (const line of kvLines([
    ['branch', primary.branch || '(detached)'],
    ['head', primary.head],
    ['ahead', String(primary.aheadOfOriginMain)],
    ['behind', String(primary.behindOriginMain)],
    ['health', meta.health],
  ])) {
    console.info(line);
  }
}

function printMerged(report: LaneReport): void {
  console.info(
    section(`== branches merged into origin/main (removable): ${report.mergedBranches.length} ==`)
  );
  if (report.mergedBranches.length > 0) {
    console.info(tones.dim(report.mergedBranches.join(', ')));
  } else {
    console.info(tones.dim('  (none)'));
  }
}

function printHuman(report: LaneReport, opts: LaneCliOpts): void {
  if (opts.count) {
    printCount(report);
    return;
  }
  if (opts.leftRightOnly) {
    printLeftRight(report);
    return;
  }
  if (opts.mergedOnly) {
    printMerged(report);
    return;
  }

  const { primary, worktrees, mergedBranches, meta } = report;
  const areas =
    Object.entries(primary.dirtyByArea)
      .map(([k, v]) => `${k}:${v}`)
      .join(' ') || '-';

  console.info(section('== primary ==').trimStart());
  logTable([
    {
      branch: primary.branch || '(detached)',
      head: primary.head,
      ahead: primary.aheadOfOriginMain,
      behind: primary.behindOriginMain,
      dirty: primary.dirtyTotal,
      staged: primary.stagedFiles.length,
      health: meta.health,
      areas,
    },
  ]);

  if (primary.stagedFiles.length > 0) {
    console.info(statusLine('staged', primary.stagedFiles.join(', ')));
  }
  if (primary.bakeDriftFiles.length > 0) {
    console.info(
      statusLine(
        'bake drift',
        `${primary.bakeDriftFiles.length} dirty public/registry/** — commit as chore(bake) or git restore`,
        'warn'
      )
    );
  }

  if (opts.verbose && primary.dirtyFiles.length > 0) {
    console.info(section('== dirty files =='));
    logTable(
      primary.dirtyFiles.map(d => ({
        xy: d.code,
        area: d.area,
        path: d.path,
      }))
    );
  }

  if (!opts.short) {
    const shown = opts.verbose ? worktrees : worktrees.filter(w => w.flag !== '');
    console.info(
      section(
        `== worktrees ${opts.verbose ? '(all)' : '(flagged)'} · dirty=${meta.worktreeDirty} stale=${meta.worktreeStale} / ${meta.worktreeTotal} ==`
      )
    );
    if (shown.length === 0) {
      console.info(tones.dim('  (none flagged — pass --verbose for full list)'));
    } else {
      logTable(
        shown.map(w => ({
          branch: w.branch,
          dirty: w.dirty,
          ageH: w.ageHours,
          flag: w.flag,
          path: w.path,
        }))
      );
    }

    printMerged(report);
  } else {
    console.info(
      statusLine(
        'worktrees',
        `dirty=${meta.worktreeDirty} stale=${meta.worktreeStale} total=${meta.worktreeTotal} merged=${mergedBranches.length}`
      )
    );
  }

  console.info(
    statusLine('scan', `${meta.elapsedLabel} · health=${meta.health}`, healthTone(meta.health))
  );
}

export function parseLaneCliOpts(argv: string[]): LaneCliOpts {
  const everyIdx = argv.indexOf('--every');
  const everyArg = everyIdx >= 0 ? argv[everyIdx + 1] : undefined;
  const every = everyArg && !everyArg.startsWith('-') ? everyArg : DEFAULT_WATCH_CRON;

  return {
    json: argv.includes('--json'),
    watch: argv.includes('--watch'),
    every,
    short: argv.includes('--short'),
    count: argv.includes('--count'),
    mergedOnly: argv.includes('--merged'),
    leftRightOnly: argv.includes('--left-right'),
    verbose: argv.includes('--verbose'),
    strict: argv.includes('--strict'),
  };
}

function strictExitCode(report: LaneReport): number {
  if (report.meta.health === 'fail') return 1;
  if (report.primary.dirtyTotal > 0) return 1;
  if (report.primary.branch !== 'main') return 1;
  return 0;
}

async function main(): Promise<void> {
  const argv = applyUnknownLongOptionGuardFor('lane:status', Bun.argv.slice(2));
  const opts = parseLaneCliOpts(argv);

  const root = git(['rev-parse', '--show-toplevel']);
  if (!root) {
    console.error('lane-status: not inside a git work tree');
    Bun.exit(1);
  }
  const home = Bun.env.HOME ?? '';

  const render = async (): Promise<LaneReport> => {
    const report = await collectReport(root, home);
    if (opts.json) {
      cliOut(report, { json: true });
    } else {
      printHuman(report, opts);
    }
    return report;
  };

  const first = await render();

  if (opts.watch) {
    if (opts.json) {
      console.error('lane-status: --watch is human-only (omit --json)');
      Bun.exit(1);
    }
    console.info(tones.dim(`\nwatch  cron=${JSON.stringify(opts.every)} UTC · Ctrl-C to stop`));
    using _job = Bun.cron(opts.every, async () => {
      console.info(tones.dim(`\n── cron reprint ${new Date().toISOString()} ──`));
      await render();
    });
    await new Promise<void>(() => {});
    return;
  }

  if (opts.strict) {
    Bun.exit(strictExitCode(first));
  }
}

if (import.meta.main) {
  await main();
}
