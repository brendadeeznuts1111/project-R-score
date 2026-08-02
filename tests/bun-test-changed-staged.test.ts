// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { gitEnv, stagedDeletions, testRunEnv } from '../scripts/bun-test-changed-staged.ts';

function sh(cmd: string[], opts: { cwd?: string; env?: Record<string, string> } = {}) {
  const p = Bun.spawnSync({ cmd, cwd: opts.cwd, env: opts.env, stdout: 'pipe', stderr: 'pipe' });
  if (p.exitCode !== 0) throw new Error(`${cmd[0]}: ${p.stderr.toString().trim()}`);
  return p.stdout.toString();
}

describe('test-changed-staged helpers', () => {
  test('stagedDeletions parses name-only diff output', () => {
    expect(stagedDeletions('lib/a.ts\nscripts/b.ts\n')).toEqual(['lib/a.ts', 'scripts/b.ts']);
    expect(stagedDeletions('')).toEqual([]);
    expect(stagedDeletions('single.ts')).toEqual(['single.ts']);
  });

  test('hook invokes the staged-scoped runner, not the worktree wrapper', async () => {
    const hook = await Bun.file('.husky/pre-commit').text();
    expect(hook).toContain('bun scripts/bun-test-changed-staged.ts --bail=1');
    expect(hook).not.toContain('bun run test:changed -- --bail=1');
  });

  test('gitEnv strips GIT_INDEX_FILE — scratch git commands stay hermetic', () => {
    const env = gitEnv();
    expect(env.GIT_INDEX_FILE).toBeUndefined();
    for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY']) {
      expect(env[k]).toBeUndefined();
    }
    expect(env.PATH).toBe(Bun.env.PATH); // everything else is preserved
  });

  test('testRunEnv also strips NODE_ENV — tests run in dev semantics', () => {
    const env = testRunEnv();
    expect(env.NODE_ENV).toBeUndefined();
    expect(env.GIT_INDEX_FILE).toBeUndefined();
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
