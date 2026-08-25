// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  BUN_PARALLEL_WORKER_ENV_KEYS,
  BUN_TEST_NODE_ENV,
  STAGED_TEST_HANG_RETRIES,
  STAGED_TEST_TIMEOUT_MS_DEFAULT,
  awaitProcessWithTimeout,
  buildStagedTestCommand,
  gitEnv,
  resolveStagedTestTimeoutMs,
  resolveExplicitStagedTests,
  runStagedBunTestWithRetries,
  SCRATCH_LINK_DIRS,
  SCRATCH_PATHSPEC,
  nearestNodeModulesDir,
  shouldSkipStagedTestRun,
  stagedDeletions,
  testRunEnv,
} from '../scripts/bun-test-changed-staged.ts';

function sh(cmd: string[], opts: { cwd?: string; env?: Record<string, string> } = {}) {
  const p = Bun.spawnSync({ cmd, cwd: opts.cwd, env: opts.env, stdout: 'pipe', stderr: 'pipe' });
  if (p.exitCode !== 0) throw new Error(`${cmd[0]}: ${p.stderr.toString().trim()}`);
  return p.stdout.toString();
}

describe('test-changed-staged helpers', () => {
  test('bounds parallel workers by default', () => {
    expect(buildStagedTestCommand(['--bail=1'])).toEqual([
      'bun',
      'test',
      '--changed',
      '--pass-with-no-tests',
      '--parallel=6',
      '--bail=1',
    ]);
  });

  test('--serial and BUN_TEST_SERIAL disable staged worker injection', () => {
    const expected = ['bun', 'test', '--changed', '--pass-with-no-tests', '--bail=1'];
    expect(buildStagedTestCommand(['--serial', '--bail=1'])).toEqual(expected);
    expect(buildStagedTestCommand(['--bail=1'], { BUN_TEST_SERIAL: '1' })).toEqual(expected);
    expect(buildStagedTestCommand(['--bail=1'], { BUN_TEST_SERIAL: 'true' })).toEqual(expected);
  });

  test('keeps wrapper-only flags out of the Bun test command', () => {
    expect(buildStagedTestCommand(['--', '--dry-run', '--serial', '--bail=1'])).toEqual([
      'bun',
      'test',
      '--changed',
      '--pass-with-no-tests',
      '--bail=1',
    ]);
  });

  test('preserves explicit parallel or isolate choices without adding the staged default', () => {
    expect(buildStagedTestCommand(['--parallel=2'])).toEqual([
      'bun',
      'test',
      '--changed',
      '--pass-with-no-tests',
      '--parallel=2',
    ]);
    expect(buildStagedTestCommand(['--isolate'])).toEqual([
      'bun',
      'test',
      '--changed',
      '--pass-with-no-tests',
      '--isolate',
    ]);
  });

  test('scratch path uses --changed=HEAD~1 (ref diff avoids dirty-tree hang)', () => {
    expect(buildStagedTestCommand(['--bail=1'], {}, { changedRef: 'HEAD~1' })).toEqual([
      'bun',
      'test',
      '--changed=HEAD~1',
      '--pass-with-no-tests',
      '--parallel=6',
      '--bail=1',
    ]);
  });

  test('shouldSkipStagedTestRun short-circuits empty and non-code deltas', () => {
    expect(shouldSkipStagedTestRun([])).toEqual({
      skip: true,
      reason: 'empty staged delta',
    });
    expect(shouldSkipStagedTestRun(['docs/README.md', 'AGENTS.md'])).toEqual({
      skip: true,
      reason: 'no code-like files in staged delta',
    });
    expect(shouldSkipStagedTestRun(['tests/harness.ts']).skip).toBe(false);
  });

  test('resolveStagedTestTimeoutMs defaults and validates env override', () => {
    expect(resolveStagedTestTimeoutMs({})).toBe(STAGED_TEST_TIMEOUT_MS_DEFAULT);
    expect(resolveStagedTestTimeoutMs({ STAGED_TEST_TIMEOUT_MS: '120000' })).toBe(120_000);
    expect(() => resolveStagedTestTimeoutMs({ STAGED_TEST_TIMEOUT_MS: '50' })).toThrow(
      />= 1000/
    );
  });

  test('awaitProcessWithTimeout SIGKILLs a wedged child', async () => {
    const proc = Bun.spawn(['sleep', '30'], {
      stdout: 'ignore',
      stderr: 'ignore',
      stdin: 'ignore',
    });
    const result = await awaitProcessWithTimeout(proc, 200, 'fixture sleep');
    expect(result).toEqual({ code: 1, timedOut: true });
    expect(proc.killed || (await proc.exited) !== undefined).toBe(true);
  });

  test('runStagedBunTestWithRetries returns child exit code on success', async () => {
    expect(STAGED_TEST_HANG_RETRIES).toBeGreaterThanOrEqual(2);
    const result = await runStagedBunTestWithRetries({
      command: ['bun', '-e', 'process.exit(0)'],
      cwd: process.cwd(),
      env: testRunEnv(),
      timeoutMs: 5_000,
      label: 'fixture-ok',
      retries: 1,
    });
    expect(result).toEqual({ code: 0, timedOut: false, attempts: 1 });
  });

  test('runStagedBunTestWithRetries exhausts hang retries', async () => {
    const started = Date.now();
    const result = await runStagedBunTestWithRetries({
      command: ['sleep', '30'],
      cwd: process.cwd(),
      env: testRunEnv(),
      timeoutMs: 150,
      label: 'fixture-hang',
      retries: 2,
    });
    expect(result).toEqual({ code: 1, timedOut: true, attempts: 2 });
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(250);
    expect(elapsed).toBeLessThan(3_000);
  });

  test('resolveExplicitStagedTests keeps staged tests and import neighbors', () => {
    const paths = resolveExplicitStagedTests(process.cwd(), [
      'scripts/bun-test-changed-staged.ts',
      'tests/bun-test-changed-staged.test.ts',
      'docs/README.md',
    ]);
    expect(paths).toContain('tests/bun-test-changed-staged.test.ts');
    expect(paths).toContain('tests/pre-commit-runner.test.ts');
    // Comment-only mentions (brand-coverage) must not be selected.
    expect(paths).not.toContain('tests/brand-coverage.test.ts');
  });

  test('buildStagedTestCommand explicit testPaths omit --changed', () => {
    expect(
      buildStagedTestCommand(['--bail=1'], {}, { testPaths: ['tests/a.test.ts'] })
    ).toEqual([
      'bun',
      'test',
      '--pass-with-no-tests',
      '--parallel=6',
      '--bail=1',
      'tests/a.test.ts',
    ]);
  });

  test('reserved CI tests are excluded without leaking the wrapper flag', () => {
    const command = buildStagedTestCommand(['--exclude-ci-reserved', '--bail=1']);
    expect(command).toContain('--path-ignore-patterns');
    expect(command).toContain('node_modules/**');
    expect(command).toContain('tests/harness-ci-deploy.test.ts');
    expect(command).not.toContain('--exclude-ci-reserved');
  });

  test('stagedDeletions parses name-only diff output', () => {
    expect(stagedDeletions('lib/a.ts\nscripts/b.ts\n')).toEqual(['lib/a.ts', 'scripts/b.ts']);
    expect(stagedDeletions('')).toEqual([]);
    expect(stagedDeletions('single.ts')).toEqual(['single.ts']);
  });

  test('Bun hook invokes the staged-scoped runner, not the worktree wrapper', async () => {
    const hook = await Bun.file('.husky/pre-commit').text();
    const runner = await Bun.file('scripts/pre-commit.ts').text();
    expect(hook).toContain('exec bun scripts/pre-commit.ts "$@"');
    expect(runner).toContain("['bun', 'scripts/bun-test-changed-staged.ts', '--bail=1', '--exclude-ci-reserved']");
    expect(runner).not.toContain('bun run test:changed -- --bail=1');
  });

  test('gitEnv strips GIT_INDEX_FILE — scratch git commands stay hermetic', () => {
    const env = gitEnv();
    expect(env.GIT_INDEX_FILE).toBeUndefined();
    for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY']) {
      expect(env[k]).toBeUndefined();
    }
    expect(env.PATH).toBe(Bun.env.PATH); // everything else is preserved
  });

  test('testRunEnv applies Bun-documented test env contract', () => {
    expect(BUN_TEST_NODE_ENV).toBe('test');
    const env = testRunEnv({
      PATH: '/usr/bin',
      NODE_ENV: 'production',
      BUN_OPTIONS: '--hot',
      BUN_TEST_WORKER_ID: 'forged',
      JEST_WORKER_ID: 'forged',
      GIT_INDEX_FILE: '/tmp/evil-index',
      DO_NOT_TRACK: '',
      TMPDIR: '',
    });
    expect(env.NODE_ENV).toBe('test');
    expect(env.BUN_OPTIONS).toBeUndefined();
    expect(env.DO_NOT_TRACK).toBe('1');
    expect(env.TMPDIR.length).toBeGreaterThan(0);
    expect(env.GIT_INDEX_FILE).toBeUndefined();
    for (const key of BUN_PARALLEL_WORKER_ENV_KEYS) {
      expect(env[key]).toBeUndefined();
    }
    expect(env.PATH).toBe('/usr/bin');
  });

  test('scratch repo links heavyweight external trees needed by selected tests', () => {
    expect(SCRATCH_LINK_DIRS).toContain('projects');
    expect(SCRATCH_LINK_DIRS).toContain('Kalshi-bot');
    expect(SCRATCH_LINK_DIRS).toContain('king-zippy-umbra-acre');
    expect(SCRATCH_PATHSPEC).toContain(':(exclude)projects/');
    expect(SCRATCH_PATHSPEC).toContain(':(exclude)Kalshi-bot');
    // Kalshi-bot / Tennis HQ are optional — linker skips when the checkout is
    // absent (dangling symlink → ENOENT in consumers). See buildScratchRepo · #236.
  });

  test('scratch dependency link follows Bun resolution through worktree ancestors', () => {
    const installed = new Set(['/repo/node_modules']);
    expect(nearestNodeModulesDir('/repo/.worktrees/docs', path => installed.has(path))).toBe(
      '/repo/node_modules'
    );
    expect(nearestNodeModulesDir('/isolated/worktree', () => false)).toBeNull();
  });

  test('scratch git add -A never leaks the node_modules symlink into an inherited index', async () => {
    // Partial commits (`git commit -- <paths>`) run hooks with GIT_INDEX_FILE
    // pointing at a temp next-index. The scratch repo's `git add -A` used to
    // inherit it and write the node_modules/projects symlinks (mode 120000)
    // into the parent commit's temp index — whose blobs live in the deleted
    // scratch ODB, so the parent tree build fails with "invalid object 120000
    // … for 'node_modules'". Reproduce that shape and assert the fix isolates.
    const root = `${Bun.env.TMPDIR ?? '/tmp'}/test-changed-hermetic-${Bun.randomUUIDv7()}`;
    const real = `${root}/real`;
    const scratch = `${root}/scratch`;
    const extIndex = `${root}/next-index.lock`;
    try {
      // Real repo with node_modules/ gitignored.
      Bun.spawnSync({ cmd: ['mkdir', '-p', `${real}/node_modules`], stdout: 'pipe' });
      await Bun.write(`${real}/a.txt`, 'a');
      await Bun.write(`${real}/node_modules/x.txt`, 'x');
      await Bun.write(`${real}/.gitignore`, 'node_modules/\n');
      sh(['git', 'init', '-q', '-b', 'main'], { cwd: real });
      sh(['git', 'add', '-A'], { cwd: real });
      sh(['git', '-c', 'user.name=p', '-c', 'user.email=p@l', 'commit', '-qm', 'base'], {
        cwd: real,
      });
      // Simulate git's partial-commit temp next-index (a valid index copy).
      await Bun.write(Bun.file(extIndex), Bun.file(`${real}/.git/index`));
      // Scratch repo with the node_modules symlink (the script's LINK_DIRS).
      Bun.spawnSync({ cmd: ['mkdir', '-p', scratch], stdout: 'pipe' });
      sh(['git', 'init', '-q', '-b', 'main'], { cwd: scratch });
      Bun.spawnSync({
        cmd: ['ln', '-s', `${real}/node_modules`, `${scratch}/node_modules`],
        stdout: 'pipe',
      });
      await Bun.write(`${scratch}/.gitignore`, 'node_modules/\n');

      // The bug: raw env leaks the symlink into the external index.
      const leaky = { ...Bun.env, GIT_INDEX_FILE: extIndex } as Record<string, string>;
      sh(['git', 'add', '-A'], { cwd: scratch, env: leaky });
      const leaked = sh(['git', 'ls-files', '-s'], { cwd: scratch, env: { ...Bun.env, GIT_INDEX_FILE: extIndex } });
      expect(leaked).toContain('120000'); // symlink mode present → pollution reproduced
      expect(leaked).toContain('node_modules');

      // The fix: gitEnv() keeps the external index untouched.
      await Bun.write(Bun.file(extIndex), Bun.file(`${real}/.git/index`)); // reset
      sh(['git', 'add', '-A'], { cwd: scratch, env: gitEnv() });
      const clean = sh(['git', 'ls-files', '-s'], { cwd: scratch, env: { ...Bun.env, GIT_INDEX_FILE: extIndex } });
      expect(clean).not.toContain('120000'); // no symlink leak
      expect(clean).not.toContain('node_modules');
      expect(clean).toContain('a.txt'); // the reset index itself is intact
    } finally {
      Bun.spawnSync({ cmd: ['rm', '-rf', root], stdout: 'pipe' });
    }
  });
});
