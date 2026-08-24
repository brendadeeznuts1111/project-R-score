#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/toml — Bun.TOML.stringify
// @verified Bun.TOML.stringify · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/toml#bun-toml-parse
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @updated Bun.write · fixed v0.4.0 · 2022-12-23 · https://bun.com/blog/bun-v0.4.0
// @updated Bun.write · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated Bun.write · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.write · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated Bun.write · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.write · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.write · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.write · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.write · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.write · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.write · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated Bun.write · changed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.write · changed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.write · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.write · fixed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.write · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.write · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.write · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/utils#bun-readablestreamto — Bun.readableStreamToText
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-toml — Bun.TOML.stringify
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — logTable
// @see https://bun.com/blog/bun-v1.4 — Bun.Terminal · Bun.cron tz · wrapAnsi · bun-cli kit
/**
 * lane-status.ts — read-only lane / worktree / branch / bake-drift reporter.
 *
 *   bun run lane:status
 *   bun run lane:status -- --help
 *   bun run lane:status -- --json | --jsonl | --toml
 *   bun run lane:status -- --short | --count | --left-right | --merged | --verbose
 *   bun run lane:status -- --strict
 *   bun run lane:status -- --watch [--every '0,5 * * * *'] [--tz America/Chicago]
 *   bun run lane:status -- --term
 *   bun run pulse:lane
 *
 * Read-only git via bun-cli spawnText / Bun.spawn. Policy: AGENTS.md lane hygiene.
 * Kernel: lib/harness/bun-cli.ts (help · gate-fail · exitCode — not Bun.exit).
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
  termWidth,
  tones,
  truncateWidth,
} from '../lib/console/index.ts';
import {
  failCli,
  printMarkdownHelp,
  setExitCode,
  spawnText,
  wantsHelp,
} from '../lib/harness/bun-cli.ts';
import { parseGitStatusPorcelain, type GitStatusEntry } from '../scripts/lib/git-porcelain.ts';

export { LANE_STATUS_ALLOWED_LONG };

const DEFAULT_WATCH_CRON = '*/5 * * * *';
const DEFAULT_TZ = 'America/Chicago';
const STALE_HOURS = 48;

export type LaneHealth = 'ok' | 'warn' | 'fail';

export type LaneCliOpts = {
  help: boolean;
  json: boolean;
  jsonl: boolean;
  toml: boolean;
  watch: boolean;
  every: string;
  tz: string;
  short: boolean;
  count: boolean;
  mergedOnly: boolean;
  leftRightOnly: boolean;
  verbose: boolean;
  strict: boolean;
  term: boolean;
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
  /** Local `main` tip vs `origin/main` — independent of current checkout branch. */
  localMain: {
    aheadOfOriginMain: number;
    behindOriginMain: number;
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
    elapsedMs: number;
    elapsedLabel: string;
    staleHours: number;
    worktreeTotal: number;
    worktreeDirty: number;
    worktreeStale: number;
    tz?: string;
    nextFire?: string | null;
  };
};

