// @see https://bun.com/blog/bun-v1.4#other-behavior-changes — Bun 1.4.0 install / init / update
/**
 * Tempdir-only package-manager contracts for Bun 1.4.0 Other behavior changes.
 * Never runs against the monorepo root (frozenLockfile / bun.lock stay untouched).
 */
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

  releaseTest('bun init with non-TTY stdin behaves as -y and writes typescript ^7 (#35165 #33265)', () => {
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
  });

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
});
