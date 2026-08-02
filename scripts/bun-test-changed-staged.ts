#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --format
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — bun test --changed
/**
 * Staged-scoped changed-test runner for pre-commit.
 *
 * `bun test --changed` (no ref) selects tests from the whole dirty worktree —
 * so another lane's in-flight failing tests block YOUR commit (the reason
 * SKIP_TEST_CHANGED=1 was needed on every multi-lane commit).
 *
 * This runner builds a scratch repo containing exactly HEAD ∪ the staged
 * delta, then runs `bun test --changed` inside it: selection sees only the
 * files this commit actually touches. Foreign worktree dirt is invisible.
 *
 *   bun scripts/test-changed-staged.ts [--bail=1] [--serial] [extra bun test flags]
 *
 * Fallback: if the scratch-repo setup fails for any reason, it warns and
 * runs the legacy worktree `bun test --changed` so the gate never wedges.
 */
import { removeIndexTreeSync } from './lib/index-tree.ts';

const ROOT = process.cwd();
/**
 * Sync scope: every tracked path EXCEPT projects/ (8.2k files / 1.8G of
 * nested products — symlinked instead). Tests reference tsconfigs, bun.lock,
 * packages/, docs/, public/, guides… — a whitelist whack-a-mole, so the
 * scratch repo mirrors the full tracked tree minus the one heavy dir.
 */
const PATHSPEC = ['.', ':(exclude)projects/'];
/**
 * Symlinked instead of copied — too big to materialize per commit. Trade-off:
 * a staged change inside a linked dir is seen as its WORKTREE content (a
 * narrow foreign-dirt leak, accepted for projects/ which main-repo commits
 * rarely stage; node_modules content never counts as "changed" anyway).
 */
const LINK_DIRS = ['node_modules', 'projects'];
const forwarded = Bun.argv.slice(2).filter(a => a !== '--');

function tempRoot(): string {
  return Bun.env.TMPDIR || Bun.env.TMP || '/tmp';
}