/** Blocking git via bun-cli spawnText (allowFail — empty string on non-zero). */
function git(args: string[], cwd?: string, preserveLeadingWhitespace = false): string {
  const { code, stdout } = spawnText(['git', ...args], {
    cwd,
    allowFail: true,
    trim: !preserveLeadingWhitespace,
  });
  if (code !== 0) return '';
  return stdout;
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

function fitPath(path: string): string {
  return truncateWidth(path, Math.max(24, termWidth() - 40));
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

export function healthOf(report: Pick<LaneReport, 'primary' | 'localMain'>): LaneHealth {
  const { branch, behindOriginMain, dirtyTotal, bakeDriftFiles } = report.primary;
  // Unpushed local main poisons stacked PRs (soft-reset residue / conflict hell).
  if ((report.localMain?.aheadOfOriginMain ?? 0) > 0) return 'fail';
  if (behindOriginMain > 0 && branch === 'main') return 'fail';
  if (aheadOnMainCheckout(report)) return 'fail';
  if (bakeDriftFiles.length > 0) return 'warn';
  if (dirtyTotal > 0) return 'warn';
  if (branch && branch !== 'main') return 'warn';
  return 'ok';
}

function aheadOnMainCheckout(report: Pick<LaneReport, 'primary'>): boolean {
  const { branch, aheadOfOriginMain } = report.primary;
  return branch === 'main' && aheadOfOriginMain > 0;
}

export function nextFireIso(every: string, tz: string, from: number = Date.now()): string | null {
  try {
    const next = Bun.cron.parse(every, from, { tz });
    return next ? next.toISOString() : null;
  } catch {
    return null;
  }
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

export async function collectReport(
  root: string,
  home: string,
  metaExtra: Partial<LaneReport['meta']> = {}
): Promise<LaneReport> {
  const t0 = Bun.nanoseconds();
  const branch = git(['branch', '--show-current'], root);
  const head = git(['rev-parse', '--short', 'HEAD'], root);
  const counts = git(['rev-list', '--left-right', '--count', 'HEAD...origin/main'], root).split(
    /\s+/
  );
  const ahead = Number(counts[0] ?? 0);
  const behind = Number(counts[1] ?? 0);

  const mainCounts = git(['rev-list', '--left-right', '--count', 'main...origin/main'], root).split(
    /\s+/
  );
  const localMain = {
    aheadOfOriginMain: Number(mainCounts[0] ?? 0),
    behindOriginMain: Number(mainCounts[1] ?? 0),
  };

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
    localMain,
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
      ...metaExtra,
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

function printHelp(): void {
  const md = `# lane-status

Read-only lane / worktree / bake-drift reporter (AGENTS.md lane hygiene).

## Usage

\`\`\`bash
bun run lane:status
bun run lane:status -- --help
bun run lane:status -- --json | --jsonl | --toml
bun run lane:status -- --short | --count | --left-right | --merged | --verbose
bun run lane:status -- --strict
bun run lane:status -- --watch [--every '0,5 * * * *'] [--tz America/Chicago]
bun run lane:status -- --term
bun run pulse:lane
\`\`\`

## Flags

| Flag | Meaning |
| --- | --- |
| \`--help\` | This help (Bun.markdown.ansi) |
| \`--json\` | Pretty JSON report |
| \`--jsonl\` | One compact JSON object per line (watch-safe) |
| \`--toml\` | Bun.TOML.stringify report (once) |
| \`--short\` | Primary + compact worktree counts |
| \`--count\` | One-line machine counts |
| \`--left-right\` | Ahead/behind kv only |
| \`--merged\` | Removable merged branches only |
| \`--verbose\` | Dirty file table + all worktrees |
| \`--strict\` | Exit 1 if dirty / off main / fail health |
| \`--watch\` | Bun.cron reprint |
| \`--every EXPR\` | Cron expression (default \`*/5 * * * *\`) |
| \`--tz NAME\` | IANA tz for cron (default \`America/Chicago\`) |
| \`--term\` | One-shot colored \`git status\` via Bun.Terminal |
`;
  printMarkdownHelp(md);
}

function printCount(report: LaneReport): void {
  const { primary, mergedBranches, meta } = report;
  console.info(
    [
      `dirty=${primary.dirtyTotal}`,
      `staged=${primary.stagedFiles.length}`,
      `ahead=${primary.aheadOfOriginMain}`,
      `behind=${primary.behindOriginMain}`,
      `mainAhead=${report.localMain.aheadOfOriginMain}`,
      `mainBehind=${report.localMain.behindOriginMain}`,
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

  if (report.localMain.aheadOfOriginMain > 0 || report.localMain.behindOriginMain > 0) {
    console.info(
      statusLine(
        'local main',
        `ahead=${report.localMain.aheadOfOriginMain} behind=${report.localMain.behindOriginMain}` +
          (report.localMain.aheadOfOriginMain > 0
            ? ` · fix: bun run sync:main  (from main; backs up unpushed tip)`
            : ''),
        report.localMain.aheadOfOriginMain > 0 ? 'fail' : 'warn'
      )
    );
  }

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
        path: fitPath(d.path),
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
          path: fitPath(w.path),
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

  if (meta.tz || meta.nextFire !== undefined) {
    console.info(statusLine('cron', `tz=${meta.tz ?? '-'} next=${meta.nextFire ?? 'null'}`, 'dim'));
  }

  console.info(
    statusLine('scan', `${meta.elapsedLabel} · health=${meta.health}`, healthTone(meta.health))
  );
}

function emitReport(report: LaneReport, opts: LaneCliOpts): void {
  if (opts.jsonl) {
    Bun.write(Bun.stdout, `${JSON.stringify(report)}\n`);
    return;
  }
  if (opts.toml) {
    Bun.write(Bun.stdout, `${Bun.TOML.stringify(report)}\n`);
    return;
  }
  if (opts.json) {
    cliOut(report, { json: true });
    return;
  }
  printHuman(report, opts);
}

export function parseLaneCliOpts(argv: string[]): LaneCliOpts {
  const everyIdx = argv.indexOf('--every');
  const everyArg = everyIdx >= 0 ? argv[everyIdx + 1] : undefined;
  const every = everyArg && !everyArg.startsWith('-') ? everyArg : DEFAULT_WATCH_CRON;

  const tzIdx = argv.indexOf('--tz');
  const tzArg = tzIdx >= 0 ? argv[tzIdx + 1] : undefined;
  const tz = tzArg && !tzArg.startsWith('-') ? tzArg : DEFAULT_TZ;

  return {
    help: argv.includes('--help') || argv.includes('-h'),
    json: argv.includes('--json'),
    jsonl: argv.includes('--jsonl'),
    toml: argv.includes('--toml'),
    watch: argv.includes('--watch'),
    every,
    tz,
    short: argv.includes('--short'),
    count: argv.includes('--count'),
    mergedOnly: argv.includes('--merged'),
    leftRightOnly: argv.includes('--left-right'),
    verbose: argv.includes('--verbose'),
    strict: argv.includes('--strict'),
    term: argv.includes('--term'),
  };
}

function validateModeExclusions(opts: LaneCliOpts): string | null {
  const machine = [opts.json, opts.jsonl, opts.toml].filter(Boolean).length;
  if (machine > 1) return 'use only one of --json, --jsonl, --toml';
  if (opts.watch && opts.json) return '--watch cannot combine with --json (use --jsonl)';
  if (opts.watch && opts.toml) return '--watch cannot combine with --toml';
  if (opts.term && opts.watch) return '--term is one-shot (omit --watch)';
  return null;
}

function failLane(why: string): number {
  return failCli({
    title: 'lane-status',
    gate: 'lane-status',
    why,
    fix: 'bun run lane:status -- --help',
  });
}

function strictExitCode(report: LaneReport): number {
  if (report.meta.health === 'fail') return 1;
  if (report.primary.dirtyTotal > 0) return 1;
  if (report.primary.branch !== 'main') return 1;
  return 0;
}

async function runTermStatus(root: string): Promise<void> {
  const cols = Math.max(40, termWidth());
  const proc = Bun.spawn(['git', '-C', root, 'status'], {
    terminal: {
      cols,
      rows: 24,
      data(_term, data) {
        Bun.write(Bun.stdout, data);
      },
    },
  });
  const code = await proc.exited;
  setExitCode(code === null ? 1 : code);
}

function printWatchBanner(opts: LaneCliOpts, next: string | null): void {
  console.info(
    tones.dim(
      `\nwatch  cron=${JSON.stringify(opts.every)} tz=${opts.tz} next=${next ?? 'null'} · Ctrl-C to stop`
    )
  );
}

async function main(): Promise<number> {
  const rawArgv = Bun.argv.slice(2);
  // Allow -h before long-option guard (guard only knows long flags).
  if (wantsHelp(rawArgv)) {
    printHelp();
    return 0;
  }

  const argv = applyUnknownLongOptionGuardFor('lane:status', rawArgv);
  const opts = parseLaneCliOpts(argv);
  const modeErr = validateModeExclusions(opts);
  if (modeErr) return failLane(modeErr);

  if (opts.help) {
    printHelp();
    return 0;
  }

  const root = git(['rev-parse', '--show-toplevel']);
  if (!root) return failLane('not inside a git work tree');

  if (opts.term) {
    await runTermStatus(root);
    return process.exitCode ?? 0;
  }

  const home = Bun.env.HOME ?? '';
  const watchMeta = opts.watch
    ? { tz: opts.tz, nextFire: nextFireIso(opts.every, opts.tz) }
    : opts.tz !== DEFAULT_TZ
      ? { tz: opts.tz }
      : {};

  const render = async (): Promise<LaneReport> => {
    const next = opts.watch ? nextFireIso(opts.every, opts.tz) : watchMeta.nextFire;
    const report = await collectReport(root, home, {
      ...watchMeta,
      ...(opts.watch ? { nextFire: next } : {}),
    });
    emitReport(report, opts);
    return report;
  };

  const first = await render();

  if (opts.watch) {
    printWatchBanner(opts, first.meta.nextFire ?? null);
    using _job = Bun.cron(
      opts.every,
      async () => {
        const next = nextFireIso(opts.every, opts.tz);
        console.info(
          tones.dim(
            `\n── cron reprint ${new Date().toISOString()} next=${next ?? 'null'} tz=${opts.tz} ──`
          )
        );
        await render();
      },
      { tz: opts.tz }
    );
    await new Promise<void>(() => {});
    return 0;
  }

  return opts.strict ? strictExitCode(first) : 0;
}

if (import.meta.main) {
  setExitCode(await main());
}
