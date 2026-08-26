// @see https://github.com/oven-sh/bun/issues/28792 — reconciled Bun 1.4 install / CLI changes
/**
 * Tempdir-only package-manager contracts for Bun 1.4.0 Other behavior changes.
 * Never runs against the monorepo root (frozenLockfile / bun.lock stay untouched).
 */
import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TARGET_VERSION = '1.4.0';
const releaseTest = Bun.version === TARGET_VERSION ? test : test.skip;

function withTempDir(prefix: string, fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('Bun 1.4.0 Other behavior — install / update / init (tempdir)', () => {
  // @see https://bun.com/blog/bun-v1.4#security-hardening
  releaseTest('bun run --bun keeps its per-build shim directory owner-only', () => {
    if (process.platform === 'win32') return;

    withTempDir('bun-1.4-owner-only-shim-', dir => {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({
          name: 'owner-only-shim-probe',
          version: '0.0.0',
          private: true,
          scripts: { probe: 'node -e "process.exit(0)"' },
        })
      );

      const previousUmask = process.umask(0);
      let run: ReturnType<typeof Bun.spawnSync>;
      try {
        run = Bun.spawnSync([process.execPath, 'run', '--bun', 'probe'], {
          cwd: dir,
          stdout: 'pipe',
          stderr: 'pipe',
        });
      } finally {
        process.umask(previousUmask);
      }
      expect(run.exitCode).toBe(0);

      const tempRoot = process.platform === 'darwin' ? '/private/tmp' : '/tmp';
      const shimDirectory = join(tempRoot, `bun-node-${Bun.revision.slice(0, 9)}`);
      const stat = statSync(shimDirectory);
      expect(stat.isDirectory()).toBe(true);
      expect(stat.mode & 0o777).toBe(0o700);
      expect(stat.uid).toBe(process.getuid?.());
    });
  });

  releaseTest('bun update <name> exits 1 when nothing depends on it (#38333)', () => {
    withTempDir('bun-1.4-update-orphan-', dir => {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'orphan-probe', version: '0.0.0', private: true })
      );
      writeFileSync(join(dir, 'bunfig.toml'), '[install]\nfrozenLockfile = false\n');
      const proc = Bun.spawnSync([process.execPath, 'update', 'definitely-not-a-dep-xyz'], {
        cwd: dir,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(proc.exitCode).toBe(1);
    });
  });

  releaseTest('bun update -i with non-TTY stdin exits 1 (#35165)', () => {
    withTempDir('bun-1.4-update-i-', dir => {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({
          name: 'update-i-probe',
          version: '0.0.0',
          private: true,
          dependencies: { 'is-number': '7.0.0' },
        })
      );
      writeFileSync(join(dir, 'bunfig.toml'), '[install]\nfrozenLockfile = false\n');
      const proc = Bun.spawnSync([process.execPath, 'update', '-i'], {
        cwd: dir,
        stdin: new Blob(['']),
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(proc.exitCode).toBe(1);
      const err = `${proc.stdout.toString()}\n${proc.stderr.toString()}`;
      expect(err.length).toBeGreaterThan(0);
    });
  });

  releaseTest(
    'bun init with non-TTY stdin behaves as -y and writes typescript ^7 (#35165 #33265)',
    () => {
      withTempDir('bun-1.4-init-', dir => {
        const proc = Bun.spawnSync([process.execPath, 'init'], {
          cwd: dir,
          stdin: new Blob(['']),
          stdout: 'pipe',
          stderr: 'pipe',
        });
        expect(proc.exitCode).toBe(0);
        const raw = readFileSync(join(dir, 'package.json'), 'utf8');
        expect(raw).toMatch(/"typescript"\s*:\s*"\^7/);
      });
    }
  );

  releaseTest('bun init -y writes typescript ^7 (#33265 #39341)', () => {
    withTempDir('bun-1.4-init-y-', dir => {
      const proc = Bun.spawnSync([process.execPath, 'init', '-y'], {
        cwd: dir,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(proc.exitCode).toBe(0);
      const raw = readFileSync(join(dir, 'package.json'), 'utf8');
      expect(raw).toMatch(/"typescript"\s*:\s*"\^7/);
    });
  });

  releaseTest('bunfig.toml overrides .npmrc for the same key (#38333)', () => {
    withTempDir('bun-1.4-bunfig-npmrc-', dir => {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'bunfig-probe', version: '0.0.0', private: true })
      );
      writeFileSync(join(dir, '.npmrc'), 'save-exact=false\n');
      writeFileSync(
        join(dir, 'bunfig.toml'),
        '[install]\nexact = true\nfrozenLockfile = false\n'
      );
      const add = Bun.spawnSync([process.execPath, 'add', 'is-number@7.0.0'], {
        cwd: dir,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(add.exitCode).toBe(0);
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
        dependencies?: Record<string, string>;
      };
      expect(pkg.dependencies?.['is-number']).toBe('7.0.0');
    });
  });

  releaseTest('bun install --filter edits workspace package, not root (#38333)', () => {
    withTempDir('bun-1.4-filter-', dir => {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({
          name: 'filter-root',
          version: '0.0.0',
          private: true,
          workspaces: ['packages/*'],
        })
      );
      writeFileSync(join(dir, 'bunfig.toml'), '[install]\nfrozenLockfile = false\n');
      mkdirSync(join(dir, 'packages', 'child'), { recursive: true });
      writeFileSync(
        join(dir, 'packages', 'child', 'package.json'),
        JSON.stringify({ name: 'filter-child', version: '0.0.0', private: true })
      );
      const add = Bun.spawnSync(
        [process.execPath, 'add', 'is-number@7.0.0', '--filter', 'filter-child'],
        { cwd: dir, stdout: 'pipe', stderr: 'pipe' }
      );
      expect(add.exitCode).toBe(0);
      const root = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
        dependencies?: Record<string, string>;
      };
      const child = JSON.parse(
        readFileSync(join(dir, 'packages', 'child', 'package.json'), 'utf8')
      ) as { dependencies?: Record<string, string> };
      expect(root.dependencies?.['is-number']).toBeUndefined();
      expect(child.dependencies?.['is-number']).toBeTruthy();
    });
  });

  releaseTest('catalog: write on bun add when catalog lists package (#38333)', () => {
    withTempDir('bun-1.4-catalog-', dir => {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({
          name: 'catalog-root',
          version: '0.0.0',
          private: true,
          workspaces: ['packages/*'],
          catalog: { 'is-number': '7.0.0' },
        })
      );
      writeFileSync(join(dir, 'bunfig.toml'), '[install]\nfrozenLockfile = false\n');
      mkdirSync(join(dir, 'packages', 'app'), { recursive: true });
      writeFileSync(
        join(dir, 'packages', 'app', 'package.json'),
        JSON.stringify({ name: 'catalog-app', version: '0.0.0', private: true })
      );
      const add = Bun.spawnSync(
        [process.execPath, 'add', 'is-number', '--filter', 'catalog-app'],
        { cwd: dir, stdout: 'pipe', stderr: 'pipe' }
      );
      expect(add.exitCode).toBe(0);
      const child = readFileSync(join(dir, 'packages', 'app', 'package.json'), 'utf8');
      expect(child).toMatch(/catalog:/);
    });
  });

  releaseTest('frozen-lockfile --lockfile-only writes nothing (#38333)', () => {
    withTempDir('bun-1.4-frozen-only-', dir => {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({
          name: 'frozen-only',
          version: '0.0.0',
          private: true,
          dependencies: { 'is-number': '7.0.0' },
        })
      );
      writeFileSync(join(dir, 'bunfig.toml'), '[install]\nfrozenLockfile = false\n');
      const install = Bun.spawnSync([process.execPath, 'install'], {
        cwd: dir,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(install.exitCode).toBe(0);
      const before = readFileSync(join(dir, 'bun.lock'), 'utf8');
      const only = Bun.spawnSync(
        [process.execPath, 'install', '--frozen-lockfile', '--lockfile-only'],
        { cwd: dir, stdout: 'pipe', stderr: 'pipe' }
      );
      expect(only.exitCode).toBe(0);
      expect(readFileSync(join(dir, 'bun.lock'), 'utf8')).toBe(before);
    });
  });
});