function git(args: string[], opts: { cwd?: string; stdin?: Buffer } = {}) {
  const proc = Bun.spawnSync({
    cmd: ['git', ...args],
    cwd: opts.cwd ?? ROOT,
    stdin: opts.stdin,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return { code: proc.exitCode, out: proc.stdout, err: proc.stderr.toString() };
}

/** Staged deletions (index no longer carries these — remove from scratch). */
export function stagedDeletions(diffOutput: string): string[] {
  return diffOutput.split('\n').filter(Boolean);
}

async function buildScratchRepo(tmp: string): Promise<void> {
  // 1. Baseline: HEAD content of the full tracked tree minus projects/.
  const archive = git(['archive', '--format=tar', 'HEAD', '--', ...PATHSPEC]);
  if (archive.code !== 0) throw new Error(`git archive: ${archive.err.trim()}`);
  const tar = Bun.spawnSync({
    cmd: ['tar', '-x', '--exclude', 'projects', '-C', tmp],
    stdin: archive.out,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (tar.exitCode !== 0) throw new Error(`tar extract: ${tar.stderr.toString().trim()}`);

  // 2. Big dirs link so test imports resolve (tracked → not "changed").
  for (const d of LINK_DIRS) {
    const ln = Bun.spawnSync({
      cmd: ['ln', '-s', `${ROOT}/${d}`, `${tmp}/${d}`],
      stdout: 'pipe',
      stderr: 'pipe',
    });
    if (ln.exitCode !== 0) throw new Error(`${d} link failed`);
  }

  // 3. Scratch git repo with the baseline committed.
  for (const step of [
    ['init', '-q', '-b', 'main'],
    ['add', '-A'],
    [
      '-c',
      'user.name=pre-commit',
      '-c',
      'user.email=pre-commit@local',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-qm',
      'baseline HEAD',
    ],
  ] as const) {
    const r = git([...step], { cwd: tmp });
    if (r.code !== 0) throw new Error(`git ${step[0]}: ${r.err.trim()}`);
  }

  // 4. Overlay the staged (index) content — this is the only delta.
  const ls = git(['ls-files', '-z', '--', ...PATHSPEC]);
  if (ls.code !== 0) throw new Error(`git ls-files: ${ls.err.trim()}`);
  const co = Bun.spawnSync({
    cmd: ['git', 'checkout-index', '-f', '-z', '--stdin', `--prefix=${tmp}/`],
    cwd: ROOT,
    stdin: ls.out,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (co.exitCode !== 0) {
    throw new Error(`git checkout-index: ${co.stderr.toString().trim()}`);
  }

  // 5. Staged deletions must disappear from the scratch tree.
  const del = git(['diff', '--cached', '--name-only', '--diff-filter=D', '--', ...PATHSPEC]);
  for (const f of stagedDeletions(del.out.toString())) {
    Bun.spawnSync({ cmd: ['rm', '-f', `${tmp}/${f}`], stdout: 'pipe', stderr: 'pipe' });
  }

  // 6. Environment files tests need but git doesn't track (generated configs
  //    like tests/tsconfig.snapshot.json). Copy untracked NON-test files only:
  //    untracked *.test.ts are other lanes' in-flight work — the exact dirt
  //    this runner exists to exclude.
  const others = git(['ls-files', '--others', '--exclude-standard', '-z']);
  for (const f of others.out.toString().split('\0')) {
    // Skip dirs (collapsed untracked dirs end in '/'), nested worktrees, and
    // other lanes' untracked test files — the dirt this runner exists to exclude.
    if (!f || f.endsWith('/') || f.endsWith('.test.ts') || f.startsWith('.codex-worktrees/')) {
      continue;
    }
    // Paths under a symlinked dir are already visible through the link —
    // copying them would write into the REAL dir (cp source → itself).
    if (LINK_DIRS.some(d => f === d || f.startsWith(`${d}/`))) continue;
    const src = Bun.spawnSync({
      cmd: ['bash', '-c', `mkdir -p "${tmp}/$(dirname "$1")" && cp "$1" "${tmp}/$1"`, '_', f],
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    if (src.exitCode !== 0) throw new Error(`copy untracked ${f} failed`);
  }

  // 7. Point origin/main at the baseline commit. bun --changed resolves
  //    origin/main as its diff base — if it pointed at the REAL main (no
  //    shared history with the fresh scratch repo) every file would count
  //    as changed. Baseline = HEAD content, which is also what git-dependent
  //    tests (gitShowText 'origin/main:…') should see. All objects are local
  //    (hashed during the baseline add) — no alternates or ref copying needed.
  const ref = git(['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: tmp });
  if (ref.code !== 0) throw new Error(`update-ref: ${ref.err.trim()}`);
}

async function main(): Promise<number> {
  if (Bun.argv.includes('--dry-run')) {
    console.info(
      '[dry-run] test-changed-staged: would run bun test --changed in a HEAD ∪ staged scratch repo'
    );
    return 0;
  }
  const tmp = `${tempRoot()}/test-staged-${Bun.randomUUIDv7()}`;
  await Bun.write(`${tmp}/.bun-keep`, '');
  try {
    await buildScratchRepo(tmp);
  } catch (e) {
    console.warn(
      `⚠️  staged scratch repo failed (${e instanceof Error ? e.message : e}); ` +
        `falling back to worktree bun test --changed`
    );
    removeIndexTreeSync(tmp);
    const legacy = Bun.spawn(['bun', 'test', '--changed', '--pass-with-no-tests', ...forwarded], {
      cwd: ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });
    return (await legacy.exited) ?? 1;
  }

  try {
    const proc = Bun.spawn(
      ['bun', 'test', '--changed', '--pass-with-no-tests', '--parallel', ...forwarded],
      { cwd: tmp, stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' }
    );
    return (await proc.exited) ?? 1;
  } finally {
    removeIndexTreeSync(tmp);
  }
}

if (import.meta.main) {
  process.exit(await main());
}
