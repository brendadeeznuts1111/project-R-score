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
 * Sync scope: every tracked path except heavyweight external trees. Tests
 * reference tsconfigs, bun.lock, packages/, docs/, public/, guides… — a
 * whitelist whack-a-mole, so the scratch repo mirrors the full tracked tree
 * and links the excluded trees from the real checkout.
 */
export const SCRATCH_PATHSPEC = ['.', ':(exclude)projects/', ':(exclude)Kalshi-bot'] as const;
/**
 * Symlinked instead of copied — too big to materialize per commit. Trade-off:
 * a staged change inside a linked dir is seen as its WORKTREE content (a
 * narrow foreign-dirt leak, accepted for projects/ which main-repo commits
 * rarely stage and Kalshi-bot's canonical glossary fixture. node_modules
 * content never counts as "changed" anyway.
 */
export const SCRATCH_LINK_DIRS = ['node_modules', 'projects', 'Kalshi-bot'] as const;
const forwarded = Bun.argv.slice(2).filter(a => a !== '--');

/**
 * Hermetic git env: partial commits (`git commit -- <paths>`) run hooks with
 * `GIT_INDEX_FILE` pointing at a temp next-index, and every git subprocess
 * here would inherit it — the scratch repo's `git add -A` would then write
 * its entries (incl. the node_modules/projects symlinks) into the parent
 * commit's temp index, whose blobs live in the soon-deleted scratch ODB and
 * break the parent tree build ("invalid object 120000 … for 'node_modules'").
 * Strip all GIT_* index/dir vars so each command uses the repo at its cwd.
 */
export function gitEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(Bun.env).filter(
      ([k]) =>
        !/^GIT_(INDEX_FILE|DIR|WORK_TREE|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES)/.test(
          k
        )
    )
  );
}

/**
 * Test-run env: gitEnv() minus NODE_ENV. Bun loads the repo .env (which sets
 * NODE_ENV=production) into the hook process, and the scratch test runner
 * inherited it — tests that fail-closed in production (e.g. the
 * PARTNER_VAULT_MASTER_KEY policy in lib/security/partner-vault.ts) then
 * broke in the scratch run while passing locally with the dev fallback.
 * Tests always run in dev semantics; deployment env is never inherited.
 */
export function testRunEnv(): Record<string, string> {
  const env = gitEnv();
  delete env.NODE_ENV;
  return env;
}

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
    env: gitEnv(),
  });
  return { code: proc.exitCode, out: proc.stdout, err: proc.stderr.toString() };
}

/** Staged deletions (index no longer carries these — remove from scratch). */
export function stagedDeletions(diffOutput: string): string[] {
  return diffOutput.split('\n').filter(Boolean);
}

async function buildScratchRepo(tmp: string): Promise<void> {
  // 1. Baseline: HEAD content of the full tracked tree minus projects/.
  const archive = git(['archive', '--format=tar', 'HEAD', '--', ...SCRATCH_PATHSPEC]);
  if (archive.code !== 0) throw new Error(`git archive: ${archive.err.trim()}`);
  const tar = Bun.spawnSync({
    cmd: ['tar', '-x', '--exclude', 'projects', '-C', tmp],
    stdin: archive.out,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (tar.exitCode !== 0) throw new Error(`tar extract: ${tar.stderr.toString().trim()}`);

  // 2. Big dirs link so test imports resolve (tracked → not "changed").
  for (const d of SCRATCH_LINK_DIRS) {
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
  const ls = git(['ls-files', '-z', '--', ...SCRATCH_PATHSPEC]);
  if (ls.code !== 0) throw new Error(`git ls-files: ${ls.err.trim()}`);
  const co = Bun.spawnSync({
    cmd: ['git', 'checkout-index', '-f', '-z', '--stdin', `--prefix=${tmp}/`],
    cwd: ROOT,
    stdin: ls.out,
    stdout: 'pipe',
    stderr: 'pipe',
    env: gitEnv(),
  });
  if (co.exitCode !== 0) {
    throw new Error(`git checkout-index: ${co.stderr.toString().trim()}`);
  }

  // 5. Staged deletions must disappear from the scratch tree.
  const del = git([
    'diff',
    '--cached',
    '--name-only',
    '--diff-filter=D',
    '--',
    ...SCRATCH_PATHSPEC,
  ]);
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
    if (SCRATCH_LINK_DIRS.some(d => f === d || f.startsWith(`${d}/`))) continue;
    const src = Bun.spawnSync({
      cmd: ['bash', '-c', `mkdir -p "${tmp}/$(dirname "$1")" && cp "$1" "${tmp}/$1"`, '_', f],
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    if (src.exitCode !== 0) throw new Error(`copy untracked ${f} failed`);
  }

  // 6b. projects/ is symlinked (LINK_DIRS), so `git ls-files -- projects`
  //    inside scratch returns nothing. Export the real index's projects paths
  //    for tools that enumerate them (brand-coverage adoption scan, consumed
  //    via KIMI_STAGED_PROJECTS_LS_FILES); content is read through the
  //    symlink — the accepted LINK_DIRS worktree-content leak.
  const proj = git(['ls-files', '-z', '--', 'projects']);
  if (proj.code !== 0) throw new Error(`git ls-files projects: ${proj.err.trim()}`);
  await Bun.write(`${tmp}/.staged-projects-ls-files`, proj.out);

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
      env: testRunEnv(),
    });
    return (await legacy.exited) ?? 1;
  }

  try {
    const proc = Bun.spawn(
      ['bun', 'test', '--changed', '--pass-with-no-tests', '--parallel', ...forwarded],
      {
        cwd: tmp,
        stdout: 'inherit',
        stderr: 'inherit',
        stdin: 'inherit',
        env: {
          ...testRunEnv(),
          // brand-coverage projects/ enumeration (see buildScratchRepo 6b).
          KIMI_STAGED_PROJECTS_LS_FILES: `${tmp}/.staged-projects-ls-files`,
        },
      }
    );
    return (await proc.exited) ?? 1;
  } finally {
    removeIndexTreeSync(tmp);
  }
}

if (import.meta.main) {
  process.exit(await main());
}
