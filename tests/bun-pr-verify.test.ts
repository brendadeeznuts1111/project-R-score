import { describe, expect, test } from 'bun:test';
import { resolveBunExecutable } from '../lib/bun-executable.ts';

// The script is entrypoint-guarded; test the reachable pure behaviors via
// spawning it: missing-arg usage and missing-PR-build error both exit non-zero
// with actionable messages. Full PR-build verification needs `bunx bun-pr`
// + gh auth (network) — covered by the integration path in the tool itself.
describe('bun-pr-verify CLI', () => {
  test('no args prints usage and exits non-zero', async () => {
    const proc = Bun.spawn(['bun', 'tools/bun-pr-verify.ts'], {
      cwd: import.meta.dir ? new URL('..', import.meta.url).pathname : '.',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, exit] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    const out = stdout + stderr;
    expect(out).toContain('usage:');
    expect(out).toContain('<pr-number>');
    expect(exit).not.toBe(0);
  });

  test('missing PR build fails with a bunx bun-pr hint', async () => {
    const proc = Bun.spawn(['bun', 'tools/bun-pr-verify.ts', '99999'], {
      cwd: import.meta.dir ? new URL('..', import.meta.url).pathname : '.',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, exit] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    const out = stdout + stderr;
    expect(out).toContain('bun-99999 not on PATH');
    expect(out).toContain('bunx bun-pr 99999');
    expect(exit).not.toBe(0);
  });

  test('resolveBunExecutable resolves the current runtime (sanity)', () => {
    const bin = resolveBunExecutable();
    expect(bin).toBeTruthy();
    expect(bin).not.toBe('bun'); // never a bare name
  });

  test('unknown long option fails (allowlist)', async () => {
    const proc = Bun.spawn(['bun', 'tools/bun-pr-verify.ts', '1', '--typo'], {
      cwd: import.meta.dir ? new URL('..', import.meta.url).pathname : '.',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, exit] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    const out = stdout + stderr;
    expect(out).toContain('Unknown long option(s) in bun:pr:verify: --typo');
    expect(exit).not.toBe(0);
  });

  test('BUN_STRIP_UNKNOWN=true strips typo then fails missing PR build', async () => {
    const proc = Bun.spawn(['bun', 'tools/bun-pr-verify.ts', '99999', '--typo'], {
      cwd: import.meta.dir ? new URL('..', import.meta.url).pathname : '.',
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env, BUN_STRIP_UNKNOWN: 'true' },
    });
    const [stdout, stderr, exit] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    const out = stdout + stderr;
    expect(out).toContain('BUN_STRIP_UNKNOWN=true — stripping');
    expect(out).toContain('bun-99999 not on PATH');
    expect(exit).not.toBe(0);
  });
});
