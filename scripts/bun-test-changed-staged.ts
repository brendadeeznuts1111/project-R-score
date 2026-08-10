#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --format
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/environment-variables#configuring-bun — TMPDIR · NO_COLOR · BUN_OPTIONS · DO_NOT_TRACK
// @see https://bun.com/docs/test/configuration#environment-variables — .env.test · NODE_ENV=test
// @see https://bun.com/docs/test/configuration — bunfig [test] timeout · preload · pathIgnorePatterns
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — bun test --changed
// @see https://bun.com/docs/test/parallel#isolate — --isolate
// @see https://bun.com/docs/test/parallel#parallel — --parallel
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — BUN_TEST_WORKER_ID
/**
 * Staged-scoped changed-test runner for pre-commit.
 *
 * `bun test --changed` (no ref) selects tests from the whole dirty worktree —
 * so another lane's in-flight failing tests block YOUR commit (the reason
 * SKIP_TEST_CHANGED=1 was needed on every multi-lane commit).
 *
 * This runner builds a scratch repo containing exactly HEAD ∪ the staged
 * delta, commits the overlay, then runs `bun test --changed=HEAD~1` inside
 * it: selection sees only the files this commit actually touches. Foreign
 * worktree dirt is invisible. Dirty-tree `--changed` (no ref) is avoided
 * because Bun 1.3.14 can hang forever on git discovery (defunct `git` child).
 *
 *   bun scripts/bun-test-changed-staged.ts [--bail=1] [--serial] [extra bun test flags]
 *
 * Fallback: if the scratch-repo setup fails for any reason, it warns and
 * runs the legacy worktree `bun test --changed` under the same watchdog so
 * the gate never wedges indefinitely.
 *
 * Child env follows Bun's documented test contract (`NODE_ENV=test`, `TMPDIR`,
 * no forged `BUN_TEST_WORKER_ID` / `JEST_WORKER_ID`) — see `testRunEnv()`.
 */
import { hasCodeLikeChange } from './lib/git-changed.ts';
import { isDirectorySync } from './lib/fs-bun.ts';
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
/** Optional heavyweight trees — skip when absent (no dangling symlinks). */
export const SCRATCH_LINK_DIRS = [
  'node_modules',
  'projects',
  'Kalshi-bot',
  // Tennis HQ is gitignored; link when present so ssot-flow-soft resolves in scratch (#236).
  'king-zippy-umbra-acre',
] as const;
/** Bound worker-process pressure for Argon2/SQLite-heavy changed suites. */
export const STAGED_TEST_PARALLELISM = 6;
/**
 * Process watchdog — Bun 1.3.14 `test --changed` intermittently wedges on a
 * defunct `git` child (no test output). Healthy scratch runs finish in ~3s;
 * keep this tight so retries stay cheap.
 */
export const STAGED_TEST_TIMEOUT_MS_DEFAULT = 45_000;
/** Retries after a watchdog kill before the explicit-test fallback. */
export const STAGED_TEST_HANG_RETRIES = 2;
/** Scratch overlay commits use this message (HEAD~1 = baseline). */
export const STAGED_OVERLAY_COMMIT_MESSAGE = 'staged overlay';

/**
 * Bun-documented test env (set by this runner for child `bun test`).
 * @see https://bun.com/docs/test/configuration#environment-variables
 */
export const BUN_TEST_NODE_ENV = 'test' as const;

/**
 * Env vars Bun sets on `--parallel` workers — never forge; strip if inherited.
 * @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel
 */
export const BUN_PARALLEL_WORKER_ENV_KEYS = ['BUN_TEST_WORKER_ID', 'JEST_WORKER_ID'] as const;

export type StagedTestCommandOptions = {
  /** When set, emit `--changed=<ref>` instead of dirty-tree `--changed`. */
  changedRef?: string;
  /**
   * Explicit test paths (hang fallback). When set, `--changed` is omitted and
   * these paths are appended after flags.
   */
  testPaths?: readonly string[];
};

