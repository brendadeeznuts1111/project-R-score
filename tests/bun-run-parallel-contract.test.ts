// @see https://bun.com/docs/pm/filter#parallel-and-sequential-mode — bun run --parallel
import { afterAll, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = mkdtempSync(join(tmpdir(), 'bun-run-parallel-'));

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

writeFileSync(
  join(root, 'package.json'),
  JSON.stringify({
    name: 'bun-run-parallel-contract',
    private: true,
    workspaces: ['packages/*'],
    scripts: {
      'prebuild:a': `bun -e 'console.log("pre-alpha")'`,
      'build:a': `bun -e 'console.log("alpha")'`,
      'postbuild:a': `bun -e 'console.log("post-alpha")'`,
      'build:b': `bun -e 'console.log("beta")'`,
      fail: `bun -e 'process.exit(7)'`,
      after: `bun -e 'console.log("after-failure")'`,
    },
  })
);

for (const name of ['workspace-a', 'workspace-b']) {
  const dir = join(root, 'packages', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name,
      private: true,
      scripts: { check: `bun -e 'console.log("${name}-ok")'` },
    })
  );
}

function run(...args: string[]) {
  return Bun.spawnSync([process.execPath, 'run', ...args], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  });
}

function output(proc: ReturnType<typeof run>): string {
  return `${proc.stdout.toString()}\n${proc.stderr.toString()}`;
}

describe('bun run multi-script orchestration', () => {
  test('--parallel expands script globs and prefixes both outputs', () => {
    const proc = run('--parallel', 'build:*');
    const text = output(proc);
    expect(proc.exitCode).toBe(0);
    expect(text).toContain('build:a');
    expect(text).toContain('alpha');
    expect(text).toContain('build:b');
    expect(text).toContain('beta');
    const preAt = text.indexOf('pre-alpha');
    const mainAt = text.indexOf('| alpha');
    const postAt = text.indexOf('post-alpha');
    expect(preAt).toBeGreaterThanOrEqual(0);
    expect(mainAt).toBeGreaterThan(preAt);
    expect(postAt).toBeGreaterThan(mainAt);
  });

  test('--sequential preserves requested script order', () => {
    const proc = run('--sequential', 'build:b', 'build:a');
    const text = output(proc);
    expect(proc.exitCode).toBe(0);
    expect(text.indexOf('beta')).toBeLessThan(text.indexOf('alpha'));
  });

  test('--no-exit-on-error lets later scripts finish while retaining failure', () => {
    const proc = run('--parallel', '--no-exit-on-error', 'fail', 'after');
    expect(proc.exitCode).not.toBe(0);
    expect(output(proc)).toContain('after-failure');
  });

  test('--filter fans a script out across workspaces with package prefixes', () => {
    const proc = run('--parallel', '--filter', '*', 'check');
    const text = output(proc);
    expect(proc.exitCode).toBe(0);
    expect(text).toContain('workspace-a:check');
    expect(text).toContain('workspace-a-ok');
    expect(text).toContain('workspace-b:check');
    expect(text).toContain('workspace-b-ok');
  });
});
