#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --format
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * lane-status.ts — read-only lane / worktree / branch / bake-drift reporter.
 *
 * Answers, in one shot: is the primary checkout clean and on main, which
 * worktrees are stale, which branches are merged-but-undeleted, and whether
 * dirty `public/registry/**` bakes are drifting from the deployed state.
 *
 *   bun run lane:status           # tables
 *   bun run lane:status -- --json # machine output
 *
 * Read-only: spawns git status/log/branch only, never mutates.
 * Policy: docs AGENTS.md → "Primary checkout & lane hygiene".
 */

import { jsonOut, logTable } from '../lib/console-depth.ts';
import { parseGitStatusPorcelain, type GitStatusEntry } from '../scripts/lib/git-porcelain.ts';

export {};

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('lane:status', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const JSON_MODE = argv.includes('--json');
const STALE_HOURS = 48;

async function git(
  args: string[],
  cwd?: string,
  preserveLeadingWhitespace = false
): Promise<string> {
  const proc = Bun.spawn(['git', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const out = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) return '';
  return preserveLeadingWhitespace ? out.trimEnd() : out.trim();
}
const ROOT = await git(['rev-parse', '--show-toplevel']);
if (!ROOT) {
  console.error('lane-status: not inside a git work tree');
  process.exit(1);
}
const HOME = Bun.env.HOME ?? '';
const shortPath = (p: string) => (HOME && p.startsWith(HOME) ? `~${p.slice(HOME.length)}` : p);

function areaOf(path: string): string {
  if (path.startsWith('public/registry/')) return 'registry';
  if (path.startsWith('public/portal/') || path.startsWith('public/monitoring/')) return 'portal';
  if (path.startsWith('lib/')) return 'lib';
  if (path.startsWith('docs/')) return 'docs';
  if (path.startsWith('tests/')) return 'tests';
  if (path.startsWith('tools/') || path.startsWith('scripts/')) return 'tooling';
  return 'other';
}

async function dirtyEntries(cwd: string): Promise<GitStatusEntry[]> {
  const out = await git(['status', '--porcelain=v1'], cwd, true);
  return parseGitStatusPorcelain(out);
}

// ── Primary checkout ────────────────────────────────────────────────────────
const branch = await git(['branch', '--show-current'], ROOT);
const headShort = await git(['rev-parse', '--short', 'HEAD'], ROOT);
const counts = (
  await git(['rev-list', '--left-right', '--count', 'HEAD...origin/main'], ROOT)
).split(/\s+/);
const ahead = Number(counts[0] ?? 0);
const behind = Number(counts[1] ?? 0);

const primaryDirty = await dirtyEntries(ROOT);
const byArea: Record<string, number> = {};
for (const d of primaryDirty) {
  const area = areaOf(d.path);
  byArea[area] = (byArea[area] ?? 0) + 1;
}
const staged = primaryDirty.filter(d => d.code[0] !== ' ' && d.code[0] !== '?');
const bakeDrift = primaryDirty.filter(d => d.path.startsWith('public/registry/'));

// ── Worktrees ───────────────────────────────────────────────────────────────
const porcelain = await git(['worktree', 'list', '--porcelain'], ROOT);
interface WorktreeRow {
  path: string;
  branch: string;
  dirty: number;
  ageHours: number;
  flag: string;
}
const worktrees: WorktreeRow[] = [];
const worktreeBranches = new Set<string>();
for (const block of porcelain.split('\n\n')) {
  const wtPath = block.match(/^worktree (.+)$/m)?.[1];
  if (!wtPath) continue;
  const wtBranch = block.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? '(detached)';
  if (wtBranch !== '(detached)') worktreeBranches.add(wtBranch);
  const entries = await dirtyEntries(wtPath);
  const commitUnix = Number(await git(['log', '-1', '--format=%ct'], wtPath));
  const ageHours = commitUnix ? Math.floor((Date.now() / 1000 - commitUnix) / 3600) : -1;
  const stale = entries.length === 0 && ageHours > STALE_HOURS;
  worktrees.push({
    path: wtPath,
    branch: wtBranch,
    dirty: entries.length,
    ageHours,
    flag: stale ? 'STALE' : entries.length > 0 ? 'dirty' : '',
  });
}
worktrees.sort((a, b) => b.ageHours - a.ageHours);

// ── Merged branches ─────────────────────────────────────────────────────────
const mergedRaw = await git(
  ['branch', '--merged', 'origin/main', '--format=%(refname:short)'],
  ROOT
);
const merged = mergedRaw
  ? mergedRaw
      .split('\n')
      .filter(Boolean)
      .filter(
        b =>
          b !== 'main' && b !== branch && !b.startsWith('quarantine/') && !worktreeBranches.has(b)
      )
  : [];

// ── Report ──────────────────────────────────────────────────────────────────
const report = {
  primary: {
    path: ROOT,
    branch,
    head: headShort,
    aheadOfOriginMain: ahead,
    behindOriginMain: behind,
    dirtyTotal: primaryDirty.length,
    dirtyByArea: byArea,
    stagedFiles: staged.map(s => s.path),
    bakeDriftFiles: bakeDrift.map(b => b.path),
  },
  worktrees: worktrees.map(w => ({ ...w, path: shortPath(w.path) })),
  mergedBranches: merged,
};

if (JSON_MODE) {
  jsonOut(report);
  process.exit(0);
}

console.info('== primary ==');
logTable([
  {
    branch,
    head: headShort,
    ahead,
    behind,
    dirty: primaryDirty.length,
    staged: staged.length,
    areas:
      Object.entries(byArea)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ') || '-',
  },
]);
if (staged.length > 0) {
  console.info(`staged: ${staged.map(s => s.path).join(', ')}`);
}
if (bakeDrift.length > 0) {
  console.info(
    `bake drift: ${bakeDrift.length} dirty public/registry/** — commit as chore(bake) or git restore`
  );
}

console.info('\n== worktrees (oldest first) ==');
logTable(
  worktrees.map(w => ({
    branch: w.branch,
    dirty: w.dirty,
    ageH: w.ageHours,
    flag: w.flag,
    path: shortPath(w.path),
  }))
);

console.info(`\n== branches merged into origin/main (removable): ${merged.length} ==`);
if (merged.length > 0) console.info(merged.join(', '));