/** Resolve process watchdog ms (env override for CI/debug). */
export function resolveStagedTestTimeoutMs(
  env: Record<string, string | undefined> = Bun.env
): number {
  const raw = env.STAGED_TEST_TIMEOUT_MS?.trim();
  if (!raw) return STAGED_TEST_TIMEOUT_MS_DEFAULT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1_000) {
    throw new TypeError(
      `STAGED_TEST_TIMEOUT_MS must be >= 1000 milliseconds, got ${JSON.stringify(raw)}`
    );
  }
  return Math.floor(n);
}

/** Build the shared scratch/fallback command while keeping serial mode wrapper-local. */
export function buildStagedTestCommand(
  argv: string[],
  env: Record<string, string | undefined> = {},
  options: StagedTestCommandOptions = {}
): string[] {
  const serial =
    argv.includes('--serial') || env.BUN_TEST_SERIAL === '1' || env.BUN_TEST_SERIAL === 'true';
  const forwarded = argv.filter(arg => arg !== '--' && arg !== '--serial' && arg !== '--dry-run');
  const hasParallel = forwarded.some(arg => arg === '--parallel' || arg.startsWith('--parallel='));
  const hasIsolate = forwarded.includes('--isolate');
  const command = ['bun', 'test'];
  if (!options.testPaths?.length) {
    const changedFlag = options.changedRef ? `--changed=${options.changedRef}` : '--changed';
    command.push(changedFlag);
  }
  command.push('--pass-with-no-tests');

  // Bun workers imply a fresh global per file. Preserve explicit runner choices;
  // otherwise use the bounded staged-gate default.
  if (!serial && !hasParallel && !hasIsolate) {
    command.push(`--parallel=${STAGED_TEST_PARALLELISM}`);
  }

  command.push(...forwarded);
  if (options.testPaths?.length) command.push(...options.testPaths);
  return command;
}

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
 * Child env for `bun test` under the staged/scratch runner.
 *
 * Bun docs:
 * - `NODE_ENV=test` so `bun test` loads `.env.test` and matches `tests/preload.ts`
 *   ([test configuration · environment variables](https://bun.com/docs/test/configuration#environment-variables))
 * - Ensure `TMPDIR` (Bun intermediate assets)
 * - Clear `BUN_OPTIONS` so a parent shell cannot prepend `--hot` / `--inspect`
 * - Default `DO_NOT_TRACK=1` for ephemeral hook runs (no bun.report uploads)
 * - Never forge `BUN_TEST_WORKER_ID` / `JEST_WORKER_ID` (Bun sets these under `--parallel`)
 *
 * Also strips hook `GIT_*` index vars via `gitEnv()`.
 */
export function testRunEnv(
  base: Record<string, string | undefined> = Bun.env
): Record<string, string> {
  const env = Object.fromEntries(
    Object.entries(base).filter(
      ([k, v]) =>
        v !== undefined &&
        !/^GIT_(INDEX_FILE|DIR|WORK_TREE|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES)/.test(
          k
        )
    )
  ) as Record<string, string>;

  env.NODE_ENV = BUN_TEST_NODE_ENV;

  // Hermetic: parent BUN_OPTIONS must not rewrite the bun test argv.
  delete env.BUN_OPTIONS;

  if (!env.DO_NOT_TRACK?.trim()) {
    env.DO_NOT_TRACK = '1';
  }

  if (!env.TMPDIR?.trim()) {
    env.TMPDIR = Bun.env.TMPDIR || Bun.env.TMP || '/tmp';
  }

  for (const key of BUN_PARALLEL_WORKER_ENV_KEYS) {
    delete env[key];
  }

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

/** Staged paths under the scratch pathspec (added/changed/renamed/deleted). */
export function listStagedScratchPaths(): string[] {
  const r = git([
    'diff',
    '--cached',
    '--name-only',
    '--diff-filter=ACMRD',
    '--',
    ...SCRATCH_PATHSPEC,
  ]);
  if (r.code !== 0) throw new Error(`git diff --cached: ${r.err.trim()}`);
  return r.out.toString().split('\n').filter(Boolean);
}

/** Whether the staged runner should skip before building a scratch repo. */
export function shouldSkipStagedTestRun(stagedPaths: string[]): {
  skip: boolean;
  reason?: string;
} {
  if (stagedPaths.length === 0) {
    return { skip: true, reason: 'empty staged delta' };
  }
  if (!hasCodeLikeChange(stagedPaths)) {
    return { skip: true, reason: 'no code-like files in staged delta' };
  }
  return { skip: false };
}

export type TimedProcessResult = {
  code: number;
  timedOut: boolean;
};

/**
 * Wait for a child with a hard timeout. On expiry, SIGKILL the process so a
 * wedged Bun `--changed` git child cannot block pre-commit forever.
 */
export async function awaitProcessWithTimeout(
  proc: ReturnType<typeof Bun.spawn>,
  timeoutMs: number,
  label: string
): Promise<TimedProcessResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const code = await Promise.race([
      proc.exited.then(exit => exit ?? 1),
      new Promise<number>((_resolve, reject) => {
        timer = setTimeout(() => {
          try {
            proc.kill(9);
          } catch {
            // already exited
          }
          reject(
            new Error(
              `${label} exceeded ${timeoutMs}ms (likely Bun test --changed git hang). ` +
                `Will retry; if retries exhaust: BUN_TEST_SERIAL=1, raise ` +
                `STAGED_TEST_TIMEOUT_MS, or SKIP_TEST_CHANGED=1 with reason + local proof.`
            )
          );
        }, timeoutMs);
      }),
    ]);
    return { code, timedOut: false };
  } catch (e) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    return { code: 1, timedOut: true };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export type StagedBunTestRunResult = TimedProcessResult & { attempts: number };

/** Spawn bun test in scratch/fallback with hang retries. */
export async function runStagedBunTestWithRetries(options: {
  command: string[];
  cwd: string;
  env: Record<string, string | undefined>;
  timeoutMs: number;
  label: string;
  retries?: number;
}): Promise<StagedBunTestRunResult> {
  const retries = options.retries ?? STAGED_TEST_HANG_RETRIES;
  let last: TimedProcessResult = { code: 1, timedOut: false };
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const proc = Bun.spawn(options.command, {
      cwd: options.cwd,
      stdout: 'inherit',
      stderr: 'inherit',
      // Closed/non-TTY hook stdin + inherit has wedged Bun test in cloud agents.
      stdin: 'ignore',
      env: options.env,
    });
    last = await awaitProcessWithTimeout(
      proc,
      options.timeoutMs,
      `${options.label} (attempt ${attempt}/${retries})`
    );
    if (!last.timedOut) return { ...last, attempts: attempt };
    if (attempt < retries) {
      console.warn(`⚠️  ${options.label} hung on attempt ${attempt}/${retries}; retrying…`);
    }
  }
  console.error(
    `❌ ${options.label} hung after ${retries} attempts — trying explicit-test fallback.`
  );
  return { code: 1, timedOut: true, attempts: retries };
}

/**
 * Hang fallback when Bun `--changed` never finishes discovery: staged test
 * files, conventional `tests/<stem>.test.ts`, plus tests that import the
 * changed module (import/require only — not prose comments).
 */
export function resolveExplicitStagedTests(cwd: string, changedPaths: readonly string[]): string[] {
  const out = new Set<string>();
  for (const f of changedPaths) {
    if (/\.(test|spec)\.tsx?$/.test(f)) out.add(f);
  }
  for (const f of changedPaths) {
    if (/\.(test|spec)\.tsx?$/.test(f)) continue;
    if (!/\.(tsx?|jsx?|mjs|cjs)$/.test(f)) continue;
    const stem = f
      .split('/')
      .pop()
      ?.replace(/\.(tsx?|jsx?|mjs|cjs)$/, '');
    if (!stem || stem.length < 4) continue;

    for (const cand of [`tests/${stem}.test.ts`, `tests/${stem}.spec.ts`]) {
      const exists = Bun.spawnSync({
        cmd: ['test', '-f', `${cwd}/${cand}`],
        stdout: 'ignore',
        stderr: 'ignore',
      });
      if (exists.exitCode === 0) out.add(cand);
    }

    // Import/require only — avoids comment hits (e.g. brand-coverage prose).
    const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const importRe = `(from\\s+['"][^'"]*${escaped}|import\\(\\s*['"][^'"]*${escaped}|require\\(\\s*['"][^'"]*${escaped})`;
    const rg = Bun.spawnSync({
      cmd: [
        'rg',
        '-l',
        '--glob',
        '*.test.ts',
        '--glob',
        '*.spec.ts',
        '--glob',
        '!**/node_modules/**',
        '-e',
        importRe,
        'tests',
      ],
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    if (rg.exitCode !== 0 && rg.exitCode !== 1) continue;
    for (const hit of rg.stdout.toString().split('\n').filter(Boolean)) {
      out.add(hit);
    }
  }
  return [...out].sort().slice(0, 40);
}

/** `git diff --name-only HEAD~1..HEAD` inside the scratch overlay repo. */
export function listOverlayChangedPaths(cwd: string): string[] {
  const r = git(['diff', '--name-only', 'HEAD~1..HEAD'], { cwd });
  if (r.code !== 0) throw new Error(`git diff overlay: ${r.err.trim()}`);
  return r.out.toString().split('\n').filter(Boolean);
}

export type ScratchBuildResult = {
  /** False when staged overlay matches baseline (nothing for --changed=HEAD~1). */
  hasDelta: boolean;
};

async function buildScratchRepo(tmp: string): Promise<ScratchBuildResult> {
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
  // Skip absent optional checkouts (e.g. uninitialized Kalshi-bot submodule) —
  // a dangling symlink makes Bun.file look present then fail with ENOENT.
  for (const d of SCRATCH_LINK_DIRS) {
    const source = `${ROOT}/${d}`;
    if (!isDirectorySync(source)) {
      continue;
    }
    const ln = Bun.spawnSync({
      cmd: ['ln', '-s', source, `${tmp}/${d}`],
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

  // 4. Point origin/main at the baseline before overlaying — bun --changed and
  //    git-dependent tests (gitShowText 'origin/main:…') need a shared history.
  const ref = git(['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: tmp });
  if (ref.code !== 0) throw new Error(`update-ref: ${ref.err.trim()}`);

  // 5. Overlay the staged (index) content — this is the only delta.
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

  // 6. Staged deletions must disappear from the scratch tree.
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

  // 6b. Make the overlaid snapshot visible to git-backed inventory tools.
  // `checkout-index` updates only the scratch worktree; without this add,
  // `git ls-files` omits staged additions such as new branded-ID consumers,
  // so bake checks see a different source set than the commit being tested.
  const addOverlay = git(['add', '-A'], { cwd: tmp });
  if (addOverlay.code !== 0) throw new Error(`git add overlay: ${addOverlay.err.trim()}`);

  // 7. Untracked NON-test fixtures tests need (committed fixtures stay in
  //    archive). Skip untracked *.test.ts — other lanes' in-flight dirt.
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

  // 7b. Re-add after untracked copies so the overlay commit includes them.
  const addUntracked = git(['add', '-A'], { cwd: tmp });
  if (addUntracked.code !== 0) throw new Error(`git add untracked: ${addUntracked.err.trim()}`);

  // 8. projects/ is symlinked (LINK_DIRS), so `git ls-files -- projects`
  //    inside scratch returns nothing. Export the real index's projects paths
  //    for tools that enumerate them (brand-coverage adoption scan, consumed
  //    via KIMI_STAGED_PROJECTS_LS_FILES); content is read through the
  //    symlink — the accepted LINK_DIRS worktree-content leak.
  const proj = git(['ls-files', '-z', '--', 'projects']);
  if (proj.code !== 0) throw new Error(`git ls-files projects: ${proj.err.trim()}`);
  await Bun.write(`${tmp}/.staged-projects-ls-files`, proj.out);

  // 9. Commit the overlay so Bun can use `--changed=HEAD~1` (ref diff) instead
  //    of dirty-tree `--changed`, which hangs on a defunct git child in Bun 1.3.14.
  const porcelain = git(['status', '--porcelain'], { cwd: tmp });
  if (porcelain.code !== 0) throw new Error(`git status: ${porcelain.err.trim()}`);
  if (!porcelain.out.toString().trim()) {
    return { hasDelta: false };
  }

  const overlay = git(
    [
      '-c',
      'user.name=pre-commit',
      '-c',
      'user.email=pre-commit@local',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-qm',
      STAGED_OVERLAY_COMMIT_MESSAGE,
    ],
    { cwd: tmp }
  );
  if (overlay.code !== 0) throw new Error(`git commit overlay: ${overlay.err.trim()}`);
  return { hasDelta: true };
}

async function main(): Promise<number> {
  const timeoutMs = resolveStagedTestTimeoutMs(Bun.env);
  const scratchCommand = buildStagedTestCommand(Bun.argv.slice(2), Bun.env, {
    changedRef: 'HEAD~1',
  });
  const legacyCommand = buildStagedTestCommand(Bun.argv.slice(2), Bun.env);

  if (Bun.argv.includes('--dry-run')) {
    console.info(
      `[dry-run] test-changed-staged: would run ${scratchCommand.join(' ')} ` +
        `in a HEAD ∪ staged scratch repo (timeout ${timeoutMs}ms)`
    );
    return 0;
  }

  const stagedPaths = listStagedScratchPaths();
  const skip = shouldSkipStagedTestRun(stagedPaths);
  if (skip.skip) {
    console.info(`✓ test-changed-staged — skip (${skip.reason})`);
    return 0;
  }

  const tmp = `${tempRoot()}/test-staged-${Bun.randomUUIDv7()}`;
  await Bun.write(`${tmp}/.bun-keep`, '');
  let scratch: ScratchBuildResult;
  try {
    scratch = await buildScratchRepo(tmp);
  } catch (e) {
    console.warn(
      `⚠️  staged scratch repo failed (${e instanceof Error ? e.message : e}); ` +
        `falling back to worktree bun test --changed`
    );
    removeIndexTreeSync(tmp);
    const legacy = await runStagedBunTestWithRetries({
      command: legacyCommand,
      cwd: ROOT,
      env: testRunEnv(),
      timeoutMs,
      label: 'fallback bun test --changed',
    });
    return legacy.code;
  }

  try {
    if (!scratch.hasDelta) {
      console.info('✓ test-changed-staged — skip (staged overlay matches baseline HEAD)');
      return 0;
    }
    const env = {
      ...testRunEnv(),
      // brand-coverage projects/ enumeration (see buildScratchRepo 8).
      KIMI_STAGED_PROJECTS_LS_FILES: `${tmp}/.staged-projects-ls-files`,
    };
    const primary = await runStagedBunTestWithRetries({
      command: scratchCommand,
      cwd: tmp,
      env,
      timeoutMs,
      label: 'staged bun test --changed=HEAD~1',
    });
    if (!primary.timedOut) return primary.code;

    const changed = listOverlayChangedPaths(tmp);
    const explicit = resolveExplicitStagedTests(tmp, changed);
    if (explicit.length === 0) {
      console.error(
        '❌ Bun --changed hung and no explicit staged tests were recoverable. ' +
          'SKIP_TEST_CHANGED=1 with reason + local proof, or raise STAGED_TEST_TIMEOUT_MS.'
      );
      return 1;
    }
    console.warn(
      `⚠️  falling back to explicit staged tests (${explicit.length}): ${explicit.join(' ')}`
    );
    const fallbackCmd = buildStagedTestCommand(Bun.argv.slice(2), Bun.env, {
      testPaths: explicit,
    });
    const secondary = await runStagedBunTestWithRetries({
      command: fallbackCmd,
      cwd: tmp,
      env,
      timeoutMs,
      label: 'staged bun test (explicit paths)',
      retries: 2,
    });
    return secondary.code;
  } finally {
    removeIndexTreeSync(tmp);
  }
}

if (import.meta.main) {
  process.exit(await main());
}
